# TopEMS 跨库调用清单（拆分预案叠加）

> 基于 `service-topology.design.json`（40 条设计边）叠加物理库拆分预案（`database-split-plan.md` §3 阶段 2）。
> **跨库 35 条 / 同库 5 条**。跨库边在拆分后必须改走服务 API / 集成事件（Saga 补偿），是拆分前置治理对象。

## 跨库调用清单

| 调用方 | 调用方物理库 | 被调用方 | 被调用方物理库 | 备注 |
|---|---|---|---|---|
| unified-core-service | unknown | portal-service | business（业务综合库） |  |
| crm-service | business（业务综合库） | erp-service | finance（财务库） |  |
| crm-service | business（业务综合库） | wms-service | supply（供应链库） |  |
| crm-service | business（业务综合库） | workflow-service | core（平台核心库） |  |
| ehs-service | manufacturing（制造库） | workflow-service | core（平台核心库） | 业务归属制造域；schema=public 现落 core 库，拆分前需将 ehs 表归位到制造库 |
| erp-service | finance（财务库） | wms-service | supply（供应链库） |  |
| erp-service | finance（财务库） | hrm-service | business（业务综合库） |  |
| erp-service | finance（财务库） | mes-service | manufacturing（制造库） |  |
| finance-service | finance（财务库） | workflow-service | core（平台核心库） |  |
| hrm-service | business（业务综合库） | erp-service | finance（财务库） |  |
| mes-service | manufacturing（制造库） | erp-service | finance（财务库） |  |
| mobile-service | business（业务综合库） | wms-service | supply（供应链库） |  |
| mobile-service | business（业务综合库） | mes-service | manufacturing（制造库） |  |
| mobile-service | business（业务综合库） | qms-service | manufacturing（制造库） |  |
| mobile-service | business（业务综合库） | workflow-service | core（平台核心库） |  |
| mobile-service | business（业务综合库） | notification-service | core（平台核心库） |  |
| pm-service | business（业务综合库） | workflow-service | core（平台核心库） |  |
| portal-service | business（业务综合库） | notification-service | core（平台核心库） |  |
| portal-service | business（业务综合库） | workflow-service | core（平台核心库） |  |
| portal-service | business（业务综合库） | mes-service | manufacturing（制造库） |  |
| portal-service | business（业务综合库） | monitor-service | core（平台核心库） |  |
| portal-service | business（业务综合库） | iam-service | core（平台核心库） |  |
| portal-service | business（业务综合库） | erp-service | finance（财务库） |  |
| portal-service | business（业务综合库） | finance-service | finance（财务库） |  |
| qms-service | manufacturing（制造库） | workflow-service | core（平台核心库） |  |
| server-crm-module | business（业务综合库） | erp-service | finance（财务库） |  |
| server-crm-module | business（业务综合库） | wms-service | supply（供应链库） |  |
| server-crm-module | business（业务综合库） | workflow-service | core（平台核心库） |  |
| server-ehs-module | manufacturing（制造库） | workflow-service | core（平台核心库） | 同 ehs-service：schema=public 现落 core 库，拆分前需归位 |
| server-erp-module | finance（财务库） | hrm-service | business（业务综合库） |  |
| server-finance-module | finance（财务库） | workflow-service | core（平台核心库） |  |
| server-pm-module | business（业务综合库） | workflow-service | core（平台核心库） |  |
| server-qms-module | manufacturing（制造库） | workflow-service | core（平台核心库） |  |
| server-srm-module | supply（供应链库） | workflow-service | core（平台核心库） |  |
| srm-service | supply（供应链库） | workflow-service | core（平台核心库） |  |

## 拆分前置治理优先级（按被调用方聚合）

| 被调用方 | 跨库调用方数 | 说明 |
|---|---|---|
| workflow-service（core（平台核心库）） | 14 | crm-service, ehs-service, finance-service, mobile-service, pm-service, portal-service, qms-service, server-crm-module, server-ehs-module, server-finance-module, server-pm-module, server-qms-module, server-srm-module, srm-service；拆分后这些调用方需改走其 API |
| erp-service（finance（财务库）） | 5 | crm-service, hrm-service, mes-service, portal-service, server-crm-module；拆分后这些调用方需改走其 API |
| wms-service（supply（供应链库）） | 4 | crm-service, erp-service, mobile-service, server-crm-module；拆分后这些调用方需改走其 API |
| mes-service（manufacturing（制造库）） | 3 | erp-service, mobile-service, portal-service；拆分后这些调用方需改走其 API |
| hrm-service（business（业务综合库）） | 2 | erp-service, server-erp-module；拆分后这些调用方需改走其 API |
| notification-service（core（平台核心库）） | 2 | mobile-service, portal-service；拆分后这些调用方需改走其 API |
| portal-service（business（业务综合库）） | 1 | unified-core-service；拆分后这些调用方需改走其 API |
| qms-service（manufacturing（制造库）） | 1 | mobile-service；拆分后这些调用方需改走其 API |
| monitor-service（core（平台核心库）） | 1 | portal-service；拆分后这些调用方需改走其 API |
| iam-service（core（平台核心库）） | 1 | portal-service；拆分后这些调用方需改走其 API |
| finance-service（finance（财务库）） | 1 | portal-service；拆分后这些调用方需改走其 API |

## 物理库分组（拆分预案）

| 目标库 | 包含 schema |
|---|---|
| core（平台核心库） | core, doc, doc_service, flow, iam, im, integration, mail, master_data, notification, public, report, rs, shared, storage |
| finance（财务库） | erp, finance |
| manufacturing（制造库） | ehs, lims, mes, pdm, qms |
| supply（供应链库） | scm, srm, tms, wms |
| business（业务综合库） | ai, bi, crm, gis, hrm, mobile, pm, portal |
