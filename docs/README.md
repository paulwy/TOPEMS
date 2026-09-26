# TOPEMS 文档中心

TOPEMS（Total Operations & Production Enterprise Management System）是面向制造业的全栈企业管理平台，
集成 ERP、MES、CRM、WMS、HRM、QMS、SCM、APS、EHS、BI 等业务模块，并通过 AI 智能中枢提供业务辅助。

本文档中心按**读者角色**分层组织，帮助你快速找到所需文档。

## 文档统计

| 指标 | 数值 |
|------|------|
| Markdown 文档总数 | **360** |
| 一级目录 | 19 个 |
| 归档历史文档 | 92 份 |

---

## 按角色导航

### 新用户 / 入门者

| 目录 | 说明 | 关键文档 |
|------|------|----------|
| [getting-started/](./getting-started/) | 快速上手 | [quickstart.md](./getting-started/quickstart.md)、[local-deployment.md](./getting-started/local-deployment.md)、[environment-config.md](./getting-started/environment-config.md) |

### 开发者

| 目录 | 说明 | 关键文档 |
|------|------|----------|
| [developer/](./developer/) | 开发指南总入口 | [README.md](./developer/README.md)（项目结构、命令、Git 规范、审查清单） |
| └ developer/backend/ | 后端开发 | 环境搭建、服务架构、API 设计、Rust 规范、数据库开发、调试 |
| └ developer/frontend/ | 前端开发 | 设计系统、模块联邦、组件迁移、插件生命周期、无障碍 |
| └ developer/standards/ | 跨端技术标准 | 架构标准、API/WebSocket 路径、迁移命名、日期类型、缓存键、MCP 标准 |
| └ developer/ 根级 | 专题文档 | [git-workflow.md](./developer/git-workflow.md)、[monolith.md](./developer/monolith.md)、[event-design-guide.md](./developer/event-design-guide.md)、[lefthook-guide.md](./developer/lefthook-guide.md) |
| [architecture/](./architecture/) | 系统架构 | [overview.md](./architecture/overview.md)、[modular-monolith-design.md](./architecture/modular-monolith-design.md)、[event-driven.md](./architecture/event-driven.md)、[ports.md](./architecture/ports.md) |
| [database/](./database/) | 数据库 | [database-design.md](./database/database-design.md)、RLS 覆盖率报告、库表拆分与合并方案 |
| [api/](./api/) | API 文档 | 按模块划分的 API_*.md（ERP/CRM/HRM/MES/WMS/QMS 等 28 份）、[api-error-codes.md](./api/api-error-codes.md)、OpenAPI YAML |
| [modules/](./modules/) | 业务模块规格 | business/（15 个业务模块）、core/（AI、BI 等核心模块） |

### 运维人员

| 目录 | 说明 | 关键文档 |
|------|------|----------|
| [admin/](./admin/) | 运维统一入口 | [README.md](./admin/README.md)（部署/运维/监控/模板导航） |
| [testing/](./testing/) | 测试文档 | AI 业务集成测试计划、E2E 指南、性能测试指南、Lighthouse |
| [security/](./security/) | 安全 | [SECURITY.md](./security/SECURITY.md)、[security-best-practices.md](./security/security-best-practices.md) |
| [performance/](./performance/) | 性能 | [performance-testing-best-practices.md](./performance/performance-testing-best-practices.md)、[optimization-guide.md](./performance/optimization-guide.md)、benchmarks/ |

### 最终用户

| 目录 | 说明 | 关键文档 |
|------|------|----------|
| [user-guide/](./user-guide/) | 用户手册 | [UserManual.md](./user-guide/UserManual.md)（完整操作手册）、[faq.md](./user-guide/faq.md)、[quick-start.md](./user-guide/quick-start.md)、[admin-guide.md](./user-guide/admin-guide.md)、[system-feature-checklist.md](./user-guide/system-feature-checklist.md) |

### 项目经理

| 目录 | 说明 | 关键文档 |
|------|------|----------|
| [project/](./project/) | 项目管理 | [TODO.md](./project/TODO.md)、[roadmap.md](./project/roadmap.md)、[release-governance.md](./project/release-governance.md)、[go-live-checklist.md](./project/go-live-checklist.md)、[project-acceptance-checklist.md](./project/project-acceptance-checklist.md) |
| [reports/](./reports/) | 报告与评估 | [README.md](./reports/README.md)（审计/注册表/历史报告统一索引） |
| [changelog/](./changelog/) | 变更记录 | [CHANGELOG.md](./changelog/CHANGELOG.md)、版本发布说明 |

### 设计团队

| 目录 | 说明 |
|------|------|
| [design/](./design/) | UI 设计规范、导航架构、页面模板、组件指南、英文风格指南、UI 重设计文档 |

### 销售 / 培训

| 目录 | 说明 |
|------|------|
| [sales/](./sales/) | 产品手册、销售剧本、案例模板、快速上手指南 |
| [training/](./training/) | 培训计划、培训材料大纲 |

### 历史归档

| 目录 | 说明 |
|------|------|
| [archive/](./archive/) | 已完成的计划与历史文档 |
| └ archive/superpowers/ | 已执行完毕的 Superpowers 计划与规格 |
| └ archive/roadmap-history/ | 历史路线图快照与周报 |
| └ archive/ui-migration/ | UI v3 迁移全套文档（指南、FAQ、测试清单） |
| └ archive/misc/ | 其他归档文档（旧版评估报告、泛化指南、交付总结等） |

---

## 快速场景指引

| 我想… | 去这里 |
|-------|--------|
| 第一次部署系统 | [getting-started/local-deployment.md](./getting-started/local-deployment.md) |
| 开始写代码 | [developer/README.md](./developer/README.md) |
| 查 API 接口 | [api/](./api/) 目录对应模块的 API_*.md |
| 排查线上故障 | [admin/troubleshooting-cheatsheet.md](./admin/troubleshooting-cheatsheet.md) |
| 做生产部署 | [admin/PRODUCTION_DEPLOYMENT_CHECKLIST.md](./admin/PRODUCTION_DEPLOYMENT_CHECKLIST.md) |
| 了解业务功能怎么用 | [user-guide/UserManual.md](./user-guide/UserManual.md) |
| 看当前版本待办 | [project/TODO.md](./project/TODO.md) |
| 查历史评估结论 | [reports/README.md](./reports/README.md) |

---

*本文档由 TOPEMS 团队维护，最后更新：2026-09-26*
