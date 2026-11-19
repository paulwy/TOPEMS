# 生产窗口就绪包：R5 归档三批（2026-11-19 重算版）

> 文档性质：**只做窗口前准备，不应用任何迁移、不写生产、不开窗、不 push**。
> 目标：开窗时照文档执行，不需要现场判断。
> 基线事实：dev 账本 697 行 / 697 success / `max=20261119233000`；prod 账本 721 行 / 721 success / `max=20261119000002`（2026-11-19 实测）。
> 只读预检连接：`topems_drift`（非特权、非 superuser、无 BYPASSRLS）。
> 配套可执行预检：`docs/database/window-preflight-2026-11-19.sql`。

---

## 0. 摘要

- **dev-only 5 条**：`20261103000005`（孤儿，有账本行、无文件，排除）、`20261119160000`、`20261119180000`、`20261119200000`、`20261119233000`。
- **本窗口可执行 4 条**，全部是「已进 dev、未进 prod」的迁移：

| 波 | 版本 | 主题 | 归档表数 | destructive 标记 | 备注 |
|---|---|---|---:|---:|---|
| W1 | `20261119160000` | 零路径遗留表归档 | 16 | 8 | 建 archive schema + 6 张簿记表 |
| W2 | `20261119180000` | 历史 schema 副本归档 | 108 | 10 | 入向 FK 19 条全在批次内 |
| W3 | `20261119200000` | 遗留租户表解依赖归档 | 8 | 4 | 建第 7 张簿记表；插件 FK 重指；函数语义改写 |
| W4 | `20261119233000` | IAM 遗留权限码收敛 | 0 | 2（DELETE） | 44 条遗留码 + 其授权清理；补 2 条字典码；ticket `IAM-PERM-20261119` |

- **硬依赖**：W3 ← W2。W3 要求 `iam.core_tenants` 入向 FK 精确为 1；当前 prod 为 8，其中 7 条来自 W2 将删除的 108 批表。
- **W4 与 W1/W2/W3 无依赖**：它只触碰 `public.core_permissions` / `public.core_role_permissions`，与三波的 132 张表、`archive` schema、插件 FK、函数改写均无交集；可与任一波合并，也可独立成波。建议放在最后执行（纯数据收敛，失败影响面最小，回滚只需恢复两张表）。
- **建议顺序**：W1 → W2 → W3 → W4；回滚逆序 W4 → W3 → W2 → W1（W2 回滚会重建指向 `iam.core_tenants` 的 7 条 FK，必须先由 W3 回滚恢复该表；W4 与其他波无依赖，可最先回滚）。
- **预期终态**：prod 账本 721 → 725；权限码 1157 → 1159（+2 字典码，44 条遗留码与授权保持 0）；表总数 1344 → 1351；archive 表 0 → 139；RLS 959 → 913；策略 1050 → 1003。
- **不纳入**：29 条 prod-only 版本、10 条早间计划版本（`20261119010000`…`20261119170000`，dev/prod 均未落地）、孤儿 `20261103000005`。详见 §7。

---

## 1. 事实基线（2026-11-19 实测）

### 1.1 账本与差集

| 项 | dev | prod |
|---|---|---|
| 账本行 / success / failed | 697 / 697 / 0 | 721 / 721 / 0 |
| `max(version)` | `20261119233000` | `20261119000002` |
| 四条窗口版本 | 已应用（success） | 0 行（未应用） |

差集方向为 dev → prod。dev-only 的 5 条中只有 4 条有迁移文件且可执行；`20261103000005` 是历史孤儿账本行（无对应文件），不作为窗口项。

### 1.2 dev 落地后读数（用于推定 prod 终态）

| 项 | 读数 |
|---|---|
| archive 表 | 139（132 归档 + 7 簿记） |
| 非 archive 业务表 | 1257 |
| 全局表（`relkind IN ('r','p')`） | 1396 |
| RLS 表 / 策略 | 469 / 523 |
| 权限码 / 角色授权（`public.core_permissions` / `core_role_permissions`） | 350 / 4507 |
| `finance.bootstrap_defaults()` | 仅引用 `public.core_tenants` 与 `finance.core_finance_accounts`，不含 iam/flow/`iam.core_tenant_users` |
| `iam.core_tenant_plugins` 外键 | `REFERENCES core_tenants(id)`（解析到 `public.core_tenants`） |

