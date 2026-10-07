# database/migrations/ — 增量迁移目录

本目录是 TOPEMS 生产环境**唯一**的增量迁移链，由 `sqlx migrate run` /
`scripts/migrate.sh` 按文件名前缀解析出的版本顺序执行。

> 治理原则（2026-10 定）：**冻结历史、规范未来**。
> 已应用到生产的迁移文件**只许新增、不许改名/改内容/重排**——
> 生产 `_sqlx_migrations` 处于半迁移态，叠加 `scripts/migration/validate.sh`
> 按路径串记录 SHA-256、工具链 `find -maxdepth 1` 扁平发现，
> 任何对历史文件的重排都会触发 checksum mismatch / `removed` 错误，风险远大于整洁收益。
> 因此历史遗留（双前缀、重名对、巨型文件）一律**保留现状 + 在此注释背景**，不改文件本身。

## 现状（2026-10-07 实测）

- 根目录共 **323 个 `.sql`**，扁平（flat，无子目录分组）。
- 前缀两类并存：
  - **序号制 14 个**：`000_create_schemas.sql` ~ `013_login_log.sql`（见下「两段式前缀由来」）。
  - **时间戳制 309 个**：`20260716000000_*.sql` 起，持续新增（链尾 `20261007000030_convert_naive_timestamps_to_timestamptz.sql`）。
- `database/checksums.txt`：由 `scripts/migration/validate.sh` 生成的 SHA-256 清单，
  **请勿手改**；重跑该脚本会全量重写。

## 两段式前缀的历史由来

本目录**并存两套命名前缀**，这是历史演进结果，不是错误，也不再统一：

| 阶段 | 命名格式 | 数量 | 时间范围 | 成因 |
|------|---------|------|---------|------|
| 早期（项目脚手架期） | `NNN_描述.sql`（`000_create_schemas.sql` … `013_login_log.sql`） | 14 | 项目初期 ~ 2026-07-14 | 产品刚起步、单人开发，按 schema 域手工编号建骨架（schemas/iam/tenant/plugin/dict/help/flow/communication/file/sync/billing/migration/menu/login_log）。序号简单直观。 |
| 当前（多服务并行期） | `YYYYMMDDHHMMSS_描述.sql`（14 位时间戳） | 309 | 2026-07-16 ~ 至今 | 多分支并行开发后，序号制必然冲突（两人同时拿 `014`），改为时间戳制以天然无冲突、可从文件名读出创建时间，并与 sqlx 等工具默认格式对齐。 |

**为什么不把 000–013 也改成时间戳**：这 14 个已被 `_sqlx_migrations` 记录、内容已进 checksum，
改名会让 `validate.sh` 报 `removed`、让 sqlx 报 checksum 不一致。收益（整洁）远低于风险，故冻结。

## 新迁移命名规范（强制）

所有**新增**迁移一律使用 14 位时间戳，**禁止**再用序号制或 `V{NN}_`：

```
格式: YYYYMMDDHHMMSS_描述.sql
示例: 20260828120000_add_new_feature_table.sql
```

要求：
1. 时间戳精确到秒（`YYYYMMDDHHMMSS`），在同一目录内严格单调递增、不得回退。
2. 描述用小写 + 下划线分隔；优先 `YYYYMMDDHHMMSS_{域}_{动作摘要}.sql`。
3. 一个迁移只做一件事（单一职责）；面向生产尽量幂等（`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS`）。
4. **禁止修改任何已存在（已应用）的历史迁移**——包括序号制的 000–013。
5. 新增文件仍放在本目录**根下**（保持 flat），不要新建子目录——工具链 `find -maxdepth 1` 写死为扁平发现。

## .snippets 模板已迁出

原 `database/migrations/.snippets/add_tenant_id_template.sql`
（add_tenant_id 公共 SQL 片段模板，非迁移、不被执行）已于 **2026-10-07** 迁出到：

```
docs/database/snippets/add_tenant_id_template.sql
```

迁出原因：`.snippets/` 混在迁移目录里，污染了「本目录 = 已执行迁移全集」这一不变量
（曾造成 git 跟踪数 vs 根目录 .sql 数的差额）。它只是模板、不进 `_sqlx_migrations`，
也不在 `validate.sh` 的 `find -maxdepth 1` 扫描集内，纯挪动对迁移链零影响。
对应的代码生成器见 `scripts/gen-add-tenant-id.mjs`。

## 历史遗留注释（保留不改，仅说明背景）

### 描述名重复 2 对（审计 DIR-11）

下列两对迁移**描述名相同、时间戳不同**。时间戳不同 → 不构成版本冲突，
但属于「首建未覆盖全部环境 → 补建返工」的痕迹。已应用，不改名：

- `20260916000001_crm_contracts.sql` 与 `20260918000064_crm_contracts.sql`
- `20260908000003_mes_material_plans.sql` 与 `20260919000079_mes_material_plans.sql`

### 巨型迁移 >50KB（审计 DIR-15，共 12 个，最大 ≈530KB）

历史上存在「一次性生成式 / 自愈对齐」类巨型迁移（单文件含大量 DDL 或索引），
单文件难以 review。这些都是**已应用**的历史文件，保留不动；
仅作为背景登记，提醒未来**新增**迁移不要复刻这种体积。最大几个：

| 大小 | 文件 |
|------|------|
| ≈530 KB | `20261007000006_rebuild_orphan_tables.sql`（最大） |
| ≈392 KB | `20261007000009_align_orphan_tables_selfheal3.sql` |
| ≈325 KB | `20260924110000_create_fk_indexes.sql` |
| ≈301 KB | `20260725000000_business_base_tables.sql` |
| ≈288 KB | `20261007000004_align_missing_columns_selfheal.sql` |
| ≈228 KB | `20260908000016_rls_enable_all.sql` |

未来新增迁移应通过 CI 前置门禁控制体积（见 `scripts/ci/check-large-files.sh`
对新暂存 `.sql` >100KB 的报警规格）。

## 校验与工具链

- `scripts/migration/validate.sh`：文件名格式 / 版本顺序 / 幂等性 / 单职责 / checksum 全量校验，
  每次运行**自动重写** `database/checksums.txt`。本目录对它是 `find -maxdepth 1` 扁平扫描。
- `scripts/check-migration-names.mjs`：迁移命名规范门禁（CI `--strict`）。
- `scripts/migrate.sh`：实际执行入口（sqlx-cli 优先，psql 回退）。
- 一次性、非迁移链的数据订正脚本（如 feedback→ticket）不放在本目录，
  归位于 `scripts/db/`（运维脚本区），避免污染迁移链。
