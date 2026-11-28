# AI 业务智能模块 - 部署验证指南

> **环境边界（2026-11-13 实测）**：文中 docker-compose 与 `topems` 库示例为历史/通用模板，**不是当前本机生产**。当前生产为 macOS launchd（`com.topems.server`，`:8099`），生产库 `topems_prod`（`ehs` 71 表）；旧库 `topems`（65 表）不是生产。当前部署以 `docs/deploy/macos-deployment.md` 为准。

## 概述

本文档描述了 AI 业务智能模块的部署验证流程，包括部署前检查、部署步骤、部署后验证和常见问题排查。

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  Web 浏览器 (React)  /  移动端  /  API 客户端               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                      反向代理层                               │
│  Nginx / Traefik (SSL 终止 / 负载均衡 / 静态资源)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      应用服务层                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  后端服务 (Rust)  │  │  前端服务 (Node)  │                │
│  │  topems-unified-  │  │  topems-portal    │                │
│  │  core             │  │                    │                │
│  └────────┬─────────┘  └──────────────────┘                │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│                      数据存储层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │  │ 向量数据库│  │
│  │ (业务数据)│  │ (缓存/会话)│  │(文档/文件)│  │(RAG/嵌入) │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 部署前检查清单

### 1. 硬件要求

| 组件 | 最低配置 | 推荐配置 | 说明 |
|------|----------|----------|------|
| CPU | 4 核 | 8 核+ | AI 推理需要更多 CPU |
| 内存 | 8 GB | 16 GB+ | 向量检索和缓存需要内存 |
| 磁盘 | 50 GB | 100 GB+ | 文档存储和日志 |
| 网络 | 100 Mbps | 1 Gbps | 大文件上传和模型下载 |

### 2. 软件要求

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Docker | 20.10+ | 24.0+ | 容器运行时 |
| Docker Compose | 2.0+ | 2.20+ | 容器编排 |
| PostgreSQL | 13+ | 15+ | 关系型数据库 |
| Redis | 6.0+ | 7.0+ | 缓存和会话存储 |
| Nginx | 1.18+ | 1.24+ | 反向代理 |
| Node.js | 18+ | 20+ | 前端构建和运行 |
| Rust | 1.70+ | 1.75+ | 后端编译（仅源码部署） |

### 3. 环境变量检查

```bash
# 必需的环境变量
export DATABASE_URL="postgresql://user:password@localhost:5432/topems"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET="your-secret-key-here"
export AI_API_KEY="your-ai-provider-api-key"
export AI_PROVIDER="openai"  # 或 mock / azure / anthropic

# 可选的环境变量
export SERVER_PORT="8080"
export LOG_LEVEL="info"
export CACHE_ENABLED="true"
export RAG_ENABLED="true"
export KNOWLEDGE_GRAPH_ENABLED="true"
```

## 部署步骤

### 方式一：Docker Compose 部署（推荐）

#### 1. 克隆代码

```bash
git clone https://github.com/your-org/topems.git
cd topems
```

#### 2. 配置环境变量

```bash
cp deploy/docker/.env.example deploy/docker/.env
vim deploy/docker/.env
```

#### 3. 启动服务

```bash
cd deploy/docker
docker-compose up -d
```

#### 4. 查看服务状态

```bash
docker-compose ps
docker-compose logs -f
```

#### 5. 初始化数据库

```bash
docker-compose exec backend cargo sqlx migrate run
```

#### 6. 创建管理员账户

```bash
docker-compose exec backend ./topems-unified-core create-admin --username admin --password your-password
```

### 方式二：源码部署

#### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm
```

#### 2. 编译后端

```bash
cd topems
cargo build --release -p topems-unified-core
```

#### 3. 构建前端

```bash
cd apps/web
pnpm install
pnpm build
```

#### 4. 启动后端服务

```bash
cd ../..
./target/release/topems-unified-core &
```

#### 5. 启动前端服务

```bash
cd apps/web
pnpm start --port 3000 &
```

#### 6. 配置 Nginx

```bash
sudo cp deploy/nginx/topems.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

## 部署后验证

