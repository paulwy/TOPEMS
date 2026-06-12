# TOPEMS 脚本工具

## 🚀 统一服务管理脚本

### 主脚本：topems.sh

推荐使用统一的服务管理脚本，支持 Docker 和非 Docker 两种方案：

```bash
# 启动所有服务（自动检测方案）
./scripts/topems.sh start

# 使用Docker方案启动
./scripts/topems.sh start-docker

# 使用非Docker方案启动
./scripts/topems.sh start-standalone

# 停止所有服务
./scripts/topems.sh stop

# 查看服务状态
./scripts/topems.sh status

# 安装依赖（非Docker方案）
./scripts/topems.sh install

# AI模型管理
./scripts/topems.sh ai start
./scripts/topems.sh ai pull qwen2.5:7b-instruct

# 显示帮助
./scripts/topems.sh help
```

### 脚本架构

```
scripts/
├── topems.sh                    # 统一入口脚本（自动检测方案）
├── docker/                      # Docker方案脚本
│   ├── docker-compose.yml       # Docker Compose配置
│   └── topems-docker.sh         # Docker方案启动脚本
└── standalone/                  # 非Docker方案脚本
    ├── install-deps.sh          # 依赖安装脚本
    ├── topems-standalone.sh     # 非Docker方案启动脚本
    └── ai-models.sh             # AI模型管理脚本
```

### 脚本工具列表

#### 统一入口脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | **统一服务管理脚本**（推荐使用，自动检测环境） |

#### Docker方案脚本

| 脚本 | 说明 |
|------|------|
| `docker/docker-compose.yml` | Docker Compose配置文件 |
| `docker/topems-docker.sh` | Docker方案启动脚本 |

#### 非Docker方案脚本

| 脚本 | 说明 |
|------|------|
| `standalone/install-deps.sh` | 依赖安装脚本（PostgreSQL, Redis, Rust, Node.js） |
| `standalone/topems-standalone.sh` | 非Docker方案启动脚本 |
| `standalone/ai-models.sh` | AI模型管理脚本（Ollama） |

#### 数据库脚本

| 脚本 | 说明 |
|------|------|
| `init-db-unified.sh` | 统一数据库初始化（自动检测环境） |
| `init-db-local.sh` | 无Docker数据库初始化脚本 |
| `init-vector-index.sh` | 初始化向量索引 |
| `install-pgvector.sh` | 安装配置 pgvector |
| `rebuild-postgres.sh` | 重建支持 pgvector 的 PostgreSQL 容器 |

#### 开发脚本

| 脚本 | 说明 |
|------|------|
| `build-all-services.sh` | 构建所有服务镜像 |
| `check-all-rust-services.sh` | 检查所有 Rust 服务编译状态 |
| `cleanup.sh` | 全面清理（端口、进程、缓存） |
| `clean-warnings.sh` | 批量清理代码警告（自动修复） |
| `run-clippy.sh` | 运行 Clippy 静态分析 |
| `run-tests.sh` | 运行测试套件（单元测试、集成测试、覆盖率） |
| `run_ci_tests.sh` | CI/CD 测试脚本 |
| `test-hrm-api.sh` | HRM API 端到端测试 |
| `collect-test-data.sh` | 收集测试数据 |
| `encrypt-env.sh` | 加密环境变量文件 |

#### 部署脚本

| 脚本 | 说明 |
|------|------|
| `deploy.sh` | 离线部署脚本 |
| `download-images.sh` | 下载 Docker 镜像 |
| `monitor.sh` | 启动监控服务 |

## 使用示例

### 方案选择指南

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 开发环境 | 两者皆可 | 根据个人偏好选择 |
| CI/CD测试 | Docker方案 | 环境一致性好 |
| 生产部署 | Docker方案 | 便于扩展和管理 |
| 离线环境 | 非Docker方案 | 无容器依赖 |
| 资源受限 | 非Docker方案 | 资源占用更低 |

### Docker方案

```bash
# 启动所有服务
bash scripts/topems.sh start-docker

# 停止服务
bash scripts/topems.sh stop-docker

# 查看状态
bash scripts/topems.sh status-docker
```

### 非Docker方案

```bash
# 首次使用：安装依赖
bash scripts/topems.sh install

# 启动所有服务
bash scripts/topems.sh start-standalone

# 停止服务
bash scripts/topems.sh stop-standalone

# 查看状态
bash scripts/topems.sh status-standalone
```

### 数据库初始化

```bash
# 方式一：统一初始化脚本（交互式）
bash scripts/init-db-unified.sh

# 方式二：无Docker模式
bash scripts/init-db-local.sh

# 方式三：手动创建
psql -U postgres << 'EOF'
CREATE USER topems WITH PASSWORD 'topems_secret';
CREATE DATABASE topems OWNER topems;
EOF
```

### AI模型管理

```bash
# 启动Ollama服务
bash scripts/topems.sh ai start

# 下载推荐模型
bash scripts/topems.sh ai pull-all

# 下载指定模型
bash scripts/topems.sh ai pull qwen2.5:7b-instruct

# 查看模型状态
bash scripts/topems.sh ai status

# 测试模型响应
bash scripts/topems.sh ai test

# 停止Ollama服务
bash scripts/topems.sh ai stop
```

### 配置向量搜索

```bash
# 安装pgvector扩展
bash scripts/install-pgvector.sh

# 初始化向量索引
bash scripts/init-vector-index.sh
```

### 清理环境

```bash
# 清理所有进程和端口
bash scripts/cleanup.sh

# 清理Docker资源
bash scripts/docker/topems-docker.sh stop
```

## 服务端口配置

所有服务端口配置在 `config/ports.env` 文件中：

| 模块 | 服务 | 默认端口 |
|------|------|----------|
| 核心服务 | iam | 8000 |
| | notification | 8004 |
| | portal | 8005 |
| | flow | 8006 |
| | integration | 8007 |
| ERP服务 | erp | 8010 |
| | hrm | 8012 |
| | crm | 8013 |
| PLM服务 | rs | 8020 |
| | doc | 8021 |
| | lims | 8022 |
| | pdm | 8023 |
| MES服务 | mes | 8030 |
| | qms | 8031 |
| | ehs | 8032 |
| SCM服务 | scm | 8040 |
| | srm | 8041 |
| | wms | 8042 |
| 基础设施 | file | 8050 |
| | mail | 8051 |
| | im | 8052 |
| | gis | 8053 |
| 数据分析 | bi | 8060 |
| | report | 8061 |
| | ai | 8062 |
| 预留扩展 | mobile | 8070 |

## 环境变量配置

### 数据库配置

```bash
# PostgreSQL
export DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Redis
export REDIS_URL=redis://:topems_redis_secret@localhost:6379
```

### AI配置

```bash
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=qwen2.5:7b-instruct
```

### 安全配置

```bash
export JWT_SECRET=your-jwt-secret-key-here
export CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```