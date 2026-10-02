# finance+crm 架构分析

> 分片范围：`svc/finance`（8011）、`svc/crm`（8029）。仅分析本组两个服务；`svc/server`、`svc/portal`、`lib/shared-*`、`database/`、`deploy/`、前端不在范围内。跨服务调用只描述本组一侧的调用点与数据流，不展开被调用服务内部。
> 证据标签：[代码实证]=直接代码事实；[文档声称]=`docs/architecture/*` 设计描述；[漂移]=文档与代码不符。
> 分析日期：2026-10-02。所有行号均经 `grep -n`/`sed -n` 实测。

---

## 1. 分片架构现状（代码实证）

### 1.1 服务清单与进程形态 [代码实证]

| 服务 | 目录 | 端口 | API 前缀 | 环境变量 | max_conn | enable_events | enable_rls | 证据 |
|---|---|---|---|---|---|---|---|---|
| finance | `svc/finance` | 8011 | `/api/finance`（legacy `/api/v1/finance`、`/api/core/finance/v1`） | `FINANCE_PORT` | 20 | true | **false（显式关闭）** | `svc/finance/src/main.rs:236-248` |
| crm | `svc/crm` | 8029 | `/api/crm`（legacy `/api/v1/crm`） | `CRM_PORT` | 10 | true | true（走默认，未覆盖） | `svc/crm/src/main.rs:35-46`；默认值见 `lib/shared-bootstrap/src/lib.rs:585` |

- 两服务均为独立 axum 0.8 进程，经 `topems_shared_bootstrap::bootstrap_service()` 统一启动，再经 `build_application()` 挂载路由（finance `main.rs:250,318`；crm `main.rs:48,359`）。
- 搜索路径（schema 解析顺序）：finance=`finance, public`（`main.rs:236`）；crm=`crm, public, shared`（`main.rs:35`）。
- 技术栈：sqlx 0.8.6（PostgreSQL）+ `rust_decimal`（finance Cargo.toml:33/39 用 1.34，crm Cargo.toml:30 用 1.35）；**两服务均无 tonic/gRPC 依赖**（实测 finance/crm src 中 `tonic|grpc` 命中 0），跨服务通信 = HTTP REST（`TypedServiceClient`）+ Redis Stream 事件。

### 1.2 Bootstrap 模式（main.rs 实际）[代码实证]

- **finance 实际模式 = stateful + `build_application`（即 B 型形态）**：`bootstrap_service(&config)`（`main.rs:250`）→ 自定义 `AppState{ auth_state, pool, workflow_client, event_publisher }`（`svc/finance/src/shared/mod.rs:8-14`）→ `.with_state(state)`（`main.rs:304`）→ `build_application`（`main.rs:318`）。state 内含非标准的 `workflow_client`（`TypedServiceClient<WorkflowApi>`）。
- **crm 实际模式 = stateful + `build_application`（B 型）**：`bootstrap_service`（`main.rs:48`）→ 大型 `ApiState{ db, auth_state, metrics, start_time, encryption, event_publisher, erp_client, wms_client, workflow_client, 4×cache }`（`svc/crm/src/modules/mod.rs:34-62`）→ `.with_state(api_state)`（`main.rs:349`）→ `build_application`（`main.rs:359`）。
- 两者额外初始化：finance 启动 PG CQRS 事件存储 + 异步投影（`main.rs:270-272`）、事件管道/ Saga（`main.rs:274-280`）；crm 启动 L1(moka)+L2(Redis) 多级缓存×4（`main.rs:71-173`）、缓存预热（`main.rs:175-217`）、缓存失效事件订阅（`main.rs:219-277`）、字段加密（`main.rs:65`）、向 unified-core 自动注册插件（`main.rs:362-365`）。

### 1.3 模块划分与路由组织 [代码实证]

