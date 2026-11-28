# TOPEMS 部署配置

## 部署体系说明（2026-11-13 实测）

> **当前本机生产实际是 macOS launchd，不是 systemd。**
> - 服务：LaunchAgent `gui/501/com.topems.server`（`~/Library/LaunchAgents/com.topems.server.plist`，`KeepAlive=true`、`RunAtLoad=true`）
> - 二进制：`/Users/xingzhai/topems/bin/topems-server`，监听 `127.0.0.1:8099`（代码默认回环；2026-11-13 实测生产旧二进制仍为 `*:8099`，换件后收敛）
> - nginx：LaunchAgent `gui/501/com.topems.nginx`，配置 `/opt/homebrew/etc/nginx/nginx.conf` + `servers/topems.conf`、`servers/topems-ssl.conf`；80/443 全部**直接** `proxy_pass http://127.0.0.1:8099`，**无 upstream 块**
> - 生产库：`topems_prod`（`ehs` schema 71 表）；旧库 `topems`（65 表）**不是生产**
> - 迁移账本：`_sqlx_migrations` **667** 条成功、0 失败、无重复，max `20261112190000`（统计时点 2026-11-13）
>
> 下文 `systemd/`、Linux nginx 模板、Docker/K8s 均保留为**通用模板/历史参考**；本机现用生产形态是 macOS launchd 托管，版本升级主链路见 `docs/deploy/release-pipeline.md`。

| 方案 | 定位 | 适用场景 | 目录/入口 |
|------|------|---------|-----------|
| **macOS launchd** | **本机生产（现用）** | xingzhai 生产机（macOS + brew nginx） | 升级：`docs/deploy/release-pipeline.md`；兜底脚本 `scripts/deploy-prod.sh`；plist 在 `~/Library/LaunchAgents/`（不入库） |
| **systemd** | Linux 生产模板（**非本机现用**） | 裸机 Linux 目标机（`scripts/deploy/install.sh`/`update.sh`/`rollback.sh`） | `systemd/` |
| **Docker Compose** | **已弃用**（临时验证/历史参考，非生产） | 一次性测试/演示；生产数据禁入容器 | `docker/`（DEPRECATED，见其 README） |
| **Kubernetes** | 可选（当前未启用） | 多节点集群、云原生部署 | `k8s/` |
| **Nginx** | 反向代理（通用） | 本机 macOS：直连 `proxy_pass` → :8099；Linux 模板：upstream → :8099 | `nginx/` |

## 监听地址口径（进程只听回环，对外统一走 nginx）

- `topems-server` 的 HTTP 监听地址由环境变量 `BIND_ADDR` 决定，**默认 `127.0.0.1`**（单一信源：`lib/shared-bootstrap` 的 `DEFAULT_BIND_ADDR`）；端口仍由 `SERVER_PORT` 决定（默认 `8099`）。
- 生产 plist（`~/Library/LaunchAgents/com.topems.server.plist`）**不设** `BIND_ADDR`，所以进程只监听回环：局域网无法绕过 nginx 直连 8099，明文 HTTP、TLS 与 access_log 不会被绕开。
- 对外入口统一是 nginx：本机 macOS 生产 80/443 直接 `proxy_pass http://127.0.0.1:8099`（**无 upstream 块**），nginx 配置不在本仓库改动范围内。
- 只有确实需要全部网卡的场景才显式设置 `BIND_ADDR=0.0.0.0`，并在部署记录里写明原因；默认配置不得放开。已知容器路径均已显式设置：
  - `deploy/docker/docker-compose.yml`：`x-common-env` 与 unified-core / erp…plugin-registry 各服务；
  - `deploy/k8s/base/configmap.yaml`：`topems-config` 注入全部 21 个 service Deployment；
  - `deploy/k8s/_archive/`：未部署，重新启用时必须自行补 `BIND_ADDR: "0.0.0.0"`（README 已标注）；
  - 自行 `docker run` 本仓库镜像时加 `-e BIND_ADDR=0.0.0.0`。
