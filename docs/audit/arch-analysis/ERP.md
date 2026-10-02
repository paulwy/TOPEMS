# erp 模块组架构分析

> 分片范围：svc/erp、svc/scm、svc/srm、svc/pm、svc/pdm
> 分析日期：2026-10-02
> 证据基线：代码实证为主，文档声称对照见 §2

---

## 1. 分片架构现状（代码实证）

### 1.1 服务清单与规模

本组 5 个服务，全部归属于模块化单体「erp 组」（`docs/architecture/modular-monolith-design.md` §2 表格第 40 行），Feature Flag 为 `module-erp`。

| 服务 | 端口 | API 前缀 | Schema（实际） | 文件数 | 代码行数 | bootstrap 模式 |
|------|------|----------|---------------|--------|---------|---------------|
| erp | 8010 | /api/erp | `erp` | 119 | 66,898 | B |
| scm | 8040 | /api/scm | `scm` | 45 | 22,420 | B |
| srm | 8042 | /api/srm | `srm` | 44 | 22,851 | B |
| pm | 8023 | /api/pm | `pm` | 56 | 20,550 | B |
| pdm | 8031 | /api/pdm | `pdm` | 31 | 15,631 | B |
| **合计** | — | — | — | **295** | **148,350** | — |

证据：
- 端口与 API 前缀：`svc/erp/src/main.rs:61,65`、`svc/scm/src/main.rs:35,39`、`svc/srm/src/main.rs:38,42`、`svc/pm/src/main.rs:36,42`、`svc/pdm/src/main.rs:34,40`
- Schema（SEARCH_PATH）：`svc/erp/src/main.rs:57`（`erp, public`）、`svc/scm/src/main.rs:31`（`scm, public, shared`）、`svc/srm/src/main.rs:34`（`srm, public, shared`）、`svc/pm/src/main.rs:31`（`pm, public, shared`）、`svc/pdm/src/main.rs:30`（`pdm, public`）
- 文件/行数：`find svc/{erp,scm,srm,pm,pdm}/src -name "*.rs" | wc -l` = 295；`cat` 合计 = 148,350
- 服务清单权威源：`config/services.yaml:42-48`（erp）、`:78-84`（pm）、`:105-112`（pdm）、`:116-122`（scm）、`:132-138`（srm）

### 1.2 模块划分与路由组织

所有服务均采用 `modules/mod.rs` 汇总 `create_routes()`，路由为相对路径，由 `build_application` 按 `config.api_prefix` 统一 nest。

**erp**（最大，35+ 子模块）：`svc/erp/src/modules/mod.rs:117-155` 合并了 health、dashboard、addressbook、asset、audit、bank_account、consolidation（子目录含 7 个文件）、finance、purchase_order、sales_order、customer、supplier、inventory、material、production_order、master_data_*（20+ 个主数据子模块）、mdm_v49（5 个子模块）、search、settings 等。职责横跨财务/采购/销售/资产/主数据/合并报表，边界较宽。

**scm**（20 子模块）：`svc/scm/src/modules/mod.rs` 含 purchase_order、purchase_requisition、purchase_contract、supplier、supplier_evaluation、supplier_admission、supplier_delivery_appointment、price_comparison、mrp、inventory_turnover、incoming_inspection、data_sync、supply_chain_dashboard、sync_records 等。

**srm**（16 个 create_*_routes 函数）：`svc/srm/src/main.rs:170-194` 显式 merge 16 个路由组：supplier、category、evaluation、contract、product、purchase_order、quotation、bid_price、bidding、tender、supplier_portal、performance、data_sync、inquiry、scoring_dimension、statistics。

**pm**（20 子模块）：`svc/pm/src/modules/mod.rs` 含 project、task、milestone、phase、member、resource、budget、expense、benefit、contract、settlement、acceptance、quality、risk、report、document、notification、project_approval、project_type_config、statistics。

**pdm**（18 子模块）：`svc/pdm/src/modules/` 含 product、material、bom、version、change_notice、configuration、document、document_version、production_batch、production_formula、production_process、production_step、production_statistics、project、workflow、state_machine、settings、dashboard。

