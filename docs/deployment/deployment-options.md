# TOPEMS 部署方案文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v2.0 |
| 创建日期 | 2026-06-12 |
| 最后更新 | 2026-06-12 |
| 状态 | 已批准 |
| 适用范围 | TOPEMS 全平台部署 |
| 变更说明 | 新增统一入口脚本、编译测试功能、单一服务管理 |

---

## 1. 方案概述

### 1.1 方案对比

| 特性 | Docker方案 | 非Docker方案 |
|------|-----------|-------------|
| **部署复杂度** | 低（一键启动） | 中（需手动安装依赖） |
| **环境隔离** | 高（容器化） | 低（共享系统环境） |
| **资源占用** | 中（容器开销） | 低（直接运行） |
| **外网依赖** | 低（可本地镜像） | 中（需安装软件包） |
| **扩展性** | 高（K8s支持） | 低（单机部署） |
| **适合场景** | 开发、测试、生产 | 开发、轻量部署 |

### 1.2 方案选择建议

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 开发环境 | 两者皆可 | 根据个人偏好选择 |
| CI/CD测试 | Docker方案 | 环境一致性好 |
| 生产部署 | Docker方案 | 便于扩展和管理 |
| 离线环境 | 非Docker方案 | 无容器依赖 |
| 资源受限 | 非Docker方案 | 资源占用更低 |

---

## 2. Docker方案

### 2.1 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Docker | >= 24.0 | 容器运行时 |
| Docker Compose | >= 2.20 | 容器编排 |
| Git | >= 2.30 | 代码版本控制 |

### 2.2 目录结构

```
scripts/
├── topems.sh              # 统一入口脚本（推荐）
├── build-all-services.sh  # 构建所有服务
├── run-tests.sh           # 测试运行工具
├── topems-standalone.sh   # 本地部署脚本
├── ai-models.sh           # AI模型管理脚本
├── install-deps.sh        # 依赖安装脚本
├── setup-db.sh            # 数据库初始化脚本
└── docker/
    ├── topems-docker.sh   # Docker方案启动脚本
    └── docker-compose.yml # Docker Compose配置
```

### 2.3 启动流程

```
1. 检查Docker服务是否运行
2. 加载环境变量配置
3. 启动数据库容器（PostgreSQL、Redis）
4. 等待数据库就绪
5. 启动后端服务容器
6. 启动前端服务
7. 检查服务健康状态
```

### 2.4 配置说明

环境变量文件：`docker/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| POSTGRES_USER | topems | 数据库用户名 |
| POSTGRES_PASSWORD | topems_secret | 数据库密码 |
| POSTGRES_DB | topems | 数据库名 |
| POSTGRES_PORT | 5432 | 数据库端口 |
| REDIS_PASSWORD | topems_redis_secret | Redis密码 |
| REDIS_PORT | 6379 | Redis端口 |
| OLLAMA_HOST | http://host.docker.internal:11434 | Ollama地址 |

---

## 3. 非Docker方案

### 3.1 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| PostgreSQL | >= 15 | 关系型数据库 |
| Redis | >= 7.0 | 缓存数据库 |
| Rust | >= 1.75 | 后端开发语言 |
| Node.js | >= 20 | 前端开发语言 |
| npm | >= 10 | 前端包管理器 |
| Ollama | >= 0.1.40 | AI模型运行时（可选） |
| Git | >= 2.30 | 代码版本控制 |

### 3.2 目录结构

```
scripts/
├── topems.sh              # 主脚本（入口）
├── topems-standalone.sh   # 本地部署脚本
├── ai-models.sh           # AI模型管理脚本
├── install-deps.sh         # 依赖安装脚本
├── setup-db.sh            # 数据库初始化脚本
├── docker/                # Docker部署方案
│   ├── topems-docker.sh
│   └── docker-compose.yml
└── ...
```

### 3.3 启动流程

```
1. 检查PostgreSQL是否运行
2. 检查Redis是否运行
3. 检查Ollama是否运行（可选）
4. 加载环境变量配置
5. 启动后端服务（按依赖顺序）
6. 启动前端服务
7. 检查服务健康状态
```

### 3.4 配置说明

环境变量文件：`config/standalone.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DATABASE_URL | postgres://topems:topems_secret@localhost:5432/topems | 数据库连接URL |
| REDIS_URL | redis://:topems_redis_secret@localhost:6379 | Redis连接URL |
| OLLAMA_HOST | http://localhost:11434 | Ollama地址 |
| JWT_SECRET | topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256 | JWT密钥 |
| CORS_ORIGINS | http://localhost:3000,http://localhost:8000 | CORS允许的源 |

---

## 4. AI服务配置

### 4.1 Ollama配置

Ollama用于运行本地AI模型，支持以下配置：

| 模型 | 大小 | 用途 |
|------|------|------|
| qwen2.5:7b-instruct | ~14GB | 通用AI推理 |
| nomic-embed-text | ~2GB | 文本嵌入 |
| llama3.1:8b | ~16GB | 通用AI推理 |

### 4.2 启动Ollama

