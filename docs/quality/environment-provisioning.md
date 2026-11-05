# 环境供给与基线锚点（「基线即唯一供给入口」）

> 定案：2026-11-05 ｜ 入口：`scripts/db/provision-env.sh`
> 相关：[部署手册 §4.6](../deploy-production.md)、[P4 报告 §16/§19](./p4-reverse-tables-triage-2026-11-05.md)

## 1. 结论

- **新环境不再从零重放迁移链**。历史链有断点：`database/migrations/20261005000004_lims_qa_lab_fk_repoint.sql`
  依赖 `public.qa_lab_tasks`，该表由**更晚**的 `20261007000009` 才创建 → 空库全链 `sqlx migrate run` 必然失败。
- 唯一受支持供给路径：**恢复基线快照（schema + `_sqlx_migrations` 账本 + 参考数据）→ 只应用 `version > anchor` 的前向迁移**。
- 参考数据（角色/权限点/菜单/字典/组织岗位等 11 张配置表）已纳入基线，默认随供给恢复；
  新环境无需手工补权限数据即可登录与鉴权。
- 用户主体可选由 `--with-admin` 创建（**默认关闭**）：生产/复刻环境必须显式决定是否建管理员；
  默认随机密码、哈希复用登录校验同一 `verify_password`、在**前向迁移之后**写入，避免被迁移覆盖。
- `scripts/deploy/setup-db.sh` 已降级：仅保留 `--create-user` / `--create-db`；`--init-schema` 直接 exit 1 并指向 `provision-env.sh`。

## 2. 锚点定义与当前值

| 项 | 值 |
|---|---|
| 锚点（anchor） | `20261105235700`（14 位版本号 `YYYYMMDDHHMMSS`） |
| 元数据 | `database/baseline/baseline_20261105235700.json` |
| schema 资产 | `database/baseline/prod_schema_20261105235700.sql.gz`（sha256 见元数据） |
| 账本资产 | `database/baseline/prod_ledger_20261105235700.sql`（sha256 见元数据） |
| 历史锚点列表 | `database/baseline/anchors.json`（单调不减） |
| 锚点时刻迁移清单 | `database/baseline/migrations_at_anchor.json`（592 条，新增迁移豁免依据） |
| 参考数据元数据 | `database/baseline/baseline_20261105235700_data.json` |
| 参考数据资产 | `database/baseline/baseline_20261105235700_data.sql.gz`（sha256 见元数据） |
| 基线规模 | 表 **1349** / 账本成功记录 **576** / 参考数据 **11 张表、2277 行** |

锚点语义：**锚点及以前的所有 schema 变更已包含在 schema 快照中**，对应账本记录已写入 `_sqlx_migrations`；
锚点时刻的参考数据已包含在 data 快照中。锚点之后的迁移必须按版本顺序前向应用。

校验方式：`provision-env.sh` 启动时读取元数据，对 schema/ledger/data 计算 sha256，任一不匹配立即 exit 1，
不会连接目标库。参考数据缺失或元数据缺失时同样失败（除非显式 `--no-reference-data`）。

## 3. 使用（provision-env.sh）

```bash
# 推荐：显式 DSN（scratch / CI）
bash scripts/db/provision-env.sh --env test \
  --dsn "postgresql://user@127.0.0.1:5432/topems_test" \
  --prod-ssh <user>@<prod-host>            # 可选：10 张核心表与 prod 只读比对

# 本地 socket 连接（PGHOST/PGUSER）
bash scripts/db/provision-env.sh --env dev --db topems_dev --skip-prod-fingerprint

# prod 副本（迁移按 --prod 守卫；必须与 prod 比对指纹）
bash scripts/db/provision-env.sh --env prod-replica --db topems_prod_replica \
  --prod-ssh <user>@<prod-host>
```