### 1.3 prod 只读实测（`topems_drift`）

| 项 | 读数 |
|---|---|
| archive schema | 不存在 |
| 全局表 / RLS / 策略 | 1344 / 959 / 1050 |
| W1 的 16 张 | 16/16 在位；RLS 16 / 策略 16；入向 FK 0；依赖视图 0 |
| W2 的 108 张 | 108/108 在位；RLS 30 / 策略 31；入向 FK 19（全部批次内）；依赖视图 0 |
| W3 的 8 张（3 目标 + `iam.core_user_roles` + 4 张 `flow._deprecated_core_tenant_*`） | 8/8 在位；RLS 0 / 策略 0；入向 FK 13；视图 0；触发器 0 |
| W3 入向 FK 构成 | 7（来自 W2 的 108 批表）+ 4（4 张 flow 引用方 → `flow.core_tenants`）+ 1（`iam.core_user_roles` → `iam.core_users`）+ 1（`iam.core_tenant_plugins` → `iam.core_tenants`） |
| W3 分目标入向 FK（当前） | `iam.core_tenants` 8 / `iam.core_users` 1 / `flow.core_tenants` 4 |
| W3 分目标入向 FK（W2 后） | `iam.core_tenants` 1 / `iam.core_users` 1 / `flow.core_tenants` 4 |
| `iam.core_tenant_plugins` FK | `core_tenant_plugins_tenant_id_fkey → iam.core_tenants(id) ON DELETE CASCADE` |
| `finance.bootstrap_defaults()` | 同时引用 `iam.core_tenants` / `flow.core_tenants` / `iam.core_tenant_users` / `public.core_tenants` |
| 精确行数 | `topems_drift` 对 132 张表均无 SELECT 权限，须 DBA 特权只读会话（同一 preflight 第 7 节自动转 READABLE） |
| 权限码 / 角色授权 | 1157 / 2917；44 条 W4 遗留码 = 0、相关授权 = 0；`iam:dictionaries_read` / `iam:dictionaries_update` 均不存在 |

### 1.4 迁移脚本闸门（实测）

- `apply-forward.sh` 在 DDL 前对每条破坏性语句做行数预演，超过 `destructive-max-rows`（`DROP TABLE` 必须为 0）即拒绝；票据不能绕过行数闸门。
- **预演按版本推进**：版本 N 的预演只在其前面所有 pending 版本都已应用之后执行，因此预演里看到的是「N 之前的迁移全部生效」的真实基线（例如 `20261118160000` 改名后的 `flow._deprecated_*`），而不是 anchor 的旧状态。
- **中途失败语义**：任一版本预演被拒（行数超限 / 不可回滚语句 / 前置断言失败）即停在该版本——该版本不应用，已应用的前序版本保持已落账；脚本输出「已应用清单 + 未应用清单 + 逆序回滚入口」，退出码 1。不采用「先整体预演一遍再应用」：整体预演只能看到 anchor 状态，会复现 `20261119200000` 的前置断言失败。
- 预演**不是只读事务**：它必须真实执行 DML 再 `ROLLBACK`，因此脚本拒绝会逃出事务或不可回滚的语句（`COMMIT`/`ROLLBACK`、`nextval`、`CREATE/DROP INDEX CONCURRENTLY`、`VACUUM`、`ALTER SYSTEM`、`CREATE/DROP DATABASE`），由预演生成器 fail-closed 中止；临时表的 `ON COMMIT` 子句（`DROP`/`PRESERVE ROWS`/`DELETE ROWS`）不结束事务，检测前先剔除。
- 预演会话自行注入 `SET app.rls_system='on'` 与迁移文件声明的全部 `app.*_gate`：调用方不传 `PGOPTIONS` 也能看到 FORCE RLS 后的真实行数、通过闸门断言。prod 与 drill 两种模式都执行预演；drill 对文件自带 `destructive-ticket` 自动批准（隔离库），无标记的破坏性语句只提示、不阻断演练。
- apply 段在 prod 仍不自行注入 GUC（`--drill-gate-guc-auto` 仅限演练）；开窗执行时 `PGOPTIONS` 必须自己带上 `-c app.rls_system=on` 与对应闸门 GUC。
- `--apply-deferred` 只接受单个 14 位版本，必须同时带 `--ticket`，不可与 `--anchor/--only/--defer` 组合。
- `--allow-destructive=<version>` 必须同时设置 `PROD_CHANGE_TICKET`，且票据与文件内 `destructive-ticket` 一致。
- prod 模式缺 `node` 时直接 DENIED，不会降级放行。

