# 开发环境搭建指南

本文档详细介绍 TOPEMS 项目的开发环境搭建流程。

## 目录

- [前置要求](#前置要求)
- [环境依赖](#环境依赖)
- [数据库设置](#数据库设置)
- [项目初始化](#项目初始化)
- [服务启动](#服务启动)
- [前端开发环境](#前端开发环境)
- [验证安装](#验证安装)

---

## 前置要求

### 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | macOS 12+ / Linux (Ubuntu 20.04+) / Windows WSL2 |
| 内存 | 最低 8GB，推荐 16GB+ |
| 磁盘空间 | 最低 20GB 可用空间 |
| 网络 | 能够访问 GitHub 和 Docker Hub |

### 必须安装的软件

| 软件 | 版本 | 用途 |
|------|------|------|
| Git | 2.30+ | 版本控制 |
| Docker | 24.0+ | 容器化部署 |
| Docker Compose | 2.20+ | 多容器编排 |
| Rust | 1.75+ | 后端开发 |
| Node.js | 20.0+ | 前端开发 |
| pnpm | 8.0+ | 前端包管理 |

---

## 环境依赖

### 1. 安装 Rust

```bash
# 使用 rustup 安装
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

### 2. 安装 Node.js 和 pnpm

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 安装 pnpm
npm install -g pnpm

# 验证安装
node --version
pnpm --version
```

### 3. 安装 Docker

> ⚠️ **2026-10-08 起弃用（本机已卸载）**：容器策略定案——生产数据禁入容器，Docker 仅临时验证。
> 开发环境推荐**原生 PostgreSQL**（macOS: `brew install postgresql@18`；Linux: 发行版 postgresql 或 systemd 部署）。
> 本节 docker 安装方式仅为历史参考，详见 `docs/deploy/container-strategy.md`。

```bash
# macOS（历史——本机已卸载）
brew install --cask docker

# Ubuntu（历史——可选，非生产推荐）
sudo apt-get update
sudo apt-get install docker.io docker-compose

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 数据库设置

### 1. 启动 PostgreSQL 和 Redis

```bash
# 进入 docker 目录
cd docker

# 启动数据库服务
docker-compose up -d postgres redis

# 验证服务状态
docker-compose ps
```

### 2. 创建数据库

```bash
# 连接 PostgreSQL
psql postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems

# 在 psql 中执行
CREATE DATABASE topems;
CREATE DATABASE topems_test;
\q
```

### 3. 数据库迁移

```bash
# 运行数据库迁移（sqlx-cli，统一入口；unified-core 不解析 --migrate 旗标）
./scripts/migrate.sh run

# 或使用脚本
./scripts/topems.sh db migrate
```

---

## 项目初始化

### 1. 克隆项目

```bash
git clone https://github.com/topems/topems.git
cd topems
```

### 2. 安装依赖

```bash
# 后端依赖
cargo fetch

# 前端依赖
cd apps/web
pnpm install
cd ../..
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env

# 编辑 .env 文件配置数据库连接
vim .env
```

### 4. 关键配置项

```env
# .env 文件关键配置
JWT_SECRET=<至少32字符的随机密钥>
DATABASE_URL=postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems
REDIS_URL=redis://localhost:6379
ENVIRONMENT=development
RUST_LOG=debug
```

---

## 服务启动

### 统一启动方式

```bash
# 使用统一脚本启动所有服务
./scripts/topems.sh start-all

# 查看服务状态
./scripts/topems.sh status

# 查看服务日志（需指定服务）
./scripts/topems.sh logs iam

# 停止所有服务
./scripts/topems.sh stop
```

### 手动启动服务

```bash
# 推荐（默认本地形态）：模块化单体 topems-server :8099，单进程承载全部模块
# 详见 docs/developer/monolith.md
cargo run --bin topems-server          # 监听 8099，前端 VITE_MONOLITH=1 代理至此

# —— 以下为多独立进程备选形态 ——
# 终端 1: 启动统一核心服务 (IAM, DOC, FILE 等)
cd svc/unified-core
cargo run

# 终端 2: 启动 HRM 服务（目录为 svc/hrm，非 svc/hrm-service）
cd svc/hrm
cargo run

# 终端 3: 启动 AI 服务（目录为 svc/ai，非 svc/ai-service）
cd svc/ai
cargo run
```

### 启动顺序

| 顺序 | 服务 | 端口 | 依赖 |
|------|------|------|------|
| 1 | PostgreSQL | 5432 | - |
| 2 | Redis | 6379 | - |
| 3 | topems-server（模块化单体，推荐默认） | 8099 | PostgreSQL, Redis |
| 备选 | Unified Core（独立模式） | 8000 | PostgreSQL, Redis |
| 备选 | HRM Service | 8020 | Unified Core |
| 备选 | AI Service | 8013 | Unified Core |

---

## 前端开发环境

### 1. 启动前端开发服务器

```bash
cd apps/web

# 安装依赖（如尚未安装）
pnpm install

# 启动开发服务器
pnpm dev
```

### 2. 访问前端

- 开发服务器地址: http://localhost:3000
- API 代理配置: 单体模式（`VITE_MONOLITH=1`）代理到 `http://localhost:8099`（topems-server）；独立模式按 `ports.ts` 各服务端口分别代理（见 `vite.config.ts` 的 `buildServiceProxies()`）

### 3. Vite 代理配置

单体模式（推荐）在 `apps/web/vite.config.ts` 中，`VITE_MONOLITH=1` 时所有 `/api` 汇聚到 `http://localhost:8099`：

```typescript
// VITE_MONOLITH=1：MONO_TARGET = http://localhost:8099
proxy: {
  '/api': {
    target: 'http://localhost:8099',
    changeOrigin: true,
  },
}
```

---

## 验证安装

### 1. 健康检查

```bash
# 检查单体入口（推荐）
curl http://localhost:8099/health

# 独立模式下检查各服务
curl http://localhost:8000/health      # unified-core
curl http://localhost:8020/health      # hrm
curl http://localhost:8013/health      # ai
```

### 2. 登录测试

```bash
curl -X POST http://localhost:8099/api/core/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

预期响应：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "username": "admin",
      "is_superuser": true
    }
  }
}
```

### 3. 前端验证

1. 打开浏览器访问 http://localhost:3000
2. 使用管理员账号登录
3. 验证导航、功能页面正常访问

---

## 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8000

# 终止占用进程
kill -9 <PID>

# 或使用脚本强制重启 iam（8000；--force 必须在服务名之后）
./scripts/topems.sh start iam --force
```

### 数据库连接失败

```bash
# 检查 Docker 容器状态
docker ps

# 重启数据库容器
docker-compose restart postgres

# 验证连接
psql postgres://topems:<TOPEMS_PG_PASSWORD>@localhost:5432/topems
```

### 依赖下载慢

```bash
# 配置 Rust 镜像
echo '[source.crates-io]
replace-with = "ustc"

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"' >> ~/.cargo/config.toml

# 配置 npm 镜像
npm config set registry https://registry.npmmirror.com
```

---

## 下一步

- [代码规范](./code-standards.md)
- [API 设计规范](./api-design.md)
- [调试指南](./debugging.md)

---

**文档版本**: v1.0
**最后更新**: 2026-06-24
