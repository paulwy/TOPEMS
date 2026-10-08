# TOPEMS 数据库

## 目录结构

```
database/
├── README.md                 # 本文档
├── checksums.txt             # 迁移校验和
├── migrations/               # 增量迁移（生产环境升级）
│   ├── 000_create_schemas.sql ~ 013_login-log.sql  # 早期序号制迁移（14个）
│   ├── 20260716000001_*.sql ~ 20261007000030_*.sql  # 时间戳制迁移（持续新增）
│   └── README.md             # 迁移目录治理说明（前缀由来/命名新规/历史遗留注释）
├── init/                     # 全新环境一键初始化（开发环境）
│   ├── 01_rebuild_database.sql
│   ├── 02_create_plugin_tables.sql
│   ├── 03_init_permissions.sql
│   ├── 04_create_scm_wms_srm_tables.sql
│   ├── 05_mobile_init.sql
│   ├── 06_create_shared_schema.sql
│   └── README.md             # 详细重建指南
├── postgres/                 # 运维/性能优化脚本（不纳入迁移流程）
│   ├── init.sql              # [已收敛] 说明文件——业务表已迁入 20260907000001
│   ├── 02_create_performance_indexes.sql
│   ├── 03_api_performance_indexes.sql
│   ├── administration_tables.sql  # [已收敛] 说明文件——业务表已迁入 20260907000001
│   ├── rls_remaining_tables.sql
│   └── partitions/           # 表分区脚本
└── test/                     # 测试数据
    └── iam_test_data.sql
```

## 三者关系与使用场景