| 参数 | 说明 |
|---|---|
| `--env dev\|test\|staging\|prod-replica` | 同一流程；默认库名分别为 `topems_dev` / `topems_test` / `topems_staging` / `topems_prod_replica` |
| `--dsn` / `--db` | 目标连接二选一（`--db` 走 `PGHOST`/`PGUSER`） |
| `--anchor <14 位>` | 覆盖锚点；必须存在 `baseline_<anchor>.json` 与 `baseline_<anchor>_data.json`，sha256 校验通过 |
| `--with-reference-data` | **默认开启**：恢复参考数据基线（`baseline_<anchor>_data.sql.gz`） |
| `--no-reference-data` | 跳过参考数据；⚠️ 角色/权限/菜单缺失，环境可能不可登录 |
| `--data-only` | 仅数据恢复：要求结构已存在且 `max(version)=anchor`；按依赖逆序 `DELETE` 11 张纳入表后恢复（不 CASCADE） |
| `--with-admin` | **默认关闭**：供给完成后创建初始管理员（`admin` / `admin@topems.com`） |
| `--admin-username` / `--admin-email` | 覆盖管理员默认用户名/邮箱（须配合 `--with-admin`） |
| `--admin-password-stdin` | 从 stdin 读取密码（不回显、不走 argv）；不传则随机生成 20 位 |
| `--admin-password-file <path>` | 额外把密码写入 0600 文件（默认不写；禁止仓库内路径） |
| `--reset-admin-password` | 已存在同名/同邮箱用户时显式重置密码；默认跳过且不改密码 |
| `--admin-only` | 仅对已供给库执行管理员创建/校验/重置，不改结构/数据/迁移（幂等与运维重置入口） |
| `--allow-prod-admin` | 仅 `prod-replica` 显式允许管理员操作（强警告；真 prod 永不可用） |
| `--force-nonempty` | 显式允许覆盖非空库：`DROP DATABASE ... WITH (FORCE)` + 重建，打印 ⚠️ WARN；**prod 形态一律不可用** |
| `--prod-ssh` / `--prod-dsn` | prod 只读比对入口（仅 `SELECT` information_schema） |
| `--skip-prod-fingerprint` | 跳过 10 表指纹比对；`prod-replica` 不允许 |

流程（固定顺序）：建库（不存在）→ 非空守卫 → 恢复 schema（`gunzip | psql`，`ON_ERROR_STOP=1`）→ 恢复账本 →
**恢复参考数据**（逐表行数与元数据精确一致）→ 校验「表数 1349 / 账本 576 / max(version)=anchor」→
`apply-forward.sh --anchor <anchor>`（只应用 `version > anchor`）→
终态校验（表数 ≥ 基线、`max(version) ≥ anchor`、参考数据行数允许前向增量、admin 权限最小集、10 表结构指纹与 prod 比对）
→（可选 `--with-admin`）创建/校验初始管理员。管理员放在**前向迁移与终态校验之后**：避免任何 `> anchor`
迁移改写 `iam.users` 时覆盖管理员，也避免在结构/数据异常环境里先写入用户。

**幂等**：完整供给重复执行命中非空库 → 默认 **exit 1**（不静默覆盖）；确认重建必须显式 `--force-nonempty`。
`--data-only` 可重复执行：仅清理并恢复 11 张纳入表，不触碰其他表；外部表引用导致删除失败时 fail-closed。
`--admin-only` 可重复执行：管理员已存在 → **exit 0** 并打印「已存在，跳过」，不改密码；重置必须显式 `--reset-admin-password`。
**fail-closed**：探测失败、sha256 不匹配、账本/表数/锚点/指纹任一不符 → exit 1；**永不回退 `sqlx migrate run`**。
**prod 特征**：库名 `topems_prod`、host `192.168.110.115`/`xingzhai`/含 `prod` → 在任何连接前拒绝
（`prod-replica` 除外，但要求库名含 `replica`）。

## 4. 锚点前移流程（每次 prod 批量 DDL 后必须执行）

> 适用：prod 完成一批 DDL/迁移后（账本前进）。目标：重生成基线资产、锚点前移、资产随提交入库。
> 源库只读（`pg_dump` + `SELECT`），本流程不对 prod 做任何 DDL/DML。

