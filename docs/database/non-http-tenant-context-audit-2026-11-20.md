# B43-09 非 HTTP 入口租户上下文评估（2026-11-20）

- 状态：**评估完成；18 个事件消费入口的租户上下文与 DB 错误降级已全部收口，DEC-04 留余清零**
- 口径来源：[w7-cross-request-tenant-context-2026-11-10.md](../quality/w7-cross-request-tenant-context-2026-11-10.md)
- 扫描基线：`1ce4e5d03` + 本轮修复（静态扫描，不连生产）
- 结论：定时任务、消息消费、WebSocket、CLI、启动预热五类入口均有租户上下文或书面豁免；事件消费类发现并修复 SRM 零 UUID 兜底、ERP 缺租户 ACK、ERP 全局指标裸池三处问题。

---

## 1. 入口分类与判定

| 入口类别 | 代表位置 | 租户来源 | 判定 |
|---|---|---|---|
| HTTP 请求 | 各服务 `tenant_middleware` → `RlsTxnCell` | Claims + `x-tenant-id` | ✅ 不在本文范围，已有 RequestTenant |
| 事件消费 | `svc/*/src/event_handlers/` 共 18 个入口 | `payload.tenant_id` / `require_event_tenant(&event)` / 业务主键反查 | ✅ 机制统一；18 个入口缺租户与 DB 错误降级已全部收口 |
| Redis Stream 消费 | `unified-core/src/modules/master/consumer.rs`、`communication/ws_event_bridge.rs` | 事件 payload / `core_master_data_refs` 平台表 | ✅ 平台表无租户语义；WS 帧缺租户拒绝广播 |
| 定时任务 | `analytics` 报表调度、`erp` 业务指标、`unified-core` 审计清理/插件心跳 | 调度行 `tenant_id` / 显式系统通道 | ✅ 报表按租户执行；全局指标改系统只读通道 |
| WebSocket | BI `dashboard_websocket`、unified-core 事件桥 | 连接建立时 token → Claims | ✅ 看板归属校验 + 按租户频道广播 |
| CLI / 本地工具 | `admin_pass`、`openapi_gen`、`mcp-stdio`、`erp-e2e-cli` | 无业务租户 / 平台级 | ✅ 书面豁免（见 §3） |
| 启动预热 / 探针 | PDM 主数据计数、缓存预热、`probe_connection` | 系统只读通道 / 无租户 | ✅ 书面豁免（见 §3） |
| 迁移 / SQL 脚本 | `database/migrations`、`database/rollback` | DBA/迁移身份 | ✅ 不经过应用连接池，属部署面 |

---

## 2. 事件消费：本轮修复与证据

### 2.1 已修复

| 位置 | 修复前 | 修复后 |
|---|---|---|
| `svc/srm/src/event_handlers/mod.rs` `handle_supplier_data_sync` | `payload.tenant_id.unwrap_or_else(Uuid::nil)` 3 处，缺租户写零 UUID | 先取 `filter(|t| !t.is_nil())`，缺失返回 `ValidationFailed`；3 处绑定统一用 `tenant_id`，快照表也不再绑 `Option` |
| `svc/erp/src/event_handlers/mod.rs` SalesOrderApproved / PurchaseOrderApproved / EmployeeOnboarded / OpportunityWon / MesWorkReportSubmitted | 缺租户 `warn` 后 `return Ok(())`，事件被 ACK 丢失 | 改为 `ValidationFailed` Err，进入订阅器重试/DLQ |
| `svc/erp/src/main.rs` `update_business_metrics` | 裸 `&PgPool` 跨租户 `COUNT(*)`，fail-closed 后可能 0 行 | 改为 `Db::scope_read_system()`，每个指标独立只读事务 + 提交 |
| `svc/pdm`、`svc/scm` master-data ref（上一提交） | 同步失败 `warn` 后返回 Ok | 返回 `DatabaseQuery` Err，进入重试/DLQ |

### 2.2 明确豁免

| 豁免 | 位置 | 理由 |
|---|---|---|
| 旧事件按主键反查租户 | `svc/crm/src/event_handlers/mod.rs` `resolve_opportunity_tenant` | 只为建立作用域，系统通道只读单行 `crm.customers`，不读写业务行 |
| 主数据计数预热 | `svc/pdm/src/event_handlers/mod.rs` 3 处 `scope_read_system()` | 只读跨租户计数，写全局缓存；不落业务行 |
| 订阅器启动健康检查 | `svc/integration/src/event_handlers/mod.rs` `scope_system()` | 启动期连通性，不读业务数据 |
| 缓存失效日志失败降级 | `svc/hrm/src/event_handlers/mod.rs` | 观测性日志，失败返回 nil 后跳过记录；不影响业务写入 |

