# TOPEMS 服务端口分配规范

> **版本**: v5.2 | **更新日期**: 2026-08-08 | **服务总数**: 28
> **信源**: `svc/*/src/main.rs` 中 `ServiceConfig.port` 字段（单一事实来源）

## 端口分配规则

| 段位区间 | 服务分组 | 说明 |
|----------|----------|------|
| 8000 | 核心平台服务 | unified-core（统一承载 IAM/Doc/Flow/File/Comm/Notification/Monitor） |
| 8010-8019 | 经营管理 | ERP / Finance / AI |
| 8020-8029 | 协同办公 | HRM / PM / CRM |
| 8030-8039 | 生产制造 | MES / PDM |
| 8040-8049 | 供应链 | SCM / WMS / SRM |
| 8050-8059 | 质量/研发 | QMS / LIMS / EHS / RD |
| 8060-8069 | 数据分析与门户 | BI(Aanalytics) / Report / Portal |
| 8070-8079 | 基础设施服务 | Mobile / GIS / Integration |
| 8080-8089 | 平台服务 | Search / Comm / Billing / Ticket / Feedback / Lowcode |
| 8090+ | 数据服务 | Master Data |

## 标准端口表（28 服务）

| # | 服务名称 | 端口 | 环境变量 | API 前缀 | 分组 | main.rs 源 |
|---|----------|------|----------|----------|------|------------|
| 1 | unified-core | 8000 | `CORE_PORT` | `/api/iam/*`, `/api/doc/*`, `/api/flow/*`, `/api/file/*`, `/api/mail/*`, `/api/comm/*`, `/api/notification/*`, `/api/core/monitor/*` | 核心 | `svc/unified-core/src/main.rs` |
| 2 | erp | 8010 | `ERP_PORT` | `/api/erp/*` | 经营管理 | `svc/erp/src/main.rs` |
| 3 | finance | 8011 | `FINANCE_PORT` | `/api/finance/*` | 经营管理 | `svc/finance/src/main.rs` |
| 4 | ai | 8013 | `AI_PORT` | `/api/ai/*` | 经营管理 | `svc/ai/src/main.rs` |
| 5 | hrm | 8020 | `HRM_PORT` | `/api/hrm/*` | 协同办公 | `svc/hrm/src/main.rs` |
| 6 | pm | 8023 | `PM_PORT` | `/api/pm/*` | 协同办公 | `svc/pm/src/main.rs` |
| 7 | crm | 8029 | `CRM_PORT` | `/api/crm/*` | 协同办公 | `svc/crm/src/main.rs` |
| 8 | mes | 8030 | `MES_PORT` | `/api/mes/*` | 生产制造 | `svc/mes/src/main.rs` |
| 9 | pdm | 8031 | `PDM_PORT` | `/api/pdm/*` | 生产制造 | `svc/pdm/src/main.rs` |
| 10 | scm | 8040 | `SCM_PORT` | `/api/scm/*` | 供应链 | `svc/scm/src/main.rs` |
| 11 | wms | 8041 | `WMS_PORT` | `/api/wms/*` | 供应链 | `svc/wms/src/main.rs` |
| 12 | srm | 8042 | `SRM_PORT` | `/api/srm/*` | 供应链 | `svc/srm/src/main.rs` |
| 13 | qms | 8050 | `QMS_PORT` | `/api/qms/*` | 质量/研发 | `svc/qms/src/main.rs` |
| 14 | lims | 8051 | `LIMS_PORT` | `/api/lims/*` | 质量/研发 | `svc/lims/src/main.rs` |
| 15 | ehs | 8052 | `EHS_PORT` | `/api/ehs/*` | 质量/研发 | `svc/ehs/src/main.rs` |
| 16 | rd | 8053 | `RD_PORT` | `/api/rd/*` | 质量/研发 | `svc/rd/src/main.rs` |
| 17 | analytics (bi) | 8060 | `BI_PORT` | `/api/bi/*` | 数据分析 | `svc/analytics/src/main.rs` |
| 18 | report | 8061 | `REPORT_PORT` | `/api/report/*` | 数据分析 | 整合入 analytics |
| 19 | portal | 8063 | `PORTAL_PORT` | `/api/portal/*` | 门户 | `svc/portal/src/main.rs` |
| 20 | mobile | 8070 | `MOBILE_PORT` | `/api/mobile/*` | 基础设施 | `svc/mobile/src/main.rs` |
| 21 | gis | 8071 | `GIS_PORT` | `/api/gis/*` | 基础设施 | `svc/gis/src/main.rs` |
| 22 | integration | 8072 | `INTEGRATION_PORT` | `/api/integration/*` | 基础设施 | `svc/integration/src/main.rs` |
| 23 | search | 8082 | `SEARCH_PORT` | `/api/search/*` | 平台服务 | `svc/search/src/main.rs` |
| 24 | communication | 8084 | `COMM_PORT` | `/api/comm/*` | 平台服务 | `svc/communication/src/main.rs` |
| 25 | billing | 8085 | `BILLING_PORT` | `/api/billing/*` | 平台服务 | `svc/billing/src/main.rs` |
| 26 | ticket | 8086 | `TICKET_PORT` | `/api/ticket/*` | 平台服务 | `svc/ticket/src/main.rs` |
| 27 | feedback | 8087 | `FEEDBACK_PORT` | `/api/feedback/*` | 平台服务 | `svc/feedback/src/main.rs` |
| 28 | lowcode | 8088 | `LOWCODE_PORT` | `/api/lowcode/*` | 平台服务 | `svc/lowcode/src/main.rs` |
| 29 | master-data | 8090 | `MASTER_DATA_PORT` | `/api/master-data/*` | 数据服务 | `svc/master-data/src/main.rs` |

## 抽查验证记录

| 服务 | 文档端口 | main.rs `port:` | 一致性 |
|------|----------|-----------------|--------|
| crm | 8029 | 8029 (`svc/crm/src/main.rs`) | ✅ 一致 |
| erp | 8010 | 8010 (`svc/erp/src/main.rs`) | ✅ 一致 |
| lims | 8051 | 8051 (`svc/lims/src/main.rs`) | ✅ 一致 |

## 配置文件关联

- **docker-compose**：`deploy/docker/docker-compose.yml` 使用 `${XXX_PORT:-<默认值>}` 映射端口
- **环境变量**：`config/ports.env` 定义端口覆盖
- **服务配置**：`config/services.yaml` 记录服务元数据
- **Vite 前端代理**：`apps/web/vite.config.ts` `SERVICES` 数组

## 变更规范

新增服务必须：
1. 在对应段位分配下一个空闲端口
2. 修改 `svc/<name>/src/main.rs` 中 `ServiceConfig.port` / `port_env_var`
3. 更新 `config/ports.env`、`config/services.yaml`、`apps/web/vite.config.ts`
4. 更新本文件（`docs/architecture/ports.md`）的标准端口表
