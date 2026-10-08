# 数据库主库口径与实例治理（2026-09-22 收口）

> 本文档定义 TOPEMS 本地开发与 docker 部署两套 PostgreSQL 实例的口径关系、版本一致性要求与日常操作约定。
> 背景：2026-09-01 起宿主机 5432 被 Homebrew postgres 占用，postgres 容器改映射 5433；两套实例长期并存，
> 需明确"哪个是主、如何保持一致、何时用哪个"。

## 1. 实例口径（唯一权威）

| 实例 | 端口 | 运行方式 | 角色 | 连接凭据来源 | 用途 |
|---|---|---|---|---|---|
| **开发主库（brew）** | `5432` | Homebrew postgres（宿主机） | **本地开发/验证主库** | `.env` 的 `DATABASE_URL` / `MIGRATE_URL` | 日常开发、单测、租户隔离/RLS 验证、数据手工排查 |
| **部署库（docker）** | `5433`（容器内 `5432`） | `docker compose up`（topems-postgres） | **部署运行库** | `deploy/docker/.env` 的 `POSTGRES_PORT`；服务容器内一律用 `postgres:5432` | docker-compose 部署、CI/预发布环境 |

**一句话口径**：本地开发与验证一律走 `5432`（.env 指向）；`5433` 是 docker 部署形态的宿主映射端口，
服务容器内连接字符串仍是 `postgres:5432`，**不要把 5433 当作"第二版本数据库"**。

## 2. 版本一致性（硬约束）

两库共用同一套 `migrations/` 迁移目录，`_sqlx_migrations` 表版本号必须一致。

- 当前基线：两库均停在 `20260921000101`（36 张 scm 表、suppliers 195 行、purchase_orders 65 行，数据规模一致）。
- 新增/修改 schema 迁移后，**两库都必须执行同一迁移**，否则视为"版本漂移"。
- 验证方法：`scripts/db/check-consistency.sh`（输出两库最新迁移版本号与差异清单）。

## 3. 数据一致性约定

- **权威数据**：开发期手工插入的验证数据以 `5432` 为准（租户隔离验证数据用完即删）。
- **部署库数据**：以迁移 + 应用层同步为准；两库数据规模应保持一致，出现差异时按"迁移先行、数据核对"处理。
- 禁止：把 5433 当作开发验证库、在两库分别插入不同口径的测试数据。

## 4. 日常操作对照

| 操作 | 命令 |
|---|---|
| 本地 psql（开发主库） | `PGPASSWORD=<MIGRATE_URL 中密码> psql -h localhost -p 5432 -U topems -d topems`（密码见 .env 的 MIGRATE_URL，不入库） |
| docker 内 psql（部署库） | `docker exec topems-postgres psql -U topems -d topems` |
| 迁移执行（本地） | `MIGRATE_URL=$(grep MIGRATE_URL .env \| cut -d= -f2-) sqlx migrate run`（直接复用 .env 中的 MIGRATE_URL） |
| 迁移执行（docker） | `docker exec topems-postgres bash -c '...'`（或部署流水线内置步骤） |
| 一致性检查 | `bash scripts/db/check-consistency.sh` |

## 5. 相关文件

- `.env`：`DATABASE_URL`/`MIGRATE_URL` → 5432（开发主库）；`POSTGRES_PORT=5433`（docker 映射说明见注释）。
- `deploy/docker/.env`：`POSTGRES_PORT=5433`；`deploy/docker/docker-compose.yml` 容器内 `postgres:5432`。
- `deploy/docker/README.md`：部署形态说明（宿主 5433 ↔ 容器 5432）。

---

## 6. 5433 Homebrew 官方双库验证实例（A2 定案，2026-10-08）

> 用户定案（A2）：**弃 docker 口径**。5433 端口上的官方双库验证实例改用 **Homebrew PostgreSQL**（非 docker 容器），作为与 5432 开发主库配对的"第二库"，专用于迁移链空库重放 / 双库账本核对 / RLS 隔离回归。本节为该实例的运维权威口径，**与上文 §1 表格中"5433=docker 部署库"的历史映射不冲突**：§1 描述的是 docker-compose 部署形态下的宿主映射；本节固化的是本地开发/验证口径下 5433 的实际承载者。

### 6.1 实例方案（唯一权威）