---

## 2. 迁移清单（逐条指纹）

复算命令：

```bash
cd /Users/xingzhai/TOPEMS
for v in 20261119160000_drop_zero_path_legacy_tables \
         20261119180000_archive_legacy_schema_copies \
         20261119200000_unblock_and_archive_legacy_tenant_tables \
         20261119233000_iam_legacy_permission_convergence; do
  shasum -a 384 database/migrations/$v.sql
  shasum -a 256 database/migrations/$v.sql
  shasum -a 256 database/rollback/$v.rollback.sql
done
```

账本 checksum 是**文件字节的 SHA-384**。

| 版本 | 主题 | 表数 | sha384（账本） | sha256（迁移） | commit |
|---|---|---:|---|---|---|
| `20261119160000` | 零路径遗留表归档 | 16 | `8a58bed713e99b511b5a2a491119c268066c860ebb266250fe4a83d0005d80f82214074cdcd34278e74491350f508c6c` | `cc30df5798befe482298f37e8e3dcb1d6c38b3460a100ae065cf216c53ccd64c` | `e5d2e12ace713bc9a5c64298224a807af511aae5` |
| `20261119180000` | 历史 schema 副本归档 | 108 | `9b47af6d2c376bbf0921b7be76a3c0e01c8bb352eb8e739ea59604f15e803cdff82b6e9d1c12165f6b8909ca18013755` | `d43420625578900bfea3f5368ce10ed24300a8bcfdd6937b19cbd5d5d4a90e52` | `137cca4b8cdc6aa3efeca7870c2c31d5d61468a1` |
| `20261119200000` | 遗留租户表解依赖归档 | 8 | `c130918357fab2c65251d4e32601e6329a88a9647fb4838af3b58f74b20a634a39fb920c9d6c2979acc10f35ca0f2ea6` | `cb71c4922ed2cc10114469a54da901c17b9e960c1a6f34da86d481d507160910` | `364eded6f091a92668dff44cc3f12ebc3faba87b` |
| `20261119233000` | IAM 遗留权限码收敛 | 0 | `13d613136fb107739bac3a87c013b1d3dc9843795ad466a5e2a92d60c8faae92fdffe5ea6eceb590cdd9193f8a8534b7` | `a041ea01d7ee5cf4309fc2d83eb6958e9ca4db8281f11f49b74c936283210952` | `414155a1cec5f3dc2e83a030163939ed8b632f21`（原始）；标记块见 §2.2 |

| 版本 | 回滚文件 | sha256 | destructive 标记数 |
|---|---|---|---:|
| `20261119160000` | `database/rollback/20261119160000_drop_zero_path_legacy_tables.rollback.sql` | `03996af8f692cb0728e8d132ad30aafead36278e127ca91092de6fb3c7ecc913` | 8 |
| `20261119180000` | `database/rollback/20261119180000_archive_legacy_schema_copies.rollback.sql` | `1ca7c11ca8b6df74649ab73cf95f5d1bdc8b8f2cde237872d951cf6d9104c1de` | 10 |
| `20261119200000` | `database/rollback/20261119200000_unblock_and_archive_legacy_tenant_tables.rollback.sql` | `40aa9ed80d2ebc3a127df6c49b17c1869f14d40616947625cfca6c1313ea986f` | 4 |
| `20261119233000` | `database/rollback/20261119233000_iam_legacy_permission_convergence.rollback.sql` | `e9edec1ffd19853fec007dbb6c574e5f43722115c43eb0316df8fe5ec2d98b9e` | 2（DELETE） |

### 2.1 演练与 dev 落地方式