```bash
# 1) 生成新结构基线（源库 DSN 走环境变量，禁止入库）
TOPEMS_PROD_DSN='postgresql://<user>:<pwd>@<host>:5432/topems_prod'
bash scripts/migration/gen-baseline.sh --dsn "$TOPEMS_PROD_DSN" --chain-db p4_rebuild_verify
#    产物：prod_schema_<new>.sql.gz / prod_ledger_<new>.sql / baseline_<new>.json

# 2) 生成同锚点的参考数据基线（只读 pg_dump --data-only；可用 --ssh 走只读通道）
bash scripts/migration/gen-baseline-data.sh --dsn "$TOPEMS_PROD_DSN" --force
#    产物：baseline_<new>_data.sql.gz / baseline_<new>_data.json（含逐表行数/sha256/脱敏审查）
#    远程源：bash scripts/migration/gen-baseline-data.sh \
#              --ssh <user>@<prod-host> --source-db topems_prod --force

# 3) 把最新结构+数据元数据追加进 anchors.json（单调不减）
node - <<'NODE'
const fs = require('fs');
const dir = 'database/baseline';
const meta = (f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf-8'));
const latest = fs.readdirSync(dir)
  .filter((f) => /^baseline_\d{14}\.json$/.test(f))
  .map((f) => meta(f))
  .sort((a, b) => b.anchor_version - a.anchor_version)[0];
const data = meta(`baseline_${latest.anchor_version}_data.json`);
const doc = JSON.parse(fs.readFileSync(`${dir}/anchors.json`, 'utf-8'));
const entry = {
  anchor_version: latest.anchor_version, generated_at_utc: latest.generated_at_utc,
  schema_file: latest.schema_file, ledger_file: latest.ledger_file,
  schema_sha256: latest.schema_sha256, ledger_sha256: latest.ledger_sha256,
  table_count: latest.table_count, ledger_rows: latest.ledger_rows,
  data_file: data.data_file, data_sha256: data.data_sha256,
  data_table_count: data.table_count, data_rows: data.total_rows,
  migrations_manifest: 'migrations_at_anchor.json',
};
if (!doc.anchors.some((a) => a.anchor_version === entry.anchor_version)) doc.anchors.push(entry);
doc.anchors.sort((a, b) => a.anchor_version - b.anchor_version);
fs.writeFileSync(`${dir}/anchors.json`, `${JSON.stringify(doc, null, 2)}\n`);
NODE

# 4) 重生成锚点时刻的迁移清单（把当前已存在文件全部纳入）
node scripts/ci/check-baseline-integrity.mjs --write-manifest

# 5) 校验并提交（结构+数据资产、两套元数据、anchors、manifest 一起入库）
node scripts/ci/check-baseline-integrity.mjs
git add database/baseline/
git commit -m "chore(baseline): 锚点前移至 <new-anchor> 并入库结构+参考数据资产"
```

要求：
1. **锚点单调不减**；`anchors.json` 最新锚点必须等于最新 `baseline_*.json`。
2. schema/ledger/data 的 sha256 必须与元数据一致（`check-baseline-integrity.mjs` 阻断）。
3. 基线资产、两套元数据、anchors、manifest **必须同一提交**，避免 CI 读到半套状态。
4. 前移后，新迁移必须 `version > 新锚点`；若本批 DDL 改动了参考数据表的列/约束，
   必须同步重生成 data 快照（否则供给会在「数据 → 前向」阶段 fail-closed）。

## 5. 新迁移规则

- 文件名必须 `{14 位 version}_{description}.sql`，且 **version > 当前锚点**。
- 版本 ≤ 锚点的新文件会被 `scripts/ci/check-baseline-integrity.mjs` 阻断（既存文件在
  `migrations_at_anchor.json` 清单内，豁免）。
- prod 应用仍只走 `scripts/migration/apply-forward.sh --prod`；定向/无守卫破坏性 pending 会被硬拒绝。
- 若新迁移改动**纳入参考数据表**的列/约束（如新增 `NOT NULL` 无默认列），「先数据后前向」会失败：
  实测见 §9.4。处理方式二选一：迁移写成兼容形式（默认值/回填），或 prod 执行后立即重生成基线
  （锚点前移），让 data 快照包含新列后再供给。

## 6. 历史迁移链：仅审计

以下既有文件**不参与供给**，仅保留审计与追溯；解释见
[P4 报告 §16.3](./p4-reverse-tables-triage-2026-11-05.md) 与 `scripts/ci/check-baseline-integrity.mjs` 头注释。

- **断点代表**：`20261005000004_lims_qa_lab_fk_repoint.sql`（依赖更晚创建的 `public.qa_lab_tasks`）。
- **16 条重建跳过项**（`rebuild-verify-classified.sh` 内 skip 清单）：依赖缺口/先建后删/schema 错位/P4 ABORT，
  明细表见 P4 报告 §16.3，编号 1–16（含 `20261005000004`、`20261029185000`、`20261105100000` 等）。
- **19 条定向迁移**（`db07–db24` 的 test/5433 定向 + 历史 5433 重排）：
  由 `scripts/ci/check-directed-migrations.mjs` 白名单登记，禁止新增；prod 不登记、不重放。
- 全部既存文件已纳入 `migrations_at_anchor.json`；新增文件不再享受豁免。

## 7. CI 与 pre-commit

