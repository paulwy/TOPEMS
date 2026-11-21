# 请求事务 30s 语句超时落地

日期：2026-11-21

## 目标

§17.2 / E4-24 的生产前置之一：请求事务复用后，一条卡住的查询会长期占用唯一连接。本批把 `statement_timeout` 下推到请求事务和请求内作用域事务，默认 30s。

## 落点

| 路径                                                        | 行为                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/shared-auth/src/middleware/tenant.rs`                  | `tenant_middleware` 在设置租户 GUC 的同一条语句里设置 `statement_timeout`，事务级生效；默认 `30s`                           |
| `lib/shared-db/src/scope.rs` `apply_request_tenant`         | 请求上下文内自开 `scope` / `scope_read` / `scope_with` 时同样设置 `statement_timeout`，覆盖 `tenant_middleware_no_txn` 服务 |
| `lib/shared-db/src/scope.rs` `scope_read_for_tenant_stream` | WebSocket 每轮短读事务单独设置，避免慢查询卡住订阅循环                                                                      |

配置覆盖：环境变量 `TOPEMS_STATEMENT_TIMEOUT`，值直接传给 PostgreSQL（如 `30s`、`60s`）。非法值会让租户上下文设置失败并返回 500，不会静默退化为无超时。

后台/批处理路径（`scope_system`、`scope_for_tenant`、`scope_read_for_tenant`）**不设置** 30s，避免长导出/修复被误杀；这些路径需要按服务自行配置角色级或 DSN 级超时。

## 验证

- `cargo test -p topems-shared-auth --test rls_middleware_e2e --features db-tests`：6 passed，新增 `tenant_middleware_sets_statement_timeout` 断言默认 `30s`。
- `cargo test -p topems-shared-db --test scope_search_path_it`：8 passed，`scope_with_reuses_request_txn` 实测 `statement_timeout = 30s`。
- `cargo clippy -p topems-shared-auth -p topems-shared-db --all-targets -- -D warnings`：通过。
- 未执行任何生产配置变更；生产阈值、连接预算与压测仍需在停写窗口前完成。
