# 数据库门禁已知缺陷登记

编号沿用当前的 K 系列（本文件首条为 **K6**）。未修复条目写现状与建议修复方案，已修复条目写修法、提交号与自测结论。

## K6 ledger-ddl-drift 门禁对「无 _sqlx_migrations 的库」放行 —— 已修复（2026-11-15）

- **状态**：已修复，提交 `522bbf166`（`scripts/migration/check-ledger-ddl-drift.mjs`）。
- **位置**：[scripts/migration/check-ledger-ddl-drift.mjs](../../scripts/migration/check-ledger-ddl-drift.mjs)，pre-push 门禁 `ledger-ddl-drift`（`lefthook.yml`）。
- **原现象**：目标库可连接但没有 `_sqlx_migrations` 表（空库、新建库、误指其他库）时，清单内 12 项断言全部按「源迁移未记账」打 NOTE 跳过，最后输出 `PASS 断言 12 项，记账校验 0 项` 并 **exit 0**，只留一条 WARN。
- **原实测（2026-11-15）**：`MIGRATION_DRIFT_DB_URL` 指向本地 `topems_test`（无账本）执行 `bash scripts/ci/check-ledger-ddl-drift.sh`，输出前述 NOTE 与 `PASS`，退出码 0。
- **修法（fail-closed）**：以下三种「无有效账本」情形一律 `FAILED` + exit 1，并打印目标库、现状与修复指引：
  1. 可连但 `to_regclass('_sqlx_migrations') IS NULL`；
  2. 表存在但 `count(*) = 0`；
  3. 表有行、但断言清单涉及的版本命中 0 条（指向了非本仓库迁移链的库）。
  仅当显式设置 `MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1` 才放行，且输出以 `!!!!` 包裹的显眼 `WARN`（含目标库、命中 0 条原因、`本次未执行任何结构断言，本结论不可用于发布判定`），CI 不应设置该变量。
  有账本时 12 项断言的判定逻辑（`isDrift`、`expectedLabel`、`skip_if_applied`、`success=false` 失败）**未做任何放宽**。
- **自测（2026-11-15，本地）**：
  - 有账本且一致（`topems`，688 行）→ `PASS 断言 12 项，记账校验 9 项`，exit 0；
  - 有账本且漂移（临时库仅插 `_sqlx_migrations` 12 个 version、无实际表）→ `FAILED 12 项漂移`，exit 1；
  - 可连但无账本（`topems_test`）→ `FAILED 目标库无 _sqlx_migrations 表`，exit 1；
  - 同场景加 `MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1` → `PASS(WARN)`，exit 0 且 WARN 可见。
- **复现命令**（本地 socket 库，连接串按需替换）：

  ```bash
  # A 有账本且一致 → PASS / 0
  MIGRATION_DRIFT_DB_URL="postgresql:///topems?host=/tmp&user=$USER" node scripts/migration/check-ledger-ddl-drift.mjs
  # C 可连但无账本 → FAILED / 1
  MIGRATION_DRIFT_DB_URL="postgresql:///topems_test?host=/tmp&user=$USER" node scripts/migration/check-ledger-ddl-drift.mjs
  # D 同 C + 显式豁免 → PASS(WARN) / 0
  MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER=1 MIGRATION_DRIFT_DB_URL="postgresql:///topems_test?host=/tmp&user=$USER" node scripts/migration/check-ledger-ddl-drift.mjs
  # B 有账本但结构漂移（临时库：只建 _sqlx_migrations 并插入断言源版本，不建业务表）→ FAILED / 1
  createdb -h /tmp topems_k6_drift
  psql "postgresql:///topems_k6_drift?host=/tmp&user=$USER" -c "CREATE TABLE _sqlx_migrations(version bigint, success boolean); INSERT INTO _sqlx_migrations VALUES (20260918000014,true),(20260926120000,true),(20261007000005,true),(20261007140000,true),(20261106000000,true),(20261107000005,true),(20261107000006,true),(20261107000017,true),(20261107000018,true); CREATE TABLE public.core_permissions(id bigint, code text, description text); CREATE TABLE public.core_role_permissions(permission_id bigint, role_id bigint); CREATE TABLE public.core_roles(id bigint, name text);"
  MIGRATION_DRIFT_DB_URL="postgresql:///topems_k6_drift?host=/tmp&user=$USER" node scripts/migration/check-ledger-ddl-drift.mjs
  dropdb -h /tmp topems_k6_drift
  ```