- 核验方式：
  ```bash
  lsof -nP -iTCP:8099 -sTCP:LISTEN        # 期望仅 127.0.0.1:8099，不得为 *:8099
  curl -sf http://127.0.0.1:8099/api/server/health   # 本机探活正常
  # 从局域网另一台机器执行（期望连接被拒，证明无法绕过 nginx）
  curl -m 3 http://<生产机IP>:8099/api/server/health
  ```
- 防回退：`python3 scripts/dev/check-config-consistency.py` 校验「默认监听地址回环 + 入口不硬编码 `0.0.0.0` + nginx 直代目标为回环」；`cargo test -p topems-shared-bootstrap bind_addr` 覆盖默认值单测。

## 目录结构

```
deploy/
├── README.md                 # 本文档
├── docker/                   # Docker Compose（DEPRECATED，仅临时验证/历史参考，非生产）
│   ├── docker-compose.yml    # 全量 compose 文件（历史基准；生产不使用）
│   ├── docker-compose.dify.yml       # Dify AI 平台集成（可选叠加）
│   ├── etcd-compose.yml      # etcd 中间件独立栈（可选；仅 ai/portal opt-in 配置管理）
│   ├── Dockerfile.service    # 统一服务 Dockerfile 模板
│   ├── build-service.sh      # 统一服务构建脚本
│   ├── prometheus/           # Prometheus 配置
│   ├── grafana/              # Grafana 仪表盘
│   ├── loki/                 # Loki 日志聚合
│   ├── alertmanager/         # Alertmanager 告警
│   ├── otel-collector/       # OpenTelemetry Collector
│   ├── traefik/              # Traefik 反向代理
│   ├── nginx/                # Nginx 配置（docker 内）
│   ├── consul/               # Consul 服务发现
│   ├── pgbouncer/            # PgBouncer 连接池
│   └── init-scripts/         # 容器初始化脚本
├── k8s/                      # Kubernetes 部署配置（可选）
│   ├── kustomization.yaml
│   ├── base/                 # 基础资源（ConfigMap/Secret/Ingress/Postgres/Redis）
│   └── services/             # 各服务 Deployment
├── systemd/                  # systemd 服务单元（Linux 模板，非本机现用）
│   └── *.service             # 各服务的 systemd unit 文件
└── nginx/                    # Nginx 反向代理配置（通用 + macOS 生产镜像模板）
    ├── topems.conf           # Linux 反向代理/TLS 入口模板（topems_safe access_log）
    ├── macos/                # macOS 生产镜像模板（nginx.conf + servers/topems.conf、topems-ssl.conf）
    └── topems-ca.crt         # 私有 CA 根证书（本地生成，.gitignore 精确忽略，不入库）
```

## Nginx 日志策略（access_log / topems_safe）

- **本机生产实际日志**：`/Users/xingzhai/topems/nginx/logs/access.log`（归档 `access.log.*`；`~/topems/logs/nginx.out`、`nginx.err` 为 launchd 捕获的 nginx 进程输出）。Homebrew 默认 `/opt/homebrew/var/log/nginx/access.log` 已停在 2026-11-08，**不是当前入口日志**。
- **本机 nginx 排障必须用绝对路径**：`/opt/homebrew/bin/nginx -t` / `-T`。非登录 SSH 的 `PATH` 不含 `/opt/homebrew/bin`，裸 `nginx -T` 会 `command not found`；`sudo` 又需口令，同样不可用。实际加载配置是 `/opt/homebrew/etc/nginx/nginx.conf`（include `servers/topems.conf`、`servers/topems-ssl.conf`）。
- 所有 nginx 模板统一使用 `log_format topems_safe`：只记录 `method + $uri + $server_protocol`，**不落 query string**，避免 token/password 类参数写入日志。
- `nginx/topems.conf`（Linux 模板）：`http` 块定义 `topems_safe`，80/443 server 级写 `/var/log/nginx/topems_access.log`；`/health`、`/metrics` 保持 `access_log off`。
- `nginx/macos/`（macOS 生产镜像模板，对应 `/opt/homebrew/etc/nginx/`）：
  - `nginx.conf`：定义 `topems_safe`；全局 `access_log` 保持注释，由 server 级显式开启（避免默认 server 另写一份未轮转日志）。
  - `servers/topems.conf`、`servers/topems-ssl.conf`：server 级 `access_log __TOPEMS_HOME__/nginx/logs/access.log topems_safe`。
  - 占位符：`__TOPEMS_HOME__` = 应用根目录（如 `$HOME/topems`）；`__TOPEMS_WEB_ROOT__` = 前端静态目录（如 `<repo>/dist/current`）。部署前按环境替换，模板本身不含用户目录硬编码。
