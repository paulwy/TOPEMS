# TOPEMS 文档中心

> 版本: 3.1 | 更新日期: 2026-06-27 | 服务总数: 21

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
| [user-guide/quick-start.md](./user-guide/quick-start.md) | 用户快速上手指南 |

### 📚 核心文档

| 文档 | 说明 |
|------|------|
| [architecture/overview.md](./architecture/overview.md) | 系统架构设计 |
| [architecture/standards.md](./architecture/standards.md) | 架构与命名规范标准 |
| [architecture/database.md](./architecture/database.md) | 数据库设计规范 |
| [deployment-guide.md](./deployment-guide.md) | 部署指南（总览） |
| [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md) | 本地部署详细指南 |
| [port-allocation-rules.md](./port-allocation-rules.md) | 端口分配规则 |
| [api/README.md](./api/README.md) | API 文档索引 |

### 🛠️ 开发指南

| 文档 | 说明 |
|------|------|
| [guides/development/environment-setup.md](./guides/development/environment-setup.md) | 开发环境搭建 |
| [guides/development/code-standards.md](./guides/development/code-standards.md) | 代码规范 |
| [guides/development/api-design.md](./guides/development/api-design.md) | API 设计规范 |
| [guides/development/frontend-components.md](./guides/development/frontend-components.md) | 前端组件规范 |
| [guides/development/backend-services.md](./guides/development/backend-services.md) | 后端服务规范 |
| [guides/development/debugging.md](./guides/development/debugging.md) | 调试指南 |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南（根目录） |

### 🎨 UI 开发指南

| 文档 | 说明 |
|------|------|
| [guides/ui/ui-design-spec.md](./guides/ui/ui-design-spec.md) | UI 设计规范 |
| [guides/ui/design-system.md](./guides/ui/design-system.md) | 设计系统 |
| [guides/ui/ui-navigation-design.md](./guides/ui/ui-navigation-design.md) | 导航设计方案 |
| [guides/ui/module-layout-guide.md](./guides/ui/module-layout-guide.md) | 模块布局指南 |
| [guides/ui/page-refactoring-guide.md](./guides/ui/page-refactoring-guide.md) | 页面重构指南 |
| [guides/ui/component-migration-guide.md](./guides/ui/component-migration-guide.md) | 组件迁移指南 |
| [guides/ui/module-federation-architecture.md](./guides/ui/module-federation-architecture.md) | 微前端架构 |
| [guides/ui/module-federation-workflow.md](./guides/ui/module-federation-workflow.md) | 微前端工作流 |
| [guides/ui/plugin-lifecycle-guide.md](./guides/ui/plugin-lifecycle-guide.md) | 插件生命周期 |

### 🔧 运维与故障排查

| 文档 | 说明 |
|------|------|
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 故障排查手册 |
| [SECURITY.md](./SECURITY.md) | 安全策略 |
| [guides/devops/README.md](./guides/devops/README.md) | 运维文档索引 |
| [guides/devops/deployment-guide.md](./guides/devops/deployment-guide.md) | 服务部署指南 |
| [guides/devops/database-maintenance.md](./guides/devops/database-maintenance.md) | 数据库维护 |
| [guides/devops/monitoring-alerting.md](./guides/devops/monitoring-alerting.md) | 监控告警 |
| [guides/devops/logging-guide.md](./guides/devops/logging-guide.md) | 日志管理 |
| [guides/devops/performance-tuning.md](./guides/devops/performance-tuning.md) | 性能调优 |
| [guides/devops/error-handling-guide.md](./guides/devops/error-handling-guide.md) | 错误处理 |
| [guides/devops/scripts-guide.md](./guides/devops/scripts-guide.md) | 脚本使用指南 |
| [guides/devops/permission-management.md](./guides/devops/permission-management.md) | 权限管理 |
| [guides/devops/permission-system-design.md](./guides/devops/permission-system-design.md) | 权限系统设计 |
| [guides/devops/pgvector-usage.md](./guides/devops/pgvector-usage.md) | pgvector 使用指南 |
| [guides/devops/service-bootstrap-guide.md](./guides/devops/service-bootstrap-guide.md) | 服务引导指南 |
| [guides/devops/components-guide.md](./guides/devops/components-guide.md) | 组件指南 |
| [guides/devops/template-usage-guide.md](./guides/devops/template-usage-guide.md) | 模板使用指南 |
| [guides/devops/developers-guide.md](./guides/devops/developers-guide.md) | 开发者指南 |
| [guides/devops/SERVICE_CLIENT_GUIDE.md](./guides/devops/SERVICE_CLIENT_GUIDE.md) | 服务客户端指南 |
| [guides/devops/EVENT_DRIVEN_GUIDE.md](./guides/devops/EVENT_DRIVEN_GUIDE.md) | 事件驱动架构指南 |

