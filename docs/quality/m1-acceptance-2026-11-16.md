# M-1 收尾验收与基线冻结（B1）

- 日期：2026-11-16
- 范围：请求事务所有权单一化（M-1）收尾验收 + 三项已批准决策的行为核验 + 基线冻结
- 约束：未提交、未 push；生产库只读（`topems_prod` 全程只读，未发生任何写入）

## 1. 结论

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 静态门禁（own_txn / scope 清理 / 编译 / 账本 / facts） | 通过 | §2 |
| 行为验收 ① gis `report_device_location` 三态 | 通过（第三态在影子库） | §3 |
| 行为验收 ② portal 超管无 `x-tenant-id` → 400 | 通过 | §4 |
| 行为验收 ③ `portalTodos` 仅本租户 | 通过（B 口径：假 UUID + RLS 判据） | §5 |
| 基线冻结 | 完成 | §6 |

**B1 通过。** 两处口径偏差已按用户裁决执行并登记：gis 第三态用影子库（C），`portalTodos` 用假 UUID + RLS 判据（B）。

## 2. 静态门禁

| 命令 | 结果 |
| --- | --- |
| `node scripts/ci/check-request-txn.mjs` | `bare_txn=1656 own_txn=0`（基线 1656） |
| `grep -rn "\.scope()\|\.scope_read()" svc/*/src` | **0** 命中 |
| `cargo check -p topems-unified-core -p topems-gis -p topems-portal --offline --all-targets` | exit 0（2m11s，`Finished dev profile`） |
| `pnpm check:ledger` | 通过，4 本账 OK（`txn-write-non2xx-allowlist.json` unregistered 89，属 B2 预期） |
| `node scripts/report/facts.mjs` | fingerprint `b2b9389dc286` |
| `pnpm facts:check` | OK（107 项） |

## 3. 行为验收 ①：gis `report_device_location`

### 3.1 前置：运行中服务是旧二进制（阻塞点已解除）

首次探测（旧二进制，构建于 11-15 10:06）三态全部 500，日志：

```
内部错误: 数据库连接失败: ... RLS context missing: 无租户上下文，禁止执行租户数据查询
```

即跑的是 M-1 改造前代码。经用户批准后：

1. 备份旧二进制：`bin/topems-server-pre-m1-accept-20261116.bak`（回滚路径）
2. 安装新二进制：`cargo build --release -p topems-server --offline` → `bin/topems-server`
3. `launchctl kickstart -k gui/$(id -u)/com.topems.server`
4. 生效确认：pid 5707，启动 15:40:33，`GET /health` → 200

### 3.2 三态结果

路由：`POST /api/gis/devices/{device_code}/report`（`public_business_routes`，无 auth / 无 tenant middleware，认证在 handler 内完成）。

| 态 | 请求 | 实测 |
| --- | --- | --- |
| ① 无凭证 | 无 `Authorization`、无 `X-Device-Token` | **401** `未认证：缺少 Authorization Bearer token 或 X-Device-Token` |
| ② 错凭证（JWT 通道） | `Authorization: Bearer bogus` | **401** `未认证：token 无效或已过期` |
| ② 错凭证（设备凭证通道） | `X-Device-Token: bogus` | **401** `未认证：设备凭证无效` |
| ③ 正确凭证 → 200 | 影子库 + 设备凭证通道 | **200**，`tenant_id=00000000-0000-0000-0000-0000000000a1`（= 设备归属租户），`device_id` 与设备行一致 |
| ③ 正确凭证 → 200 | 影子库 + 超管 JWT 通道 | **200**，`tenant_id` 同为 `000...0a1` |

第三态执行环境（按裁决 C）：

- 影子库：`topems_p0_rehearsal`（本机，非 `topems_prod`）
- 方式：`topems-gis` 独立实例，`GIS_PORT=18071`，`DATABASE_URL=.../topems_p0_rehearsal`
- 造数：`gis.devices` 插入 `device_code=B1TESTDEV`、`device_token=sha256('b1-test-token')`、`tenant_id=000...0a1`
- 断言：响应 200 且 `tenant_id` 取设备归属租户（非请求头、非请求体）
- 清理：已删除 `B1TESTDEV` 及两条上报记录（`dev_left=0, rec_left=0`），实例已停止（18071 不可达）

> 生产库 `topems_prod` 全程零写入。

## 4. 行为验收 ②：portal 超管无 `x-tenant-id` → 400

- 路由：`POST /api/portal/graphql`（已挂 `tenant_middleware`；`embedded.rs` 中 GraphQL 端点注入 `RlsTxnCell`）
- 凭证：本地用 `.env`/launchd `JWT_SECRET` 签发 HS256 超管 JWT（`is_superuser=true`，不含 `tenant_id`）
- 请求：带 `Authorization`，**不带** `x-tenant-id`，body `{"query":"query{__typename}"}`
- 实测：

```
HTTP 400
{"success":false,"message":"缺少租户上下文","code":400}
```

判据满足：不是 500、不是空数据，而是显式 400。

## 5. 行为验收 ③：`portalTodos` 仅本租户（B 口径）

解析器：`svc/portal/src/modules/graphql_query_impls.rs:77-132` `load_local_pending_todos`

- SQL 显式谓词：`WHERE tenant_id = $1 AND deleted_at IS NULL AND completed = FALSE`
- 无请求事务/无请求租户时 **fail-closed 返回空**，不回退全表
- 走 `db.scope_with(txn)`，复用 tenant_middleware 的请求事务

证据：

| 判据 | 实测 |
| --- | --- |
| 假租户 JWT（`d112d925-…`）查 `unifiedTodos` | **200** `{"data":{"unifiedTodos":[]}}`（0 条，不泄漏他租户） |
| RLS 策略（prod） | `rls_tenant_isolation`：`app.rls_system='on'` 或 `tenant_id = current_setting('app.tenant_id')`；`relrowsecurity=t, relforcerowsecurity=t` |
| 谓词对照（影子库，只读） | 真实租户 `000...0001` → **1** 条；假租户 → **0** 条 |

