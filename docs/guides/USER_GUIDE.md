# TOPEMS 用户指南

## 目录

1. [快速开始](#1-快速开始)
2. [项目结构](#2-项目结构)
3. [环境配置](#3-环境配置)
4. [本地开发](#4-本地开发)
5. [Docker 部署](#5-docker-部署)
6. [测试指南](#6-测试指南)
7. [模块说明](#7-模块说明)
8. [常见问题](#8-常见问题)

---

## 1. 快速开始

### 1.1 环境要求

- **Rust**: 1.70+
- **Node.js**: 18+
- **PostgreSQL**: 14+
- **Redis**: 6+
- **Docker**: 20.10+ (可选)

### 1.2 快速启动（Docker）

```bash
# 克隆项目
git clone <repository-url>
cd TOPEMS

# 启动所有服务
cd docker
docker-compose up -d

# 访问应用
open http://localhost:3000
```

### 1.3 本地开发启动

```bash
# 启动数据库
docker run -d --name topems-postgres \
  -e POSTGRES_PASSWORD=topems_secret \
  -p 5433:5432 \
  postgres:latest

# 启动后端服务
cd platform/topems-iam/backend
cargo run

# 启动前端
cd frontend
npm install
npm run dev
```

### 1.4 默认账号

- **管理员**: admin / admin123
- **测试用户**: testuser / Test123456

---

## 2. 项目结构

```
TOPEMS/
├── docs/                    # 项目文档
│   ├── API_*.md           # 各服务 API 文档
│   ├── guides/            # 用户指南
│   ├── services/          # 服务文档
│   └── architecture/      # 架构文档
├── frontend/               # React 前端
├── services/               # 业务微服务
│   ├── topems-rs/        # 研发管理系统
│   ├── topems-lims/      # 实验室信息管理系统
│   └── ...
├── platform/              # 平台服务
│   ├── topems-iam/       # 身份认证服务
│   ├── topems-doc/       # 文档管理服务
│   └── topems-flow/      # 工作流服务
├── shared/                # 共享库
├── infrastructure/        # 基础设施配置
├── scripts/               # 工具脚本
└── templates/             # 数据模板
```

---

## 3. 环境配置

### 3.1 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Redis
REDIS_URL=redis://localhost:6379

# JWT 认证
JWT_SECRET=your-secret-key-change-in-production

# AI 服务（可选）
OLLAMA_BASE_URL=http://localhost:11434
```

### 3.2 服务端口

| 服务类别 | 服务 | 端口 | 说明 |
|---------|------|------|------|
| **核心平台** | IAM | 8000 | 身份认证服务 |
| | DOC | 8001 | 文档管理服务 |
| | PM | 8002 | 项目管理服务 |
| | NOTIFICATION | 8003 | 通知服务 |
| | INTEGRATION | 8004 | 集成服务 |
| | PORTAL | 8005 | 企业门户 |
| | FLOW | 8006 | 工作流服务 |
| **业务服务** | ERP | 8010 | 企业资源计划 |
| | HRM | 8011 | 人力资源管理 |
| | CRM | 8012 | 客户关系管理 |
| | AI | 8013 | AI 知识库服务 |
| **研发创新** | RS | 8020 | 研发管理服务 |
| | LIMS | 8022 | 实验室系统 |
| | PDM | 8023 | 产品数据管理 |
| **制造质量** | MES | 8030 | 生产执行系统 |
| | QMS | 8031 | 质量管理系统 |
| | EHS | 8032 | 安全管理系统 |
| **供应链** | SCM | 8040 | 供应链系统 |
| | SRM | 8041 | 供应商管理 |
| | WMS | 8042 | 仓库管理系统 |
| **专业服务** | GIS | 8050 | 地理信息系统 |
| | IM | 8051 | 即时通讯 |
| | BI | 8052 | 商业智能 |
| | REPORT | 8053 | 报表服务 |
| | MAIL | 8054 | 邮件服务 |
| | MOBILE | 8055 | 移动端服务 |
| **前端** | Frontend | 3000 | 前端门户 |

---

## 4. 本地开发

### 4.1 启动后端服务

```bash
# 启动各个后端服务（在不同的终端窗口）

# 身份认证服务
cd platform/topems-iam/backend
cargo run

# 文档管理服务
cd platform/topems-doc/backend
cargo run

# AI 服务
cd services/topems-ai/backend
cargo run

# 研发管理服务
cd services/topems-rs/backend
cargo run
```

### 4.2 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4.3 数据库迁移

```bash
# 使用 SQL 脚本初始化
psql -U postgres -d topems -f infrastructure/db/indexes.sql
```

---

## 5. Docker 部署

### 5.1 使用 Docker Compose

```bash
cd docker

# 开发环境启动
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service-name]

# 停止服务
docker-compose down
```

### 5.2 构建镜像

```bash
# 构建所有服务镜像
docker-compose build

# 构建单个服务
docker-compose build [service-name]
```

### 5.3 生产环境

```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d
```

### 5.4 数据持久化

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U topems topems > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U topems topems < backup.sql
```

---

## 6. 测试指南

### 6.1 运行测试

```bash
# 后端测试
cd platform/topems-iam/backend
cargo test

# 前端测试
cd frontend
npm test
```

### 6.2 集成测试

```bash
# 使用测试脚本
./scripts/run-all-tests.sh
```

### 6.3 性能测试

```bash
# 运行性能测试
./scripts/run-performance-tests.sh
```

---

## 7. 模块说明

### 7.1 平台服务

| 服务 | 说明 | 依赖 |
|------|------|------|
| topems-iam | 用户认证、权限管理 | PostgreSQL, Redis |
| topems-doc | 文档管理、版本控制 | PostgreSQL |
| topems-flow | 工作流引擎 | PostgreSQL, IAM |
| topems-ai | AI 知识库（Ollama） | PostgreSQL |

### 7.2 业务服务

| 服务 | 说明 | 状态 |
|------|------|------|
| topems-rs | 研发项目管理 | ✅ 已实现 |
| topems-lims | 实验室信息管理 | ✅ 已实现 |
| topems-gis | 地理信息管理 | 🔄 开发中 |
| topems-qms | 质量管理系统 | 📋 计划中 |
| topems-ehs | 安全环保管理 | 📋 计划中 |

### 7.3 共享库

```rust
// 在 Cargo.toml 中添加依赖
topems-shared = { path = "../../shared/lib" }

// 使用共享功能
use topems_shared::response::ApiResponse;
use topems_shared::Result;
```

---

## 8. 常见问题

### 8.1 数据库连接失败

**问题**: `connection refused`

**解决**:
1. 检查 PostgreSQL 是否运行
2. 验证环境变量 `DATABASE_URL`
3. 确认数据库已创建

```bash
# 检查 PostgreSQL
pg_isready -h localhost -p 5433

# 创建数据库
psql -U postgres -c "CREATE DATABASE topems;"
```

### 8.2 端口冲突

**问题**: `port already in use`

**解决**:
1. 检查端口占用
2. 修改 `.env` 中的端口配置

```bash
# 查看端口占用
lsof -i :3000

# 杀掉占用进程
kill -9 <PID>
```

### 8.3 前端无法连接后端

**问题**: API 请求失败

**解决**:
1. 检查后端服务是否运行
2. 确认 CORS 配置
3. 验证环境变量 `VITE_API_BASE_URL`

### 8.4 Docker 构建失败

**问题**: `build failed`

**解决**:
1. 清理 Docker 缓存
2. 重新构建

```bash
docker system prune -a
docker-compose build --no-cache
```

---

## 联系方式

- **文档**: 查看 `docs/` 目录
- **API 文档**: 查看 `docs/API_*.md`
- **架构设计**: 查看 `docs/architecture/`
- **问题反馈**: GitHub Issues

---

**最后更新**: 2026-05-30
