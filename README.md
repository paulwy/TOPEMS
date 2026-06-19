# TOPEMS 企业级数字化平台

> 统一身份认证与授权管理、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Rust](https://img.shields.io/badge/rust-1.76%2B-orange)
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
- 📊 **数据分析** - 实时报表，数据可视化
- 🏭 **质量管控** - QMS质量管理，EHS安全环保
- 💼 **资源规划** - ERP企业资源，MES制造执行
- 📦 **供应链** - SCM供应链，SRM供应商，CRM客户关系
- 📦 **仓储物流** - WMS仓库管理
- 👥 **人力资源** - HRM人力资源管理（共享Schema）
- 🔬 **实验室** - LIMS实验室管理
- 🔬 **研发管理** - RS科研研发
- 🌍 **地理信息** - GIS服务
- 📋 **产品数据** - PDM产品数据管理
- 💬 **即时通讯** - IM即时通讯
- 📈 **商业智能** - BI数据分析
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
│   ├── web/                      # Host Shell 应用 (端口 3000)
│   │   ├── src/components/       # 可复用组件
│   │   ├── src/pages/           # 页面组件
│   │   ├── src/hooks/           # 自定义 hooks
│   │   ├── src/api/             # API 客户端
│   │   └── src/store/           # 状态管理
│   └── core/                     # Remote Module (端口 3001)
│       └── src/                 # 可复用组件、stores、API
├── svc/                          # 后端服务 (Rust)
│   ├── unified-core/            # 统一核心服务 (8000)
│   ├── ai/                      # AI 服务 (8050)
│   ├── analytics/               # 数据分析服务 (8044)
│   ├── manufacturing/           # 制造服务 (8030)
│   ├── quality-assurance/       # 质量管控服务 (8052)
│   ├── hrm/                     # 人力资源管理 (8011)
│   ├── crm/                     # 客户关系管理 (8012)
│   ├── pm/                      # 项目管理 (8046)
│   ├── erp/                     # 企业资源计划 (8010)
│   ├── gis/                     # 地理信息系统 (8054)
│   ├── rs/                      # 研发管理 (8058)
│   ├── scm/                     # 供应链管理 (8040)
│   ├── wms/                     # 仓库管理 (8042)
│   ├── mobile/                  # 移动端服务 (8056)
│   ├── monitor/                 # 监控服务 (8064)
│   └── portal/                  # 企业门户 (8066)
├── lib/                          # Rust 共享库
├── packages/                     # TypeScript 共享包
│   ├── shared-types/            # 类型定义
│   └── shared-utils/            # 工具函数
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

### 系统要求

- **前端**: Node.js 18+, pnpm 8+
- **后端**: Rust 1.76+, Cargo
- **数据库**: PostgreSQL 16+, Redis 7+
- **工具**: 可选 Docker, Docker Compose（仅用于开发环境快速启动）

### 环境配置

```bash
# 复制环境变量示例文件
cp .env.example .env

# 配置 JWT 密钥（必须配置！）
# 生成安全密钥
openssl rand -base64 32
```

编辑 `.env` 文件，设置必要的配置项。

### 启动数据库（方式一：本地安装，推荐）

**macOS (Homebrew):**

```bash
# 安装 PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 创建数据库
createdb topems

# 安装 Redis（可选）
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**

```bash
# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 创建数据库用户和数据库
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"
```

### 启动数据库（方式二：Docker）

```bash
cd deploy/monitoring
docker-compose up -d postgres redis
```

### 前端开发

**Host Shell (主应用):**

```bash
cd apps/web
pnpm install
pnpm run dev
```

访问 http://localhost:3000

**Remote Module (核心组件):**

```bash
cd apps/core
pnpm install
pnpm run dev:watch    # 自动构建模式
pnpm run preview      # 预览服务器（端口 3001）
```

### 后端开发

项目采用 Cargo Workspace 架构，所有服务共享依赖。

```bash
# 编译所有服务（使用 workspace）
cargo build --workspace

# 运行统一核心服务
cd svc/unified-core
cargo run

# 检查编译
cargo check --workspace
```

### 一键启动所有服务（开发环境）

```bash
# 使用 macOS 开发环境启动脚本
./scripts/start-macos-dev.sh
```

## 🔌 端口配置规范

### 端口分配原则

| 端口范围 | 服务类型 | 说明 |
|---------|---------|------|
| 8000-8009 | 平台核心服务 | Unified Core, AI, Analytics, Manufacturing, Quality Assurance |
| 8010-8019 | 业务服务 | ERP, HRM, CRM |
| 8030-8039 | 制造服务 | Manufacturing |
| 8040-8049 | 供应链服务 | SCM, WMS |
| 8050-8059 | 辅助服务 | AI, GIS, Mobile, Quality-Assurance |
| 8060-8069 | 扩展服务 | Analytics, Monitor, Portal, Integration, SRM |
| 8000 | 核心服务 | Unified-Core (IAM) |
| 3000 | 前端 | Host Shell 开发服务器 |
| 3001 | 前端 | Remote Module 开发服务器 |

### 服务端口清单

| 服务名 | 端口 | 服务路径 | 说明 |
|-------|------|---------|------|
| unified-core | 8000 | svc/unified-core | 统一核心服务（IAM, Doc, Flow, File, Communication, Tenant, Billing, Plugin） |
| erp | 8010 | svc/erp | 企业资源计划 |
| hrm | 8011 | svc/hrm | 人力资源管理 |
| crm | 8012 | svc/crm | 客户关系管理 |
| manufacturing | 8030 | svc/manufacturing | 制造服务（MES, PDM） |
| scm | 8040 | svc/scm | 供应链管理 |
| wms | 8042 | svc/wms | 仓库管理 |
| pm | 8046 | svc/pm | 项目管理 |
| analytics | 8044 | svc/analytics | 数据分析服务（BI, Report） |
| ai | 8050 | svc/ai | AI 服务 |
| quality-assurance | 8052 | svc/quality-assurance | 质量管控服务（QMS, LIMS, EHS） |
| gis | 8054 | svc/gis | 地理信息系统 |
| mobile | 8056 | svc/mobile | 移动端服务 |
| srm | 8060 | svc/srm | 供应商关系管理 |
| monitor | 8064 | svc/monitor | 监控服务 |
| portal | 8066 | svc/portal | 企业门户 |
| integration | 8068 | svc/integration | 集成服务 |
| rs | 8058 | svc/rs | 研发管理 |

### 前端端口

| 应用 | 端口 | 路径 | 说明 |
|------|------|------|------|
| Host Shell | 3000 | apps/web | 主应用 |
| Remote Module | 3001 | apps/core | 核心组件模块 |

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

| 脚本 | 说明 | 使用方法 |
|------|------|---------|
| `scripts/init-database.sh` | 初始化数据库 | `./scripts/init-database.sh` |
| `scripts/manage-services.sh` | 管理单个服务 | `./scripts/manage-services.sh start iam` |
| `scripts/start-all.sh` | 一键启动所有服务（推荐） | `./scripts/start-all.sh` |
| `scripts/stop-all.sh` | 一键停止所有服务 | `./scripts/stop-all.sh` |
| `scripts/cleanup.sh` | 全面清理（端口、进程、缓存） | `./scripts/cleanup.sh` |
| `scripts/deploy.sh` | 离线部署脚本 | `./scripts/deploy.sh` |
| `scripts/download-images.sh` | 下载 Docker 镜像 | `./scripts/download-images.sh` |
| `scripts/build-all-services.sh` | 构建所有服务镜像 | `./scripts/build-all-services.sh build` |
| `scripts/run-clippy.sh` | 运行 Clippy 代码检查 | `./scripts/run-clippy.sh` |
| `scripts/run_ci_tests.sh` | 运行 CI 测试 | `./scripts/run_ci_tests.sh` |

### 服务管理脚本使用

```bash
# 查看服务状态
./scripts/manage-services.sh status

# 启动单个服务
./scripts/manage-services.sh start iam

# 停止单个服务
./scripts/manage-services.sh stop iam

# 重启单个服务
./scripts/manage-services.sh restart iam

# 查看服务日志
./scripts/manage-services.sh logs iam 100

# 列出所有服务
./scripts/manage-services.sh list

# 验证环境变量
./scripts/manage-services.sh validate-env

# 启动核心服务
./scripts/manage-services.sh start-core
```

## 📖 文档

- [Python CLI](./cli/README.md) - 服务管理命令行工具
- [API概览](./docs/api/API_DOCUMENTATION.md) - API 文档总览
- [架构设计](./docs/architecture/overview.md) - 系统架构设计
- [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md) - 部署指南
- [离线部署指南](./docs/deployment/DEPLOYMENT_OFFLINE.md) - 离线部署指南
- [用户手册](./docs/user/UserManual.md) - 用户使用手册
- [服务文档](./docs/services/) - 各个服务详细文档
- [环境配置指南](./docs/guides/ENVIRONMENT_CONFIG.md) - 环境配置指南
- [AI 模块](./docs/AI_MODULE.md) - AI 知识库与向量搜索
- [向量搜索架构](./docs/vector-architecture.md) - 向量存储设计
- [PostgreSQL 故障排查](./docs/postgresql-troubleshooting.md) - 数据库自动修复与故障排查

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

## 🚀 统一服务管理

### 主脚本

TOPEMS 提供统一的服务管理脚本 `scripts/topems.sh`，简化服务管理操作：

```bash
# 启动核心服务（IAM, HRM, Mail, File）
./scripts/topems.sh start

# 启动所有服务
./scripts/topems.sh start-all

# 停止所有服务
./scripts/topems.sh stop

# 查看服务状态
./scripts/topems.sh status

# 编译所有服务
./scripts/topems.sh build

# 检查编译状态
./scripts/topems.sh check

# 查看服务日志
./scripts/topems.sh logs <服务名> [行数]

# 清理资源
./scripts/topems.sh clean
```

### 脚本工具列表

| 脚本 | 说明 |
|------|------|
| `topems.sh` | **统一服务管理脚本**（推荐使用，自动检测环境） |
| `run-tests.sh` | 运行测试套件（单元测试、集成测试、覆盖率） |
| `run-clippy.sh` | 运行 Clippy 静态分析 |
| `run_ci_tests.sh` | CI/CD 测试脚本 |
| `build-all-services.sh` | 构建所有服务镜像 |
| `clean-warnings.sh` | 批量清理代码警告 |
| `test-all-rust-services.sh` | 检查所有 Rust 服务编译状态 |
| `stop-all.sh` | 停止所有服务 |
| `cleanup.sh` | 清理环境（端口、进程、缓存） |
| `setup-db.sh` | 数据库设置脚本 |
| `init-db-unified.sh` | 统一数据库初始化（自动检测环境） |
| `init-vector-index.sh` | Redis 向量索引初始化 |
| `install-pgvector.sh` | 安装配置 pgvector |
| `deploy.sh` | 离线部署脚本 |
| `monitor.sh` | 启动监控服务 |
| `encrypt-env.sh` | 加密环境变量文件 |
| `test-hrm-api.sh` | HRM API 端到端测试 |
| `collect-test-data.sh` | 收集测试数据 |

详细说明请参考 [脚本工具文档](./scripts/README.md)。

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

### 前端

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
npm run lint         # 代码检查
npm run test         # 运行单元测试
npm run e2e          # 运行端到端测试
npm run format       # 代码格式化
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

**最后更新**: 2026-06-18
**版本**: v2.5.0