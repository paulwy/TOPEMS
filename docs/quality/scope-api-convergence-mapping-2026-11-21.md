# §17.2 作用域 API 收敛：影响面测绘（2026-11-21）

> 性质：**只读测绘，不改代码、不建迁移、不提交**。
> 基线：`3b8eb8280`（origin/main == main）。工作树仅 `.verify/` 未跟踪。
> 取数方式：全仓 `**/*.rs` 静态扫描 + 逐点人工核对调用语境；未连生产。
> 相关既有方案：[scope-with-plan-20261116.md](file:///Users/xingzhai/TOPEMS/docs/database/scope-with-plan-20261116.md)（其 474/125 数字同样已过期，本文取代其取数部分）。

## 0. 结论摘要

1. `scope_for_tenant` 全仓 **190 处 / 63 文件**，其中**生产真实调用 155 处**，其余 35 处为定义、注释、错误文案与测试。
2. 155 处里 **只有 2 个入口真正需要改`scope_with`**（analytics 写作用域 helper、unified-core 对账解决 handler）；
   其中计入 155 的只有 analytics 1 处（unified-core 是调用链，不新增 `.scope_for_tenant` 计数），
   因此 **154 处应进白名单**。40 处 EHS handler 与 10 处 WMS handler 是**已论证过的单连接/短事务目标态**，改了反而回退。
3. `scope_with` 与 `scope_for_tenant` 的核心差异不是「新旧 API」，而是**事务所有权、连接占用、租户来源、提交边界**四件事；最隐蔽的坑是租户来源漂移与提交语义变化。
4. 三项前置中：**30 秒事务超时未落地、长请求监控部分就绪、压测口径未就绪**；守卫 `deny_request_tenant_scope` 仅 4 个服务开启，且可被 `Db::new(pool)` 绕过（排除测试后现有 164 处 / 83 文件）。
5. TODO 的「125→0」应改为「**155 → 白名单数（当前测算 154），只减不增**」+ 静态门禁 + 运行期守卫双约束。

---

## 1. 190 处分类

### 1.1 总体分布

| 类别 | 处数 | 说明 |
|---|---:|---|
| 定义 | 1 | [scope.rs:248](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/scope.rs#L248) |
| 注释 / 文档引用 | 11 | 模块头、守卫文档、`tenant_sweep`、`tenant_context`、审计服务说明 |
| 错误文案 / 字符串 / 测试名 | 5 | `scope.rs` 125/249/252；测试断言与测试函数名 |
| 测试代码中的真实调用 | 18 | `svc/unified-core/tests/*` 8、`lib/shared-db/tests/*` 1、服务内 `#[cfg(test)]` 9 |
| **生产真实调用** | **155** | 明细见 §1.2–§1.5 |

### 1.2 生产调用按语境（互斥，逐点核对）

| 语境 | 处数 | 改 `scope_with`？ | 判据 |
|---|---:|---|---|
| A. 事件消费者 / `tokio::spawn` / 后台投影 | 95 | **否** | 无请求上下文；`apply_request_tenant` 会直接报 `Protocol`（fail-closed） |
| B. EHS HTTP handler | 40 | **否** | EHS 使用 `tenant_middleware_no_txn`，请求内没有可复用事务；该路径已是「1 请求 1 连接」目标态 |
| C. WMS HTTP handler（short-txn） | 10 | **否** | 先 `release_request_txn` 再开短事务，代码含 `wms-short-txn-exempt` W-01..W-10 与锁边界理由 |
| D. 共享 helper | 10 | **部分** | shared-db 8 已有 `_tx` 变体；ehs helper 无请求事务；analytics helper 是真实收敛点 |

### 1.3 A 类：后台 / 事件 / spawn（95 处）

| 文件 | 行号 | 说明 |
|---|---|---|
| [pm/event_handlers](file:///Users/xingzhai/TOPEMS/svc/pm/src/event_handlers/mod.rs) | 206, 295, 368, 431 | workflow / rd / settlement 事件 |
| [lims/event_handlers](file:///Users/xingzhai/TOPEMS/svc/lims/src/event_handlers/mod.rs) | 64, 139 | qms / ehs 事件 |
| [unified-core/audit/service.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/audit/service.rs) | 21 | middleware 在 `tokio::spawn` 中调用，task-local 已丢 |
| [wms/event_handlers](file:///Users/xingzhai/TOPEMS/svc/wms/src/event_handlers/mod.rs) | 146, 425 | 入库事件 / PO 快照 |
| [portal/event_handlers](file:///Users/xingzhai/TOPEMS/svc/portal/src/event_handlers/mod.rs) | 72, 224 | 通知 / 项目事件 |
| [integration/mes_erp_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/mes_erp_sync.rs) | 625, 670, 731, 777 | 同步记录读写 |
| [integration/mes_qms_integration.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/mes_qms_integration.rs) | 1124, 1151, 1216, 1261 | 重试 / 生产完成 / 检验完成 |
| [integration/crm_erp_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/crm_erp_sync.rs) | 211, 268, 305 | 同步记录 |
| [integration/erp_wms_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/erp_wms_sync.rs) | 203, 262, 299 | 同步记录 |
| [integration/crm_scm_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/crm_scm_sync.rs) | 203, 262, 299 | 同步记录 |
| [integration/hrm_finance_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/hrm_finance_sync.rs) | 204, 257, 293 | 同步记录 |
| [integration/sync_scheduler.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/sync_scheduler.rs) | 484, 529 | 定时调度 |
| [integration/event_handlers](file:///Users/xingzhai/TOPEMS/svc/integration/src/event_handlers/mod.rs) | 95 | 同步日志 |
| [crm/event_handlers](file:///Users/xingzhai/TOPEMS/svc/crm/src/event_handlers/mod.rs) | 210, 307, 368, 524, 816, 973 | 工单 / 商机 / 回款 / 发货 / 销售订单 |
| [mes/event_handlers.rs](file:///Users/xingzhai/TOPEMS/svc/mes/src/event_handlers.rs) | 73 | 生产订单下达 |
| [search/handlers.rs](file:///Users/xingzhai/TOPEMS/svc/search/src/handlers.rs) | 414 | 响应后 `tokio::spawn` 双写最近搜索 |
| [search/projection.rs](file:///Users/xingzhai/TOPEMS/svc/search/src/projection.rs) | 52 | 事件投影 |
| [master-data/supplier_sync.rs](file:///Users/xingzhai/TOPEMS/svc/master-data/src/modules/supplier_sync.rs) | 39 | `tokio::spawn` 后台同步 |
| [ehs/event_handlers](file:///Users/xingzhai/TOPEMS/svc/ehs/src/event_handlers/mod.rs) | 121, 201, 319 | LIMS / 纠正措施 / 员工变更 |
| [hrm/event_handlers](file:///Users/xingzhai/TOPEMS/svc/hrm/src/event_handlers/mod.rs) | 60 | 缓存失效记录 |
| [mobile/event_handlers](file:///Users/xingzhai/TOPEMS/svc/mobile/src/event_handlers/mod.rs) | 76 | 推送通知 |
| [ai/event_handlers](file:///Users/xingzhai/TOPEMS/svc/ai/src/event_handlers/mod.rs) | 59 | 训练样本 |
| [ai/ai_knowledge/service.rs](file:///Users/xingzhai/TOPEMS/svc/ai/src/modules/ai_knowledge/service.rs) | 609, 691, 711, 768, 791 | 文档异步处理 / 失败标记 |
| [finance/event_handlers](file:///Users/xingzhai/TOPEMS/svc/finance/src/event_handlers/mod.rs) | 232, 711, 1094, 1145, 1185, 1219, 1268, 1302 | 自动凭证 / 快照 / 对账 / 结算 |
| [scm/event_handlers](file:///Users/xingzhai/TOPEMS/svc/scm/src/event_handlers/mod.rs) | 141, 192, 260, 336, 563, 626, 684, 799, 917, 1008 | 采购 / 库存 / 供应商 / WMS 事件 |
| [erp/event_handlers](file:///Users/xingzhai/TOPEMS/svc/erp/src/event_handlers/mod.rs) | 363, 464, 637, 792, 870, 982, 1077, 1219, 1448, 1539, 1603, 1655, 1722 | 订单 / 员工 / 项目 / 库存 / 收付款 / 对账 / MES |
| [rd/event_handlers](file:///Users/xingzhai/TOPEMS/svc/rd/src/event_handlers/mod.rs) | 89, 150 | 项目事件 |
| [gis/event_handlers](file:///Users/xingzhai/TOPEMS/svc/gis/src/event_handlers/mod.rs) | 53 | 地图标记 |
| [srm/event_handlers](file:///Users/xingzhai/TOPEMS/svc/srm/src/event_handlers/mod.rs) | 102, 177, 252, 347 | 采购计划 / 评价 / 订单 / 供应商同步 |
| [srm/modules/supplier.rs](file:///Users/xingzhai/TOPEMS/svc/srm/src/modules/supplier.rs) | 157, 311 | `spawn_*_to_mdm` 后台任务 |

### 1.4 B 类：EHS HTTP handler（40 处，**不改造**）

EHS 在 [main.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/main.rs#L245-L251) 挂 `tenant_middleware_no_txn`，请求不预开事务；handler 内 `scope_for_tenant` 即唯一连接。恢复 `tenant_middleware` 才能用 `scope_with`，而生产嵌入池 `max=2` 下这会重新引入双连接自锁（W7-B4-EHS-FOLLOWUP-1）。

| 文件 | 行号 |
|---|---|
| [accident.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/accident.rs) | 349, 630, 693, 852, 1179, 1284, 1415 |
| [hazard.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/hazard.rs) | 787, 1069, 1309, 1412, 1704, 2435 |
| [environmental_compliance.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/environmental_compliance.rs) | 565, 1394, 1838, 2030, 2204 |
| [safety.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/safety.rs) | 200, 391, 556, 949 |
| [training.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/training.rs) | 251, 1508, 1711, 1955 |
| [data_sync.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/data_sync.rs) | 307, 382 |
| [emergency_plan.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/emergency_plan.rs) | 295, 693 |
| [environment.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/environment.rs) | 199, 547 |
| [integration.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/integration.rs) | 135, 234 |
| [emergency_drill.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/emergency_drill.rs) | 868 |
| [hazardous_material.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/hazardous_material.rs) | 355 |
| [health.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/health.rs) | 223 |
| [occupational_disease.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/occupational_disease.rs) | 918 |
| [occupational_health.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/occupational_health.rs) | 1322 |
| [risk.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/modules/risk.rs) | 239 |

### 1.5 C 类：WMS short-txn 豁免（10 处，**不改造**）

| 文件 | 行号 | 豁免号 |
|---|---|---|
| [inbound_order.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/inbound_order.rs) | 1291 | W-05 |
| [outbound_order.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/outbound_order.rs) | 1391 | W-06 |
| [inventory.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/inventory.rs) | 509 | W-07 |
| [transfer_order.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/transfer_order.rs) | 662, 1003 | W-08 / W-09 |
| [stock_take.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/stock_take.rs) | 625, 1066, 1512, 1774 | W-01..W-04 |
| [suggestions.rs](file:///Users/xingzhai/TOPEMS/svc/wms/src/modules/smart_replenishment/suggestions.rs) | 232 | W-10 |

### 1.6 D 类：共享 helper（10 处）

| 文件 | 行号 | 判定 |
|---|---|---|
| [master_data_refs.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/master_data_refs.rs) | 146, 211, 281, 326, 800 | 已有 `*_tx` 变体；非事务包装由后台/独立上下文调用，保留 |
| [reconciliation_log.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/reconciliation_log.rs) | 114, 158, 222 | 同上；唯一请求链路调用点在 unified-core（见 §3 B2） |
| [ehs/shared/permission.rs](file:///Users/xingzhai/TOPEMS/svc/ehs/src/shared/permission.rs) | 133 | EHS 无请求事务，保留 |
| [analytics/shared/mod.rs](file:///Users/xingzhai/TOPEMS/svc/analytics/src/shared/mod.rs) | 37 | **真实收敛点**：被 BI 写端点调用，服务有请求事务 |

### 1.7 测试（18 处，不纳入生产口径）

`svc/unified-core/tests/{master_redis_consumer_e2e,master_event_consumer_e2e,master_closed_loop_e2e}.rs` 8 处；
`lib/shared-db/tests/scope_search_path_it.rs` 1 处；
`svc/crm/src/event_handlers/mod.rs` 1206/1243、`svc/erp/src/event_handlers/mod.rs` 1975/2008/2018、
`svc/ehs/src/modules/integration.rs` 353/475、`lib/shared-db/src/scope.rs` 572/625 共 9 处。

---

## 2. `scope_with` 与 `scope_for_tenant` 的语义差异

| 维度 | `scope_for_tenant(t)` | `scope_with(&mut tx)` |
|---|---|---|
| 事务所有权 | 自 `BEGIN`；调用方必须 `commit()`；`Drop` 摘自有事务并登记请求 finalizer | 借用请求事务；`commit()/rollback()` 为 no-op，收尾归 `tenant_middleware` |
| 连接占用 | 请求事务之外**再占 1 条** | 0 额外 |
| 租户绑定 | 显式 `apply_explicit_tenant(t,false)` → `app.tenant_id=t`、`rls_system='off'`，**覆盖** task-local | `apply_request_tenant()` → 从 task-local 取；无上下文报 `Protocol`；service 身份为 nil + `rls_system='on'` |
| nil 租户 | 报 `Protocol`，不降级 | 不适用（nil 走系统通道） |
| 超时 | 无专属超时；继承池 `acquire_timeout`（15s） | 同左；**两者均无 `statement_timeout`** |
| 错误路径 | 独立事务，失败不影响外层；外层回滚**不会**回滚它 | 与外层同生共死，非 2xx 整体回滚 |
| 并发 | 可与请求并发，易形成「两次独立提交」 | `&mut Transaction` 排他，同刻只能存在一个 `ScopedTxn` |
| search_path | `SET LOCAL` 模块域 | 同左 |
| 收尾时机 | 调用方显式提交；未提交则 Drop 回滚 | 中间件统一提交/回滚，响应前 `drain()` finalizer |

### 2.1 收敛时最容易踩的六个坑

1. **租户来源漂移（最隐蔽）**：`scope_with` 用 task-local 租户，handler 变量可能来自 `require_tenant`/header。一旦中间件与变量不一致，写入会静默落到另一个租户；`scope_for_tenant` 永远用显式值。改前必须断言两者相等。
2. **提交语义变化**：原来已独立提交的同步/审计写入，改后会随外层非 2xx 一起回滚。WMS W-01..W-10 正是为此显式豁免。
3. **search_path 泄漏到同请求后续查询**：`SET LOCAL` 是事务级；handler 之后中间件写 `public.core_operation_logs` 若用裸名会被带进模块 schema。
4. **后台误改**：95 处后台调用改用 `scope_with` 会在第一条 SQL 前报 `Protocol`。必须保留 `scope_for_tenant` / `scope_system`。
5. **EHS 方向相反**：EHS 已无请求事务，要改先恢复 `tenant_middleware`，等于回退紧池修复。
6. **守卫可被绕过**：`Db::new(pool)` 构造的新句柄不带 `deny_request_tenant_scope`。排除测试代码后现有 164 处 / 83 文件（含测试目录的粗扫为 187/99），必须用静态门禁兜底。

---

## 3. 分批方案

| 批 | 范围 | 改动 | 验证 | 回退 |
|---|---|---|---|---|
| B0 | 全仓 | 新增 `scripts/ci/check-scope-api.mjs` + `scope-api-baseline.json`：按服务统计生产 `.scope_for_tenant(`，识别 `// scope-exempt: <reason>`，并冻结 `Db::new(`；接入 pre-commit 与 CI | 脚本输出与本文 155 / 164 一致 | 删脚本与基线 |
| B1 | analytics | `open_write_scope` 增加 `&mut Transaction` 参数，9 个 BI 写调用点改 `scope_with` | `cargo check -p analytics`；BI 写端点 e2e；假租户读 0 行 | 单 commit revert |
| B2 | unified-core master | `resolve_reconciliation_issue_handler` 取 `RlsTxnCell`，改用 `state.db.scope_with`；`MasterDataService` 改收 `&Db`，消除 `MasterDataService::new(state.pool.clone())` | 现有 handler 测试 + 对账解决 e2e + 假租户 | 单 commit revert |
| B3 | 守卫 rollout | 对「请求面已无未标记调用」的服务开 `deny_request_tenant_scope`；EHS/WMS 书面豁免并在门禁固定 | 每服务 `cargo test` + 冒烟；故意调用应报 `Protocol` | 去掉该行 |
| B4 | shared-db helper | 非事务包装标注 `_standalone`/deprecated，请求路径统一走已有 `_tx` 变体 | `cargo test -p topems-shared-db` | 单 commit revert |
| B5 | EHS/WMS 豁免固化 | 加 `// scope-exempt: no-request-txn` / `short-txn-exempt` 标记与说明 | 门禁识别且计数稳定 | 纯注释 |

- 不做双写、不做兼容层、不加 feature flag：迁移纯加性，按服务可独立 revert，无 DDL/数据变更。
- **明确不做**：不把 B/C 类改成 `scope_with`。
- B1/B2 与 B3 有顺序依赖：先改完该服务的请求面，再开守卫。

---

## 4. 前置条件现状

| 前置 | 状态 | 缺口 | 归属 |
|---|---|---|---|
| 30 秒事务超时 | **代码就绪（2026-11-21）** | `tenant_middleware` 与请求内 `Db::scope*` 已设事务级 `statement_timeout=30s`（`TOPEMS_STATEMENT_TIMEOUT` 可覆盖）；WebSocket 短读同样设置。仍缺生产阈值确认、连接预算与压测 | `lib/shared-db` / `lib/shared-auth`；运维确认生产取值 |
| 长请求监控 | **部分就绪** | 已有 `http_request_duration_seconds`、`DB_QUERY_DURATION`、500ms 慢查询阈值；缺「请求事务存活时长」指标与告警 | observability 增 `rls_txn_open_seconds` + 告警规则 |
| 压测口径 | **未就绪** | 有 k6 脚本与验收表（p95/p99、>100 RPS），但无当前连接预算/并发基线；`repo-wide-rls-pool-closure` 明确 wms 20 线程压测未做 | QA/perf + 各服务 owner |
| 守卫覆盖 | **部分** | unified-core/finance/mes/qms/analytics 已开启；2026-11-21 新增 communication/monitor/pdm/plugin-registry/ticket/tms；integration/gis 阻塞、EHS/WMS 豁免，逐服务结论见 §7.3 | B3 按服务推进 |
| 基线门禁 | **缺失** | 无脚本防止 190/155 回涨 | B0 |

---

## 5. 验收口径建议（替代「125→0」）

1. **T1（硬）**：`svc/*/src` 请求链路内 `.scope_for_tenant(` 生产调用 = **0**，除带 `// scope-exempt: <reason>` 的白名单；reason 枚举 `bg-event` / `bg-spawn` / `no-request-txn` / `short-txn-exempt` / `lib-standalone`。
2. **T2（硬）**：请求面已收敛的服务必须开 `deny_request_tenant_scope`；EHS/WMS 以书面豁免代替并在门禁固定。
3. **T3（基线）**：生产调用总数 **155 → 白名单数（当前测算 154）**，只减不增；不再以 0 为目标。
   仅 analytics helper 1 处会发生「替换」；unified-core 收敛是新增 `_tx` 调用路径，
   原 `reconciliation_log` 非事务包装仍服务后台，计数保留在白名单。
4. **T4（证据）**：每批提供三项证据——假租户 UUID 读取 0 行、`EXPLAIN` 的 `Scan.Schema` 固定、该服务 1 条请求 e2e 通过。
5. **T5（防绕过）**：请求 handler 模块内新增 `Db::new(` = 0；现有 164 处 / 83 文件冻结进基线（排除 `#[cfg(test)]` 与 `tests/`）。

> 说明：若后续把 EHS 迁回请求事务（需先解决紧池并发），B 类 40 处才重新进入收敛范围；在该前提成立前，将其计入白名单是唯一正确口径。

---

## 6. 执行进度

| 批 | 状态 | 证据 |
|---|---|---|
| B0 | 已完成（远端 `95a45ac26`） | `check-scope-api.mjs` + `scope-api-baseline.json` 接入 |
| B2 | 已完成（2026-11-21） | `resolve_reconciliation_issue_handler` 取 `RlsTxnCell`，经 `scope_with` / `scope_with_system` 复用请求事务；`MasterDataService::from_db(Db)` 替代 `new(state.pool)`；`resolve_reconciliation_issue_in_scope` 由调用方提交。新增 `lib/shared-db/tests/reconciliation_scope_it.rs` 验证「提交前外部不可见 / 未提交即回滚 / 重复标记 false」；`check-scope-api.mjs` 读数 `scope_for_tenant 155`、`Db::new 163`（较基线 164 下降 1，已核销） |
| B1 | 已完成（2026-11-21） | `open_write_scope` 改收 `&mut Transaction` 并走 `scope_with` / `scope_with_system`；28 个 BI 写 handler 取 `RlsTxnCell` 复用 `tenant_middleware` 请求事务；宿主 `svc/server` 的 analytics 模块补挂同一中间件。`cargo check/clippy -p topems-analytics` 通过，analytics lib 185、DB integration 6 全绿；门禁 `scope_for_tenant 155 → 154`，基线已核销 |
| B4 | 已完成（2026-11-21） | shared-db 的 8 个非事务包装（`MasterDataRefService` 5 个 + `ReconciliationLogService` 3 个）在方法文档标注 **Standalone（非事务）**，明确请求链路应改用对应 `_tx` / `_in_scope` 变体 |
| B5 | 已完成（2026-11-21） | EHS/WMS 写作用域豁免落注释：实际 **EHS 44**（41 `no-request-txn` + 3 `bg-event`）、**WMS 12**（10 `short-txn-exempt` + 2 `bg-event`）；同时修正门禁 `EXEMPT_RE` 缺 `m` 标志导致「同行豁免」不计数的缺陷。门禁读数 `total 154 / marked 56 / unmarked 98`，基线已核销 |
| B3 | 已完成（代码，2026-11-21） | 33 个 BI 读 handler + 2 处 reports-center 读路径改为复用 `RlsTxnCell` 的 `scope_with`；WebSocket 订阅保留每轮短读，但改走 `scope_read_for_tenant_stream`，门禁只允许该入口出现在 `websocket.rs`；`deny_request_tenant_scope` 已在独立部署 `analytics/main.rs` 与宿主 `svc/server` analytics 模块同时开启。新增 `topems_rls_request_txn_duration_seconds` / `topems_rls_request_txn_total`，按 success/error 观测请求事务 P99 |
| B4 读路径补齐 | 已完成（2026-11-21） | unified-core 主数据 10 个读/对账 handler 全部改为 `RlsTxnCell` + `scope_with`；shared-db 补 `_in_scope` 读变体（`list_by_tenant` / `count_*` / `max_*` / `duplicates` / `stale` / `query_reconciliation_logs` / `insert_from_master_data_refs`）；standalone 版本保留给后台。`cargo check -p topems-unified-core` 通过 |
| B3 门禁扩口径 | 已完成（2026-11-21） | `check-scope-api.mjs` 合并统计 `scope_for_tenant` + `scope_read_for_tenant`，基线结构迁移为 `scope_calls.files` 并给出分项；新读数 `total 239 / marked 56 / unmarked 183（for 98 + read 85）`、`Db::new 163`，基线已核销 |
| B3 守卫 rollout | 部分完成（2026-11-21） | 累计 13 个服务已开：communication、monitor、pdm、plugin-registry、ticket、tms、portal、pm、lims、master-data、search、ai、mobile，逐服务独立端口冒烟通过（mobile 为 114/114 契约冒烟）；crm/erp/hrm/rd/scm/srm 因请求 state 仍为裸 `PgPool` 需先迁移，排期见 [pgpool-to-db-migration-plan-2026-11-21.md](file:///Users/xingzhai/TOPEMS/docs/quality/pgpool-to-db-migration-plan-2026-11-21.md)；integration/gis 阻塞原因见 §7.3，EHS/WMS 维持豁免 |
| B3 生产前置 | 部分完成（2026-11-21） | 30s `statement_timeout` 已落在请求事务、请求内作用域与 WebSocket 短读（`TOPEMS_STATEMENT_TIMEOUT` 可覆盖）；连接预算/并发基线仍需按服务压测。代码守卫已开，但生产阈值未拍板前不得据此认定容量安全 |

> B2 的 e2e `master_ten_endpoints_form_closed_loop` 仍因测试库 `core_mdm_reconciliation_log.detected_at` 为 `timestamp without time zone`、Rust 侧 `DateTime<Utc>` 解码不匹配而无法端到端跑通（该用例原即 `#[ignore]`），本次改由 shared-db 事务边界回归覆盖；该时间类型漂移独立于 B2，另行处理。

---

## 7. B3 守卫「按服务 rollout」可行性摸底（2026-11-21）

### 7.1 守卫生效口径（本次核对）

- 守卫只在 `current_request_tenant()` 为 `Some` 时触发（[scope.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/scope.rs#L117-L131)），同时拦 `scope_for_tenant` 与 `scope_read_for_tenant`。
- 请求上下文由 **`auth_middleware` 写入**（[auth.rs](file:///Users/xingzhai/TOPEMS/lib/shared-auth/src/auth.rs#L1045-L1049)、[auth.rs](file:///Users/xingzhai/TOPEMS/lib/shared-auth/src/auth.rs#L1205-L1212)），**不依赖** `tenant_middleware`。因此：`tenant_middleware_no_txn` 的服务（EHS）一旦开守卫同样会打到自身 handler，豁免理由成立。
- `tokio::spawn` / 事件消费者不继承 task-local，后台调用不受守卫影响；这是「未标记存量集中在 event_handlers / spawn」仍可开守卫的依据。

### 7.2 门禁口径（已扩展，2026-11-21）

原 `check-scope-api.mjs` 只统计 `scope_for_tenant`，漏掉同样被守卫拦截的 `scope_read_for_tenant`，形成「0 未标记」假绿。本次已合并统计：

| 项 | 读数 | 说明 |
|---|---|---|
| `scope_calls.total` | **239** | `scope_for_tenant` + `scope_read_for_tenant` 生产调用点 |
| `scope_calls.marked` | **56** | 带 `// scope-exempt: <理由>` 的调用点 |
| `scope_calls.unmarked` | **183** | 98 `for_tenant` + 85 `read_for_tenant`，已作为新基线锁定，只减不增 |
| `db_new` | **163** | 与旧基线一致 |

- `scope_read_for_tenant_stream` 为 WebSocket 专用入口，单独统计（当前 1 处，仅允许 `websocket.rs`），不计入合计。
- 基线文件结构由 `scope_for_tenant.files` 迁移为 `scope_calls.files`，每文件同时给出 `for_tenant` / `read_for_tenant` 未标记分项；旧基线首次扩口径时允许 `--update-baseline` 重建，后续恢复正常「只减不增」校验。
- 未标记 183 的构成：98 写入口（历史基线值）+ 85 读入口；后者集中在 EHS/WMS 豁免面、integration 后台同步与 gis WebSocket 等明确不开守卫的服务，以及 shared-db standalone helper（由调用方事务替代后逐步核销）。

### 7.3 分服务结论（2026-11-21 执行后）

| 分组 | 服务 | 依据 | 结论 |
|---|---|---|---|
| 已开守卫 | unified-core（`main.rs` + `embedded.rs`）、finance、mes、qms、analytics（独立 `main.rs`）、`svc/server` analytics 模块 | 既有 | 保持 |
| **本次已开** | communication、monitor、pdm、plugin-registry、ticket、tms、portal、pm、lims、master-data、search、ai | 请求面零同步 scope 调用；逐服务构建 + 独立端口冒烟 `/health`=200；clippy `-D warnings` 通过 | 已加 `.deny_request_tenant_scope()`（12 个服务，各自单独提交） |
| 书面豁免 | EHS、WMS | EHS `tenant_middleware_no_txn` 下 44 处标记 + 11 处 `scope_read_for_tenant`；WMS 12 处标记 + 16 处 `scope_read_for_tenant` | 不开守卫，维持 §5 T2 |
| **本次已开** | mobile | 测试库按 `20261117235500` 基线重建并前向迁移到 `20261122150000` 后，`mobile-contract-smoke` 114/114 PASS、0 FAIL；clippy `-D warnings` 通过 | 已加 `.deny_request_tenant_scope()`（单独提交 `2c0bee07a`） |
| 阻塞（需迁移） | crm、erp、hrm、rd、scm、srm | `ApiState.db` / 模块 state 仍为裸 `PgPool`（如 [app_state.rs](file:///Users/xingzhai/TOPEMS/svc/crm/src/models/app_state.rs#L7)），handler 不经 `Db`，守卫加上也不生效；未标记点仅在后台上报 `scope_*`，请求面完全绕开 `Db` | 需先做模块级 `PgPool → Db` 迁移（与 unified-core 同等改造），排期见 [pgpool-to-db-migration-plan-2026-11-21.md](file:///Users/xingzhai/TOPEMS/docs/quality/pgpool-to-db-migration-plan-2026-11-21.md) |
| 测试库历史缺失 | topems_test | 原水位 `20261105235700`（= 2026-11-05 基线，576 行账本），目标表属后续前向迁移，并非单表遗漏；16 条 db08–db24 回填迁移被基线 `known_not_applied_versions` 登记为刻意不应用；`20261007000012` 因受控修改（`ff88d906c`）仍保留旧 checksum，`apply-forward` 不做历史校验 | 已从 `20261117235500` 基线重建 + 数据快照 + 前向 82 条到 `20261122150000`，账本 786 行全 success |
| 阻塞 | integration | HTTP handler 同步 `await` `sync_erp_to_mes` / `sync_mes_progress_to_erp` / `trigger_qms_inspection` 等，内部直接 `scope_for_tenant`（[mes_erp_sync.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/mes_erp_sync.rs#L617-L630)、[mes_qms_integration.rs](file:///Users/xingzhai/TOPEMS/svc/integration/src/mes_qms_integration.rs#L1208-L1220)） | 开守卫即 500；需先把同步入口改为请求事务复用 |
| 阻塞 | gis | WebSocket 循环内 `scope_read_for_tenant`（[websocket.rs](file:///Users/xingzhai/TOPEMS/svc/gis/src/modules/websocket.rs#L278-L284)），请求 task-local 仍在 | 需按 analytics 模式改用 `scope_read_for_tenant_stream` 后再开 |

### 7.4 unified-core 主数据读路径修复（已完成，2026-11-21）

摸底发现的读路径缺陷已全部修复，不再局限于两个 GET：

- 读 handler 统一取 `Extension<RlsTxnCell>`，经 `state.db.scope_with(&mut txn)`（nil 租户走 `scope_with_system`）复用请求事务；
- `MasterDataRefService` 新增 `_in_scope` 变体：`get_by_domain_and_code_in_scope`、`list_by_tenant_in_scope`、`count_by_*_in_scope`、`get_max_updated_at/last_synced_at_in_scope`、`count/list_duplicates_in_scope`、`count/list_stale_in_scope`；`ReconciliationLogService` 新增 `insert_from_master_data_refs_in_scope`、`query_reconciliation_logs_in_scope`；
- 覆盖 handler：`get_ref` / `get_ref_by_code` / `list_refs` / `get_overall_stats` / `get_sync_status` / `get_quality_report` / `list_duplicates` / `list_stale` / `run_reconciliation` / `list_reconciliation_logs`；
- standalone 方法保留给后台/事件路径，语义不变；`cargo check -p topems-unified-core` 通过。