| 目录 | 定位 | 使用场景 | 执行方式 |
|------|------|---------|---------|
| **migrations/** | 增量迁移 | 生产环境数据库升级、已有数据库增量更新 | `sqlx migrate run` 或 `cargo run -p topems-unified-core -- migrate` |
| **init/** | 全新初始化 | 开发环境从零搭建数据库（包含所有 schema + 种子数据） | `psql -f database/init/01_*.sql` 依次执行 |
| **postgres/** | 运维优化 | 性能调优、RLS 策略、表分区（按需手动执行） | `psql -f database/postgres/xxx.sql` 手动执行 |

**关键原则**：
- **生产环境**：只用 `migrations/`，禁止直接执行 `init/`（会删数据）
- **开发环境**：可用 `init/` 快速重建，也可用 `migrations/` 增量升级
- **postgres/**：不纳入迁移流程，由 DBA 或运维按需手动执行；其中业务表 DDL（曾存于 init.sql / administration_tables.sql）已于 2026-09-07 收敛至迁移 `20260907000001`，此两文件仅保留说明
- **应用自建表已固化**（2026-09-26）：ehs/lims 此前在 Rust `init_database()` 内建表、迁移链未覆盖，集成测试在全新环境会因缺表失败；现由迁移 `20260926120000_app_schema_tables.sql` 固化（ehs 43 + lims 37 + mes 32 表，全 `IF NOT EXISTS` 幂等），全新环境执行一次迁移即可一键建全。`scripts/topems.sh test-backend` 已前置 `db_migrate`，测试 setup 另有 `init_database` 兜底

## 迁移命名规范

### 历史演变

| 阶段 | 命名格式 | 数量 | 时间范围 |
|------|---------|------|---------|
| 早期 | `{序号}_{描述}.sql`（如 `000_create_schemas.sql`） | 14个 | 项目初期 ~ 2026-07-14 |
| 当前 | `{YYYYMMDDHHMMSS}_{描述}.sql`（如 `20260716000001_create_positions_table.sql`） | 原文记 264个 | 2026-07-16 ~ 至今（原文记合计 278 个——⚠️ 2026-10-02 实测 **283 个**，口径过时） |

> ⚠️ **2026-10-02 校准（F-65 / XCUT-11）**：实测 `migrations/` = **283 个 .sql**；`checksums.txt` 登记约 **250+ 条**（实测 253 行）。两者差值（约 30 个迁移未登记 checksum）使漂移检测存在盲区——待补登记或纳入 CI 校验。

### 新迁移规范

**所有新迁移统一使用时间戳制**：

```bash
# 格式: YYYYMMDDHHMMSS_描述.sql
# 示例:
20260828120000_add_new_feature_table.sql
```

**命名要求**：
1. 时间戳精确到秒，避免冲突
2. 描述用小写下划线分隔
3. 一个迁移只做一件事（单一职责）
4. 禁止修改已应用的历史迁移（包括序号制的 000-013）

### 迁移内容规范（单一职责强化，V531）

- **单一职责判定**：一个迁移只包含一个可独立描述的变更（新增/修改一张表、或一组强耦合的同主题表、或一次数据回填）；禁止"顺手"夹带无关表、索引或数据变更。
- **表数量参考上限**：单个业务迁移新增表 ≤ 5 张；超限（如历史 rehome 类一次移动 140+ 表）必须拆分为多个迁移并按依赖排序。
- **幂等性**：面向生产升级的迁移应尽量使用 `IF NOT EXISTS` / `IF EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS`，保证存量库重复执行安全。
- **业务表唯一来源**：业务表 DDL 一律通过 `migrations/` 创建（2026-09-07 起收敛）；`database/postgres/` 下禁止再添加业务表定义。

### 为什么用时间戳制

- 多分支并行开发时不会产生序号冲突
- 从文件名即可看出迁移的创建时间
- 与 sqlx、diesel 等主流迁移工具默认格式一致

## SQLx 离线缓存

项目根目录 `.sqlx/` 存放 SQLx 离线查询缓存（424个文件，约 1.2MB），用于 CI 环境无数据库时的编译检查。

```bash
# 刷新缓存（需要本地数据库在线）
make sqlx-prepare

# 仅校验缓存一致性（CI 使用）
make sqlx-check

# 离线编译测试
make sqlx-offline-test
```

## 空库建库标准流程（B14 固化，2026-10-08）

> 用户定案（B14）：空库守卫**维持脚本层**，不重构迁移链。本节为新建空库（验证库/CI 空库/5433 双库验证实例）建库的标准三步流程，任何人在全新空库上验证迁移链时**必须按此顺序执行**。

### 三步标准流程

```bash
# 0) 前置：准备一个全新空库（本例用官方 5433 Homebrew 验证实例，见
#    docs/database/database-primary-instance.md §6；连接串按目标库替换）
export MIGRATE_URL="postgres://topems:topems_secret@127.0.0.1:5433/topems"

# 1) 空库守卫：纯链全量验证（探活 → sqlx migrate run → 断言账本记录数 = 迁移文件数）
#    脚本已降级为"纯链验证"——不再补列兜底；失败即真实迁移链缺陷，须修迁移文件而非掩盖。
MIGRATE_URL="$MIGRATE_URL" bash scripts/ensure-empty-db-prereqs.sh

# 2) （守卫脚本内部已执行 sqlx migrate run；此处仅为显式说明，勿重复跑）
#    sqlx migrate run --source database/migrations

# 3) 三方核对：磁盘迁移文件 ↔ database/checksums.txt ↔ _sqlx_migrations 账本
#    （即 checksums 核对；B4 修复的 validate.sh 根因：grep 无匹配在 set -euo pipefail 下崩溃）
bash scripts/migration/validate.sh
```

| 步骤 | 脚本 | 作用 |
|------|------|------|
| ① 守卫 | `scripts/ensure-empty-db-prereqs.sh`（`MIGRATE_URL`） | 探活 + 全量应用 `database/migrations/` 顶层迁移链，断言 0 错误、`_sqlx_migrations` 全 success=true、记录数=迁移文件数 |
| ② 迁移 | `sqlx migrate run`（由守卫内部执行） | 全新空库从零全量建链 |
| ③ 三方核对 | `scripts/migration/validate.sh`（读 `database/checksums.txt`） | 文件名/顺序/幂等/down/**checksums** 校验；Checksum errors 须为 0 |

> 关联脚本：`scripts/migrate-verify-empty.sh`（`DATABASE_URL`，DROP/CREATE 验证库后全量重放并清理）用于"全新空库防遗留依赖"的强验证，与守卫互补——守卫在指定空库上跑，verify 脚本自建自毁临时库。

### CI 挂载建议（登记项）

- 现有 CI `migration-test` job（`ci.yml`，migration 路径变更触发）已做 up-down-up 幂等测试；**建议后续将空库守卫 `scripts/ensure-empty-db-prereqs.sh` 挂为 CI 空库验证步骤**（起一个一次性 Postgres 服务容器 → `MIGRATE_URL=... bash scripts/ensure-empty-db-prereqs.sh` → `scripts/migration/validate.sh`），把本地 5433 空库守卫固化为 CI 门禁。当前为文档建议，未接线（接线属 CI 变更，另批评估）。

### 评估点登记（未来窗口再评估）

- **守卫脚本层 vs 重构迁移链**（B14 重构级评估）：用户定案**当前维持脚本层**（守卫脚本 + validate.sh 三方核对）。登记——**未来一次性迁移基线重建窗口（大版本重构/迁移链重写）再评估**是否将守卫逻辑内迁进迁移链本身，届时可一并裁决"脚本层守卫"是否仍为最佳形态。本窗口到来前不做重构。

## 相关文档

- [init/README.md](init/README.md) — 数据库重建详细步骤
- [config/services.yaml](../config/services.yaml) — 服务端口与 schema 配置
- 根目录 `.env.example` — 数据库连接配置示例
- [database-primary-instance.md](../docs/database/database-primary-instance.md) — 实例口径与 5433 官方双库验证实例（§6）
- [database-half-migration-ops.md](../docs/database/database-half-migration-ops.md) — 生产主库半迁移运维模式