### 1. 基础服务验证

```bash
# 检查后端服务
curl -s http://localhost:8080/health | jq .

# 检查前端服务
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# 检查数据库连接
docker-compose exec postgres pg_isready -U topems

# 检查 Redis 连接
docker-compose exec redis redis-cli ping
```

### 2. AI 业务智能模块健康检查

```bash
# 运行健康检查脚本
chmod +x scripts/deploy/ai-health-check.sh
./scripts/deploy/ai-health-check.sh http://localhost:8080 your-auth-token
```

健康检查脚本会验证以下内容：
- 基础连通性（3 个端点）
- 业务 Copilot API（8 个端点）
- 智能表单 API（7 个端点）
- 文档智能 API（10 个端点）
- 治理仪表盘 API（13 个端点）

### 3. 功能验证

#### 3.1 业务 Copilot 验证

```bash
# 创建会话
curl -X POST http://localhost:8080/api/ai/dsh/copilot/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"module":"erp"}' | jq .

# 发送消息
curl -X POST http://localhost:8080/api/ai/dsh/copilot/sessions/{session_id}/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"session_id":"{session_id}","user_input":"查询本月采购订单","module":"erp"}' | jq .
```

#### 3.2 智能表单验证

```bash
# 获取表单定义
curl http://localhost:8080/api/ai/dsh/forms/definitions/purchase_request \
  -H "Authorization: Bearer your-token" | jq .

# 验证表单
curl -X POST http://localhost:8080/api/ai/dsh/forms/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"form_type":"purchase_request","data":{"title":"测试采购","amount":1000}}' | jq .
```

#### 3.3 治理仪表盘验证

```bash
# 获取仪表盘数据
curl "http://localhost:8080/api/ai/governance/dashboard?time_range=24h" \
  -H "Authorization: Bearer your-token" | jq .

# 获取治理评分
curl "http://localhost:8080/api/ai/governance/score?time_range=24h" \
  -H "Authorization: Bearer your-token" | jq .
```

### 4. 性能验证

```bash
# 运行性能测试（需要安装 k6）
k6 run tests/performance/ai-business-copilot.k6.js
k6 run tests/performance/ai-governance-dashboard.k6.js
k6 run tests/performance/ai-business-intelligence-comprehensive.k6.js
```

### 5. 前端页面验证

在浏览器中访问以下页面，验证功能正常：

| 页面 | URL | 验证内容 |
|------|-----|----------|
| 业务 Copilot | http://localhost:3000/ai/business-copilot | 模块选择、对话、表单、文档 |
| 治理仪表盘 | http://localhost:3000/ai/governance-dashboard | 评分、风险、合规、成本、性能 |
| 登录页 | http://localhost:3000/login | 登录功能 |
| 仪表盘 | http://localhost:3000/dashboard | 数据展示 |

## 常见问题排查

### 1. 后端服务启动失败

**症状**：`connection refused` 或服务立即退出

**排查步骤**：
```bash
# 查看服务日志
docker-compose logs backend

# 检查数据库连接
docker-compose exec postgres pg_isready

# 检查环境变量
docker-compose exec backend env | grep -E "DATABASE|REDIS|JWT"
```

**常见原因**：
- 数据库未启动或连接信息错误
- Redis 未启动
- JWT_SECRET 未设置
- 端口被占用

### 2. AI 功能不可用

**症状**：Copilot 回复为空或报错

**排查步骤**：
```bash
# 检查 AI Provider 配置
curl http://localhost:8080/api/ai/dsh/provider/config \
  -H "Authorization: Bearer your-token" | jq .

# 测试 AI Provider 连通性
curl -X POST http://localhost:8080/api/ai/dsh/provider/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"provider":"mock"}' | jq .
```

**常见原因**：
- AI_API_KEY 未设置或无效
- AI_PROVIDER 配置错误
- 网络无法访问 AI 服务
- 使用 mock provider 但未正确配置

### 3. 前端页面白屏

**症状**：访问前端页面显示空白