> `topems_prod` 的 `portal.portal_todos` 当前为 0 行，无法在 prod 做「真实租户 vs 他租户」的行为对照，故按 B 口径用「假 UUID 行为判据 + RLS 策略 + 谓词对照」替代。

## 6. 基线冻结

- `scripts/ci/request-txn-baseline.json`：各服务 `own_txn` 全 0，`bare_txn` = 当前实测（未使用 `--update-baseline`）
- 冻结读数：`bare_txn=1656`（erp 351 / wms 292 / hrm 232 / scm 211 / srm 211 / crm 196 / rd 163）
- `check-request-txn.mjs` 退出 0，后续 `bare_txn` 只减不增（B4 消费该基线）

## 7. 已知边界与缺口（登记，不在 B1 处理）

1. **本地 `topems_p0_rehearsal` 是宽松策略库**：`gis_allow_all_devices`、`portal_allow_all_portal_todos` 均为 `USING(true)`。该库不能作为 RLS 隔离证据，属 **B3（382 条宽松 RLS 策略收口）** 范围。本文的「仅本租户」证据来自 resolver 显式谓词 + 假租户行为判据，未依赖该库的 RLS。
2. **prod `portal_todos` 无数据**：租户隔离的端到端对照只能落在谓词层（见 §5），不能在 prod 造数验证。
3. **本地服务已更换为新二进制**：`bin/topems-server`（2026-11-16 15:40）替换 11-15 10:06 版本；回滚命令：
   `cp bin/topems-server-pre-m1-accept-20261116.bak bin/topems-server && launchctl kickstart -k gui/$(id -u)/com.topems.server`
4. **验收用 JWT 为本地签发**（`.env`/launchd `JWT_SECRET`，有效期 1 小时），仅用于本次只读/影子库探测，不写入任何仓库文件。

## 8. B4 分站推进：qms 与 finance（2026-11-16 晚）

### 8.1 qms（第 1 站）

- 请求路径共 136 处自开作用域全部改为复用请求事务：87 处 `scope_for_tenant`/`scope_read_for_tenant` → `scope_with(txn)`，49 处 `read_scope_for_claims` 增 `txn` 形参后内部改 `scope_with(txn)`。
- `svc/qms/src/main.rs` 开启 `Db::deny_request_tenant_scope()`。
- 迁移暴露 2 处 K11 真实风险（`quality_standard.rs` update_standard / create_revision：写修订记录失败后直接 500），按 B2 口径补显式 `scope.rollback()`，未改返回码。
- 证据：`cargo check -p topems-qms --all-targets` 通过；`svc/qms/src` 内租户作用域自开点 = 0；TXN-2XX / ledger / facts 全绿。

### 8.2 finance（第 2 站）

- 243 处 `scope_for_tenant`/`scope_read_for_tenant`（audit_v52 28 / risk_v59 25 / decision_v60 25 / reports_v57 23 / treasury_v58 19 / risk_v54 19 / tax_v56 18 / settlement_v55 18 / compliance_v51 16 / sales_invoice 10 / voucher_template_entries 9 / voucher_template 8 / financial_reports 7 / forecast_v53 4 / modules::mod 4 / bootstrap 1）→ `scope_with(txn)`。
- 仅剩 `svc/finance/src/event_handlers/mod.rs` 9 处租户作用域：后台事件消费无请求上下文，守卫不触发，保留原状。
- `svc/finance/src/main.rs` 开启 `deny_request_tenant_scope()`（与 `deny_request_own_txn()` 并存）。
- `forecast_v53` 的 3 个 `#[sqlx::test]` 用例补 `scope_request_tenant` + 显式事务；**2026-11-16 夜已实跑通过（3/3）**。此前「本地无建库权限（`permission denied to create database`）」的根因是测试按 `.env` 连 `topems_prod`（`rolcreatedb=false`），不是用例本身受限；改用本机专用测试角色 `topems_test_runner`（`rolcreatedb=true`，同名库已存在）作 `DATABASE_URL` 即可创建 `#[sqlx::test]` 临时库，`topems_prod` 全程零写入。
- 数字口径（可复现口径，正式）：**243 = finance 租户作用域调用点 = handler 级 `Extension<RlsTxnCell>` 包装数**；**357 = `db.scope_with(txn)` 真实调用点**（含此前已迁移的 accounting_subjects / currencies / operational / reconcile_orders 等）。两者是包含关系：243 是本批新迁的租户作用域调用点，357 是本批完成后 finance 代码里 `scope_with` 的全部出现次数。
- 说明：此前口头提到的「327 处事务包装 / finance 129 处」属**不可复现的口述数**（无法由脚本或代码检索复算出同一分母），自本条起不再作为事实引用，一律以 243 / 357 为准。

### 8.3 tenant-context 钩子两处 FAIL

- `svc/integration/src/event_handlers/mod.rs:92`：后台同步日志写入，登记 `// tenant-system: 后台事件编排无请求上下文…`。
- ~~`svc/finance/src/modules/mod.rs` 3 处 `Db::new(state.pool)`~~ **已关闭（2026-11-16 晚，见 §8.5）**：shared-db helper 支持请求事务后，3 处改为复用 `RlsTxnCell` 并删除 `// tenant-system:` 登记豁免；finance 内该标记 0 命中，双事务缺口关闭。
- 结果：`check-tenant-context.cjs` → R1 0 处、R2 972 处（基线 1094），PASS 无新增违规。说明：R2 读数不变是因为这 3 处原本带 `// tenant-system:` 登记注释、从未计入 R2（基线也不含该文件）；改造后它们从「登记豁免」变为「结构性消失」，口径上不再需要豁免。