`scripts/ci/check-baseline-integrity.mjs` 校验：
1. 结构基线资产存在且 sha256 与元数据一致；
2. 参考数据资产存在且 sha256 与元数据一致；行数清单非空、`total_rows`/`table_count` 自洽；
   关键表（`core_permissions` / `core_menus`）行数 ≥ 1；`pii_review.findings` 必须为空；
3. 锚点为 14 位合法时间戳；
4. `anchors.json` 单调不减，最新锚点 = 最新元数据；最新条目的 data_* 字段与数据元数据一致；
5. 新增迁移（不在清单内）版本必须 > 锚点。
6. `scripts/ci/check-hardcoded-passwords.mjs`：扫描仓库内硬编码管理员/默认密码常量
   （`DEFAULT_ADMIN_PASSWORD`、`admin_password = "..."`、`admin123` 等）；测试夹具与 `#[cfg(test)]` 段除外。

接入：
- **pre-commit**（`lefthook.yml` → `baseline-integrity`）：仅当暂存区含 `database/migrations|baseline` 或本校验脚本时执行
  `--changed-only`，无变更秒级跳过（取舍：sha256 对约 270KB 资产为毫秒级，可接受）。
- **CI**（`migration-test` job）：全量执行（含未跟踪文件），并纳入 `migration` 路径过滤。

## 8. 验证记录（2026-11-05，本地 scratch）

| 用例 | 结果 |
|---|---|
| `--env test --dsn postgresql://air@127.0.0.1:55432/p4_provision_test --prod-ssh <user>@<prod-host>` | exit 0：建库 → restore → 前向 0 条 → 表 1349 / 账本 576 / max 20261105235700 → 10/10 指纹一致 |
| 重复执行（非空，未加 force） | exit 1，诊断库名/表数/账本 max，提示 `--force-nonempty` |
| `--force-nonempty` 重建 | exit 0 + `⚠️ WARN`，DROP+CREATE 后重新供给 |
| 篡改 schema 资产 1 字节 | exit 1（sha256 不匹配，未连接目标库） |
| 构造 `version < anchor` 新迁移 | `check-baseline-integrity` exit 1（验后删除） |
| 构造 `version > anchor` 新迁移 | `check-baseline-integrity` PASS（验后删除） |
| prod 形态 DSN（`192.168.110.115` / `topems_prod`） | exit 1，0s（未发起连接） |
| 结构+参考数据全流程（`--db p4_refdata_full --prod-ssh`） | exit 0：表 1349 / 账本 576 / max 20261105235700 / 参考数据 11 表 2277 行 / 10/10 指纹 |
| 参考数据资产篡改 1 字节 | exit 1（sha256 不匹配，未连接） |
| 参考数据资产缺失 | exit 1，明确报错（不静默跳过） |
| `--data-only` 重复执行（先删 1 行菜单） | exit 0 ×2：菜单 422 → 423 → 423，其余 10 表不变 |
| `--no-reference-data` | exit 0 + `⚠️ WARN`（结构/账本校验通过） |
| 临时前向迁移插入 1 条权限（> anchor） | exit 0：前向后权限点 986 → 987，增量未被快照回退（验后删除） |
| 临时前向迁移新增 `NOT NULL` 无默认列 | exit 1（数据已恢复、前向失败，fail-closed；验后删除） |
| prod 内容指纹比对 | `core_permissions` 986（md5 `f0a8e5e5…`）、`core_menus` 423（md5 `a8d85925…`）、`core_roles` 15、`core_role_permissions` 653，与 prod 一致 |
| 全量供给 + `--with-admin`（`--db p5_admin_full`） | exit 0：用户行 / `core_user_roles→admin` / 哈希正反例校验通过；密码仅 stderr 一次 |
| `--admin-only` 重复执行 | exit 0：打印「已存在，跳过」，密码未变更（新密码仍可校验、旧密码被拒） |
| `--admin-only --reset-admin-password --admin-password-stdin` | exit 0：密码更新、密码文件 0600、旧密码失效 |
| 真实 HTTP 登录（`POST /api/core/iam/auth/login`） | 正例 **HTTP 200**（`roles=["admin"]`、`permissions=["*"]`）；错误密码 **HTTP 401** |
| prod / prod-replica / data-only 组合 / 仓库内密码文件 | 全部 exit 1（0s，未写入用户） |

> prod 仅只读：指纹与内容比对使用 `ssh + psql -d topems_prod`，无任何 DDL/DML；数据快照为 `pg_dump --data-only`。

