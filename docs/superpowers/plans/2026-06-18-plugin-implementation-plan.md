# 插件化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成插件市场生态建设，实现 ERP、HRM、CRM、SCM、WMS、MES、PM、BI、Workflow 及新增 AI、QA、GIS、Mobile、RS、SRM、Monitor、Portal、Integration 等全部业务的插件化，并建立统一的插件管理体系。

**Architecture:** 业务插件作为重量插件（独立进程），通过 REST API 与 unified-core 通信。unified-core 负责插件注册表、路由代理、权限管理。

**Tech Stack:** Rust (Axum), PostgreSQL, SQLx, JWT

---

## 一、已完成模块汇总

### 1.1 后端插件化（18个服务）

| 插件 | 端口 | 路由前缀 | plugin.yaml | 插件接口 | 状态 |
|------|------|----------|-------------|----------|------|
| **核心模块** |
| Workflow | 8000 | /api/flow/* | ✅ | ✅ | ✅ 运行中 |
| ERP | 8010 | /api/erp/* | ✅ | ✅ | ✅ 运行中 |
| HRM | 8011 | /api/hrm/* | ✅ | ✅ | ✅ 运行中 |
| CRM | 8012 | /api/crm/* | ✅ | ✅ | ✅ 运行中 |
| **业务模块** |
| MES | 8030 | /api/mfg/* | ✅ | ✅ | ✅ 运行中 |
| SCM | 8040 | /api/scm/* | ✅ | ✅ | ✅ 运行中 |
| WMS | 8042 | /api/wms/* | ✅ | ✅ | ✅ 运行中 |
| BI | 8044 | /api/bi/* | ✅ | ✅ | ✅ 运行中 |
| PM | 8046 | /api/pm/* | ✅ | ✅ | ✅ 运行中 |
| **智能与质量** |
| AI | 8050 | /api/ai/* | ✅ | ✅ | ✅ 运行中 |
| QA | 8032 | /api/qa/* | ✅ | ✅ | ✅ 运行中 |
| **扩展模块** |
| GIS | 8054 | /api/gis/* | ✅ | ✅ | ✅ 运行中 |
| Mobile | 8056 | /api/mobile/* | ✅ | ✅ | ✅ 运行中 |
| RS | 8058 | /api/rs/* | ✅ | ✅ | ✅ 运行中 |
| SRM | 8060 | /api/srm/* | ✅ | ✅ | ✅ 运行中 |
| **系统模块** |
| Monitor | 8064 | /api/monitor/* | ✅ | ✅ | ✅ 代码完成 |
| Portal | 8066 | /api/portal/* | ✅ | ✅ | ✅ 代码完成 |
| Integration | 8068 | /api/integration/* | ✅ | ✅ | ✅ 代码完成 |

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

| 类别 | 插件 | 端口 | 功能描述 | 状态 |
|------|------|------|----------|------|
| **核心** | Workflow | 8000 | 工作流引擎 - 流程设计、审批 | ✅ |
| | ERP | 8010 | 企业资源计划 - 采购、销售、库存、财务 | ✅ |
| | HRM | 8011 | 人力资源 - 组织、招聘、考勤、薪酬 | ✅ |
| | CRM | 8012 | 客户关系 - 客户、商机、合同 | ✅ |
| **业务** | MES | 8030 | 制造执行 - 生产工单、工艺、设备 | ✅ |
| | QA | 8032 | 质量管理 - QMS、LIMS、EHS | ✅ |
| | SCM | 8040 | 供应链管理 - 供应商、采购订单 | ✅ |
| | WMS | 8042 | 仓储管理 - 仓库、库存、入库出库 | ✅ |
| | BI | 8044 | 商业智能 - 分析、报表、仪表盘 | ✅ |
| | PM | 8046 | 项目管理 - 项目、任务、甘特图 | ✅ |
| **智能** | AI | 8050 | AI服务 - 向量库、文档分析、QA | ✅ |
| **扩展** | GIS | 8054 | 地理信息 - 位置、轨迹、围栏 | ✅ |
| | Mobile | 8056 | 移动端 - 离线同步、扫码 | ✅ |
| | RS | 8058 | 研发管理 - 实验、配方、专利 | ✅ |
| | SRM | 8060 | 供应商管理 - 合同、评估 | ✅ |
| **系统** | Monitor | 8064 | 监控告警 - 指标、告警 | ✅ |
| | Portal | 8066 | 企业门户 - 首页、公告 | ✅ |
| | Integration | 8068 | 系统集成 - 第三方对接 | ✅ |

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

## 四、端口分配

| 端口范围 | 用途 |
|----------|------|
| 8000-8020 | 核心服务（Workflow, ERP, HRM, CRM）|
| 8030-8040 | 制造与智能服务（MES, QA, SCM）|
| 8042-8050 | 供应链与业务服务（WMS, BI, PM）|
| 8050-8060 | 扩展服务（AI, GIS, Mobile, RS, SRM）|
| 8064-8070 | 系统服务（Monitor, Portal, Integration）|

---

## 五、环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| SERVER_PORT | 服务端口 | 8010 |
| DATABASE_URL | 数据库连接 | postgres://... |
| JWT_SECRET | JWT密钥 | ... |
| X-User-Id | 用户认证 | header |

---

## 六、健康检查

所有插件提供两个健康检查端点：

| 端点 | 功能 | 认证 |
|------|------|------|
| `/health` | 基础健康检查 | 无 |
| `/api/plugins/info` | 插件信息（含权限）| 无 |
| `/api/plugins/health` | 插件健康状态 | 无 |

---

## 七、Git 提交记录

| Commit | 日期 | 描述 |
|--------|------|------|
| `fea33be` | 2026-06-18 | fix: resolve compilation errors in AI and QA plugin modules |
| `bbfd8e4` | 2026-06-18 | feat: complete plugin transformation for all remaining services |
| `a98f689` | 2026-06-18 | feat: enhance plugin marketplace and fix service endpoints |
| `3106959` | 2026-06-18 | feat: complete plugin transformation for remaining services |
| `306c6ca` | 2026-06-18 | test: add plugin integration tests for hrm and crm |
| `eb8e8a5` | 2026-06-18 | docs: update plugin implementation plan status |
| `62f1c5c` | 2026-06-18 | feat(web): add plugin management page and API client |
| `788cfba` | 2026-06-18 | feat(unified-core): add simplified plugin management API |
| `f93092d` | 2026-06-18 | feat(web): adapt plugin API routes for erp, hrm, crm |

---

## 八、下一步工作

### 已完成
- [x] 17个业务服务插件化
- [x] plugin.yaml 元数据配置
- [x] plugin.rs 插件接口实现
- [x] 路由前缀统一调整
- [x] 前端 API 适配
- [x] 插件市场页面开发
- [x] 插件市场真实 API 集成
- [x] API 完整文档
- [x] 部署脚本优化
- [x] 文档更新

### 已完成（续）
- [x] 插件版本管理（版本对比、升级检测、版本回滚API）
- [x] 插件市场在线浏览（前端页面 + 后端API）
- [x] 监控告警集成（Monitor插件集成通知系统）

### 已完成（扩展功能）
- [x] 插件版本管理完善（完整的版本升级流程：下载、安装、验证、回滚）
- [x] 插件市场在线浏览完善（用户评价管理、下载统计功能）
- [x] 监控告警集成完善（实时告警推送、告警规则配置API）

### 后续扩展（可选）
- [x] 插件版本管理：自动化升级流程（定时升级、升级队列、升级策略） ✅
- [x] 插件市场：用户评价排序、筛选功能（评分排序、时间排序、筛选器） ✅
- [x] 监控告警：告警规则高级配置（定时触发、多级告警、告警升级） ✅