**API 前缀一致性**：5 个服务的 `api_prefix` 均与 `config/services.yaml` 和 `overview.md` 服务配置表一致（erp=/api/erp、scm=/api/scm、srm=/api/srm、pm=/api/pm、pdm=/api/pdm）。每个服务均声明 `legacy_prefixes: &["/api/v1/<svc>"]`（如 `svc/erp/src/main.rs:66`），提供旧路径兼容。路由内部使用相对路径（如 `/sales-orders/{id}/approve`，`svc/erp/src/modules/sales_order.rs:32`），由 build_application 统一加前缀，未见硬编码绝对路径漂移。

### 1.3 依赖关系与调用拓扑

#### 同步 HTTP 调用（出向）

本组服务对外发起的同步 HTTP 调用全部通过 `TypedServiceClient<T>`（`lib/shared-service-client`）或 `NotificationServiceClient`，携带 JWT service token。

| 调用方 | 被调方 | 调用点 | 用途 |
|--------|--------|--------|------|
| erp | hrm (8020) | `svc/erp/src/modules/addressbook.rs:200,208,216,329,354,383,473`；`svc/erp/src/modules/hr_proxy.rs:30` | list_employees / list_departments / list_companies / get_employee（通讯录代理） |
| erp | finance (8011) | `svc/erp/src/modules/consolidation/common.rs:103-106` | submit_approval / approve_approval / reject_approval / cancel_approval（合并报表审批流转） |
| erp | mes (8030) | `svc/erp/src/modules/production_order.rs:536` | create_from_erp（生产订单→工单下达闭环） |
| erp | unified-core (8000) | `svc/erp/src/main.rs:164` | NotificationServiceClient（通知推送） |
| srm | unified-core/flow (8000) | `svc/srm/src/modules/supplier.rs:1307` | workflow create_instance（供应商准入审批流） |
| pm | unified-core/flow (8000) | `svc/pm/src/modules/project_approval.rs:128` | workflow create_instance（项目立项审批流） |

客户端初始化方式：`TypedServiceClient::<HrmApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "erp-service", &["hrm:admin"]))`（`svc/erp/src/main.rs:170-171`），失败时 fallback 到默认 URL 并 `panic!`（如 `svc/erp/src/main.rs:178-180`）。

**组内同步调用**：erp/scm/srm/pm/pdm 之间无任何同步 HTTP 调用。组内协作全部通过事件总线（见 §1.5）。**不存在同步调用环。**

#### 跨 Schema 直读 DB

| 调用方 | 目标 Schema.Table | 证据 | 说明 |
|--------|-------------------|------|------|
| erp | `finance.accounting_subjects` | `svc/erp/src/modules/opening_balance.rs:192,534` | 读会计科目名称（期初余额录入辅助），经 `only_own_schema_query!("erp", ..., "finance")` 显式白名单 |
| erp | `crm.core_crm_customers` | `svc/erp/src/modules/search.rs:134` | 全局搜索聚合客户数据，经 `only_own_schema_query!("erp", ..., "crm")` 显式白名单 |
| erp | `public.audit_logs` | `svc/erp/src/main.rs:278` | 业务指标统计（近 1 小时活跃用户数），public 为默认共享 schema |
| srm | `unified_core.inter_module_sync` | `svc/srm/src/modules/data_sync.rs:860`（读）、`:933`（写） | 跨模块同步日志记录与查询，unified_core 为默认共享 schema |

其余 SQL 均为本 schema 裸表名（依赖 SEARCH_PATH 解析）。编译期边界宏 `only_own_schema_query!`（`lib/shared-boundary/src/lib.rs:288-330`）白名单 = 本服务 schema + `public`/`unified_core`/`information_schema` + 显式额外声明。`config/schema_boundary.json:36-43` 为 erp 额外放行 `finance`、`crm`。

### 1.4 数据架构

