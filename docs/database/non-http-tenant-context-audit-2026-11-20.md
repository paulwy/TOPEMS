# B43-09 非 HTTP 入口租户上下文评估（2026-11-20）

- 状态：**评估完成；Payment* 留余已清零，剩余 DB 错误降级随 DEC-04 收口**
- 口径来源：[w7-cross-request-tenant-context-2026-11-10.md](../quality/w7-cross-request-tenant-context-2026-11-10.md)
- 扫描基线：`1ce4e5d03` + 本轮修复（静态扫描，不连生产）
- 结论：定时任务、消息消费、WebSocket、CLI、启动预热五类入口均有租户上下文或书面豁免；事件消费类发现并修复 SRM 零 UUID 兜底、ERP 缺租户 ACK、ERP 全局指标裸池三处问题。

---

## 1. 入口分类与判定

| 入口类别 | 代表位置 | 租户来源 | 判定 |
|---|---|---|---|
| HTTP 请求 | 各服务 `tenant_middleware` → `RlsTxnCell` | Claims + `x-tenant-id` | ✅ 不在本文范围，已有 RequestTenant |
| 事件消费 | `svc/*/src/event_handlers/` 共 18 个入口 | `payload.tenant_id` / `require_event_tenant(&event)` | ✅ 机制统一；2 处 ERP Payment* 可选分支遗留 |
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

### 2.3 遗留（转 DEC-04，不在本轮改）

- `PaymentReceived` / `PaymentMade` 已在本轮补齐：入口前置 `payload.tenant_id.filter(!nil)`，缺租户 `ValidationFailed`；DB 错误返回 `DatabaseQuery`；仅“未找到匹配单据”保留业务 no-op。
- `svc/erp/src/event_handlers/mod.rs` 仍有 16 条 `graceful fallback` 文本（含注释与业务 no-op）；其中创建应收/应付、入职应付、项目应收、库存余额更新等数据库错误分支需逐条区分 `Err` vs 幂等冲突，继续随 DEC-04 收口。

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
- 后续仅剩 ERP 创建应收/应付、入职应付、项目应收、库存余额更新等数据库错误降级，随 DEC-04 逐条区分幂等冲突后收口；处理完可在 `TODO` 将 B43-09 标为完全闭环。
