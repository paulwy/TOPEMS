# TOPEMS 脚本工具

## 🚀 统一服务管理脚本

### 主脚本：topems.sh

推荐使用统一的服务管理脚本，默认使用**本地模式**（无需Docker，适合内网/开发环境）：

```bash
# 启动所有服务（默认：本地模式）
./scripts/topems.sh start

# 使用Docker方案启动（需要外网下载镜像）
./scripts/topems.sh start-docker

# 强制使用本地模式（无外网可用时）
./scripts/topems.sh start-standalone

# ⚡ 优化启动（推荐开发环境）
./scripts/topems.sh start-core              # 核心服务（~200 MB）
./scripts/topems.sh start-module erp        # ERP 模块（~150 MB）
./scripts/topems.sh start-module plm        # PLM 模块（~180 MB）
./scripts/topems.sh start-module mes        # MES 模块（~120 MB）
./scripts/topems.sh start-module scm        # SCM 模块（~120 MB）
./scripts/topems.sh start-module infra      # 基础设施（~150 MB）
./scripts/topems.sh start-module analytics  # 数据分析（~200 MB）

# 停止所有服务
./scripts/topems.sh stop

# 查看服务状态
./scripts/topems.sh status

# 安装依赖（本地模式）
./scripts/topems.sh install

# AI模型管理（独立管理，资源占用高）
./scripts/topems.sh ai start
./scripts/topems.sh ai pull qwen2.5:7b-instruct-q4_0

# 编译构建
./scripts/topems.sh build

# 运行测试
./scripts/topems.sh test

# 显示帮助
./scripts/topems.sh help
```

### ⚡ 优化启动命令

| 命令 | 内存占用 | 启动服务 | 端口范围 |
|------|---------|---------|---------|
| `start` | ~800 MB | 全部服务 | 8000-8070 |
| `start-core` | ~200 MB | iam, pm, notification, portal, flow, integration | 8000-8005 |
| `start-module erp` | ~150 MB | erp, hrm, crm | 8010-8012 |
| `start-module plm` | ~180 MB | rs, lims, pdm, doc | 8020, 8022-8024 |
| `start-module mes` | ~120 MB | mes, qms, ehs | 8030-8032 |
| `start-module scm` | ~120 MB | scm, srm, wms | 8040-8042 |
| `start-module infra` | ~150 MB | file, mail, im, gis | 8050-8053 |
| `start-module analytics` | ~200 MB | bi, report, ai | 8060-8062 |

### 端口规划 (v4.0)

所有服务按业务模块分组，端口连续分配：

| 模块 | 端口范围 | 服务 | 状态 |
|------|---------|------|------|
| **核心服务** | 8000-8009 | iam, pm, notification, portal, flow, integration | 已实现 |
| **ERP/财务** | 8010-8019 | erp, hrm, crm | 已实现 |
| **PLM/研发** | 8020-8029 | rs, lims, pdm, doc（8021禁用） | 已实现 |
| **MES/生产** | 8030-8039 | mes, qms, ehs | 已实现 |
| **SCM/供应链** | 8040-8049 | scm, srm, wms | 已实现 |
| **基础设施** | 8050-8059 | file, mail, im, gis | 已实现 |
| **数据分析** | 8060-8069 | bi, report, ai | 已实现 |
| **扩展服务** | 8070-8079 | mobile, iot | 已实现/预留 |

### 可用模块列表

| 模块 | 命令 | 服务 | 端口 |
|------|------|------|------|
| `core` | `start-module core` | iam, pm, notification, portal, flow, integration | 8000-8005 |
| `erp` | `start-module erp` | erp, hrm, crm | 8010-8012 |
| `plm` | `start-module plm` | rs, lims, pdm, doc | 8020, 8022-8024 |
| `mes` | `start-module mes` | mes, qms, ehs | 8030-8032 |
| `scm` | `start-module scm` | scm, srm, wms | 8040-8042 |
| `infra` | `start-module infra` | file, mail, im, gis | 8050-8053 |
| `analytics` | `start-module analytics` | bi, report, ai | 8060-8062 |

### 脚本架构

```
scripts/
├── topems.sh                    # 统一入口脚本（默认本地模式）
├── topems-standalone.sh          # 本地部署脚本
├── ai-models.sh                 # AI模型管理脚本
├── install-deps.sh              # 依赖安装脚本
├── setup-db.sh                  # 数据库初始化脚本
└── docker/                      # Docker方案脚本
    ├── docker-compose.yml       # Docker Compose配置
    └── topems-docker.sh         # Docker方案启动脚本
```

### 脚本工具列表

#### 统一入口脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | **统一服务管理脚本**（推荐使用，默认本地模式） |

#### Docker方案脚本

| 脚本 | 说明 |
|------|------|
| `docker/docker-compose.yml` | Docker Compose配置文件 |
| `docker/topems-docker.sh` | Docker方案启动脚本 |

#### 本地模式脚本

| 脚本 | 说明 |
|------|------|
| `standalone/install-deps.sh` | 依赖安装脚本（PostgreSQL, Redis, Rust, Node.js） |
| `standalone/topems-standalone.sh` | 本地模式启动脚本 |
| `standalone/ai-models.sh` | AI模型管理脚本（Ollama） |