- **事务边界**：业务 handler 使用 sqlx 显式事务（`let mut txn = pool.begin()`），事件发布在事务提交后（如 `svc/erp/src/modules/purchase_order.rs:469-471`：先 `t.commit()`，再 `publisher.publish_purchase_order_approved`）。未见跨服务分布式事务（无 Saga 编排）。
- **状态机实现**：
  - pdm 有独立状态机模块 `svc/pdm/src/modules/state_machine.rs:34-69`：版本状态机（draft→review→approved→released→archived/obsolete）+ ECN 工程变更状态机（draft→pending→approved→implemented→closed），纯函数校验转移合法性，返回 `TransitionError`。
  - erp 销售/采购订单状态流转散落在 handler 中（`svc/erp/src/modules/sales_order.rs:32-35`：approve/ship/complete/cancel 端点），无集中状态机表。
  - scm 采购订单状态由事件驱动更新（`svc/scm/src/event_handlers/mod.rs:143,181,236`：UPDATE scm.purchase_orders SET status）。
- **Schema 防御**：每个服务有 `schema_defense.rs`（如 `svc/erp/src/schema_defense.rs`），启动时执行 `run_schema_migration_and_verify`，做幂等建表 + 列校验（modular-monolith-design.md §5.1 第 4 点记录的工程实践）。

### 1.5 事件驱动

事件总线已从 Redis Pub/Sub + RabbitMQ 迁移至 **Redis Stream**（V321），旧 `lib/shared-event/src/messaging.rs` 标记 `#[deprecated]`。

**发布（Publish）边：**

| 服务 | 发布事件 | 证据 |
|------|---------|------|
| erp | SalesOrderCreated | `svc/erp/src/modules/sales_order.rs:294` |
| erp | SalesOrderApproved | `svc/erp/src/modules/sales_order.rs:467` |
| erp | PurchaseOrderCreated | `svc/erp/src/modules/purchase_order.rs:~260` |
| erp | PurchaseOrderApproved | `svc/erp/src/modules/purchase_order.rs:~475` |
| erp | MasterDataEvent（会计科目等） | `svc/erp/src/services/mdm_event_service.rs:79` |
| scm | PurchaseOrderApproved | `svc/scm/src/modules/purchase_order.rs:592` |
| scm | InboundOrderRequested | `svc/scm/src/modules/data_sync.rs:350,1363` |
| srm | SrmSupplierRegistered / Created / Updated / StatusChanged | `svc/srm/src/modules/supplier.rs:442,470,746,1350,1483,1614` |
| pm | PmProjectCreated | `svc/pm/src/modules/project.rs:328` |
| pm | SettlementCreated / SettlementApproved | `svc/pm/src/modules/settlement.rs:194,293` |
| pdm | PdmMaterialCreated | `svc/pdm/src/modules/material.rs:284` |

**订阅（Subscribe）边：**

| 服务 | 订阅事件 | 证据 |
|------|---------|------|
| erp | PurchaseOrderApproved、WorkOrderCompleted、StockInbound/Outbound、EmployeeOnboarded、PmProjectCompleted/Settled、OpportunityWon、InventoryUpdated、ReturnCompleted、PaymentReceived/Made、Reconciliation*、HrmPayrollVoucherRequested、MasterData(employee/organization/customer/material)、CacheInvalidated | `svc/erp/src/event_handlers/mod.rs:78-241` |
| scm | PurchaseOrderCreated/Approved、StockInbound/Outbound、SupplierDataSyncRequested、WmsInventoryItemReceived/Shipped、InventoryUpdated、SrmSupplierCreated/Updated/StatusChanged、MasterData(supplier/material) | `svc/scm/src/event_handlers/mod.rs:59-112` |
| srm | ScmPurchasePlanCreated、ScmSupplierEvaluated、PurchaseOrderCreated、SupplierDataSyncRequested、CacheInvalidated | `svc/srm/src/event_handlers/mod.rs:46-58` |
| pm | HrmEmployeeCreated/Updated、WorkflowApproved/Rejected、RdProjectCreated、SettlementCreated/Approved | `svc/pm/src/event_handlers/mod.rs:39-61` |
| pdm | PurchaseOrderCreated、ProductionOrderCreated、ScmShipmentReceived、MasterData(AccountSubject) | `svc/pdm/src/event_handlers/mod.rs:35-47` |