- **finance**：`svc/finance/src/modules/mod.rs` 单文件 **5922 行**，含 **127 处 `.route(`**，`create_routes()` 定义于 `modules/mod.rs:5406`。路由 = 20 个 `.merge(versioned_module::create_routes())`（v51 compliance → v60 decision，`modules/mod.rs:5408-5428`）+ `/cqrs` 嵌套（`:5429`）+ 约 60 条内联核心路由（科目/凭证/账簿/报表/收付款/应收应付，`:5431-5921`）。分层为 `modules/`（handler）→ `services/finance/`（业务服务 `FinanceService`）→ `domain/`（CQRS/event store/saga/projector）。
- **crm**：`svc/crm/src/modules/mod.rs` 仅 **134 行**薄编排器，`create_routes()` 于 `:86-109`，`.merge()` 19 个子模块路由（customer/contact/contract/opportunity/interaction/aftersales/billing/audit/analytics/rfm/forecast/tag/customer_profile/customer_scoring/customer_segmentation/customer_recommendation/sales_forecast/sales_funnel）。另有 `create_system_routes()`（插件 info/health，`:111-113`）。
- 模块语义与任务线索一致：finance = 总账/凭证/科目/报表/收付款/应收应付/对账结算中心/税务/资金/风险/合规；crm = 客户/联系人/商机/合同/跟进/售后退换/计费/标签/RFM/预测/漏斗。

### 1.4 跨服务调用点（本组一侧）[代码实证]

**finance 对外：**
| 目标 | 方式 | 调用点 | 说明 |
|---|---|---|---|
| unified-core / workflow | HTTP（`WorkflowApi`） | `svc/finance/src/services/finance/payment_workflow.rs:88`（`create_instance`）；client 构造 `main.rs:285-287` | 付款审批同步创建工作流实例，写入 `core_finance_payment_workflow`（`payment_workflow.rs:96-100`） |
| unified-core / ticket | HTTP（裸 `reqwest`） | `svc/finance/src/modules/reconciliation.rs:447-452` | 对账差异自动建单 `POST {core_url}/api/core/master/tickets`，带 `x-tenant-id`/`x-user-id` |
| erp / pm（事件总线） | event publish | `svc/finance/src/modules/settlement_center/service.rs:171,262,536,593,614,685` | 发布 `ReconciliationCreated/Updated/Approved`、`SettlementCreated/Approved` |
| erp（事件总线） | event subscribe | `svc/finance/src/event_handlers/mod.rs:44-90` | 订阅 `SalesOrderCreated/Approved`、`PurchaseOrderCreated/Approved`、`PaymentReceived/Made` 自动生成凭证 |

**crm 对外：**
| 目标 | 方式 | 调用点 | 说明 |
|---|---|---|---|
| erp | HTTP（`ErpApi`） | `svc/crm/src/modules/aftersales.rs:1636`（create_reconciliation）、`:1676`（create_voucher）、`:1912`（list_reconciliations_by_ref） | 退换货退款→财务对账/凭证；失败仅 warn 不阻塞（graceful fallback） |
| wms | HTTP（`WmsApi`） | `svc/crm/src/modules/aftersales.rs:1800`（PUT inventory）、`:1833`（create_inventory_movement）、`:2012`（list_inventory_movements_by_ref） | 退换货收货→库存回补/库存移动 |
| unified-core / workflow | HTTP（`WorkflowApi`） | `svc/crm/src/modules/contact.rs:728`、`svc/crm/src/modules/customer.rs:795`（`create_instance`）；client 构造 `main.rs:309-311` | 联系人/客户同步触发审批流 |
| unified-core / plugin | HTTP | `svc/crm/src/main.rs:362-365`（`auto_register_to_core`） | 启动后异步自注册 |
| erp/finance（事件总线） | event subscribe | `svc/crm/src/event_handlers/mod.rs:46,54,62,70,78,86` | 订阅 `AfterSalesTicketCreated/OpportunityWon/CustomerCreated/ShippingOrderRequested/PaymentReceived/SalesOrderCreated` |
| 事件总线 | event publish | `svc/crm/src/modules/aftersales.rs:1233,1280,2551` | 发布 `ReturnProcessed/ReturnCompleted` |

