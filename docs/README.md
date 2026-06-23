# TOPEMS 文档中心

> 版本: 3.0 | 更新日期: 2026-06-23 | 服务总数: 21

## 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd TOPEMS

# 2. 配置环境
cp .env.example .env

# 3. 启动服务
./scripts/topems.sh start

# 4. 访问系统
# 前端: http://localhost:3000
# API: http://localhost:8000
```

## 文档导航

### 🚀 新手入门

| 文档 | 说明 |
|------|------|
| [QUICKSTART.md](./QUICKSTART.md) | 5 分钟快速入门 |
| [README.md](./README.md) | 本文档（文档中心索引） |

### 📚 核心文档

| 文档 | 说明 |
|------|------|
| [architecture/overview.md](./architecture/overview.md) | 系统架构设计 |
| [deployment-guide.md](./deployment-guide.md) | 部署指南 |
| [port-allocation-rules.md](./port-allocation-rules.md) | 端口分配规则 |
| [api/README.md](./api/README.md) | API 文档 |
| [guides/ENVIRONMENT_CONFIG.md](./guides/ENVIRONMENT_CONFIG.md) | 环境配置 |

### 🛠️ 开发指南

| 文档 | 说明 |
|------|------|
| [QUICKSTART.md](./QUICKSTART.md) | 快速入门 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |
| [services/INTEGRATION_TESTING.md](./services/INTEGRATION_TESTING.md) | 集成测试 |
| [guides/devops/performance-tuning.md](./guides/devops/performance-tuning.md) | 性能调优 |

### 🔧 运维与故障排查

| 文档 | 说明 |
|------|------|
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 故障排查手册 |
| [SECURITY.md](./SECURITY.md) | 安全策略 |
| [guides/devops/performance-tuning.md](./guides/devops/performance-tuning.md) | 性能调优 |

### 📋 项目管理

| 文档 | 说明 |
|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 变更日志 |
| [TODO.md](./TODO.md) | 待办事项与未来规划 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

## 文档结构

```
docs/
├── README.md                       # 文档中心索引（本文件）
├── QUICKSTART.md                   # 快速入门指南
├── CHANGELOG.md                    # 变更日志
├── TODO.md                         # 待办事项
├── SECURITY.md                     # 安全策略
├── TROUBLESHOOTING.md              # 故障排查
├── CONTRIBUTING.md                 # 贡献指南
├── deployment-guide.md             # 主部署指南
├── port-allocation-rules.md        # 端口分配规则
│
├── api/                            # API 文档 (15)
│   ├── README.md                   # API 索引
│   ├── API_AUTH.md                 # 认证 API
│   ├── API_HRM.md                  # HRM API
│   ├── API_QMS.md                  # QMS API
│   ├── API_LIMS.md                 # LIMS API
│   ├── API_EHS.md                  # EHS API
│   ├── API_RS.md                   # RS API
│   ├── API_SRM.md                  # SRM API
│   ├── API_PDM.md                  # PDM API
│   ├── API_REPORT.md               # 报表 API
│   ├── API_WORKFLOW.md             # 工作流 API
│   ├── API_NOTIFICATION.md         # 通知 API
│   ├── API_VERSION_AND_SCHEMA_GUIDE.md
│   ├── openapi.yaml                # OpenAPI 规范
│   └── plugins-api.md              # 插件 API
│
├── architecture/                   # 架构设计 (7)
│   ├── overview.md                 # 系统架构
│   ├── database.md                 # 数据库设计
│   ├── database-design.md          # 详细数据库设计
│   ├── DATABASE_SCHEMA_DESIGN.md   # Schema 设计
│   ├── centralized-id-management-design.md
│   ├── data-exchange-architecture-design.md
│   └── erp-plugin-design.md
│
├── deployment/                     # 部署文档 (1)
│   └── README.md
│
├── guides/                         # 技术指南 (21)
│   ├── ENVIRONMENT_CONFIG.md       # 环境配置
│   ├── migration/                  # 迁移指南 (2)
│   ├── ui/                         # UI 开发 (12)
│   └── devops/                     # DevOps (11)
│
├── services/                       # 服务文档 (19)
│   ├── INTEGRATION_TESTING.md      # 集成测试
│   ├── modules/                    # 模块文档 (14)
│   ├── AI_SETUP_GUIDE.md           # AI 设置
│   ├── MAIL_SERVICE_GUIDE.md       # 邮件服务
│   ├── SERVICE_OPTIMIZATION_GUIDE.md
│   └── SHARED_LIBRARY_GUIDE.md
│
└── user/                           # 用户文档 (1)
    └── UserManual.md
```

## 服务端口映射

| 业务域 | 段位 | 服务 | 端口 | API 前缀 |
|--------|------|------|------|----------|
| 核心服务 | 8000-8009 | unified-core | 8000 | /api/iam/, /api/doc/... |
| 经营管理 | 8010-8019 | erp | 8010 | /api/erp/ |
| 协同办公 | 8020-8029 | hrm(8020), pm(8023), crm(8029) | - | /api/hrm/, /api/pm/, /api/crm/ |
| 生产制造 | 8030-8039 | mes(8030), pdm(8031) | - | /api/mes/, /api/pdm/ |
| 供应链 | 8040-8049 | scm(8040), wms(8041), srm(8042) | - | /api/scm/, /api/wms/, /api/srm/ |
| 质量/研发 | 8050-8059 | qms(8050), lims(8051), ehs(8052), rs(8053) | - | /api/qms/, /api/lims/, /api/ehs/, /api/rs/ |
| 数据分析 | 8060-8069 | bi(8060), report(8061), monitor(8062), portal(8063), ai(8064) | - | /api/bi/, /api/report/, /api/monitor/, /api/portal/, /api/ai/ |
| 基础设施 | 8070-8079 | mobile(8070), gis(8071), integration(8072) | - | /api/mobile/, /api/gis/, /api/integration/ |

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 后端 | Rust | 1.70+ |
| 框架 | Axum | 0.7+ |
| 数据库 | PostgreSQL | 14+ |
| ORM | SQLx | 0.7+ |
| 前端 | React | 18+ |
| 构建 | Vite | 5+ |
| UI | Tailwind CSS | 3+ |
| AI | Ollama | latest |

## 文档统计

| 目录 | 文件数 | 说明 |
|------|--------|------|
| api/ | 15 | API 文档 |
| architecture/ | 7 | 架构设计 |
| deployment/ | 1 | 部署文档 |
| guides/ | 21 | 技术指南 |
| services/ | 19 | 服务文档 |
| user/ | 1 | 用户文档 |
| 根目录 | 8 | 通用文档 |
| **总计** | **72** | |

## 相关链接

- [快速入门](./QUICKSTART.md)
- [架构设计](./architecture/overview.md)
- [部署指南](./deployment-guide.md)
- [API 文档](./api/README.md)
- [故障排查](./TROUBLESHOOTING.md)
- [变更日志](./CHANGELOG.md)
- [TODO 列表](./TODO.md)
- [贡献指南](./CONTRIBUTING.md)
- [安全策略](./SECURITY.md)
- [端口分配规则](./port-allocation-rules.md)