#### 数据库脚本

| 脚本 | 说明 |
|------|------|
| `init-db-unified.sh` | 统一数据库初始化（自动检测环境） |
| `init-db-local.sh` | 本地模式数据库初始化脚本 |
| `init-vector-index.sh` | 初始化向量索引 |
| `install-pgvector.sh` | 安装配置 pgvector |
| `rebuild-postgres.sh` | 重建支持 pgvector 的 PostgreSQL 容器 |

#### 开发脚本

| 脚本 | 说明 |
|------|------|
| `build-all-services.sh` | 构建所有服务（已整合到 topems.sh build） |
| `check-all-rust-services.sh` | 检查所有 Rust 服务编译状态 |
| `cleanup.sh` | 全面清理（端口、进程、缓存） |
| `clean-warnings.sh` | 批量清理代码警告（自动修复） |
| `run-clippy.sh` | 运行 Clippy 静态分析 |
| `run-tests.sh` | 运行测试套件（已整合到 topems.sh test） |
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
| 开发环境 | 本地模式 | 资源占用低，启动快 |
| CI/CD测试 | Docker方案 | 环境一致性好 |
| 生产部署 | Docker方案 | 便于扩展和管理 |
| 离线环境 | 本地模式 | 无容器依赖 |
| 资源受限 | 本地模式 | 资源占用更低 |

### 本地模式（推荐开发/内网）

```bash
# 首次使用：安装依赖
bash scripts/topems.sh install

# 启动核心服务（推荐开发环境）
bash scripts/topems.sh start-core

# 启动指定模块
bash scripts/topems.sh start-module plm

# 启动所有服务
bash scripts/topems.sh start

# 停止服务
bash scripts/topems.sh stop

# 查看状态
bash scripts/topems.sh status
```

### Docker方案

```bash
# 启动所有服务
bash scripts/topems.sh start-docker

# 停止服务
bash scripts/topems.sh stop-docker

# 查看状态
bash scripts/topems.sh status-docker
```

### 数据库初始化

```bash
# 方式一：统一初始化脚本（交互式）
bash scripts/init-db-unified.sh

# 方式二：本地模式
bash scripts/init-db-local.sh

# 方式三：手动创建
psql -U postgres << 'EOF'
CREATE USER topems WITH PASSWORD 'topems_secret';
CREATE DATABASE topems OWNER topems;
EOF
```

### AI模型管理

```bash
# 启动Ollama服务（资源占用高，按需启动）
bash scripts/topems.sh ai start

# 下载推荐模型（量化版本，节省50%内存）
bash scripts/topems.sh ai pull qwen2.5:7b-instruct-q4_0

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

## 服务端口配置 (v4.0)

端口配置文件位于 `config/ports.env`：

| 模块 | 服务 | 端口 | 环境变量 |
|------|------|------|---------|
| **核心服务** | iam | 8000 | IAM_PORT |
| | pm | 8001 | PM_PORT |
| | notification | 8002 | NOTIFICATION_PORT |
| | portal | 8003 | PORTAL_PORT |
| | flow | 8004 | FLOW_PORT |
| | integration | 8005 | INTEGRATION_PORT |
| **ERP/财务** | erp | 8010 | ERP_PORT |
| | hrm | 8011 | HRM_PORT |
| | crm | 8012 | CRM_PORT |
| **PLM/研发** | rs | 8020 | RS_PORT |
| | - | 8021 | -（禁用） |
| | lims | 8022 | LIMS_PORT |
| | pdm | 8023 | PDM_PORT |
| | doc | 8024 | DOC_PORT |
| **MES/生产** | mes | 8030 | MES_PORT |
| | qms | 8031 | QMS_PORT |
| | ehs | 8032 | EHS_PORT |
| **SCM/供应链** | scm | 8040 | SCM_PORT |
| | srm | 8041 | SRM_PORT |
| | wms | 8042 | WMS_PORT |
| **基础设施** | file | 8050 | FILE_PORT |
| | mail | 8051 | MAIL_PORT |
| | im | 8052 | IM_PORT |
| | gis | 8053 | GIS_PORT |
| **数据分析** | bi | 8060 | BI_PORT |
| | report | 8061 | REPORT_PORT |
| | ai | 8062 | AI_PORT |
| **扩展服务** | mobile | 8070 | MOBILE_PORT |

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
export OLLAMA_MODEL=qwen2.5:7b-instruct-q4_0  # 量化模型，节省内存
export OLLAMA_KEEP_ALIVE=5m                    # 空闲5分钟后释放
```

### 安全配置

```bash
export JWT_SECRET=your-jwt-secret-key-here
export CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

## 启动模式说明

### ★ 本地模式（默认）

- **命令**: `start`, `start-core`, `start-module`, `start-standalone`
- **适用场景**: 开发环境、内网环境、离线环境
- **特点**: 资源占用低，直接运行进程，无需Docker

### ◆ Docker模式

- **命令**: `start-docker`
- **适用场景**: 测试环境、生产环境
- **特点**: 环境隔离，便于扩展，需要外网下载镜像
