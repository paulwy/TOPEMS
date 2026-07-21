# TOPEMS 本地部署指南

> **本地部署是 TOPEMS 的默认方式**。所有环境、脚本、文档、配置都以本地部署为默认，Docker 仅作为可选的容器化打包方案。

## 概述

本文档详细说明如何在本机以**本地进程**方式运行 TOPEMS 平台（无需 Docker）。这种部署方式的优势：

- ✅ **无依赖**：不依赖 Docker daemon、镜像仓库、容器网络
- ✅ **易调试**：直接访问本地进程，IDE 调试器可附加
- ✅ **快速启动**：无需拉取/构建镜像，直接 cargo run / pnpm dev
- ✅ **资源占用低**：仅启动需要的服务，不占用额外容器开销
- ✅ **跨平台**：macOS / Linux / Windows (WSL) 同样工作

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     本机 (localhost)                         │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐         │
│  │ apps/web │    │ apps/core│    │ svc/*        │         │
│  │  (3000)  │    │  (3001)  │    │ (Rust 后端)  │         │
│  │  Vite    │    │  Vite    │    │ unified-core │         │
│  └────┬─────┘    └────┬─────┘    │ (8000)       │         │
│       │               │          │ hrm (8020)   │         │
│       │               │          │ crm (8029)   │         │
│       │               │          │ pm  (8023)   │         │
│       │               │          │ ...          │         │
│       │               │          └──────┬───────┘         │
│       └───────────────┴─────────────────┘                 │
│                          │                                  │
│                  ┌───────▼───────┐                          │
│                  │  PostgreSQL   │                          │
│                  │   (5432)      │                          │
│                  └───────────────┘                          │
│                                                             │
│                  ┌───────────────┐                          │
│                  │    Redis      │                          │
│                  │   (6379)      │                          │
│                  └───────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 安装系统依赖

**macOS:**

```bash
# 使用 Homebrew
brew install node@18 postgresql@16 redis rust
brew services start postgresql@16
brew services start redis

# 创建数据库
createdb topems
```

**Linux (Ubuntu/Debian):**

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# PostgreSQL + Redis
sudo apt install -y postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server

# 创建数据库
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'topems_secret';"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"
```

**Windows (WSL2):**

参考 Ubuntu/Debian 步骤，在 WSL2 终端中执行。

### 2. 克隆和初始化

```bash
git clone <repository-url>
cd TOPEMS

# 复制环境变量
cp .env.example .env

# 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
```

### 3. 安装项目依赖

```bash
# Node.js 依赖
pnpm install

# Rust 依赖（首次需要 5-10 分钟）
cargo build --workspace
```

### 4. 一键启动

```bash
./scripts/start-local.sh
```

或使用 `pnpm`：

```bash
pnpm dev
```

启动完成后访问：

- **Web 门户**: http://localhost:3000
- **API 网关**: http://localhost:8000
- **默认账号**: admin / admin123

## 服务管理

### 一键启动脚本

[`scripts/start-local.sh`](../scripts/start-local.sh) 提供以下命令：

```bash
./scripts/start-local.sh           # 启动全部（默认）
./scripts/start-local.sh frontend  # 仅启动前端
./scripts/start-local.sh backend   # 仅启动后端
./scripts/start-local.sh db        # 启动本地数据库
./scripts/start-local.sh install   # 安装依赖
./scripts/start-local.sh stop      # 停止所有服务
./scripts/start-local.sh status    # 查看服务状态
./scripts/start-local.sh help      # 帮助
```

### 统一服务管理脚本

[`scripts/topems.sh`](../scripts/topems.sh) 是细粒度服务管理工具：

```bash
./scripts/topems.sh status              # 查看所有服务状态
./scripts/topems.sh start iam           # 启动 IAM（unified-core）
./scripts/topems.sh start hrm           # 启动 HRM 服务
./scripts/topems.sh start-all           # 启动所有后端
./scripts/topems.sh stop-all            # 停止所有后端
./scripts/topems.sh restart hrm         # 重启 HRM
./scripts/topems.sh logs hrm 100        # 查看 HRM 最近 100 行日志
./scripts/topems.sh build-all           # 编译所有服务
./scripts/topems.sh db start            # 启动本地 PostgreSQL
```

### 单独的 pnpm 命令

```bash
# 根目录
pnpm dev              # 一键启动（等价于 ./scripts/start-local.sh）
pnpm dev:web          # 仅启动 web 前端（3000）
pnpm dev:core         # 仅启动 core 微前端（3001）
pnpm dev:backend      # 仅启动后端 IAM
pnpm dev:all          # 启动所有后端 + 前端
pnpm dev:stop         # 停止所有服务
pnpm typecheck        # TypeScript 类型检查
pnpm build            # 构建生产版本
pnpm test             # 运行测试
```

## 服务自动注册机制

服务启动时会**自动向 unified-core 注册**，无需手动配置：

```bash
# 启动服务时自动注册
./topems.sh start erp

# 预期输出
[INFO] 启动 erp 服务...
[SUCCESS] erp 服务启动成功 (PID: xxx, 端口: 8010)
[DETAIL] 注册 erp 到 unified-core...
[DETAIL] erp 注册成功
```

**注册流程**：
1. 服务启动成功后，脚本调用 `/api/core/plugin/dev/plugins/{code}/register` 接口
2. 注册信息包含：服务代码、名称、描述、版本、运行时 URL、权限列表
3. unified-core 将服务信息存储到数据库
4. 前端通过 `/api/plugins/info` 获取已注册服务列表

**验证注册结果**：

```bash
# 查看已注册插件列表
curl -s http://localhost:8000/api/plugins/info | python3 -m json.tool
```

**服务自动恢复**：

```bash
# 检查并重启异常服务
./topems.sh check
```

## 端口分配

| 端口 | 服务 | 路径 |
|------|------|------|
| 3000 | Web Portal (前端主应用) | apps/web |
| 3001 | Core Module (前端微模块) | apps/core |
| 5432 | PostgreSQL | 本地 |
| 6379 | Redis | 本地 |
| 8000 | Unified Core (IAM + Doc + Flow + File + AI) | svc/unified-core |
| 8010 | ERP | svc/erp |
| 8020 | HRM | svc/hrm |
| 8023 | PM | svc/pm |
| 8029 | CRM | svc/crm |
| 8030 | MES | svc/mes |
| 8031 | PDM | svc/pdm |
| 8040 | SCM | svc/scm |
| 8041 | WMS | svc/wms |
| 8042 | SRM | svc/srm |
| 8050 | QMS | svc/qms |
| 8051 | LIMS | svc/lims |
| 8052 | EHS | svc/ehs |
| 8053 | RS | svc/rs |
| 8060 | BI | svc/bi |
| 8061 | Report | svc/report |
| 8062 | Monitor | svc/monitor |
| 8063 | Portal | svc/portal |
| 8013 | AI | svc/ai |
| 8070 | Mobile | svc/mobile |
| 8071 | GIS | svc/gis |
| 8072 | Integration | svc/integration |

## 日志

服务日志位于：

- **Web 前端**: `logs/web.log`
- **Core 前端**: `logs/core.log`
- **后端服务**: `logs/<service>.log`（由 `topems.sh` 管理）

```bash
# 实时查看 web 日志
tail -f logs/web.log

# 实时查看后端日志
./scripts/topems.sh logs iam

# 清理所有日志
rm -rf logs/*.log
```

## 数据库管理

### 启动/停止数据库

```bash
# macOS (Homebrew)
brew services start postgresql@16
brew services stop  postgresql@16

# Linux (systemd)
sudo systemctl start  postgresql
sudo systemctl stop   postgresql
sudo systemctl status postgresql
```

### 重置数据库

```bash
# 备份
./scripts/topems.sh db backup

# 重置
./scripts/topems.sh db reset

# 恢复
./scripts/topems.sh db restore <备份文件>
```

### 初始化默认数据

数据库表结构会在 `unified-core` 启动时自动创建。默认账号：

- 用户名：`admin`
- 密码：`admin123`

## 环境变量

所有环境变量在项目根目录的 `.env` 文件中配置。`.env.example` 包含完整的默认值，**开箱即用**。

```bash
# 查看所有可用变量
cat .env.example
```

主要变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | postgres://topems:topems_secret@localhost:5432/topems | PostgreSQL 连接 |
| `REDIS_URL` | redis://localhost:6379 | Redis 连接 |
| `JWT_SECRET` | (随机) | JWT 签名密钥 |
| `JWT_REFRESH_SECRET` | (随机) | JWT 刷新密钥 |
| `CORS_ORIGINS` | http://localhost:3000 | CORS 白名单 |
| `CORE_PORT` | 8000 | unified-core 端口 |
| `RUST_LOG` | info | Rust 日志级别 |

## 与 Docker 部署的关系

Docker 部署**仍然受支持**，但仅作为可选方案。Docker 相关文件位于：

- `docker/docker-compose.yml` - 数据库（postgres + redis）的容器化
- `apps/web/Dockerfile` - Web 前端的容器化
- `svc/*/Dockerfile` - Rust 后端服务的容器化
- `k8s/*.yaml` - Kubernetes 部署清单（仅在 K8s 集群部署时使用）

何时使用 Docker：

- ✅ **生产部署**：需要镜像分发、容器编排
- ✅ **CI/CD**：自动化测试和构建
- ✅ **离线环境**：需要预先打包的镜像
- ❌ **本地开发**：不推荐（增加复杂度）

何时使用本地部署：

- ✅ **日常开发**：首选方式
- ✅ **调试**：IDE 调试器可直接附加到进程
- ✅ **快速迭代**：无需重新构建镜像
- ✅ **学习/探索**：直接查看进程和文件

## 故障排查

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8000

# 清理 TOPEMS 端口
for port in 3000 3001 8000 8010 8011 8012 8013 8020 8023 8029 8030 8031 8040 8041 8042 8050 8051 8052 8053 8060 8061 8062 8063 8070 8071 8072; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done
```

### 数据库连接失败

```bash
# 测试连接
psql -U topems -d topems -c "SELECT 1"

# 重启数据库
brew services restart postgresql@16  # macOS
sudo systemctl restart postgresql     # Linux
```

### Rust 编译错误

```bash
# 清理后重新编译
cargo clean
cargo build --workspace
```

### 前端依赖错误

```bash
# 清理 node_modules 后重新安装
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Vite 缓存错误

```bash
# 清理 Vite 缓存
rm -rf node_modules/.vite apps/*/node_modules/.vite