**事件可靠性**：订阅者启动失败仅 `tracing::warn!` 不阻塞启动（如 `svc/erp/src/main.rs:144`）；事件发布失败 graceful fallback（如 `svc/scm/src/modules/purchase_order.rs:595` warn 后继续）。幂等性依赖消费者自行实现。

### 1.6 Bootstrap 模式

5 个服务**全部为 Mode B**（stateful + build_application），与 `config/services.yaml` 各服务 `bootstrap_mode: B` 标注一致：

- 均调用 `bootstrap_service(&config)` 获取 ctx（db/auth_state/event_publisher/metrics）
- 均构建自定义 `ApiState`（含缓存、服务客户端等额外字段）
- 均调用 `build_application(&ctx, &config, public_routes, protected_routes, openapi_json)`
- 均叠加 `tenant_middleware()` + `require_permission("<svc>:admin")`

特殊点：
- scm 在 `build_application` 后额外加 `CompressionLayer` + `TimeoutLayer(30s)` 并重建 `Application{router, port, name}`（`svc/scm/src/main.rs:272-290`），是 B→C 的混合形态。
- pdm 的 public_routes 自定义了 home/health/metrics/detailed_health（`svc/pdm/src/main.rs:151-164`），未用 `create_standard_health_routes`。

### 1.7 可观测性与错误处理

