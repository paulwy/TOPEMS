# 插件化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成插件市场生态建设，实现 ERP、HRM、CRM、SCM、WMS、MES、PM、BI、Workflow 及新增 AI、QA、GIS、Mobile、RS、SRM、Monitor、Portal、Integration 等全部业务的插件化，并建立统一的插件管理体系。

**Architecture:** 业务插件作为重量插件（独立进程），通过 REST API 与 unified-core 通信。unified-core 负责插件注册表、路由代理、权限管理。

**Tech Stack:** Rust (Axum), PostgreSQL, SQLx, JWT

---

## 一、已完成模块汇总

### 1.1 后端插件化（17个服务）

| 插件 | 端口 | 路由前缀 | plugin.yaml | 插件接口 | X-User-Id 认证 |
|------|------|----------|-------------|----------|----------------|
| **核心模块** |
| ERP | 8010 | /api/erp/* | ✅ | ✅ | ✅ |
| HRM | 8011 | /api/hrm/* | ✅ | ✅ | ✅ |
| CRM | 8012 | /api/crm/* | ✅ | ✅ | ✅ |
| Workflow | 8000 | /api/flow/* | ✅ | ✅ | ✅ |
| **业务模块** |
| SCM | 8040 | /api/scm/* | ✅ | ✅ | ✅ |
| WMS | 8042 | /api/wms/* | ✅ | ✅ | ✅ |
| MES | 8030 | /api/mfg/* | ✅ | ✅ | ✅ |
| PM | 8046 | /api/pm/* | ✅ | ✅ | ✅ |
| BI | 8044 | /api/bi/* | ✅ | ✅ | ✅ |
| **智能与质量** |
| AI | 8050 | /api/ai/* | ✅ | ✅ | - |
| QA | 8052 | /api/qa/* | ✅ | ✅ | - |
| **扩展模块** |
| GIS | 8054 | /api/gis/* | ✅ | ✅ | - |
| Mobile | 8056 | /api/mobile/* | ✅ | ✅ | - |
| RS | 8058 | /api/rs/* | ✅ | ✅ | - |
| SRM | 8060 | /api/srm/* | ✅ | ✅ | - |
| **系统模块** |
| Monitor | 8064 | /api/monitor/* | ✅ | ✅ | - |
| Portal | 8066 | /api/portal/* | ✅ | ✅ | - |
| Integration | 8068 | /api/integration/* | ✅ | ✅ | - |

### 1.2 前端适配

| 文件 | 状态 |
|------|------|
| apps/web/src/api/erp.ts | ✅ |
| apps/web/src/api/hrm.ts | ✅ |
| apps/web/src/api/crm.ts | ✅ |
| apps/web/src/api/scm.ts | ✅ |
| apps/web/src/api/wms.ts | ✅ |
| apps/web/src/api/mes.ts | ✅ |
| apps/web/src/api/pm.ts | ✅ |
| apps/web/src/api/bi.ts | ✅ |
| apps/web/src/api/flow.ts | ✅ |
| apps/web/src/api/ai.ts | ✅ |
| apps/web/src/api/qa.ts | ✅ |
| apps/web/src/api/gis.ts | ✅ |
| apps/web/src/api/mobile.ts | ✅ |
| apps/web/src/api/rs.ts | ✅ |
| apps/web/src/api/srm.ts | ✅ |
| apps/web/src/api/monitor.ts | ✅ |
| apps/web/src/api/portal.ts | ✅ |
| apps/web/src/api/integration.ts | ✅ |

### 1.3 插件市场功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 插件管理页面 | ✅ | /admin/plugins |
| 插件市场浏览 | ✅ | 18个插件的mock数据 |
| 安装向导 | ✅ | 3步确认流程 |
| 启用/禁用插件 | ✅ | API集成 |
| 卸载插件 | ✅ | API集成 |
| 刷新插件列表 | ✅ | - |

### 1.4 API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| /api/core/plugins | GET | 列出已安装插件 |
| /api/core/plugins/{code} | GET | 插件详情（含权限）|
| /api/core/plugins/{code}/install | POST | 安装插件 |
| /api/core/plugins/{code}/uninstall | POST | 卸载插件 |
| /api/core/plugins/{code}/enable | POST | 启用插件 |
| /api/core/plugins/{code}/disable | POST | 禁用插件 |
| /api/plugins/info | GET | 各插件自我信息 |
| /api/plugins/health | GET | 各插件健康检查 |

---

## 二、插件汇总表

| 类别 | 插件 | 端口 | 功能描述 |
|------|------|------|----------|
| **核心** | ERP | 8010 | 企业资源计划 - 采购、销售、库存、财务 |
| | HRM | 8011 | 人力资源 - 组织、招聘、考勤、薪酬 |
| | CRM | 8012 | 客户关系 - 客户、商机、合同 |
| | Workflow | 8000 | 工作流引擎 - 流程设计、审批 |
| **业务** | SCM | 8040 | 供应链管理 - 供应商、采购订单 |
| | WMS | 8042 | 仓储管理 - 仓库、库存、入库出库 |
| | MES | 8030 | 制造执行 - 生产工单、工艺、设备 |
| | PM | 8046 | 项目管理 - 项目、任务、甘特图 |
| | BI | 8044 | 商业智能 - 分析、报表、仪表盘 |
| **智能** | AI | 8050 | AI服务 - 向量库、文档分析、QA |
| | QA | 8052 | 质量管理 - QMS、LIMS、EHS |
| **扩展** | GIS | 8054 | 地理信息 - 位置、轨迹、围栏 |
| | Mobile | 8056 | 移动端 - 离线同步、扫码 |
| | RS | 8058 | 研发管理 - 实验、配方、专利 |
| | SRM | 8060 | 供应商管理 - 合同、评估 |
| **系统** | Monitor | 8064 | 监控告警 - 指标、告警 |
| | Portal | 8066 | 企业门户 - 首页、公告 |
| | Integration | 8068 | 系统集成 - 第三方对接 |

---

## 三、文件结构

```
svc/
├── erp/                    # plugin.yaml, plugin.rs ✅
├── hrm/                    # plugin.yaml, plugin.rs ✅
├── crm/                    # plugin.yaml, plugin.rs ✅
├── scm/                    # plugin.yaml, plugin.rs ✅
├── wms/                    # plugin.yaml, plugin.rs ✅
├── manufacturing/          # plugin.yaml, plugin.rs (MES) ✅
├── pm/                     # plugin.yaml, plugin.rs ✅
├── analytics/              # plugin.yaml, plugin.rs (BI) ✅
├── unified-core/           # plugin.yaml, plugin.rs (Workflow) ✅
├── ai/                     # plugin.yaml, plugin.rs ✅
├── quality-assurance/      # plugin.yaml, plugin.rs (QA) ✅
├── gis/                    # plugin.yaml, plugin.rs ✅
├── mobile/                 # plugin.yaml, plugin.rs ✅
├── rs/                     # plugin.yaml, plugin.rs ✅
├── srm/                    # plugin.yaml, plugin.rs ✅
├── monitor/                # plugin.yaml, plugin.rs ✅
├── portal/                 # plugin.yaml, plugin.rs ✅
└── integration/             # plugin.yaml, plugin.rs ✅

apps/web/src/
├── api/
│   ├── erp.ts, hrm.ts, crm.ts, scm.ts, wms.ts
│   ├── mes.ts, pm.ts, bi.ts, flow.ts
│   ├── ai.ts, qa.ts, gis.ts, mobile.ts
│   ├── rs.ts, srm.ts, monitor.ts, portal.ts, integration.ts
│   └── plugin.ts
└── pages/admin/
    └── PluginManagementPage.tsx  # 插件市场页面
```

---

## 四、部署注意事项

### 端口分配
- **8000-8020**: 核心服务
- **8030-8050**: 制造与智能服务
- **8040-8060**: 供应链与业务服务
- **8050+**: 扩展服务

### 环境变量
| 变量 | 说明 | 示例 |
|------|------|------|
| SERVER_PORT | 服务端口 | 8010 |
| DATABASE_URL | 数据库连接 | postgres://... |
| JWT_SECRET | JWT密钥 | ... |
| X-User-Id | 用户认证 | header |

### 健康检查
所有插件提供两个健康检查端点：
- `/health` - 基础健康检查
- `/api/plugins/info` - 插件信息（含权限）
- `/api/plugins/health` - 插件健康状态