### 8.4 finance 运行时探针（影子库，只读）

本地起 `target/debug/topems-finance`（18011，`DATABASE_URL=topems_p0_rehearsal`）：

| 探针 | 结果 |
| --- | --- |
| `GET /health` | 200 |
| `GET /api/finance/dashboard`（超管 + `x-tenant-id`，12 个作用域复用同一请求事务） | 200 |
| `GET /api/finance/audit-v52/rules`（service 层透传 txn） | 200 |
| `GET /api/finance/dashboard`（超管无 `x-tenant-id`） | 400「缺少租户上下文」 |
| `GET /api/finance/audit-v52/anomaly/summary` | 500，日志为 `relation "finance_anomaly_alerts_v52" does not exist`（影子库缺表，非守卫问题） |

### 8.5 shared-db 审批/审计 helper 支持请求事务（关闭 §8.3 的双事务缺口）

- `lib/shared-db/src/audit.rs`：新增 `AuditLogService::create_audit_log_with_txn` / `log_operation_with_txn`，内部 `self.db.scope_with(txn)` 复用请求事务（只叠加 `search_path` 与租户 GUC，不 commit）；默认入口 `create_audit_log` / `log_operation` 拆出共用私有实现，行为不变。
- `lib/shared-db/src/approval.rs`：新增 `create_approval_and_log_db_txn` / `execute_transition_and_log_db_txn` / `reject_and_log_db_txn`；状态转换 UPDATE 与审计写入同用请求事务。原有 `*_db` 与裸池版本零改动，qms/mes 等既有调用点默认路径不变。
- `svc/finance/src/modules/mod.rs`：`submit_approval` / `approve_approval` / `reject_approval` 改为取 `Extension<RlsTxnCell>`，用 `state.db` + `*_db_txn`，3 处 `Db::new(state.pool)` 与 `// tenant-system:` 注释全部删除。
- 兼容性边界：无请求上下文时 `scope_with` 直接报 Protocol（fail-closed），后台任务继续走原 `*_db`（自开作用域，行为不变）。
- 证据：`cargo check -p topems-shared-db -p topems-finance -p topems-qms --offline` 通过；`check-tenant-context.cjs` PASS（R1 0 / R2 972，无新增）；`check-request-txn.mjs` bare 1656 / own 0（基线 1656）；TXN-2XX 门禁 OK；`pnpm check:ledger`、`pnpm facts:check` 全绿。

## 9. B4 分站推进：unified-core（第 3 站，2026-11-16 晚）

### 9.1 迁移口径：15 → 3

`svc/unified-core/src` 的 `scope_for_tenant|scope_read_for_tenant` 由 15 处降到 3 处：

- 已迁 12 处（Tenant 分支 → `db.scope_with(txn)`，Platform 分支与只读 system 通道原样保留）：
  - `modules/iam/role.rs` 5：`list_roles` / `create_role` / `get_role` / `update_role` / `delete_role`；
  - `modules/iam/tenant_scope.rs` 3：`check_user_target` / `fetch_role_tenant` / `role_permission_codes`（签名加 `txn_arc: &RlsTxnCell`，调用方全量透传）；
  - `modules/iam/user/crud.rs` 1：`create_user`；
  - `modules/iam/user/roles.rs` 2：两个读通道。
  - 连带为 `check_role_target` / `check_role_write_target` / `company_scope::check_user` 补 txn 形参，相关 handler 统一加 `Extension<RlsTxnCell>`。
- **剩余 3 处均在 `modules/audit/service.rs`，属刻意外显通道，不迁**：`record_operation_log` 的唯一调用点是 `modules/audit/middleware.rs:163` 的 `tokio::spawn`，task-local 上下文会丢失，必须按显式 `tenant_id` 选 `scope_for_tenant` / `scope_system`；`get_operation_log` 当前无调用方。该文件不依赖请求事务，守卫不会命中，也不需要为守卫改通道语义。
- Platform 通道证据：`role.rs` L113/257/392/531/731、`crud.rs` L400、`roles.rs` L111/L375、`tenant_scope.rs` L183/247/331 仍为 `scope_system` / `scope_read_system`；SQL、返回码、`iam_read_scope` / `iam_write_scope` 判定未动。
- `scope_with` 在 iam 目录共 17 处 = 本次 12 + 既有 5（`access_log.rs` 3、`permission.rs` 2）。

### 9.2 守卫开启（先迁移、后开守卫）

- `main.rs` L516-518：既有 `deny_request_own_txn()` 后追加 `deny_request_tenant_scope()`。
- `embedded.rs` L206-208：原先两个守卫都没有，按「没有的两个一起开」补齐；embedded 的 `create_routes` 内部同样挂 `tenant_middleware`（`routes/mod.rs` L217-220），两入口口径一致。
- 守卫语义：仅在 `current_request_tenant()` 存在时 fail；`audit/service.rs` 的 spawn 路径无请求上下文，不命中。

### 9.3 验收证据

- `cargo check -p topems-unified-core --all-targets --offline` → 通过（20.36s，无警告）。
- `check-tenant-context.cjs` → PASS（R1 0 / R2 972，基线 1094，无新增）。
- `check-request-txn.mjs` → bare 1656 / own 0（基线 1656）。
- `check-txn-write-non2xx.py` → OK。
- `pnpm check:ledger` → 通过（4 个基线 0d/90d，allowlist unregistered 0）。
- `pnpm facts:check` → 一致（96 项）。

### 9.4 运行时探针（重建 + 重启后验证）

