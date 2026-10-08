# PostgreSQL 生产库原生迁移记录（2026-10-08）

## 背景

- 生产库原运行于 Docker Desktop 容器 `topems-postgres`（pgvector/pgvector:pg18，端口 5433）
- Docker daemon 长期僵死（API 无响应，磁盘 58% 正常时仍不可用），容器无法管理——若 postgres 崩溃无法自动拉起
- 容器方案替代品评估：Colima 不可行（VZ entitlement 缺失 + qemu HVF `HV_NO_DEVICE`/VGIC 创建失败）
- 决策：生产库独立化——迁移至原生 PostgreSQL（brew postgresql@17），摆脱 Docker runtime 依赖

## 迁移结果

| 项 | 原（容器） | 现（原生） |
|---|---|---|
| PostgreSQL | 18.4 (Homebrew) | 17.x（brew postgresql@17） |
| 端口 | 5433 | **5432**（PG 默认） |
| 连接 | `localhost:5433/topems` | `localhost:5432/topems` |
| 用户/密码 | topems/topems | topems/topems（SUPERUSER） |
| 数据 | 231 表 / 850 权限 / 56MB | 231 表 / 850 权限 ✓ 一致 |
| 扩展 | uuid-ossp@1.1, vector@0.8.2 | uuid-ossp, vector, pg_trgm ✓ |

## 执行步骤

1. `brew install postgresql@17 pgvector`（brew 沙箱已禁用——见下）
2. `brew services start postgresql@17`（开机自启）
3. 建用户/库：`CREATE USER topems WITH PASSWORD 'topems' SUPERUSER; CREATE DATABASE topems OWNER topems;`
4. 全量备份容器库：`pg_dump -h localhost -p 5433 -U topems topems > topems_migration_backup_20261008_HHMMSS.sql`
5. 恢复：`psql -h localhost -p 5432 -U topems -d topems < 备份文件`
6. 验证：表数/权限数/用户数/扩展 全量对比一致

## 应用连接切换

- 所有应用/脚本的数据库连接从 `5433`（容器）改为 `5432`（原生）
- 部署脚本默认值：`scripts/deploy/rollback.sh` 等使用 `PGPORT` 环境变量（默认 5433），迁移后需传 `PGPORT=5432` 或调整默认
- 迁移文件与 `sqlx` 缓存不受影响（同库同 schema）

## 容器后续

- `topems-postgres` 容器**未删除**（数据源已复制，不再承载新数据）——Docker daemon 僵死无法管理，待 daemon 恢复后确认再停
- 备份文件：`/Users/xingzhai/topems_migration_backup_20261008_*.sql`（生产全量，双重保障）

## 附：brew 沙箱禁用（EPERM 修复）

- 根因：macOS 26 seatbelt 回归——`file-write-unlink` 不在 `file-write*` 通配内；无 filter allow 必须置于所有 deny（含 `(debug deny)`）之前，且 rmdir 拦截不在该 allow 覆盖语义内
- 方案：`/opt/homebrew/Library/Homebrew/extend/os/mac/sandbox.rb` 中 `Sandbox.available?` 改为返回 `false`（用户确认禁用）
- 影响：brew 安装不再沙箱隔离（官方源安装风险可控）；`brew update` 会覆盖此修改，需重做时按上述定位恢复
