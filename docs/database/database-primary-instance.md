# 数据库主库口径与实例治理（2026-09-22 收口）

> **2026-11-13 生产库指纹更正**：实际生产库在 xingzhai 生产机，库名 **`topems_prod`**（`ehs` schema **71** 表；`_sqlx_migrations` **667** 条 success、0 失败、无重复，max `20261112190000`，统计时点 2026-11-13）。本机旧库 **`topems`**（`ehs` **65** 表）**不是生产**。本文 §1/§6/§7 中把 5432 `topems` 标为"生产"的表述是 2026-10 的本机历史口径，已按此更正；开发/验证仍可用 `topems`，但不得当作生产。

> 本文档定义 TOPEMS 本地开发与 docker 部署两套 PostgreSQL 实例的口径关系、版本一致性要求与日常操作约定。
> 背景：2026-09-01 起宿主机 5432 被 Homebrew postgres 占用，postgres 容器改映射 5433；两套实例长期并存，
> 需明确"哪个是主、如何保持一致、何时用哪个"。

> **更新（2026-11-02）**：**5433 Homebrew 验证实例已恢复**——2026-10-16 标注误判，数据目录实为 `/opt/homebrew/var/postgresql@18_5433`（完整存在，PG_VERSION=18），实例已 pg_ctl 启动、迁移链空库重放至 540/540、RLS 回归与双库一致性核销，相关小节已就地更新。另：§7.1 所述**开发库 `topems_dev` 亦不存在**——本机仅存 `topems` / `topems_prepare` / `postgres`。

## 1. 实例口径（唯一权威）

| 实例 | 端口 | 运行方式 | 角色 | 连接凭据来源 | 用途 |
|---|---|---|---|---|---|
| **开发主库（brew）** | `5432` | Homebrew postgres（宿主机） | **本地开发/验证主库** | `.env` 的 `DATABASE_URL` / `MIGRATE_URL` | 日常开发、单测、租户隔离/RLS 验证、数据手工排查 |
| **部署库（docker）** | `5433`（容器内 `5432`） | `docker compose up`（topems-postgres） | **部署运行库**（历史，2026-10-08 已弃，见 §7） | `deploy/docker/.env` 的 `POSTGRES_PORT`；服务容器内一律用 `postgres:5432` | docker-compose 部署、CI/预发布环境（历史） |

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
| 本机 psql（旧库，**非生产**） | `PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5432 -U topems -d topems` |
| 生产 psql（xingzhai 本机） | `psql -h /tmp -U xingzhai -d topems_prod`（库 `topems_prod`，本机 unix socket；退役远端 `.115` 目标已摘除） |
| 验证库 psql（5433） | `PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5433 -U topems -d topems`（迁移链重放/账本核对，见 §6）✅ **2026-11-02 起该实例已恢复**（数据目录 `/opt/homebrew/var/postgresql@18_5433`），可直接连接 |
| 迁移执行（本机旧库/开发） | `DATABASE_URL=postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems sqlx migrate run`（本机旧库，**非生产**；原 `topems_dev` 同 5432 库覆盖的做法已失效） |
| 迁移执行（生产） | 在 xingzhai 机以 `DATABASE_URL=postgres://topems_prod:***@localhost:5432/topems_prod` 执行；当前账本 667 条 success、max `20261112190000`（2026-11-13 实测） |
| 一致性检查 | `bash scripts/db/check-consistency.sh` |

## 5. 相关文件

- `.env`：`DATABASE_URL`/`MIGRATE_URL` → 5432（开发主库）；`POSTGRES_PORT=5433`（docker 映射说明见注释）。
- `deploy/docker/.env`：`POSTGRES_PORT=5433`；`deploy/docker/docker-compose.yml` 容器内 `postgres:5432`。
- `deploy/docker/README.md`：部署形态说明（宿主 5433 ↔ 容器 5432）。

---

## 6. 5433 Homebrew 官方双库验证实例（A2 定案，2026-10-08）

> 用户定案（A2）：**弃 docker 口径**。5433 端口上的官方双库验证实例改用 **Homebrew PostgreSQL**（非 docker 容器），作为与 5432 开发主库配对的"第二库"，专用于迁移链空库重放 / 双库账本核对 / RLS 隔离回归。本节为该实例的运维权威口径，**与上文 §1 表格中"5433=docker 部署库"的历史映射不冲突**：§1 描述的是 docker-compose 部署形态下的宿主映射；本节固化的是本地开发/验证口径下 5433 的实际承载者。

