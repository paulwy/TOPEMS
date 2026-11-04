# 菜单单一权威 Phase 0 基线（五库账本 + 前端 395 差异）

> 生成时间：2026-11-05 00:55:21 CST ｜ 生成脚本：[verify_menu_authority.sh](scripts/db/verify_menu_authority.sh)
> 口径：仅 SELECT；前端基线来自 [verify_navigation.mjs](scripts/verify_navigation.mjs) `--json`（395 条唯一 code）。
> dev 连接串：`postgres://topems_app:***@127.0.0.1:5432/topems`（其余本地库按库名/端口派生，prod 走 SSH + psql）。

## 1. 五库核验

| 库 | 可达性 | core_menus 各 schema 行数 | 权威 schema | 权威 code 数 | 20261102*/20261103* 账本 |
|---|---|---|---|---|---|
| topems(dev) | 可达 | flow:0,iam:0,mes:610,public:184 | public | 184 | 20261102000001\|true\|\x6d616e75616c2d76<br>20261102100000\|true\|\x6d616e75616c2d76<br>20261102140000\|true\|\x6d616e75616c2d76<br>20261102150000\|true\|\x6d616e75616c2d76<br>20261102160000\|true\|\x6d616e75616c2d76<br>20261102170000\|true\|\x6d616e75616c2d76<br>20261102180000\|true\|\x6d616e75616c2d76<br>20261102190000\|true\|\x6d616e75616c2d76<br>20261102200000\|true\|\x6d616e75616c2d76<br>20261102210000\|true\|\x6d616e75616c2d76<br>20261102220000\|true\|\x6d616e75616c2d7669612d6d6967726174652d<br>20261102225000\|true\|\x6d616e75616c2d76<br>20261102230000\|true\|\x6d616e75616c2d7669612d6d6967726174652d<br>20261103000001\|true\|\x6d616e75616c2d76<br>20261103000002\|true\|\x6d616e75616c2d76 |
| topems_test | 不可达（psql: 错误: 连接到"127.0.0.1"上的服务器，端口5432失败：FATAL:  database "topems_test" does not exist） | - | - | - | - |
| topems_prepare | 可达 | flow:0,iam:0,mes:0,public:0 | - | 0 | <none> |
| 5433/topems | 不可达（psql: 错误: 连接到"127.0.0.1"上的服务器，端口5433失败：Connection refused 	Is the server running on that host and accepting TCP/IP conne） | - | - | - | - |
| prod/topems_prod | 可达 | flow:0,iam:0,public:424 | public | 424 | 20261102000001\|true\|\xe0d6ac30efddd2ce25babab9e95d2fc6bcc98d080cee17392baf580a1658402210bb7b2ac7959645d2e5474a465b7c73<br>20261102100000\|true\|\x3a8c304ac9b63a4e8d2fe26ec8bc469acc9940a7295e941dcdabbde6ef8566a9adf0b5ceab4db015cdb272f9477b28ab<br>20261102140000\|true\|\x7638579ad60d29a3f54e08c74bad5c7d28b6d7296c8b7892c26f4ffdce7f2252c25066f7e886df9aec024d61ecb53dfd<br>20261102150000\|true\|\xfdae7e3326959e64ab1e6592fb40e184998a220ed1b9b6fe472dd8da2079459e0a61a0a69bc22ba06593d9957cbe8fd1<br>20261102160000\|true\|\x670b167e5a0036f09fdc09a8f44cb599e12775b8f65a4a86dfeb84c5bb52207c4916f0b0118dc312984feb4401066af3<br>20261102170000\|true\|\x19071cce46251f5e9ac039d707daac556c09584b8f9034fad78c8c1c8b0872dea12be583160bb95f58db77113aa5a883<br>20261102180000\|true\|\x2bd0f635a65ff26af3cc9854be8acc44759f169c07302e947e2384d81d3f979e5c502b7d3534a110434dd363f10bc337<br>20261102190000\|true\|\x6526411c5e29bda5730c01a9c239c3b48122177c8180b278534566c20b5ad0c9287a7a1384d775ede5ccc74f9167cc98<br>20261102200000\|true\|\x3e736483c7d7bf17166545b0eb1bdff1f2a451456db986400fa0df2eb84459575d2ff103ea743d676834314edd5378c9<br>20261102210000\|true\|\x0f9425d59865d38eb2ba287a30c42eb88f4fa851e961e742553356c1568d730617c394c85e13f8deb15163a36d647d6a<br>20261102220000\|true\|\x2345771f1fade9adaa4c68d1e106608a92963203b54aeb92df1abb58098eace59275054286f6360a886de07790a48792<br>20261102225000\|true\|\x7f018061df55cb480c7c4429e409310cb7474d2af2a96ec24803d17a1177f0c9bed94c1b8735eab4c910984e6fd53e45<br>20261102230000\|true\|\x5eea30c369e5e0bd7ba295418ada12e7b10998602cbbd2acfeede43146ec67fb6f2006221e4e1c1e70a56a8a5db13123<br>20261103000001\|true\|\xc24a196fb15dbca19b156e48eac9f370a40a1abbd3bd9c485589e3646c4c1773bdbeda6cdd2cd8345b3089f428dbd8e9<br>20261103000002\|true\|\xf96a6bb658d9fa0d35aa40b963d71e968433649159336913ac15e4e86246e021f185643ee0249dc53d16d5800729c5dd<br>20261103000003\|true\|\x7793ad0b3c2417e2a73d1ea019d7dd51aa891260b0c236e07d4eebe6d8e28177a7757ba13119fc83bcab89323c6a4efb<br>20261103000004\|true\|\x60adb2c6bdbafb77202e887ba1210c30032c9361f07317d793b0c482af7d9a2bd5cee4be19b9b1f2149ed3ef30d0ba44<br>20261103000005\|true\|\x7b47f604830d699312ca04e964d40945bdbb269503cdd758e0e0cac7930a5287bfa9352036af063c0f15dfa71614c0c7 |