- 轮转：`scripts/rotate-nginx-logs.sh`，PID 默认 `/opt/homebrew/var/run/nginx.pid`（缺失回退 `$TOPEMS_HOME/nginx/nginx.pid`），保留最近 `KEEP_DAYS`（默认 7）份。
- `scripts/deploy-prod.sh` 不会生成或覆盖上述 nginx 配置，仅在 `--frontend` 时把 `servers/topems.conf` 与 `servers/topems-ssl.conf` 的 `root` 统一改为 `<repo>/dist/current`，先经 `scripts/verify-nginx-config.sh` 做 `nginx -t` 零告警校验，再 reload。
- `scripts/verify-nginx-config.sh`：同时捕获 `nginx -t` 的 stdout/stderr，任何 `[warn]` 即失败（当前无合法告警白名单）；无 nginx 的环境默认 SKIP 不阻断，部署侧用 `--require` 强制校验。

## Nginx TLS 证书（`nginx/topems-ca.crt`）

- **性质**：自建私有 CA 的**根证书公钥部分**，`CN=TOPEMS Internal Root CA`、`O=TOPEMS`、`C=CN`，自签名；有效期 `2026-11-05 → 2036-11-02`；RSA 4096 / SHA-256；`Basic Constraints: CA:TRUE, pathlen:0`，`Key Usage: keyCertSign, cRLSign`。**不是站点证书**，无 SAN。
- **当前引用关系**：`nginx/topems.conf` **不引用** `topems-ca.crt`；实际使用 `/etc/nginx/certs/fullchain.pem`、`/etc/nginx/certs/privkey.pem`、`/etc/nginx/certs/chain.pem`。
- **生成方式**（占位符，实际路径按环境替换）：
  ```bash
  # 私钥 <ca-key-path> 必须存放在仓库之外
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout <ca-key-path> -out <ca-crt-path> \
    -subj "/C=CN/O=TOPEMS/CN=TOPEMS Internal Root CA" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign"

  # 站点证书签发（可选）
  openssl req -newkey rsa:2048 -nodes -keyout <site-key-path> -out <site-csr-path> -subj "/CN=<domain>"
  openssl x509 -req -in <site-csr-path> -CA <ca-crt-path> -CAkey <ca-key-path> \
    -CAcreateserial -days <days> -sha256 -out <site-crt-path>
  ```
- **硬性约定**：
  - **私钥必须永久保存在仓库之外**，任何形式（`*.key` / `*.pem` / `*.p12`）禁止入库；
  - CA 证书仅作为**信任锚分发**（安装到客户端信任库），**不入库**；`.gitignore` 已按具体文件精确忽略 `/deploy/nginx/topems-ca.crt`，不使用 `*.crt` 全局规则。
- **客户端信任**：将 `<ca-crt-path>` 导入客户端信任库（macOS Keychain 或 Linux `update-ca-certificates`）；生产入口证书仍按现有 `/etc/nginx/certs/` 路径部署，见本文件「生产部署」与 `scripts/deploy/` 脚本。

## 生产部署（本机 macOS launchd；Linux 模板见下）

现役版本升级走 `docs/deploy/release-pipeline.md`：air 侧构建 arm64 交付包 → xingzhai 本机免构建替换 + 校验（生产机不构建、不拉源码编译），库 `topems_prod`；回滚用 `scripts/rollback-prod-mac.sh`。
`scripts/deploy-prod.sh` 为兼容/兜底入口（本机模式直连；`PROD_HOST` 非空才走远端 SSH），不再内置退役生产地址。**不使用 docker-compose**，生产数据直连 PostgreSQL（5432），禁入容器。