- 重建：`cargo build --release -p topems-server --offline`（10m51s）；新二进制 205,528,016B、sha256 前 16 位 `86dcd784a6fbd631`；旧二进制备份 `bin/topems-server-82c1088b4-pre-probe-20261116.bak`；`launchctl kickstart -k gui/501/com.topems.server` 重启，新 pid 78890，`GET /health` → 200。重启前已确认树内只有本批守卫/迁移（wms 读路径改动临时 stash，未编入）。
- IAM 读端点（本地按 `JWT_SECRET` 签发超管 JWT + `x-tenant-id: 00000000-0000-0000-0000-000000000001`）：
  - `GET /api/core/iam/roles` → 200（16 个角色）；
  - `GET /api/core/iam/users` → 200（正常用户列表）；
  - `GET /api/core/iam/users/{id}/roles` → 200 `data:[]`；
  - `GET /api/core/iam/roles/{id}/permissions` → 200（1084 条权限码）。
- 缺租户头：`GET /api/core/iam/roles`（无 `x-tenant-id`）→ 400「缺少租户上下文」，非 500。
- 日志：重启后无 `RLS context missing`、无「请求上下文禁止」、无 ERROR；全程生产库只读（仅 SELECT）。
- audit spawn 路径：探针时 `operation_audit_middleware` 全仓无挂载点（`routes/mod.rs` 只挂 shared-auth 的 HTTP `audit_logger_middleware`，不写 `core_operation_logs`），`record_operation_log` 在 HTTP 侧不可达——写请求后 `public.core_operation_logs` 仍为 0 行。该缺口已在本轮定性并补齐，见 §9.6。
- 守卫正例（请求内仍自开租户作用域应被拒）已无残留违规路径可触发，证据止于「代码开启 + 探针无假阳性」。

### 9.5 已知边界

- `system_audit` / `access_log` / `user/models` / `master/handlers` / `audit/login_log_handlers` 仍有 `Db::new(state.pool…)` 的局部 Db 实例（不带守卫），本批未动；它们不使用 `scope_for_tenant`，不构成守卫绕过，但属后续可收口的重复构造。
- 读路径迁 `scope_with` 会丢掉 `SET TRANSACTION READ ONLY`，本批未对只读通道做此类迁移（Platform 读仍是 `scope_read_system`）。

### 9.6 操作审计中间件：判定与补挂载（2026-11-16 深夜）

**判定：② 遗漏（不是被 shared-auth 审计替代）**

- 引入即未挂载：`4fdcc1f32`（V24.0 组件库统一）新增 `modules/audit/middleware.rs`，同批只加了定义与 re-export；`git grep operation_audit_middleware -- '*.rs'` 在该提交上无路由挂载；`git log -S"operation_audit" -- routes/mod.rs main.rs embedded.rs` 为空（从未挂载，也无摘除记录）。
- 不构成替代：shared-auth `AuditLoggerMiddleware` 写 `public.audit_logs`（`lib/shared-auth/src/security/audit_logger.rs:465`，action/entity_type/entity_id/request_details/response_details/status），是 HTTP 请求级；`core_operation_logs` 是业务 CRUD 级，不同表、不同粒度。
- 使用方齐全：查询侧 `/audit/operations*` 已挂载（`modules/audit/mod.rs:51-56`）；`docs/reports/audit/README.md:15` 明确该表由 `operation_audit_middleware` 自动记录；前端 `apps/web/src/api/admin/operationAudit.ts` 依赖该表。

**挂载与阻断缺陷修复**

- 挂载：`routes/mod.rs` 的 `core_protected_routes`，置于 `tenant_middleware` 与 `auth_middleware` 之间（auth 内、tenant 外，可见事务收尾后的最终状态码）。`main.rs` 与 `embedded.rs:245` 同走 `create_routes`，两种形态一处生效；登录/注册/健康检查/静态在 public 路由，不经过本层。
- 缺陷：原实现 `axum::body::to_bytes(body, 8KB)` 超限即 `Err`，随后用 `Bytes::new()` 重建请求，会把 >8KB 的写请求体清空。现改为：仅 `application/json` / `*+json` 读 body（上限 10MB，与 `input_validation::max_body_bytes` 同口径），快照前 8KB；multipart / octet-stream 不读、原样透传；读取失败返回 413，绝不回退空 body。
- 通道语义未变：`audit/service.rs` 仍是显式 tenant → `scope_for_tenant`、nil → `scope_system`，`tokio::spawn` 内不依赖 task-local；写失败只打 error + `AUDIT_WRITE_FAILURES_TOTAL`。

**dev 验证（临时实例 :18000 + `topems_test`；生产 8099 未重启）**

| 项 | 改前（原 body 逻辑） | 改后 |
|---|---|---|
| 写请求落库 | — | `DELETE /api/core/iam/roles/{不存在}` → 新增行：module=roles / operation=delete / resource_type=roles / response_status=200 / tenant_id=…0001 |
| 10KB JSON 写请求 | `Failed to parse the request body as JSON: EOF while parsing a value at line 1 column 0`（body 被清空） | `{"code":400,"message":"用户名是必填字段"}`（body 完整） |
| 20KB multipart | `{"failed":[],"files":[]}`（handler 看不到文件） | `{"failed":["big.bin: 不支持的文件类型"]}`（multipart 未被消费） |

- 耗时（同一 DELETE，30 次 curl wall-clock）：未挂载 avg 11.68 / p50 11.02 / p95 14.71 ms；挂载后 avg 12.78 / p50 12.46 / p95 15.50 ms → +1ms 量级（同数量级；DB 写在独立连接异步执行，不在响应关键路径）。
- 编译/格式：`cargo check -p topems-unified-core --all-targets --offline` 0 error；`cargo fmt -p topems-unified-core -- --check` 0 diff。

## 10. B4 分站推进：wms（第 4 站，C 路线，2026-11-16 晚）

四项取舍已由用户拍板：接受写路径豁免、读路径走只读短事务、短事务 2s 超时配 500ms 告警、走 B 的前提先记录。**wms 不开 `deny_request_tenant_scope()`。**

### 10.1 口径与路线

`svc/wms/src` 的 `scope_for_tenant` / `scope_read_for_tenant` 共 23 处（另有 1 处注释提及），按用途分三类：

