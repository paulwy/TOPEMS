# TOPEMS 企业级数字化平台

> 统一身份认证与授权管理、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理

![Version](https://img.shields.io/badge/version-5.15.0-blue)
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
- 🔬 **研发管理** - RD 研发项目、配方、专利
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
- 🎯 **微服务架构** - 28个独立服务，灵活扩展
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
│   ├── architecture/             # 架构设计
│   ├── deployment/               # 部署指南
│   ├── development/              # 开发指南
│   ├── modules/                  # 业务模块文档
│   ├── getting-started/          # 快速入门
│   └── user-guide/               # 用户手册
├── apps/                          # 前端应用目录
│   ├── web/                      # Web 主应用 (端口 3000)
│   │   ├── src/components/       # 可复用组件
│   │   ├── src/pages/            # 页面组件
│   │   ├── src/hooks/            # 自定义 hooks
│   │   ├── src/api/              # API 客户端
│   │   └── src/store/            # 状态管理
│   ├── desktop/                  # Tauri 桌面应用
│   │   ├── src/                  # 桌面端前端代码
│   │   └── src-tauri/            # Tauri Rust 后端
│   ├── mobile/                   # 移动端应用 (Expo)
│   │   └── src/                  # 移动端代码
│   └── server/                   # BFF 服务端
├── svc/                          # 后端服务 (Rust)
│   ├── unified-core/            # 统一核心服务 (8000) - IAM/Doc/Flow/File/Monitor
│   ├── erp/                     # 企业资源计划 (8010)
│   ├── finance/                 # 财务管理 (8011)
│   ├── ai/                      # AI 智能服务 (8013)
│   ├── hrm/                     # 人力资源管理 (8020)
│   ├── pm/                      # 项目管理 (8023)
│   ├── crm/                     # 客户关系管理 (8029)
│   ├── mes/                     # 制造执行系统 (8030)
│   ├── pdm/                     # 产品数据管理 (8031)
│   ├── scm/                     # 供应链管理 (8040)
│   ├── wms/                     # 仓库管理 (8041)
│   ├── srm/                     # 供应商管理 (8042)
│   ├── qms/                     # 质量管理系统 (8050)
│   ├── lims/                    # 实验室管理系统 (8051)
│   ├── ehs/                     # 环境健康安全 (8052)
│   ├── rd/                      # 研发管理 (8053)
│   ├── analytics/               # 商业智能/报表 (8060)
│   ├── portal/                  # 企业门户 (8063)
│   ├── mobile/                  # 移动端服务 (8070)
│   ├── gis/                     # 地理信息系统 (8071)
│   ├── integration/             # 系统集成服务 (8072)
│   ├── master-data/             # 主数据管理 (8090)
│   ├── communication/           # 通讯服务 (8084)
│   ├── billing/                 # 计费服务 (8085)
│   ├── ticket/                  # 工单服务 (8086)
│   ├── feedback/                # 反馈服务 (8087)
│   └── search/                  # 搜索服务 (8082)
├── lib/                          # Rust 共享库
│   ├── shared-core/             # 核心 API/配置/中间件
│   ├── shared-db/               # 数据库/审计/迁移
│   ├── shared-auth/             # 认证/权限/租户
│   ├── shared-service-client/   # 服务间调用客户端
│   ├── shared-event/            # 事件总线/Saga
│   ├── shared-observability/    # 可观测性/遥测
│   ├── shared-ai/               # AI 客户端/向量存储
│   └── shared-bootstrap/        # 服务启动引导
├── packages/                     # TypeScript 共享包
│   ├── shared-types/            # 类型定义
│   ├── shared-utils/            # 工具函数
│   ├── shared-constants/        # 共享常量（由 tokens.ts 同步生成）
│   ├── shared-components/       # 共享业务组件（@topems/shared-components）
│   ├── shared-hooks/            # 共享 Hooks
│   └── tokens/                  # Design Tokens
├── tools/                        # 工具
│   └── migration-sdk/           # 迁移 SDK
├── examples/                     # 示例
│   └── minimal-service/         # 最小服务示例
├── deploy/                       # 部署配置
│   ├── systemd/                 # systemd 服务配置
│   ├── docker/                  # Docker Compose 配置
│   ├── k8s/                     # Kubernetes 部署
│   ├── nginx/                   # Nginx 配置
│   └── scripts/                 # 部署脚本
├── scripts/                      # 管理脚本
│   ├── topems.sh                # 统一服务管理脚本
│   ├── services.conf            # 服务配置
│   ├── dev/                     # 开发工具脚本
│   ├── deploy/                  # 部署脚本
│   └── ...
├── cli/                          # Python CLI 工具
├── Cargo.toml                   # Cargo Workspace 配置
└── .env.example                 # 环境变量配置
```

## 🚀 快速开始

> **默认部署方式：本地进程（无需 Docker）。** Docker 仅作为可选的容器化打包方案。

### 命令入口分工

项目提供四套命令入口，各有定位，按需使用：

| 入口 | 定位 | 适用场景 | 典型命令 |
|------|------|---------|---------|
| **`scripts/topems.sh`** | **主入口**（零依赖 Bash） | 日常开发：服务启停、构建、测试、清理 | `./scripts/topems.sh start all`、`build`、`test`、`clean` |
| **`cli/` (Python CLI)** | 高级运维工具（需 pip install） | 数据库管理、系统诊断、Schema 防御 | `topems db migrate`、`doctor`、`db backup` |
| **`Makefile`** | Rust 专项快捷命令 | SQLx 缓存、cargo check、覆盖率基线 | `make sqlx-prepare`、`make check-offline` |
| **`package.json` scripts** | 前端专属命令 | 前端开发、构建、lint、格式检查、设计系统审计 | `pnpm dev:web`、`build`、`lint`、`format` |

> **原则**：日常开发优先用 `topems.sh`；前端专属操作用 `pnpm`；Rust 专项用 `make`；数据库/诊断用 Python CLI。

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
# 首次编译：先刷新 sqlx 离线缓存（需要本地 PostgreSQL 在线）
./scripts/topems.sh sqlx prepare --all
# 或直接编译（离线优先，失败自动切换在线编译）
./scripts/topems.sh build-all --only-core          # 只编核心服务（约 3-5 分钟）
./scripts/topems.sh build-all                       # 全量编译（后端+前端）

# 3. 启动本地 PostgreSQL/Redis（macOS）
brew services start postgresql@16
brew services start redis
createdb topems

# 4. 一键启动所有服务（前端 + 后端 + 数据库）
./scripts/topems.sh start-all
```

启动后访问：
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **默认账号**: admin / admin123

> **V64+ 新能力**: build/start 命令支持分层和参数化
> ```bash
> ./scripts/topems.sh build-all --prepare --only-core --dev      # 先刷新缓存再 debug 编核心组
> ./scripts/topems.sh build-all --backend-only --skip=ai         # 只编后端并跳过 ai 包
> ./scripts/topems.sh start-all --only-core --no-frontend        # 只起核心后端，不起前端
> ```

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
# 推荐：使用统一脚本编译（支持离线缓存、分层、失败汇总）
./scripts/topems.sh build-all --only-core       # 仅核心服务，失败自动重试在线编译
./scripts/topems.sh build-all                   # 全量（后端+前端）
./scripts/topems.sh build <svc> [--online|--dev]  # 单包编译

# 底层：直接使用 Cargo（需要 DATABASE_URL 或 SQLX_OFFLINE）
SQLX_OFFLINE=true cargo build --workspace       # 依赖根目录 .sqlx/
cargo build -p topems-mes --release             # 仅编 MES

# 修改 SQL 语句后刷新离线缓存
./scripts/topems.sh sqlx prepare --all
./scripts/topems.sh sqlx check-offline          # 验证所有包均可离线编译

# 运行统一核心服务
cd svc/unified-core
cargo run
```

### 一键启动所有服务（开发环境）

```bash
# 使用统一服务管理脚本
./scripts/topems.sh start-all

# 或使用一键启动脚本（含数据库和前端）
./scripts/dev/start-local.sh
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
| 8060-8069 | 分析与扩展服务 | BI, Report, Portal |
| 8000 | 核心服务 | Unified-Core (IAM) |
| 3000 | 前端 | Host Shell 开发服务器 |

### 服务端口清单

| 服务名 | 端口 | 服务路径 | 说明 |
|-------|------|---------|------|
| unified-core | 8000 | svc/unified-core | 统一核心服务（IAM, Doc, Flow, File, Monitor, Plugin） |
| erp | 8010 | svc/erp | 企业资源计划 |
| finance | 8011 | svc/finance | 财务管理服务 |
| ai | 8013 | svc/ai | AI 智能服务 |
| hrm | 8020 | svc/hrm | 人力资源管理 |
| pm | 8023 | svc/pm | 项目管理 |
| crm | 8029 | svc/crm | 客户关系管理 |
| mes | 8030 | svc/mes | 制造执行系统 |
| pdm | 8031 | svc/pdm | 产品数据管理 |
| scm | 8040 | svc/scm | 供应链管理 |
| wms | 8041 | svc/wms | 仓库管理 |
| srm | 8042 | svc/srm | 供应商管理 |
| qms | 8050 | svc/qms | 质量管理系统 |
| lims | 8051 | svc/lims | 实验室信息管理系统 |
| ehs | 8052 | svc/ehs | 环境健康安全管理 |
| rd | 8053 | svc/rd | 研发管理 |
| analytics | 8060 | svc/analytics | 商业智能（含原 report 报表功能） |
| portal | 8063 | svc/portal | 企业门户 |
| mobile | 8070 | svc/mobile | 移动端服务 |
| gis | 8071 | svc/gis | 地理信息系统 |
| integration | 8072 | svc/integration | 系统集成服务 |
| search | 8082 | svc/search | 搜索服务 |
| communication | 8084 | svc/communication | 通讯服务（邮件/通知/IM） |
| billing | 8085 | svc/billing | 计费服务 |
| ticket | 8086 | svc/ticket | 工单服务 |
| feedback | 8087 | svc/feedback | 反馈服务 |
| master-data | 8090 | svc/master-data | 主数据管理 |
| lowcode | 8088 | svc/lowcode | 低代码平台 |

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
| MES | `/ws/mes/dashboard` | `/ws/mes/dashboard` | 8030 |
| GIS | `/ws/gis` | `/ws/gis` | 8071 |
| GIS | `/ws/gis/device/{device_code}` | `/ws/gis/device/{device_code}` | 8071 |
| BI | `/ws/bi/dashboard/{id}` | `/ws/bi/dashboard/{id}` | 8060 |

详细说明请参考 [WebSocket 路径映射规范](docs/architecture/websocket-path-mapping.md)

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
DATABASE_URL=postgres://topems_app:topems_app_secret@localhost:5433/topems
DB_HOST=localhost
DB_PORT=5432

# Redis 配置
REDIS_URL=redis://localhost:6379

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**注意**：`.env` 文件已添加到 `.gitignore`，不会被提交到代码仓库。

> ### ⚠️ JWT 密钥 3 条铁规则（启动 panic 99% 来源于此，V257+ 2026-08-20 启用严格校验）
>
> `lib/shared-auth/src/auth.rs` 的 `AuthState::new` 在 **任何环境（含开发）** 都会做 2 层严格校验，不满足 **立即启动 panic 退出**：
>
> | # | 规则 | 错误形式 | 修复 |
> |---|------|---------|------|
> | ① | **严禁**使用 `topems-*` 前缀字符串（老默认值家族） | `panicked at ... secret must NOT equal the built-in DEFAULT_JWT_SECRET / DEFAULT_REFRESH_SECRET` | 重新生成随机值：`openssl rand -hex 32`（推荐）或 `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
> | ② | `JWT_SECRET` 和 `JWT_REFRESH_SECRET` **长度 ≥ 32 字符** | `panicked at ... JWT_SECRET requires at least 32 characters (got N)` | 补足到 32+（`openssl rand -hex 32` 默认输出 64 字符，天然满足） |
> | ③ | **两密钥相互独立**（不要互相复制成同一个值） | 不 panic，但是会让 refresh 令牌安全降级成 access 令牌 | 分两次独立 `openssl rand -hex 32` 生成 |
>
> 💡 快速自查（不启动服务）：
> ```bash
> grep -E '^JWT_(SECRET|REFRESH_SECRET)=' .env | awk -F= '{if (length($2)<32) print "❌ 长度不足32:",$1,"len="length($2); else if ($2 ~ /^topems-/) print "❌ 仍是默认值:",$1; else print "✅ 合法:",$1}'
> ```

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
# 首次使用需安装 CLI 工具（项目根目录执行）
cd cli && pip3 install -e . && cd ..

# 运行数据库初始化脚本
python3 -m topems_cli db init
python3 -m topems_cli db migrate
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
./scripts/topems.sh build-all [--prepare|--only-core|--online|--offline|--dev|--skip=<svc>|--backend-only]
./scripts/topems.sh build-backend                 # 编译所有后端（同 build-all 后端子集，支持相同参数）
./scripts/topems.sh build-frontend [--dev|--skip-lint]
  # 说明: --dev 若 apps/web/package.json 中存在 build:dev 则调用，否则回退到默认 build (tsc && vite build)
  #       --skip-lint 若存在 build:nolint 则调用，否则忽略（默认 build 不跑 lint）
./scripts/topems.sh build <svc> [--online|--offline|--dev]

# SQLx 离线缓存（V64+ 新增）
./scripts/topems.sh sqlx prepare --all            # 分包生成 .sqlx 并合并到根目录
./scripts/topems.sh sqlx prepare --pkg=topems-mes # 仅刷新某个包
./scripts/topems.sh sqlx prepare --check          # 校验缓存完整性
./scripts/topems.sh sqlx check-offline            # 全量离线编译校验（DATABASE_URL 未设置）
./scripts/topems.sh sqlx merge                    # 合并分包缓存

# 批量操作
./scripts/topems.sh start-all [--only-core|--no-frontend|--no-register|--skip=<svc>]
./scripts/topems.sh stop-all                      # 停止所有服务（含前端）
./scripts/topems.sh restart-all [同上选项]        # 重启所有服务

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
| `scripts/topems.sh` | **统一服务管理脚本**（推荐） | `./scripts/topems.sh help` |
| `cli/` (Python CLI) | Python CLI 工具（功能同 topems.sh） | `cd cli && pip install -e . && topems --help` |
| `scripts/dev/install-deps.sh` | 安装依赖 | `./scripts/dev/install-deps.sh` |
| `scripts/dev/start-local.sh` | 一键本地启动 | `./scripts/dev/start-local.sh` |
| `scripts/dev/ai-models.sh` | AI 模型管理 | `./scripts/dev/ai-models.sh --help` |
| `scripts/dev/update-admin-password.sh` | 重置管理员密码 | `./scripts/dev/update-admin-password.sh [用户名] [密码]` |
| `scripts/dev/health-check.sh` | 健康检查 | `./scripts/dev/health-check.sh` |
| `scripts/dev/verify-route-matrix.sh` | 路由验证 | `./scripts/dev/verify-route-matrix.sh` |
| `scripts/deploy/deploy.sh` | 部署脚本 | `./scripts/deploy/deploy.sh deploy` |
| `scripts/deploy/install.sh` | Linux 服务器安装 | `./scripts/deploy/install.sh` |
| `scripts/deploy/setup-db.sh` | 数据库设置 | `./scripts/deploy/setup-db.sh` |

详细说明请参考各脚本的 `--help` 输出。

## 📖 文档

### 文档目录

```
docs/
├── README.md                      # 文档中心索引（唯一入口）
├── api/                           # API 文档
│   ├── README.md                  # API 文档总览
│   ├── openapi.yaml               # OpenAPI 规范文档
│   ├── API_AUTH.md                # 认证 API
│   ├── API_ERP.md                 # ERP API
│   ├── API_FINANCE.md             # 财务 API
│   ├── API_HRM.md                 # HRM API
│   ├── API_CRM.md                 # CRM API
│   ├── API_PM.md                  # PM API
│   ├── API_MES.md                 # MES API
│   ├── API_PDM.md                # PDM API
│   ├── API_QMS.md                 # QMS API
│   ├── API_LIMS.md                # LIMS API
│   ├── API_EHS.md                 # EHS API
│   ├── API_RD.md                  # RD 研发管理 API（原 API_RS.md）
│   ├── API_SCM.md                 # SCM API
│   ├── API_WMS.md                 # WMS API
│   ├── API_SRM.md                 # SRM API
│   ├── API_BI.md                  # BI API (API_ANALYTICS)
│   ├── API_REPORT.md              # 报表 API
│   ├── API_PORTAL.md              # 门户 API
│   ├── API_MOBILE.md              # 移动 API
│   ├── API_GIS.md                 # GIS API
│   ├── API_INTEGRATION.md         # 集成 API
│   ├── API_MONITOR.md             # 监控 API
│   ├── API_NOTIFICATION.md        # 通知 API
│   ├── API_WORKFLOW.md            # 工作流 API
│   ├── API_DOC.md                 # 文档 API
│   ├── API_VERSION_AND_SCHEMA_GUIDE.md # API 版本与 Schema 指南
│   ├── services-openapi-status.md # 各服务 OpenAPI 生成状态
│   └── plugins-api.md             # 插件 API
├── architecture/                  # 架构设计（核心文档组）
│   ├── overview.md                # 系统架构总览
│   ├── code-wiki.md               # Code Wiki 项目百科（核心文档）
│   ├── database.md                # 数据库设计规范与 Schema
│   ├── ports.md                   # 28 服务标准端口分配（唯一真相源）
│   ├── standards.md               # 架构与命名规范标准
│   ├── event-driven.md            # 事件驱动架构
│   ├── partitioning-strategy.md   # 数据库分区策略
│   ├── api-path-standardization.md # API 路径统一化规范
│   ├── websocket-path-mapping.md  # WebSocket 路径映射规范
│   ├── microfrontend-architecture-decision.md # 微前端架构决策
│   ├── inventory.md               # 架构清单
│   ├── mes-schema-truth.md        # MES Schema 真相源
│   ├── a2-build-cache.md          # 构建缓存优化
│   └── code-wiki.md               # Code Wiki 百科
├── modules/                       # 业务模块技术文档
│   ├── core/                      # 核心服务模块
│   │   ├── ai-module.md           # AI 智能服务
│   │   └── bi-module.md           # BI 商业智能
│   ├── business/                  # 业务服务模块
│   │   ├── hrm-module.md          # HRM 人力资源
│   │   ├── crm-module.md          # CRM 客户关系
│   │   ├── pm-module.md           # PM 项目管理
│   │   ├── mes-module.md          # MES 制造执行
│   │   ├── pdm-module.md          # PDM 产品数据
│   │   ├── qms-module.md          # QMS 质量管理
│   │   ├── lims-module.md         # LIMS 实验室管理
│   │   ├── ehs-module.md          # EHS 环境健康安全
│   │   ├── rd-module.md           # RD 研发管理（原 rs-module.md）
│   │   ├── scm-module.md          # SCM 供应链
│   │   ├── wms-module.md          # WMS 仓储管理
│   │   ├── srm-module.md          # SRM 供应商管理
│   │   └── gis-module.md          # GIS 地理信息
│   └── development/
│       └── frontend/
│           └── ui-navigation-standardization.md # 前端导航标准化
├── development/                   # 开发指南
│   ├── backend/                    # 后端开发
│   │   ├── code-standards.md      # Rust 代码规范
│   │   ├── backend-services.md    # 微服务开发指南
│   │   ├── api-design.md          # REST API 设计规范
│   │   ├── environment-setup.md   # 开发环境搭建
│   │   ├── template-guidelines.md # 代码模板与脚手架
│   │   ├── database-development.md # 数据库开发
│   │   └── debugging.md           # 后端调试指南
│   ├── frontend/                   # 前端开发
│   │   ├── frontend-components.md # 前端组件规范
│   │   ├── design-system.md       # Design Tokens 设计系统
│   │   ├── ui-design-spec.md      # UI 视觉规范
│   │   ├── ui-navigation-design.md # 导航设计方案
│   │   ├── module-federation-architecture.md # 微前端架构
│   │   ├── module-federation-workflow.md # 微前端工作流
│   │   ├── component-migration-guide.md # 组件迁移指南
│   │   ├── page-refactoring-guide.md # 页面重构指南
│   │   ├── module-layout-guide.md # 模块页面布局规范
│   │   ├── plugin-lifecycle-guide.md # 插件生命周期
│   │   └── accessibility.md       # 无障碍设计指南
│   ├── event-design-guide.md      # 事件设计指南
│   ├── migration-inventory.md     # 迁移清单与校验报告
│   └── migration-naming-convention.md # 迁移命名规范
├── deployment/                    # 部署运维
│   ├── README.md                  # 运维文档总入口
│   ├── deployment-guide-overview.md # 部署指南总览与选型
│   ├── troubleshooting.md         # 故障排查手册
│   ├── release-strategies.md      # 发布策略（灰度/蓝绿/金丝雀）
│   └── microfrontend-deployment.md # 微前端部署
├── getting-started/               # 新手入门
│   ├── quickstart.md              # 快速入门（5 分钟上手）
│   ├── local-deployment.md        # 本地开发环境部署
│   └── environment-config.md      # 环境变量与配置说明
├── user-guide/                    # 最终用户操作手册
│   ├── README.md                  # 用户文档索引
│   ├── quick-start.md             # 用户快速入门
│   ├── UserManual.md              # 完整用户操作手册
│   ├── admin-guide.md             # 系统管理员手册
│   ├── faq.md                     # 常见问题
│   └── modules/                   # 分模块用户手册
│       ├── hrm.md  erp.md  crm.md  pm.md  mes.md
│       ├── pdm.md  qms.md  lims.md ehs.md  rd.md
│       ├── scm.md  wms.md  srm.md  bi.md  finance.md
├── plans/                         # 活跃方案与规划
│   ├── shortcomings-analysis.md   # 短板分析报告
│   ├── integration-implementation-plan.md # 整合实施方案
│   ├── architecture-optimization.md # 架构优化报告
│   └── v68.1-implementation-plan.md # V68.1 实施计划
├── roadmap/                       # 路线图与任务
│   ├── TODO.md                    # 【唯一真相源】当前任务规划与路线图
│   └── roadmap.md                 # ⚠️ 已归档（V3.2~V5.6 历史快照）
├── audit/                         # 审计与验证报告
│   ├── README.md                  # 审计文档索引
│   └── ...
├── reports/                       # 技术债务与测试报告
│   ├── phase21-test-report.md     # Phase21 整合测试报告
│   └── debt-audit-2026-08-13.md   # 技术债务审计报告
├── assessments/                   # 评估与审计报告（前后端映射/数据层/RLS/生命周期）
│   └── README.md                  # 评估报告索引（含主报告 frontend-backend-mapping-assessment）
├── benchmarks/                    # 性能基准报告
│   ├── build-cache-v71.md
│   ├── vite-build-v71.md
│   └── vitest-coverage-v71.md
├── changelog/                     # 版本变更日志
│   ├── CHANGELOG.md               # 中文版本变更记录
│   ├── RELEASE_NOTES_V5.14.0.md   # V5.14.0 发布说明
│   └── CHANGELOG-cleanup-history.md # 清理历史归档
├── sales/                         # 销售资料
│   ├── product-brochure.md        # 产品手册
│   ├── sales-playbook.md          # 销售话术
│   ├── case-study-template.md     # 案例模板
│   └── quick-start-guide.md       # 销售快速入门
├── security/                      # 安全相关
│   └── SECURITY.md                # 安全策略与漏洞处理
├── superpowers/                   # 历史方案归档（旧方案保留）
│   ├── plans/                     # 旧实施计划
│   └── specs/                     # 旧技术规格
└── assets/                        # 文档资源（logo 图片等）
```

### 文档入口

#### 核心文档
| 文档 | 路径 | 说明 |
|------|------|------|
| **Code Wiki 百科** | [docs/architecture/code-wiki.md](docs/architecture/code-wiki.md) | **核心文档** — 全面的项目百科，架构/模块/依赖/部署全覆盖 |
| **当前任务 TODO** | [docs/roadmap/TODO.md](docs/roadmap/TODO.md) | **唯一真相源** — 版本基线、待办进度、验收数字 |
| **系统架构总览** | [docs/architecture/overview.md](docs/architecture/overview.md) | 分层架构、服务配置表（28/28）、技术栈 |
| **OpenAPI 规范** | [docs/api/openapi.yaml](docs/api/openapi.yaml) | 完整 OpenAPI 3.0 规范 |
| **用户操作手册** | [docs/user-guide/UserManual.md](docs/user-guide/UserManual.md) | 16 模块用户操作指南 |
| **数据库设计** | [docs/architecture/database.md](docs/architecture/database.md) | Schema 划分、表结构规范 |
| **标准端口分配** | [docs/architecture/ports.md](docs/architecture/ports.md) | 28 服务端口唯一真相源 |
| **WebSocket 规范** | [docs/architecture/websocket-path-mapping.md](docs/architecture/websocket-path-mapping.md) | WebSocket 连接路径映射规范 |
| **导航架构规范** | [docs/navigation-architecture.md](docs/navigation-architecture.md) | 四层导航模型、12 类导航元素、UI 视觉标准 |

#### API 文档索引
| 文档 | 路径 | 说明 |
|------|------|------|
| API 文档总入口 | [docs/api/README.md](docs/api/README.md) | 所有服务 API 文档入口 |
| API 版本与 Schema | [docs/api/API_VERSION_AND_SCHEMA_GUIDE.md](docs/api/API_VERSION_AND_SCHEMA_GUIDE.md) | API 版本管理与 Schema 规范 |
| 插件开发 API | [docs/api/plugins-api.md](docs/api/plugins-api.md) | 插件开发参考 |
| **服务 API（26 个）** | AUTH · AI · ANALYTICS · CRM · DOC · EHS · ERP · FINANCE · GIS · HRM · INTEGRATION · LIMS · MES · MOBILE · MONITOR · NOTIFICATION · PDM · PM · PORTAL · QMS · REPORT · RD（原RS） · SCM · SRM · WMS · WORKFLOW | 见 [docs/api/](docs/api/) 目录 |

#### 架构与设计
| 文档 | 路径 | 说明 |
|------|------|------|
| 架构规范标准 | [docs/architecture/standards.md](docs/architecture/standards.md) | 命名规范、目录结构标准 |
| 事件驱动架构 | [docs/architecture/event-driven.md](docs/architecture/event-driven.md) | 事件总线、发布订阅机制 |
| API 路径标准化 | [docs/architecture/api-path-standardization.md](docs/architecture/api-path-standardization.md) | 统一路径前缀规范 |
| 微前端架构决策 | [docs/architecture/microfrontend-architecture-decision.md](docs/architecture/microfrontend-architecture-decision.md) | Module Federation 选型决策 |

#### 部署与运维
| 文档 | 路径 | 说明 |
|------|------|------|
| 运维文档索引 | [docs/deployment/README.md](docs/deployment/README.md) | DevOps 文档总入口 |
| 部署指南总览 | [docs/deployment/deployment-guide-overview.md](docs/deployment/deployment-guide-overview.md) | 部署方式选型对比 |
| 故障排查手册 | [docs/deployment/troubleshooting.md](docs/deployment/troubleshooting.md) | 常见问题与解决方案 |
| 发布策略 | [docs/deployment/release-strategies.md](docs/deployment/release-strategies.md) | 灰度、蓝绿、金丝雀发布 |

#### 开发指南
| 文档 | 路径 | 说明 |
|------|------|------|
| 后端代码规范 | [docs/development/backend/code-standards.md](docs/development/backend/code-standards.md) | Rust 代码规范与最佳实践 |
| 后端服务开发 | [docs/development/backend/backend-services.md](docs/development/backend/backend-services.md) | 微服务开发指南 |
| 后端 API 设计 | [docs/development/backend/api-design.md](docs/development/backend/api-design.md) | REST API 设计原则 |
| 前端设计系统 | [docs/development/frontend/design-system.md](docs/development/frontend/design-system.md) | Design Tokens、主题系统 |
| 前端微前端架构 | [docs/development/frontend/module-federation-architecture.md](docs/development/frontend/module-federation-architecture.md) | Module Federation 架构 |

#### 业务模块技术文档
| 模块 | 技术文档 | 用户手册 | 说明 |
|------|---------|---------|------|
| HRM | [hrm-module.md](docs/modules/business/hrm-module.md) | [hrm.md](docs/user-guide/modules/hrm.md) | 人力资源管理 |
| ERP | [erp-module.md](docs/modules/business/erp-module.md) | [erp.md](docs/user-guide/modules/erp.md) | 企业资源计划 |
| Finance | [finance-module.md](docs/modules/business/finance-module.md) | [finance.md](docs/user-guide/modules/finance.md) | 财务管理 |
| CRM | [crm-module.md](docs/modules/business/crm-module.md) | [crm.md](docs/user-guide/modules/crm.md) | 客户关系管理 |
| PM | [pm-module.md](docs/modules/business/pm-module.md) | [pm.md](docs/user-guide/modules/pm.md) | 项目管理 |
| MES | [mes-module.md](docs/modules/business/mes-module.md) | [mes.md](docs/user-guide/modules/mes.md) | 制造执行系统 |
| PDM | [pdm-module.md](docs/modules/business/pdm-module.md) | [pdm.md](docs/user-guide/modules/pdm.md) | 产品数据管理 |
| QMS | [qms-module.md](docs/modules/business/qms-module.md) | [qms.md](docs/user-guide/modules/qms.md) | 质量管理 |
| LIMS | [lims-module.md](docs/modules/business/lims-module.md) | [lims.md](docs/user-guide/modules/lims.md) | 实验室管理 |
| EHS | [ehs-module.md](docs/modules/business/ehs-module.md) | [ehs.md](docs/user-guide/modules/ehs.md) | 环境健康安全 |
| **RD** | [rd-module.md](docs/modules/business/rd-module.md) | [rd.md](docs/user-guide/modules/rd.md) | 研发管理（注意：代码目录 `svc/rd/`） |
| SCM | [scm-module.md](docs/modules/business/scm-module.md) | [scm.md](docs/user-guide/modules/scm.md) | 供应链管理 |
| WMS | [wms-module.md](docs/modules/business/wms-module.md) | [wms.md](docs/user-guide/modules/wms.md) | 仓储管理 |
| SRM | [srm-module.md](docs/modules/business/srm-module.md) | [srm.md](docs/user-guide/modules/srm.md) | 供应商管理 |
| BI | [bi-module.md](docs/modules/core/bi-module.md) | [bi.md](docs/user-guide/modules/bi.md) | 商业智能/数据分析 |
| AI | [ai-module.md](docs/modules/core/ai-module.md) | [ai.md](docs/user-guide/modules/ai.md) | AI 智能服务 |
| GIS | [gis-module.md](docs/modules/business/gis-module.md) | [gis.md](docs/user-guide/modules/gis.md) | 地理信息系统 |

### 快速参考

- **安装部署**: 查看 [部署指南总览](docs/deployment/deployment-guide-overview.md)
- **API 调用**: 查看 [API 文档索引](docs/api/README.md) 或 [OpenAPI 规范](docs/api/openapi.yaml)
- **系统使用**: 查看 [用户操作手册](docs/user-guide/UserManual.md)
- **插件开发**: 查看 [插件 API](docs/api/plugins-api.md) 与 [Code Wiki 插件架构章节](docs/architecture/code-wiki.md)
- **数据库设计**: 查看 [数据库设计文档](docs/architecture/database.md)

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

**最后更新**: 2026-09-05
**版本**: v5.15.0 (正式版)
**内部迭代**: V478（见 [docs/roadmap/TODO.md](docs/roadmap/TODO.md) 版本章节）
**文档版本**: v5.2