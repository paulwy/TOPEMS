# V73 Real Handler Triage Report

## 摘要

| 分类 | 数量 | 说明 |
|------|------|------|
| 真正死代码 | 0 | handler 未注册路由或 OpenAPI 残留，运行期不可达 |
| 待绑定端点 | 332 | real handler 已注册，但前端未发现调用证据 |
| 探针限制误报 | 47 | 前端存在同路径引用，但当前探针未识别 |
| compat 残留 | 0 | 不纳入 real handler 主统计 |

## 按服务统计

| 服务 | 真正死代码 | 待绑定 | 探针误报 | compat 残留 | 合计 |
|------|-----------|--------|----------|-------------|------|
| ehs | 0 | 102 | 9 | 0 | 111 |
| monitor | 0 | 38 | 25 | 0 | 63 |
| finance | 0 | 27 | 0 | 0 | 27 |
| unified-core | 0 | 22 | 2 | 0 | 24 |
| integration | 0 | 22 | 0 | 0 | 22 |
| pdm | 0 | 22 | 0 | 0 | 22 |
| flow | 0 | 12 | 1 | 0 | 13 |
| ai | 0 | 10 | 0 | 0 | 10 |
| gis | 0 | 10 | 0 | 0 | 10 |
| lims | 0 | 6 | 4 | 0 | 10 |
| mobile | 0 | 10 | 0 | 0 | 10 |
| ticket | 0 | 10 | 0 | 0 | 10 |
| portal | 0 | 9 | 0 | 0 | 9 |
| billing | 0 | 8 | 0 | 0 | 8 |
| master-data | 0 | 8 | 0 | 0 | 8 |
| analytics | 0 | 4 | 0 | 0 | 4 |
| erp | 0 | 1 | 2 | 0 | 3 |
| qms | 0 | 0 | 3 | 0 | 3 |
| wms | 0 | 3 | 0 | 0 | 3 |
| communication | 0 | 2 | 0 | 0 | 2 |
| mes | 0 | 2 | 0 | 0 | 2 |
| rd | 0 | 1 | 1 | 0 | 2 |
| lowcode | 0 | 1 | 0 | 0 | 1 |
| scm | 0 | 1 | 0 | 0 | 1 |
| search | 0 | 1 | 0 | 0 | 1 |

## 真正死代码

数量：0

| 服务 | 方法 | 路径 | operationId | 依据 |
|------|------|------|-------------|------|

## 探针限制误报

数量：47

