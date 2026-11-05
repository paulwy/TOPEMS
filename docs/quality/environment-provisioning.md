# 环境供给与基线锚点（「基线即唯一供给入口」）

> 定案：2026-11-05 ｜ 入口：`scripts/db/provision-env.sh`
> 相关：[部署手册 §4.6](../deploy-production.md)、[P4 报告 §16/§19](./p4-reverse-tables-triage-2026-11-05.md)

## 1. 结论

- **新环境不再从零重放迁移链**。历史链有断点：`database/migrations/20261005000004_lims_qa_lab_fk_repoint.sql`
  依赖 `public.qa_lab_tasks`，该表由**更晚**的 `20261007000009` 才创建 → 空库全链 `sqlx migrate run` 必然失败。
- 唯一受支持供给路径：**恢复基线快照（schema + `_sqlx_migrations` 账本）→ 只应用 `version > anchor` 的前向迁移**。
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
| 基线规模 | 表 **1349** / 账本成功记录 **576** |

锚点语义：**锚点及以前的所有 schema 变更已包含在 schema 快照中**，对应账本记录已写入 `_sqlx_migrations`；
迁移文件与账本之间不再重放历史。锚点之后的迁移必须按版本顺序前向应用。

校验方式：`provision-env.sh` 启动时读取元数据，对 schema/ledger 计算 sha256，任一不匹配立即 exit 1，
不会连接目标库。

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
| `--anchor <14 位>` | 覆盖锚点；必须存在 `baseline_<anchor>.json` 且 sha256 校验通过 |
| `--force-nonempty` | 显式允许覆盖非空库：`DROP DATABASE ... WITH (FORCE)` + 重建，打印 ⚠️ WARN；**prod 形态一律不可用** |
| `--prod-ssh` / `--prod-dsn` | prod 只读比对入口（仅 `SELECT` information_schema） |
| `--skip-prod-fingerprint` | 跳过 10 表指纹比对；`prod-replica` 不允许 |

流程：建库（不存在）→ 非空守卫 → 恢复 schema（`gunzip | psql`，`ON_ERROR_STOP=1`）→ 恢复账本 →
校验「表数 1349 / 账本 576 / max(version)=anchor」→ `apply-forward.sh --anchor <anchor>`（只应用 `version > anchor`）→
终态校验（表数 ≥ 基线、`max(version) ≥ anchor`、0 pending 时必须等于 anchor）→ 10 张核心表结构指纹与 prod 比对。

**幂等**：重复执行命中非空库 → 默认 **exit 1**（不静默覆盖）；确认重建必须显式 `--force-nonempty`。
**fail-closed**：探测失败、sha256 不匹配、账本/表数/锚点/指纹任一不符 → exit 1；**永不回退 `sqlx migrate run`**。
**prod 特征**：库名 `topems_prod`、host `192.168.110.115`/`xingzhai`/含 `prod` → 在任何连接前拒绝
（`prod-replica` 除外，但要求库名含 `replica`）。

## 4. 锚点前移流程（每次 prod 批量 DDL 后必须执行）

> 适用：prod 完成一批 DDL/迁移后（账本前进）。目标：重生成基线资产、锚点前移、资产随提交入库。
> 源库只读（`pg_dump` + `SELECT`），本流程不对 prod 做任何 DDL/DML。

```bash
# 1) 生成新基线（源库 DSN 走环境变量，禁止入库）
TOPEMS_PROD_DSN='postgresql://<user>:<pwd>@<host>:5432/topems_prod'
bash scripts/migration/gen-baseline.sh --dsn "$TOPEMS_PROD_DSN" --chain-db p4_rebuild_verify
#    产物：prod_schema_<new>.sql.gz / prod_ledger_<new>.sql / baseline_<new>.json

# 2) 把最新元数据追加进 anchors.json（单调不减）
node - <<'NODE'
const fs = require('fs');
const dir = 'database/baseline';
const latest = fs.readdirSync(dir)
  .filter((f) => /^baseline_\d{14}\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf-8')))
  .sort((a, b) => b.anchor_version - a.anchor_version)[0];
const doc = JSON.parse(fs.readFileSync(`${dir}/anchors.json`, 'utf-8'));
const entry = {
  anchor_version: latest.anchor_version, generated_at_utc: latest.generated_at_utc,
  schema_file: latest.schema_file, ledger_file: latest.ledger_file,
  schema_sha256: latest.schema_sha256, ledger_sha256: latest.ledger_sha256,
  table_count: latest.table_count, ledger_rows: latest.ledger_rows,
  migrations_manifest: 'migrations_at_anchor.json',
};
if (!doc.anchors.some((a) => a.anchor_version === entry.anchor_version)) doc.anchors.push(entry);
doc.anchors.sort((a, b) => a.anchor_version - b.anchor_version);
fs.writeFileSync(`${dir}/anchors.json`, `${JSON.stringify(doc, null, 2)}\n`);
NODE

# 3) 重生成锚点时刻的迁移清单（把当前已存在文件全部纳入）
node scripts/ci/check-baseline-integrity.mjs --write-manifest

# 4) 校验并提交（资产 + 元数据 + anchors + manifest 一起入库）
node scripts/ci/check-baseline-integrity.mjs
git add database/baseline/
git commit -m "chore(baseline): 锚点前移至 <new-anchor> 并入库基线资产"
```

要求：
1. **锚点单调不减**；`anchors.json` 最新锚点必须等于最新 `baseline_*.json`。
2. schema/ledger 的 sha256 必须与元数据一致（`check-baseline-integrity.mjs` 阻断）。
3. 基线资产、元数据、anchors、manifest **必须同一提交**，避免 CI 读到半套状态。
4. 前移后，新迁移必须 `version > 新锚点`。

## 5. 新迁移规则

- 文件名必须 `{14 位 version}_{description}.sql`，且 **version > 当前锚点**。
- 版本 ≤ 锚点的新文件会被 `scripts/ci/check-baseline-integrity.mjs` 阻断（既存文件在
  `migrations_at_anchor.json` 清单内，豁免）。
- prod 应用仍只走 `scripts/migration/apply-forward.sh --prod`；定向/无守卫破坏性 pending 会被硬拒绝。

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
1. 基线资产存在且 sha256 与元数据一致；
2. 锚点为 14 位合法时间戳；
3. `anchors.json` 单调不减，最新锚点 = 最新元数据；
4. 新增迁移（不在清单内）版本必须 > 锚点。

接入：
- **pre-commit**（`lefthook.yml` → `baseline-integrity`）：仅当暂存区含 `database/migrations|baseline` 或本校验脚本时执行
  `--changed-only`，无变更秒级跳过（取舍：sha256 对 178KB 资产为毫秒级，可接受）。
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

> prod 仅只读：指纹比对使用 `ssh + psql -d topems_prod` 的 `information_schema` 查询，无任何 DDL/DML。