| 项 | 值 |
|---|---|
| 软件版本 | **PostgreSQL 18.4（Homebrew）**（`/opt/homebrew/opt/postgresql@18`） |
| 数据目录 | `/opt/homebrew/var/postgres5433`（独立于 brew 默认 5432 实例的数据目录） |
| 监听端口 | `5433`（`postgresql.conf`：`port=5433`，`listen_addresses='localhost'`） |
| 启停方式 | `pg_ctl`（**不**用 Docker / brew services）：见 6.3 |
| 认证 | **trust**（`pg_hba.conf`：local / 127.0.0.1 / ::1 全部 trust；仅本机回环） |
| 角色 | `topems` / 密码 `topems_secret` |
| 数据库 | `topems` |
| 连接串 | `MIGRATE_URL=postgres://topems:topems_secret@127.0.0.1:5433/topems` |
| 用途 | 双库验证（与 5432 配对）：空库守卫重放、`_sqlx_migrations` 双账本核对、RLS/租户隔离回归 |
| 运行策略 | **保留运行**（常驻，供随批验证复用；不随验证结束销毁） |

> 实测基线（2026-10-08）：`_sqlx_migrations` = **329** 条，与磁盘迁移文件数、5432 开发主库 public 账本三者一致（checksum 0 漂移）。

### 6.2 与 docker 口径的关系（为什么弃 docker）

- **Docker Desktop 特权 helper 阻塞不可用**：本机 5433 上的 docker-postgres 路径因 Docker Desktop 特权 helper（privileged helper）环境问题无法稳定拉起/维护，不能作为可重复的验证实例。
- **Homebrew 为等价替代**：Homebrew 5433 实例在功能上等价承载"第二验证库"——迁移链重放结果、账本核对、RLS 断言均与底层是 docker 还是 Homebrew **无关**（同一套 `database/migrations/`、同一个 sqlx 账本口径）。
- **结论**：本地双库验证一律走 Homebrew 5433；不再要求/验证 docker-postgres 5433。**迁移链重放结果与 docker 口径无关**。

### 6.3 启停 / 重放 / 核对命令速查

```bash
# --- 启停（pg_ctl；数据目录固定 /opt/homebrew/var/postgres5433）---
pg_ctl -D /opt/homebrew/var/postgres5433 -l /opt/homebrew/var/postgres5433/server.log start   # 启动
pg_ctl -D /opt/homebrew/var/postgres5433 stop -m fast                                       # 停止（快速）
pg_ctl -D /opt/homebrew/var/postgres5433 status                                             # 状态

# --- 连接 ---
psql "postgres://topems:topems_secret@127.0.0.1:5433/topems"

# --- 空库守卫 + 全量重放（标准三步，详见 database/README.md「空库建库标准流程」）---
MIGRATE_URL="postgres://topems:topems_secret@127.0.0.1:5433/topems" bash scripts/ensure-empty-db-prereqs.sh
bash scripts/migration/validate.sh        # 三方核对（checksums）

# --- 强验证（自建自毁临时库，防迁移链依赖线上遗留对象）---
DATABASE_URL="postgres://topems:topems_secret@127.0.0.1:5433/topems_verify" bash scripts/migrate-verify-empty.sh

# --- 双库账本一致性 ---
bash scripts/db/check-consistency.sh
```

| 脚本 | 路径 | 用途 |
|------|------|------|
| 空库守卫 | `scripts/ensure-empty-db-prereqs.sh`（`MIGRATE_URL`） | 指定空库纯链全量重放 + 账本断言 |
| 全量空库验证 | `scripts/migrate-verify-empty.sh`（`DATABASE_URL`） | DROP/CREATE 验证库 → 全量重放 → 清理 |
| checksums 三方核对 | `scripts/migration/validate.sh` | 磁盘文件 ↔ `database/checksums.txt` ↔ 账本 |
| 双库一致性 | `scripts/db/check-consistency.sh` | 5432 ↔ 5433 迁移版本差异清单 |

### 6.4 未来 docker 验证的边界

- **未来部署目标明确 docker 时，再在目标环境验证**：本节仅固化本地开发/验证口径。当生产/部署目标**明确**采用 docker-postgres 时，应在**该目标环境**（CI runner / 生产前置环境）实跑 docker 口径的迁移链与重放，不在本机 Homebrew 实例上替代验证。

### 6.5 相关文件

- `database/README.md` — 空库建库标准流程（B14 固化）
- `docs/database/database-half-migration-ops.md` — 生产主库半迁移运维模式
- `scripts/ensure-empty-db-prereqs.sh` / `scripts/migrate-verify-empty.sh` / `scripts/migration/validate.sh` / `scripts/db/check-consistency.sh`
