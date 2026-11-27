# 本地 web-contract-smoke 可用：socket 回落 + schema 预置 + 闸门注入（B355）

## 1. 问题

`scripts/dev/web_smoke_precommit.sh` 是本机 pre-commit 里 `web-contract-smoke` 的执行体。它在本机**必然失败**，原因是三层叠加：

1. **传输层硬编码 TCP**：`createdb/dropdb` 固定 `-h 127.0.0.1 -p 5432`，`DB_URL` 默认也是 TCP。本机 PostgreSQL 只开 socket 认证（`pg_hba` 对 127.0.0.1 要求口令），实测 `psql -w -h 127.0.0.1 -p 5432 -U air -d postgres` 返回 `fe_sendauth: no password supplied`，而 `psql -d postgres`（socket）成功。于是冒烟库永远建不出来。
2. **基线快照缺 schema**：即使建库成功，基线锚点 `20261117235500` 的 `prod_schema_*.sql.gz` 只有到当时为止的 schema，**不含 `archive`**（`zgrep -c "archive\." = 0`）。自 `20260831190500` 之后 `CREATE SCHEMA` 已从迁移剥离、统一由 `database/scripts/bootstrap_schemas.sql` 预置，迁移 `20261119100000_drop_dead_tables_batch1.sql` 不再自建，前向回放必报 `schema "archive" does not exist`。
3. **破坏性迁移会话闸门未注入**：`20261119100000`/`20261119110000` 两批死表处置带 fail-closed 闸门（`app.drop_dead_tables_gate=batch-N`），本地补齐路径没有开闸机制，回放到这一步即 `gate closed` 中止。

结果：本机任何改到 `apps/web/src/api/**` 的提交都会被 pre-commit 拦住，前端类批次（如 B350 报销按钮）只能回退，`main` 上的契约棘轮长期缺一次真实校验。

## 2. 改动（仅 `scripts/dev/web_smoke_precommit.sh`）

- **传输自动检测**：新增 `WEB_SMOKE_DB_TRANSPORT`（`auto|tcp|socket`，默认 `auto`）与 `WEB_SMOKE_DB_SOCKET_DIR`（默认 `/tmp`）。`auto` 先用 `psql -w ... -tAc 'select 1'` 探 TCP，失败即回落 socket；socket DSN 形态 `postgresql:///<db>?host=/tmp`。`createdb/dropdb/psql` 统一走 `PG_ARGS` 数组，不再各写一份硬编码。显式 `WEB_SMOKE_DATABASE_URL` 时行为不变（尊重外部 DSN）。
- **`IS_LOCAL_DB` 判定修正**：未设显式 DSN 即视为本机自动建库；显式 DSN 只有等于本机 TCP 默认形态时才允许自动建库，远端 DSN 一律不建/不删。
- **schema 预置**：基线快照恢复后立即执行 `database/scripts/bootstrap_schemas.sql`（幂等，`CREATE SCHEMA IF NOT EXISTS ... AUTHORIZATION topems_owner` + 扩展），补齐快照采集时点之后才引入的 schema（`archive` 等）。
- **闸门注入**：本机一次性测试库属隔离库，前向迁移改为 `apply-forward.sh --drill-gate-guc-auto`，由执行器按文件解析 `current_setting('app.x', true) <> 'v'` 并注入 `SET`；prod 模式该开关被执行器硬拒，不存在误开到生产。

## 3. 实测证据（本机，2026-11-27）

改造前：

- `/tmp/b355smoke.log`：缺 `.env`，直接 fail（软链后解决）。
- `/tmp/b355smoke2.log`：PATH 缺 `/usr/sbin`，`lsof` 找不到。
- `/tmp/b355smoke3.log`：显式测试库不可达，暴露 `IS_LOCAL_DB` 判定错误。
- `/tmp/b355smoke4.log`：socket 回落生效，越过 `createdb`，卡在 `schema "archive" does not exist`。

改造后：

- `/tmp/b355smoke5.log`：打印「数据库传输方式：socket（TCP 不可认证时回落 socket）」→ 建库 + 基线恢复 + bootstrap 成功 → 前向迁移推进到 `20261119100000`，卡在 `gate closed`（闸门问题被暴露，说明 archive 已修好）。
- `/tmp/b355smoke6.log`：`WEB_SMOKE_REFRESH_DB=1` 全量重建，前向迁移 `== OK：应用 145 条，无失败`（`/tmp/web_smoke_precommit.migrate.log`）；契约冒烟 `总计: 4566/4566 PASS, 0 FAIL（已知非后端缺口豁免 0）`，脚本退出码 `0`。
- 语法：`bash -n scripts/dev/web_smoke_precommit.sh` 通过。
- 落到 `origin/main` 最新（`a72550f3d`）后重跑 `/tmp/b355smoke8.log`：同样 `应用 145 条`、`4566/4566 PASS`、退出码 `0`。（期间抓到一处脚本自身缺陷：闸门变量初值写成 `local` 却在顶层执行，bash 报 `local: can only be used in a function`；已改为 `if ... then` 赋值。）

对照口径：同一台机器、同一 target 二进制（`WEB_SMOKE_SERVER_BIN=/Users/air/TOPEMS/target/debug/topems-server`），改造前 100% 失败，改造后 4566 条全绿。

## 4. 影响面

- 只影响本机（`scripts/dev/` 开发脚本），CI 侧 `web-contract-smoke` 的 provisioning 早已走 bootstrap 入口，行为不变。
- 生产路径零改动：`apply-forward.sh --prod` 禁止 `--drill-gate-guc-auto`，脚本也只在 `IS_LOCAL_DB=1` 时传该开关。
- 副作用：本机首次建库会多花一次基线恢复 + 145 条迁移（约 3–4 分钟），之后复用 `topems_web_smoke` 库不再重建。

## 5. 遗留

- B350 报销按钮、B351 支付入口等前端改动当时因本门禁失败被回退，现在可以重新排入（需另开批次，改 `apps/web/src/api/**`）。
- 基线与 `bootstrap_schemas.sql` 的漂移是结构性问题：快照只能覆盖采集时点的 schema，凡是「后续新增 schema」都会重演。建议在基线生成脚本里登记 `schema-only` 前置（本批次未改基线，仅补 smoke 侧）。
