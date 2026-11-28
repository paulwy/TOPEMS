# 环境供给与基线锚点（「基线即唯一供给入口」）

> 定案：2026-11-05 ｜ 入口：`scripts/db/provision-env.sh`
> 相关：[macOS 部署指南](../deploy/macos-deployment.md)、[P4 报告 §16/§19](./p4-reverse-tables-triage-2026-11-05.md)

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
| 锚点（anchor） | `20261117235500`（14 位版本号 `YYYYMMDDHHMMSS`） |
| 元数据 | `database/baseline/baseline_20261117235500.json` |
| schema 资产 | `database/baseline/prod_schema_20261117235500.sql.gz`（sha256 见元数据） |
| 账本资产 | `database/baseline/prod_ledger_20261117235500.sql`（sha256 见元数据） |
| 历史锚点列表 | `database/baseline/anchors.json`（单调不减） |
| 锚点时刻迁移清单 | `database/baseline/migrations_at_anchor.json`（778 条，新增迁移豁免依据） |
| 参考数据元数据 | `database/baseline/baseline_20261117235500_data.json` |
| 参考数据资产 | `database/baseline/baseline_20261117235500_data.sql.gz`（sha256 见元数据） |
| 基线规模 | 表 **1345** / 账本成功记录 **704** / 参考数据 **10 张表、4740 行** |
| 上一锚点（保留追溯） | `20261105235700`：表 1349 / 账本 576 / 参考数据 11 张表 2277 行 |
| 前向后终态（2026-11-08 实测） | 表 **1343**（净变更 −6，含前向合法 DROP）/ 账本 **623**（576 + 47 条前向）/ `max(version)=20261108090000` |

锚点语义：**锚点及以前的所有 schema 变更已包含在 schema 快照中**，对应账本记录已写入 `_sqlx_migrations`；
锚点时刻的参考数据已包含在 data 快照中。锚点之后的迁移必须按版本顺序前向应用。

校验方式：`provision-env.sh` 启动时读取元数据，对 schema/ledger/data 计算 sha256，任一不匹配立即 exit 1，
不会连接目标库。参考数据缺失或元数据缺失时同样失败（除非显式 `--no-reference-data`）。

### 2.1 迁移入口的 `search_path` 上锁（2026-11-18）

`scripts/migrate.sh` 与 `scripts/migration/apply-forward.sh` 现在会给**迁移进程**固定
`search_path=public`：URL DSN 追加 `options=-csearch_path%3Dpublic`，socket/SSH 模式用
`PGOPTIONS=-csearch_path=public`。只影响这两个脚本发起的 `psql` / `sqlx`，不改 `.env`、
不改迁移文件、不影响 `_sqlx_migrations.checksum`。

**等价性边界（必须知道，别踩）**：

| 场景 | 是否等价 | 依据 |
|---|---|---|
| 当前锚点 `20261117235500` 之后的 15 条 pending | **等价** | 全部表名 schema 限定；无一条依赖 `$user` 解析 |
| 全新库从 0 重放全链 | **不等价** | 迁移链里有 **78 处**未限定 `CREATE TABLE`（distinct 文件+表名对），默认 `"$user", public` 与 `public` 的落点不同 |

生产快照已经证明「默认不是 public」：`core_dashboard_refresh_log` 只在 `iam`，`public` 不存在；
6 张 `*_dashboard_snapshots` 在 `iam` 与 `public` 双份；`core_master_data_refs` 在
`flow` / `master_data` / `public` 三份；`pm_master_data_refs` 在 `pm` 与 `public` 双份。
这些重复表就是历史上连接角色名恰好等于业务 schema 时按 `$user` 落错库的产物。

因此：**本仓库唯一受支持的供给路径是「恢复基线快照 + 前向迁移」**（见 §1），
全链重放不在支持范围内；若将来要做全链重建，必须以 `search_path=public` 为准重新生成
目标结构，并与历史 `iam` 副本做差异评审，不能假定与生产一致。

