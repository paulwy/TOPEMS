# integration ERP→MES 成功路径本地桩验证（2026-11-22）

## 目的

用本机桩服务模拟 ERP 与 MES 的 HTTP 接口，把 `MesErpSyncService::sync_erp_to_mes` 的**成功分支**跑通，确认：

- 请求级 RLS 事务被复用并在结束前显式提交；
- `integration.mes_erp_sync` 从 `pending` 更新为 `success`，并回填 MES 订单 id；
- `integration.mes_erp_sync_logs` 落一条 `success` 日志；
- 在 `deny_request_own_txn` / `deny_request_tenant_scope` 开启时不触发守卫拦截。

范围限定：只在本机运行、只连本地测试库 `postgres:///topems_test`，不连接任何生产环境或真实 ERP/MES。

## 测试与桩服务

- 测试文件：`svc/integration/tests/mes_erp_sync_stub.rs`
- 桩服务：测试内用 axum 起在 `127.0.0.1:0`，只暴露两个端点：
  - `GET /api/erp/production-orders/{id}`：返回一条 ERP 生产订单（`data` 包裹）。
  - `POST /api/mes/production-orders/from-erp`：记录请求体，返回 `{"code":0,"data":{"id":"<mes uuid>","order_no":"..."}}`。
- 数据库：`TEST_DATABASE_URL` 必填，缺失即 panic，不回退到 `DATABASE_URL` 或硬编码 DSN。
- 前置 schema：测试库需已应用 `database/migrations/20261122160000_mes_erp_sync_mes_order_id_nullable.sql`（`mes_order_id` 可空 + successful 记录必须有 MES 单号）。测试直接跑真实 schema，不再临时放宽任何约束。
- 请求事务：测试手工 `pool.begin()` 得到 `RlsTxnCell`，用 `scope_request_tenant` 注入租户上下文，再调用 `sync_erp_to_mes`；服务的 `Db::scope_with` 复用该事务并负责提交。
- 测试标记 `#[ignore]`，常规 `cargo test` 不会执行。

## 运行命令

```bash
TEST_DATABASE_URL=postgres:///topems_test \
  cargo test -p topems-integration --test mes_erp_sync_stub -- --ignored --nocapture
```

本次运行结果：

```text
running 1 test
test erp_to_mes_success_branch_writes_state_and_log ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

## 验了什么

1. **请求事务内读写与提交**：同步记录、状态更新、日志三条写操作都发生在同一个请求事务内；服务结束前显式提交，测试用独立连接能读到已提交结果。
2. **状态更新**：`sync_status` 由 `pending` 变为 `success`，`mes_order_id` 回填为 MES 返回的 id，`erp_order_id` 为入参 id，`sync_error` 为空，`last_synced_at` 已写入。
3. **日志落库**：`integration.mes_erp_sync_logs` 恰一条，`sync_direction='erp_to_mes'`、`sync_type='create'`、`status='success'`、`attempt=1`、`error_message` 为空。
4. **守卫不拦截**：`Db` 同时开启 `deny_request_own_txn()` 与 `deny_request_tenant_scope()`（与 `svc/integration/src/main.rs` 一致），调用成功，错误信息中没有「请求上下文禁止」。
5. **HTTP 契约最小面**：ERP 桩命中 1 次、MES 桩命中 1 次；发给 MES 的 `erp_order.order_number` 与 `erp_order.order_id` 与 ERP 侧一致。

## 没验什么

- **真实 ERP 的字段差异**：真实 ERP 的字段命名、时间格式（是否 RFC3339）、数量类型（字符串/整数/小数）、状态枚举、空值处理都未覆盖；桩只返回当前代码期望的形状。
- **鉴权细节**：ERP/MES 的真实鉴权头、签名、证书、IP 白名单、租户透传方式均未覆盖；桩不校验任何鉴权。
- **真实 MES 的幂等与错误码**：重复下单、部分成功、业务错误码（`code!=0` 且 `success!=true`）、4xx/5xx 响应体形态未覆盖。
- **网络异常与重试时长**：超时、连接拒绝、重试退避的真实耗时不覆盖；成功分支不发生重试。
- **生产窗口未执行**：schema 修复件已就绪并在隔离库双向演练，但生产 DDL 尚未执行；生产上「本测试同样 PASS」需以窗口执行后的现场断言为准。
- **RLS 之外的授权**：只验证了租户 GUC 下的读写，不覆盖角色权限、审计字段、跨租户访问。

## 已修复：schema 与代码契约冲突（迁移 `20261122160000`）

首次原样运行曾失败，证据保留如下：

```text
DatabaseQuery("创建同步记录失败: error returned from database:
null value in column \"mes_order_id\" of relation \"mes_erp_sync\"
violates not-null constraint")
```

根因：

- `sync_erp_to_mes` 在 ERP→MES 方向先创建同步记录，此时 MES 订单尚未创建，`mes_order_id` 传 `None`；MES 返回成功后才回填。
- 但 `integration.mes_erp_sync.mes_order_id` 原为 `NOT NULL`（canonical 迁移 `database/migrations/20261121180000_integration_schema_canonical.sql:96`），成功分支在第一条 INSERT 就报 `23502`。

修复（按方案 A）：

- 新增迁移 `database/migrations/20261122160000_mes_erp_sync_mes_order_id_nullable.sql`：`mes_order_id` 改为可空；新增 `CHECK (sync_status <> 'success' OR mes_order_id IS NOT NULL)`，由数据库保证「成功必有 MES 单号」；迁移前断言不存在 `success + NULL` 行。
- 回滚件 `database/rollback/20261122160000_mes_erp_sync_mes_order_id_nullable.rollback.sql`：恢复 `NOT NULL` 前断言无 NULL 行，存在则明确失败、不自动删数据。
- 隔离库演练（`topems_drill_mes_erp_20261122`，已 drop）：迁移前 `NOT NULL`；迁移后 `pending + NULL` 允许、`success + NULL` 被 `23514` 拒绝；有 NULL 行时回滚明确失败，清理后回滚成功并恢复原形态。
- 测试已移除临时放宽逻辑，直接跑在应用该迁移后的真实 schema 上，重跑 PASS。
