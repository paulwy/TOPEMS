# TOPEMS 文档中心

> **版本**: v5.2 | **更新日期**: 2026-08-03 | **服务总数**: 30+ | **前端页面**: 423
> **文档管理**: 统一目录结构 · 相对链接 · 内容去重 · 归档清晰

---

## 快速导航

| 类别 | 说明 | 入口 |
|------|------|------|
| 🚀 **快速开始** | 5 分钟上手、本地部署、环境配置 | [进入 →](#快速开始) |
| 🏗️ **架构设计** | 系统架构、Code Wiki、数据库、事件驱动 | [进入 →](#架构设计) |
| 📦 **业务模块** | 24 个服务模块文档、核心/业务分组 | [进入 →](#业务模块) |
| 🔌 **API 文档** | REST API、OpenAPI、各服务 API 索引 | [进入 →](#api-文档) |
| 🛠️ **开发指南** | 后端/前端/DevOps/迁移 开发规范 | [进入 →](#开发指南) |
| 🚢 **部署运维** | 部署指南、监控告警、故障排查、发布 | [进入 →](#部署运维) |
| 📋 **方案与规划** | 短板分析、整合实施、架构优化 | [进入 →](#方案与规划) |
| 🗺️ **路线图** | TODO 任务、版本规划、长期路线 | [进入 →](#路线图与任务) |
| 🔒 **安全** | 安全策略、漏洞处理 | [进入 →](#安全) |
| 📝 **变更日志** | 版本变更记录 | [进入 →](#变更日志) |

---

## 快速开始

| 文档 | 说明 |
|------|------|
| [快速入门](getting-started/quickstart.md) | 5 分钟快速上手指南 |
| [本地部署](getting-started/local-deployment.md) | 本地开发环境详细部署步骤 |
| [环境配置](getting-started/environment-config.md) | 环境变量与配置说明 |

---

## 架构设计

| 文档 | 说明 |
|------|------|
| [系统架构总览](architecture/overview.md) | 整体架构分层、技术栈、设计原则 |
| [Code Wiki 百科](architecture/code-wiki.md) | **核心文档** — 全面的项目百科，含架构、模块、关键类、依赖、部署、优化方案 |
| [数据库设计](architecture/database.md) | 数据库设计规范、Schema、索引策略 |
| [事件驱动架构](architecture/event-driven.md) | 事件总线、事件类型、发布订阅机制 |
| [架构规范标准](architecture/standards.md) | 命名规范、目录结构、代码组织标准 |

---

## 业务模块

### 核心服务

| 模块 | 说明 | 文档 |
|------|------|------|
| AI | 智能助手、知识图谱、AI 能力 | [查看](modules/core/ai-module.md) |
| BI | 商业智能、数据分析、报表 | [查看](modules/core/bi-module.md) |

### 业务服务

| 模块 | 说明 | 文档 |
|------|------|------|
| HRM | 人力资源管理 | [查看](modules/business/hrm-module.md) |
| CRM | 客户关系管理 | [查看](modules/business/crm-module.md) |
| PDM | 产品数据管理 | [查看](modules/business/pdm-module.md) |
| MES | 制造执行系统 | [查看](modules/business/mes-module.md) |
| PM | 项目管理 | [查看](modules/business/pm-module.md) |
| QMS | 质量管理系统 | [查看](modules/business/qms-module.md) |
| LIMS | 实验室信息管理 | [查看](modules/business/lims-module.md) |
| EHS | 环境健康安全 | [查看](modules/business/ehs-module.md) |
| SRM | 供应商关系管理 | [查看](modules/business/srm-module.md) |
| WMS | 仓储管理系统 | [查看](modules/business/wms-module.md) |
| RD | 研发管理 | [查看](modules/business/rd-module.md) |
| GIS | 地理信息系统 | [查看](modules/business/gis-module.md) |

> 更多模块文档请查看 [modules/](modules/) 目录

---

## API 文档

| 文档 | 说明 |
|------|------|
| [API 文档索引](api/README.md) | 所有服务 API 文档入口 |
| [API 版本与 Schema 指南](api/API_VERSION_AND_SCHEMA_GUIDE.md) | API 版本管理、Schema 规范 |
| [插件 API](api/plugins-api.md) | 插件开发 API 参考 |
| [OpenAPI 规范](api/openapi.yaml) | OpenAPI 3.0 规范文件 |

**服务 API 列表**: AUTH · AI · ANALYTICS · CRM · DOC · EHS · ERP · FINANCE · GIS · HRM · INTEGRATION · LIMS · MES · MOBILE · MONITOR · NOTIFICATION · PDM · PM · PORTAL · QMS · REPORT · RS · SCM · SRM · WMS · WORKFLOW

---

## 开发指南

### 后端开发

| 文档 | 说明 |
|------|------|
| [代码规范](development/backend/code-standards.md) | Rust 代码规范与最佳实践 |
| [后端服务开发](development/backend/backend-services.md) | 微服务开发指南 |
| [API 设计规范](development/backend/api-design.md) | REST API 设计原则与规范 |
| [调试指南](development/backend/debugging.md) | 后端调试技巧与工具 |
| [环境搭建](development/backend/environment-setup.md) | 开发环境搭建步骤 |
| [模板使用指南](development/backend/template-guidelines.md) | 代码模板与脚手架 |

### 前端开发

| 文档 | 说明 |
|------|------|
| [前端组件规范](development/frontend/frontend-components.md) | 组件开发规范与最佳实践 |
| [设计系统](development/frontend/design-system.md) | Design Tokens、主题、设计系统 |
| [UI 设计规范](development/frontend/ui-design-spec.md) | UI 视觉规范、间距、色彩 |
| [导航设计方案](development/frontend/ui-navigation-design.md) | 导航架构、菜单、面包屑 |
| [组件迁移指南](development/frontend/component-migration-guide.md) | 组件库迁移指引 |
| [页面重构指南](development/frontend/page-refactoring-guide.md) | 页面重构方法论 |
| [模块布局指南](development/frontend/module-layout-guide.md) | 模块页面布局规范 |
| [微前端架构](development/frontend/module-federation-architecture.md) | Module Federation 架构设计 |
| [微前端工作流](development/frontend/module-federation-workflow.md) | 微前端开发工作流 |
| [插件生命周期](development/frontend/plugin-lifecycle-guide.md) | 前端插件机制 |
| [无障碍设计](development/frontend/accessibility.md) | 可访问性设计指南 |

### DevOps 运维

| 文档 | 说明 |
|------|------|
| [运维文档索引](deployment/README.md) | DevOps 文档总入口 |

### 迁移指南

| 文档 | 说明 |
|------|------|
| [迁移清单与校验报告](development/migration-inventory.md) | 全量迁移文件清单与安全校验 |

> **DevOps 配置文件**（脚本与部署配置）位于项目根目录 `deploy/` 和 `scripts/` 下，非文档文件不归入 docs/。

---

## 部署运维

| 文档 | 说明 |
|------|------|
| [部署索引](deployment/README.md) | 部署文档总入口 |
| [部署指南总览](deployment/deployment-guide-overview.md) | 部署方式总览与选型 |
| [端口分配规则](deployment/port-allocation-rules.md) | 服务端口分配规范 |
| [监控告警](deployment/monitoring-alerting.md) | Prometheus、告警规则 |
| [故障排查手册](deployment/troubleshooting.md) | 常见问题与解决方案 |
| [发布策略](deployment/release-strategies.md) | 灰度、蓝绿、金丝雀发布 |
| [微前端部署](deployment/microfrontend-deployment.md) | Module Federation 部署 |

---

## 方案与规划

| 文档 | 说明 | 优先级 |
|------|------|--------|
| [短板分析报告](plans/shortcomings-analysis.md) | 12 项短板深度分析与解决思路 | ⭐⭐⭐ |
| [整合实施方案](plans/integration-implementation-plan.md) | 4 Sprint 6 周整合上线方案（含前端优化） | ⭐⭐⭐ |
| [架构优化报告](plans/architecture-optimization.md) | 架构与 UI 全面优化方案 | ⭐⭐ |

---

## 路线图与任务

| 文档 | 说明 |
|------|------|
| [TODO 任务清单](roadmap/TODO.md) | **当前任务总览** — 待办、进行中、优先级 |
| [长期路线图](roadmap/roadmap.md) | 版本规划与长期演进方向 |
| [历史任务归档](roadmap/todo-archive/) | 已完成版本任务归档 |

---

## 安全

| 文档 | 说明 |
|------|------|
| [安全策略](security/SECURITY.md) | 安全策略、漏洞上报、响应流程 |

---

## 变更日志

| 文档 | 说明 |
|------|------|
| [变更日志](changelog/CHANGELOG.md) | 版本变更记录 |
| [V5.14.0 发布说明](changelog/RELEASE_NOTES_V5.14.0.md) | V5.14.0 详细发布说明 |

---

## 其他文档

| 类别 | 说明 | 位置 |
|------|------|------|
| 📚 用户指南 | 最终用户操作手册 | [user-guide/](user-guide/) |
| 📊 销售资料 | 产品手册、销售话术、案例 | [sales/](sales/) |
| 🗄️ 历史归档 | 旧方案、旧报告、迁移计划、超级能力规格 | [archive/](archive/) |
| 📖 文档站 | docsify 文档中心源码 | [docs-center/](docs-center/) |
| 🎨 资源文件 | Logo、图片等 | [assets/](assets/) |

---

## 文档管理规范

### 目录结构原则

```
docs/
├── README.md              ← 本文档（唯一入口）
├── assets/                ← 文档资源（图片、logo等）
├── getting-started/       ← 新手入门（3-5 篇）
├── architecture/          ← 架构设计（核心文档组）
├── modules/               ← 业务模块（按服务拆分）
├── api/                   ← API 参考（自动生成 + 手写）
├── development/           ← 开发指南（按角色分）
├── deployment/            ← 部署运维
├── plans/                 ← 方案与规划（活跃方案）
├── roadmap/               ← 路线图与任务
├── security/              ← 安全相关
├── changelog/             ← 变更日志
├── user-guide/            ← 用户文档（保留外来结构）
├── sales/                 ← 销售资料（保留外来结构）
├── docs-center/           ← Docsify 文档站（保留外来结构）
└── archive/               ← 历史归档（过时/完成但保留）
```

### 链接规范

- **全部使用相对路径**，不使用绝对路径
- 跨目录引用使用 `../` 向上回溯
- 同一目录直接引用文件名

### 内容去重原则

1. **单一信源**: 每个知识点只有一个权威文档，其他地方只链接不复制
2. **层级清晰**: 概念 → 指南 → 参考，三层递进
3. **及时归档**: 过时/完成的方案移入 `archive/`，不占活跃目录

### 外来文档

- `user-guide/`、`sales/`、`docs-center/` 等外来或独立维护的文档保留原始结构
- 不强行合并，在 README 中建立索引链接即可