- **tracing 埋点**：组内 modules 层共 1,079 处 `tracing::` 调用（error/warn/info）。
- **Prometheus 指标**：erp 注册 5 个业务指标（ASSET_COUNT/VOUCHER_COUNT/FINANCIAL_TRANSACTION_COUNT/ACTIVE_USERS/API_REQUESTS_TOTAL，`svc/erp/src/main.rs:30-51`），并有后台任务每 60s 更新（`svc/erp/src/main.rs:149-155`）；scm/srm/pm 各注册 1 个自定义 Gauge 但 `set(42.0)`（占位值，非真实业务指标，如 `svc/scm/src/main.rs:61`）；pdm 用共享 `prometheus_metrics_handler`。
- **统一错误处理采纳率**：本组 `TopemsError` 引用数 = **0**；`ApiResponse::error(...)` 手写错误遍布全部服务（pm contract.rs 单文件 36 处、pdm document.rs 25 处、master_data_quality_loop.rs 33 处）；modules 层 `format!` 拼接错误信息 **121 处**。与 `docs/architecture/unified-error-handling-decision.md` §1 实测结论一致（erp 37 处 format! 泄露、pm 6 处跨行泄露）——本组未迁移到 TopemsError。

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称（路径+章节） | 代码实际（路径+行号） | 结论 |
|------|---------------------|---------------------|------|
| 服务 Schema 命名 | `database.md` §Schema 划分策略：ERP 用 `plugin_erp`、SCM 用 `plugin_scm`、SRM 用 `plugin_srm`、PM 用 `plugin_pm`、PDM 用 `plugin_pdm` | 各服务 main.rs SEARCH_PATH 设为 `erp, public`（erp:57）、`scm, public, shared`（scm:31）、`srm, public, shared`（srm:34）、`pm, public, shared`（pm:31）、`pdm, public`（pdm:30） | **漂移**：实际 schema 名去掉了 `plugin_` 前缀，database.md 附录 A 称 `erp→plugin_erp` 已迁移完成，与代码不符 |
| 事件总线实现 | `event-driven.md` §1：Redis Pub/Sub（轻量）+ RabbitMQ lapin（可靠）双通道 | `lib/shared-event/src/messaging.rs:3,69,92` 标记 `#[deprecated]`，事件总线已迁移至 Redis Stream（V321）；本组服务用 `ctx.event_publisher`（StreamEventPublisher） | **漂移**：event-driven.md 仍描述旧 Pub/Sub + RabbitMQ，未更新为 Redis Stream |
| ERP 事件类型命名 | `event-driven.md` §3.7：发布 `ErpSalesOrderCreated`、`ErpSalesOrderUpdated`、`ErpSalesOrderCompleted`、`ErpPurchaseOrderCreated`、`ErpPurchaseOrderApproved`、`ErpInventoryAdjusted`、`ErpInvoiceGenerated` | `lib/shared-event/src/event/event_types.rs:57-63` 枚举为 `SalesOrderCreated`、`SalesOrderApproved`、`PurchaseOrderCreated`、`PurchaseOrderApproved`（无 Erp 前缀）；erp 代码发布这 4 种（sales_order.rs:294,467；purchase_order.rs:260,475），未见 InventoryAdjusted/InvoiceGenerated 发布 | **漂移**：事件名缺 `Erp` 前缀；声称的 7 种事件中仅 4 种有发布实现，ErpInventoryAdjusted/ErpInvoiceGenerated/ErpSalesOrderUpdated/Completed 未落地 |
| SCM 事件订阅关系 | `event-driven.md` §3.8：SCM 发布 `ScmSupplierAdmitted`→订阅者 ERP/Notification | scm 实际发布 `PurchaseOrderApproved`、`InboundOrderRequested`（purchase_order.rs:592；data_sync.rs:350,1363）；srm 发布 `SrmSupplierCreated/Updated/StatusChanged`（supplier.rs:442,470,746） | **漂移**：文档将 SrmSupplier* 事件归在 SCM 名下，实际由 srm 服务发布；ScmSupplierAdmitted 事件类型在代码中不存在 |
| Bootstrap 模式计数 | `overview.md` §服务配置表 V2 模式说明：A=10/B=13/C=5；`config/services.yaml` 头部注释：A=10/B=11/C=7 | 本组 5 服务全部 B（main.rs 实证）；services.yaml 逐行标注 erp=B/pm=B/pdm=B/scm=B/srm=B，与代码一致 | **组内一致**；全局计数 A/B/C 总数两处文档互相矛盾（13 vs 11 个 B），本组不受影响 |
| 跨服务依赖声明 | `config/services.yaml`：erp dependencies=[unified-core]；pdm dependencies=[unified-core, mes] | erp 代码实际同步调用 hrm/finance/mes（addressbook.rs:200；consolidation/common.rs:103；production_order.rs:536）；pdm 无任何同步 HTTP 客户端，仅事件订阅 ProductionOrderCreated | **漂移**：erp 声明依赖缺失 hrm/finance/mes；pdm 声明依赖 mes 但无同步调用（仅事件） |
| 模块组归属 | `modular-monolith-design.md` §2：erp 组 = erp+scm+srm+pm+pdm | `config/services.yaml` module_groups.erp = erp+finance+ai；modular-monolith-design.md 第 40 行 erp 组 = erp,scm,srm,pm,pdm | **一致**（以 modular-monolith-design.md 为准，services.yaml 的 module_groups.erp 是旧的业务域分组，非模块化单体组） |
| 数据边界规则 | `modular-monolith-design.md` §3.1：禁止跨组直查；`database.md` §多租户：独立数据库用户最小权限 | erp 直读 finance.accounting_subjects（opening_balance.rs:192）和 crm.core_crm_customers（search.rs:134）；srm 直读写 unified_core.inter_module_sync（data_sync.rs:860,933） | **有条件一致**：跨 schema 直查存在但经 `only_own_schema_query!` 编译期白名单显式放行（schema_boundary.json:39-42 erp allow=[finance,crm]），属设计性例外而非违规 |
| 统一错误处理 | `unified-error-handling-decision.md` §2：业务层用 `Result<T, TopemsError>`，禁止新增 anyhow | 本组 TopemsError 引用 = 0；仍大量使用 `ApiResponse::error(500, &format!(...))` 手写错误 | **漂移**（决策已采纳但本组未迁移）：文档称"脚手架+门禁已落地"，本组仍为旧模式 |
| SEARCH_PATH 含 shared | 无文档声称 `shared` schema（database.md 附录 A：shared→public 已迁移完成） | scm/srm/pm 的 SEARCH_PATH 仍含 `shared`（scm:31、srm:34、pm:31），但代码中无 `shared.table` 实际引用 | **遗留漂移**：search_path 残留 shared，无实际作用 |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据（路径:行号） | 影响 | 修复建议 |
|----|------|--------|------|-------------------|------|---------|
| ERP-01 | 统一错误处理在本组零采纳，内部错误细节泄露风险 | 中危 | 可观测性/安全 | `svc/erp/src/modules/master_data_quality_loop.rs:33` 处 ApiResponse::error；全组 121 处 format! 拼接错误；TopemsError 引用 = 0（grep 实测） | sqlx::Error Display 携带表名/SQL 片段直达前端；错误码语义不可控；无法统一埋点 | 按 unified-error-handling-decision.md 迁移至 TopemsError + HandlerResult，优先 erp（文件最多）和 pdm document/bom 模块 |
| ERP-02 | 事件总线实现已迁移 Redis Stream，event-driven.md 仍描述 Pub/Sub+RabbitMQ | 低危 | 文档漂移 | `docs/architecture/event-driven.md` §1/§4；`lib/shared-event/src/messaging.rs:3,92` deprecated 标注 | 新开发者按旧文档理解事件架构，误判消息持久化/可靠性语义 | 更新 event-driven.md：标注 V321 迁移，Redis Pub/Sub+RabbitMQ 为历史遗留，当前为 Redis Stream + DLQ |
| ERP-03 | Schema 命名文档与代码不一致（plugin_erp vs erp） | 低危 | 文档漂移 | `docs/architecture/database.md` §Schema 划分策略（plugin_erp 等）；`svc/erp/src/main.rs:57`（erp, public） | 新环境部署按 database.md 建 schema 会与代码 SEARCH_PATH 不匹配 | 更新 database.md Schema 对照表：实际 schema 名为 erp/scm/srm/pm/pdm（无 plugin_ 前缀） |
| ERP-04 | ERP 事件名缺模块前缀且事件类型数量与文档不符 | 低危 | 通信/文档漂移 | `svc/erp/src/modules/sales_order.rs:294`（publish_sales_order_created）；`docs/architecture/event-driven.md` §3.7（ErpSalesOrderCreated） | 事件消费方按文档名订阅会漏事件；事件溯源/排障时名实不符 | 统一事件命名规范：要么代码加 Erp 前缀，要么文档改为 SalesOrderCreated 等短名；补齐 ErpInventoryAdjusted/InvoiceGenerated 或从文档删除 |
| ERP-05 | erp 直读 finance/crm schema，跨组数据耦合 | 中危 | 耦合/数据架构 | `svc/erp/src/modules/opening_balance.rs:192`（finance.accounting_subjects）；`svc/erp/src/modules/search.rs:134`（crm.core_crm_customers） | erp 与 finance/crm 表结构耦合，finance/crm 改列会直接 break erp；物理库拆分时无法按域切库 | 长期目标：改为 finance/crm 提供只读 API，erp 通过 HTTP 获取；短期已由 only_own_schema_query! 白名单管控 |
| ERP-06 | scm/srm/pm 自定义 Prometheus Gauge 值硬编码 42.0（占位指标） | 低危 | 可观测性 | `svc/scm/src/main.rs:61`；`svc/srm/src/main.rs:64`；`svc/pm/src/main.rs:67` | 监控大盘出现 topems_scm_custom_metric=42.0 无业务含义，误导运维 | 删除占位 Gauge 或替换为真实业务指标（如供应商数、采购单数） |
| ERP-07 | 服务客户端初始化失败即 panic，可用性脆弱 | 中危 | 可靠性 | `svc/erp/src/main.rs:178-180`（HRM 客户端创建失败 panic）、`:193-195`（Finance）、`:208-210`（MES） | hrm/finance/mes 未启动或配置错误时 erp 整个进程崩溃，无法降级运行 | 客户端初始化失败时应降级为禁用模式（标记 client=None），调用时返回 503 而非启动期 panic |
| ERP-08 | srm 直写 unified_core.inter_module_sync，业务表跨 schema 写入 | 低危 | 数据架构 | `svc/srm/src/modules/data_sync.rs:933`（INSERT INTO unified_core.inter_module_sync） | srm 向 unified_core schema 写入业务数据，边界模糊；unified-core 升级表结构时影响 srm | 评估 inter_module_sync 是否应下沉为 public 共享表或独立 integration 服务的表；srm 应通过 integration 服务记录同步日志 |
| ERP-09 | services.yaml 依赖声明与实际代码依赖不符 | 低危 | 文档漂移 | `config/services.yaml:48`（erp dependencies=[unified-core]）；代码实际调用 hrm:8020/finance:8011/mes:8030 | 部署编排/依赖检查遗漏 hrm/finance/mes 启动顺序约束 | 补全 erp dependencies=[unified-core, hrm, finance, mes]；pdm dependencies 去掉 mes（仅事件依赖，非同步依赖） |
| ERP-10 | 组内服务无 gRPC 调用，全部 HTTP+事件，性能可接受但高频同步调用无熔断 | 低危 | 性能/可靠性 | 全组 grep tonic/grpc = 0；erp→hrm 通讯录代理每请求同步调用（addressbook.rs:200 等） | erp 通讯录列表每次查询同步调 hrm，hrm 慢/挂会拖垮 erp 请求；无断路器/超时配置（erp 客户端未设 timeout） | 为 TypedServiceClient 配置超时 + 熔断器；通讯录类读多写少数据可加本地缓存 |