> **现状更新（2026-11-02）**：该实例**已恢复**——数据目录 `/opt/homebrew/var/postgresql@18_5433` 完整存在（2026-10-16 标注的 `postgres5433` 路径实为误记），pg_ctl 直接启动成功；topems 库按 §6.3 流程重建（drop → create → 迁移链空库重放 540/540）。**注意**：空库重放存在迁移链漂移——20261102220000 引用的 `iam.tenant_permissions`（20260825/27 无前缀 CREATE 落 public）与 `lims.qa_lab_*`/`plugin_erp.accounting_subjects`（重放落 public/finance/plugin_finance）需对齐 test 结构后重放，相关修复步骤见下。

### 6.1 实例方案（唯一权威）

| 项 | 值 |
|---|---|
| 软件版本 | **PostgreSQL 18.4（Homebrew）**（`/opt/homebrew/opt/postgresql@18`） |
| 数据目录 | `/opt/homebrew/var/postgresql@18_5433`（postgresql@18 版本实例，独立于 brew 默认 5432 实例；2026-10-16 标注的 `postgres5433` 为误记） |
| 监听端口 | `5433`（`postgresql.conf`：`port=5433`，`listen_addresses='localhost'`） |
| 启停方式 | `pg_ctl`（**不**用 Docker / brew services）：见 6.3 |
| 认证 | **trust**（`pg_hba.conf`：local / 127.0.0.1 / ::1 全部 trust；仅本机回环） |
| 角色 | `topems` / 密码 `<TOPEMS_PG_PASSWORD>` |
| 数据库 | `topems` |
| 连接串 | `MIGRATE_URL=postgres://topems:<TOPEMS_PG_PASSWORD>@127.0.0.1:5433/topems` |
| 用途 | 双库验证（与 5432 配对）：空库守卫重放、`_sqlx_migrations` 双账本核对、RLS/租户隔离回归 |
| 运行策略 | 保留运行（常驻，供随批验证复用）→ **2026-11-02 已恢复**：pg_ctl 启动 + 空库重放 540/540，RLS 回归核销；日常停启用 §6.2 |

> 实测基线（2026-10-08）：`_sqlx_migrations` = **329** 条，与磁盘迁移文件数、5432 开发主库 public 账本三者一致（checksum 0 漂移）。

### 6.2 与 docker 口径的关系（为什么弃 docker）

- **Docker Desktop 特权 helper 阻塞不可用**：本机 5433 上的 docker-postgres 路径因 Docker Desktop 特权 helper（privileged helper）环境问题无法稳定拉起/维护，不能作为可重复的验证实例。
- **Homebrew 为等价替代**：Homebrew 5433 实例在功能上等价承载"第二验证库"——迁移链重放结果、账本核对、RLS 断言均与底层是 docker 还是 Homebrew **无关**（同一套 `database/migrations/`、同一个 sqlx 账本口径）。
- **结论**：本地双库验证一律走 Homebrew 5433；不再要求/验证 docker-postgres 5433。**迁移链重放结果与 docker 口径无关**。

### 6.3 启停 / 重放 / 核对命令速查

