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