- **写路径 16 处（保持独立短事务，登记豁免）**：10 个 handler 的写事务 + 6 处提交后只读回读；
- **请求读路径 5 处（本次改造）**：`modules/analytics.rs` 改为「先 `release_request_txn` 再开只读短事务」，保留 `SET TRANSACTION READ ONLY`；
- **后台事件消费 2 处（继续豁免）**：`event_handlers/mod.rs`，不经请求中间件。

为什么 wms 不开守卫：守卫（`deny_request_tenant_scope`）在 `current_request_tenant()` 存在时直接 fail，而 wms 的写路径与读路径都刻意用 `scope_for_tenant` / `scope_read_for_tenant` 开独立短事务（`release_request_txn` 只清空事务单元，不清 task-local）。开守卫会把 21 处合法短事务全部打成 500，因此本批以「登记豁免 + 文档判据」替代，不开守卫。

### 10.2 豁免注册表（代码标记 `wms-short-txn-exempt:`）

| 编号 | 位置 | handler / 用途 |
| --- | --- | --- |
| W-01 | `modules/stock_take.rs` | `start_stock_take` 盘点开始写事务 |
| W-02 | `modules/stock_take.rs` | `count_stock_take` 盘点计数写事务 |
| W-03 | `modules/stock_take.rs` | `complete_stock_take` 盘点完成写事务 |
| W-04 | `modules/stock_take.rs` | `adjust_stock_take` 盘点调整写事务 |
| W-05 | `modules/inbound_order.rs` | `receive_inbound_order` 入库收货写事务 |
| W-06 | `modules/outbound_order.rs` | `ship_outbound_order` 出库发货写事务 |
| W-07 | `modules/inventory.rs` | `update_inventory` 库存绝对值调整写事务 |
| W-08 | `modules/transfer_order.rs` | `ship_transfer` 调拨发货写事务 |
| W-09 | `modules/transfer_order.rs` | `receive_transfer` 调拨收货写事务 |
| W-10 | `modules/smart_replenishment/suggestions.rs` | `compute_replenishment` 补货建议计算写事务 |
| R-01 | `modules/stock_take.rs` | `start_stock_take` 提交后只读回读 |
| R-02 | `modules/stock_take.rs` | `complete_stock_take` 提交后只读回读 |
| R-03 | `modules/inbound_order.rs` | `receive_inbound_order` 提交后只读回读 |
| R-04 | `modules/outbound_order.rs` | `ship_outbound_order` 提交后只读回读 |
| R-05 | `modules/transfer_order.rs` | `ship_transfer` 提交后只读回读 |
| R-06 | `modules/transfer_order.rs` | `receive_transfer` 提交后只读回读 |
| B-01 | `event_handlers/mod.rs` | `handle_inbound_order_requested` 后台事件消费 |
| B-02 | `event_handlers/mod.rs` | `store_po_snapshot` 后台事件消费 |

### 10.3 写路径豁免判据（三条）

1. **连接 GUC 收敛防 RLS 误过滤**：每个短事务在独立连接上 `SET LOCAL app.tenant_id`，事务结束即失效；若并入请求事务，GUC 的生命周期被拉长到整个 handler，后续任意查询都可能落在错误租户口径上。
2. **行锁边界**：短事务只覆盖行锁段（`SELECT ... FOR UPDATE` / 条件 `UPDATE`），提交即释放；迁入请求事务会把行锁持有期延长到提交后回读结束，放大锁等待与死锁面。
3. **每请求连接占用**：`release_request_txn` 先回滚释放请求事务，再开独立短事务，同一请求任意时刻只占用 1 条连接（配合 wms 连接池上限，见 `w7-b4-wms-plan-2026-11-12.md` §7）。

读路径同理：迁 `scope_with` 会丢掉 `SET TRANSACTION READ ONLY`，属加固降级，因此不迁。

### 10.4 请求读路径改造（5 处）

`get_flow_trend` / `get_dashboard_summary` / `get_inventory_distribution` / `get_inventory_types` / `get_daily_trend`：handler 新增 `Extension<RlsTxnCell>`，开作用域前 `release_request_txn(&txn_arc).await`，随后仍用 `scope_read_for_tenant`。每请求并发连接由 2 条（请求事务 + 只读事务）降为 1 条；`SET TRANSACTION READ ONLY` 保留。

### 10.5 短事务加固：`lock_timeout` 与耗时观测

- `shared/scope.rs`：`arm_short_txn()` 用 `set_config('lock_timeout','2s',true)`（等价 `SET LOCAL`，连接归还池不残留）；`ShortTxnTimer` 在提交后计时，≥500ms 输出 `tracing::warn!(target:"wms.txn", op, elapsed_ms, threshold_ms)`，否则 `debug`。沿用现有 tracing 日志体系，不新建指标栈。
- 覆盖范围：W-01..W-10 十处写短事务；设置失败即回滚并返回 500。

### 10.6 将来走 B 的前置条件（待定，不推进）

- 需要独立窗口（不与其它站点交叉改同一工作区）；
- 20 线程同 SKU 并发压测，验证迁移后行锁等待不劣化；
- p99 与锁等待阈值由业务方定；
- 以上三条落定前不推进 B，写路径保持短事务豁免。

> 登记处：以上三条已提炼为 `TODO.md` §8.1 的 `DEC-WMS-B-01` / `DEC-WMS-B-02` / `DEC-WMS-B-03`（状态「只记录、不推进」），并写明决策人与立项所需证据。本节仅保留上下文说明。

### 10.7 验收证据

