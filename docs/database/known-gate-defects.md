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

## K10 382 条 RLS 策略「未设上下文即放行」 —— OPEN（2026-11-16 登记，不修，不阻断）

- **来源**：§17.2 `scope_with` 方案定稿时按「未设 `app.tenant_id` 是否必须 0 行」这一判据（方案文档 §7 判据 ②-b）做全量策略分类时发现。
- **取数**（只读查 `pg_policies`，`cmd IN ('SELECT','ALL')` 且 `qual` 非空，共 1030 条；其中 962 条谓词含 `app.tenant_id`，68 条为 owner/角色类非租户谓词）：

  | 谓词形态 | 条数 | 含义 |
  |---|---|---|
  | 有 `app.rls_system='on'` 逃生口 + 未设即拒 | **579** | 正确态 |
  | 无逃生口、未设即**放行** | **370** | 跨租户放行风险 |
  | 既有逃生口、又有未设即放行分支 | **12** | 两种旁路叠加 |
  | 无逃生口、未设即拒 | **1** | 安全但系统通道不可用 |
  | 非租户谓词（owner/角色） | **68** | 不适用该判据 |

- **样例**：`pm.projects` 为正确态 `app.rls_system='on' OR tenant_id = current_setting('app.tenant_id')`；`rs.projects` 为 `current_setting(...) IS NULL OR tenant_id IS NULL OR tenant_id = '000…0'`，即**未设 GUC 直接返回全表**。
- **影响**：只要出现「事务未带 `app.tenant_id` 却查了租户表」，这 382 条策略不会 fail-closed。当前请求链路由 `tenant_middleware` 强制写入 GUC，故线上未观测到实际泄漏；风险集中在后台任务、异常路径、以及未来新增的裸 `pool` 查询。
- **为什么不修**：属**策略定义**缺陷（W7 RLS 收口 + 本文档台账范围），与 §17.2 的「事务复用」是两个变更面；在本批改策略会混淆变更边界，且需要逐表确认业务语义。
- **为什么暂不阻断**：已作为 §17.2 门禁的**非阻断判据 ②-b**——若纳入阻断，门禁会长期红（382 条），失去信号价值。方案里的判据 ②-a（假租户 UUID → 0 行）对 962 条租户策略均成立，已作为批次门禁使用。
- **转阻断的前置条件**：W7 把上述 382 条改为「未设即拒」后，再在 `check-request-txn` 或 RLS 专项门禁中把 ②-b 提为阻断项。

## K11 请求事务内「写后返回非 2xx」存量 58 处，且门禁仅对 scm 触发 —— OPEN（2026-11-16 登记，不修，不阻断）

- **来源**：13 服务请求事务类型统一（`RlsTxnCell`）提交时，pre-commit 的 `[Gate TXN-2XX]`（[check-txn-write-non2xx.py](../../scripts/ci/check-txn-write-non2xx.py)）被触发并报出 58 处命中。
- **取数**：`python3 scripts/ci/check-txn-write-non2xx.py --changed-only`（暂存 173 个 svc 文件）→ 58 处，分布 tms 24、erp 20、hrm 8、wms 3、crm 2、integration 1，其余服务 0。
- **是否为本次引入**：**否**。把 29 个命中文件的 `HEAD` 版本取出到独立目录重跑同一脚本，得到**完全相同的 58 处**（差集为空），故全部为存量，与类型统一无关（类型统一只改签名类型名，不改语句顺序）。
- **命中形态**（两类，需区分）：
  1. **误报**：`UPDATE/DELETE ... WHERE id=$1` 的 `rows_affected=0` 分支返回 404（如 [dict.rs](../../svc/erp/src/modules/dict.rs) `delete_dict_type`），实际未产生写入，属脚本文档所述「未命中行 → 404」合法分支，应登记 allowlist；
  2. **真实风险**：写入语句已执行、随后在另一分支返回非 2xx 且中间无 `rollback()`/`guard.take()`，请求事务按非 2xx 回滚，写入被静默丢弃（如 `delete_dict_type` 先 `UPDATE dict_items` 再判断 `dict_types` 是否命中）。
