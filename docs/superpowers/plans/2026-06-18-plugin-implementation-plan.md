# 插件化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成插件市场生态建设，实现 ERP、HRM、CRM、SCM、WMS、MES、PM、BI、Workflow 九大业务插件的插件化，并建立统一的插件管理体系。

**Architecture:** 业务插件作为重量插件（独立进程），通过 REST API 与 unified-core 通信。unified-core 负责插件注册表、路由代理、权限管理。

**Tech Stack:** Rust (Axum), PostgreSQL, SQLx, JWT

---

## 一、已完成模块汇总

### 1.1 后端插件化（9个服务）

| 插件 | 端口 | 路由前缀 | plugin.yaml | 插件接口 | X-User-Id 认证 |
|------|------|----------|-------------|----------|----------------|
| ERP | 8010 | /api/erp/* | ✅ | ✅ | ✅ |
| HRM | 8011 | /api/hrm/* | ✅ | ✅ | ✅ |
| CRM | 8012 | /api/crm/* | ✅ | ✅ | ✅ |
| SCM | 8040 | /api/scm/* | ✅ | ✅ | - |
| WMS | 8042 | /api/wms/* | ✅ | ✅ | - |
| MES | 8030 | /api/mfg/* | ✅ | ✅ | - |
| PM | 8046 | /api/pm/* | ✅ | ✅ | - |
| BI | 8044 | /api/bi/* | ✅ | ✅ | - |
| Workflow | 8000 | /api/flow/* | ✅ | ✅ | - |

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

### 1.3 插件市场功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 插件管理页面 | ✅ | /admin/plugins |
| 插件市场浏览 | ✅ | 9个插件的mock数据 |
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

---

## 二、下一步工作

1. **启动所有插件服务** - 9个服务需要配置和启动
2. **集成测试** - 验证各插件间通信、认证
3. **插件市场后端API完善** - 真实的市场数据
4. **API文档** - 更新部署文档

---

## 三、文件结构

```
svc/
├── erp/                    # plugin.yaml, plugin.rs
├── hrm/                    # plugin.yaml, plugin.rs
├── crm/                    # plugin.yaml, plugin.rs
├── scm/                    # plugin.yaml, plugin.rs
├── wms/                    # plugin.yaml, plugin.rs
├── manufacturing/          # plugin.yaml, plugin.rs (MES)
├── pm/                     # plugin.yaml, plugin.rs
├── analytics/             # plugin.yaml, plugin.rs (BI)
└── unified-core/          # plugin.yaml, plugin.rs (Workflow)

apps/web/src/
├── api/
│   ├── erp.ts, hrm.ts, crm.ts
│   ├── scm.ts, wms.ts, mes.ts
│   ├── pm.ts, bi.ts, flow.ts
│   └── plugin.ts
└── pages/admin/
    └── PluginManagementPage.tsx  # 插件市场页面
```