**同步调用环核查 [代码实证]**：本组对外均为「finance/crm → 上游（unified-core/erp/wms）」的单向同步 HTTP；未发现上游同步回指 finance/crm 的调用点（runtime 拓扑中指向本组的仅 `portal→crm`、`portal→finance`，属 BFF 聚合，见 §5）。**未发现同步 HTTP 环**。

### 1.5 数据架构 [代码实证]

- **跨 schema 直读（活 SQL）实测**：
  - finance：**0 处活跨 schema 表读**。`erp.fin_reconciliations` 字样仅出现在注释/文档（`settlement_center/service.rs:4-13,21`、`models.rs:3,14,17`、`mod.rs:3,16`），实际已改读本地快照 `plugin_finance.reconciliation_snapshots` + 发事件（`service.rs:24-30`）。`public.aux_type`（`services/finance/voucher.rs:344,897`）是 `$3::public.aux_type` 的**类型强转**，非表读。
  - crm：**1 处活跨 schema 表读**——`svc/crm/src/modules/audit.rs:86,112,182,226` 直接 `SELECT ... FROM public.audit_logs`（平台公共审计表），而非 crm 自有审计表。
- **边界守卫**：`only_own_schema_query!("finance", ...)` 宏 finance 命中 **659** 处，crm 仅 **6** 处。finance 对自有 schema 边界有强约束，crm 基本未用该守卫。
- **事务边界**：crm 售后联动在同一 `sqlx::Transaction` 内先写本地 `crm.*` 再调外部 HTTP（`aftersales.rs:1610` 起，`txn` 传入 `sync_return_to_finance`/`sync_return_to_inventory`），外部调用失败仅 warn、本地事务照常提交——**本地写与外部副作用非原子**（最终一致靠 graceful fallback，无 Saga 补偿）。
- **金额精度**：核心账务大量用 `rust_decimal::Decimal`（finance 命中 **1484**、crm **109**）；但存在 f64 泄漏点（见 FCRM-03）。
- **审计日志**：两服务均委托共享实现——finance `models/audit_log.rs:1-5` re-export `topems_shared_bootstrap::audit`；crm `models/audit_log.rs:1` re-export `topems_shared_db::audit::AuditLog`。

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称（路径+章节） | 代码实际（路径+行号） | 结论 |
|---|---|---|---|
| finance 端口/前缀/模式 | `config/services.yaml`（finance 条目）+ `docs/architecture/overview.md:155`：finance=8011 `/api/finance/` 模式 **A**「标准 build_application（无自定义 state）」 | `svc/finance/src/main.rs:240,245` 端口/前缀一致；但 `main.rs:290-295` + `shared/mod.rs:8-14` 定义了含 `workflow_client` 的自定义 `AppState` 并 `.with_state()`（`main.rs:304`） | **漂移**：端口/前缀一致，bootstrap 模式实为 stateful（B 型形态），非「无自定义 state」 |
| crm 端口/前缀/模式 | `config/services.yaml`（crm 条目）+ `overview.md:160`：crm=8029 `/api/crm/` 模式 **B**「stateful（缓存/租户 state）」 | `main.rs:39,43` 端口/前缀一致；`main.rs:314-328` `ApiState` 含缓存/加密/3 客户端 | 一致 |
| finance 依赖 | `config/services.yaml` finance `dependencies: [unified-core, erp]` | finance 无任何到 erp 的活 HTTP/DB 调用（实测 `ErpApi|erp_client|/api/erp` 在 finance src 命中 0）；到 erp 仅**订阅事件**（`event_handlers/mod.rs:44-90`） | **漂移**：「依赖 erp」已退化为事件订阅，无同步依赖边 |
| crm→erp / crm→wms 跨库直读 | `docs/architecture/service-topology/cross-db-calls.md` + `service-topology.runtime.json`：`crm-service→erp-service`、`crm-service→wms-service` 列为**跨库直连** | `aftersales.rs:1616-1676,1788-1835` 注释明确「V19.0 服务边界治理-跨库直写已替换为 HTTP API」，实际走 `ErpApi`/`WmsApi` HTTP | **漂移**：拓扑文档滞后，代码已改 HTTP |
| finance→workflow 跨库直读 | `cross-db-calls.md`：`finance-service→workflow-service` 列为**跨库直连** | `payment_workflow.rs:88` 走 `WorkflowApi` HTTP；无 `workflow.*` 表直查（`risk_v54.rs:1158` 的 `workflow.steps` 是 Rust 结构体字段，SQL 实为 `finance.finance_v54_review_workflows`） | **漂移**：实为 HTTP，非跨库直读 |
| CRM 发布事件 | `docs/architecture/event-driven.md` §3.9（:180-187）：CRM 发布 `CrmCustomerCreated/Updated`、`CrmOpportunityCreated/StageChanged`、`CrmContactCreated`、`CrmInteractionRecorded` | crm src 仅 `aftersales.rs:1233,1280,2551` 发布 `ReturnProcessed/ReturnCompleted`；`EventType` 枚举（`lib/shared-event/src/event/event_types.rs`）无上述 6 个 Crm* 变体 | **漂移**：文档列的 6 个 CRM 发布事件在代码中不存在/未发布 |
| Finance 发布事件 | `event-driven.md` §3.10（:191-197）：Finance 发布 `FinanceBillGenerated/PaymentCompleted/BudgetApproved/AccountingPeriodClosed/JournalEntryCreated` | 实际发布 `PaymentMade`（`modules/mod.rs:1053`）、`PaymentReceived`（`modules/mod.rs:3571`）、`Reconciliation*`/`Settlement*`（`settlement_center/service.rs`）；`event_types.rs` 无 `FinanceBillGenerated/FinancePaymentCompleted/...` 变体 | **漂移**：5 个文档事件类型均未实现 |
| CRM 订阅 Finance 账单事件 | `event-driven.md:193`：`FinanceBillGenerated` 订阅者含 CRM | crm `event_handlers/mod.rs:46-86` 订阅列表无 `FinanceBillGenerated` | **漂移** |
| ERP 事件→Finance | `event-driven.md` §3.7（:160-166）：ERP 销售/采购/发票事件订阅者含 Finance | finance `event_handlers/mod.rs:44-60` 订阅 `SalesOrderCreated/Approved`、`PurchaseOrderCreated/Approved` | 一致（入站事件契约对齐） |
| 统一错误处理 | `docs/architecture/unified-error-handling-decision.md` §2/§4：目标 `HandlerResult<T>`/`TopemsError` 类型化错误，迁移始于 gis | finance `TopemsError` 245 处、`HandlerResult` 24 处；crm `TopemsError` **0** 处、`HandlerResult` 11 处，crm 302 处用共享 `api_error`（`topems_shared_core::response::api_error`） | **漂移**（部分）：finance 已较多采纳类型化错误；crm 仍全量手写/helper 错误，未达 ADR 目标 |
| RLS（行级安全） | `lib/shared-bootstrap/src/lib.rs:585` 默认 `enable_rls: true` | finance `main.rs:244` 显式 `enable_rls: false`；crm 未覆盖=默认 true | **漂移**（非一致预期）：处理金额的 finance 反而关闭 RLS |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据（路径:行号） | 影响 | 修复建议 |
|---|---|---|---|---|---|---|
| FCRM-01 | finance bootstrap 模式误标为 A（无自定义 state），实为 stateful B | 低 | 文档漂移 | `config/services.yaml` finance 条目「A 无自定义 state」 vs `svc/finance/src/shared/mod.rs:8-14`、`svc/finance/src/main.rs:290-304` | 服务清单与实际形态不符，影响 oncall/部署手册对「是否需自定义 state」的判断 | 将 services.yaml/overview.md 中 finance 的 bootstrap_mode 更正为 B（或在框架内确认 A/B 判定口径后统一） |
| FCRM-02 | 财务服务显式关闭行级安全 RLS | 高危 | 安全 | `svc/finance/src/main.rs:244`（`enable_rls: false`）；默认 true 见 `lib/shared-bootstrap/src/lib.rs:585`；对照 crm 走默认开启 | 金额/凭证数据的租户隔离仅依赖应用层 `tenant_middleware`+显式 `tenant_id` 过滤，一旦某查询漏带 `tenant_id` 即跨租户泄露账务数据；金融级数据反而无 DB 行级兜底 | 评估开启 finance RLS；若因迁移/性能暂关，补充 finance 层 `tenant_id` 必带校验与回归测试 |
| FCRM-03 | 金额精度 f64 泄漏到自动凭证与多个 DTO | 高危 | 数据架构 | `svc/finance/src/event_handlers/mod.rs:102`（`create_auto_voucher(amount: f64)`）；`svc/finance/src/models/mod.rs:122`（`total_amount: Option<f64>`）；`svc/crm/src/models/billing.rs:14,54,55,63,78`（amount/unit_price f64）；`svc/crm/src/models/customer.rs:45`、`sales_forecast.rs:12-16,31-35`、`dashboard.rs:70,76` | 事件自动凭证路径用 f64 计算借贷金额，存在浮点误差累积风险；crm 计费/预测 DTO 用 f64 存储金额，序列化/求和可能失准 | 自动凭证与计费相关金额统一改 `rust_decimal::Decimal`；对外 DTO 与事件 payload 用字符串/Decimal 序列化，禁止 f64 进账务金额 |
| FCRM-04 | 事件清单大面积漂移：CRM/Finance 文档事件未实现 | 中危 | 文档漂移 | `docs/architecture/event-driven.md:180-197` vs `svc/crm/src/event_handlers/mod.rs:46-86`、`svc/crm/src/modules/aftersales.rs:1233`、`svc/finance/src/modules/mod.rs:1053,3571`；`lib/shared-event/src/event/event_types.rs` 无对应变体 | 上下游按文档契约对接（如期望 CRM 发 CustomerCreated、Finance 发 PaymentCompleted）会落空；事件驱动协作基于过时清单 | 以代码 `EventType` 枚举为准回写 event-driven.md §3.9/§3.10；或补齐文档列出的事件发布实现 |
| FCRM-05 | crm 全量业务路由共用单一粗粒度权限 `crm:admin` | 中危 | 安全 | `svc/crm/src/main.rs:348`（`require_permission("crm:admin")` 叠加于全部 protected_routes） | 客户/商机/合同/售后/计费等所有 CRM 接口仅一个权限位，无法按操作/资源细分授权，最小权限原则失效 | 按子模块拆权限点（`crm:customer:read/write`、`crm:opportunity:approve` 等），在各子模块路由层细化 `require_permission` |
| FCRM-06 | crm 审计模块直读公共 `public.audit_logs` 跨 schema 表 | 中危 | 耦合 | `svc/crm/src/modules/audit.rs:86,112,182,226` | crm 审计查询耦合平台公共审计表，跨 schema 依赖在物理库拆分（`cross-db-calls.md` 预案 business 库）后将断；且 crm 自有 `audit` 模型与公共表边界不清 | 改为消费统一审计服务 API 或事件；拆分前将 crm 审计数据归位 crm schema |
| FCRM-07 | crm workflow_client 启动即 panic，与 erp/wms 客户端容错策略不一致 | 中危 | 可靠性 | `svc/crm/src/main.rs:309-311`（`.expect("工作流服务客户端初始化失败")`） vs `main.rs:281-304`（erp/wms `match...None` 降级） | unified-core（workflow）短时不可用即整个 crm 进程启动失败，可用性被最弱依赖绑架；同服务三种客户端两种策略 | workflow_client 亦改为 `Option` 降级，相关路由在未配置时返回明确错误而非启动 panic |
| FCRM-08 | finance `modules/mod.rs` 5922 行巨型 god-file | 低 | 设计缺陷/可维护性 | `svc/finance/src/modules/mod.rs`（5922 行，127 路由，`create_routes` 于 :5406） | 单文件承载大量内联 handler，与已拆分的 v51-v60 子模块风格不一致，评审/定位成本高 | 参照 crm（`modules/mod.rs` 134 行编排器）将内联核心路由/handler 下拆到独立子模块 |
| FCRM-09 | 跨库调用拓扑文档滞后：已改 HTTP/事件仍标跨库直连 | 低 | 文档漂移 | `docs/architecture/service-topology/cross-db-calls.md`（crm→erp/wms、finance→workflow）vs `svc/crm/src/modules/aftersales.rs:1616-1676`、`svc/finance/src/modules/settlement_center/service.rs:4-13,24-30` | 拆分预案以过时跨库清单为准，可能误判需治理的直连点；真实风险点（如 FCRM-06）反被淹没 | 用代码实测重新生成 service-topology（区分 http/event/db 边），重算跨库直连清单 |
| FCRM-10 | 本地事务与外部 HTTP 副作用非原子，无补偿 | 低 | 可靠性 | `svc/crm/src/modules/aftersales.rs:1610-1690`（同 txn 内先写 crm 本地再 `erp_client.create_voucher`，失败仅 warn） | 外部 ERP 凭证/库存写入失败时本地退换货已提交，存在数据不一致且无 Saga/重试补偿 | 引入 outbox 表 + 异步重试，或在失败时回滚本地/标记待补偿 |
| FCRM-11 | finance 对 ticket 的调用使用裸 reqwest，绕过 TypedServiceClient | 低 | 通信/一致性 | `svc/finance/src/modules/reconciliation.rs:447-452`（裸 `reqwest::Client`）vs 其余经 `TypedServiceClient`（`main.rs:285`） | 服务间调用风格不统一，缺统一的 service token/超时/可观测包装 | 为 ticket 调用补 `TypedServiceClient<TicketApi>`，统一鉴权与埋点 |

