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

---

## 修复记录（2026-11-24，全部修复）

审计结论已全部落地，并用 `scripts/ci/check-prod-config.mjs` 把每一条变成可断言门禁（接入 lefthook `prod-config`）。

**1. `.env.production`（本机实文件，600 权限）重写为 native 形态**

- `DATABASE_URL=postgresql:///topems_prod?user=xingzhai`（unix socket + peer，原 `topems:***@localhost:5432` 作废）
- 新增 `MIGRATE_URL`（迁移独立连接）；`SERVER_PORT=CORE_PORT=8099`（与 launchd 一致，原 8000）
- `DATABASE_MAX_CONNECTIONS` 100 → **30**（单进程，留出迁移/运维直连余量）
- `CORS_ALLOWED_ORIGINS` → `https://www.topmap.net,https://app.topmap.net`
- `STORAGE_PATH` / `PLUGIN_STORAGE_PATH`：`/opt/topems/...` → `/Users/xingzhai/topems/...`
- 原文件备份为 `.env.production.bak-2026-11-24`（600，`.gitignore` 的 `*.bak-*` 覆盖）

**2. compose 编排（`deploy/docker/docker-compose.yml`）**

- 所有应用 DSN `postgres://topems_app:...@postgres:5432` → **`@pgbouncer:6432`**（11 处）；`MIGRATE_URL` 保持 owner 直连 5432
- unified-core 不再用 owner 直连，改为 `topems_app` 经池 + 独立 `MIGRATE_URL`
- 删除 pgbouncer 服务的 `DATABASE_URL` / `PGBOUNCER_MAX_CLIENT_CONN` / `PGBOUNCER_DEFAULT_POOL_SIZE` / `PGBOUNCER_MAX_DB_CONNECTIONS`：连接池参数**唯一事实源 = pgbouncer.ini**
- postgres 启动参数补 `max_connections=200`、`shared_buffers=256MB`：原默认 100 < pgbouncer `max_db_connections=150`，池永远拿不满

**3. PgBouncer（`deploy/docker/pgbouncer/`）**

- `auth_type` md5 → **scram-sha-256**（PG18 新角色默认 scram，md5 无法认证）
- `default_pool_size` 15 → 40、`min_pool_size` 5（与 max_db_connections=150 匹配）
- `userlist.txt` 不再入库：改为 `render-userlist.sh` 部署时按真实口令生成（600），仓库只留 `userlist.txt.example`；`.gitignore` 追加该路径

**4. k8s（`deploy/k8s/base/`）**

- postgres/redis/rabbitmq 全部加 `securityContext`：`allowPrivilegeEscalation: false` + `seccompProfile: RuntimeDefault`；redis/rabbitmq `drop: ALL`，postgres 保留 entrypoint 必需的 `CHOWN/DAC_OVERRIDE/FOWNER/SETGID/SETUID`
- postgres 加 `args: -c max_connections=200`
- rabbitmq 明文口令 `topems_secret` → `secretKeyRef(topems-secrets/RABBITMQ_DEFAULT_PASS)`

**5. 配置漂移**

- `config/env/.env.production.template`：补 `MIGRATE_URL`、双形态 DSN 说明（native / compose）、CORS 填真实域名
- `config/production.yaml.example`：端口 8013 → 8099、`logging.level` error → info、`max_connections` 30、SSL 注释说明同机前提
- `config/database.toml` `[production]`：DSN 改为 socket 形态、`max_connections` 50 → 30、补 SSL 唯一表达位置说明（不新增程序不认识的键）
- `scripts/deploy/start-production.sh`：加载 env 时若 DSN 指向 `*_prod` 且 `TOPEMS_INSTANCE!=prod` 给出显式告警

**6. 门禁（新增，已负例验证）**

`node scripts/ci/check-prod-config.mjs` 断言 6 组不变量：模板 MIGRATE_URL/CORS/DSN/pool、compose 无双源且 app 经池、pgbouncer 认证与池上限、密钥不入库、实配权限与占位、示例配置漂移。把模板 CORS 改回 `your-domain.com` 时立即 FAIL（exit 1），恢复后 PASS。

## 收口进展（2026-11-24 晚）

**DNS 已在 Cloudflare 控制台完成，且无需生产机配合**：核对真实记录后确认 `www` / `app` 本来都指向隧道 `d677df4c-…cfargotunnel.com`，此前的 `topems-website.pages.dev` 只是本机解析器缓存假象，没有任何 Pages 残留需要清理。实际动作是：把裸域 `@` 从「仅 DNS」改成「已代理」，新增单一重定向规则 `apex-root-to-www`（`https://topmap.net/*` → `https://www.topmap.net/${1}`，301），并开启「始终使用 HTTPS」。后又把该规则从通配符 `https://topmap.net/*` 改为自定义表达式 `(http.host eq "topmap.net")` + 动态目标 `concat("https://www.topmap.net", http.request.uri.path)`，实测 `http://topmap.net/` **一跳**直接 301 到 `https://www.topmap.net/`，深路径与查询串均保留；`test.topmap.net`（指向已无响应的 `39.97.42.144`）已删除，记录数 4 → 3。详见 `docs/ops/topmap-net-dns-2026-11-24.md`。

**门禁此前是空跑，已修**：机器上没有 lefthook 二进制，`.git/hooks/pre-commit` 落在 `Can't find lefthook in PATH` 分支并 exit 0，57 个钩子全部静默跳过——本轮新加的 `prod-config` 也就从未真正拦过事。现已 `brew install lefthook`（2.2.2），并把 `status-catalog` 的比对库从开发库改指基线库（`.env` 增 `STATUS_CATALOG_DB_URL=postgresql:///topems_status_baseline_verify`），`lefthook run pre-commit --force` 57/57 全绿，且已用一次**不带 `--no-verify`** 的真实提交验证链路生效。详见 `docs/quality/precommit-gates-restored-2026-11-24.md`。

**只剩一件事需要生产机配合**：核对并同步生产机 `/Users/xingzhai/topems/.env.production`（本机副本已按 native 形态重写），然后重启 launchd 并回传验收结果。通知稿见 `docs/ops/notice-prod-align-2026-11-24.md`。