- **建议后续（未做）**：CI 侧禁止注入该豁免变量；如需更强约束，可要求豁免必须同时提供工单号（`MIGRATION_DRIFT_ALLOW_EMPTY_LEDGER_TICKET`）并写审计日志。

## K9 plugin-registry 全量 `Db::scope*` 缺 RLS 上下文 —— OPEN（2026-11-15 登记，不修）

- **现象**：2026-11-15T08:11:51Z（主机本地 16:11:51，UTC+08）同一页面加载触发两条 ERROR，间隔 47ms：
  ```
  2026-11-15T08:11:51.095164Z  INFO  topems_plugin_registry::modules::plugin::handlers::marketplace: [Plugin] Listing plugins with filters: PluginFilters { category: None, search: None, is_free: None, sort_by: None, page: None, page_size: None }
  2026-11-15T08:11:51.096724Z ERROR  topems_plugin_registry::modules::plugin::handlers::marketplace: [Plugin] Failed to open read scope: encountered unexpected or invalid data: RLS context missing: 无租户上下文，禁止执行租户数据查询；后台任务/脚本请改用 Db::scope_system()/scope_read_system() 或按租户遍历
  2026-11-15T08:11:51.135479Z  INFO  topems_plugin_registry::modules::plugin::handlers::runtime: [Plugin] Fetching navigation config for tenant: Some("00000000-0000-0000-0000-000000000001")
  2026-11-15T08:11:51.142988Z ERROR  topems_plugin_registry::modules::plugin::handlers::runtime: [Plugin] Failed to open read scope: encountered unexpected or invalid data: RLS context missing: 无租户上下文，禁止执行租户数据查询；后台任务/脚本请改用 Db::scope_system()/scope_read_system() 或按租户遍历
  ```
  对应端点：`GET /api/plugin/marketplace/list`、`GET /api/plugin/navigation-config`。
- **根因**（两处叠加）：
  1. plugin-registry 用的是**自己实现**的 `jwt_auth_middleware`（[svc/plugin-registry/src/shared/middleware.rs:13](../../svc/plugin-registry/src/shared/middleware.rs#L13)），只校验 JWT 并注入 `Claims`，**从不调用** `topems_shared_auth::middleware::tenant::scope_request_tenant`；而 `Db::scope_read()` 的 `apply_request_tenant()` 只认 task-local `RLS_REQUEST_TENANT`（[lib/shared-db/src/scope.rs:273](../../lib/shared-db/src/scope.rs#L273)），缺失即 `sqlx::Error::Protocol`。
  2. `marketplace` 系列路由被单独挂在**无鉴权**的 `stateful_public`（[svc/plugin-registry/src/main.rs:85](../../svc/plugin-registry/src/main.rs#L85)-129），且路径前缀被 `is_public_path` 豁免（[lib/shared-auth/src/auth.rs:894](../../lib/shared-auth/src/auth.rs#L894)-911），连 Claims 都没有。
- **影响面**：机制上是**系统性**的——plugin-registry 内任何走 `Db::scope*` 的 handler 都会这样失败，不只是这两个端点。当前生产日志覆盖 2026-11-14T06:58Z 起至今，该错误全量仅 2 次（两个端点各 1 次），说明其余 scope 路径尚未被真实调用。
- **风险评估**：**当前无数据泄漏**。失败发生在作用域事务建立之前，零 SQL 下发，handler 直接返回错误（fail-closed）。**禁止**用"未设 GUC 即豁免/兜底放行"的方式消除报错：那会让 `navigation-config` 这类租户表查询（`iam.core_tenant_plugins`）失去 RLS 兜底，等于把 K8 刚收紧的 fail-open 重新打开。
- **修复方向（未实施）**：
  - 首选：plugin-registry 的 `jwt_auth_middleware` 内补 `scope_request_tenant(rls_request_tenant(&claims), next.run(req))`，与其它服务对齐；
  - 或：把这些 handler 显式改走 `scope_read_system()` 并在 SQL 里显式绑定租户谓词；
  - `marketplace` 查的是全局目录表 `core.core_plugins`（按设计无租户谓词），走 system 作用域合理；`navigation-config` 必须保留租户谓词与 RLS。
- **状态**：OPEN，与 B 类 8 列（代码引用不存在的列）一起在代码轮处理，不在补列迁移内动手；本批只登记。