---

## 4. 优点与亮点（客观，带证据）

1. **schema 边界守卫在 finance 落地扎实**：`only_own_schema_query!("finance", ...)` 命中 659 处，配合 `SEARCH_PATH=finance,public`（`main.rs:236`）与 `schema_defense` 迁移校验，跨 schema 越界访问被宏级约束（`svc/finance/src/models/schema_defense.rs`）。
2. **跨库边界治理真实推进**：crm 售后链已从「跨库直写 erp.*」重构为 HTTP API（`aftersales.rs:1616-1676,1788-1835` 注释 V19.0），finance 对账中心已从「直查 erp.fin_reconciliations」重构为本地快照+发事件（`settlement_center/service.rs:4-13,24-30`，V256）——方向正确，只是拓扑文档未同步。
3. **finance 错误处理现代化程度较高**：`TopemsError` 245 处、`HandlerResult` 24 处，已较多采用 ADR 目标形态（`unified-error-handling-decision.md`）。
4. **crm 多级缓存与缓存一致性设计完整**：L1(moka)+L2(Redis) 四层缓存、启动预热、基于 `CacheInvalidated` 事件的失效广播（`main.rs:68-277`），并带 metrics 埋点（`.with_metrics`）。
5. **事件入站契约与文档对齐**：ERP→Finance 的销售/采购事件订阅与 `event-driven.md` §3.7 一致（`event_handlers/mod.rs:44-60`），自动凭证链路真实可用。
6. **无 gRPC 耦合、无同步调用环**：两服务间通信为单向 HTTP + 异步事件，未发现同步环（§1.4）。
7. **OpenAPI/健康检查标准化**：finance `ApiDoc`（`main.rs:27-232`）、crm `CrmApiDoc`（`main.rs:352-357`）均经 `build_application` 统一挂载 OpenAPI 与标准健康路由。