---

## 4. 优点与亮点（客观，带证据）

1. **编译期 Schema 边界守护**：`only_own_schema_query!` 过程宏（`lib/shared-boundary/src/lib.rs:288-330`）在编译期解析 SQL 中的 `schema.table` 引用，跨 schema 直查直接 `compile_error!`，比运行时审计更早发现违规。本组 erp 对 finance/crm 的跨 schema 访问均显式声明白名单（opening_balance.rs:192 第三个参数 `"finance"`），边界治理可审计。

2. **事件发布在事务提交后**：erp 采购订单审批流程（`svc/erp/src/modules/purchase_order.rs:469-475`）先 `tx.commit()` 再发布事件，避免事务回滚后事件已发出的脏数据问题，符合 Outbox 模式雏形。

3. **多级缓存优雅降级**：所有服务的 L2 缓存初始化均支持 Redis 不可用时降级为纯 L1 moka 模式（如 `svc/erp/src/main.rs:95-108`：`Err((cache, warn))` 分支返回降级缓存并 warn），不阻塞启动。

4. **pdm 独立状态机纯函数校验**：`svc/pdm/src/modules/state_machine.rs:34-69` 将版本/ECN 状态转移表抽为纯函数 HashMap，handler 调用 `validate_version_transition`，非法转移返回 `TransitionError`，业务规则集中可测。