| 版本 | 隔离库演练 | dev 落地方式 | dev 落地时间 |
|---|---|---|---|
| `20261119160000` | `run-migration-drill.sh anchor` `[5/5]` PASS（2026-11-19；快照重生成 + 实测比对，anchor `20261117235500`，非特权 `topems_test_runner`） | §7.1 重放：备份 → 删账本行 → `--apply-deferred` + GUC 闸门 + `--allow-destructive` | 2026-11-19 18:38:53 |
| `20261119180000` | `[5/5]` PASS（2026-11-19，83s；快照 825→795 表、837→807 策略，-30/-30，diff 全部落在本批 108 张内） | §7.1 重放，同上 | 2026-11-19 18:38:16 |
| `20261119200000` | `[5/5]` PASS（2026-11-19 18:47；check/write 双模式，798 表 / 809 策略零 diff） | §7.1 重放，同上 | 2026-11-19 18:43:01 |
| `20261119233000` | 无独立隔离演练；`check-destructive-sql --strict --approve-ticket=IAM-PERM-20261119` 转 APPROVE（2 条 DELETE，max-rows=0） | §7.1 重放：`pg_dump` 备份两张表 → 账本无该行 → `--apply-deferred` | 2026-11-19 20:39 |

> 演练快照与 prod 实测的 RLS 口径存在采集时差：演练 anchor 记 108 批 -30 表；dev 落地实测为 29 表 / 30 策略（`iam.permission_audit_logs` 带 2 条策略）；prod 当前实测为 30 表 / 31 策略。窗口验收以 **prod 实测目标值** 为准（§4）。

### 2.2 W4 的 destructive 标记块（`20261119233000`）

原文件（`414155a1c`）的两条 `DELETE` 没有豁免标记，prod 门禁会直接 DENY。按仓库既有字段顺序补齐，两条 `DELETE` 使用**完全相同**的 8 行模板（仅 `reason` 按语句语义区分）：

```sql
-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: <≥10 字，说明清理对象与生产实测行数>
-- destructive-owner: iam
-- destructive-ticket: IAM-PERM-20261119
-- destructive-expires: 2027-05-10
-- destructive-max-rows: 0
-- destructive-backup: 窗口前超户 pg_dump -t public.core_permissions -t public.core_role_permissions
```

口径说明：

- `destructive-owner: iam`：仓库既有取值以 `平台组/DBA` 为主，但本迁移只动 IAM 权限域，且已有 2 处 IAM 迁移使用 `iam`，按域归属取值。
- `max-rows: 0`：dev/prod 实测 44 条遗留码与相关授权均为 0；开窗时若出现非 0（例如恢复库带回历史数据），预演直接拒绝，需人工确认后再放行。
- `expires: 2027-05-10`：门禁要求不超过执行日 +180 天（2026-11-19 起），与其他三波保持一致。
- 标记规范与最小示例已补进 `scripts/ci/check-destructive-sql.mjs` 头部注释，后续迁移不再需要靠猜字段。

---

## 3. 顺序、依赖与分波

### 3.1 硬依赖

1. **W3 ← W2**：W3 第一个前置断言要求 `iam.core_tenants` / `iam.core_users` / `flow.core_tenants` 的入向 FK 精确为 `1/1/4`。当前 prod 为 `8/1/4`；差值 7 全部来自 W2 的 108 批（`iam.core_billing_invoices`、`core_subscriptions`、`core_tenant_modules`、`core_tenant_settings`、`core_tenant_usage`、`core_tenant_users`、`core_usage_records`）。W2 未完成时 W3 必然在预检阶段 `RAISE EXCEPTION`。
2. **W2 内部外键**：108 批的 19 条入向 FK 全部指向批次内表，迁移内按依赖顺序归档/DROP；不允许批次外引用（当前实测 0）。
3. **W1 与 W2 无表集合交集**，可各自独立执行；建议 W1 先跑，由它创建 `archive` schema 与 6 张簿记表（W2 的 `CREATE ... IF NOT EXISTS` 也会兜底）。
4. **W3 另建** `archive._fk_out_snapshot`（第 7 张簿记表），用于回滚重建被删表自身的出向外键。
5. **W4 与 W1/W2/W3 无依赖**：W4 只读写 `public.core_permissions` 与 `public.core_role_permissions`；三波只归档/删除 132 张业务表并重指插件 FK/函数，两者对象集合无交集，也不共享闸门 GUC 或票据。W4 可与任一波合并，或独立成波；建议独立成波放在最后，便于单独回滚（只恢复两张表）。

### 3.2 分波（每波单文件、单事务、可独立回滚与验收）