**排查步骤**：
```bash
# 检查前端构建是否成功
ls -la apps/web/dist/

# 检查 Nginx 配置
sudo nginx -t

# 查看浏览器控制台错误
# F12 -> Console
```

**常见原因**：
- 前端未构建或构建失败
- Nginx 配置错误
- 静态资源路径错误
- API 地址配置错误

### 4. 数据库迁移失败

**症状**：`sqlx migrate run` 报错

**排查步骤**：
```bash
# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1"

# 查看迁移状态
cargo sqlx migrate info

# 手动执行迁移
cargo sqlx migrate run --source migrations
```

**常见原因**：
- 数据库用户权限不足
- 迁移文件损坏
- 数据库版本不兼容

### 5. 性能不佳

**症状**：API 响应慢或超时

**排查步骤**：
```bash
# 查看系统资源
top -bn1 | head -20
free -h
df -h

# 查看数据库性能
docker-compose exec postgres psql -U topems -c "SELECT * FROM pg_stat_activity;"

# 查看 Redis 性能
docker-compose exec redis redis-cli info stats

# 运行性能测试
k6 run tests/performance/ai-business-intelligence-comprehensive.k6.js
```

**优化建议**：
- 增加服务器资源（CPU/内存）
- 启用缓存（Redis）
- 优化数据库查询（添加索引）
- 使用连接池
- 启用 CDN 加速静态资源

## 监控和告警

### 1. 健康检查端点

| 端点 | 说明 | 预期响应 |
|------|------|----------|
| `/health` | 基础健康检查 | `{"status":"ok"}` |
| `/health/ready` | 就绪检查 | `{"status":"ready"}` |
| `/health/live` | 存活检查 | `{"status":"alive"}` |
| `/metrics` | Prometheus 指标 | 文本格式指标 |

### 2. 关键监控指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| API 响应时间 P95 | > 3 秒 | 接口响应过慢 |
| API 错误率 | > 5% | 接口错误过多 |
| CPU 使用率 | > 80% | CPU 资源不足 |
| 内存使用率 | > 85% | 内存资源不足 |
| 磁盘使用率 | > 90% | 磁盘空间不足 |
| 数据库连接数 | > 80% 最大连接 | 数据库连接池耗尽 |
| Redis 内存使用率 | > 80% | Redis 内存不足 |

### 3. 日志查看

```bash
# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis

# 查看 Nginx 日志
docker-compose logs -f nginx
```

## 备份和恢复

### 1. 数据库备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U topems topems > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T postgres psql -U topems topems < backup_20240101.sql
```

### 2. 文件备份

```bash
# 备份上传文件
tar -czf files_backup_$(date +%Y%m%d).tar.gz /data/topems/uploads

# 恢复文件
tar -xzf files_backup_20240101.tar.gz -C /data/topems/
```

### 3. 配置备份

```bash
# 备份配置文件
tar -czf config_backup_$(date +%Y%m%d).tar.gz deploy/docker/.env deploy/nginx/
```

## 升级和回滚

### 1. 升级步骤

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 停止旧服务
docker-compose down

# 启动新服务
docker-compose up -d

# 运行数据库迁移
docker-compose exec backend cargo sqlx migrate run

# 验证服务
./scripts/deploy/ai-health-check.sh
```

### 2. 回滚步骤

```bash
# 查看历史版本
git log --oneline -10

# 回滚到指定版本
git checkout <commit-hash>

# 重新构建并启动
docker-compose build
docker-compose down
docker-compose up -d

# 恢复数据库备份（如需要）
docker-compose exec -T postgres psql -U topems topems < backup_before_upgrade.sql
```

## 相关文档

- [部署脚本](../scripts/deploy/production-deploy.sh)
- [健康检查脚本](../scripts/deploy/ai-health-check.sh)
- [Docker Compose 配置](../deploy/docker/docker-compose.yml)
- [Nginx 配置](../deploy/nginx/topems.conf)
- [性能测试指南](../testing/AI_BUSINESS_INTELLIGENCE_PERFORMANCE_GUIDE.md)
- [联调测试计划](../testing/AI_BUSINESS_INTEGRATION_TEST_PLAN.md)
