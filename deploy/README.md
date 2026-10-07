# TOPEMS 部署配置

## 部署体系说明

项目提供三套部署方案，**docker-compose 为主路径**，k8s 和 systemd 为可选方案：

| 方案 | 定位 | 适用场景 | 目录 |
|------|------|---------|------|
| **Docker Compose** | **主部署方式**（推荐） | 开发环境、单机生产、快速启动 | `docker/` |
| **Kubernetes** | 生产可选 | 多节点集群、云原生部署 | `k8s/` |
| **systemd** | 备选/遗留 | 裸机 Linux 服务管理 | `systemd/` |
| **Nginx** | 反向代理（通用） | 配合上述任一方案使用 | `nginx/` |

## 目录结构

```
deploy/
├── README.md                 # 本文档
├── docker/                   # Docker Compose 主部署配置
│   ├── docker-compose.yml    # 全量 compose 文件（含全部业务服务与中间件）
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
├── systemd/                  # systemd 服务单元（备选/遗留）
│   └── *.service             # 各服务的 systemd unit 文件
└── nginx/                    # Nginx 反向代理配置（通用）
    └── topems.conf
```

## 快速开始（Docker Compose）

```bash
# 启动全量服务（docker-compose.yml 为单文件全量配置，含全部业务服务与中间件）
cd deploy/docker
docker compose up -d

# 叠加 Dify AI 平台集成
docker compose -f docker-compose.yml -f docker-compose.dify.yml up -d

# 启动可选中间件独立栈（etcd 仅 ai/portal opt-in 配置管理；consul 为预留服务发现扩展点，默认关）
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
- `deploy.sh` / `production-deploy.sh` — 一键部署
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