| 波 | 版本 | 归档表 | 建议窗口段 | 独立回滚 |
|---|---|---:|---|---|
| W1 | `20261119160000` | 16 | 第一段 | `20261119160000` 回滚文件 |
| W2 | `20261119180000` | 108 | 第二段 | `20261119180000` 回滚文件 |
| W3 | `20261119200000` | 8 | 第三段 | `20261119200000` 回滚文件（须在 W2 回滚之前） |
| W4 | `20261119233000` | 0 | 第四段（也可与任一波合并） | `20261119233000` 回滚文件（与三波无依赖，可最先回滚） |

### 3.3 回滚逆序

`W4 → W3 → W2 → W1`。

- W4 回滚删除 2 条字典码、恢复 44 条遗留码及其角色授权；与其他三波无交集，可在任意时点最先执行。
- W3 回滚先恢复 8 张表（含 `iam.core_tenants`）、旧函数体，并把插件 FK 改回 `iam.core_tenants`。
- W2 回滚随后重建 108 张表；其中 7 条 FK 指向 `iam.core_tenants`，因此必须在 W3 回滚之后执行。
- W1 回滚与其他两波无依赖，可在 W3 之后任意时点执行。

---

## 4. 每波前置、命令与验收断言

### 4.1 公共环境与 T-0 门禁

```bash
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=topems_prod PGPASSFILE=$HOME/.pgpass
psql -d topems_prod -tAc "SELECT current_user, current_database(), inet_server_addr()"
# 期望：topems_prod | topems_prod | 127.0.0.1
node -v   # prod 主机必须有 node；缺失则脚本 DENIED
```

T-0（任一不过即停止开窗）：

1. prod 主机检出目录内三份迁移文件 sha384 与 §2 完全一致；三份回滚文件 sha256 与 §2 一致。
2. `git status --porcelain database/migrations database/rollback` 为空（除已跟踪的三份文件外无额外文件）。
3. `PGPASSFILE=$HOME/.pgpass MIGRATION_DRIFT_DB_URL=postgresql://topems_drift@127.0.0.1:5432/topems_prod node scripts/migration/check-ledger-ddl-drift.mjs` 输出 PASS、exit 0。
4. `window-preflight-2026-11-19.sql` 在 `topems_drift` 下 exit 0、无 `ERROR`，C1–C9/C11–C15/C17 全 PASS，C10 为 `PASS_PRE`；C16 为 `NEEDS_DBA`，按 §4.7 由 DBA 用 `topems_prod` 只读复跑并转 PASS。

### 4.2 W1：`20261119160000`（16 张，零路径）

前置（迁移内断言 + 现场核对）：

- 16 张表全部存在，且每张行数为 0（脚本预演硬闸门）。
- 16 张表入向 FK = 0、依赖视图 = 0。
- `archive` schema 不存在，或仅存在 6 张簿记表。
- 账本无 `20261119160000`。

命令：

```bash
PROD_CHANGE_TICKET=ZERO-PATH-20261119 \
PGOPTIONS="-c app.drop_zero_path_tables_gate=zero-path-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119160000 --ticket ZERO-PATH-20261119 \
  --allow-destructive=20261119160000
```

验收（全部通过才进入 W2）：

```sql
-- 1) 账本 success + checksum = 文件 sha384
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119160000;
-- 期望：t | 8a58bed7...508c6c

-- 2) archive 表 = 22（16 归档 + 6 簿记）
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';

-- 3) manifest 恰 16 行
SELECT count(*) FROM archive._drop_manifest WHERE migration_version='20261119160000';

-- 4) 16 张原表残留 = 0（清单见 preflight 第 4.5 节）
-- 5) 全局读数：RLS 943 / 策略 1034 / 表 1350
```

失败处理：该文件整事务回滚、exit 1；不重跑同一文件，先按 §5 恢复并核对。

### 4.3 W2：`20261119180000`（108 张）

前置：

- 108 张表全部存在，且每张行数为 0（脚本预演硬闸门）。
- 108 张表入向 FK 19 条，全部来自批次内；批次外 = 0。
- 依赖视图 = 0。
- 账本无 `20261119180000`。

命令：

