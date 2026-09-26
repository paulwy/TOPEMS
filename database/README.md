# TOPEMS 数据库

## 目录结构

```
database/
├── README.md                 # 本文档
├── checksums.txt             # 迁移校验和
├── migrations/               # 增量迁移（生产环境升级）
│   ├── 000_create_schemas.sql ~ 013_login-log.sql  # 早期序号制迁移（14个）
│   ├── 20260716000001_*.sql ~ 20260926120000_*.sql  # 时间戳制迁移（264个，持续新增；合计 278）
│   └── .snippets/            # 迁移代码片段模板
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
| 当前 | `{YYYYMMDDHHMMSS}_{描述}.sql`（如 `20260716000001_create_positions_table.sql`） | 264个 | 2026-07-16 ~ 至今（合计 278 个，含早期 14 个） |

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

## 相关文档

- [init/README.md](init/README.md) — 数据库重建详细步骤
- [config/services.yaml](../config/services.yaml) — 服务端口与 schema 配置
- 根目录 `.env.example` — 数据库连接配置示例
