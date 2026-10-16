# PostgreSQL 生产库原生迁移记录（2026-10-08）

> **更新（2026-10-16）**：本文档「最终双库 / 应用连接切换 / 5433 后续 / 备份资产」四处描述已过时——5433 Homebrew 验证实例（数据目录 `/opt/homebrew/var/postgres5433`）**已不存在**（全盘无该目录、端口无监听）；`backups/` 目录及三份 dump **亦缺失**；`topems_dev`（开发基线）**亦不存在**。口径以 `docs/database/database-primary-instance.md` 顶部更新块为准。

## 背景

- 生产数据原运行于 Docker 容器 `topems-postgres`（pgvector/pgvector:pg18，宿主映射 5433）
- Docker daemon 长期僵死（API 无响应），容器无法管理——若数据实例崩溃无法自动拉起
- 容器方案替代品评估：Colima 不可行（VZ entitlement 缺失 + qemu HVF `HV_NO_DEVICE`/VGIC 创建失败）
- 后续确认：5433 实际由 Homebrew PostgreSQL **18.4** 实例承载（`/opt/homebrew/var/postgres5433`，A2 定案），非容器进程
- 决策：生产库独立化——迁移至 Homebrew PostgreSQL（5432），摆脱 Docker runtime 依赖

## 迁移结果（最终）

| 项 | 原（5433） | 现（5432 生产） |
|---|---|---|
| PostgreSQL | 18.4 (Homebrew) | **18.4 (Homebrew)**（`/opt/homebrew/opt/postgresql@18`） |
| 端口 | 5433 | **5432** |
| 连接 | `localhost:5433/topems` | `localhost:5432/topems` |
| 数据 | 231 表 / 850 权限 / 1 用户 | **231 表 / 850 权限 / 1 用户 ✓ 全量一致** |
| 扩展 | uuid-ossp, vector | uuid-ossp, vector（+pg_trgm）✓ |

## 执行步骤

1. `brew install postgresql@18`（既有实例，5432 已在服务）
2. 建用户/库：`CREATE USER topems WITH PASSWORD 'topems' SUPERUSER;`（`topems` 库已存在则复用）
3. 全量备份 5433：`pg_dump -h localhost -p 5433 -U topems topems > topems_migration_backup_20261008_080512.sql`
4. 恢复至 5432：`psql -h localhost -p 5432 -U topems -d topems < 备份`
5. **发现合流缺陷**（见下）→ 纯净分离（见下）
6. 验证：表数/权限数/用户数/扩展 全量对比一致

## ⚠️ 合流缺陷与修复（纯净分离）

**缺陷**：迁移目标库 `topems`（5432）非空（开发主库），恢复时无 `ON_ERROR_STOP`、未核验目标库空态 →
表已存在静默跳过 → **数据合流**：

- 18 表数据合并：容器空表保留开发数据（audit_logs 181、core_tenants 223、core_sessions 124 等）+ 核心表追加
  （core_permissions 850→955、core_roles 13→18、core_role_permissions 642→2643）
- 部分表定义以开发库为准（`ai_settings.default_model`: text vs character varying）

**修复（纯净分离，用户定案 A）**：

1. 备份合并库全量（`topems_pre_clean_20261008.sql`，4.3MB）
2. `DROP DATABASE topems` → 重建 → 从 5433 纯净 dump（`topems_container_clean_20261008.sql`）恢复
3. 合并库备份恢复至新建 **`topems_dev`**（开发基线完整保留）

**最终双库**：

| 库 | 数据 | 角色 |
|---|---|---|
| `topems`（5432） | 231 表 / 850 权限 / 1 用户（纯净 = 5433） | **生产权威库** |
| ~~`topems_dev`（5432）~~ | 原 235 表 / 955 权限（+4 个开发独有 public 表、19 个模块表、开发数据） | 开发基线 —— **2026-10-16 核实该库已不存在** |

## 应用连接切换

- 生产/部署：`localhost:5432/topems`（脚本 PGPORT 默认已 5432；rollback.sh/upgrade-runtime.sh 已调整）
- 开发：`localhost:5432/topems_dev`（`DATABASE_URL` 覆盖；topems_app 已授权 ALL）⚠️ **2026-10-16 核实 `topems_dev` 不存在**，该口径不可用；且本机 `.env.local` 的 `DATABASE_URL` 仍指向已消失的 **5433**，使用前须改指 5432 的 `topems` 或重建 `topems_dev`

## 5433 后续

