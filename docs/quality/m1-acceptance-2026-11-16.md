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
- `forecast_v53` 的 3 个 `#[sqlx::test]` 用例补 `scope_request_tenant` + 显式事务；本地无建库权限（`permission denied to create database`）仍无法执行，属环境受限。
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
