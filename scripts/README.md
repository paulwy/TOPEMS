# TOPEMS 脚本工具

## 管理脚本

### 核心服务脚本

| 脚本 | 说明 |
|------|------|
| `start-local.sh` | 启动核心服务（IAM + HRM + Mail），不依赖 Docker |
| `start-all.sh` | 启动所有服务（需要 Docker） |
| `stop-all.sh` | 停止所有服务 |

### 数据库脚本

| 脚本 | 说明 |
|------|------|
| `init-db-unified.sh` | 统一数据库初始化（自动检测环境） |
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
# 方式一：使用 start-local.sh 自动初始化（推荐）
bash scripts/start-local.sh

# 方式二：使用统一初始化脚本（交互式）
bash scripts/init-db-unified.sh

# 方式三：手动使用 psql
psql -U xingzhai -d postgres << 'EOF'
CREATE ROLE topems WITH LOGIN PASSWORD 'topems_secret' CREATEDB SUPERUSER;
CREATE DATABASE topems OWNER topems;
EOF
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