`scripts/deploy/` 下的 systemd 范式脚本（install/update/rollback/start-production 等）是 **Linux 目标机模板**，
不是本机现用链路；对应执行清单见 `docs/deploy/production-execution-checklist.md`（Linux 目标清单）。

## Docker Compose（DEPRECATED，仅临时演练/参考）

> 以下 compose 命令仅用于一次性测试/演示或未来明确采用 docker 的目标环境，**不得用于生产**；
> 详见 `deploy/docker/README.md` 与 `docs/deploy/container-strategy.md`。

```bash
# （非生产）启动全量服务演练
cd deploy/docker
docker compose up -d

# 叠加 Dify AI 平台集成（可选）
docker compose -f docker-compose.yml -f docker-compose.dify.yml up -d

# 可选中间件独立栈（etcd 仅 ai/portal opt-in 配置管理；consul 为预留服务发现扩展点，默认关）
# 注（D5/U9 2026-10-03）：eureka/nacos/zookeeper 独立栈已移除（未接线残留）
docker compose -f etcd-compose.yml up -d
```

## 构建服务镜像

```bash
# 使用统一构建脚本
bash deploy/docker/build-service.sh erp
bash deploy/docker/build-service.sh finance --tag latest
```

## 部署脚本

部署和运维脚本统一放在 `scripts/deploy/` 目录下，包括：
- `install.sh` / `uninstall.sh` / `update.sh` — Linux 服务器安装/卸载/更新
- `setup-db.sh` — 数据库初始化
- `production-deploy.sh` — Linux/systemd 模板一键部署（**非本机现用**；本机 macOS launchd 用 `scripts/deploy-prod.sh`）；`deploy.sh` 已 **DEPRECATED**（docker run 离线范式 C，2026-10-03 弃用，勿用于新部署）
- `production-verify.sh` — 生产环境验证
- `rollback.sh` — 回滚
- `start-production.sh` — 生产环境启停
- `service-monitor.sh` — 服务监控与自动恢复
- `ai-health-check.sh` — AI 模块健康检查
- `domain-start.sh` — 按业务域分组启动
- `smoke-prod.sh` — 生产功能链路冒烟（TODO 2.3：IAM 登录→JWT→各域 /health、BI 真实 SQL、插件运行时；专项链路指引见脚本层2）

## 回滚策略（TODO 2.4）

### 回滚资产（更新前自动保留）
- **上一版本二进制**：`update.sh` 更新前将 `${PREFIX}/bin` 快照为 `bin.backup.*`（保留最近一份）
- **上一版本前端 dist**：`update.sh` 将 `${PREFIX}/web` 快照为 `web.backup.*`
- **数据库**：`rollback.sh` 回滚前先 `pg_dump` 当前库至 `pre_rollback_<时间戳>/database_pre_rollback.sql`（绝不直接 dropdb 删库，先排查连接）

### 回滚顺序（部分回滚/降级场景；全量回滚用 rollback.sh）
1. **业务服务**（finance/mes/qms/lims/ehs/wms 等）先回滚到上一版本二进制并重启
2. **平台层**（portal / unified-core）随后回滚
3. **数据库不动**（数据优先保留；结构演进走 DDL 运维而非 sqlx 回滚，见 docs/database/database-half-migration-ops.md 2.1 流程）

### 数据库回滚策略
- 结构演进 = **直接 DDL 运维**（`psql "$DATABASE_URL" -f <迁移文件>`），`sqlx migrate run` 默认被防护拦截，不做补跑/回滚依赖
- 破坏性变更（drop 列/表、改约束）前必须拍板并文档化，DDL 先备份受影响数据
- 数据层回滚兜底：`rollback.sh` 全量 pg_dump/restore（docker 部署）；systemd/Linux 模板部署下等价操作为 `pg_dump` + `psql` 导入；本机 macOS launchd 回滚见 `scripts/rollback-prod-mac.sh`

### 验证回滚
- `rollback.sh --dry-run` 预演完整计划（本机可跑，2026-10-08 已验证计划完整）
- 回滚后检查：容器/服务运行状态、`core_permissions` 计数、admin 登录成功（脚本内置 8 步验证）