5. **Bootstrap 标准化程度高**：5 个服务全部走 ServiceConfig → bootstrap_service → build_application 三段式，路由前缀/权限中间件/健康检查/OpenAPI 自动装配，新增服务成本低。

6. **服务间认证规范化**：跨服务调用使用 JWT service token + 最小权限 scope（erp→hrm 带 `hrm:admin`、erp→finance 带 `finance:read`、erp→mes 带 `mes:admin`、srm/pm→workflow 带 `workflow:read`），见 `svc/erp/src/main.rs:171,186,201`。

---

## 5. 可视化数据

### 5.1 依赖边清单（本组服务对外全部边）

```json
[
  {"from": "erp", "to": "hrm", "kind": "http", "note": "通讯录代理：list_employees/list_departments/list_companies/get_employee（addressbook.rs:200,208,216,329,354,383,473）"},
  {"from": "erp", "to": "finance", "kind": "http", "note": "合并报表审批流转：submit/approve/reject/cancel approval（consolidation/common.rs:103-106）"},
  {"from": "erp", "to": "finance", "kind": "db", "note": "直读 finance.accounting_subjects（opening_balance.rs:192,534，schema_boundary 白名单放行）"},
  {"from": "erp", "to": "crm", "kind": "db", "note": "全局搜索直读 crm.core_crm_customers（search.rs:134，schema_boundary 白名单放行）"},
  {"from": "erp", "to": "mes", "kind": "http", "note": "生产订单→工单下达：create_from_erp（production_order.rs:536）"},
  {"from": "erp", "to": "unified-core", "kind": "http", "note": "NotificationServiceClient 通知推送（main.rs:164）"},
  {"from": "erp", "to": "unified-core", "kind": "db", "note": "读 public.audit_logs 统计活跃用户（main.rs:278）"},
  {"from": "erp", "to": "scm", "kind": "event", "note": "订阅 PurchaseOrderApproved（erp/event_handlers/mod.rs:86）"},
  {"from": "erp", "to": "pm", "kind": "event", "note": "订阅 PmProjectCompleted/PmProjectSettled（erp/event_handlers/mod.rs:126,134）"},
  {"from": "scm", "to": "erp", "kind": "event", "note": "发布 PurchaseOrderApproved → erp 订阅（scm/modules/purchase_order.rs:592）"},
  {"from": "scm", "to": "wms", "kind": "event", "note": "发布 InboundOrderRequested → wms 订阅（scm/modules/data_sync.rs:350,1363）"},
  {"from": "scm", "to": "srm", "kind": "event", "note": "订阅 SrmSupplierCreated/Updated/StatusChanged（scm/event_handlers/mod.rs:92-100）"},
  {"from": "srm", "to": "scm", "kind": "event", "note": "订阅 ScmPurchasePlanCreated/ScmSupplierEvaluated（srm/event_handlers/mod.rs:46,50）"},
  {"from": "srm", "to": "scm", "kind": "event", "note": "发布 SrmSupplierCreated/Updated/StatusChanged → scm 订阅（srm/modules/supplier.rs:442,470,746）"},
  {"from": "srm", "to": "unified-core", "kind": "http", "note": "workflow create_instance 供应商准入审批流（srm/modules/supplier.rs:1307）"},
  {"from": "srm", "to": "unified-core", "kind": "db", "note": "读写 unified_core.inter_module_sync 同步日志（data_sync.rs:860,933）"},
  {"from": "pm", "to": "unified-core", "kind": "http", "note": "workflow create_instance 项目立项审批流（pm/modules/project_approval.rs:128）"},
  {"from": "pm", "to": "hrm", "kind": "event", "note": "订阅 HrmEmployeeCreated/Updated（pm/event_handlers/mod.rs:39-44）"},
  {"from": "pm", "to": "erp", "kind": "event", "note": "发布 PmProjectCreated → erp 订阅 PmProjectCompleted（pm/modules/project.rs:328）"},
  {"from": "pdm", "to": "scm", "kind": "event", "note": "订阅 ScmShipmentReceived（pdm/event_handlers/mod.rs:43）"},
  {"from": "pdm", "to": "mes", "kind": "event", "note": "订阅 ProductionOrderCreated（pdm/event_handlers/mod.rs:39）"}
]
```

