# TOPEMS 部署操作手册

> **版本**: v1.0  
> **日期**: 2026-06-21  
> **状态**: 现行手册  
> **适用范围**: TOPEMS 系统部署与升级

---

## 目录

1. [概述](#1-概述)
2. [环境要求](#2-环境要求)
3. [部署模式](#3-部署模式)
4. [Docker 部署](#4-docker-部署)
5. [本地部署（非 Docker）](#5-本地部署非-docker)
6. [升级部署](#6-升级部署)
7. [验证测试](#7-验证测试)
8. [回滚方案](#8-回滚方案)
9. [常见问题](#9-常见问题)

---

## 1. 概述

### 1.1 手册目的

本文档提供 TOPEMS 系统的完整部署操作指南，包括：
- 首次部署（新环境安装）
- 升级部署（已有系统更新）
- 回滚操作（部署失败恢复）

### 1.2 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        负载均衡层                               │
│                    (Nginx / 云负载均衡)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Web 前端    │     │   API 网关    │     │   静态资源    │
│   (Port 3000) │     │   (Port 8000) │     │   (CDN)       │
└───────────────┘     └───────────────┘     └───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  unified-core │     │   topems-pm   │     │   topems-hrm  │
│   (Port 8000) │     │   (Port 8001) │     │   (Port 8011) │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │   PostgreSQL      │
                    │   (Port 5432)    │
                    └───────────────────┘
                              │
                    ┌───────────────────┐
                    │     Redis         │
                    │   (Port 6379)    │
                    └───────────────────┘
```

---

## 2. 环境要求

### 2.1 硬件要求

| 环境 | CPU | 内存 | 磁盘 | 说明 |
|------|-----|------|------|------|
| **开发环境** | 2核 | 4GB | 20GB | 单机部署 |
| **测试环境** | 4核 | 8GB | 50GB | 分离部署 |
| **生产环境** | 8核 | 16GB | 100GB | 高可用部署 |

### 2.2 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| **操作系统** | Ubuntu 20.04+ / CentOS 7+ | Linux 系统 |
| **Docker** | 20.10+ | 容器引擎 |
| **Docker Compose** | 2.0+ | 容器编排 |
| **PostgreSQL** | 14+ | 主数据库 |
| **Redis** | 6+ | 缓存服务 |

### 2.3 网络要求

| 端口 | 服务 | 说明 |
|------|------|------|
| 80/443 | HTTP/HTTPS | Web 访问 |
| 5432 | PostgreSQL | 数据库访问 |
| 6379 | Redis | 缓存访问 |
| 2375/2376 | Docker | 容器管理 |

### 2.4 前置检查

```bash
# 检查 Docker 版本
docker --version
# Docker version 20.10.x, build xxxxx

# 检查 Docker Compose 版本
docker-compose --version
# Docker Compose version v2.x.x

# 检查 PostgreSQL 客户端
psql --version
# psql (PostgreSQL) 14.x

# 检查 Redis 客户端
redis-cli --version
# redis-cli 6.x.x
```

---

## 3. 部署模式

TOPEMS 支持两种部署模式：

### 3.1 On-Premise 模式（私有化部署）

适用于企业内部使用，无需多租户隔离。

```bash
# 环境变量配置
DEPLOYMENT_MODE=on-premise
MULTI_TENANT_ENABLED=false
QUOTA_ENABLED=false
BILLING_ENABLED=false
TENANT_MANAGEMENT=false
```

### 3.2 SaaS 模式（多租户云服务）

适用于公有云服务，需要多租户隔离和计费功能。

```bash
# 环境变量配置
DEPLOYMENT_MODE=saas
MULTI_TENANT_ENABLED=true
QUOTA_ENABLED=true
BILLING_ENABLED=true
TENANT_MANAGEMENT=true
```

### 3.3 模式对比

| 功能 | On-Premise | SaaS |
|------|-----------|------|
| 多租户隔离 | ❌ | ✅ |
| 配额限制 | ❌ | ✅ |
| 计费功能 | ❌ | ✅ |
| 租户管理 | ❌ | ✅ |

---

## 4. 首次部署

### 4.1 准备工作

#### 步骤 1：创建部署目录

```bash
# 创建部署目录
sudo mkdir -p /opt/topems
sudo chown $USER:$USER /opt/topems

# 进入部署目录
cd /opt/topems
```

#### 步骤 2：获取部署文件

```bash
# 克隆项目（如果使用 Git）
git clone https://github.com/your-org/topems.git .

# 或复制部署文件
# scp user@server:/path/to/topems.tar.gz .
```

#### 步骤 3：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**完整的 .env 配置示例**：

```bash
# ================================================
# 部署模式配置（重要！）
# ================================================
# On-Premise 模式（私有化部署）
DEPLOYMENT_MODE=on-premise
MULTI_TENANT_ENABLED=false
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
QUOTA_ENABLED=false
BILLING_ENABLED=false
TENANT_MANAGEMENT=false

# ================================================
# 数据库配置
# ================================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=topems
DB_USER=topems
DB_PASSWORD=topems_secret

# ================================================
# Redis 配置
# ================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ================================================
# JWT 配置
# ================================================
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=86400
REFRESH_SECRET=your-refresh-secret-change-in-production
REFRESH_EXPIRY=604800

# ================================================
# 服务端口配置
# ================================================
CORE_PORT=8000
PM_PORT=8001
HRM_PORT=8011
```

### 4.2 数据库初始化

#### 步骤 4：创建数据库

```bash
# 启动基础服务（PostgreSQL 和 Redis）
docker-compose up -d postgres redis

# 等待数据库启动
sleep 10

# 创建数据库
docker-compose exec postgres psql -U topems -c "CREATE DATABASE topems;"

# 验证数据库创建
docker-compose exec postgres psql -U topems -c "\l"
```

#### 步骤 5：执行数据库初始化脚本

```bash
# 执行权限系统初始化脚本
docker-compose exec -T postgres psql -U topems -d topems < database/init/03_init_permissions.sql

# 验证权限数据
docker-compose exec postgres psql -U topems -d topems -c "SELECT COUNT(*) FROM core_permissions;"
docker-compose exec postgres psql -U topems -d topems -c "SELECT COUNT(*) FROM core_roles;"
docker-compose exec postgres psql -U topems -d topems -c "SELECT name FROM core_roles;"
```

**预期输出**：

```
 count
-------
    68
(1 row)

 count
-------
    5
(1 row)

       name
-----------------
 superadmin
 admin
 hr_admin
 project_manager
 employee
(5 rows)
```

### 4.3 服务启动

#### 步骤 6：启动所有服务

```bash
# 拉取最新镜像（如果使用 Docker Hub）
docker-compose pull

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

**预期输出**：

```
NAME                    COMMAND                  SERVICE             STATUS              PORTS
topems-postgres         "docker-entrypoint.s…"   postgres            running             5432/tcp
topems-redis            "docker-entrypoint.s…"   redis               running             6379/tcp
topems-core             "/app/unified-core"      core                running             0.0.0.0:8000->8000/tcp
topems-pm               "/app/topems-pm"         pm                  running             0.0.0.0:8001->8001/tcp
topems-hrm              "/app/topems-hrm"        hrm                 running             0.0.0.0:8011->8011/tcp
topems-web              "/docker-entrypoint.…"   web                 running             0.0.0.0:3000->3000/tcp
```

#### 步骤 7：验证服务健康状态

```bash
# 检查 unified-core 健康状态
curl -s http://localhost:8000/health | jq .

# 检查 PM 服务
curl -s http://localhost:8001/health | jq .

# 检查 HRM 服务
curl -s http://localhost:8011/health | jq .
```

**预期输出**：

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-06-21T10:00:00Z"
}
```

### 4.4 初始化验证

#### 步骤 8：验证管理员登录

```bash
# 使用默认管理员账户登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | jq .
```

**预期输出**：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "xxxx-xxxx-xxxx",
      "username": "admin",
      "full_name": "系统管理员",
      "email": "admin@topems.local"
    },
    "permissions": [
      "iam:read",
      "iam:write",
      "...",
      "iam:admin"
    ]
  }
}
```

#### 步骤 9：验证权限数据

```bash
# 获取 Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# 查询所有权限
curl -s http://localhost:8000/api/iam/permissions \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# 查询所有角色
curl -s http://localhost:8000/api/iam/roles \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

# 查询所有用户
curl -s http://localhost:8000/api/iam/users \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

---

## 5. 本地部署（非 Docker）

适用于不想使用 Docker 的环境，直接在本地编译和运行服务。

### 5.1 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| **Rust** | 1.70+ | 编译后端服务 |
| **Node.js** | 18+ | 运行前端 |
| **Yarn** | 1.22+ | 前端包管理 |
| **PostgreSQL** | 14+ | 主数据库 |
| **Redis** | 6+ | 缓存服务 |

### 5.2 安装依赖

#### 安装 Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### 安装 Node.js 和 Yarn

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 安装 Yarn
npm install -g yarn
```

#### 安装 PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

#### 安装 Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

### 5.3 部署步骤

#### 步骤 1：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**环境变量配置示例**：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=topems
DB_USER=topems
DB_PASSWORD=topems_secret

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=86400
REFRESH_SECRET=your-refresh-secret-change-in-production
REFRESH_EXPIRY=604800

# 服务端口
CORE_PORT=8000
PM_PORT=8001
HRM_PORT=8011
```

#### 步骤 2：创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库用户
CREATE USER topems WITH PASSWORD 'topems_secret';

# 创建数据库
CREATE DATABASE topems OWNER topems;

# 退出
\q
```

#### 步骤 3：执行数据库初始化

```bash
psql -U topems -d topems -f database/init/03_init_permissions.sql
```

**预期输出**：

```
 count
-------
    93
(1 row)
```

#### 步骤 4：编译后端服务

```bash
# 编译共享库
cd lib
cargo build --release
cd ..

# 编译 unified-core
cd svc/unified-core
cargo build --release
cd ../..

# 编译 PM 服务
cd svc/pm
cargo build --release
cd ../..

# 编译 HRM 服务
cd svc/hrm
cargo build --release
cd ../..
```

#### 步骤 5：安装前端依赖

```bash
cd apps/web
yarn install
cd ../..
```

#### 步骤 6：启动服务

```bash
# 启动 PostgreSQL（如果未运行）
sudo systemctl start postgresql

# 启动 Redis（如果未运行）
sudo systemctl start redis

# 启动 unified-core
cd svc/unified-core
./target/release/unified-core &

# 启动 PM 服务
cd svc/pm
./target/release/pm &

# 启动 HRM 服务
cd svc/hrm
./target/release/hrm &

# 启动前端
cd apps/web
yarn dev &
```

### 5.4 使用部署脚本

也可以使用自动化脚本进行部署：

```bash
# 添加执行权限
chmod +x scripts/deploy-local.sh
chmod +x scripts/stop-local.sh

# 运行部署脚本
./scripts/deploy-local.sh

# 停止服务
./scripts/stop-local.sh
```

### 5.5 验证部署

```bash
# 检查 unified-core 健康状态
curl -s http://localhost:8000/health | jq .

# 检查 PM 服务
curl -s http://localhost:8001/health | jq .

# 检查 HRM 服务
curl -s http://localhost:8011/health | jq .

# 测试管理员登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq .
```

### 5.6 停止服务

```bash
# 停止所有服务
pkill -f "unified-core"
pkill -f "topems-pm"
pkill -f "topems-hrm"
pkill -f "vite"
pkill -f "yarn"

# 或使用脚本
./scripts/stop-local.sh
```

### 5.7 本地部署目录结构

```
~/TOPEMS/
├── .env                    # 环境变量
├── lib/                    # 共享库
├── svc/
│   ├── unified-core/        # 核心服务
│   │   └── target/release/unified-core
│   ├── pm/                 # PM 服务
│   │   └── target/release/pm
│   └── hrm/                # HRM 服务
│       └── target/release/hrm
├── apps/web/               # 前端应用
└── database/
    └── init/
        └── 03_init_permissions.sql
```

---

## 6. 升级部署

### 6.1 Docker 升级

```bash
# 进入部署目录
cd /opt/topems

# 备份数据库
docker-compose exec -T postgres pg_dump -U topems topems > backup_$(date +%Y%m%d).sql

# 停止服务
docker-compose down

# 更新代码
git pull

# 启动基础服务
docker-compose up -d postgres redis

# 执行迁移脚本
docker-compose exec -T postgres psql -U topems -d topems < migrations/012_init_module_permissions.sql

# 重启所有服务
docker-compose up -d

# 运行健康检查
./scripts/health_check.sh
```

### 6.2 本地升级

```bash
# 备份数据库
pg_dump -U topems topems > backup_$(date +%Y%m%d).sql

# 停止服务
./scripts/stop-local.sh

# 更新代码
git pull

# 执行迁移脚本
psql -U topems -d topems < migrations/012_init_module_permissions.sql

# 重新编译
cd lib && cargo build --release && cd ..
cd svc/unified-core && cargo build --release && cd ../..
cd svc/pm && cargo build --release && cd ../..
cd svc/hrm && cargo build --release && cd ../..

# 启动服务
./scripts/deploy-local.sh
```

---

## 7. 验证测试

#### 步骤 1：备份数据

```bash
# 创建备份目录
BACKUP_DIR=/opt/topems/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U topems topems > $BACKUP_DIR/database.sql

# 备份环境变量
cp /opt/topems/.env $BACKUP_DIR/.env.backup

# 备份上传文件（如果有）
tar -czf $BACKUP_DIR/uploads.tar.gz /opt/topems/uploads

# 列出备份文件
ls -la $BACKUP_DIR/
```

#### 步骤 2：检查当前版本

```bash
# 查看当前部署版本
cat /opt/topems/.version

# 或从 API 获取
curl -s http://localhost:8000/api/version
```

#### 步骤 3：阅读升级说明

```bash
# 查看 CHANGELOG
cat /opt/topems/CHANGELOG.md

# 查看升级脚本（如果有）
ls -la /opt/topems/scripts/upgrade*
```

### 5.2 执行升级

#### 步骤 4：停止服务

```bash
# 进入部署目录
cd /opt/topems

# 停止服务
docker-compose down

# 确认所有容器已停止
docker-compose ps
```

#### 步骤 5：更新代码

```bash
# 拉取最新代码
git fetch origin
git pull origin main

# 或复制新的部署文件
# scp user@server:/path/to/new/topems.tar.gz .
```

#### 步骤 6：执行数据库迁移

```bash
# 启动基础服务
docker-compose up -d postgres redis

# 等待数据库就绪
sleep 5

# 执行迁移脚本
docker-compose exec -T postgres psql -U topems -d topems < migrations/012_init_module_permissions.sql

# 验证迁移结果
docker-compose exec postgres psql -U topems -d topems -c "SELECT code FROM core_permissions WHERE code LIKE 'qms:%' OR code LIKE 'system:%';"
```

**预期输出**：

```
      code
--------------
 qms:read
 qms:write
 qms:delete
 qms:admin
 system:settings
 system:monitor
 system:audit
 ...
(14 rows)
```

#### 步骤 7：启动服务

```bash
# 重新构建镜像（如果需要）
docker-compose build --no-cache

# 启动所有服务
docker-compose up -d

# 等待服务启动
sleep 15

# 查看服务状态
docker-compose ps
```

### 5.3 升级验证

#### 步骤 8：验证服务健康

```bash
# 检查所有服务健康状态
for service in core pm hrm; do
  port=$(grep "${service^^}_PORT" .env | cut -d= -f2)
  echo "Checking $service on port $port..."
  curl -s http://localhost:$port/health || echo "FAILED"
done
```

#### 步骤 9：验证功能

```bash
# 管理员登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq '.success'

# 查询权限（验证迁移成功）
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

curl -s http://localhost:8000/api/iam/permissions \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
```

**预期输出**：

```
true
68
```

#### 步骤 10：验证现有数据

```bash
# 验证用户数据未丢失
curl -s http://localhost:8000/api/iam/users \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# 验证角色数据未丢失
curl -s http://localhost:8000/api/iam/roles \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
```

---

## 8. 验证测试

### 8.1 健康检查

```bash
#!/bin/bash
# health_check.sh

echo "=== TOPEMS 健康检查 ==="
echo ""

# 检查数据库连接
echo "1. 数据库连接检查..."
docker-compose exec -T postgres pg_isready -U topems && echo "✅ OK" || echo "❌ FAILED"

# 检查 Redis 连接
echo "2. Redis 连接检查..."
docker-compose exec -T redis redis-cli ping && echo "✅ OK" || echo "❌ FAILED"

# 检查 Core 服务
echo "3. Core 服务检查..."
curl -s http://localhost:8000/health | jq -e '.status == "healthy"' && echo "✅ OK" || echo "❌ FAILED"

# 检查 PM 服务
echo "4. PM 服务检查..."
curl -s http://localhost:8001/health | jq -e '.status == "healthy"' && echo "✅ OK" || echo "❌ FAILED"

# 检查 HRM 服务
echo "5. HRM 服务检查..."
curl -s http://localhost:8011/health | jq -e '.status == "healthy"' && echo "✅ OK" || echo "❌ FAILED"

# 检查 Web 服务
echo "6. Web 服务检查..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200" && echo "✅ OK" || echo "❌ FAILED"

echo ""
echo "=== 健康检查完成 ==="
```

### 8.2 功能测试

```bash
#!/bin/bash
# functional_test.sh

echo "=== TOPEMS 功能测试 ==="
echo ""

# 获取 Token
echo "1. 管理员登录测试..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESULT | jq -r '.data.token')
if [ "$TOKEN" != "null" ]; then
  echo "✅ 登录成功"
else
  echo "❌ 登录失败"
  exit 1
fi

# 测试权限查询
echo "2. 权限查询测试..."
PERM_COUNT=$(curl -s http://localhost:8000/api/iam/permissions \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
if [ "$PERM_COUNT" -ge 60 ]; then
  echo "✅ 权限数量: $PERM_COUNT"
else
  echo "❌ 权限数量异常: $PERM_COUNT"
fi

# 测试角色查询
echo "3. 角色查询测试..."
ROLE_COUNT=$(curl -s http://localhost:8000/api/iam/roles \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
if [ "$ROLE_COUNT" -ge 5 ]; then
  echo "✅ 角色数量: $ROLE_COUNT"
else
  echo "❌ 角色数量异常: $ROLE_COUNT"
fi

# 测试用户查询
echo "4. 用户查询测试..."
USER_COUNT=$(curl -s http://localhost:8000/api/iam/users \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
if [ "$USER_COUNT" -ge 1 ]; then
  echo "✅ 用户数量: $USER_COUNT"
else
  echo "❌ 用户数量异常: $USER_COUNT"
fi

echo ""
echo "=== 功能测试完成 ==="
```

### 8.3 权限验证矩阵

| 测试项 | 预期结果 | 验证方法 |
|--------|---------|---------|
| 超级管理员权限 | 68个权限全部拥有 | 登录后检查 permissions 数组 |
| admin 角色权限 | IAM + 基础设施权限 | 查询角色权限列表 |
| hr_admin 角色权限 | HRM + 基础只读权限 | 查询角色权限列表 |
| 权限继承 | admin 包含 write/read | 检查权限列表包含关系 |
| 基础设施联动 | iam:read 包含 doc:read | 检查权限列表包含关系 |

---

## 9. 回滚方案

### 9.1 回滚触发条件

执行回滚的条件：
- 迁移脚本执行失败
- 服务启动失败
- 关键功能测试不通过
- 生产环境出现严重问题

### 9.2 回滚步骤

#### 步骤 1：停止服务

```bash
cd /opt/topems
docker-compose down
```

#### 步骤 2：恢复数据库

```bash
# 查找最新备份
BACKUP_FILE=$(ls -t /opt/topems/backups/*/database.sql | head -1)

if [ -f "$BACKUP_FILE" ]; then
  echo "使用备份: $BACKUP_FILE"
  
  # 停止数据库容器
  docker-compose stop postgres
  
  # 删除现有数据库
  docker-compose exec -T postgres dropdb -U topems topems
  
  # 重新创建数据库
  docker-compose exec -T postgres createdb -U topems topems
  
  # 恢复数据
  docker-compose exec -T postgres psql -U topems -d topems < $BACKUP_FILE
  
  echo "✅ 数据库已恢复"
else
  echo "❌ 未找到备份文件"
fi
```

#### 步骤 3：恢复环境变量

```bash
# 查找最新环境变量备份
ENV_BACKUP=$(ls -t /opt/topems/backups/*/.env.backup | head -1)

if [ -f "$ENV_BACKUP" ]; then
  echo "使用环境变量备份: $ENV_BACKUP"
  cp $ENV_BACKUP /opt/topems/.env
else
  echo "❌ 未找到环境变量备份"
fi
```

#### 步骤 4：恢复代码版本

```bash
# 回滚到上一个稳定版本
cd /opt/topems
git reset --hard HEAD~1
git clean -fd
```

#### 步骤 5：重新启动

```bash
# 启动基础服务
docker-compose up -d postgres redis

# 等待数据库就绪
sleep 10

# 启动所有服务
docker-compose up -d

# 验证回滚
sleep 10
docker-compose ps
```

### 9.3 回滚后验证

```bash
# 验证服务状态
docker-compose ps

# 验证健康检查
curl -s http://localhost:8000/health

# 验证管理员登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq '.success'

# 验证数据完整性
docker-compose exec postgres psql -U topems -d topems -c "SELECT COUNT(*) FROM core_users;"
docker-compose exec postgres psql -U topems -d topems -c "SELECT COUNT(*) FROM core_roles;"
```

---

## 10. 常见问题

### 10.1 数据库连接失败

**问题**：无法连接到 PostgreSQL

**解决方案**：
```bash
# 检查容器状态
docker-compose ps postgres

# 查看日志
docker-compose logs postgres

# 检查网络连接
docker-compose exec core ping postgres
```

### 10.2 权限数据不完整

**问题**：权限数量少于预期（68个）

**解决方案**：
```bash
# 重新执行初始化脚本
docker-compose exec -T postgres psql -U topems -d topems < database/init/03_init_permissions.sql

# 验证权限数量
docker-compose exec postgres psql -U topems -d topems -c "SELECT COUNT(*) FROM core_permissions;"
```

### 10.3 管理员登录失败

**问题**：admin 用户无法登录

**解决方案**：
```bash
# 重置 admin 密码（密码：admin123）
docker-compose exec postgres psql -U topems -d topems -c "
UPDATE core_users 
SET password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TH2wTw7P6OqE1.'
WHERE username = 'admin';
"

# 重新关联角色
docker-compose exec postgres psql -U topems -d topems -c "
INSERT INTO core_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core_users u, core_roles r
WHERE u.username = 'admin' AND r.name = 'superadmin'
ON CONFLICT DO NOTHING;
"
```

### 10.4 迁移脚本执行失败

**问题**：迁移脚本执行报错

**解决方案**：
```bash
# 查看详细错误
docker-compose exec -T postgres psql -U topems -d topems < migrations/012_init_module_permissions.sql 2>&1

# 常见错误处理：
# 1. 表已存在 - 使用 IF NOT EXISTS 或 DO NOTHING
# 2. 列已存在 - 使用 ADD COLUMN IF NOT EXISTS
# 3. 索引已存在 - 使用 CREATE INDEX IF NOT EXISTS
```

### 10.5 服务启动失败

**问题**：容器启动后立即退出

**解决方案**：
```bash
# 查看容器日志
docker-compose logs core
docker-compose logs pm
docker-compose logs hrm

# 常见错误：
# 1. 端口被占用 - 修改 .env 中的端口配置
# 2. 环境变量缺失 - 检查 .env 文件
# 3. 数据库连接失败 - 检查 DB_HOST 配置
```

---

## 附录

### A. 快速命令参考

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启单个服务
docker-compose restart core

# 进入容器
docker-compose exec core /bin/bash

# 执行 SQL
docker-compose exec -T postgres psql -U topems -d topems -c "SELECT 1;"
```

### B. 目录结构

```
/opt/topems/
├── .env                 # 环境变量配置
├── docker-compose.yml   # Docker Compose 配置
├── database/
│   └── init/
│       └── 03_init_permissions.sql  # 权限系统初始化
├── migrations/
│   └── 012_init_module_permissions.sql  # 权限迁移脚本
├── backups/             # 备份目录
│   └── 20260621_100000/
│       ├── database.sql
│       └── .env.backup
└── logs/                # 日志目录
```

### C. 联系支持

如遇问题，请联系：
- 技术支持邮箱：support@topems.local
- 技术文档：https://docs.topems.local

---

**文档版本**：v1.0  
**最后更新**：2026-06-21  
**维护人**：TOPEMS 团队