## 9. 参考数据基线（reference data）

### 9.1 范围清单（纳入 11 张，2277 行）

| 表 | 行数 | 判定 | 备注 |
|---|---:|---|---|
| `public.core_tenants` | 1 | 纳入 | 默认租户；`database_host/name` 为 NULL，无环境地址 |
| `public.core_tenant_settings` | 4 | 纳入 | 仅邮件主题/发件人/开关，无凭据 |
| `public.core_roles` | 15 | 纳入 | 角色定义 |
| `public.core_permissions` | 986 | 纳入 | 权限点 |
| `public.core_role_permissions` | 653 | 纳入 | 角色-权限映射（无人员） |
| `public.core_menu_groups` | 122 | 纳入 | 菜单组 |
| `public.core_menus` | 423 | 纳入 | 菜单/权限点导航 |
| `public.core_dict_types` | 6 | 纳入 | 字典类型 |
| `public.core_dict_items` | 24 | 纳入 | 字典项 |
| `hrm.departments` | 23 | 纳入 | 标准组织树；`manager_id/created_by/updated_by` 全 NULL |
| `hrm.positions` | 20 | 纳入 | 标准岗位；`created_by/updated_by` 全 NULL |

排除（代表性）：
- `iam.*` / `master_data.*` 的空表复制（roles/permissions/dict/uoms 均为 0 行）→ 无数据可快照；
  实际数据在 `public.core_*`。
- `public.system_settings`（0 行）、`public.core_api_version_configs`（0 行）、`public.conversion_rules`（0 行）。
- `iam.users` 等用户主体、`hrm.employees`、`hrm.companies`、`audit_logs`、业务单据、事件流、队列、缓存、
  `*_ledger` → 含 PII/业务/运行态，一律排除。
- `public.core_faqs` / `public.core_guides`（各 12 行）→ 帮助内容，不影响登录与鉴权，未纳入。

需确认项（已定）：
- `iam.users` 初始管理员：**不纳入**（含账号与密码哈希，属 PII/凭据）；由 seeds/初始化流程创建。
- `core_tenants` 是否每环境不同：当前仅 1 个默认租户且库地址为 NULL → 纳入；若未来多租户/独立库，按环境排除。

### 9.2 脱敏审查

- 列名正则（`email|phone|address|name|id_card|passport|ssn|bank|password|secret|token`）扫描 11 张表：0 命中。
- 用户引用列强制校验：`hrm.departments.manager_id/created_by/updated_by`、`hrm.positions.created_by/updated_by`
  必须全为 NULL（实测 23/23、20/20 NULL），否则脚本拒绝生成。
- `core_tenant_settings` 仅 4 条非敏感键值（邮件主题/发件人/开关），无 SMTP 凭据。
- 结论：可纳入，无需额外脱敏。

### 9.3 幂等与冲突处理

- **完整供给**：非空库默认 exit 1；`--force-nonempty` 才 DROP+CREATE，因此数据恢复目标始终为空，无行级冲突。
- **`--data-only`**：按依赖逆序 `DELETE` 仅 11 张纳入表后重放快照，可重复执行。
  选用 `DELETE` 而非 `TRUNCATE` 的原因：外部表 `public.core_finance_approval_workflows` 外键引用
  `core_tenants`，`TRUNCATE` 会失败；`CASCADE` 被禁止（会波及其他表）。`DELETE` 受外键约束保护，
  外部引用存在时直接 fail-closed。
- **快照 vs 迁移增量（结论）**：**前向增量优先，不会回退**。快照表示 `≤ anchor` 的状态；
  `> anchor` 的前向迁移在数据之后执行，新增/更新/删除均叠加在快照上。实测插入 1 条权限 →
  最终 987（快照 986 + 增量 1）。重供给时若锚点已前移，data 快照本身已包含这些增量；
  若未前移而迁移已应用，`--data-only` 会因 `max(version)≠anchor` 被拒绝。

### 9.4 顺序实测与取舍

固定顺序：**结构 → 数据 → 前向迁移 → 校验**。

- 理由：先结构避免数据写入缺列；前向在数据后，保证增量不被快照覆盖。
- 实测 1（兼容迁移，插入权限）：exit 0，权限点 986 → 987。
- 实测 2（不兼容迁移，`ADD COLUMN ... NOT NULL` 无默认）：数据恢复成功、前向迁移失败 → exit 1。
  说明此类迁移无法靠调整顺序规避（先前向也会因快照缺列失败），必须重生成 data 快照或改写迁移；
  脚本保持 fail-closed，不静默跳过。

