# TOPEMS 快速入门指南

> 5 分钟内启动 TOPEMS 平台（**默认本地部署，无需 Docker**）

## 概述

本指南帮助你在最短时间内启动并运行 TOPEMS 企业级数字化平台。

> **重要：** TOPEMS 默认采用**本地进程部署**方式（所有服务作为本地进程直接运行），Docker 仅作为可选的容器化打包方案。所有脚本、文档、环境配置均以本地部署为默认。

## 前提条件

| 软件 | 最低版本 | 检查命令 | 说明 |
|------|----------|----------|------|
| Node.js | 18+ | `node --version` | 前端运行时 |
| pnpm | 8+ | `pnpm --version` | Node.js 包管理 |
| Rust | 1.76+ | `rustc --version` | 后端编译 |
| PostgreSQL | 14+ | `psql --version` | 数据库（本地安装） |
| Redis | 7+ | `redis-cli --version` | 缓存（本地安装，可选） |
| Ollama | 最新 | `ollama --version` | 本地 AI（可选） |

> **Docker 不是必需的。** 本地安装 PostgreSQL 和 Redis 是首选方式（macOS 推荐 Homebrew，Linux 推荐 apt/yum）。

## ⚡ 一键启动（推荐）

最快的启动方式 - 一个命令启动所有服务：

```bash
# 在项目根目录
pnpm dev
# 或
./scripts/start-local.sh
```

脚本会自动：
1. 检查环境依赖
2. 启动本地 PostgreSQL 和 Redis（macOS 通过 Homebrew）
3. 创建数据库（如不存在）
4. 启动后端 unified-core（端口 8000）
5. 启动 topems-core 微前端（端口 3001）
6. 启动 topems-portal 主前端（端口 3000）

启动完成后访问：
- **Web 门户**: http://localhost:3000
- **API 网关**: http://localhost:8000
- **默认账号**: admin / admin123

## 快速启动

### 步骤 1：克隆项目

```bash
git clone <repository-url>
cd TOPEMS
```

### 步骤 2：安装依赖

```bash
# 安装 Node.js 依赖（pnpm workspace）
pnpm install

# 安装/编译 Rust 依赖（首次会需要 5-10 分钟）
cargo build --workspace
# 或者使用项目脚本
./scripts/install-deps.sh
```

### 步骤 3：启动本地数据库（无需 Docker）

**macOS（推荐 Homebrew）：**

```bash
# 安装 PostgreSQL 和 Redis
brew install postgresql@16 redis

# 启动服务
brew services start postgresql@16
brew services start redis

# 创建数据库
createdb topems
```

**Linux（Ubuntu/Debian）：**

```bash
# 安装
sudo apt install -y postgresql postgresql-contrib redis-server

# 启动
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server

# 创建用户和数据库
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'topems_secret';"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"
```

> **不使用 Docker。** 上面是默认推荐方式。如果你确实需要 Docker，可参考 `docker/` 目录的 `docker-compose.yml`（仅作为可选方案）。

### 步骤 4：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 生成 JWT 密钥（必须！）
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
```

> 所有环境变量都已经在 `.env.example` 中配置为本地默认值，开箱即用。

### 步骤 5：启动后端服务

```bash
# 一键启动（推荐）
./scripts/topems.sh start iam
# 或
pnpm dev:backend

# 编译 + 启动所有后端
./scripts/topems.sh start-all
```

**预期输出**：

```
✅ unified-core (8000) - 运行中
[DETAIL] 注册 erp 到 unified-core...
[DETAIL] erp 注册成功
✅ erp (8010) - 运行中
[DETAIL] 注册 hrm 到 unified-core...
[DETAIL] hrm 注册成功
✅ hrm (8020) - 运行中
... （其他服务按需启动）
```

> 后端是 Rust 进程，**直接运行在本地端口上**，不是容器。
> 服务启动后会**自动向 unified-core 注册**，无需手动配置。

### 步骤 6：启动前端

```bash
# 主前端（3000）
cd apps/web
pnpm dev

# 或者从根目录
pnpm dev:web