另：`search-path` / `boundary-gate-py` 两道门禁禁止业务代码自行改 `search_path`，
意味着「公共入口统一钉 search_path」不可行，裸名歧义只能逐处加 schema 限定。
新增 SQL 前请先查 [裸名引用长期对照表](../database/shadow-bare-ref-scan-2026-11-18.md#01-长期对照表与门禁约束2026-11-18-补充)。

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
| `--escalate-existing` | 同名用户已存在但**不是管理员**时，显式允许提升为管理员（默认拒绝；不会改其密码） |
| `--admin-only` | 仅对已供给库执行管理员创建/校验/重置，不改结构/数据/迁移（幂等与运维重置入口） |
| `--runtime-role <name>` | 运行角色名（默认 `topems_app`，需已由 `setup-db.sh --create-user` 创建）；供给末尾自动执行全库授权与连接自检 |
| `--runtime-dsn <dsn>` | 运行角色连接串（自检用；也可用 `RUNTIME_DATABASE_URL`） |
| `--health-url <url>` | 供给末尾校验 `/health` 必须返回 200（也可用 `HEALTH_URL`；未提供时仅告警） |
| `--allow-prod-admin` | 仅 `prod-replica` 显式允许管理员操作（强警告；真 prod 永不可用） |
| `--force-nonempty` | 显式允许覆盖非空库：`DROP DATABASE ... WITH (FORCE)` + 重建，打印 ⚠️ WARN；**prod 形态一律不可用** |
| `--prod-ssh` / `--prod-dsn` | prod 只读比对入口（仅 `SELECT` information_schema） |
| `--skip-prod-fingerprint` | 跳过 10 表指纹比对；`prod-replica` 不允许 |

流程（固定顺序）：建库（不存在）→ 非空守卫 → 恢复 schema（`gunzip | psql`，`ON_ERROR_STOP=1`）→ 恢复账本 →
**恢复参考数据**（逐表行数与元数据精确一致）→ 校验「表数 1349 / 账本 576 / max(version)=anchor」→
`apply-forward.sh --anchor <anchor>`（只应用 `version > anchor`）→
终态校验（**必需表存在性**、`max(version) ≥ anchor`、参考数据行数允许前向增量、admin 权限最小集、10 表结构指纹与 prod 比对）
→（可选 `--with-admin`）创建/校验初始管理员 →
**运行角色授权与自检**（`grant-topems-app.sql` 按当前目标库授权 → 运行角色能连库 → admin 账号存在 → `/health` 200，任一失败 exit 1）。
管理员放在**前向迁移与终态校验之后**：避免任何 `> anchor` 迁移改写 `iam.users` 时覆盖管理员，也避免在结构/数据异常环境里先写入用户。

> 终态不再断言「总表数 ≥ 基线」：前向迁移可包含合法 `DROP TABLE`（如 P4 清理影子表），
> 总表数会下降。改为校验 [scripts/db/provision-env.sh](../../scripts/db/provision-env.sh) 中
> `REQUIRED_TABLES`（覆盖各模块代表表）全部存在，并输出「基线表数 → 终态表数（净变更）」。

**幂等**：完整供给重复执行命中非空库 → 默认 **exit 1**（不静默覆盖），并打印**可直接复制**的恢复命令：
- 已完整供给（账本 max ≥ 磁盘最新迁移）→ 提示 `--admin-only`（创建/校验管理员，不重建库）；
- 前向未完成 → 提示 `apply-forward.sh` 续跑；结构不完整 → 提示完整 `--force-nonempty` 重建命令。
确认重建必须显式 `--force-nonempty`。
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

生成口径（2026-11-18 实测补充，务必按此执行）：

- **源连接必须是超级用户或已补齐全表 SELECT 的角色**。`topems_prod` 角色对
  `mes.tenant_backfill_quarantine` 无 SELECT，`pg_dump --schema-only` 在 `LOCK TABLE` 阶段直接失败
  （报 `permission denied for table tenant_backfill_quarantine`）。只读探测该角色缺 SELECT 的表**仅此 1 张**；
  生成时使用本机超级用户只读连接（`postgresql://xingzhai@127.0.0.1:5432/topems_prod`），仍只有 SELECT/LOCK，零写入。
- `gen-baseline.sh` 的对齐白名单 = **16 条定向迁移 ∪ `database/migration_manifest.yaml` 已登记版本**
  （2026-11-18 时共 59 条 version ≤ 锚点但不在 prod 账本的迁移全部有登记）。新增迁移若两者都未登记，生成会硬失败。
- `--force` 覆盖既有锚点是显式确认参数，脚本不会自动覆盖；锚点文件一经入库视为不可变。
- 参考数据范围由 `gen-baseline-data.sh --tables` 显式指定（默认 11 张历史清单）。当前锚点纳入 10 张，
  逐表理由见 §9.1。

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
| 重复执行（非空，未加 force） | exit 1，诊断库名/表数/账本 max，并给出完整可复制的 `--admin-only`（已全量前向）或 `apply-forward.sh` / `--force-nonempty`（未完成）命令 |
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

### 8.1 真实环境重建（2026-11-05，`topems_test@192.168.110.115`）

| 项 | 值 |
|---|---|
| 入口 | `bash scripts/db/provision-env.sh --env test --dsn "postgresql://xingzhai@127.0.0.1:15432/topems_test" --force-nonempty --skip-prod-fingerprint`（本地 SSH 隧道；host=127.0.0.1 以避开远端 prod 特征守卫） |
| 前置全库备份 | `/Users/air/topems_backups/topems_test_before_g1_20261105.dump`（4.3MB，`pg_restore -l` 9313 项 / 1349 TABLE DATA） |
| 逐表归档 | `/Users/air/topems/backups/g1_test_tables_20261105_182939/`（141 个 `<schema>_<table>.dump`，1.4MB，抽查 4 份 `pg_restore -l` 可读） |
| 终态 | 表 1349 / 账本 576 / max(version) `20261105235700` / 参考数据 11 表 2277 行 / 10 表结构指纹 10/10 |
| 参考数据逐表 | tenants 1 / tenant_settings 4 / roles 15 / permissions 986 / role_permissions 653 / menu_groups 122 / menus 423 / dict_types 6 / dict_items 24 / departments 23 / positions 20 |
| test 独有账本 | 重建前 6 条（孤儿 `20261103000005` + 5 条 5433 定向）→ 重建后 **0** 条 |
| 丢失数据 | 13,422 行 / 141 张非空表（审计日志 5,885 行、会话 229、回款 151 等）；参考数据 11 表按基线恢复 |
| 校验 | `validate.sh` / `check-migrations` / `check-migration-names --strict` 全 exit 0；psql 连接 + 9 个主要 schema 存在 + 关键表可读 |
| 首次失败 | `ERROR: relation "core_api_version_configs" already exists`——重建窗口内有外部客户端在新库抢先建表（非 dump 自身问题：同一 dump 在本地空库完整恢复 1349 表）；清理并发后原命令重跑一次通过，未改用 `sqlx migrate run` 或手工 DROP |

> prod 全程零操作（未连接、未比对）。后续新环境与 test 复位统一走 `provision-env.sh`。

### 8.2 全量前向 + 自检复测（2026-11-08，本地 scratch）

本轮将首轮演练的 P0/P1 修复并入基线规范后，按「空库 → 一条命令」复测：

| 项 | 值 |
|---|---|
| 入口 | `provision-env.sh --env dev --db topems_init_trial_fix2_20261108_083134 --with-admin --admin-password-stdin --runtime-role topems_app --runtime-dsn <scratch> --health-url http://127.0.0.1:18080/health --skip-prod-fingerprint` |
| 结果 | exit 0，8s |
| 终态 | 表 1343（基线 1349，前向净变更 −6）/ 账本 623（576 + 47）/ `max(version)=20261108090000` / 参考数据 11 表 2277 行（前向增量叠加） |
| 必需表 | `REQUIRED_TABLES` 32/32 存在（替代「总表数 ≥ 基线」断言） |
| 参考数据增量 | roles 15→25、permissions 986→1128、role_permissions 653→2012、menu_groups 122→141、menus 423→449 |
| admin 权限 | 1128 条，含 `iam:read`（新增迁移 `20261108090000_admin_role_grant_all_permissions.sql`） |
| 运行角色授权 | `topems_app` 按当前库动态授权；连接自检通过 |
| 健康检查 | `/health` → 200；admin 登录 200；`/iam/users`、`/iam/roles` 均 200 |
| 非 superuser admin 角色 | `is_superuser=false` + `roles=["admin"]` → `/iam/users`、`/iam/roles` 均 200 |
| 非空重跑 | exit 1，打印可直接复制的 `--admin-only` 命令；原样执行 exit 0 |
| 弱口令 `abc123` | exit 1（最短 8 位）；旧密码未失效 |
| 既有非管理员提权 | 默认 exit 1；`--escalate-existing` 后 exit 0，并明确输出「将把 X 提升为管理员」 |
| `--with-admin` 未启用 | exit 0 + 红色醒目 WARN（无管理员、任何人无法登录） |
| 空角色用户 | `roles=[]`、`role=""`（不再伪造 `user`） |

## 9. 参考数据基线（reference data）

### 9.1 范围清单（当前锚点 `20261117235500`：纳入 10 张，4740 行）

| 表 | 行数 | 判定 | 备注 |
|---|---:|---|---|
| `public.core_permissions` | 1157 | 纳入（必须） | `audit_permission_codes.py --gate` 唯一数据依赖；20261118125000 种子目标 |
| `public.core_role_permissions` | 2917 | 纳入 | 纯 `role_id`/`permission_id` 映射，无人员 |
| `public.core_roles` | 17 | 纳入 | 125000 按 `name` 关联 admin/tenant_admin；110000 UPDATE 16 行 |
| `public.core_tenants` | 1 | 纳入 | 140000 前置断言与 `tenant_id` 自指回填；`database_host`/`port` 全 NULL |
| `public.core_menus` | 452 | 纳入 | 完整性校验关键表（行数 ≥ 1）；`group_id` 依赖下一行 |
| `public.core_menu_groups` | 130 | 纳入 | `core_menus` 的 FK 父表 |
| `finance.core_finance_currencies` | 16 | 纳入 | 110000 前置断言要求 NULL 租户行 = 8 |
| `finance.core_finance_report_line_map` | 48 | 纳入 | 110000 前置断言要求 NULL 租户行 = 48 |
| `pm.project_type_configs` | 1 | 纳入 | 110000 前置断言要求 NULL 租户行 = 1 |
| `mobile.sync_policies` | 1 | 纳入 | 110000 前置断言要求 NULL 租户行 = 1；`user_id` 为不透明 UUID，非明文 PII |

只带结构（不纳入数据）：
- `public.core_tenant_settings` / `public.core_dict_types` / `public.core_dict_items`：当前均 0 行，无迁移依赖。
- `hrm.departments` / `hrm.positions`：人员/组织域（`name`、`manager_id`、`salary_range` 等），当前 0 行；无迁移依赖，一律不带数据。

排除（代表性）：
- `iam.*` / `master_data.*` 的空表复制（roles/permissions/dict/uoms 均为 0 行）→ 无数据可快照；
  实际数据在 `public.core_*`。
- `iam.users` 等用户主体、`hrm.employees`、`hrm.companies`、`audit_logs`、业务单据、事件流、队列、缓存、
  `*_ledger` → 含 PII/业务/运行态，一律排除。
- 110000 还会 UPDATE `finance.*` / `pm.*` / `mobile.*` 之外的表，但只改 `tenant_id` 不改行数；
  这些表的数据不参与本轮预演判据，保持空表。

需确认项（已定）：
- `iam.users` 初始管理员：**不纳入**（含账号与密码哈希，属 PII/凭据）；由 seeds/初始化流程创建。
- `core_tenants` 是否每环境不同：当前仅 1 个默认租户且库地址为 NULL → 纳入；若未来多租户/独立库，按环境排除。

### 9.2 脱敏审查

- 列名正则（`email|phone|address|name|id_card|passport|ssn|bank|password|secret|token`）扫描 10 张纳入表：0 命中。
- 用户引用列强制校验：本次未纳入 `hrm.departments` / `hrm.positions`，脚本跳过该项并打印说明；
  两张人员/组织表只带结构。
- `core_tenant_settings` 当前 0 行，只带结构；即便未来有数据，也仅邮件主题/发件人/开关，不含 SMTP 凭据。
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

- 策略统一为共享函数 `validate_password_strength`（`svc/unified-core/src/modules/iam/auth.rs`）：
  **8–64 字节，且同时包含大写字母、小写字母和数字**。`topems-admin-pass`、API 创建用户/改密/租户开通
  以及 provision 的 `--admin-password-stdin` 与 `--admin-only --reset-admin-password` 全部走同一实现。
  自动生成固定 **20 位**，天然满足该复杂度。
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
- 同名用户已存在但**未绑定 admin 角色** → 默认 **exit 1**；必须显式 `--escalate-existing`，
  且输出明确写出「将把 X 提升为管理员（保留原密码）」。不再静默提权。
- 已供给库可用 `--admin-only` 重复执行上述语义，不改结构/参考数据/迁移。

### 10.4 prod 禁用策略

- 真 prod（库名 `topems_prod`、prod 主机特征）在**任何连接前**拒绝，`--force` 不放行。
- `prod-replica` 默认拒绝管理员操作；确需演练必须 `--allow-prod-admin` 并打印强警告。
- 管理员步骤位于**前向迁移与终态校验之后**：只有结构/数据/账本/指纹全部通过后才会写入 `iam.users`，
  且 `> anchor` 迁移不可能覆盖该用户。

## 11. 漂移门禁（ledger-ddl-drift）从零跑通

该门禁只在 **pre-push（lefthook）** 跑，CI 不跑，因此不需要 GitHub Actions 的 postgres service，
也不需要 `topems_gate` 角色出现在 CI 里。它校验的是：`_sqlx_migrations` 记为 `success` 的迁移，
其声明的结构是否真的落在目标库上（断言清单 `database/migration_drift_assertions.json`）。

### 11.1 依赖

- 本机 PostgreSQL 16+，`psql` / `createdb` / `dropdb` / `gzip` / `python3` 可用。
- 基线三件套随仓库可取：`database/baseline/prod_schema_<anchor>.sql.gz`、
  `prod_ledger_<anchor>.sql`、`baseline_<anchor>_data.sql.gz`（当前锚点见 `anchors.json`）。
- 角色 `topems_gate` 已存在（集群级角色，不属于任何单个库）。建库脚本**不会创建角色**，
  避免改动共享授权策略；缺角色时脚本 exit 2。
- 口令来源：`.env` 的 `MIGRATION_DRIFT_DB_URL`（内嵌口令，`.env` 不入库），
  或 `PGPASSWORD` / `PGPASSFILE`。`.env.example` 里只给无口令模板。

### 11.2 从零到 PASS

```bash
# 1) 以本机具备 CREATE DATABASE / CREATE EXTENSION / GRANT 权限的角色执行（通常即当前 OS 用户）
bash scripts/migration/build-drift-gate-db.sh
#    → 重建 topems_gate：基线 schema + 账本 + 参考数据 + 幂等列对齐
#      + 前向重放迁移链至 20261122160000（apply-forward --drill-gate-guc-auto）
#      + 只读授权（按实际 schema 推导）
#    → 对齐断言：tables / ledger_rows / max(version) 与 baseline_<anchor>.json 一致
#    → 前向读数（2026-11-23 实测）：tables=1373 ledger=787 max(version)=20261122160000

# 2) 在本机 .env 写一行（口令按实际情况补，勿提交）
# MIGRATION_DRIFT_DB_URL=postgresql://topems_gate:<password>@127.0.0.1:5432/topems_gate

# 3) 直接跑门禁（无需 export 任何变量）
MIGRATION_DRIFT_FORCE=1 bash scripts/ci/check-ledger-ddl-drift.sh
#    → [Gate DRIFT] PASS 断言 14 项，记账校验 11 项
#    → 20261122160000 的两条断言（mes_order_id 可空、success 必有 MES 单号）真正执行，
#      不再出现在 NOTE 跳过清单里
```

夹具锚点口径：仓库基线快照锚点为 `20261117235500`（`database/baseline/` 最新），
建库脚本在此基础上用本机迁移链前向重放到 **`20261122160000`**，因此夹具的账本头
（`max(version)`）与漂移断言执行范围都是 `20261122160000`。只应用 version 大于基线锚点的
迁移（`apply-forward.sh` 逐版本单事务并写账本），不回放历史迁移、不新建基线快照。

授权口径：建库脚本末段**不写死 schema 清单**，而是按目标库 `pg_namespace` 中实际存在的
schema 批量授予 `USAGE` + `SELECT`（排除 `pg_catalog` / `information_schema` / `pg_toast`
与 `pg_*` 信息模式）。授权放在前向重放之后，保证新迁移新建的表也被覆盖；迁移后续新增
schema 时，只需重跑建库脚本即可，不会因为漏配清单让 `ledger-ddl-drift` 报
`permission denied for schema`。

目标库解析统一走 `scripts/ci/lib/db-target.mjs`（profile=`ledger-ddl-drift`）：顺序、口令借用、
socket 回落与诊断模式见 §12.1。默认指向 `.env` 的 `MIGRATION_DRIFT_DB_URL`（只读夹具库
`topems_gate`），专用变量优先于通用 `DATABASE_URL`，避免被某个 shell 里遗留的通用连接带偏。

### 11.3 何时重跑 / 幂等性

- 脚本固定顺序 `DROP → CREATE(template0) → schema → 账本 → 数据 → 断言 → 列对齐 →
  前向重放至 20261122160000 → GRANT`，每次重跑终态一致，可放心重复执行。
- 末段授权按库内实际 schema 推导（见 §11.2），新增 schema 后重跑即可，不需要改脚本。
- 需要重跑：基线锚点前移后、`migration_drift_assertions.json` 新增条目后、
  账本头前移后（同步更新脚本里的 `FORWARD_TO`）、看到 `账本为空` 或授权类报错后。
- 重跑不会写 `topems_prod`，也不会改角色属性。

### 11.4 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `账本为空` | 目标库是 pg_dump 结构副本（没跑过迁移） | 重跑建库脚本并指向 `topems_gate`，不要放宽判定 |
| `permission denied for schema <x>` | 角色缺该 schema 的 USAGE | 重跑建库脚本（授权按实际 schema 推导，无需改脚本补清单） |
| `permission denied for table _sqlx_migrations` | 缺账本 SELECT | 重跑建库脚本（末段授权） |
| `拒绝：以超级用户连接` | DSN 落到了 owner/superuser | 检查解析顺序，确认命中 `.env` 的 `MIGRATION_DRIFT_DB_URL` |
| `FAILED N 项漂移` | 账本声称的结构与实际不符 | 见输出中的「源 <version>」；先确认是迁移链冲突还是库陈旧，再决定重放幂等迁移或修迁移 |

### 11.5 已定稿：production_orders 数量列同为 BIGINT

`20261107000017`（`quantity` / `completed_quantity → bigint`）与
`20261120090000`（`completed_quantity → numeric(12,2)`）曾互相反转：后者沿用
`20260928120000` 的「同 4 列」清单，把该列误改回 numeric。

**2026-11-21 裁决**：prod 只读镜像实测两列均为 `bigint`；按「同表数量列必须同类型同精度」
与生产事实，统一为 **bigint**（订单数量是整数件数，小数量在 `mes.production_records`）。
由新迁移 `20261122100000_mes_production_orders_quantity_finalize_bigint` 拉回终态，
不修改已应用的 `1107/1200`；迁移含小数行守卫与终态 `int8` 断言，配套回滚。
凡越过 `20261120090000` 的库应用该迁移后漂移消失；基线夹具停在锚点
`20261117235500`，本就不受影响。

### 11.6 演练门禁（migration-drill-anchor）从零跑通

pre-push 的 `migration-drill-anchor` 从生产基线快照恢复隔离库，只应用 `> anchor` 的前向迁移，
再跑静态校验、权限审计、up-down-up 重放、RLS 策略快照与菜单权限码六步。与漂移门禁一样，
它只在 **pre-push（lefthook）** 跑，CI 不跑。

**依赖**

- 本机 PostgreSQL 16+；`psql` / `createdb` / `dropdb` / `sqlx` / `gzip` / `python3` / `node` 可用。
- 模板库 `topems_drill_template`（`datistemplate=true`，预装 `pgcrypto` / `uuid-ossp` / `vector`）。
  anchor 快照含 `CREATE EXTENSION`，非特权角色无法在空库创建，必须从模板复制。
  一次性 bootstrap（仅本机特权）：`bash scripts/dev/bootstrap-migration-drill-template.sh`。
- 角色 `topems_test_runner`：`LOGIN` + `CREATEDB`，非 superuser、非 BYPASSRLS。
- 基线三件套与 `anchors.json`（同 §11.1）。

**默认值与解析顺序**

解析顺序统一由 `scripts/ci/lib/db-target.mjs`（profile=`migration-drill`）提供：

1. `MIGRATION_DRILL_DB_URL`（进程环境 → `.env`）
2. `TEST_DATABASE_URL`（进程环境 → `.env`，默认角色 `topems_test_runner` 具备 `CREATEDB`）
3. 内置默认 `postgresql://topems_test_runner@127.0.0.1:5432/postgres`

**不接** `MIGRATE_URL` / `DATABASE_URL`：演练库需要 `CREATEDB`，不能用开发库身份代替。
连接串无内嵌口令时，只借 `.env` 中**同角色**的口令；仍无则 fail-closed，不回落 socket。
完整口径、`--explain` 用法与「缺库即失败」约定见 §12.1。
任何一档都只借角色与口令：维护库固定为 `postgres`，演练库名强制
`topems_migration_drill_<pid>`，跑完（含失败）立即 drop；不写生产，也不写
`TEST_DATABASE_URL` 指向的库本身。模板库名可用 `MIGRATION_DRILL_TEMPLATE_DB` 覆盖。

**验证与重跑**

```bash
# 默认配置：先清掉 MIGRATION_DRILL_DB_URL / TEST_DATABASE_URL / DATABASE_URL 等临时导出
bash scripts/dev/run-migration-drill.sh anchor
#   → PASS: drill:anchor 通过（anchor=<当前锚点>，总耗时约 2 分钟）
```

每次运行都新建临时库，可重复执行；模板库与角色属性不会被修改。
显式指定仍然优先：`MIGRATION_DRILL_DB_URL=... bash scripts/dev/run-migration-drill.sh anchor`
会跳过第 2–5 档。

**排障**

| 现象 | 原因 | 处理 |
|---|---|---|
| `FAIL: … 未携带口令` | DSN 无口令且 `.env` 无同角色口令 | 在 `.env` 的 `TEST_DATABASE_URL` 补口令，或显式 `MIGRATION_DRILL_DB_URL` |
| `FAIL: 该连接会 BYPASSRLS` | DSN 落到 OS 用户/owner/superuser | 改用 `topems_test_runner`；仅本地演练可 `MIGRATION_DRILL_ALLOW_SUPERUSER=1` |
| `FAIL: 演练模板库 … 不存在或未标记为模板` | 未执行一次性 bootstrap | 跑 `scripts/dev/bootstrap-migration-drill-template.sh` |
| `permission denied to create extension` | 绕过模板库直接恢复空库 | 走模板库复制；不要给演练角色扩权 |
| `createdb: permission denied` | 角色缺 `CREATEDB` | 换具备 `CREATEDB` 的角色；需新建角色或扩权时先报备 |

> 已知限制：anchor 快照含扩展创建语句，非特权角色无法在空库直接恢复；
> 模板库机制是当前不改动授权的唯一解法。

## 12. 连库钩子统一解析与状态目录门禁（status-catalog）

### 12.1 统一数据库连接解析（所有连库钩子共用）

所有需要数据库连接的 pre-commit / pre-push 检查项都通过
`scripts/ci/lib/db-target.mjs` 解析连接，只有这一处事实源。解析顺序固定为：

1. **该钩子的独立变量**（同名键：进程环境优先，其次 `.env`）
2. **通用迁移变量**：`MIGRATE_URL` / `DATABASE_URL`（各钩子按既有顺序）
3. **测试库变量**：`TEST_DATABASE_URL`（进程环境 → `.env`）
4. **内置本地夹具**（仅 `migration-drill`）

| 钩子 / 检查项 | 独立变量（tier 1） | tier 2 通用迁移 | tier 3 测试库 | 备注 |
|---|---|---|---|---|
| pre-commit `rls-permissions` | `RLS_PERMISSIONS_DB_URL`（可选） | `MIGRATE_URL` → `DATABASE_URL` | 不回落 | 校验实际运行角色，测试身份不能替代 |
| pre-commit `status-catalog` | `STATUS_CATALOG_DB_URL` | `RLS_POLICY_DB_URL` → `MIGRATION_DRIFT_DB_URL` → `DATABASE_URL` → `.env MIGRATE_URL` | `TEST_DATABASE_URL` | 不读 `.env` 的 `MIGRATION_DRIFT_DB_URL` |
| pre-push `ledger-ddl-drift` | `MIGRATION_DRIFT_DB_URL` | `DATABASE_URL`（env）→ `.env MIGRATE_URL` | `TEST_DATABASE_URL` | TCP 无口令回落 socket |
| pre-push `migration-drill-anchor` | `MIGRATION_DRILL_DB_URL` | 不接 | `TEST_DATABASE_URL` | 内置默认；不回落 socket |
| RLS 快照 / 菜单权限 / dump 共用 | `--dsn` → `RLS_POLICY_DB_URL` | `MIGRATION_DRIFT_DB_URL` → `DATABASE_URL` → `.env MIGRATE_URL` | `TEST_DATABASE_URL` | TCP 无口令回落 socket |

**不纳入统一回落的检查项**（各有特殊语义，保持原样）：`migration-validate` 仅在显式设置
`DATABASE_URL` 时才做账本漂移检查；`cargo-test-workspace` 只认 `TEST_DATABASE_URL`
（防止测试写进开发库）；`decode-contract` 的账本连接是可选放大镜，缺失不构成失败；
`mobile/web-contract-smoke` 由脚本自建隔离库。它们不属于「缺库即失败」的连库门禁，
或不能用统一回落替代，因此不接入本解析器。

**口令**（不打印、不入库、不要求手填）：进程 `PGPASSWORD` → 目标连接串内嵌 →
`PGPASSFILE` → `.env` 中**同角色**的口令（`TEST_DATABASE_URL` 优先）。角色不一致的候选
不会被借用。调用方只需设置变量或在 `.env` 配置夹具库；无法从既有环境/.env 获得口令时，
失败提示会说明应由哪个变量、哪个角色提供。

**socket 回落**：仅 `ledger-ddl-drift`、`status-catalog`、`rls-policy-snapshot` 在
「TCP 且无任何口令来源」时回落 `postgresql:///<库名>`（peer 认证）。`migration-drill`
与 `rls-permissions` 不回落：前者会以 OS 用户（通常 superuser）连入，后者会掩盖运行角色。

**缺库即失败、不跳过**：解析不到任何库时，打印「设置哪个变量 / 本机需要哪个夹具库」并以
非 0 退出；不存在「拿不到连接就跳过或放行」的分支。钩子本身的判定逻辑不变。

**诊断模式（只查看不连接，不打印连接串和口令）**：

```bash
# 逐档打印候选、命中来源、角色、库名、口令来源
node scripts/ci/lib/db-target.mjs --hook status-catalog --explain

# 模拟「没有 .env」，排查变量优先级
node scripts/ci/lib/db-target.mjs --hook ledger-ddl-drift --env-file /dev/null --explain

# 列出所有钩子的独立变量
node scripts/ci/lib/db-target.mjs --list
```

无解时 exit 2 并给出可操作提示。`--shell` 仅供脚本内部 `eval`（不做终端回显），
`--json` 输出脱敏结果。

**status-catalog 与 ledger-ddl-drift 的解耦**（原有口径保留）：漂移门禁按设计跑在
`topems_gate`（基线 + 前向重放夹具），而状态目录的唯一事实源是**基线重建库**：
`docs/database/status-check-catalog.json` 由「基线锚点 + 前向迁移」从零重建的
`topems_status_baseline_verify` 生成（目录口径见
`docs/database/prod-only-status-checks-2026-11-23.md`）。因此 `STATUS_CATALOG_DB_URL`
应指向这个基线重建库（`postgresql:///topems_status_baseline_verify`），**不要指向 dev 库
`topems`**：dev 库是长期演进的开发库，既有已归档/已删表的残留（如
`archive.drop_20261119_*`）、约束定义格式差异，也缺部分迁移，全量比对会长期 FAIL
（实测：少 2 条状态 CHECK、3 条定义不一致、无约束列 706 vs 目录 683），只能靠
`--changed-only` 掩盖，红/绿不可解释。`status-catalog` 不读 `.env` 的
`MIGRATION_DRIFT_DB_URL`，后者保持指向 `topems_gate`，两者互不影响。

### 12.2 `--changed-only` 的适用范围

- 默认仍是**全量**：`node scripts/ci/dump-status-checks.mjs --check`，逐字节比对整份目录。
- pre-commit 用 `--check --changed-only`：只比对**本次改动迁移涉及的表**。
  改动来源为暂存区 `database/migrations/*.sql`，无暂存时取 `HEAD` 与工作区差异；
  从 `ALTER TABLE`、`CREATE/DROP TABLE`、`CREATE INDEX ... ON`、`CREATE/DROP POLICY ... ON`、
  `COMMENT ON TABLE|COLUMN` 中解析表名。
- 解析不到任何表（例如本次只改了目录文件、或迁移里只有 `DROP INDEX` 之类无表名语句）时，
  自动回退全量，不静默跳过。
- 只比对 `constraints` 与 `uncovered` 中涉及表的行；枚举类型与未涉及表由全量兜底。
- `STATUS_CATALOG_DB_URL` 指向的基线库必须与当前链尾对齐。若刚拉取新迁移但未重建基线库，
  `--changed-only` 会拿旧库校验新迁移涉及的表，报「目录有库中无」的假差异；此时按 §12.3
  先重建基线库，不要改目录绕过。

### 12.3 基线库重建与定期全量

`--changed-only` 只能防「改了某表却没同步目录」，防不住「目录整体陈旧」。
**每次拉取新迁移后**都要重建基线库，否则 `--changed-only` 可能报假差异：

```bash
# 1) 从基线锚点 + 前向迁移重建参考库（隔离库，非生产）
bash scripts/db/provision-env.sh --env test --db topems_status_baseline_verify --force-nonempty --skip-prod-fingerprint
bash scripts/migration/apply-forward.sh --db topems_status_baseline_verify --drill-gate-guc-auto

# 2) 验证：确认 tier 1 命中，再跑全量（不要用 --changed-only）
node scripts/ci/lib/db-target.mjs --hook status-catalog --explain
node scripts/ci/dump-status-checks.mjs --check
```

全量 PASS 表示目录与「基线 + 前向」终态一致（当前读数：33 条状态 CHECK、5 个枚举类型、
683 个无约束列）。若 FAIL，按差异如实判断：是迁移新增/修改了状态集却未重生成目录
（重生成后与迁移同批 review），还是基线库未重建到链尾。此外建议**每周一次、每个发布窗口
前一次**手动跑全量：

```bash
set -a; . ./.env; set +a
node scripts/ci/dump-status-checks.mjs --check
```

若库已被重建，应先修复校验库或在确认差异后重生成目录，不能用 `--changed-only` 长期替代全量。