---

## 5. 可视化数据

### 5.1 依赖边清单（本组服务对外全部边，实测）

```json
[
  {"from":"finance","to":"unified-core/workflow","kind":"http","note":"付款审批同步 create_instance 建工作流实例 (payment_workflow.rs:88)"},
  {"from":"finance","to":"unified-core/ticket","kind":"http","note":"对账差异裸 reqwest 建单 POST /api/core/master/tickets (reconciliation.rs:452)"},
  {"from":"finance","to":"erp,pm","kind":"event","note":"发布 Reconciliation*/Settlement* (settlement_center/service.rs:171,262,536,593,614,685)"},
  {"from":"finance","to":"erp","kind":"event","note":"订阅 SalesOrder*/PurchaseOrder*/Payment* 自动生成凭证 (event_handlers/mod.rs:44-90)"},
  {"from":"finance","to":"erp","kind":"none","note":"无同步HTTP/DB依赖(实测)，仅事件订阅；services.yaml 所标 erp 同步依赖已退化"},
  {"from":"crm","to":"erp","kind":"http","note":"退换货退款 create_reconciliation/create_voucher/list (aftersales.rs:1636,1676,1912)"},
  {"from":"crm","to":"wms","kind":"http","note":"退换货收货 库存回补/库存移动 (aftersales.rs:1800,1833,2012)"},
  {"from":"crm","to":"unified-core/workflow","kind":"http","note":"联系人/客户 create_instance 触发审批 (contact.rs:728, customer.rs:795)"},
  {"from":"crm","to":"unified-core/plugin","kind":"http","note":"启动后 auto_register_to_core (main.rs:364)"},
  {"from":"crm","to":"erp,finance","kind":"event","note":"订阅 AfterSalesTicketCreated/OpportunityWon/CustomerCreated/ShippingOrderRequested/PaymentReceived/SalesOrderCreated (event_handlers/mod.rs:46-86)"},
  {"from":"crm","to":"event-bus","kind":"event","note":"发布 ReturnProcessed/ReturnCompleted (aftersales.rs:1233,1280,2551)"},
  {"from":"crm","to":"public/audit_logs","kind":"db","note":"直读公共审计表(跨schema活SQL) (audit.rs:86,112,182,226)"},
  {"from":"portal","to":"crm","kind":"http","note":"BFF聚合入口(runtime拓扑 value=3)，仅记录调用点，不分析portal内部"},
  {"from":"portal","to":"finance","kind":"http","note":"BFF聚合入口(runtime拓扑 value=1)，仅记录调用点，不分析portal内部"}
]
```

### 5.2 统计数字（实测 `wc -l` / `grep -c`）

| 指标 | finance | crm |
|---|---|---|
| src `.rs` 文件数 | 84 | 55 |
| src 总行数 | 78,959 | 25,351 |
| tests `.rs` 文件数 | 13 | 4 |
| `modules/mod.rs` 行数 / `.route(` 数 | 5922 行 / 127 | 134 行 / 0（全 merge 子模块） |
| `only_own_schema_query!` 命中 | 659 | 6 |
| `Decimal` 引用 | 1484 | 109 |
| `api_error` 引用 | 42 | 302 |
| `TopemsError` / `HandlerResult` | 245 / 24 | 0 / 11 |
| metrics 相关引用 | 107 | 12 |
| gRPC(tonic) 使用 | 0 | 0 |
| 活跨 schema 表读 | 0 | 1（public.audit_logs） |
| 对外同步 HTTP 目标 | 2（workflow,ticket） | 3（erp,wms,workflow）+1(plugin 注册) |
| 发布事件类型数 | PaymentMade/Received + Reconciliation*/Settlement* | ReturnProcessed/ReturnCompleted |
| 订阅事件类型数 | 6（ERP 销售/采购/收付款 + 对账结算） | 6 |
