# TOPEMS Docker Infrastructure

This directory contains the Docker configuration for running the TOPEMS infrastructure services.

> 资源限制 / 镜像版本精确锁定的调优 SOP 见 `docs/quality/docker-ops-2026-10-03.md`（34 服务已加 mem_limit/cpus，9 镜像 tag 已锁定）。

## Compose 文件矩阵

| 文件 | 用途 | 状态 |
|---|---|---|
| `docker-compose.yml` | **主文件（权威）**：35 服务全量（数据库/中间件 + 27 业务服务 + 监控 + traefik/nginx） | ✅ 活跃（入库） |
| `docker-compose.dify.yml` | Dify LLM 平台（dify-web/api/worker + ollama） | ✅ 独立平台（入库） |
| `etcd-compose.yml` | etcd 集群 | ✅ 入库 |
| `docker-compose.full.yml` | 历史变体（topems-* 命名，27 服务） | ⚪ 本地残留（`.gitignore:75` 忽略） |
| `docker-compose.services.yml` | 历史变体（新命名，23 服务） | ⚪ 本地残留（忽略） |
| `docker-compose.domains.yml` | 历史变体（域拆分风格） | ⚪ 本地残留（忽略） |
| `docker-compose.monolith.yml` | 历史单体变体 | ⚪ 本地残留（忽略） |
| `docker-compose.observability.yml` | 可观测栈拆分变体 | ⚪ 本地残留（忽略） |

> 注意：根 `.gitignore` 第 75 行 `docker-compose.*.yml` 有意忽略后缀变体（历史组织方案不入库）；
> 被跟踪的 `docker-compose.dify.yml` 为早期强制入库的例外。**所有部署操作一律使用主文件**。

## 服务（主文件 docker-compose.yml，35 个）

- **数据/中间件**：postgres(pgvector)、pgbouncer、redis、rabbitmq、consul、etcd
- **业务服务（27）**：unified-core、erp、hrm、pm、crm、mes、pdm、scm、wms、srm、qms、lims、ehs、rd、bi、portal、finance、ai、mobile、gis、integration、plugin-registry 等
- **网关**：traefik、nginx
- **可观测**：jaeger、prometheus、grafana、alertmanager
- **前端**：topems-web-monolith

资源限制（mem_limit/cpus）与镜像 tag 锁定已覆盖 34 服务。

## Quick Start

```bash
cd docker

# 1. 环境变量
cp .env.example .env

# 2. 启动全部服务（35 个；首次拉镜像耗时较长）
docker compose -f docker-compose.yml up -d

# 仅启动基础设施（数据库/中间件）：
docker compose -f docker-compose.yml up -d postgres redis pgbouncer rabbitmq consul

# 3. 检查日志
docker compose -f docker-compose.yml logs -f <service>

# 4. 停止
docker compose -f docker-compose.yml down

# 5. 停止并删除数据卷（⚠️ 会清空数据）
docker compose -f docker-compose.yml down -v
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改（关键项）：

- `POSTGRES_USER`：数据库用户名（默认 topems）
- `POSTGRES_PASSWORD`：数据库密码（**自 2026-10-07 起无默认值**：`topems-docker.sh` 自动生成随机密码，或通过环境变量注入；docker-compose 强制要求提供，缺失即启动失败）
  > ⚠️ 安全要求：禁止在生产使用示例/默认密码；务必为 PostgreSQL/Redis/RabbitMQ 设置独立强随机密码
- `POSTGRES_DB`：数据库名（默认 topems）
- `POSTGRES_PORT`：PostgreSQL 宿主机端口（默认 5432）
- `REDIS_PORT`：Redis 宿主机端口（默认 6379）

## 卷

- `postgres_data`：PostgreSQL 持久数据
- `redis_data`：Redis 持久数据

## 构建服务镜像

### 单体镜像（topems-server 模块化单体）

```bash
docker build -f deploy/docker/Dockerfile.server -t topems-server:latest .
```

### 单个业务服务镜像（统一模板 Dockerfile.service）

```bash
docker build -f deploy/docker/Dockerfile.service \
  --build-arg SERVICE_NAME=topems-erp \
  --build-arg SERVICE_PORT=8010 \
  --build-arg PORT_ENV_VAR=ERP_PORT \
  --build-arg SERVICE_DIR=erp \
  -t topems-erp:latest .
# 或：bash deploy/docker/build-service.sh erp
```

### 本地全量构建（推荐）

```bash
# 构建全部 21 个业务服务（串行防 OOM，断点续跑）
bash deploy/docker/build-local.sh

# 构建指定服务 / 从某服务续跑 / 并行加速
bash deploy/docker/build-local.sh erp qms
bash deploy/docker/build-local.sh --from portal
bash deploy/docker/build-local.sh --parallel 2
```

> Dockerfile.service 已内置中科大 sparse 镜像加速与 HTTP/1.1（避免 rsproxy HTTP/2 流重置卡死下载）。
