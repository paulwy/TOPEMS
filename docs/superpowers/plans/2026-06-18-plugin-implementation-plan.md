# 插件化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成插件市场生态建设，实现 ERP、HRM、CRM、SCM、WMS、MES、PM、BI、Workflow 九大业务插件的插件化，并建立统一的插件管理体系。

**Architecture:** 业务插件作为重量插件（独立进程），通过 REST API 与 unified-core 通信。unified-core 负责插件注册表、路由代理、权限管理。

**Tech Stack:** Rust (Axum), PostgreSQL, SQLx, JWT

---

## 文件结构

```
svc/unified-core/src/
├── modules/
│   ├── plugin/
│   │   ├── handlers.rs       # ✅ 已完成
│   │   ├── models.rs         # ✅ 已完成
│   │   └── mod.rs            # ✅ 已完成
│   └── lib.rs
├── main.rs                   # ✅ 已完成
└── core_response.rs          # ✅ 已完成

svc/erp/                        # ✅ 已完成
svc/hrm/                        # ✅ 已完成
svc/crm/                        # ✅ 已完成
svc/scm/                        # ✅ 已完成
svc/wms/                        # ✅ 已完成
svc/manufacturing/              # ✅ 已完成 (MES)
svc/pm/                         # ✅ 已完成
svc/analytics/                   # ✅ 已完成 (BI)
svc/unified-core/               # ✅ 已完成 (Workflow)

apps/web/src/api/
├── erp.ts, hrm.ts, crm.ts
├── scm.ts, wms.ts, mes.ts
├── pm.ts, bi.ts, flow.ts
└── plugin.ts                   # ✅ 已完成
```

---

## 插件汇总

| 插件 | 端口 | 路由前缀 | plugin.yaml | 插件接口 | 前端 API |
|------|------|----------|-------------|----------|----------|
| ERP | 8010 | /api/erp/* | ✅ | ✅ | ✅ |
| HRM | 8011 | /api/hrm/* | ✅ | ✅ | ✅ |
| CRM | 8012 | /api/crm/* | ✅ | ✅ | ✅ |
| SCM | 8040 | /api/scm/* | ✅ | ✅ | ✅ |
| WMS | 8042 | /api/wms/* | ✅ | ✅ | ✅ |
| MES | 8030 | /api/mfg/* | ✅ | ✅ | ✅ |
| PM | 8046 | /api/pm/* | ✅ | ✅ | ✅ |
| BI | 8044 | /api/bi/* | ✅ | ✅ | ✅ |
| Workflow | 8000 | /api/flow/* | ✅ | ✅ | ✅ |

---

## 下一步工作

1. **启动所有插件服务**并验证 `/api/plugins/info` 接口
2. **集成测试** - 验证各插件间通信
3. **插件市场前端完善** - 添加更多功能（安装向导、版本管理等）
4. **文档完善** - 更新 API 文档和部署文档

---

**文档结束**