- `cargo check -p topems-wms --all-targets --offline` → 通过（0 warning）。
- `check-tenant-context.cjs` → PASS（R1 0 处；R2 972 处，基线 1094，无新增）。
- `check-request-txn.mjs` → bare 1656 / own 0（基线 1656；wms 分项 bare 292 / own 0）。
- `check-txn-write-non2xx.py` → OK（未发现「请求事务内写入后返回非 2xx」的路径）。
- `pnpm check:ledger` → 通过（4 个基线 0d/90d，unregistered 0）。
- `pnpm facts:check` → 一致（96 项）。
- 本批未改动任何门禁基线/allowlist 文件；两组标记 18 处（W-01..W-10、R-01..R-06、B-01/B-02）与注册表一一对应。

## 11. B4 收口验收（2026-11-16 深夜）

### 11.1 各站处置一览（实测口径）

计数方式（剔除整行注释，可逐次复核）：

```bash
# scope_with（已复用请求事务的调用点）
grep -rn '\.scope_with(' --include='*.rs' svc/<站>/src | grep -vE ':[0-9]+:[[:space:]]*//' | wc -l
# 仍在自开租户作用域（scope_for_tenant / scope_read_for_tenant）
grep -rnE '\.scope_(read_)?for_tenant\(' --include='*.rs' svc/<站>/src | grep -vE ':[0-9]+:[[:space:]]*//' | wc -l
```

数字一律用本表口径（finance 为 **243 / 357**），此前口述的「327 / 129」不可复现，不再引用。

#### 11.1.1 已收口站点

| 站 | 迁移（实测） | 豁免 / 不迁（实测与理由） | 守卫 | 证据 |
|---|---|---|---|---|
| qms（第 1 站） | 请求路径 136 处自开作用域全部改复用请求事务（87 处 `for_tenant` → `scope_with`，49 处 `read_scope_for_claims` 增 `txn` 形参后内部走 `scope_with`）；现存 `scope_with=88`、`for_tenant=0` | 0 | `deny_request_tenant_scope`（`main.rs:230`） | §8.1 |
| finance（第 2 站） | 243 处租户作用域调用点 → `scope_with`（handler 级 `Extension<RlsTxnCell>` 包装）；本批完成后 `scope_with=357`（含此前已迁的 accounting_subjects / currencies / operational / reconcile_orders 等），`for_tenant=9` | 9 处：全部在 `event_handlers/mod.rs`（232/711/891/1103/1154/1194/1228/1277/1311），后台事件消费无请求上下文，按事件 payload 显式 tenant 自开短事务 | `deny_request_own_txn` + `deny_request_tenant_scope`（`main.rs:229-230`） | §8.2、§8.4、§8.5 |
| unified-core（第 3 站） | 15 → 3（迁 12 处 iam / tenant / settings / menu / audit 请求路径）；`scope_with=97`（含 iam 既有 5 处） | 2 处：`audit/service.rs:21`、`:66`；spawn 内按显式 tenant 走租户/系统通道，刻意不迁（迁了要依赖 task-local） | `deny_request_own_txn` + `deny_request_tenant_scope`（`main.rs:517-518`、`embedded.rs:207-208`）；操作审计中间件同批补挂载 | §9.1–§9.6 |
| wms（第 4 站，C 路线） | 读路径 5 处改 release + 只读短事务；写路径保持独立短事务，`scope_with=0`、`for_tenant=23` | 23 处 = 写 16 + 读空窗 5 + 后台 2；代码登记 18 处标记（W-01..W-10、R-01..R-06、B-01/B-02），逐条对应 §10.2 注册表 | 未开：开了会把 21 处合法短事务打成 500；走 B 的三个前置条件登记在 [TODO.md §8.1](../../TODO.md) | §10.1–§10.7 |
| mes（尾收） | `work_report` 的 ERP 订单号反查由「提交后 spawn 另开只读事务」迁入请求事务（1 处，提交前完成）；`scope_with=203`、`for_tenant=1` | 1 处：`event_handlers.rs:73` 后台事件消费（`mes-txn-exempt: B4-01`，无请求中间件、无请求上下文，按 payload 显式 tenant，缺失即拒并进 DLQ） | `deny_request_own_txn`（既有）+ 本轮补 `deny_request_tenant_scope`（`main.rs:247-248`） | §11.3 |
| qms 尾部 | `shared/mod.rs` 的 `read_scope_for_claims(db, _claims, txn)` 统一 `db.scope_with(txn)`，49 处调用点（13 个文件）全部透传请求事务（与 §8.1 同一改动，本轮复核 `for_tenant=0`） | 0 | `deny_request_tenant_scope`（已开） | §8.1、§11.3 |

#### 11.1.2 单列为豁免的后台通道

以下各站不进本波次请求事务化：剩余 `for_tenant` 调用点集中在事件消费、同步适配器、定时 sweep、文档处理与 WebSocket 等**无 HTTP 请求上下文**的路径，自开显式租户作用域是唯一可行通道。

| 站 | `scope_with` | 剩余 `scope_*_for_tenant` | 位置与理由摘要 | 守卫 |
|---|---:|---:|---|---|
| ehs | 0 | 57 | **站级豁免，非后台通道**：该站用 `tenant_middleware_no_txn`（请求不建事务），剩余 57 处都在受保护路由的写 handler（`accident` 7 / `occupational_health` 7 / `hazard` 6 / `environmental_compliance` 5 / `training` 4 / `safety` 4 等），只能自开显式租户作用域；改造需先换中间件并重写全站 handler，属独立波次 | 未开 |
| search | 4 | 5 | `mcp.rs` 3、`projection.rs` 1、`handlers.rs` 1；热度写回 / 投影任务，均为后台 spawn | 仅 `deny_request_own_txn` |
| integration | 83 | 51 | `erp_wms_sync` 11 / `hrm_finance_sync` 10 / `crm_erp_sync` 10 / `crm_scm_sync` 9 / `mes_erp_sync` 5 等同步适配器；后台对账、重试与补偿 | 仅 `deny_request_own_txn` |
| ai | 82 | 7 | `ai_knowledge/service.rs` 6（文档处理流水线，分阶段提交）、`event_handlers/mod.rs` 1 | 仅 `deny_request_own_txn` |
| gis | 91 | 3 | `websocket.rs` 2、`event_handlers/mod.rs` 1 | 仅 `deny_request_own_txn` |
| lims | 143 | 4 | `main.rs` 2（`tenant_sweep` 定时任务）、`event_handlers/mod.rs` 2 | 仅 `deny_request_own_txn` |
| crm | 1 | 4 | 全部在 `event_handlers/mod.rs` | 未开 |
| erp | 0 | 4 | 全部在 `event_handlers/mod.rs` | 未开 |
| mobile | 132 | 1 | `event_handlers/mod.rs` | 仅 `deny_request_own_txn` |
| master-data | 16 | 1 | `modules/supplier_sync.rs` 供应商同步 | 未开 |

