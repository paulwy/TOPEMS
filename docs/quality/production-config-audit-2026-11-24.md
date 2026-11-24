# TOPEMS 生产机配置审计（2026-11-24）

范围：仓库里所有会被生产部署读取的配置——`.env.production`、`config/env/.env.production.template`、`config/production.yaml.example`、`config/database.toml`、`deploy/docker/docker-compose.yml`、`deploy/docker/pgbouncer/pgbouncer.ini`、`deploy/k8s/base/*`、`scripts/deploy/start-production.sh`、`scripts/deploy/production-deploy.sh`。

## 结论先说

**编排层（compose）是合理的；环境变量层和部署脚本链路不合理，两者对“数据库怎么连”的约定互相矛盾。**

- compose 的姿势是对的：应用用 `topems_app` 非 owner 角色、经 PgBouncer（6432）、迁移才用 owner、密码强制注入（`${POSTGRES_PASSWORD:?...}`，无默认值）、健康检查齐全。
- 但 `start-production.sh` 读的 `.env.production` 是 `postgresql://topems:***@localhost:5432/topems`：**绕过了 PgBouncer、用 owner 角色、连 5432**。而 compose 把 Postgres 映射在 **5433**（5432 是本机 Homebrew Postgres）。也就是说按 `.env.production` 启动，很可能连到开发机自己的库，而不是容器里的生产库。

## 分层判定

| 层 | 判定 | 依据 |
|---|---|---|
| docker-compose 编排 | **合理** | 独立 postgres/pgbouncer/redis；`mem_limit`/`cpus` 有限制；app 角色与迁移角色分离；密码无默认值；depends_on + healthcheck |
| pgbouncer 配置 | **半合理（双源冲突）** | `pgbouncer.ini` 被挂载进容器（`default_pool_size=15`/`max_db_connections=150`），但 compose 又传 `PGBOUNCER_DEFAULT_POOL_SIZE=25`/`MAX_DB_CONNECTIONS=100`。两份值不一致，实际以哪份为准取决于镜像 entrypoint 行为——这是隐患，不是“多一层保险” |
| `.env.production` | **不合理** | DSN 绕 pgbouncer + owner 角色 + 5432；`DATABASE_MAX_CONNECTIONS=100`（单服务就能占满 Postgres 默认 `max_connections=100`，多服务必炸）；`CORS_ALLOWED_ORIGINS=https://your-domain.com` 是占位；`JWT/SESSION/Redis` 口令明文 |
| 分发模板 `.env.production.template` | **部分合理** | `max_connections=20` 比 live 文件克制，但同样是 owner + 5432 直连，没有 `MIGRATE_URL` 与 app 角色概念 |
| `config/database.toml` | **合理但不完整** | `[production] max_connections=50`、`timezone=UTC` 合理；但没有 SSL 相关键，与模板 `ssl_mode: disable` 一致地“假设同机” |
| k8s base | **不合理（未硬化）** | 只有 postgres/redis/rabbitmq 的 StatefulSet/资源限制，**无 securityContext**（`runAsNonRoot`、`readOnlyRootFilesystem`、drop capabilities）、无 PDB、无备份 sidecar；`replicas: 1` 单点 |
| 端口表 `config/ports.env` | **合理** | 与 `config/services.yaml` 对齐，注释标明生成日期；同端口 8000 被 CORE/IAM/DOC/FILE/FLOW 复用，在 compose 网络内是不同容器、无冲突 |

## 具体问题（按优先级）

**P0 — 会导致生产连错库 / 打满连接**
1. `.env.production` 的 `DATABASE_URL` 指 `localhost:5432`、用户 `topems`（owner）。与 compose 的 `postgres:5432`（容器内）+ 宿主 5433 + `topems_app` 完全错位。
2. `DATABASE_MAX_CONNECTIONS=100` × 多服务；Postgres 容器没显式设 `max_connections`（默认 100），PgBouncer 又被绕过，等于每服务独立直连。

**P1 — 会在上线当天暴露**
3. `CORS_ALLOWED_ORIGINS=https://your-domain.com` 占位：前端跨域会全挂；若有人图省事改成 `*`，则变成安全缺口。
4. `ssl_mode: disable` + `REDIS_URL` 明文口令 + `.env.production` 里 JWT/SESSION 明文。文件已被 `.gitignore` 忽略（`*.env.*`），但会随备份/打包/SCP 扩散。
5. PgBouncer 双源配置（ini vs compose env）不一致：15/150 与 25/100 两套，排障时会互相打脸。

**P2 — 可观测与可运维**
6. `LOG_LEVEL=info`（live）与模板 `error` 漂移；生产默认 info 会放大日志量。
7. `STORAGE_TYPE=local` + `/opt/topems/data`：单机绑定，多实例/滚动发布不可用。`CONSUL_ENABLED=false` 同理。
8. k8s 无 securityContext/PDB，postgres 单副本无备份钩子。

## 建议的修法（需要先定一个部署形态）

两条部署路径只能留一条作为“生产标准”，否则配置永远对不齐：

**方案 A（推荐）：统一走 compose**
- `.env.production` 改为：
  ```
  DATABASE_URL=postgresql://topems_app:<pwd>@127.0.0.1:6432/topems
  MIGRATE_URL=postgresql://topems:<pwd>@127.0.0.1:5433/topems
  DATABASE_MAX_CONNECTIONS=25
  ```
  （应用经 PgBouncer；迁移用 owner 直连；单服务池 ≤ PgBouncer `default_pool_size`）
- `start-production.sh` 不再直连 5432，改读上述 DSN 或直接 `docker compose up`。
- 删掉 `pgbouncer.ini` 或 compose 里的 `PGBOUNCER_*` 其中一份，保留单一事实源。
- `CORS_ALLOWED_ORIGINS` 填真实域名；`LOG_LEVEL` 按容量定。

**方案 B：保留 native 启动脚本**
- 明确定义“生产 Postgres 在宿主 5432 且由 owner 直连”，则模板不用改，但必须补：`max_connections` 按服务数×池换算（总和不超 Postgres 上限）、显式开启 SSL 或声明同机信任边界、PgBouncer 从编排里移除避免误导。

k8s 若继续保留，至少补 `securityContext`（`runAsNonRoot: true`、`allowPrivilegeEscalation: false`、`capabilities.drop: [ALL]`）与 PDB；否则它是“看起来能上 k8s、实际不合规”的半成品。

## 本次没有直接改的原因

`.env.production` 是**未跟踪的本地实文件**，且两种部署形态对 DSN 的要求相反（native 要 5432 直连，compose 要 6432 经池）。在没有确认“生产到底跑哪一种”之前改它，可能直接把现网启动打断。上面 A/B 两套都是可执行的完整改法，选一个我就落地。