### 2.3 遗留（已按 DEC-04 收口）

- `PaymentReceived` / `PaymentMade`：入口前置 `payload.tenant_id.filter(!nil)`，缺租户 `ValidationFailed`；DB 错误返回 `DatabaseQuery`；仅“未找到匹配单据”保留业务 no-op。
- ERP 创建应收（SalesOrderApproved）/ 应付（PurchaseOrderApproved）/ 入职应付（EmployeeOnboarded）/ 项目应收（PmProjectSettled）：`ON CONFLICT DO NOTHING` 已吸收重复键，剩余 `Err` 一律 `DatabaseQuery` 上抛；EmployeeOnboarded 的 begin/commit 失败同样上抛。
- `InventoryUpdated`：此前 SQL 仅按 `material_code` 更新 `erp.account_balances`，存在跨租户写风险；现改为 `require_event_tenant(&event)` + `AND tenant_id = $4`，缺租户 `ValidationFailed`，DB 错误上抛，仅“无匹配余额行”保留业务 no-op。
- `svc/erp/src/event_handlers/mod.rs` 已无 `graceful fallback` 文本；剩余 `Ok(())` 均为明确业务 no-op（未配置入职成本、无匹配单据/余额、缺少结算金额）。
- CRM 事件消费：`PaymentReceived` 缺租户改 `ValidationFailed`；`AfterSalesTicketCreated` 交互记录改用事件租户，删除 NULL 租户写入并上抛 DB 错误；`OpportunityWon` 入口统一解析租户，无法确定即失败，跟进任务与应收共用同一 `tenant_id`；`ShippingOrderRequested` 销售订单补租户校验/过滤；`SalesOrderCreated` 台账同步缺租户不再跳过 ACK，DB 错误上抛。仅“客户记录尚未落库”保留业务 no-op。
- 保留豁免：HRM 缓存失效审计日志插入失败返回 nil（纯观测日志，不影响业务写入）；Portal 事件发布失败进入 `commit_retry` 重试队列（非静默 ACK）。
- PM 事件消费：`RdProjectCreated` 同步失败由 error 日志吞掉改为 `DatabaseQuery`，并走租户作用域写入；`SettlementCreated` / `SettlementApproved` 缺租户 `ValidationFailed`，改为租户作用域写入且结算更新带 `tenant_id` 过滤；`WorkflowApproved` / `WorkflowRejected` 载荷无租户，按 `business_id` 只读反查项目归属租户，无法确定即失败，审批与项目状态在同一作用域事务内提交；`HrmEmployeeCreated/Updated` 成员统计改用租户只读作用域，DB 错误不再 `unwrap_or(0)`。
- SCM 事件消费：采购订单创建/审批、入库关联订单、供应商同步、SRM 供应商快照、WMS 入出库快照、库存快照全部改为 `require_event_tenant` + `Db::scope_for_tenant`；删除 `tenant_id IS NULL` 写入，`COUNT` 失败不再 `unwrap_or(0)` 降级为“不存在”，快照/移动历史失败一律上抛。
- SRM 事件消费：采购计划、供应商考评、采购订单履约、SCM 供应商同步补齐租户前置与租户作用域；缺租户由 warn+ACK 改为 `ValidationFailed`，DB 错误不再仅记 error 日志。
- WMS 事件消费：`PurchaseOrderCreated/Approved` 快照缺租户不再静默跳过，`store_po_snapshot` 返回 `Result`，开作用域/写快照/提交失败均进入重试/DLQ。
- RD / Portal 事件消费：RD 项目创建/完成改为租户作用域写入并上抛 DB 错误；Portal 通知写入与项目概览统计改为租户作用域，统计读取失败不再 `unwrap_or(0)`。
- `svc/integration` 事件消费：`record_sync_log` 由 `scope_system` 改为 `scope_for_tenant`，三个 QMS→LIMS / EHS→QMS / LIMS→EHS trigger 缺租户由 warn+ACK 改为 `ValidationFailed`，同步日志写入失败由 `let _ =` 吞掉改为 `?` 上抛进入重试/DLQ。
- EHS 事件消费：本地 `require_event_tenant` 由 `Option<Uuid>` 改为 `Result<Uuid, TopemsError>`，缺租户累计 `EHS_EVENT_DROPPED_MISSING_TENANT` 并返回 `ValidationFailed`；LIMS 异常、QMS 纠正措施、HRM 员工变更三个 handler 全部改为 `?`，不再静默 ACK。
- Finance 事件消费：`EmployeeOnboarded` 读取入职成本配置后的事务提交由 `let _ =` 改为 `map_err → DatabaseTransaction` 上抛。
- HRM 事件消费：`PermissionOrPositionChanged` 缺租户由 warn+ACK 改为 `ValidationFailed`；缓存失效审计日志插入失败仍返回 nil 属观测性豁免（不影响任何业务写入）。

