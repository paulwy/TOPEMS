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
│   ├── docker-compose.yml    # 主 compose 文件（核心服务）
│   ├── docker-compose.full.yml       # 全量服务（含所有业务模块）
│   ├── docker-compose.services.yml   # 业务服务 override
│   ├── docker-compose.observability.yml  # 可观测性栈（Prometheus/Grafana/Loki）
│   ├── docker-compose.domains.yml    # 多域名配置
│   ├── docker-compose.dify.yml       # Dify AI 平台集成
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
# 启动核心服务
cd deploy/docker
docker compose up -d

# 启动全量服务
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d

# 启动可观测性栈
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
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