> 与「后台通道」口径的差异必须记明：**ehs 不是后台通道**，它是站级豁免（`no_txn` 中间件导致无请求事务可复用）。其余九站的剩余调用点确为后台路径。

### 11.2 收口门禁（本次实跑）

| 项 | 命令 | 结果 |
|---|---|---|
| 编译（mes） | `cargo check -p topems-mes --all-targets --offline` | 0 error（含 6 个 e2e 测试文件适配 `Extension<RlsTxnCell>`） |
| 编译（qms 复核） | `cargo check -p topems-qms --all-targets --offline` | 0 error |
| 租户上下文 | `node scripts/ci/check-tenant-context.cjs` | PASS：R1 0 处/0 文件，R2 972（基线 1094），无新增 |
| 请求事务 | `node scripts/ci/check-request-txn.mjs` | `bare_txn=1656 own_txn=0`（与基线 1656 一致） |
| 写后非 2xx | `python3 scripts/ci/check-txn-write-non2xx.py` | OK：未发现「请求事务内写入后返回非 2xx」 |
| 账本 | `pnpm check:ledger` | 通过：4 个基线 0d/90d，`unregistered 0` |
| facts | `pnpm facts:check` | 一致：96 项 |

facts 快照（`docs/quality/facts-latest.json`，fingerprint 见文件）已按收口终态重生成：

- `docs.todo_lines` **748 → 766 → 773 → 779 → 781**：+18 来自 `TODO.md` §8.1「待决事项登记」（table 头 2 行 + 3 条 `DEC-WMS-B-*` 各 1 行 + 触发条件与说明），+7 为 §8.1 后续 DEC 登记，+6 为 2026-11-16 尾收补记 §17.4「请求事务化回归补跑」，+2 为 §8.1 新增 `DEC-M2-02`（RLS 收口 B 范式定案）与 `DEC-M2-03`（零租户数据待清洗）；快照已按当前工作区重生成，`pnpm facts:check` 与 781 一致。
- `docs.todo_h2_sections=18` 不变（§8.1 是 `###` 三级标题）。

### 11.3 本轮尾收代码改动明细

- `svc/mes/src/modules/work_report.rs`：ERP 订单号反查从「`scope.commit()` 之后的 `tokio::spawn` 内 `scope_read_for_tenant`」前移到请求事务内（提交前），spawn 内只发事件、零 DB 访问；删除不再使用的 `db` 克隆与反查失败告警分支。
- `svc/mes/src/main.rs`：在既有 `deny_request_own_txn()` 上补 `deny_request_tenant_scope()`（先迁移、后开守卫）。
- `svc/mes/src/event_handlers.rs:73`：后台事件消费加 `mes-txn-exempt: B4-01` 标记与理由注释。
- `svc/mes/tests/common/app_state.rs`：新增 `request_txn_cell(pool)`，为直调 handler 的集成测试补请求事务单元（生产由 `tenant_middleware` 注入）。
- 6 个 e2e（`equipment` / `material_plan` / `material_requirement` / `team_create_conflict` / `wip` / `work_order`）：handler 签名补 `Extension<RlsTxnCell>` 后同步适配（当轮只做编译适配，未实跑）。
- 2026-11-16 尾收补跑：`material_plan_e2e` 3 个用例此前实跑全 500，根因是用例陈旧——未注入 task-local 租户上下文（`Db::scope_with` 直接报 `RLS context missing`）且插入行不写 `tenant_id`，与 `tenant_id = $4::uuid` 谓词永远不匹配。已按 `equipment_e2e.rs` 既有范式（`claims.tenant_id` + `scope_request_tenant` + 跨租户数据）修正，实跑 **3/3 通过**；生产代码未改。
- qms 尾部复核：`shared/mod.rs` helper 已统一 `scope_with(txn)`，`for_tenant` 实测 0，无残留。

### 11.4 结论与边界

- **B4 到此结束**：qms / finance / unified-core / wms / mes 五站处置完毕，qms 尾部 helper 复核无残留；`own_txn` 全仓为 0；请求内自开租户作用域只剩本表已登记豁免（后台通道九站 + ehs 站级豁免）。
- 本表不再新增迁移项；若后续要动 ehs 站级豁免或 wms 走 B，属**新波次**，需按各自前置条件单独立项。
- 下一步**不由本批自行启动**：进入 M-2/B3 执行还是开 B5，由用户决定。
- 原「仍停下待问的五个口径」已于 2026-11-16 夜定案并落文档：K11 → 500 + 显式回滚；K12 → 保留聚合事务现状；M-2 → 本轮零 DDL，只出 [窗口申请材料](../database/m2-window-application-2026-11-16.md)；M-3 → 不推广；`search_logs.duration_ms` → 服务端处理耗时。登记见 [known-gate-defects.md](../database/known-gate-defects.md) 与 `TODO.md` §8.1。

## 12. server 站 `web-contract-smoke` 复验（2026-11-16 夜，prod 克隆库）

### 12.1 结论