- ~~5433 为 Homebrew 验证实例（数据目录 `/opt/homebrew/var/postgres5433`），保留作迁移链重放/双库账本核对（见
  `docs/database/database-primary-instance.md` §6）~~ → **2026-10-16 核实：该实例已不存在**（数据目录缺失、5433 无监听）；如需复用须按 `database-primary-instance.md` §6.3 重建（`initdb` + 迁移链重放）
- 容器 `topems-postgres` 已弃（无容器进程在服务 5433）；Docker daemon 恢复后清理模拟容器

## 备份资产

- `backups/topems_migration_backup_20261008_080512.sql`（5433 原全量）
- `backups/topems_container_clean_20261008.sql`（5433 纯净 dump）
- `backups/topems_pre_clean_20261008.sql`（合并库全量 = topems_dev 开发基线来源）

> ⚠️ **现状（2026-10-16）**：本机 `backups/` 目录不存在，上述三份 dump 已缺失 → 5433 / `topems_dev` 重建**不能**依赖 dump 恢复。
>
> 备份统一存放于仓库 `backups/`（已 gitignore，不入库）；清理策略见 §标准恢复流程。

### 备份有效性验证（2026-10-08）

| 备份 | 格式 | 对象数 | 恢复方式 | 状态 |
|---|---|---|---|---|
| `topems_container_clean_20261008.sql` | custom（-Fc） | 1275 表数据对象 | `pg_restore --list` ✓ / `pg_restore -d` | ✅ 有效 |
| `topems_pre_clean_20261008.sql` | custom（-Fc） | 1294 表数据对象 | `pg_restore --list` ✓ / `pg_restore -d` | ✅ 有效 |
| `topems_migration_backup_20261008_080512.sql` | plain SQL | 68208 行 | `psql -f` 直读 | ✅ 有效 |

> 建议：备份后立即用 `pg_restore --list`（custom）或 `wc -l`/抽样（plain）验证可读性；重要变更前重做备份。

## 标准恢复/迁移流程（规范，2026-10-08 固化）

> 本次合流缺陷的根因教训：恢复目标非空 + 无 `ON_ERROR_STOP` → 数据静默合流。
> 以下为**所有迁移/恢复操作的强制规范**。

### 规范（硬约束）

1. **目标库空态核验**：恢复前必须确认目标库为空（无表/无数据），否则 `DROP` 重建或改恢复至新库
2. **ON_ERROR_STOP 强制**：psql 一律加 `-v ON_ERROR_STOP=1`；pg_restore 必须检查退出码（非 0 = 失败）
3. **先备份后动库**：任何 DROP/重建前，先 pg_dump 全量（-Fc 自定义格式）
4. **版本工具匹配**：pg_dump/pg_restore 版本 ≥ 目标 server 版本（低版本客户端会拒绝高版本 server）
5. **恢复后验证**：表数/关键表行数/扩展 三方核对（本记录 §迁移结果）

### 命令模板（可直接复制）

```bash
export PGPASSWORD=<口令>
PG18=/opt/homebrew/opt/postgresql@18/bin

# 1) 备份现有库（防丢失）
$PG18/pg_dump -h localhost -p 5432 -U topems -d topems -Fc -f backups/pre_$(date +%Y%m%d_%H%M%S).sql

# 2) 目标库空态核验（有表则 DROP 重建）
$PG18/psql -h localhost -p 5432 -U topems -d postgres -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='core_permissions';"

# 3) DROP + 重建（确认备份完成后）
$PG18/psql -h localhost -p 5432 -U topems -d postgres -c "DROP DATABASE IF EXISTS topems;"
$PG18/psql -h localhost -p 5432 -U topems -d postgres -c "CREATE DATABASE topems OWNER topems;"

# 4) 恢复（检查退出码，非 0 立即停）
$PG18/pg_restore -h localhost -p 5432 -U topems -d topems --no-owner backups/xxx.sql
RC=$?; [ $RC -ne 0 ] && echo "恢复失败 (RC=$RC)" && exit 1

# 5) 验证
$PG18/psql -h localhost -p 5432 -U topems -d topems -At -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
$PG18/psql -h localhost -p 5432 -U topems -d topems -At -c "SELECT count(*) FROM core_permissions;"
```

## 附：brew 沙箱禁用（EPERM 修复）

- 根因：macOS 26 seatbelt 回归——`file-write-unlink` 不在 `file-write*` 通配内；无 filter allow 必须置于所有 deny（含 `(debug deny)`）之前，且 rmdir 拦截不在该 allow 覆盖语义内
- 方案：`/opt/homebrew/Library/Homebrew/extend/os/mac/sandbox.rb` 中 `Sandbox.available?` 改为返回 `false`（用户确认禁用）
- 影响：brew 安装不再沙箱隔离；`brew update` 会覆盖此修改，需重做时按上述定位恢复