### 5.2 统计数字（实测）

| 指标 | 数值 | 测量方式 |
|------|------|---------|
| 服务数 | 5 | svc/{erp,scm,srm,pm,pdm} |
| 总文件数（.rs） | 295 | find -name "*.rs" \| wc -l |
| 总代码行数 | 148,350 | cat 全部 .rs \| wc -l |
| 同步 HTTP 出向边 | 8 | erp→hrm/finance/mes/unified-core；srm→unified-core；pm→unified-core |
| 组内同步调用环 | 0 | 组内服务间无 HTTP 调用 |
| 跨 schema DB 引用（业务表） | 4 处 | erp→finance×2、erp→crm×1、srm→unified_core×1（读+写） |
| 事件发布边 | 12 | erp×5、scm×2、srm×4、pm×3、pdm×1 |
| 事件订阅边 | 5 服务共 40+ 事件类型 | grep subscribe( 实测 |
| TopemsError 引用数 | 0 | grep -rn TopemsError \| wc -l |
| ApiResponse::error 手写错误 | 300+ | grep -rc 汇总（pm contract.rs 36、pdm document.rs 25、master_data_quality_loop.rs 33 等） |
| format! 错误拼接（modules 层） | 121 | grep format! \| grep 错误/失败 \| wc -l |
| tracing:: 埋点（modules 层） | 1,079 | grep -rc tracing:: 汇总 |
| gRPC/tonic 调用 | 0 | grep tonic/grpc = 0 |
| Bootstrap 模式分布 | B×5 | 全部 stateful + build_application |
