# 主库半迁移运维模式约定（2026-10-01 收口）

> **2026-11-13 实测更正**：当前生产库是 xingzhai 机 **`topems_prod`**，`_sqlx_migrations` **667** 条 success、0 失败、无重复，max `20261112190000`（统计时点 2026-11-13）。本文所称"生产主库 `topems` / 280 条记录 / 298 个迁移文件"是 **2026-10-01 的时点记录**，该库（`ehs` 65 表）**不是当前生产**；当前生产账本与操作口径以 `database-primary-instance.md` 与 `docs/deploy/macos-production-ops.md` 为准。下文历史数字保留不改写。

> 本文档定义 TOPEMS 本机旧库 `topems`（2026-10-01 时点，**非当前生产**）的既有"半迁移状态"处置决策与后续结构演进的**强制运维模式**，作为 `database-primary-instance.md` 的补充约定。凡涉及生产主库结构变更，**一律以本文档为准**。

## 1. 背景与决策（唯一权威）

| 项 | 内容 |
|---|---|
| 现状 | 主库 `topems` 的 `_sqlx_migrations` 已有 **280 条**记录，`database/migrations/` 现有 **298 个**迁移文件，缺口 **18 个**（含 09-21 后"停登惯例"的有意不记账迁移；2026-10-06 实测口径，旧值 25/300+ 已更新） |
| 成因 | 结构经**运行时演进**至 2026-09-26（直接 DDL / 应用启动建表等），未通过 `sqlx migrate run` 记录 |
| 决策（用户拍板 2026-09-30） | **接受现状 + 文档化 + 防护**：`_sqlx_migrations` **不补跑**历史积压；未来结构演进走**直接 DDL 运维**，而非 `sqlx migrate run` |
| 风险 | 若直接 `sqlx migrate run`，会把 258 个历史版本**补跑到运行库**（含数据操作迁移），存在数据损坏/生产停机风险 |

## 2. 运维模式约定（强制）

### 2.1 旧库 `topems`：结构演进 = 直接 DDL 运维（历史口径）

> 历史口径（2026-10-01）：对象为当时的本机 `topems` 库，**非当前生产**；当前生产 `topems_prod` 的账本已收敛为 667 条 success（2026-11-13 实测）。

本机旧库 `topems` **禁止** `sqlx migrate run`（含 `migrate.sh run`）。结构变更一律按以下流程：

1. **编写变更**：在 `database/migrations/` 新增迁移文件（`YYYYMMDDHHMMSS__描述.sql`），保持迁移清单单一事实源、与离线缓存口径一致；
2. **预演**：在临时/测试库（空库）执行 `sqlx migrate run --dry-run` 或 migrate-verify 流程，确认 SQL 正确；
3. **执行 DDL**：直接在目标库执行（`psql "$DATABASE_URL" -f <新迁移文件>`），**不经过 migrate 补跑机制**；
4. **同步离线缓存**：跑 `scripts/sqlx-prepare.sh --check`（或等价 `cargo sqlx prepare`）刷新 `.sqlx/` 离线缓存，保证编译期查询校验新鲜度门禁通过（pre-commit Gate S）；
5. **记录迁移**（可选，推荐）：用 `migrate.sh` 的 `record_migration` 机制向 `_sqlx_migrations` 写入手动记录（`version` 取新迁移文件版本号、`description` 取描述、`checksum` = `manual-via-migrate-sh`、`ON CONFLICT DO NOTHING`），使记录随结构演进而非一次性补跑。
   - **精确记账变体（2026-10-06 先例，推荐）**：主库账本存在既有 checksum 漂移（sqlx migrate run 报 "previously applied but has been modified"），新迁移一律手工记账且 checksum 取**迁移文件原始字节的 SHA-384**（`sha384(文件字节)`，与 sqlx-core 0.8.6 `Sha384::digest(sql.as_bytes())` 算法一致）：
     ```sql
     INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
     VALUES (<version>, '<desc>', NOW(), true, decode('<sha384-hex>','hex'), <ms>);
     ```
     先例：U3（`20261006000003_u3_fake_sync_records_cleanup.sql`）、U12b 对齐、B5b（`20261006000004_b5b_gis_rls_allowall_policy.sql`，checksum=`3bf48843…c3228`）均按此记账。

### 2.2 防护机制（migrate.sh 内置）

`scripts/migrate.sh run` 内置 `check_stale_migration_state()`（`migrate.sh:414`），对**任何**目标库执行前置检测：

| 检测结果 | 行为 |
|---|---|
| 空库 / `_sqlx_migrations` 不存在或 0 记录 | 放行（全新环境，正常全量） |
| 有未应用迁移且积压 < 10 | 信息性提示（正常演进），继续 |
| 积压 ≥ 10（默认阈值，`MIGRATE_STALE_THRESHOLD` 可调） | **拒绝执行**，提示"已记录 X / 文件 Y（积压 N）"；仅当显式 `MIGRATE_ALLOW_STALE=1` 才继续 |
| `--dry-run` | 跳过检测（预演模式） |

**验证记录**：主库实跑正确拒绝（已记录 25 / 文件 283、积压 258、最高记录 `20260725000002` < 文件最高 `20260928120000`）；空库 dry-run 放行。

## 3. 使用边界

| 场景 | 允许方式 |
|---|---|
| 本机旧库 `topems`（2026-10-01 半迁移状态，**非当前生产**） | **直接 DDL 运维**（2.1 流程）；`sqlx migrate run` 默认被防护拦截 |
| 新库 / 空库 / 测试库 / 开发库 | `sqlx migrate run` 正常全量（防护自动放行） |
| 显式全量补跑（不推荐生产） | `MIGRATE_ALLOW_STALE=1 migrate.sh run`——需人工确认补跑 258 个历史版本的风险 |
| 未来新功能结构演进 | 一律走 2.1 直接 DDL 流程，**不得**用补跑机制"顺手带上" |

## 4. 日常操作速查

```bash
# 1) 新结构变更：写迁移文件 → 空库预演 → 目标库直接执行
psql "$DATABASE_URL" -f database/migrations/20261001090000__新变更.sql

# 2) 同步离线缓存（必须，否则 Gate S 拦截）
scripts/sqlx-prepare.sh --check

# 3) 记录迁移（推荐，保持追踪演进）
#    migrate.sh record_migration 机制：INSERT INTO _sqlx_migrations ... manual-via-migrate-sh

# 4) 误触防护验证（预期输出：拒绝 + 提示设置 MIGRATE_ALLOW_STALE=1）
MIGRATE_URL=$(grep MIGRATE_URL .env | cut -d= -f2-) migrate.sh run
```

## 5. 相关文件

- `scripts/migrate.sh`（检测逻辑：`check_stale_migration_state`，行 414；记录机制：`record_migration`）
- `docs/database/database-primary-instance.md`（主库口径总文档）
- `docs/archive/misc/TOPEMS脚本全面分析与topems.sh优化报告.md`（决策背景，`60f09ac9`）
- 防护提交：`60f09ac90 fix(migrate): 主库半迁移状态检测防护——防误补跑 258 个历史迁移到运行库`
