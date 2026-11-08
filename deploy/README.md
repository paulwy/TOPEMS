# TOPEMS 部署配置

## 部署体系说明

> 2026-10-08 容器策略定案（见 `docs/deploy/container-strategy.md`）：**生产走 systemd 模型，
> 生产数据禁入容器**。Docker Compose 已弃用、仅作临时验证/历史参考；Kubernetes 为可选、当前未启用。

| 方案 | 定位 | 适用场景 | 目录 |
|------|------|---------|------|
| **systemd** | **生产主路径**（现用） | 裸机 Linux 生产服务管理（`scripts/deploy/install.sh`/`update.sh`/`rollback.sh`） | `systemd/` |
| **Docker Compose** | **已弃用**（临时验证/历史参考，非生产） | 一次性测试/演示；生产数据禁入容器 | `docker/`（DEPRECATED，见其 README） |
| **Kubernetes** | 可选（当前未启用） | 多节点集群、云原生部署 | `k8s/` |
| **Nginx** | 反向代理（通用） | 配合生产 systemd 方案使用，唯一入口 upstream → :8099 | `nginx/` |

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
├── systemd/                  # systemd 服务单元（生产主路径）
│   └── *.service             # 各服务的 systemd unit 文件
└── nginx/                    # Nginx 反向代理配置（通用 + macOS 生产镜像模板）
    ├── topems.conf           # Linux 反向代理/TLS 入口模板（topems_safe access_log）
    ├── macos/                # macOS 生产镜像模板（nginx.conf + servers/topems.conf、topems-ssl.conf）
    └── topems-ca.crt         # 私有 CA 根证书（本地生成，.gitignore 精确忽略，不入库）
```

## Nginx 日志策略（access_log / topems_safe）

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

## 生产部署（systemd 主路径）

生产使用 `scripts/deploy/` 下的 systemd 范式脚本（install/update/rollback/start-production 等，
见下方「部署脚本」），**不使用 docker-compose**。生产数据直连 PostgreSQL（5432），禁入容器。

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
- `production-deploy.sh` — 一键部署（现用，systemd 范式）；`deploy.sh` 已 **DEPRECATED**（docker run 离线范式 C，2026-10-03 弃用，勿用于新部署）
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
- 数据层回滚兜底：`rollback.sh` 全量 pg_dump/restore（docker 部署）；systemd 部署下等价操作为 `pg_dump` + `psql` 导入

### 验证回滚
- `rollback.sh --dry-run` 预演完整计划（本机可跑，2026-10-08 已验证计划完整）
- 回滚后检查：容器/服务运行状态、`core_permissions` 计数、admin 登录成功（脚本内置 8 步验证）