```bash
# --- 启停（pg_ctl；数据目录 /opt/homebrew/var/postgresql@18_5433）---
# ✅ 2026-11-02：实例已恢复，以下命令可直接使用（postmaster PID 52867 时已启动，勿重复 start）
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /opt/homebrew/var/postgresql@18_5433 -l /opt/homebrew/var/postgresql@18_5433/server.log start   # 启动
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /opt/homebrew/var/postgresql@18_5433 stop -m fast                                     # 停止（快速）
pg_ctl -D /opt/homebrew/var/postgres5433 status                                             # 状态

# --- 连接 ---
psql "postgres://topems:<TOPEMS_PG_PASSWORD>@127.0.0.1:5433/topems"

# --- 空库守卫 + 全量重放（标准三步，详见 database/README.md「空库建库标准流程」）---
MIGRATE_URL="postgres://topems:<TOPEMS_PG_PASSWORD>@127.0.0.1:5433/topems" bash scripts/ensure-empty-db-prereqs.sh
bash scripts/migration/validate.sh        # 三方核对（checksums）

# --- 强验证（自建自毁临时库，防迁移链依赖线上遗留对象）---
DATABASE_URL="postgres://topems:<TOPEMS_PG_PASSWORD>@127.0.0.1:5433/topems_verify" bash scripts/migrate-verify-empty.sh

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
- `docs/database/database-half-migration-ops.md` — 旧库半迁移运维模式（历史口径）
- `scripts/ensure-empty-db-prereqs.sh` / `scripts/migrate-verify-empty.sh` / `scripts/migration/validate.sh` / `scripts/db/check-consistency.sh`

---

## 7. 生产库独立化与纯净分离（2026-10-08 定案）

> 用户定案：生产库脱离 Docker——5433 数据迁移至 5432，并**纯净分离**为生产/开发双库。
> 本节是**当前唯一权威口径**，取代 §1 中"部署库（docker）5433"与 §6 中"5433 部署数据"的历史描述。

### 7.1 双库方案（唯一权威）

| 库 | 端口 | 运行方式 | 角色 | 数据基线 |
|---|---|---|---|---|
| **生产库 `topems_prod`**（xingzhai 生产机） | `5432` | Homebrew PostgreSQL **18.4** | **生产权威库** | `ehs` 71 表；`_sqlx_migrations` 667 success、max `20261112190000`（2026-11-13 实测） |
| **旧库 `topems`**（本机 xingzhai 开发/历史） | `5432` | Homebrew PostgreSQL 18.4 | 历史/开发库，**非生产** | `ehs` 65 表（2026-11-13 实测） |
| ~~**开发库 `topems_dev`**~~ | `5432` | 同实例 | 开发/验证基线 | **2026-10-16 核实：该库已不存在**；原基线 235 表 / 955 权限（含 4 个开发独有 public 表 + 19 个模块表 + 开发数据）需从 `backups/topems_pre_clean_20261008.sql` 重建（该 dump 亦缺失，见 §7.4） |
| **验证库 `topems`（5433）** | `5433` | Homebrew PostgreSQL 18.4（`/opt/homebrew/var/postgres5433`）——**2026-10-16 起实例已不存在**（数据目录缺失、端口无监听） | 迁移链重放 / 双库账本核对（§6） | 与生产一致（数据已复制）；复用需重建 |

### 7.2 迁移过程与纯净分离

1. **迁移**：5433 全量 `pg_dump` → 恢复至 5432（目标库 `topems` 已存在——开发主库）
2. **合流缺陷（已修复）**：恢复时目标库非空 + psql/pg_restore 未核验目标库空态 → 18 表数据合并（core_permissions 850→955 等）+ 部分表定义以开发库为准（如 `ai_settings.default_model` text vs varchar）
3. **纯净分离（本定案）**：
   - 备份合并库 → `DROP DATABASE topems` → 重建 → 从 5433 纯净 dump 恢复 → **生产库纯净**
   - 合并库备份恢复至新建 `topems_dev` → **开发基线完整保留**
4. **验证**：生产 231/850/1 与 5433 一致；开发 235/955 含全部开发结构

### 7.3 连接口径（应用/脚本）

- **生产/部署（xingzhai 机）**：`postgres://topems_prod:***@localhost:5432/topems_prod`（口令在 launchd plist 环境变量，禁止明文落盘/入库）
- **本机历史/开发（xingzhai）**：`postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems`（旧库，`ehs` 65 表，**非生产**）
- **开发**：`postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems_dev`（`DATABASE_URL` 覆盖；topems_app 已授权）⚠️ **2026-10-16 核实 `topems_dev` 不存在**，该口径当前不可用；且本机 `.env.local` 的 `DATABASE_URL` 仍指向已消失的 **5433**，使用前须改为 5432 的 `topems` 或重建 `topems_dev`
- **5433 验证库**：仅迁移链重放/账本核对（§6 命令），不承载应用；**2026-10-16 起该实例已不存在，执行前须先重建（§6.3）**

### 7.4 备份资产（2026-10-08，统一存放 `backups/`）

- `backups/topems_migration_backup_20261008_080512.sql`（5433 原全量，迁移时）
- `backups/topems_container_clean_20261008.sql`（5433 纯净，分离时）
- `backups/topems_pre_clean_20261008.sql`（合并库全量 = 开发基线来源）

> ⚠️ **现状（2026-10-16）**：本机 `backups/` 目录不存在，上述三份 dump 资产已缺失 → 5433 重建**不能**依赖 dump 恢复，只能走迁移链空库重放（§6.3）。

### 7.5 Docker 容器处置

- `topems-postgres` 容器**已弃**（数据已原生化，5433 由 Homebrew 实例承载）
- Docker daemon 僵死无法操作容器；待恢复后清理模拟容器（`topems-prod-sim` / `topems-sim:systemd`）
- 容器策略详见 `docs/deploy/container-strategy.md`