```bash
# 启动Ollama服务
ollama serve

# 拉取模型（首次运行）
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

---

## 5. 数据库配置

### 5.1 PostgreSQL设置

```sql
-- 创建用户
CREATE USER topems WITH PASSWORD 'topems_secret';

-- 创建数据库
CREATE DATABASE topems OWNER topems;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE topems TO topems;
```

### 5.2 Redis设置

```bash
# 设置密码
redis-cli config set requirepass "topems_redis_secret"

# 保存配置
redis-cli config rewrite
```

---

## 6. 脚本使用说明

### 6.1 统一入口脚本（推荐）

`scripts/topems.sh` 是统一的服务管理入口，自动检测并选择合适的部署方案：

```bash
# 启动所有服务（自动检测方案）
bash scripts/topems.sh start

# 停止所有服务
bash scripts/topems.sh stop

# 查看服务状态
bash scripts/topems.sh status

# 列出所有服务
bash scripts/topems.sh list
```

### 6.2 编译构建

```bash
# 编译所有服务
bash scripts/topems.sh build

# 编译单一服务
bash scripts/topems.sh build iam
```

### 6.3 测试

```bash
# 运行所有测试
bash scripts/topems.sh test

# 运行单元测试
bash scripts/topems.sh test unit

# 运行集成测试
bash scripts/topems.sh test integration

# 生成覆盖率报告
bash scripts/topems.sh test coverage

# 运行静态分析
bash scripts/topems.sh test lint
```

### 6.4 单一服务管理

```bash
# 启动单一服务
bash scripts/topems.sh start-service iam

# 停止单一服务
bash scripts/topems.sh stop-service iam

# 重启单一服务
bash scripts/topems.sh restart-service iam

# 查看服务日志
bash scripts/topems.sh logs iam
```

### 6.5 环境变量管理

```bash
# 显示当前环境变量
bash scripts/topems.sh env show

# 导出环境变量到文件
bash scripts/topems.sh env export

# 从文件加载环境变量
bash scripts/topems.sh env load
```

### 6.6 AI模型管理

```bash
# AI模型管理（启动/停止/下载/测试）
bash scripts/topems.sh ai start
bash scripts/topems.sh ai pull qwen2.5:7b-instruct
bash scripts/topems.sh ai test
```

### 6.7 依赖安装

```bash
# 安装所有依赖
bash scripts/topems.sh install

# 仅安装数据库
bash scripts/topems.sh install-db

# 仅安装开发环境
bash scripts/topems.sh install-dev
```

### 6.8 Docker方案（直接调用）

```bash
# 启动所有服务
bash scripts/docker/topems-docker.sh start

# 停止所有服务
bash scripts/docker/topems-docker.sh stop

# 查看状态
bash scripts/docker/topems-docker.sh status
```

### 6.9 非Docker方案（直接调用）

```bash
# 安装依赖（首次运行）
bash scripts/standalone/install-deps.sh all

# 启动所有服务
bash scripts/standalone/topems-standalone.sh start

# 停止所有服务
bash scripts/standalone/topems-standalone.sh stop

# 查看状态
bash scripts/standalone/topems-standalone.sh status
```

---

## 7. 验证步骤

### 7.1 基础验证

```bash
# 检查数据库连接
psql -U topems -d topems -c "SELECT 1"

# 检查Redis连接
redis-cli -a topems_redis_secret ping

# 检查Ollama
curl http://localhost:11434/api/tags
```

### 7.2 服务验证

```bash
# 检查IAM服务
curl http://localhost:8000/health

# 检查前端
curl http://localhost:3000

# 检查AI服务
curl http://localhost:8062/health
```

---

## 8. 故障排除

### 8.1 常见问题

| 问题 | 解决方案 |
|------|---------|
| 端口被占用 | 使用 `lsof -i:<端口>` 查看占用进程并终止 |
| 数据库连接失败 | 检查数据库服务状态和连接参数 |
| Ollama模型加载失败 | 检查模型是否已下载，磁盘空间是否充足 |
| 服务启动超时 | 检查依赖服务是否正常运行 |

### 8.2 日志查看

```bash
# Docker方案日志
docker-compose logs <服务名>

# 非Docker方案日志
tail -f logs/<服务名>.log
```

---

## 附录：服务端口映射

| 服务 | 端口 |
|------|------|
| IAM | 8000 |
| Notification | 8004 |
| Portal | 8005 |
| Flow | 8006 |
| Integration | 8007 |
| ERP | 8010 |
| HRM | 8012 |
| CRM | 8013 |
| RS | 8020 |
| Doc | 8028 |
| LIMS | 8022 |
| PDM | 8023 |
| MES | 8030 |
| QMS | 8031 |
| EHS | 8032 |
| SCM | 8040 |
| SRM | 8041 |
| WMS | 8042 |
| File | 8050 |
| Mail | 8051 |
| IM | 8052 |
| GIS | 8053 |
| BI | 8060 |
| Report | 8061 |
| AI | 8062 |
| Mobile | 8070 |
| Frontend | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Ollama | 11434 |