```bash
PROD_CHANGE_TICKET=LEGACY-COPY-20261119 \
PGOPTIONS="-c app.archive_legacy_copies_gate=legacy-copies-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119180000 --ticket LEGACY-COPY-20261119 \
  --allow-destructive=20261119180000
```

验收（按 §3.2 建议顺序，W1 已先跑；全部通过才进入 W3）：

```sql
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119180000;
-- 期望：t | 9b47af6d...013755

SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';       -- 130

SELECT count(*) FROM archive._drop_manifest
WHERE migration_version='20261119180000';          -- 108

-- 108 张原表残留 0；全局 RLS 913 / 策略 1003 / 表 1350
```

W2 结束后额外确认（W3 前置）：`iam.core_tenants` / `iam.core_users` / `flow.core_tenants` 入向 FK = `1/1/4`。

### 4.4 W3：`20261119200000`（8 张 + FK 重指 + 函数改写）

前置（迁移内断言）：

- 8 张表存在且行数 0。
- 入向 FK 精确 `1/1/4`（`iam.core_tenants` / `iam.core_users` / `flow.core_tenants`）。
- 8 张表无其他入向 FK、无依赖视图、无触发器。
- `public.core_tenants`、`public.core_users`、`public.core_user_roles`、`public.core_tenant_plugins` 存在。
- `iam.core_tenant_plugins` 的 `core_tenant_plugins_tenant_id_fkey` 存在且当前指向 `iam.core_tenants`；无孤儿 `tenant_id`。
- `finance.bootstrap_defaults()` 存在；除它之外无其他函数引用三目标。
- 账本无 `20261119200000`。

命令：

```bash
PROD_CHANGE_TICKET=TENANT-UNBLOCK-20261119 \
PGOPTIONS="-c app.tenant_unblock_archive_gate=tenant-unblock-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119200000 --ticket TENANT-UNBLOCK-20261119 \
  --allow-destructive=20261119200000
```

验收（按 §3.2 建议顺序，W1、W2 已先跑）：

```sql
-- 1) 账本 success + checksum
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119200000;
-- 期望：t | c1309183...0f2ea6

-- 2) 归档 8 张；manifest 8 行；原表残留 0
SELECT count(*) FROM archive._drop_manifest WHERE migration_version='20261119200000'; -- 8
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';       -- 139

-- 3) 插件 FK 已重指 public
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='iam' AND c.relname='core_tenant_plugins')
  AND conname='core_tenant_plugins_tenant_id_fkey';
-- 期望：REFERENCES core_tenants(id)（解析到 public.core_tenants）

-- 4) 函数不再引用 iam/flow/core_tenant_users
SELECT position('iam.core_tenants' in prosrc)=0 AS no_iam,
       position('flow.core_tenants' in prosrc)=0 AS no_flow,
       position('iam.core_tenant_users' in prosrc)=0 AS no_legacy_users,
       position('public.core_tenants' in prosrc)>0 AS has_public
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='finance' AND p.proname='bootstrap_defaults';

-- 5) 全局 RLS 913 / 策略 1003 / 表 1351（W3 本身 0/0）
```

### 4.5 W4：`20261119233000`（0 张表，2 条 DELETE）

前置：

- 账本无 `20261119233000`。
- `public.core_permissions` / `public.core_role_permissions` 存在；唯一指向 `core_permissions` 的外键是 `core_role_permissions_permission_id_fkey`。
- 44 条遗留码 = 0、相关角色授权 = 0、`iam:dictionaries_read` / `iam:dictionaries_update` = 0（当前 prod 实测均为 0）。
- 文件含 2 组 `destructive-ticket: IAM-PERM-20261119`、`destructive-max-rows: 0` 标记；`check-destructive-sql --strict` 带该票据应 APPROVE。
- 无需闸门 GUC；预演会自行注入 `app.rls_system=on`（该表未启用 RLS，注入只是保持一致）。

命令：

```bash
PROD_CHANGE_TICKET=IAM-PERM-20261119 \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119233000 --ticket IAM-PERM-20261119 \
  --allow-destructive=20261119233000
```

验收：