# 重启 Vite
pnpm dev
```

## 性能优化

### 加速 Rust 编译

```bash
# 使用 mold 链接器（Linux）
sudo apt install mold
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"

# 使用 zld 链接器（macOS）
brew install zld
export RUSTFLAGS="-C link-arg=-fuse-ld=zld"

# 仅构建当前需要的服务
cargo build -p unified-core-service
```

### 减少内存占用

- 仅启动需要的后端服务：`./scripts/topems.sh start iam`
- 不启动 PostgreSQL 时使用 SQLite（开发环境）
- 关闭浏览器中未使用的 Tab

## 进阶：IDE 调试

### VSCode 调试 Rust

`.vscode/launch.json` (在项目根目录创建)：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug unified-core",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/target/debug/unified-core-service",
      "args": [],
      "cwd": "${workspaceFolder}/svc/unified-core",
      "env": {
        "DATABASE_URL": "postgres://topems:topems_secret@localhost:5432/topems",
        "RUST_LOG": "debug"
      }
    }
  ]
}
```

### VSCode 调试 React

`.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Vite",
      "port": 9229,
      "request": "attach",
      "type": "chrome",
      "webRoot": "${workspaceFolder}/apps/web/src"
    }
  ]
}
```

启动 Vite 时开启调试端口：

```bash
cd apps/web
pnpm dev -- --inspect
```

## 迁移到 Docker 部署

如果将来需要切换到 Docker 部署：

1. 所有服务都有对应的 `Dockerfile`
2. 数据库：`docker/docker-compose.yml`
3. Kubernetes 清单：`k8s/`

但请注意：本地进程部署是**默认且推荐**的方式。

## 相关文档

- [快速入门指南](./QUICKSTART.md)
- [API 文档](./api/README.md)
- [架构设计](./architecture/overview.md)
- [故障排查](./TROUBLESHOOTING.md)
- [变更日志](./CHANGELOG.md)

---

**最后更新**: 2026-06-24
**版本**: v2.0（本地优先）
