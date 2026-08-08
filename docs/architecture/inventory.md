# TOPEMS Module Inventory

> **Auto-generated**: 2026-08-08
> **Generator**: `scripts/generate-inventory.mjs`
> **Backend services**: 28 | **Frontend modules**: 33

---

## Backend Services

| # | Directory | Package | Port | Migrations | Rust Files |
|---|-----------|---------|------|------------|------------|
| 1 | ai | topems-ai | 8013 | 4 | 50 |
| 2 | analytics | topems-analytics | 8060 | 3 | 38 |
| 3 | billing | topems-billing | 8085 | 0 | 4 |
| 4 | communication | topems-communication | 8084 | 0 | 5 |
| 5 | crm | topems-crm | 8029 | 3 | 45 |
| 6 | ehs | topems-ehs | 8052 | 3 | 27 |
| 7 | erp | topems-erp | 8010 | 15 | 75 |
| 8 | feedback | topems-feedback | 8087 | 0 | 4 |
| 9 | finance | topems-finance | 8011 | 11 | 75 |
| 10 | gis | topems-gis | 8071 | 4 | 36 |
| 11 | hrm | topems-hrm | 8020 | 3 | 42 |
| 12 | integration | topems-integration | 8072 | 5 | 28 |
| 13 | lims | topems-lims | 8051 | 3 | 35 |
| 14 | lowcode | topems-lowcode | 8088 | 0 | 3 |
| 15 | master-data | topems-master-data | 8090 | 0 | 19 |
| 16 | mes | topems-mes | 8030 | 17 | 43 |
| 17 | mobile | topems-mobile | 8070 | 4 | 39 |
| 18 | pdm | topems-pdm | 8031 | 1 | 26 |
| 19 | pm | topems-pm | 8023 | 4 | 54 |
| 20 | portal | topems-portal | 8063 | 4 | 63 |
| 21 | qms | topems-qms | 8050 | 2 | 25 |
| 22 | rd | topems-rd | 8053 | 9 | 40 |
| 23 | scm | topems-scm | 8040 | 9 | 40 |
| 24 | search | topems-search | 8082 | 0 | 3 |
| 25 | srm | topems-srm | 8042 | 7 | 44 |
| 26 | ticket | topems-ticket | 8086 | 0 | 5 |
| 27 | unified-core | topems-unified-core | 8000 | 6 | 129 |
| 28 | wms | topems-wms | 8041 | 10 | 52 |

**Totals**: 28 services · 127 migrations · 1049 Rust source files

---

## Frontend Modules

| # | Directory | Module Name | Routes (path:) | NavItems (label:) | TS/TSX Files |
|---|-----------|-------------|-----------------|-------------------|--------------|
| 1 | admin | 系统管理 | 0 | 18 | 1 |
| 2 | ai | 智能助手 | 0 | 8 | 1 |
| 3 | asset | 资产管理 | 0 | 4 | 1 |
| 4 | automation | 自动化 | 0 | 5 | 1 |
| 5 | bi | 商业智能 | 0 | 11 | 1 |
| 6 | crm | 客户关系 | 0 | 12 | 1 |
| 7 | doc | 文档中心 | 0 | 6 | 1 |
| 8 | ehs | 安全环保 | 0 | 14 | 1 |
| 9 | erp | 企业资源计划 | 0 | 23 | 1 |
| 10 | finance | 财务管理 | 0 | 17 | 2 |
| 11 | gis | 地理信息 | 0 | 4 | 1 |
| 12 | hrm | 人力资源 | 0 | 16 | 1 |
| 13 | iam | 身份与权限 | 0 | 4 | 1 |
| 14 | im | 即时通讯 | 0 | 1 | 1 |
| 15 | integration | 集成平台 | 0 | 9 | 1 |
| 16 | lims | 实验室管理 | 0 | 14 | 1 |
| 17 | lowcode | 低代码平台 | 0 | 4 | 1 |
| 18 | mes | 生产执行 | 0 | 25 | 1 |
| 19 | mobile | 移动端 | 0 | 12 | 1 |
| 20 | monitor | 系统监控 | 0 | 7 | 1 |
| 21 | notification | 通知中心 | 0 | 7 | 1 |
| 22 | oa | 办公自动化 | 0 | 4 | 1 |
| 23 | pdm | 产品数据 | 0 | 16 | 1 |
| 24 | plugin | 插件市场 | 0 | 2 | 1 |
| 25 | pm | 项目管理 | 0 | 6 | 1 |
| 26 | qms | 质量管理 | 0 | 11 | 1 |
| 27 | rd | 研发管理 | 0 | 17 | 1 |
| 28 | report | 报表中心 | 0 | 8 | 1 |
| 29 | scm | 供应链管理 | 0 | 15 | 1 |
| 30 | srm | 供应商关系 | 0 | 14 | 1 |
| 31 | ticket | 工单中心 | 0 | 1 | 1 |
| 32 | wms | 仓储管理 | 0 | 16 | 1 |
| 33 | workflow | 工作流 | 0 | 10 | 1 |

**Totals**: 33 modules · 0 routes · 341 navItems · 34 TS/TSX files

---

## CI Integration

Regenerate this file with:
```bash
node scripts/generate-inventory.mjs
```

This file should be re-generated whenever:
- A new backend service is added under `svc/`
- A new frontend module is added under `apps/web/src/modules/`
- Migration files are added or removed