```sql
-- 1) 账本 success + checksum
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119233000;
-- 期望：t | 13d61313...534b7

-- 2) 2 条字典码存在；44 条遗留码与授权仍为 0；总数 1159
SELECT count(*) FROM core_permissions;                       -- 1159
SELECT count(*) FROM core_permissions
 WHERE code IN ('iam:dictionaries_read','iam:dictionaries_update');  -- 2
-- 44 条遗留码：复用 preflight 第 10 节 C18，期望 legacy_present=0、legacy_grants=0

-- 3) 无意外对象变化：表/RLS/策略与 W3 后一致（1351 / 913 / 1003）
```

失败处理：整文件单事务，任一断言失败即整批回滚；不重跑同一版本，先按回滚文件恢复两张表。

### 4.6 四波累计预期读数

| 检查点 | 窗口前 | W1 后 | W2 后 | W3 后 | W4 后 |
|---|---:|---:|---:|---:|---:|
| 账本行 | 721 | 722 | 723 | 724 | 725 |
| `max(version)` | `20261119000002` | `20261119160000` | `20261119180000` | `20261119200000` | `20261119233000` |
| 表总数 | 1344 | 1350 | 1350 | 1351 | 1351 |
| archive 表 | 0 | 22 | 130 | 139 | 139 |
| RLS 表 | 959 | 943 | 913 | 913 | 913 |
| 策略 | 1050 | 1034 | 1003 | 1003 | 1003 |
| 权限码 | 1157 | 1157 | 1157 | 1157 | 1159 |
| 角色授权 | 2917 | 2917 | 2917 | 2917 | 2917 |

表总数变化说明：W1 `-16 +16 +6 = +6`；W2 `-108 +108 = 0`；W3 `-8 +8 +1 = +1`；W4 不动表。权限码 +2 来自 W4 的两条字典码；授权数不变（44 条遗留码的授权本就为 0）。

### 4.7 C16 交接：DBA 用 `topems_prod` 只读复跑（路径 A）

C16 不能用 `topems_drift` 完成：它对 132 张表覆盖 **0/132**、15 个 schema 的 USAGE **0/15**。已确认的合规候选只有 `topems_prod`（`rolsuper=f`、`rolbypassrls=f`、有 LOGIN、132/132 覆盖、15/15 schema USAGE）。**不能用 `topems` / `xingzhai`**：二者为 superuser（`xingzhai` 还带 BYPASSRLS），会让权限判定与行数校验恒真。

完整可复制命令：

```bash
PGPASSFILE=<DBA 的 pgpass> \
PGOPTIONS="-c default_transaction_read_only=on -c app.rls_system=on" \
psql "postgresql://topems_prod@127.0.0.1:5432/topems_prod" \
  -f docs/database/window-preflight-2026-11-19.sql \
  > preflight_c16_$(date +%Y%m%d_%H%M%S).txt 2>&1
```

判定口径：

- **C16 PASS**：132 张全部 `READABLE` 且 `rows=0`，第 7 节例外查询输出 0 行。
- **未通过**（任一即算，需原样回报）：出现任何 `NO_PRIV`；任一表 `rows > 0`；或缺少 `app.rls_system=on` 导致 28 张 `tenant_isolation` 表被过滤成 0。

**必须带 `app.rls_system=on`，否则假 PASS**：132 张中 **46 张是 FORCE RLS**（18 张 `allow_all` + 28 张 `tenant_isolation`）。`topems_prod` 是表 owner，但 FORCE RLS 对 owner 同样生效，且它非 BYPASSRLS；不设置该 GUC 时，28 张 `tenant_isolation` 表的 `count(*)` 会被策略过滤为 0，C16 会误判 PASS。破坏性预演段已改为**由脚本自行注入** `SET app.rls_system='on'` 与文件声明的 `app.*_gate`（无需 `PGOPTIONS`）；但 apply 段在 prod 仍不自行注入（`--drill-gate-guc-auto` 仅限演练），因此开窗执行 `apply-forward.sh` 时仍必须在 `PGOPTIONS` 里带上 `-c app.rls_system=on`（与各波 gate GUC 并列）。

DBA 回报格式（一条消息）：

1. 一行结论：`C16 PASS` 或 `C16 NOT PASS`。
2. 第 7 节输出原文；若权限不足，给出 `NO_PRIV` 行数统计。
3. 实际执行命令（pgpass 路径可脱敏）与时间戳。

---

## 5. 风险分级与回滚后状态

### 5.1 风险分级