### 📋 项目管理

| 文档 | 说明 |
|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 变更日志 |
| [../TODO.md](../TODO.md) | 待办事项与未来规划（根目录） |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南（根目录） |

### 👥 用户指南

| 文档 | 说明 |
|------|------|
| [user-guide/README.md](./user-guide/README.md) | 用户指南索引 |
| [user-guide/quick-start.md](./user-guide/quick-start.md) | 快速入门 |
| [user-guide/admin-guide.md](./user-guide/admin-guide.md) | 管理员指南 |
| [user-guide/faq.md](./user-guide/faq.md) | 常见问题 |
| [user-guide/modules/](./user-guide/modules/) | 各模块用户指南（12个模块） |

### 🔌 服务文档

| 文档 | 说明 |
|------|------|
| [services/AI_SETUP_GUIDE.md](./services/AI_SETUP_GUIDE.md) | AI 服务配置 |
| [services/MAIL_SERVICE_GUIDE.md](./services/MAIL_SERVICE_GUIDE.md) | 邮件服务配置 |
| [services/SERVICE_OPTIMIZATION_GUIDE.md](./services/SERVICE_OPTIMIZATION_GUIDE.md) | 服务优化指南 |
| [services/SHARED_LIBRARY_GUIDE.md](./services/SHARED_LIBRARY_GUIDE.md) | 共享库指南 |
| [services/INTEGRATION_TESTING.md](./services/INTEGRATION_TESTING.md) | 集成测试 |
| [services/modules/](./services/modules/) | 各模块服务文档（14个模块） |

### 💰 销售与市场

| 文档 | 说明 |
|------|------|
| [sales/sales-playbook.md](./sales/sales-playbook.md) | 销售策略手册（内部使用） |
| [sales/product-brochure.md](./sales/product-brochure.md) | 产品介绍册（面向客户） |
| [sales/case-study-template.md](./sales/case-study-template.md) | 成功案例模板（面向客户） |
| [sales/quick-start-guide.md](./sales/quick-start-guide.md) | 快速上手指南（面向新用户） |

### 📊 报告与分析

| 文档 | 说明 |
|------|------|
| [reports/compliance-report.md](./reports/compliance-report.md) | 标准化合规性报告 |
| [reports/todo-scan-report.md](./reports/todo-scan-report.md) | TODO/FIXME 扫描报告 |
| [reports/test-report.md](./reports/test-report.md) | 测试报告 |
| [reports/backend-frontend-gap-analysis.md](./reports/backend-frontend-gap-analysis.md) | 前后端功能对比分析 |
| [reports/ui-menu-system-analysis.md](./reports/ui-menu-system-analysis.md) | 系统页面规划与菜单体系分析 |
| [reports/ui-page-planning-checklist.md](./reports/ui-page-planning-checklist.md) | 系统页面规划实施清单 |
| [reports/ui-page-implementation-guide.md](./reports/ui-page-implementation-guide.md) | UI 页面实施指南 |
| [reports/component-library-optimization.md](./reports/component-library-optimization.md) | 组件库优化方案 |
| [reports/health-check-component-guide.md](./reports/health-check-component-guide.md) | 健康检查组件使用指南 |

## 文档结构