- **门禁接线缺陷**：[lefthook.yml](../../lefthook.yml) 中该 hook 的触发条件是 `^svc/scm/.*\.rs$`，因此除 scm 外的服务改动不会触发检查，58 处存量长期不可见；「仅 scm」看起来是试点遗留，而非有意收窄。
- **为什么不修**：58 处需要逐函数区分「误报」与「真实丢弃」，属独立变更面（写路径语义），与本次类型统一不同批；且真实风险项改了会影响接口返回码与事务边界，需业务确认。
- **建议处置（未实施）**：①先按文件+函数把这批登记进 [txn-write-non2xx-allowlist.json](../../scripts/ci/txn-write-non2xx-allowlist.json) 并把 hook 触发范围从 `svc/scm` 扩到 `svc/**`；②再逐条复核 allowlist 里的真实风险项，改为「先回滚再返回」或把失败分支前移。
- **状态**：OPEN，不阻断；扩触发范围前必须先落地基线，否则门禁会在任何服务提交上直接红。

## K12 finance update_reconcile_item 的「最佳努力」聚合事务无法并入请求事务 —— OPEN（2026-11-16 登记，业务口径未定）

- **位置**：[svc/finance/src/modules/reconcile_orders.rs](../../svc/finance/src/modules/reconcile_orders.rs) `update_reconcile_item`（2 处 `own_txn`：明细写入事务 + 聚合重算事务）。
- **现状**：先更新 `finance.reconcile_items` 明细并提交，再用**另一条连接**的事务重算订单聚合金额；聚合那步用 `let _ =` 忽略失败，注释明确「原实现忽略该步失败，不影响明细更新结果」。同文件其余 8 个 handler 已在 2026-11-16 收敛到请求事务。
- **为什么不能直接收敛**：
  1. 并入请求事务 → 聚合 SQL 一旦失败就 abort 整个事务，明细写入被一起回滚，由「忽略失败」变成「整体失败」，业务语义改变；
  2. 若聚合仍用独立连接 → 读不到明细在请求事务中未提交的更新，聚合金额会按旧值计算（静默算错）。
- **需要的业务判断（未决）**：A. 接受「聚合失败即整体回滚」（口径收紧，需确认对账金额允许因此失败）；B. 改为同一事务内的显式聚合查询（改动 SQL 与失败处理，需确认聚合口径与性能）。
- **当前处置**：保留原两事务实现，不纳入本批收敛；该文件 `own_txn` 维持 2。
- **状态**：OPEN，不阻断，等业务口径确认后再动。

## K13 finance settlement_center 的「提交后发布事件」与请求事务复用冲突 —— OPEN（2026-11-16 登记，需定发布时机方案）

- **位置**：[svc/finance/src/modules/settlement_center/service.rs](../../svc/finance/src/modules/settlement_center/service.rs) 5 个写函数：`create_reconciliation`、`manual_reconcile`、`create_settlement`、`approve_reconciliation`、`approve_settlement`（各 1 处 `own_txn`）。
- **现状**：这些函数写完本地快照后先 `scope.commit()` 再 `publisher.publish_event(...)`，失败入 ZSET 重试队列；注释（D6）明确「写快照已落库（scope.commit 已提交），此处仅发布」。同文件其余 17 处已收敛到请求事务。
- **为什么不能直接收敛**：请求事务的提交发生在 handler 返回 2xx 之后（`tenant_middleware` 的 `finalize_request_txn`），若改为 `scope_with` 复用请求事务，事件发布将**早于数据可见**：
  1. 消费方（erp / pm）收到事件后回读 finance 快照，在独立连接上看不到未提交行，事件被当成脏数据丢弃或重试失败；
  2. 若 handler 随后返回非 2xx，请求事务回滚，已发布事件描述一条不存在的单据（幻影事件）。
- **需要的方案（未决）**：A. 增加「提交后回调」机制（中间件在 commit 成功后统一 flush 待发事件），再把这 5 处并入请求事务；B. 接受发布早于提交，由消费方做「事件+回读不到则延迟重试」补偿；C. 维持现状（5 处保留独立事务 + 提交后发布）。
- **当前处置**：**已按 A 试点落地（2026-11-16），未推广**：
  - 通用钩子：[lib/shared-auth/src/middleware/tenant.rs](../../lib/shared-auth/src/middleware/tenant.rs) 新增 `PostCommitQueue` + task-local + `defer_post_commit()`；`tenant_middleware` 在 `transaction.commit()` 成功后 `flush()`，回滚/非 2xx/提交失败时 `discard()` 并记录 `discarded` 数量。
  - 试点范围：仅 [settlement_center/service.rs](../../svc/finance/src/modules/settlement_center/service.rs) 的 5 个函数改为入队（`publish_after_commit`）；发布失败仍走原 `commit_retry::push_retry_typed` ZSET 重试，未新造重试；无请求上下文（后台/CLI 直调 service）时回退为立即发布，语义不变。
  - 未推广：其他服务的发布路径一行未改；`tenant_middleware_no_txn` 不设该队列，行为不变。
