# TOPEMS 企业级数字化平台

> 统一身份认证与授权管理、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange)
![React](https://img.shields.io/badge/react-18-blue)

## 🌟 功能特性

### 核心服务
- 🔐 **身份认证** - IAM 身份认证，统一权限管理，安全审计
- 📄 **文档管理** - 智能文档管理，版本控制，协作编辑
- 🔀 **流程自动化** - 可视化流程设计，审批工作流
- 📢 **通知服务** - 实时通知，消息推送

### 业务服务
- 🤖 **AI 服务** - 智能问答，文档摘要，自动化建议
- 📊 **数据分析** - 实时报表，数据可视化
- 🏭 **质量管控** - QMS质量管理，EHS安全环保
- 💼 **资源规划** - ERP企业资源，MES制造执行
- 📦 **供应链** - SCM供应链，SRM供应商，CRM客户关系
- 📦 **仓储物流** - WMS仓库管理
- 👥 **人力资源** - HRM人力资源管理
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
- 🤖 **AI 增强** - Ollama 本地 LLM + 向量搜索

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
├── frontend/                      # 前端应用
│   ├── src/
│   │   ├── components/           # 可复用组件
│   │   ├── pages/               # 页面组件
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── api/                 # API 客户端
│   │   └── store/               # 状态管理
│   └── vite.config.ts           # Vite 配置
├── apps/                          # 应用目录
│   └── web/                     # Web 应用
├── svc/                          # 后端服务
│   ├── iam/                     # 身份认证服务 (8000)
│   ├── doc/                     # 文档管理服务 (8001)
│   ├── notification/            # 通知服务 (8003)
│   ├── integration/             # 集成服务 (8004)
│   ├── portal/                  # 企业门户 (8005)
│   ├── flow/                    # 工作流服务 (8006)
│   ├── erp/                     # 企业资源计划 (8010)
│   ├── hrm/                     # 人力资源管理 (8011)
│   ├── crm/                     # 客户关系管理 (8012)
│   ├── ai/                      # AI 知识库 (8013)
│   ├── rs/                      # 研发管理系统 (8020)
│   ├── lims/                    # 实验室系统 (8022)
│   ├── pdm/                     # 产品数据管理 (8023)
│   ├── pm/                      # 项目管理 (8024)
│   ├── mes/                     # 制造执行系统 (8030)
│   ├── qms/                     # 质量管理系统 (8031)
│   ├── ehs/                     # 安全管理系统 (8032)
│   ├── scm/                     # 供应链系统 (8040)
│   ├── srm/                     # 供应商管理 (8041)
│   ├── wms/                     # 仓库管理系统 (8042)
│   ├── gis/                     # 地理信息系统 (8050)
│   ├── im/                      # 即时通讯 (8051)
│   ├── bi/                      # 商业智能 (8052)
│   ├── report/                  # 报表服务 (8053)
│   ├── mail/                    # 邮件服务 (8054)
│   └── mobile/                  # 移动端服务 (8055)
├── lib/                          # 共享库 (topems-shared)
├── docker/                       # Docker 配置
│   ├── init-scripts/            # 数据库初始化脚本
│   ├── rules/                   # 告警规则
│   ├── grafana/                 # Grafana 配置
│   └── docker-compose.yml
├── scripts/                      # 管理脚本
├── tools/                        # 开发工具
├── templates/                    # 数据模板
├── Cargo.toml                   # Cargo Workspace 配置
└── .env                         # 环境变量配置
```

## 🚀 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 后端开发

项目采用 Cargo Workspace 架构，所有服务共享依赖。

```bash
# 编译所有服务（使用 workspace）
cargo build --workspace

# 增量编译（只编译修改的部分）
cargo build

# 检查编译
cargo check --workspace
```

### 数据库初始化

```bash
# 方式一：使用脚本自动初始化（推荐）
# 自动检测环境（本地/Docker PostgreSQL），初始化所有表结构
bash scripts/start-local.sh

# 方式二：仅初始化数据库
bash scripts/init-db-unified.sh

# 方式三：使用 Docker PostgreSQL
docker compose up -d postgres
```

### 数据库配置

TOPEMS 支持多种数据库环境配置：

| 环境 | 数据库 | pgvector | 说明 |
|------|--------|----------|------|
| 本地 macOS | PostgreSQL 18.4 | ✅ 0.8.2 | 推荐开发使用 |
| Docker | PostgreSQL 18.4 | ❌ | 需要重建镜像 |
| 远程 | PostgreSQL 16+ | 可选 | 生产环境 |

#### 自动检测顺序

1. 本地 PostgreSQL（优先，支持 pgvector）
2. Docker PostgreSQL（备用）
3. 远程 PostgreSQL

#### 手动配置

```bash
# 本地 PostgreSQL
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Docker PostgreSQL
DATABASE_URL=postgres://topems:topems@host.docker.internal:5432/topems

# 远程 PostgreSQL
DATABASE_URL=postgres://user:password@remote-host:5432/topems
```

## 🔒 安全配置

### JWT 密钥配置

本系统使用 JWT (JSON Web Token) 进行身份认证。在部署前，**必须**配置以下环境变量：

```bash
# JWT 访问令牌密钥
JWT_SECRET=your-jwt-secret-key-here

# JWT 刷新令牌密钥
REFRESH_SECRET=your-refresh-secret-key-here
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
REFRESH_SECRET=<生成的32字符以上随机密钥>

# 其他配置
DATABASE_URL=postgresql://user:password@localhost:5432/topems
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
./scripts/init-database.sh
```

该脚本会：
1. 创建数据库和用户
2. 创建权限管理相关表（permissions, roles, role_permissions, user_roles, user_permissions）
3. 初始化 70+ 个默认权限
4. 创建 5 个默认角色并分配权限

## 📖 文档

- [API概览](./docs/api/API_DOCUMENTATION.md) - API 文档总览
- [架构设计](./docs/architecture/overview.md) - 系统架构设计
- [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md) - 部署指南
- [用户手册](./docs/user/UserManual.md) - 用户使用手册
- [服务文档](./docs/services/) - 各个服务详细文档
- [AI 模块](./docs/AI_MODULE.md) - AI 知识库与向量搜索
- [向量搜索架构](./docs/vector-architecture.md) - 向量存储设计

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

## 脚本工具

| 脚本 | 说明 |
|------|------|
| `start-local.sh` | 启动核心服务（自动初始化数据库） |
| `start-all.sh` | 启动所有服务（需要 Docker） |
| `stop-all.sh` | 停止所有服务 |
| `init-db-unified.sh` | 统一数据库初始化 |
| `init-vector-index.sh` | Redis 向量索引初始化 |
| `install-pgvector.sh` | 安装配置 pgvector |
| `rebuild-postgres.sh` | 重建 PostgreSQL 容器 |
| `manage-services.sh` | 管理所有服务 |
| `cleanup.sh` | 清理环境 |
| `deploy.sh` | 离线部署 |

详细说明请参考 [脚本工具文档](./scripts/README.md)。

## 📄 许可证

MIT License

## 👥 团队

- Engineering Lead
- Frontend Engineers
- Backend Engineers
- DevOps Engineers

---

**最后更新**: 2026-06-10
**版本**: v2.0.0