```
docs/
├── README.md                       # 文档中心索引（本文件）
├── QUICKSTART.md                   # 快速入门指南
├── CHANGELOG.md                    # 变更日志
├── SECURITY.md                     # 安全策略
├── TROUBLESHOOTING.md              # 故障排查
├── deployment-guide.md             # 主部署指南
├── LOCAL_DEPLOYMENT.md             # 本地部署详细指南
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
├── architecture/                   # 架构设计 (6)
│   ├── overview.md                 # 系统架构总览
│   ├── standards.md                # 架构与命名规范标准
│   ├── database.md                 # 数据库设计规范
│   ├── centralized-id-management-design.md
│   ├── data-exchange-architecture-design.md
│   └── erp-plugin-design.md
│
├── deployment/                     # 部署文档 (1)
│   └── README.md
│
├── guides/                         # 技术指南
│   ├── ENVIRONMENT_CONFIG.md       # 环境配置
│   ├── development/                # 开发指南 (6)
│   ├── devops/                     # DevOps 指南 (19)
│   ├── migration/                  # 迁移指南 (2)
│   └── ui/                         # UI 开发指南 (9)
│
├── services/                       # 服务文档 (19)
│   ├── INTEGRATION_TESTING.md      # 集成测试
│   ├── modules/                    # 模块文档 (14)
│   ├── AI_SETUP_GUIDE.md           # AI 设置
│   ├── MAIL_SERVICE_GUIDE.md       # 邮件服务
│   ├── SERVICE_OPTIMIZATION_GUIDE.md
│   └── SHARED_LIBRARY_GUIDE.md
│
├── user-guide/                     # 用户指南 (16)
│   ├── README.md                   # 用户指南索引
│   ├── quick-start.md              # 快速入门
│   ├── admin-guide.md              # 管理员指南
│   ├── faq.md                      # 常见问题
│   └── modules/                    # 模块用户指南 (12)
│
├── reports/                        # 报告与分析 (9)
│   ├── compliance-report.md        # 标准化合规性报告
│   ├── todo-scan-report.md         # TODO 扫描报告
│   ├── test-report.md              # 测试报告
│   ├── backend-frontend-gap-analysis.md  # 前后端功能对比
│   ├── ui-menu-system-analysis.md  # 菜单体系分析
│   ├── ui-page-planning-checklist.md  # 页面规划清单
│   ├── ui-page-implementation-guide.md  # 页面实施指南
│   ├── component-library-optimization.md  # 组件库优化
│   └── health-check-component-guide.md  # 健康检查组件
│
├── sales/                          # 销售与市场 (4)
│   ├── sales-playbook.md           # 销售策略手册（内部）
│   ├── product-brochure.md           # 产品介绍册（客户）
│   ├── case-study-template.md      # 成功案例模板
│   └── quick-start-guide.md       # 快速上手指南
│
└── user/                           # 用户手册 (1)
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
| 后端 | Rust | 1.76+ |
| 框架 | Axum | 0.7+ |
| 数据库 | PostgreSQL | 16+ |
| ORM | SQLx | 0.7+ |
| 前端 | React | 19 |
| 构建 | Vite | 5+ |
| UI | Tailwind CSS + Ant Design | 5+ |
| AI | Ollama | latest |

## 文档统计

| 目录 | 文件数 | 说明 |
|------|--------|------|
| api/ | 15 | API 文档 |
| architecture/ | 6 | 架构设计 |
| deployment/ | 1 | 部署文档 |
| guides/ | 36 | 技术指南 |
| services/ | 19 | 服务文档 |
| user-guide/ | 16 | 用户指南 |
| reports/ | 9 | 报告与分析 |
| sales/ | 4 | 销售与市场 |
| user/ | 1 | 用户手册 |
| 根目录 | 8 | 通用文档 |
| **总计** | **115** | |

## 相关链接

- [快速入门](./QUICKSTART.md)
- [架构设计](./architecture/overview.md)
- [部署指南](./deployment-guide.md)
- [API 文档](./api/README.md)
- [故障排查](./TROUBLESHOOTING.md)
- [变更日志](./CHANGELOG.md)
- [安全策略](./SECURITY.md)
- [端口分配规则](./port-allocation-rules.md)
- [贡献指南](../CONTRIBUTING.md)
- [待办事项](../TODO.md)

## 文档维护

### 维护责任人

| 文档类别 | 责任人 | 说明 |
|---------|--------|------|
| 架构设计 | 架构师 | architecture/ 目录 |
| API 文档 | 后端负责人 | api/ 目录 |
| 数据库设计 | 后端负责人 | architecture/database.md |
| 部署文档 | 运维负责人 | deployment-guide.md, LOCAL_DEPLOYMENT.md |
| UI 开发指南 | 前端负责人 | guides/ui/ 目录 |
| DevOps 指南 | 运维负责人 | guides/devops/ 目录 |
| 服务文档 | 各模块负责人 | services/ 目录 |
| 用户指南 | 产品/测试 | user-guide/ 目录 |
| 报告与分析 | 自动生成 | reports/ 目录 |
| 销售与市场 | 销售负责人 | sales/ 目录 |

> 不确定找谁？先问架构师。

### 简单规则（3条）

1. **改代码 = 改文档** — 功能变了，相关文档顺手更了
2. **文档头部加日期** — `> 最后更新: 2026-06-27` 就行
3. **每月跑一次检查** — `python3 scripts/check_docs_health.py`

### 健康检查

```bash
# 一键检查文档状态
python3 scripts/check_docs_health.py
```

检查内容：
- 哪些文档没有更新日期
- 哪些文档超过 90 天没更新（可能过时）
- 哪些文档有 TODO / 待更新 / 废弃标记