- **验证**：`cargo test -p topems-shared-auth --lib request_finalizer_tests` 7 passed，其中 `discard_drops_post_commit_actions` 证明回滚丢弃后动作不会补发；`cargo check -p topems-finance` 通过；`cargo test -p topems-finance --lib` 1094 passed / 3 failed（forecast_v53 测试库权限，与本改动无关）/ 1 ignored；门禁 finance `own_txn` 64 → 59，settlement_center 归零。
- **状态**：A 方案试点完成、未推广；推广到其他服务需单独评估（不在本次范围）。

## K14 finance 批量导入/批量删除的「逐行独立事务 + 部分成功」语义 —— RESOLVED（2026-11-16，按「放宽 + SAVEPOINT」落地）

- **位置**：[svc/finance/src/modules/mod.rs](../../svc/finance/src/modules/mod.rs)：
  - `import_opening_balances`（2 处：逐行 `read_scope` 校验科目 + `write_scope` 插入，每行独立提交，失败行计入 `failed_count` 并继续下一行）；
  - `batch_delete_vouchers`（1 处：循环内每个 id 一个 `scope()` 独立提交，失败 id 静默跳过）。
- **问题**：直接并入请求事务后，任一行 SQL 报错会让 PostgreSQL 事务进入 aborted 状态，后续行全部失败；最终返回 200 时中间件提交失败会整体回滚，与「部分成功 + 逐行错误明细」语义冲突。
- **落地方式**：
  1. [lib/shared-db/src/scope.rs](../../lib/shared-db/src/scope.rs) `Db::scope_with` 的事务形参由 `&mut Transaction<'static, Postgres>` 放宽为 `&mut Transaction<'_, Postgres>`（内部只保存 `&mut PgConnection`，`ScopedTxn` 生命周期数量不变，全部既有调用点零改动）；
  2. 新增 `Db::scope_savepoint(&mut Transaction<..>)`：内部 `Acquire::begin` 开 SAVEPOINT，`commit()` = `RELEASE SAVEPOINT`，`rollback()` = `ROLLBACK TO SAVEPOINT`，未收尾时由 sqlx 在下次语句前执行回滚；同样叠加 `SET LOCAL search_path` 与请求租户 GUC；
  3. 两个函数改为「请求事务 + 逐行 SAVEPOINT」：失败行 `rollback()` 到本行保存点后继续下一行，`failed_count`/`errors`/静默跳过与返回码口径完全不变；`import_opening_balances` 的只读校验保存点统一用 `rollback()` 收尾（无写入，且能把连接从 aborted 状态恢复）。
- **验证**：
  - 新增集成测试 [lib/shared-db/tests/scope_search_path_it.rs](../../lib/shared-db/tests/scope_search_path_it.rs) `scope_savepoint_isolates_failed_rows`：行 1 成功、行 2 主键冲突（`duplicate key ... sp_pilot_pkey`）、行 3 继续写入成功，最终 `ids = [1, 3]` —— 证明失败行不落库、失败后外层事务仍可用；临时表随事务回滚消失，无持久副作用。实跑（本地 PG 18）通过。
  - 同文件既有 7 个用例全部通过（8 passed），证明放宽生命周期与新增入口未破坏既有 `scope_with` 行为。
  - `cargo check`：`topems-shared-db` / `topems-shared-auth` / `topems-finance` / `topems-pm` / `topems-crm` 全部通过，0 warning。
  - `cargo test -p topems-finance --lib`：1094 passed / 3 failed（forecast_v53 测试库权限，改动前即存在）/ 1 ignored，无新增失败。
  - 门禁：finance `own_txn` 12 → 9（本文件 3 处归零）。
- **状态**：RESOLVED（试点）；`scope_savepoint` 未被其他服务使用。