| 服务 | 方法 | 路径 | operationId | 依据 |
|------|------|------|-------------|------|
| ehs | GET | /api/ehs/checks/plans | ehs_list_plans | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/inspection.ts` |
| ehs | GET | /api/ehs/checks/records | list_records | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/inspection.ts` |
| ehs | GET | /api/ehs/environment/records | ehs_list_records_api_ehs_environment_records | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/environment.ts` |
| ehs | GET | /api/ehs/environmental-compliance/permits | list_permits | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/environmental_compliance.rs`；前端证据 `apps/web/src/api/ehs/compliance.ts` |
| ehs | GET | /api/ehs/environmental-compliance/regulations | list_regulations | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/environmental_compliance.rs`；前端证据 `apps/web/src/api/ehs/compliance.ts` |
| ehs | GET | /api/ehs/hazardous-materials | list_materials | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/hazardousMaterial.ts` |
| ehs | GET | /api/ehs/issues | list_hazards | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/safetyIssue.ts` |
| ehs | GET | /api/ehs/occupational-health/contraindications | list_contraindications | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/occupationalHealth.ts` |
| ehs | GET | /api/ehs/sync-records | ehs_list_sync_records | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/sync.ts` |
| erp | GET | /api/erp/master-data/sync/jobs | list_sync_jobs | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/erp/src/modules/openapi.rs`；前端证据 `apps/web/src/api/erp/masterData.ts` |
| erp | GET | /api/erp/master-data/sync/v2/jobs | list_sync_jobs_v2 | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/erp/src/modules/openapi.rs`；前端证据 `apps/web/src/api/erp/masterData.ts` |
| flow | GET | /api/core/flow/workflows | list_workflows | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/api/workflow/definition.ts` |
| lims | GET | /api/lims/instruments | list_instruments | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/instrument.ts` |
| lims | GET | /api/lims/reagents | list_reagents | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/reagent.ts` |
| lims | GET | /api/lims/samples | list_samples | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/sample.ts` |
| lims | GET | /api/lims/tasks | lims_list_tasks | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/inspection.ts` |
| monitor | GET | /api/monitor/alerts | list_alerts | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/alertTyped.ts` |
| monitor | GET | /api/monitor/alerts/{param} | get_alert | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/alertTyped.ts` |
| monitor | GET | /api/monitor/business-metrics | list_business_metrics | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metricTyped.ts` |
| monitor | POST | /api/monitor/business-metrics | create_business_metric | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metricTyped.ts` |
| monitor | GET | /api/monitor/business-metrics/kpi | get_kpi_dashboard | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/business-metrics/summary | get_business_metric_summary | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/business-metrics/trend | get_business_metric_trend | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/business-metrics/{param} | get_business_metric | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metricTyped.ts` |
| monitor | PUT | /api/monitor/business-metrics/{param} | update_business_metric | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metricTyped.ts` |
| monitor | DELETE | /api/monitor/business-metrics/{param} | delete_business_metric | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metricTyped.ts` |
| monitor | GET | /api/monitor/performance/api | get_api_performance | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/index.ts` |
| monitor | GET | /api/monitor/rules | list_rules | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | POST | /api/monitor/rules | create_rule | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/rules/{param} | get_rule | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | PUT | /api/monitor/rules/{param} | update_rule | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | DELETE | /api/monitor/rules/{param} | delete_rule | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos | list_slos | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | POST | /api/monitor/slos | create_slo | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos/budget | get_slo_budget | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos/summary | get_slo_summary | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos/trend | get_slo_trend | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos/violations | list_slo_violations | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/slos/{param} | get_slo | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | PUT | /api/monitor/slos/{param} | update_slo | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | DELETE | /api/monitor/slos/{param} | delete_slo | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| qms | GET | /api/qms/checks | qms_list_inspections | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/qms/src/openapi.rs`；前端证据 `apps/web/src/api/qms/inspection.ts` |
| qms | GET | /api/qms/issues | list_issues | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/qms/src/openapi.rs`；前端证据 `apps/web/src/api/qms/issue.ts` |
| qms | GET | /api/qms/standards | list_standards | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/qms/src/openapi.rs`；前端证据 `apps/web/src/api/qms/standard.ts` |
| rd | GET | /api/rd/projects | rd_list_projects | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/rd/src/modules/openapi.rs`；前端证据 `apps/web/src/api/rd/project.ts` |
| unified-core | GET | /api/unified-core/users | list_users | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/unified-core/src/modules/openapi.rs`；前端证据 `apps/web/src/api/iam/user.ts` |
| unified-core | POST | /api/unified-core/users | create_user | 前端存在同路径强引用，但当前 P-04 探针未识别该调用形态；路由证据 `svc/unified-core/src/middleware/permission.rs`；前端证据 `apps/web/src/api/iam/user.ts` |

## 待绑定端点

数量：332

| 服务 | 方法 | 路径 | operationId | 依据 |
|------|------|------|-------------|------|
| ai | GET | /api/ai | home | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| ai | POST | /api/ai/agent/run | agent_run | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/modules/openapi.rs` |
| ai | GET | /api/ai/agent/tools | list_agent_tools | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/modules/openapi.rs` |
| ai | GET | /api/ai/connectors | list_connectors | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | POST | /api/ai/connectors/create | create_connector | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | POST | /api/ai/connectors/delete | delete_connector | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | GET | /api/ai/connectors/get | get_connector | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | POST | /api/ai/connectors/query | query_data | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | GET | /api/ai/connectors/test | test_connector | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| ai | POST | /api/ai/connectors/update | update_connector | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ai/src/routes.rs` |
| analytics | GET | /api/bi/analysis | list_analyses | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/analytics/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| analytics | POST | /api/bi/analysis | create_analysis | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/analytics/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| analytics | GET | /api/bi/analysis/{param} | get_analysis | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/analytics/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| analytics | POST | /api/bi/analysis/{param}/execute | execute_analysis | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/analytics/src/openapi.rs`；前端证据 `apps/web/src/pages/bi/BiIndexPage.tsx` |
| billing | GET | /api/billing/invoices/{param} | list_invoices | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/crmFinance/index.ts` |
| billing | GET | /api/billing/plans | list_plans | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/ehs/emergency.ts` |
| billing | GET | /api/billing/plans/{param} | get_plan | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/ehs/emergency.ts` |
| billing | POST | /api/billing/subscriptions | create_subscription | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/report/index.ts` |
| billing | GET | /api/billing/subscriptions/{param} | get_subscription | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/report/index.ts` |
| billing | PUT | /api/billing/subscriptions/{param} | cancel_subscription | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/api/report/index.ts` |
| billing | GET | /api/billing/usage/{param} | get_usage_summary | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| billing | POST | /api/billing/usage/{param}/{param} | record_usage | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/billing/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| communication | GET | /api/communication/notify/list | list_notifications | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/communication/src/notification.rs` |
| communication | POST | /api/communication/notify/send | send_notification | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/communication/src/notification.rs` |
| ehs | GET | /api/ehs/checks/plans/{param}/items | list_plan_items | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/inspection.ts` |
| ehs | GET | /api/ehs/drills/plans | list_drill_plans | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/drills/plans | create_drill_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/plans/{param} | get_drill_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/drills/plans/{param} | update_drill_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/drills/plans/{param} | delete_drill_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/records | list_drill_records | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/drills/records | create_drill_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/records/{param} | get_drill_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/drills/records/{param} | update_drill_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/drills/records/{param} | delete_drill_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/drills/records/{param}/evaluation | create_drill_evaluation | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/records/{param}/problems | list_drill_problems | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/drills/records/{param}/problems | create_drill_problem | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/drills/records/{param}/problems/{param} | update_drill_problem | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/statistics | get_drill_statistics | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/drills/types | list_drill_types | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/emergency-plans | ehs_list_plans_api_ehs_emergency-plans | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/emergency-plans | ehs_create_plan_api_ehs_emergency-plans | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/emergency-plans/categories | list_plan_categories | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/emergency-plans/{param} | ehs_get_plan_api_ehs_emergency-plans_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/emergency-plans/{param} | ehs_update_plan_api_ehs_emergency-plans_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/emergency-plans/{param} | ehs_delete_plan_api_ehs_emergency-plans_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/emergency-plans/{param}/approve | approve_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/emergency-plans/{param}/submit-approval | submit_plan_approval | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/emergency-plans/{param}/supplies | list_plan_supplies | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/emergency-plans/{param}/supplies | add_plan_supply | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/emergency-plans/{param}/supplies/{param} | delete_plan_supply | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/emergency-plans/{param}/versions | list_plan_versions | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/emergency-plans/{param}/versions | create_new_version | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/environmental-compliance/evaluations | list_evaluations | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | POST | /api/ehs/environmental-compliance/evaluations | create_evaluation | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/evaluations/{param} | get_evaluation | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | PUT | /api/ehs/environmental-compliance/evaluations/{param} | update_evaluation | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | DELETE | /api/ehs/environmental-compliance/evaluations/{param} | delete_evaluation | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/incidents | list_incidents | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | POST | /api/ehs/environmental-compliance/incidents | create_incident | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/incidents/{param} | get_incident | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | PUT | /api/ehs/environmental-compliance/incidents/{param} | update_incident | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | DELETE | /api/ehs/environmental-compliance/incidents/{param} | delete_incident | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/monitoring | list_monitor_records | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | POST | /api/ehs/environmental-compliance/monitoring | create_monitor_record | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/monitoring/types | list_monitor_types | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/monitoring/{param} | get_monitor_record | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | DELETE | /api/ehs/environmental-compliance/monitoring/{param} | delete_monitor_record | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/environmental-compliance/regulations/categories | list_regulation_categories | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs`；前端证据 `apps/web/src/api/ehs/compliance.ts` |
| ehs | GET | /api/ehs/environmental-compliance/statistics | get_compliance_statistics | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/environmental_compliance.rs` |
| ehs | GET | /api/ehs/hazardous-materials/statistics | get_material_statistics | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/hazardous-materials/stock-records | list_stock_records | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/hazardous-materials/stock-records/stock-in | create_stock_in | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/hazardous-materials/stock-records/stock-out | create_stock_out | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/hazardous-materials/stock-records/{param} | get_stock_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/hazardous-materials/{param}/msds | update_material_msds | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/hazardousMaterial.ts` |
| ehs | GET | /api/ehs/hazardous-materials/{param}/stocks | list_material_stocks | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/hazards/{param}/controls | list_control_measures | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/issues/{param}/approval/approve | approve_hazard | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/issues/{param}/approval/reject | reject_hazard | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/issues/{param}/approval/start | start_hazard_approval | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-disease/cases | list_disease_cases | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | POST | /api/ehs/occupational-disease/cases | create_disease_case | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/cases/{param} | get_disease_case | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | PUT | /api/ehs/occupational-disease/cases/{param} | update_disease_case | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | DELETE | /api/ehs/occupational-disease/cases/{param} | delete_disease_case | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/detections | list_detection_records | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | POST | /api/ehs/occupational-disease/detections | create_detection_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/detections/{param} | get_detection_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | DELETE | /api/ehs/occupational-disease/detections/{param} | delete_detection_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/factor-types | list_factor_types | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/factors | list_hazard_factors | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | POST | /api/ehs/occupational-disease/factors | create_hazard_factor | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/factors/{param} | get_hazard_factor | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | PUT | /api/ehs/occupational-disease/factors/{param} | update_hazard_factor | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | DELETE | /api/ehs/occupational-disease/factors/{param} | delete_hazard_factor | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/protection-measures | list_protection_measures | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | POST | /api/ehs/occupational-disease/protection-measures | create_protection_measure | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/protection-measures/{param} | get_protection_measure | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | PUT | /api/ehs/occupational-disease/protection-measures/{param} | update_protection_measure | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | DELETE | /api/ehs/occupational-disease/protection-measures/{param} | delete_protection_measure | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-disease/statistics | get_disease_statistics | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/modules/ehs/config.ts` |
| ehs | GET | /api/ehs/occupational-health/abnormalities | list_abnormalities | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/occupational-health/abnormalities/{param} | update_abnormality | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-health/exam-plans | list_exam_plans | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/occupational-health/exam-plans | create_exam_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-health/exam-plans/{param} | get_exam_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/occupational-health/exam-plans/{param} | update_exam_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/occupational-health/exam-plans/{param} | delete_exam_plan | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-health/exam-records | list_exam_records | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/occupational-health/exam-records | create_exam_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-health/exam-records/{param} | get_exam_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/occupational-health/exam-records/{param} | update_exam_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/occupational-health/exam-records/{param} | delete_exam_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/occupational-health/exam-types | list_exam_types | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | DELETE | /api/ehs/sync-records/{param} | ehs_delete_sync_record | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/lims/sync.ts` |
| ehs | POST | /api/ehs/sync-records/{param}/retry | ehs_retry_sync | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | POST | /api/ehs/sync/accident-to-lims | sync_accident_to_lims | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | PUT | /api/ehs/sync/configs | update_sync_configs | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/api/ehs/sync.ts` |
| ehs | POST | /api/ehs/sync/hazard-to-qms | sync_hazard_to_qms | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ehs/src/modules/openapi.rs` |
| ehs | GET | /api/ehs/training | list_trainings | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| ehs | POST | /api/ehs/training | create_training | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| ehs | GET | /api/ehs/training/{param} | get_training | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| ehs | PUT | /api/ehs/training/{param} | update_training | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| ehs | DELETE | /api/ehs/training/{param} | delete_training | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ehs/src/modules/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| erp | GET | /api/erp/addressbook/export | export_contacts | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/erp/src/modules/openapi.rs`；前端证据 `apps/web/src/api/addressbook/index.ts` |
| finance | GET | /api/finance/accounts/code/{param} | get_account_by_code | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/balance-sheet/{param} | get_balance_sheet | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/budgets | list_budgets | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | POST | /api/finance/budgets | create_budget | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | GET | /api/finance/budgets/{param} | get_budget | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/pm/budget.ts` |
| finance | PUT | /api/finance/budgets/{param} | update_budget | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/pm/budget.ts` |
| finance | DELETE | /api/finance/budgets/{param} | delete_budget | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/pm/budget.ts` |
| finance | GET | /api/finance/cash-flow/{param} | get_cash_flow | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/expenses | list_expenses | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | POST | /api/finance/expenses | create_expense | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | GET | /api/finance/expenses/{param} | get_expense | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | PUT | /api/finance/expenses/{param} | update_expense | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | DELETE | /api/finance/expenses/{param} | delete_expense | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/erp/finance/budget.ts` |
| finance | GET | /api/finance/income-statement/{param} | get_income_statement | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/ledger | get_ledger | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | POST | /api/finance/payables/batch | batch_create_payables_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | POST | /api/finance/receivables/batch | batch_create_receivables_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/reports/balance-sheet/export | export_balance_sheet_report | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/finance/report.ts` |
| finance | GET | /api/finance/reports/cash-flow/export | export_cash_flow_report | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/finance/report.ts` |
| finance | GET | /api/finance/reports/income-statement/export | export_income_statement_report | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/finance/report.ts` |
| finance | GET | /api/finance/trial-balance/{param} | get_trial_balance | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/voucher-generation-rules/{param} | get_generation_rule_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/voucherTemplate/index.ts` |
| finance | GET | /api/finance/voucher-templates/{param}/entries | list_entries | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/voucher-templates/{param}/entries/{param} | get_entry | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | GET | /api/finance/voucher-templates/{param}/export | export_template | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| finance | POST | /api/finance/vouchers/export | export_vouchers | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/api/finance/voucher.ts` |
| finance | POST | /api/finance/vouchers/{param}/unpost | unpost_voucher | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/finance/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | GET | /api/core/flow/approvals/pending | list_pending_approvals | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/approvals/{param}/approve | approve_task | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/approvals/{param}/reject | reject_task | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/instances/{param}/approve | approve_instance | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/instances/{param}/reject | reject_instance | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/instances/{param}/start | start_instance | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/workflows | create_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/api/workflow/definition.ts` |
| flow | GET | /api/core/flow/workflows/{param} | get_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| flow | PUT | /api/core/flow/workflows/{param} | update_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| flow | DELETE | /api/core/flow/workflows/{param} | delete_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| flow | POST | /api/core/flow/workflows/{param}/publish | publish_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| flow | POST | /api/core/flow/workflows/{param}/unpublish | unpublish_workflow | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| gis | GET | /api/gis/devices | list_devices | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | GET | /api/gis/devices/{param} | get_device | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | GET | /api/gis/locations | list_locations | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| gis | POST | /api/gis/locations/create | create_location | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | GET | /api/gis/locations/{param} | get_location | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs`；前端证据 `apps/web/src/api/wms/location.ts` |
| gis | GET | /api/gis/maps | list_maps | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | POST | /api/gis/maps/create | create_map | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | GET | /api/gis/maps/{param} | get_map | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | PUT | /api/gis/maps/{param} | update_map | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| gis | DELETE | /api/gis/maps/{param} | delete_map | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/gis/src/main.rs` |
| integration | GET | /api/integration/mes-erp/records | list_mes_erp_sync_records | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-erp/sync/erp-to-mes | sync_erp_order_to_mes | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-erp/sync/mes-to-erp | sync_mes_progress_to_erp | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/mes-erp/{param}/logs | get_mes_erp_sync_logs | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-erp/{param}/retry | retry_mes_erp_sync | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/mes-qms | list_mes_qms_sync_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-qms/defect-handling | defect_handling_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/mes-qms/stats | get_mes_qms_stats_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-qms/sync-result | sync_quality_result_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-qms/sync-trace | sync_trace_chain_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-qms/trigger-inspection | trigger_qms_inspection_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/mes-qms/{param} | get_mes_qms_sync_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/mes-qms/{param}/retry | retry_mes_qms_sync_api | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/sync/pending | get_pending | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/retry-failed | retry_failed | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/sync/statistics | integration_get_statistics | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/tasks | create_task | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | GET | /api/integration/sync/tasks/{param} | integration_get_task | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/tasks/{param}/status | update_status | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/trigger/scm-to-wms | trigger_scm_wms | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/trigger/srm-to-scm | trigger_srm_scm | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| integration | POST | /api/integration/sync/trigger/wms-to-crm | trigger_wms_crm | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/integration/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| lims | POST | /api/lims/instruments | create_instrument | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/instrument.ts` |
| lims | POST | /api/lims/reagents | create_reagent | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/reagent.ts` |
| lims | POST | /api/lims/samples | register_sample | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/api/lims/sample.ts` |
| lims | GET | /api/lims/samples/{param} | get_sample | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| lims | POST | /api/lims/tasks | lims_create_task | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| lims | GET | /api/lims/tasks/{param} | lims_get_task | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/lims/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| lowcode | GET | /api/lowcode/designer/schema | get_designer_schema | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/lowcode/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| master-data | POST | /api/master/quality-v51/ai/suggest | generate_suggestions | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | POST | /api/master/quality-v51/auto-fix/run | apply_auto_fix | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | GET | /api/master/quality-v51/checks | list_quality_checks | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | POST | /api/master/quality-v51/checks | run_quality_check | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | GET | /api/master/quality-v51/dashboard | get_quality_dashboard | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | GET | /api/master/quality-v51/rules | list_quality_rules | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | POST | /api/master/quality-v51/rules | create_quality_rule | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/master-data/src/openapi.rs` |
| master-data | GET | /api/master/quality-v51/score | get_quality_score | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/master-data/src/openapi.rs` |
| mes | GET | /api/mes/wips/{param}/transfers | list_wip_transfers | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mes/src/modules/openapi.rs` |
| mes | GET | /api/mes/work-reports/today/output | get_today_production_output | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mes/src/modules/openapi.rs` |
| mobile | GET | /api/mobile/mobile-tasks | get_all_tasks | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | POST | /api/mobile/mobile-tasks | mobile_create_task | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | GET | /api/mobile/mobile-tasks/{param} | mobile_get_task | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | PUT | /api/mobile/mobile-tasks/{param} | update_task | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | DELETE | /api/mobile/mobile-tasks/{param} | delete_task | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | GET | /api/mobile/patrol-records | get_all_patrol_records | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | POST | /api/mobile/patrol-records | create_patrol_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | GET | /api/mobile/patrol-records/{param} | get_patrol_record | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | POST | /api/mobile/scan/barcode | scan_barcode | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| mobile | GET | /api/mobile/stats/dashboard | get_dashboard_stats | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/mobile/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| monitor | POST | /api/monitor/alerts/acknowledge | acknowledge_alerts | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/alerts/resolve | resolve_alerts | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | GET | /api/monitor/alerts/statistics | get_alert_statistics | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/alerts/{param} | update_alert | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/alertTyped.ts` |
| monitor | GET | /api/monitor/alerts/{param}/history | get_alert_history | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | GET | /api/monitor/alerts/{param}/timeline | get_alert_timeline | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/performance/export | export_performance_data | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/workflow/monitor.ts` |
| monitor | GET | /api/monitor/performance/services | get_service_performance | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/workflow/monitor.ts` |
| monitor | GET | /api/monitor/performance/slow-queries | get_slow_queries | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/workflow/monitor.ts` |
| monitor | GET | /api/monitor/performance/summary | get_performance_summary | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/srm/index.ts` |
| monitor | GET | /api/monitor/performance/trend | get_performance_trend | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/workflow/monitor.ts` |
| monitor | GET | /api/monitor/rules/{param}/advanced | get_advanced_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | PUT | /api/monitor/rules/{param}/advanced | update_advanced_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/rules/{param}/disable | disable_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/rules/{param}/enable | enable_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | GET | /api/monitor/rules/{param}/escalation | get_escalation | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | PUT | /api/monitor/rules/{param}/escalation | update_escalation | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | GET | /api/monitor/rules/{param}/routing | get_routing | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | PUT | /api/monitor/rules/{param}/routing | update_routing | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | GET | /api/monitor/rules/{param}/scheduled-trigger | get_scheduled_trigger | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | PUT | /api/monitor/rules/{param}/scheduled-trigger | update_scheduled_trigger | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/admin/monitoring.ts` |
| monitor | POST | /api/monitor/slos/violations/{param}/resolve | resolve_slo_violation | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/monitor/metrics.ts` |
| monitor | GET | /api/monitor/suppression | list_suppression_rules | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | POST | /api/monitor/suppression | create_suppression_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | GET | /api/monitor/suppression/{param} | get_suppression_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | PUT | /api/monitor/suppression/{param} | update_suppression_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | DELETE | /api/monitor/suppression/{param} | delete_suppression_rule | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | GET | /api/monitor/templates | monitor_list_templates | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/mail/index.ts` |
| monitor | POST | /api/monitor/templates | monitor_create_template | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/mail/index.ts` |
| monitor | GET | /api/monitor/templates/{param} | monitor_get_template | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/mail/index.ts` |
| monitor | PUT | /api/monitor/templates/{param} | monitor_update_template | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/mail/index.ts` |
| monitor | DELETE | /api/monitor/templates/{param} | monitor_delete_template | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs`；前端证据 `apps/web/src/api/mail/index.ts` |
| monitor | GET | /api/monitor/thresholds | list_thresholds | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | POST | /api/monitor/thresholds | create_threshold | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | POST | /api/monitor/thresholds/evaluate | evaluate_thresholds | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | GET | /api/monitor/thresholds/{param} | get_threshold | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | PUT | /api/monitor/thresholds/{param} | update_threshold | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| monitor | DELETE | /api/monitor/thresholds/{param} | delete_threshold | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/monitor/src/openapi.rs` |
| pdm | GET | /api/pdm | pdm__home | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| pdm | POST | /api/pdm/change-notices/{param}/approve | approve_change_notice | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | POST | /api/pdm/change-notices/{param}/reject | reject_change_notice | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | POST | /api/pdm/change-notices/{param}/submit | submit_change_notice | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/documents/pending-approval | list_pending_documents | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/documents/{param}/approval-history | get_document_approval_history | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | POST | /api/pdm/documents/{param}/approve | start_document_approval | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/statistics/{param} | pdm_get_statistics | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/production_statistics.rs`；前端证据 `apps/web/src/api/pm/dashboard.ts` |
| pdm | GET | /api/pdm/versions | pdm_list_versions_api_pdm_versions | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | POST | /api/pdm/versions | pdm_create_version_api_pdm_versions | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/versions/{param} | pdm_get_version_api_pdm_versions_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | PUT | /api/pdm/versions/{param} | pdm_update_version_api_pdm_versions_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | DELETE | /api/pdm/versions/{param} | pdm_delete_version_api_pdm_versions_{id} | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/workflow-instances | list_workflow_instances | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/workflow-instances/{param} | get_workflow_instance | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | POST | /api/pdm/workflow-instances/{param}/advance | advance_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/workflows | pdm_list_workflows | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs`；前端证据 `apps/web/src/api/workflow/definition.ts` |
| pdm | POST | /api/pdm/workflows | pdm_create_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs`；前端证据 `apps/web/src/api/workflow/definition.ts` |
| pdm | POST | /api/pdm/workflows/start | start_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs` |
| pdm | GET | /api/pdm/workflows/{param} | pdm_get_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| pdm | PUT | /api/pdm/workflows/{param} | pdm_update_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| pdm | DELETE | /api/pdm/workflows/{param} | pdm_delete_workflow | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/pdm/src/modules/openapi.rs`；前端证据 `apps/web/src/api/lowcode/workflows.ts` |
| portal | GET | /api/portal/announcements | get_announcements | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/api/erp/admin/announcement.ts` |
| portal | POST | /api/portal/announcements | portal_create_announcement | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/api/erp/admin/announcement.ts` |
| portal | GET | /api/portal/dashboard/stats | portal_get_dashboard_stats | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/api/ai/index.ts` |
| portal | GET | /api/portal/navigation/menu | get_navigation_menu | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| portal | GET | /api/portal/notifications | portal_get_notifications | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/utils/apiPath.ts` |
| portal | GET | /api/portal/services | list_services | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| portal | GET | /api/portal/todos | get_todos | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| portal | POST | /api/portal/todos | add_todo | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| portal | GET | /api/portal/user | get_user_info | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/portal/src/openapi.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| rd | GET | /api/rd/audit-logs | rd_list_audit_logs | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/rd/src/modules/openapi.rs`；前端证据 `apps/web/src/api/lims/audit.ts` |
| scm | POST | /api/scm/purchase-orders/{param}/reject | reject_order | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/scm/src/modules/purchase_order.rs`；前端证据 `apps/web/src/modules/registry/core-modules.ts` |
| search | GET | /api/search | search_handler | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/search/src/handlers.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| ticket | GET | /api/ticket/sla-policies | list_sla_policies_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | POST | /api/ticket/sla-policies | create_sla_policy_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | GET | /api/ticket/tickets | list_tickets_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | POST | /api/ticket/tickets | create_ticket_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | GET | /api/ticket/tickets/stats | get_stats_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | GET | /api/ticket/tickets/{param} | get_ticket_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | PUT | /api/ticket/tickets/{param} | update_ticket_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | DELETE | /api/ticket/tickets/{param} | delete_ticket_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/api/ticket/index.ts` |
| ticket | GET | /api/ticket/tickets/{param}/comments | list_comments_handler | 业务 CRUD/动作类已注册端点，当前前端缺少 API 绑定；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| ticket | POST | /api/ticket/tickets/{param}/comments | add_comment_handler | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/ticket/src/handlers.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/doc/documents | unified-core_create_document | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/modules/doc/config.ts` |
| unified-core | PUT | /api/core/doc/documents/{param} | unified-core_update_document | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/download/{param} | download_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/files | list_files | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/files/received | get_received_files | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/files/search | search_files | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/files/starred | list_starred_files | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | PUT | /api/core/file/files/{param} | update_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/copy | copy_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/move | move_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/permission | set_file_permission | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/permissions | set_file_permissions | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/files/{param}/shares | get_file_shares | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/star | star_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/files/{param}/unstar | unstar_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/preview/{param} | preview_file | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | DELETE | /api/core/file/shares/{param} | delete_share | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/stats | get_file_stats | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | GET | /api/core/file/thumbnail/{param} | get_thumbnail | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/core/file/upload/multiple | upload_multiple | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/main.rs`；前端证据 `apps/web/src/config/runtime.ts` |
| unified-core | POST | /api/unified-core/iam/auth/login | login | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/modules/openapi.rs`；前端证据 `apps/web/src/constants/api.ts` |
| unified-core | POST | /api/unified-core/iam/auth/register | register | 运维/平台/集成类已注册端点，当前前端未绑定，建议进入管理端待绑定池；路由证据 `svc/unified-core/src/modules/openapi.rs`；前端证据 `apps/web/src/constants/api.ts` |
| wms | GET | /api/wms/inventory-alerts | wms_list_alerts | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/wms/src/modules/openapi.rs` |
| wms | GET | /api/wms/inventory-alerts/{param} | wms_get_alert | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/wms/src/modules/openapi.rs` |
| wms | POST | /api/wms/inventory-alerts/{param}/acknowledge | acknowledge_alert | 已注册 real handler，但未发现前端调用证据；路由证据 `svc/wms/src/modules/openapi.rs` |

## compat 残留

数量：0

| 服务 | 方法 | 路径 | operationId | 依据 |
|------|------|------|-------------|------|
