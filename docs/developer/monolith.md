# TOPEMS 模块化单体模式开发指南

## 概述

TOPEMS 支持两种开发模式：

1. **独立服务模式（Standalone）**：每个业务模块作为独立的服务运行，监听不同的端口
2. **模块化单体模式（Monolith）**：所有业务模块以 `real_module` 方式嵌入 `topems-server` 统一入口，监听单一端口

模块化单体模式是本地开发的推荐方式，具有以下优势：

- **启动快速**：只需启动一个后端服务，无需启动 30+ 个独立服务
- **资源占用低**：共享数据库连接池、内存和 CPU
- **调试方便**：所有模块在同一进程中，断点调试更简单
- **部署灵活**：可以在生产环境切换为独立服务模式

## 快速开始

### 前置条件

1. 安装 Rust 工具链（stable）
2. 安装 Node.js 18+ 和 pnpm
3. 启动 PostgreSQL 和 Redis

### 启动模块化单体模式

```bash
# 启动数据库（如果尚未启动）
./scripts/dev/start-local.sh db

# 启动模块化单体模式（后端 + 前端）
./scripts/dev/start-local.sh monolith
```

### 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:8099
- 健康检查：http://localhost:8099/api/server/health

### 默认账号

- 用户名：admin
- 密码：admin

## 环境变量配置

### 前端环境变量

在 `apps/web/.env.local` 中添加：

```env
VITE_MONOLITH=1
```

### 后端环境变量

在根目录 `.env` 中添加：

```env
VITE_MONOLITH=1
```

## 架构说明

### 模块化单体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        topems-server:8099                   │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│   IAM   │   CRM   │   ERP   │   MES   │   LIMS  │   ...   │
│ (iam)   │ (crm)   │ (erp)   │ (mes)   │ (lims)  │ (31个)  │
├─────────┴─────────┴─────────┴─────────┴─────────┴─────────┤
│                    Shared Database (PostgreSQL)             │
└─────────────────────────────────────────────────────────────┘
```

### 请求流程

1. 前端发起请求到 `http://localhost:3000/api/...`
2. Vite 开发服务器代理请求到 `http://localhost:8099/api/...`
3. `topems-server` 路由请求到对应的业务模块
4. 业务模块处理请求并返回响应

## 开发指南

### 添加新模块

1. 在 `svc/` 目录下创建新的模块 crate
2. 在 `topems-server` 的 `main.rs` 中注册模块
3. 在 `apps/web/vite.config.ts` 的 `SERVICES` 数组中添加服务配置
4. 在 `apps/web/src/api/` 目录下创建对应的 API 客户端

### 调试技巧

#### 后端调试

```bash
# 使用 cargo run 直接启动（带调试日志）
SQLX_OFFLINE=false cargo run -p topems-server
```

#### 前端调试

```bash
# 使用 vite 直接启动（带热更新）
VITE_MONOLITH=1 pnpm dev:web
```

#### 数据库调试

```bash
# 连接数据库
psql postgres://topems:topems_secret@localhost:5432/topems

# 查看 RLS 策略
SELECT * FROM pg_policies WHERE policyname = 'tenant_isolation';
```

## 常见问题

### 问题 1：前端代理返回 503 错误

**原因**：VITE_MONOLITH 环境变量未设置，前端代理尝试连接独立服务端口。

**解决**：确保 `apps/web/.env.local` 中设置了 `VITE_MONOLITH=1`。

### 问题 2：数据库连接错误

**原因**：数据库连接池配置不正确。

**解决**：在 `scripts/run_monolith.sh` 中设置 `DB_MAX_CONNECTIONS=5`。

### 问题 3：RLS 策略未生效

**原因**：数据库中未设置 `app.tenant_id`。

**解决**：在中间件中设置 `current_setting('app.tenant_id', true)`。

## 从独立服务模式迁移

### 步骤 1：更新环境变量

```bash
# 在 .env 中添加
echo "VITE_MONOLITH=1" >> .env

# 在 apps/web/.env.local 中添加
echo "VITE_MONOLITH=1" >> apps/web/.env.local
```

### 步骤 2：启动模块化单体服务

```bash
# 启动模块化单体模式
./scripts/dev/start-local.sh monolith
```

### 步骤 3：验证服务

```bash
# 检查健康状态
curl http://localhost:8099/api/server/health

# 检查前端
curl http://localhost:3000
```

## 生产部署

### Docker Compose

```yaml
version: '3.8'
services:
  topems-server:
    build: .
    ports:
      - "8099:8099"
    environment:
      - DATABASE_URL=postgres://topems:topems_secret@postgres:5432/topems
      - REDIS_URL=redis://redis:6379
      - DB_MAX_CONNECTIONS=5
    depends_on:
      - postgres
      - redis

  topems-web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - topems-server
```

## 性能优化

### 数据库连接池

模块化单体模式下，所有模块共享同一个数据库连接池。建议设置：

```env
DB_MAX_CONNECTIONS=5
```

### 搜索路径

确保 `search_path` 包含所有需要的 schema：

```env
SEARCH_PATH=flow, mobile, rs, erp, public, iam, shared
```

## 相关文档

- [开发环境搭建](./setup.md)
- [数据库设计](../../database/schema.md)
- [API 设计](../../api/design.md)
- [部署指南](../../deployment/README.md)