## 2. 权威 DB vs 前端 config（395）差异

| 库 | DB code | FE code | DB 多出（FE 缺失） | 前端多出（DB 缺失） | DB 内重复 code |
|---|---|---|---|---|---|
| topems(dev) | 184 | 395 | 19 | 230 | 0 |
| topems_test | - | 395 | 不可达，未比对 | 不可达，未比对 | - |
| topems_prepare | 0 | 395 | 0 | 395 | 0 |
| 5433/topems | - | 395 | 不可达，未比对 | 不可达，未比对 | - |
| prod/topems_prod | 424 | 395 | 55 | 26 | 0 |

## 3. 差异明细（按库）

### topems(dev)（权威 schema: public）

**DB 多出（前端无对应 navItem，共 19 条）**

```
finance-approval-config,finance-assets,finance-budget,finance-consolidation,finance-cost,finance-dashboard,finance-expense,finance-expense-approval,finance-invo
ices,finance-ledger,finance-opening-balance,finance-payments,finance-receipts,finance-receivable-payable,finance-reports,finance-tax,finance-vouchers,mes-work-o
rders,scm-contracts
```

**前端多出（DB 无对应 code，共 230 条）**

```
admin-account,admin-audit-log,admin-bank-account,admin-config-debug,admin-dashboard,admin-database,admin-dictionary,admin-feature-flag,admin-menu,admin-migratio
n,admin-monitor,admin-monitoring-alert,admin-performance,admin-permission-audit,admin-plugin,admin-rate-limit,admin-system,admin-system-settings,admin-tenant,ad
min-tenant-billing,ai-assistant,ai-businessCopilot,ai-chat,ai-code,ai-dashboard,ai-dify-chat,ai-document,ai-dsh-knowledge,ai-dsh-rag,ai-governanceDashboard,ai-k
nowledge,ai-prompts,ai-settings,asset-categories,asset-dashboard,asset-depreciation,asset-list,asset-transfers,automation-dashboard,automation-designer,automati
on-rules,automation-runs,automation-variables,bi-analytics,bi-comparison,bi-dashboard,bi-data-analysis,bi-data-source,bi-dataset,bi-gis,bi-index,bi-permission,b
i-report,bi-report-builder,bi-visualization,crm-forecast-algorithm,crm-rfm,crm-tags,doc-dashboard,doc-document-center,doc-documents,doc-file-detail,doc-knowledg
e-base,doc-list,erp-accounting-management,erp-announcement,erp-asset-management,erp-audit-log,erp-bank-account,erp-budget-management,erp-customer-management,erp
-dashboard,erp-data-dictionaries,erp-database-management,erp-dictionaries,erp-financial-analysis,erp-financial-statements,erp-general-ledger,erp-inventory-manag
ement,erp-material-management,erp-meeting-room,erp-office-supplies,erp-purchase-order,erp-receivable-payable,erp-sales-orders,erp-supplier-management,erp-vehicl
e-management,erp-vehicle-request,gis-dashboard,gis-devices,gis-fence,gis-map,gis-tracking,hrm-attendance-rule,hrm-payroll-template,hrm-recruitment-flow,hrm-setu
p,hrm-training-plan,iam-company-structure,iam-dashboard,iam-permission,iam-role,iam-user,im-dashboard,im-mail,integration-connections,integration-dashboard,inte
gration-erp,integration-events,integration-lims-qms,integration-mappings,integration-mes-erp,integration-settings,integration-wms-scm,lims-instrument-data,lims-
method-categories,mes-analytics-capacity,mes-analytics-delivery,mes-analytics-energy,mes-analytics-mtbf,mes-analytics-oee,mes-analytics-quality-pareto,mes-aps-c
onfig,mes-bom-version-policy,mes-capacity,mes-equipment-threshold,mes-master-data,mes-material-bom,mes-material-issue,mes-material-return,mes-quality-template,m
obile-approvals,mobile-attendance,mobile-home,mobile-inventory,mobile-notifications,mobile-production,mobile-profile,mobile-quality,mobile-scan,mobile-settings,
mobile-tasks,mobile-workbench,monitor-alert-history,monitor-alerts,monitor-dashboard,monitor-logs,monitor-metrics,monitor-rules,monitor-settings,notification-ar
chive,notification-center,notification-dashboard,notification-list,notification-settings,notification-statistics,notification-templates,oa-announcements,oa-dash
board,oa-documents,oa-meetings,oa-vehicles,pdm-bom-template,pdm-category-rule,pdm-change-template,pdm-doc-approval-flow,pdm-drawing,plugin-dashboard,plugin-mark
etplace,plugin-upload,pm-project-list,pm-project-type-config,pm-project-wizard,pm-task-kanban,pm-timeline,qms-audit-compliance,qms-corrective-actions,qms-cost-a
nalysis,qms-defect-pareto,qms-fmea-risk-matrix,qms-inspection-standard,qms-quality-trend,qms-spc-control-chart,rd-bug,rd-build,rd-code,rd-dashboard,rd-deploy,rd
-doc,rd-experiment,rd-formula,rd-material,rd-milestone,rd-overview,rd-project,rd-release,rd-report,rd-review,rd-settings,rd-test,report-viewer,scm-incoming-insp
ections,scm-incoming-notices,scm-purchase-threshold,scm-quota-template,scm-sourcing-strategy,scm-supplier-tier,ticket-center,ticket-dashboard,wms-analytics-abc,
wms-analytics-flow,wms-analytics-fulfillment,wms-analytics-locutil,wms-analytics-pareto,wms-analytics-turnover,wms-fifo-policy,wms-inventory-cycle,wms-inventory
-threshold,wms-location-rule,workflow-approvals,workflow-dashboard,workflow-definitions,workflow-designer,workflow-instances,workflow-monitor,workflow-notificat
ion-center,workflow-settings,workflow-statistics,workflow-templates,workflow-version-history
```

