# crm / srm / hrm / rd 裸池直连审计（2026-11-18）

口径与 wms 批次一致：只看 `&state.db` 这类**直接使用连接池**的位置，按用途分为
权限检查、审计写入、健康探针、真实业务 SQL；服务层/事件层另记。租户作用域的正确形态是
`Extension<RlsTxnCell>` + `RlsTxnCell` 请求事务，或 `Db::new(...).scope_with / scope_for_tenant`
（设置 GUC 后执行）。

## 1. 汇总

| 服务 | `&state.db` | 权限检查 | 审计写入 | 健康探针 | 业务 SQL 裸池 | RlsTxnCell 提取点 | tenant_middleware |
| --- | --- | --- | --- | --- | --- | --- | --- |
| crm | 152 | 116 | 36 | 0 | **0** | 123 | main.rs:372 |
| srm | 94 | 84 | 10 | 0 | **0**（handler 层） | 112 | main.rs:214 / 228 |
| hrm | 48 | 23 | 25 | 0 | **0**（handler 层） | 141 | main.rs:109 |
| rd | 27 | 0 | 24 | 1（`SELECT 1`） | **2**（本批已改） | 108 | main.rs:122 / 135 |

四个服务的业务路由均预应用 `tenant_middleware`，请求事务内 `app.tenant_id` 由 claims 写入。

## 2. 逐服务结论

### crm：0 处业务裸池

- `&state.db` 全部是 `check_permission(&state.db, ...)`（116）与 `log_audit_event(&state.db, ...)`（36，多行调用），
  不属于业务数据路径，保留裸池正确。
- 分析类接口（`modules/analytics.rs`）8 处已是 `Db::new(state.db.clone(), "crm, public, shared").deny_request_own_txn()`
  + `scope_with(txn)`，查询全部走 `&mut scope`。
- 事件层 `event_handlers/mod.rs` 20 条 SQL 均显式绑定租户（71 处 tenant_id 引用），属后台消费者既有范式。

### srm：handler 层 0 处；后台同步 2 处已改

- `&state.db` = 84 处权限检查 + 10 处审计，无业务 SQL。
- 后台同步 `spawn_srm_supplier_to_mdm` / `spawn_srm_supplier_delete_to_mdm` 原为裸池：读 `srm.suppliers`
  只按 `id`、无租户谓词，写 `master_data` 也无 GUC。本批改为
  `Db::new(..., "srm, public, shared")` + `scope_for_tenant(tenant_id)`，读补
  `AND tenant_id = $2`，写复用同一作用域并显式 `commit()`。
- 顺带修 `supplier_performance.rs:549` 的 `query_builder = query_builder;` 自赋值（clippy deny，
  既有问题，会阻塞 srm clippy 门禁）。

### hrm：0 处 handler 业务裸池；服务层为「裸池 + 显式租户谓词」

- `&state.db` = 23 处权限检查 + 25 处审计，无业务 SQL。
- `EmployeeService`（`services/employee_service.rs`）持有 `PgPool`，8 条查询、25 处 `tenant_id` 引用，
  每条读写都显式带租户条件（含超管全零旁路）。这是服务层既有范式，隔离不依赖 RLS，
  当前无跨租户面；未改动。风险是将来 `hrm.employees` 收紧为严格策略时，裸池无 GUC 会读 0 行
  ——随 hrm 的 RLS 收紧批次一起改成作用域执行器。
- 事件层 1 条查询，已绑租户。

### rd：2 处 handler 业务裸池 + 2 处事件写，本批已改

- `modules/settings.rs`：`get_settings` 裸池全表读、无租户谓词（跨租户混读）；`update_settings`
  绑租户但仍是裸池。改为 `RlsTxnCell` + `scope_with`，get 补
  `($2::uuid IS NULL OR tenant_id = $2::uuid)`（超管看全部，普通用户缺租户 401），
  update 走同一作用域并提交。
- `event_handlers`：项目事件 `INSERT INTO rs_projects` 未写 `tenant_id`（该列可空，会落 NULL 租户），
  完成事件 `UPDATE ... WHERE name = $2` 无租户谓词（可跨租户命中同名项目）。改为
  `require_event_tenant(&event)`（缺失/零租户直接拒绝）+ INSERT 补 `tenant_id` +
  UPDATE 补 `AND tenant_id = $3`。
- 物料/BOM 事件的两条 `COUNT(*)` 仅用于日志诊断，且对应 payload 结构无 `tenant_id` 字段，
  未改动（不是业务读写）。
- `repositories/project_repository.rs`（16 条池查询）只被 `services/project_service.rs` 引用，
  而 `ProjectService` 全仓无实例化，属死代码；未改，登记备查。

## 3. 验证读数

| 项 | 读数 |
| --- | --- |
| `cargo check --workspace --all-targets` | exit 0，0 warning / 0 error |
| `cargo test -p topems-erp`（第 1 件修复） | 894 + 894 + 13 + 2 + 1 + 15 passed，0 failed |
| `cargo test -p topems-srm` | 全绿（含 supplier/MDM 同步用例） |
| `cargo test -p topems-rd` | 32 passed，0 failed，13 ignored |
| `cargo clippy -p topems-srm/rd --all-targets` | exit 0 |
| `node scripts/ci/check-request-txn.mjs` | bare_txn 未上升（crm 196 / srm 211 / hrm 232 / rd 163） |

## 4. 边界

本批只改代码，无 DDL、无数据修复、无停服；未 push。