| 等级 | 迁移 | 风险内容 | 已做的消减 |
|---|---|---|---|
| R1 destructive | W1/W2/W3 全部 | `DROP TABLE`（8/10/4 处标记） | 迁移内先归档到 `archive.*`；脚本运行前预演要求目标表行数全 0；票据 + GUC 双闸门；成对回滚文件 |
| R2 权限/策略语义 | W2 | 108 张中 30 张启用 RLS、31 条策略随表删除 | 归档表不继承 RLS/策略；回滚按 `_rls_policy_snapshot` 重建；窗口验收核对全局 -30/-31 |
| R2 权限/策略语义 | W3 | `finance.bootstrap_defaults()` 去掉 iam/flow/`iam.core_tenant_users` 分支，业务口径改为「public 是唯一租户权威」 | 当前 public 1 行、legacy 全 0 行，补播输出不变；回滚恢复旧函数体 |
| R3 外键重指向 | W3 | `iam.core_tenant_plugins.tenant_id` 从 `iam.core_tenants` 改指 `public.core_tenants` | 列与 `ON DELETE CASCADE` 不变，插件代码零改动；外部入向 FK 已为 0；回滚改回原指向 |
| R3 外键重指向 | W2/W3 交界 | 108 批中 7 条 FK 指向 `iam.core_tenants` | 回滚必须 W3 先于 W2；文档与 preflight 均显式标注 |

### 5.2 回滚后状态

| 迁移 | 回滚动作 | 回滚后状态 |
|---|---|---|
| W3 | 按 manifest 恢复 8 张表（结构/数据/RLS/默认值/序列/出向外键）→ 恢复旧 `bootstrap_defaults()` → 插件 FK 改回 `iam.core_tenants` | 8 张表与旧函数体恢复；插件 FK 指向 `iam.core_tenants`；RLS/策略仍为 913/1003；archive 副本留存 |
| W2 | 按 manifest 恢复 108 张表、19 条批次内外键、30 张 RLS、31 条策略、依赖视图 | 108 张表恢复；RLS/策略回到 943/1034；`iam.core_tenants` 已由 W3 回滚恢复，7 条 FK 可成功建立 |
| W1 | 按 manifest 恢复 16 张表、16 张 RLS、16 条策略 | 16 张表恢复；RLS/策略回到 959/1050；archive 副本留存 |

- 回滚只重建结构与数据，不恢复 GRANT/COMMENT；不写账本。
- 回到窗口前账本水位需手工删除对应 `_sqlx_migrations` 行（721 行）。
- 归档副本与 `archive._drop_manifest` 保留 180 天，供二次核对；彻底清除需另立清理单。

---

## 6. 开窗执行顺序（照抄）

1. T-0 四项门禁（§4.1）全过。
2. 按 §4.7 的命令由 DBA 用 `topems_prod` 只读复跑，132 张全部 READABLE 且 0 行，C16 转 PASS。
3. W1：执行命令 → 跑 §4.2 五条验收 → 记录输出。
4. W2：执行命令 → 跑 §4.3 验收 + `1/1/4` 确认 → 记录输出。
5. W3：执行命令 → 跑 §4.4 五条验收 → 记录输出。
6. W4：执行命令 → 跑 §4.5 三条验收（账本/权限码/无意外变化）→ 记录输出。
7. 终态核对：§4.6 表逐项对齐；`check-ledger-ddl-drift.mjs` 再跑一次仍 PASS。
8. 任一步失败：停止后续波次；该文件事务已整体回滚；按 §5.2 逆序恢复已成功的波次，再重新评审。

---

## 7. 范围外与已知差异

- `20261103000005`：dev 账本孤儿（有行、无文件），不属本窗口，不处理。
- 29 条 prod-only 版本：prod 已有、dev 没有；与本窗口四条无表集合交集，不纳入。
- 10 条早间计划版本（`20261119010000`、`20261119120000`、`20261119130000`、`20261119131000`、`20261119140000`、`20261119141000`、`20261119150000`、`20261119151000`、`20261119161000`、`20261119170000`）：dev/prod 均未落地，旧版文档曾纳入，本版剔除。
- 工作树 `.verify/` 及其他线未跟踪文件：不动。
- 本包只给 W4 补 destructive 标记块（§2.2），不改任何迁移/回滚的 SQL 逻辑；不 push。