**DB 内重复 code**：无

### topems_test（权威 schema: -）

- 不可达，无差异可列。

### topems_prepare（权威 schema: -）

- 可达但无 core_menus 数据（0 条），前端 395 条全部不在 DB。

### 5433/topems（权威 schema: -）

- 不可达，无差异可列。

### prod/topems_prod（权威 schema: public）

**DB 多出（前端无对应 navItem，共 55 条）**

```
aps-analytics-capacity-utilization,aps-analytics-forecast-accuracy,aps-analytics-material-shortage,aps-analytics-oee-dashboard,aps-analytics-plan-adherence,aps-
analytics-schedule-gantt,aps-capacities,aps-dashboard,aps-forecasts,aps-material-plans,aps-production-plans,aps-schedules,finance-approval-config,finance-assets
,finance-budget,finance-budget-detail,finance-consolidation,finance-consolidation-reports,finance-cost,finance-dashboard,finance-expense,finance-expense-approva
l,finance-invoices,finance-ledger,finance-opening-balance,finance-payments,finance-receipts,finance-receivable-payable,finance-reports,finance-tax,finance-vouch
ers,master-ai-governance,master-commercial,master-data-asset-catalog,master-disaster-recovery,master-governance,master-knowledge-graph,master-lineage-analytics,
master-public-master-data,master-quality,master-schema-registry,master-semantic-search,master-versioning,tms-carrier-performance,tms-carriers,tms-dashboard,tms-
driver-performance,tms-drivers,tms-freight-cost,tms-route-efficiency,tms-routes,tms-shipment-trend,tms-shipments,tms-vehicle-utilization,tms-vehicles
```

**前端多出（DB 无对应 code，共 26 条）**

```
bi-analytics,bi-comparison,bi-dashboard,bi-data-analysis,bi-data-source,bi-dataset,bi-gis,bi-index,bi-permission,bi-report,bi-report-builder,bi-visualization,im
-dashboard,im-mail,mobile-approvals,mobile-attendance,mobile-home,mobile-inventory,mobile-notifications,mobile-production,mobile-profile,mobile-quality,mobile-s
can,mobile-settings,mobile-tasks,mobile-workbench
```

**DB 内重复 code**：无

## 4. 结论与说明

1. **documented 426 已漂移**：TODO.md 记录的 `core_menus 426 条` 来自已消失的 `topems_test`；当前实测 prod `public.core_menus` = **424**，差 -2。
2. **环境 schema 分裂**：prod 权威在 `public`；dev 同时存在 `public`(184) 与 legacy `mes`(610) 两份，`iam/flow` 为 0。后端菜单读取使用连接池 search_path 下的非限定 `core_menus`，dev 将命中 `public`（184），而非 legacy `mes`。
3. **dev 账本 checksum 非 sqlx 实执行**：dev/topems 的 20261102*~20261103* 行 checksum 以 `manual-` 开头（手工登记），不可作为 sqlx 校验依据；prod 为真实 64 字节哈希。
4. **五库可达性**：`topems_test` 与 5433 在本机不可达（分别为 database does not exist / Connection refused），未做任何猜测补数。