## 10. 初始管理员（--with-admin）

### 10.1 实测契约（依据：`baseline_20261105235700.sql.gz` + prod 只读查询 + Rust 代码）

| 项 | 实测结论 |
|---|---|
| 登录用户表 | **`iam.users`**（不是 `public.users`）；`SELECT ... WHERE (username=$1 OR email=$1) AND deleted_at IS NULL` |
| 密码哈希 | **bcrypt**，`bcrypt::DEFAULT_COST`（`hash_password`）；校验 `verify_password` → `bcrypt::verify`，损坏哈希返回 false |
| id | `uuid`，DB 默认 `gen_random_uuid()`；代码侧用 `Uuid::new_v4()` |
| 必填列 | `username`、`email`、`password_hash`；其余（`status` 默认 `active`、`is_active`、`is_superuser`、`roles`、`created_at`/`updated_at`）均有默认值 |
| 唯一约束 | `username` 与 `email` 各自**全局唯一**；软删除行仍占用唯一键（同名已删 → fail-closed，要求人工处理） |
| 软删除 | `deleted_at`；登录只接受 `deleted_at IS NULL` 且 `status='active'` |
| 角色绑定 | `public.core_user_roles(user_id, role_id)`，PK `(user_id, role_id)`，FK `role_id → core_roles(id)`；**基线无 `tenant_id` 列** |
| 管理员角色 | `public.core_roles.name = 'admin'`（prod 快照唯一）；不按 id 硬编码，按 name 查询 |
| 超级管理员 | `iam.users.is_superuser = true` → 登录短路 `permissions=["*"]`；prod 的 `admin` 角色本身仅绑 2 个权限点，故必须置为 true |
| 其他初始化数据 | `core_tenant_users` **非必需**（prod 0 行；登录回落默认租户）；会话/刷新令牌表在登录时按需写入，无需预置 |

### 10.2 密码策略与传递

- 策略与代码实际校验一致：**6–64 字节**（`password.len()`）。自动生成固定 **20 位**，保证大写/小写/数字各至少一个；
  若通过 `--admin-password-stdin` 传入，则按 6–64 字节校验，不做额外复杂度拒绝（与产品创建/改密入口一致）。
- 密码**默认随机生成**；`--admin-password-stdin` 从 stdin 读取（不走 argv、不回显）；`--admin-password-file`
  额外写入 0600 文件（默认不写）。
- 生成后**只在 stderr 打印一次**并提示「仅本次显示」；stdin 模式不回显。
- 哈希：`topems-admin-pass` 调用 `topems_unified_core::modules::iam::auth::verify_password` 对生成值做
  **正例（必须接受）+ 反例（错误密码必须拒绝）** 自校验；供给阶段再从 `iam.users` 读回哈希做同样正反校验。
  「同一实现」由 Rust 编译器保证：工具与登录handler 引用同一个函数符号，而非另写 bcrypt 调用。
- 临时材料：`mktemp -d` + `chmod 700`，哈希/密码文件 0600；退出时覆写并删除；**禁止** stdout、仓库文件、
  `.env` 模板、日志文件；`--admin-password-file` 路径若落在仓库根下直接拒绝。

### 10.3 幂等与重置

- 已存在同名/同邮箱（含软删除探测）：默认 **exit 0**，打印「已存在，跳过」，**不改密码**；仅补齐 `core_user_roles` 绑定并校验。
- 重置必须显式 `--reset-admin-password`：更新 `password_hash`、`password_changed_at`、清空失败次数/锁定，
  并重新执行正/反例校验。
- 命中多个用户（一个 username、另一个 email）或已软删除同名 → **exit 1**，要求人工处理。
- 邮箱已属其他用户名（仅 email 命中）→ **exit 1**，拒绝把既有普通用户提升为管理员。
- 已供给库可用 `--admin-only` 重复执行上述语义，不改结构/参考数据/迁移。

### 10.4 prod 禁用策略

- 真 prod（库名 `topems_prod`、prod 主机特征）在**任何连接前**拒绝，`--force` 不放行。
- `prod-replica` 默认拒绝管理员操作；确需演练必须 `--allow-prod-admin` 并打印强警告。
- 管理员步骤位于**前向迁移与终态校验之后**：只有结构/数据/账本/指纹全部通过后才会写入 `iam.users`，
  且 `> anchor` 迁移不可能覆盖该用户。