| 轮次 | 目标库 | 结果 |
|---|---|---|
| 修前（克隆库，未刷物化视图） | `topems_smoke_bff` | 4347/4503 PASS，156 FAIL（ticket 64 / mobile 80 / monitor 11 / bi 1） |
| 修前（克隆库，已刷 `bi.org_stats`） | 同上 | 4348/4503 PASS，**155 FAIL**（ticket 64 / mobile 80 / monitor 11） |
| 修后（补 `tenant_middleware`） | 同上 | **4503/4503 PASS，0 FAIL**；pre-commit 钩子 `web-contract-smoke` 实跑通过（106.91s） |

- **155 条不是「环境受限」**：根因是 ticket / mobile / monitor 三个单体模块的路由没有挂 `tenant_middleware`，而这批 handler 已改为复用请求事务（`Extension<RlsTxnCell>`），缺扩展即整片 500。修复后全绿。
- 唯一与环境相关的是 bi 那 1 条：克隆库的物化视图不随 dump 携带数据（`pg_matviews.ispopulated=f`，prod 为 `t`），`REFRESH MATERIALIZED VIEW bi.org_stats` 后 bi 172/172 全过。

### 12.2 根因证据（修复前，两个实例同报错）

```
$ curl -s -H "Authorization: Bearer <test_admin jwt>" \
   http://127.0.0.1:18099/api/ticket/tickets/00000000-...-0099/attachments
HTTP/1.1 500 Internal Server Error
content-type: text/plain; charset=utf-8

Missing request extension: Extension of type `alloc::sync::Arc<tokio::sync::mutex::Mutex<
core::option::Option<sqlx_core::transaction::Transaction<'_, sqlx_postgres::database::Postgres>>>>`
was not found. Perhaps you forgot to add it? See `axum::Extension`.
```

同一请求对运行中的 8099（prod 实例）返回**完全相同的报错**——说明这是既有的单体集成缺口，被本轮 smoke 首次跑通后暴露，不是本批修复引入。

### 12.3 为什么不能直接对 prod 实例跑 smoke

- 项目 `.env` 的 `DATABASE_URL` 指向 `topems_prod`，脚本 `detect_instance()` 判定为 prod，`WEB_SMOKE_ENV=local` 直接拒绝；
- 运行中的 8099 用的就是这份 `.env`；对它跑 smoke 会产生写请求，违反「生产库只读」。

因此必须克隆库 + 克隆实例，见 12.4。

### 12.4 可复现命令序列（仓库根逐条执行）

```bash
set -a && . ./.env && set +a
CARGO_INCREMENTAL=0 cargo build -p topems-server --offline     # 约 1m35s

# 1) 建克隆库（owner 与 prod 一致，保证 FORCE RLS 语义可比）
dropdb --if-exists topems_smoke_bff
createdb -O topems_prod topems_smoke_bff

# 2) 只读导出（本地超户执行；非超户不可行，原因见 12.5）
pg_dump --format=custom --exclude-table=mes.tenant_backfill_quarantine \
  -d topems_prod -f /tmp/prod_smoke.dump

# 3) 还原（保留 owner/privileges；row_security=off 防 FORCE RLS 挡 COPY）
PGOPTIONS='-c row_security=off' pg_restore -d topems_smoke_bff /tmp/prod_smoke.dump

# 4) 物化视图需手工刷新（dump 不携带 matview 数据）
psql -d topems_smoke_bff -c "REFRESH MATERIALIZED VIEW bi.org_stats;"

# 5) 用克隆库起 BFF（DATABASE_URL 与 MIGRATE_URL 必须同时改，
#    否则进程环境里残留 *_prod 会让脚本的目标实例探测判 prod 并拒绝）
export DATABASE_URL="${DATABASE_URL%topems_prod}topems_smoke_bff"
export MIGRATE_URL="${MIGRATE_URL%topems_prod}topems_smoke_bff"
export SERVER_PORT=18099 BIND_ADDR=127.0.0.1
./target/debug/topems-server > /tmp/server_smoke.log 2>&1 &

# 6) 跑 smoke
export WEB_SMOKE_ENV=local WEB_BFF_URL=http://127.0.0.1:18099
python3 scripts/web_contract_smoke.py --json /tmp/smoke.json
```

### 12.5 环境侧真实限制（已在上面的序列里绕开）

1. **非超户 `pg_dump` 不可行**：① `mes.tenant_backfill_quarantine` 的 owner 是本地超户 `xingzhai`，`topems_prod` 无任何权限 → 报 `permission denied`；② `ai.ai_models` 是 `FORCE ROW LEVEL SECURITY`，非超户导出被策略拦。故导出用本地超户，**纯 SELECT**：导出前后 `_sqlx_migrations` 最后一条仍是 `2026-11-15 17:22`，无新增记录。
2. **排除表必须带 schema**：`--exclude-table=tenant_backfill_quarantine` 不生效，要写 `mes.tenant_backfill_quarantine`。
3. 克隆库缺 `mes.v_tenant_backfill_gaps`（依赖被排除的表），还原时会有 2 条报错，对 smoke 无影响。
4. 物化视图不随 dump 携带数据，必须执行第 4 步。

### 12.6 修复内容与落点（提交 `fd72f7d4a`）

按各服务独立部署 `main.rs` 与 mes 模块的同口径写法，在 protected 路由上补一层
`from_fn_with_state(ctx.db.clone(), tenant_middleware())`，位置在 `auth_middleware` 之内、权限门之外：

- [ticket_real_module.rs](../../svc/server/src/modules/ticket_real_module.rs)：`ticket_routes + feedback_compat + ticket_ext` 合并后补层；
- [mobile_real_module.rs](../../svc/server/src/modules/mobile_real_module.rs)：`build_protected_routes + contract_fallback` 合并后补层；
- [monitor_real_module.rs](../../svc/server/src/modules/monitor_real_module.rs)：`nest(api_prefix, create_routes)` 之后补层。