# Core 微前端（3001）- 独立终端
cd apps/core
pnpm dev
# 或
pnpm dev:core
```

### 步骤 7：访问系统

| 服务 | URL |
|------|-----|
| 前端 | http://localhost:3000 |
| Core 微前端 | http://localhost:3001 |
| API 网关 | http://localhost:8000 |
| 健康检查 | http://localhost:8000/health |

**默认账号**：
- 用户名：`admin`
- 密码：`admin123`

---

## 验证安装

### 1. 健康检查

```bash
# 核心服务
curl http://localhost:8000/health

# AI 服务（如已启动）
curl http://localhost:8013/health

# HRM 服务（如已启动）
curl http://localhost:8020/health
```

### 2. 插件注册验证

服务启动后会自动向 unified-core 注册，验证注册是否成功：

```bash
# 查看已注册插件列表
curl -s http://localhost:8000/api/plugins/info | python3 -m json.tool

# 预期输出（部分）
# {
#     "success": true,
#     "data": [
#         {
#             "code": "erp",
#             "name": "ERP系统",
#             "runtime_status": "running",
#             "runtime_url": "http://localhost:8010"
#         },
#         {
#             "code": "lims",
#             "name": "实验室管理",
#             "runtime_status": "running",
#             "runtime_url": "http://localhost:8051"
#         }
#     ]
# }
```

### 3. API 测试

```bash
# 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# 获取当前用户
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/iam/users/me

# 获取员工列表（如 HRM 已启动）
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8020/api/hrm/employees
```

### 4. AI 测试（可选）

```bash
# 启动 Ollama
ollama serve

# 拉取模型
ollama pull qwen2.5:7b-instruct

# 智能对话
curl -X POST http://localhost:8000/api/core/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，TOPEMS"}'
```

---

## 常用命令

### 服务管理

```bash
# 启动所有服务
./scripts/topems.sh start-all

# 启动指定服务
./scripts/topems.sh start hrm

# 停止所有服务
./scripts/topems.sh stop-all

# 重启服务
./scripts/topems.sh restart hrm

# 查看服务状态
./scripts/topems.sh status

# 查看日志
./scripts/topems.sh logs iam

# 一键启动（含数据库和前端）
./scripts/start-local.sh
```

### 前端

```bash
# 根目录快捷方式
pnpm dev:web          # apps/web (3000)
pnpm dev:core         # apps/core (3001)

# 或进入子目录
cd apps/web && pnpm dev
cd apps/core && pnpm dev
```

### 数据库

```bash
# 连接数据库
psql -U topems -d topems

# 查看表
\dt

# 查看数据
SELECT * FROM iam.users LIMIT 10;
```

---

## 下一步

- 📖 阅读 [架构设计](./architecture/overview.md) 了解系统架构
- 🚀 阅读 [部署指南](./deployment-guide.md) 部署到生产环境
- 🔌 阅读 [API 文档](./api/README.md) 集成 API
- 🔧 遇到问题查看 [故障排查手册](./TROUBLESHOOTING.md)

---

## 常见问题

### Q: 必须使用 Docker 吗？

A: **不需要**。本地进程部署是默认方式。Docker 仅在需要离线分发或容器化部署时使用。

### Q: 启动失败，提示端口被占用？

A: 清理端口后重试：

```bash
# 清理所有 TOPEMS 端口
for port in 3000 3001 8000 8010 8011 8013 8020 8023 8029 8030 8031 8040 8041 8042 8050 8051 8052 8053 8060 8061 8063 8070 8071 8072; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done

./scripts/start-local.sh
```

### Q: 数据库连接失败？

A: 检查 PostgreSQL 是否运行：

```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# 测试连接
psql -U topems -d topems -c "SELECT 1"
```

### Q: AI 服务无法响应？

A: 启动 Ollama 并下载模型：

```bash
ollama serve
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

### Q: 如何修改默认端口？

A: 编辑 `config/services.yaml` 和 `.env` 文件。所有服务端口都在本地配置中，不依赖容器端口映射。

---

## 获取帮助

- 📖 [完整文档中心](./README.md)
- 🐛 [故障排查](./TROUBLESHOOTING.md)
- 🔄 [变更日志](./CHANGELOG.md)
- 📋 [TODO 列表](./TODO.md)
- 💬 提交 Issue