---

## 3. 定时任务、WS、CLI、启动预热

### 3.1 定时任务

| 任务 | 租户处理 | 判定 |
|---|---|---|
| `analytics` `ReportScheduler` | `begin_system_txn` 只枚举 active 调度；每条调度取 `tenant_id`，null 跳过；执行 `begin_tenant_txn(pool, tenant_id)` | ✅ 枚举系统、读写租户 |
| `erp` 业务指标（60s） | `Db::scope_read_system()`，每指标独立事务 | ✅ 全局聚合显式系统通道 |
| `unified-core` 审计保留/导出 | 平台审计表，无 `tenant_id`；系统任务 | ✅ 平台级豁免 |
| `unified-core` 插件心跳（30s） | `core.core_plugin_instances` 平台表，更新 `runtime_status` | ✅ 平台级豁免 |
| 各服务 15s 事件重试 relay | 只操作 Redis ZSET / 发布器，不读业务表 | ✅ 无 DB 业务行 |

### 3.2 WebSocket

- `svc/analytics/src/modules/bi/websocket.rs`：连接握手从 token 解析 Claims；看板查询带 `tenant_id = $2 OR is_public`，子资源按已校验的 `dashboard_id` 读取。
- `svc/unified-core/src/modules/communication/ws_event_bridge.rs`：`event_tenant()` 只取 `payload.tenant_id`；EHS/权限事件缺租户直接拒绝广播，Portal 通知无租户且无目标用户时丢弃；消费组已按部署形态区分（W2-§12.6）。

### 3.3 CLI（书面豁免）

| 二进制 | 说明 | 豁免理由 |
|---|---|---|
| `svc/unified-core/src/bin/admin_pass.rs` | 初始管理员密码生成与自校验 | 部署初始化工具，平台级账号，无租户业务行 |
| `svc/server/src/bin/openapi_gen.rs` | OpenAPI 文档生成 | 不连业务库 |
| `svc/ai/src/bin/mcp-stdio.rs` | 本地 MCP stdio 适配 | 本地开发工具，权限由宿主 Agent 控制 |
| `svc/erp/src/bin/erp-e2e-cli.rs` | 采购链纯函数 E2E | 不依赖 DB |

### 3.4 启动预热 / 探针

- `topems_shared_db::database::probe_connection`：`SELECT 1`，无业务表。
- PDM 主数据计数：系统只读，写全局缓存；已登记。
- 启动期 `run_schema_defense`：W2-D2 已全仓移除；单体 `analytics_real_module` 残留调用本轮同步删除，`topems-server` 编译恢复。

---

## 4. 验收与后续

- 每类入口均能指出租户来源或豁免条目；无“连接残留 GUC / 全局静态租户 / 零 UUID 默认租户”作为业务来源。
- 本轮新增修复：SRM 零 UUID、ERP 5 处缺租户 ACK、ERP 全局指标系统通道、单体 analytics 残留 DDL 调用。
- DEC-04 收口：ERP 事件消费 4 处 DB 错误降级改为 `DatabaseQuery`，`InventoryUpdated` 补租户过滤；CRM 结算、售后交互、商机赢单、出库转销售订单、客户订单台账均改为缺租户显式失败、DB 错误上抛；PM 审批、RD 项目同步、结算创建/审批全部改为租户作用域写入，审批事件按项目主键反查租户；SCM/SRM/WMS/RD/Portal 事件消费统一改为租户作用域并上抛 DB 错误；integration 同步日志改租户作用域并上抛写入失败；EHS 租户前置改 `Result` 并覆盖三个 handler；Finance 入职成本事务提交上抛；HRM 权限/岗位事件缺租户显式失败。18 个事件消费入口已无 graceful fallback 后静默 ACK，B43-09 标为完全闭环。
