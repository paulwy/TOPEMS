# TOPEMS 企业级数字化平台

> 统一身份认证与授权管理、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理

![Version](https://img.shields.io/badge/version-5.14.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Rust](https://img.shields.io/badge/rust-1.75-orange)
![React](https://img.shields.io/badge/react-19-blue)

## 🌟 功能特性

### 核心服务
- 🔐 **身份认证** - IAM 身份认证，统一权限管理，安全审计
- 📄 **文档管理** - 智能文档管理，版本控制，协作编辑，集成文件存储服务
- 🤖 **AI 服务** - 智能问答，文档摘要，自动化建议，RAG检索增强
- 📁 **文件服务** - 统一文件存储，流式上传，多后端支持
- 🔀 **流程自动化** - 可视化流程设计，审批工作流
- 📢 **通知服务** - 实时通知，消息推送

### 业务服务
- 🏭 **制造执行** - MES制造执行系统
- 📋 **产品数据** - PDM产品数据管理
- 🏭 **质量管控** - QMS质量管理
- 🔬 **实验室** - LIMS实验室管理
- 🌍 **环境安全** - EHS环境健康安全
- 📈 **商业智能** - BI数据分析
- 📊 **报表服务** - Report报表生成
- 💼 **资源规划** - ERP企业资源计划
- 👥 **人力资源** - HRM人力资源管理（共享Schema）
- 📦 **供应链** - SCM供应链，SRM供应商，CRM客户关系
- 📦 **仓储物流** - WMS仓库管理
- 🔬 **研发管理** - RS科研研发
- 🌍 **地理信息** - GIS服务
- 💬 **即时通讯** - IM即时通讯
- 📮 **邮件服务** - 邮件发送与模板
- 📱 **移动端** - 移动端API服务
- 🏠 **企业门户** - 统一门户入口
- 🔗 **系统集成** - 系统集成服务

### 技术亮点
- ⚡ **高性能** - Rust 后端，极快响应
- 📱 **响应式** - 完美适配移动端
- 🎨 **现代化** - 优雅的 UI 设计
- 🔒 **安全** - 企业级安全保障
- 🌐 **PWA 支持** - 离线访问，快速启动
- 🎯 **微服务架构** - 20+个独立服务，灵活扩展
- 🔄 **统一架构** - 统一的认证保护和架构规范化
- 🏗️ **Cargo Workspace** - 增量编译，共享依赖缓存
- 🤖 **AI 增强** - Ollama 本地 LLM + 向量搜索（pgvector）
- 📦 **统一文件存储** - DOC-File服务整合
- 🗄️ **共享Schema** - 跨服务数据统一管理
- 🚀 **服务整合** - 4组服务已整合为统一服务，降低运维复杂度

## 🛠️ 技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| React | ^19.2.7 | UI 框架 |
| TypeScript | ^6.0.3 | 类型安全 |
| Vite | ^8.0.16 | 构建工具 |
| MUI | ^9.1.1 | UI 组件库 |
| React Three Fiber | ^8.x | 3D 可视化 |
| OpenTelemetry | - | 可观测性 |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| Rust | 1.75 | 编程语言 |
| Axum | ^0.7 | Web 框架 |
| SQLx | ^0.8 | 数据库访问 |
| PostgreSQL | ^16 | 主数据库 |
| Redis | 7+ | 缓存/消息 |

### 桌面端
| 技术 | 版本 | 说明 |
|------|------|------|
| Tauri | 2.0 | 桌面框架 |
| React | ^19.2.7 | 前端框架 |

### API 路径规范
所有 API 路径统一为 `/api/core/{service}/v1` 格式，例如：
- `GET /api/core/erp/v1/orders`
- `POST /api/core/finance/v1/payments`

## 📁 项目结构

```
topems/
├── docs/                          # 文档
│   ├── api/                      # API 文档
│   ├── ARCHITECTURE/             # 架构设计
│   ├── deployment/               # 部署指南
│   ├── guides/                   # 用户指南
│   ├── services/                 # 服务文档
│   └── user/                     # 用户手册
├── apps/                          # 前端应用目录
│   ├── web/                      # Web 主应用 (端口 3000)
│   │   ├── src/components/       # 可复用组件
│   │   ├── src/pages/            # 页面组件
│   │   ├── src/hooks/            # 自定义 hooks
│   │   ├── src/api/              # API 客户端
│   │   └── src/store/            # 状态管理
│   ├── desktop/                  # Tauri 桌面应用
│   │   ├── src/                  # 桌面端前端代码
│   │   ├── src-tauri/            # Tauri Rust 后端
│   │   ├── app/                  # 应用资源
│   │   └── icons/                # 图标资源
│   └── mobile/                   # 移动端应用 (Expo)
│       └── src/                  # 移动端代码
├── svc/                          # 后端服务 (Rust)
│   ├── unified-core/            # 统一核心服务 (8000)
│   ├── mes/                     # 制造执行系统 (8030)
│   ├── pdm/                     # 产品数据管理 (8031)
│   ├── qms/                     # 质量管理系统 (8050)
│   ├── lims/                    # 实验室管理系统 (8051)
│   ├── ehs/                     # 环境健康安全 (8052)
│   ├── bi/                      # 商业智能 (8060)
│   ├── report/                  # 报表服务 (8061)
│   ├── hrm/                     # 人力资源管理 (8020)
│   ├── crm/                     # 客户关系管理 (8029)
│   ├── pm/                      # 项目管理 (8023)
│   ├── erp/                     # 企业资源计划 (8010)
│   ├── gis/                     # 地理信息系统 (8071)
│   ├── rs/                      # 研发管理 (8053)
│   ├── scm/                     # 供应链管理 (8040)
│   ├── wms/                     # 仓库管理 (8041)
│   ├── mobile/                  # 移动端服务 (8070)
│   ├── monitor/                 # 监控服务 (8062)
│   └── portal/                  # 企业门户 (8063)
├── lib/                          # Rust 共享库
├── packages/                     # TypeScript 共享包
│   ├── shared-types/            # 类型定义
│   ├── shared-utils/            # 工具函数
│   ├── shared-constants/        # 共享常量（颜色、数字等，由 tokens.ts 同步生成）
│   └── shared-components/       # 共享业务组件（@topems/shared-components）
├── deploy/                       # 部署配置
│   ├── systemd/                 # systemd 服务配置
│   ├── monitoring/              # 监控配置 (Prometheus/Grafana)
│   ├── nginx/                   # Nginx 配置
│   ├── env/                     # 环境变量模板
│   └── scripts/                 # 部署脚本
├── scripts/                      # 管理脚本
├── cli/                          # Python CLI 工具
├── Cargo.toml                   # Cargo Workspace 配置
└── .env.example                 # 环境变量配置
```

## 🚀 快速开始

> **默认部署方式：本地进程（无需 Docker）。** Docker 仅作为可选的容器化打包方案。

### 系统要求

- **前端**: Node.js 20+, pnpm 8+
- **后端**: Rust 1.75, Cargo
- **数据库**: PostgreSQL 16+ （本地安装，推荐 Homebrew 或 apt）
- **缓存**: Redis 7+ （本地安装，可选）
- **工具**: 可选 Docker（仅用于容器化打包场景）

### ⚡ 一键启动（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd TOPEMS

# 2. 安装依赖
pnpm install
cargo build --workspace  # 首次需要 5-10 分钟

# 3. 启动本地 PostgreSQL/Redis（macOS）
brew services start postgresql@16
brew services start redis
createdb topems

# 4. 一键启动所有服务（前端 + 后端 + 数据库）
./scripts/start-local.sh
```

启动后访问：
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **默认账号**: admin / admin123

### 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env

# 配置 JWT 密钥（必须配置！）
# 生成安全密钥
openssl rand -base64 32
```

`.env` 文件已配置为本地默认值，开箱即用。

### 启动数据库（方式一：本地安装，默认推荐）

**macOS (Homebrew):**

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createdb topems
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt install -y postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"
```

### 启动数据库（方式二：Docker，可选）

仅在需要容器化时使用：

```bash
cd docker
docker compose up -d postgres redis
```

### 前端开发

**Host Shell (主应用):**

```bash
cd apps/web
pnpm install
pnpm run dev
```

访问 http://localhost:3000

### 后端开发

项目采用 Cargo Workspace 架构，所有服务共享依赖。

```bash
# 编译所有服务（使用 workspace）
cargo build --workspace

# 运行统一核心服务
cd svc/unified-core
cargo run
```

### 一键启动所有服务（开发环境）

```bash
# 使用统一服务管理脚本
./scripts/topems.sh start-all

# 或使用一键启动脚本（含数据库和前端）
./scripts/start-local.sh
```

### 服务自动注册机制

服务启动时会**自动向 unified-core 注册**，无需手动配置：

```bash
# 启动服务时自动注册
./scripts/topems.sh start erp

# 预期输出
[INFO] 启动 erp 服务...
[SUCCESS] erp 服务启动成功 (PID: xxx, 端口: 8010)
[DETAIL] 注册 erp 到 unified-core...
[DETAIL] erp 注册成功

# 验证注册结果
curl -s http://localhost:8000/api/plugins/info | python3 -m json.tool
```

### 服务自动恢复

```bash
# 检查并重启异常服务
./scripts/topems.sh check
```

## 🔌 端口配置规范

### 端口分配原则

| 端口范围 | 服务类型 | 说明 |
|---------|---------|------|
| 8000-8009 | 平台核心服务 | Unified Core |
| 8010-8019 | 业务服务 | ERP, HRM, CRM |
| 8030-8039 | 制造服务 | MES, PDM |
| 8040-8049 | 供应链服务 | SCM, WMS |
| 8050-8059 | 质量与实验室服务 | QMS, LIMS, EHS, AI |
| 8060-8069 | 分析与扩展服务 | BI, Report, Monitor, Portal |
| 8000 | 核心服务 | Unified-Core (IAM) |
| 3000 | 前端 | Host Shell 开发服务器 |

### 服务端口清单

| 服务名 | 端口 | 服务路径 | 说明 |
|-------|------|---------|------|
| unified-core | 8000 | svc/unified-core | 统一核心服务（IAM, Doc, Flow, File, Communication, Tenant, Billing, Plugin） |
| mes | 8030 | svc/mes | 制造执行系统 |
| pdm | 8031 | svc/pdm | 产品数据管理 |
| qms | 8050 | svc/qms | 质量管理系统 |
| lims | 8051 | svc/lims | 实验室信息管理系统 |
| ehs | 8052 | svc/ehs | 环境健康安全管理 |
| bi | 8060 | svc/bi | 商业智能 |
| report | 8061 | svc/report | 报表服务 |
| erp | 8010 | svc/erp | 企业资源计划 |
| hrm | 8020 | svc/hrm | 人力资源管理 |
| crm | 8029 | svc/crm | 客户关系管理 |
| scm | 8040 | svc/scm | 供应链管理 |
| wms | 8041 | svc/wms | 仓库管理 |
| pm | 8023 | svc/pm | 项目管理 |
| gis | 8071 | svc/gis | 地理信息系统 |
| mobile | 8070 | svc/mobile | 移动端服务 |
| rs | 8053 | svc/rs | 研发管理 |
| monitor | 8062 | svc/monitor | 监控服务 |
| portal | 8063 | svc/portal | 企业门户 |
| integration | 8072 | svc/integration | 系统集成服务 |

### 前端端口

| 应用 | 端口 | 路径 | 说明 |
|------|------|------|------|
| Host Shell | 3000 | apps/web | 主应用 |

### WebSocket 路径映射

系统采用统一的 WebSocket 路径规范：`/ws/{module}/{feature}`

| 服务 | 前端路径 | 后端路由 | 服务端口 |
|------|----------|----------|----------|
| Core | `/ws/core/notifications` | `/ws/core/notifications` | 8000 |
| Core | `/ws/core/im` | `/ws/core/im` | 8000 |
| MES | `/mes/ws/dashboard` | `/mes/ws/dashboard` | 8030 |
| GIS | `/gis/ws` | `/api/gis/ws` | 8071 |
| GIS | `/gis/ws/device/{device_code}` | `/api/gis/ws/device/{device_code}` | 8071 |

详细说明请参考 [WebSocket 路径映射规范](docs/guides/devops/websocket-path-mapping.md)

## 🔒 安全配置

### JWT 密钥配置

本系统使用 JWT (JSON Web Token) 进行身份认证。在部署前，**必须**配置以下环境变量：

```bash
# JWT 访问令牌密钥
JWT_SECRET=your-jwt-secret-key-here

# JWT 刷新令牌密钥
JWT_REFRESH_SECRET=your-refresh-secret-key-here
```

### ⚠️ 安全要求

1. **密钥长度**：至少 32 个字符
2. **密钥强度**：使用强随机密钥，建议使用密码管理器生成
3. **生产环境**：**必须**设置强密钥，不得使用默认值
4. **密钥管理**：
   - 不要将密钥硬编码在代码中
   - 不要将密钥提交到版本控制系统
   - 定期轮换密钥
   - 不同环境使用不同密钥

### 生成安全密钥示例

```bash
# 使用 openssl 生成随机密钥
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# JWT 配置
JWT_SECRET=<生成的32字符以上随机密钥>
JWT_REFRESH_SECRET=<生成的32字符以上随机密钥>

# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
DB_HOST=localhost
DB_PORT=5432

# Redis 配置
REDIS_URL=redis://localhost:6379

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**注意**：`.env` 文件已添加到 `.gitignore`，不会被提交到代码仓库。

### 权限管理系统

TOPEMS 使用基于角色的访问控制（RBAC）系统来管理用户权限。

#### 默认角色

系统预置了以下角色：

| 角色代码 | 角色名称 | 说明 |
|---------|---------|------|
| admin | 超级管理员 | 拥有所有权限，不可删除 |
| developer | 开发人员 | 拥有开发相关权限 |
| manager | 部门经理 | 拥有业务管理权限 |
| user | 普通用户 | 拥有基础访问权限 |
| guest | 访客 | 只读访问权限 |

#### 权限分类

权限按模块进行分类：

| 模块 | 说明 | 权限示例 |
|------|------|---------|
| rs | 研发管理 | projects.read, phases.write |
| erp | 企业资源计划 | employee.read, finance.write |
| lims | 实验室管理 | sample.read, test.write |
| qms | 质量管理 | standard.read, audit.write |
| ehs | 环境健康安全 | incident.read, risk.write |
| srm | 供应商管理 | supplier.read, contract.write |
| gis | 地理信息系统 | map.read, device.write |
| bi | 商业智能 | dashboard.read, report.write |
| system | 系统管理 | users.read, roles.write |

#### 权限管理 API

权限管理通过 IAM 服务提供的 API 进行管理：

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/v1/permissions | 获取权限列表 |
| POST | /api/v1/permissions | 创建权限 |
| GET | /api/v1/roles | 获取角色列表 |
| POST | /api/v1/roles | 创建角色 |
| POST | /api/v1/roles/{id}/permissions | 分配权限给角色 |
| POST | /api/v1/users/{id}/roles | 分配角色给用户 |
| GET | /api/v1/users/{id}/effective-permissions | 获取用户有效权限 |

#### 初始化权限数据

数据库初始化脚本会自动创建权限表结构和默认数据：

```bash
# 运行数据库初始化脚本
python -m topems_cli db init
python -m topems_cli db migrate
```

该脚本会：
1. 创建数据库和用户
2. 创建权限管理相关表（permissions, roles, role_permissions, user_roles, user_permissions）
3. 初始化 70+ 个默认权限
4. 创建 5 个默认角色并分配权限

## 🛠️ 脚本工具

### 统一服务管理脚本（推荐）

使用 `scripts/topems.sh` 管理所有服务：

```bash
# 查看帮助
./scripts/topems.sh help

# 服务管理
./scripts/topems.sh status [服务]            # 查看服务状态
./scripts/topems.sh start <服务>             # 启动服务
./scripts/topems.sh stop <服务>              # 停止服务
./scripts/topems.sh restart <服务>           # 重启服务
./scripts/topems.sh logs <服务> [行数]       # 查看服务日志
./scripts/topems.sh build <服务>             # 编译服务

# 编译/构建
./scripts/topems.sh build-all                # 全量编译（后端+前端）
./scripts/topems.sh build-backend            # 编译所有后端
./scripts/topems.sh build-frontend           # 编译前端

# 批量操作
./scripts/topems.sh start-all                # 启动所有服务（含前端）
./scripts/topems.sh stop-all                 # 停止所有服务（含前端）
./scripts/topems.sh restart-all              # 重启所有服务

# 一键运行
./scripts/topems.sh run                      # 一键启动数据库+所有服务
./scripts/topems.sh run-stop                 # 一键停止所有服务+数据库

# 测试
./scripts/topems.sh test-all                 # 运行所有测试
./scripts/topems.sh test-backend             # 运行后端测试
./scripts/topems.sh test-frontend            # 运行前端测试

# 数据库
./scripts/topems.sh db start                 # 启动 PostgreSQL
./scripts/topems.sh db stop                  # 停止 PostgreSQL
./scripts/topems.sh db status                # 查看数据库状态
./scripts/topems.sh db migrate               # 运行数据库迁移
./scripts/topems.sh db backup                # 备份数据库
./scripts/topems.sh db restore <文件>        # 恢复数据库
./scripts/topems.sh db reset                 # 重置数据库
./scripts/topems.sh redis start              # 启动 Redis
./scripts/topems.sh redis stop               # 停止 Redis

# 开发环境
./scripts/topems.sh dev                      # 启动 macOS 开发环境

# 用户管理
./scripts/topems.sh reset-password [用户] [密码]  # 重置密码（默认 admin/admin123）

# 部署
./scripts/topems.sh deploy                   # 一键部署

# 示例
./scripts/topems.sh status                   # 查看所有服务状态
./scripts/topems.sh start iam                # 启动 IAM 服务
./scripts/topems.sh start-all                # 启动所有服务
./scripts/topems.sh start web                # 启动前端
./scripts/topems.sh run                      # 一键运行
./scripts/topems.sh logs hrm 100             # 查看 HRM 最近 100 行日志
./scripts/topems.sh db backup                # 备份数据库
```

### 其他脚本

| 脚本 | 说明 | 使用方法 |
|------|------|---------|
| `scripts/topems.sh` | **统一服务管理脚本**（推荐） | `./scripts/topems.sh --help` |
| `scripts/scan_todos.py` | TODO/FIXME 代码扫描 | `python3 scripts/scan_todos.py --help` |
| `scripts/install-deps.sh` | 安装依赖 | `./scripts/install-deps.sh` |
| `scripts/ai-models.sh` | AI 模型管理 | `./scripts/ai-models.sh --help` |
| `scripts/update_admin_password.sh` | 重置管理员密码 | `./scripts/update_admin_password.sh [用户名] [密码]` |
| `scripts/deploy.sh` | 离线部署脚本 | `./scripts/deploy.sh deploy` |
| `deploy/scripts/install.sh` | Linux 服务器安装 | `./deploy/scripts/install.sh` |
| `deploy/scripts/setup-db.sh` | 数据库设置 | `./deploy/scripts/setup-db.sh` |

详细说明请参考各脚本的 `--help` 输出。

## 📖 文档

### 文档中心（内网推荐）

系统提供独立的文档中心，支持内网部署，无需互联网访问：

```bash
# 启动文档中心
cd docs-center
./start.sh 8080

# 访问地址
# http://localhost:8080
```

### 文档目录

```
docs/
├── api/                              # API文档
│   ├── openapi.yaml                  # OpenAPI规范文档（2700+行）
│   ├── API_DOCUMENTATION.md          # API文档总览
│   ├── API_AUTH.md                   # 认证API文档
│   ├── API_HRM.md                    # HRM模块API文档
│   ├── API_QMS.md                    # QMS模块API文档
│   ├── API_RS.md                     # 研发管理API文档
│   ├── API_SRM.md                    # 供应商API文档
│   ├── API_WORKFLOW.md               # 工作流API文档
│   └── plugins-api.md                # 插件API文档
├── architecture/                     # 架构设计
│   ├── overview.md                   # 系统架构总览
│   ├── database.md                   # 数据库设计
│   └── DATABASE_SCHEMA_DESIGN.md     # 数据库Schema设计
├── deployment/                       # 部署指南
│   ├── DEPLOYMENT_GUIDE.md           # 部署指南
│   ├── DEPLOYMENT_OFFLINE.md         # 离线部署指南
│   ├── DEPLOYMENT_MANUAL.md          # 部署手册
│   └── windows-deployment.md        # Windows部署指南
├── services/                         # 服务文档
│   ├── AI_SETUP_GUIDE.md             # AI服务配置指南
│   ├── MAIL_SERVICE_GUIDE.md         # 邮件服务配置
│   └── SERVICE_OPTIMIZATION_GUIDE.md # 服务优化指南
├── superpowers/                      # 高级功能文档
│   ├── user-manuals/                 # 各模块用户手册
│   ├── plans/                        # 实施计划
│   └── specs/                        # 技术规格
├── user/                             # 用户手册
│   └── UserManual.md                 # 完整用户操作手册（16个模块）
├── database-design.md                # 数据库表结构文档（含业务模块）
├── deployment-guide.md               # 部署指南（含运维说明）
├── developers-guide.md               # 开发者指南（API示例、插件开发）
└── README.md                         # 文档中心索引
```

### 文档入口

#### 核心文档
| 文档 | 路径 | 说明 |
|------|------|------|
| **OpenAPI规范** | [docs/api/openapi.yaml](docs/api/openapi.yaml) | 完整API规范文档（2700+行） |
| **用户操作手册** | [docs/user/UserManual.md](docs/user/UserManual.md) | 16个模块的完整操作指南 |
| **部署指南** | [docs/deployment-guide.md](docs/deployment-guide.md) | 环境配置、安装步骤、运维说明 |
| **开发者指南** | [docs/developers-guide.md](docs/developers-guide.md) | API使用示例、插件开发规范 |
| **数据库设计** | [docs/database-design.md](docs/database-design.md) | 完整数据库表结构文档 |
| **WebSocket规范** | [docs/guides/devops/websocket-path-mapping.md](docs/guides/devops/websocket-path-mapping.md) | WebSocket连接路径映射规范 |

#### API文档
| 文档 | 路径 | 说明 |
|------|------|------|
| API总览 | [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) | API文档总览 |
| 认证API | [docs/api/API_AUTH.md](docs/api/API_AUTH.md) | 身份认证API |
| HRM API | [docs/api/API_HRM.md](docs/api/API_HRM.md) | 人力资源API |
| QMS API | [docs/api/API_QMS.md](docs/api/API_QMS.md) | 质量管理API |
| 研发API | [docs/api/API_RS.md](docs/api/API_RS.md) | 研发管理API |
| 工作流API | [docs/api/API_WORKFLOW.md](docs/api/API_WORKFLOW.md) | 工作流API |

#### 架构与设计
| 文档 | 路径 | 说明 |
|------|------|------|
| 系统架构 | [docs/architecture/overview.md](docs/architecture/overview.md) | 整体架构设计 |
| 数据库设计 | [docs/architecture/database.md](docs/architecture/database.md) | 数据库架构 |
| Schema设计 | [docs/architecture/DATABASE_SCHEMA_DESIGN.md](docs/architecture/DATABASE_SCHEMA_DESIGN.md) | Schema设计规范 |
| 技术架构 | [docs/OVERALL_ARCHITECTURE_DESIGN.md](docs/OVERALL_ARCHITECTURE_DESIGN.md) | 总体架构设计 |

#### 部署与运维
| 文档 | 路径 | 说明 |
|------|------|------|
| 部署指南 | [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md) | 标准部署指南 |
| 离线部署 | [docs/deployment/DEPLOYMENT_OFFLINE.md](docs/deployment/DEPLOYMENT_OFFLINE.md) | 离线部署指南 |
| 运维指南 | [docs/deployment-guide.md](docs/deployment-guide.md) | 运维管理、故障排查 |

#### 服务文档
| 文档 | 路径 | 说明 |
|------|------|------|
| AI配置 | [docs/services/AI_SETUP_GUIDE.md](docs/services/AI_SETUP_GUIDE.md) | AI服务配置 |
| 邮件服务 | [docs/services/MAIL_SERVICE_GUIDE.md](docs/services/MAIL_SERVICE_GUIDE.md) | 邮件服务配置 |
| 服务优化 | [docs/services/SERVICE_OPTIMIZATION_GUIDE.md](docs/services/SERVICE_OPTIMIZATION_GUIDE.md) | 服务性能优化 |

#### 模块文档
| 文档 | 路径 | 说明 |
|------|------|------|
| HRM模块 | [docs/HRM_MODULE.md](docs/HRM_MODULE.md) | 人力资源模块 |
| QMS模块 | [docs/QMS_MODULE.md](docs/QMS_MODULE.md) | 质量管理模块 |
| CRM模块 | [docs/CRM_MODULE.md](docs/CRM_MODULE.md) | 客户关系模块 |
| MES模块 | [docs/MES_MODULE.md](docs/MES_MODULE.md) | 制造执行模块 |
| PDM模块 | [docs/PDM_MODULE.md](docs/PDM_MODULE.md) | 产品数据模块 |
| WMS模块 | [docs/WMS_MODULE.md](docs/WMS_MODULE.md) | 仓库管理模块 |
| EHS模块 | [docs/EHS_MODULE.md](docs/EHS_MODULE.md) | 环境健康安全模块 |
| RS模块 | [docs/RS_MODULE.md](docs/RS_MODULE.md) | 研发管理模块 |

### 快速参考

- **安装部署**: 查看 [部署指南](docs/deployment-guide.md)
- **API调用**: 查看 [开发者指南](docs/developers-guide.md) 或 [OpenAPI规范](docs/api/openapi.yaml)
- **系统使用**: 查看 [用户操作手册](docs/user/UserManual.md)
- **插件开发**: 查看 [开发者指南](docs/developers-guide.md#插件开发规范)
- **数据库设计**: 查看 [数据库设计文档](docs/database-design.md)

## 🤖 AI 与向量搜索

TOPEMS 集成 Ollama 本地 LLM 和 Redis 向量搜索，实现智能功能：

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| AI 模型 | Ollama + Qwen2.5:7b | 本地部署，保护隐私 |
| 向量存储 | Redis HNSW | 高性能相似度搜索 |
| 嵌入服务 | Ollama API | 文本向量化 |

### 快速配置

```bash
# 1. 安装 Ollama
brew install ollama

# 2. 启动并拉取模型
ollama serve
ollama pull qwen2.5:7b-instruct

# 3. 验证安装
curl http://localhost:11434/api/tags

# 4. 初始化 Redis 向量索引
bash scripts/init-vector-index.sh

# 5. 启动服务
bash scripts/start-local.sh
```

### 核心能力

- **智能问答** - 基于知识库的 AI 问答
- **文档摘要** - 自动生成文档摘要
- **相似度搜索** - 员工/技能匹配
- **RAG** - 检索增强生成

## 📦 配置文件

### 前端配置

- `apps/web/vite.config.ts` - Vite 构建配置，包含端口代理配置
- `apps/web/src/config/runtime.ts` - 运行时配置，包含所有服务 URL
- `apps/web/src/config/types.ts` - TypeScript 类型定义

### 后端配置

- `lib/src/config/services.rs` - 服务注册中心，统一端口配置
- `docker/docker-compose.yml` - Docker Compose 数据库配置

### 环境变量

- `.env.example` - 环境变量示例（项目根目录）
- `docker/.env.example` - Docker 环境变量示例

## 🔧 开发命令

### 前端（Web）

```bash
cd apps/web
pnpm run dev          # 启动开发服务器
pnpm run build        # 构建生产版本
pnpm run preview      # 预览生产版本
pnpm run lint         # 代码检查
pnpm run test         # 运行单元测试
pnpm run e2e          # 运行端到端测试
pnpm run format       # 代码格式化
```

### 桌面端（Tauri）

```bash
cd apps/desktop
pnpm install          # 安装依赖
pnpm run dev          # 启动开发模式
pnpm run build        # 构建前端
pnpm tauri build      # 构建桌面应用（生产版本）
pnpm tauri dev        # 启动桌面应用开发模式
```

### 后端（Rust）

```bash
cargo run            # 运行服务
cargo build          # 构建开发版本
cargo build --release # 构建生产版本
cargo test           # 运行测试
cargo clippy         # 代码检查
cargo fmt            # 代码格式化
```

## 📄 许可证

MIT License

## 👥 团队

- Engineering Lead
- Frontend Engineers
- Backend Engineers
- DevOps Engineers

---

**最后更新**: 2026-07-13
**版本**: v5.14.0 (正式版)
**文档版本**: v5.1