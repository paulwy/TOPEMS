# TOPEMS 脚本工具

## 🚀 统一服务管理脚本

### 主脚本：topems.sh

推荐使用统一的服务管理脚本，整合所有服务管理功能：

```bash
# 启动核心服务（IAM, HRM, Mail, File）
./scripts/topems.sh start

# 启动所有服务（包含文档服务）
./scripts/topems.sh start-all

# 停止所有服务
./scripts/topems.sh stop

# 停止数据库容器
./scripts/topems.sh stop-db

# 查看服务状态
./scripts/topems.sh status

# 编译所有服务
./scripts/topems.sh build

# 检查编译状态
./scripts/topems.sh check

# 查看服务日志
./scripts/topems.sh logs <服务名> [行数]

# 清理资源
./scripts/topems.sh clean

# 显示帮助
./scripts/topems.sh help
```

### 脚本工具列表

#### 核心服务脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | **统一服务管理脚本**（推荐使用，需要Docker） |
| `start-local.sh` | 启动核心服务（IAM + HRM + Mail），需要Docker |
| `start-all.sh` | 启动所有服务（需要Docker） |
| `start-without-docker.sh` | **无Docker启动脚本**（推荐用于本地已安装PostgreSQL/Redis） |
| `start-services.sh` | 启动服务脚本 |
| `start-production.sh` | 生产环境部署脚本 |
| `stop-all.sh` | 停止所有服务 |

### 数据库脚本

| 脚本 | 说明 |
|------|------|
| `init-db-unified.sh` | 统一数据库初始化（自动检测环境） |
| `init-db-local.sh` | **无Docker数据库初始化脚本**（本地PostgreSQL环境） |
| `init-vector-index.sh` | 初始化 Redis 向量索引 |
| `install-pgvector.sh` | 安装配置 pgvector |
| `rebuild-postgres.sh` | 重建支持 pgvector 的 PostgreSQL 容器 |

### 开发脚本

| 脚本 | 说明 |
|------|------|
| `manage-services.sh` | 管理所有服务（启动、停止、编译） |
| `build-all-services.sh` | 构建所有服务镜像 |
| `cleanup.sh` | 全面清理（端口、进程、缓存） |
| `run-clippy.sh` | 运行 Clippy 代码检查 |
| `run-tests.sh` | 运行测试 |
| `run_ci_tests.sh` | 运行 CI 测试 |

### 部署脚本

| 脚本 | 说明 |
|------|------|
| `deploy.sh` | 离线部署脚本 |
| `download-images.sh` | 下载 Docker 镜像 |
| `monitor.sh` | 启动监控服务 |

## 使用示例

### 快速开始（无Docker模式）

如果你本地已安装 PostgreSQL 和 Redis，可以使用以下方式快速启动：

```bash
# 1. 初始化数据库
bash scripts/init-db-local.sh

# 2. 加载环境变量
source .env.local

# 3. 启动核心服务
bash scripts/start-without-docker.sh start

# 4. 查看服务状态
bash scripts/start-without-docker.sh status
```

### Docker 模式启动

使用 Docker 容器运行 PostgreSQL 和 Redis：

```bash
# 1. 初始化数据库
bash scripts/init-db-unified.sh

# 2. 启动所有服务
bash scripts/start-all.sh
```

### 启动核心服务（推荐用于开发）

```bash
cd TOPEMS
bash scripts/start-local.sh
```

### 启动所有服务

```bash
cd TOPEMS
bash scripts/start-all.sh
```

### 数据库初始化

```bash
# 方式一：无Docker模式（推荐用于本地开发）
#   前提条件：本地已安装 PostgreSQL 和 Redis
bash scripts/init-db-local.sh

# 方式二：使用统一初始化脚本（交互式，自动检测环境）
bash scripts/init-db-unified.sh

# 方式三：手动使用 psql
psql -U xingzhai -d postgres << 'EOF'
CREATE ROLE topems WITH LOGIN PASSWORD 'topems_secret' CREATEDB SUPERUSER;
CREATE DATABASE topems OWNER topems;
EOF
```

#### 无Docker模式环境变量配置

```bash
# 可选配置（使用默认值可以跳过）
export DB_NAME=topems
export DB_USER=topems
export DB_PASS=topems_secret
export DB_HOST=localhost
export DB_PORT=5432
```

#### 无Docker启动脚本命令

```bash
# 启动核心服务
bash scripts/start-without-docker.sh start

# 启动所有服务
bash scripts/start-without-docker.sh start-all

# 停止所有服务
bash scripts/start-without-docker.sh stop

# 查看服务状态
bash scripts/start-without-docker.sh status

# 查看服务日志
bash scripts/start-without-docker.sh logs <服务名> [行数]

# 查看帮助
bash scripts/start-without-docker.sh help
```

### 配置 Ollama AI

```bash
# 1. 安装 Ollama
brew install ollama

# 2. 启动并拉取模型
ollama serve
ollama pull qwen2.5:7b-instruct

# 3. 验证
curl http://localhost:11434/api/tags
```

### 配置向量搜索

```bash
# 方式一：初始化 Redis 向量索引（推荐）
bash scripts/init-vector-index.sh

# 方式二：安装脚本（配置 pgvector）
bash scripts/install-pgvector.sh

# 方式三：重建 PostgreSQL 容器
bash scripts/rebuild-postgres.sh
```

### 管理服务

```bash
# 启动指定服务
bash scripts/manage-services.sh start iam

# 停止指定服务
bash scripts/manage-services.sh stop hrm

# 重启指定服务
bash scripts/manage-services.sh restart mail

# 查看状态
bash scripts/manage-services.sh status
```

### 清理环境

```bash
# 清理所有进程和端口
bash scripts/cleanup.sh
```
