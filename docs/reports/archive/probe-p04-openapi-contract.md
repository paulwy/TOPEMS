# Probe P-04: OpenAPI 前后端契约一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| OpenAPI 端点总数 (method+path) | 3173 |
| 前端 API 调用总数 (去重前) | 2875 |
| 前端唯一路径数 | 1881 |
| 已匹配端点数 | 2745 |
| 未使用后端 API (OpenAPI 有/前端无) | 387 |
| 未使用后端 API — 已豁免 | 41 |
| 未文档化前端 API (前端有/OpenAPI 无) | 0 |
| 未文档化前端 API — 已豁免 | 11 |
| 方法不匹配数 | 0 |
| **总不匹配数** | **0** |
| CI 严重度 | GREEN |

## 1. 未使用后端 API（OpenAPI 有定义，前端未调用）

共 387 个端点：

| # | operationId | 方法 | 路径 | Tag | 备注 |
|---|-------------|------|------|-----|------|
| 1 | home | GET | `/api/ai` | ai |  |
| 2 | agent_run | POST | `/api/ai/agent/run` | ai |  |
| 3 | list_agent_tools | GET | `/api/ai/agent/tools` | ai |  |
| 4 | list_connectors | GET | `/api/ai/connectors` | ai |  |
| 5 | create_connector | POST | `/api/ai/connectors/create` | ai |  |
| 6 | delete_connector | POST | `/api/ai/connectors/delete` | ai |  |
| 7 | get_connector | GET | `/api/ai/connectors/get` | ai |  |
| 8 | query_data | POST | `/api/ai/connectors/query` | ai |  |
| 9 | test_connector | GET | `/api/ai/connectors/test` | ai |  |
| 10 | update_connector | POST | `/api/ai/connectors/update` | ai |  |
| 11 | list_analyses | GET | `/api/bi/analysis` | analytics |  |
| 12 | create_analysis | POST | `/api/bi/analysis` | analytics |  |
| 13 | get_analysis | GET | `/api/bi/analysis/{param}` | analytics |  |
| 14 | execute_analysis | POST | `/api/bi/analysis/{param}/execute` | analytics |  |
| 15 | list_invoices | GET | `/api/billing/invoices/{param}` | billing |  |
| 16 | list_plans | GET | `/api/billing/plans` | billing |  |
| 17 | get_plan | GET | `/api/billing/plans/{param}` | billing |  |
| 18 | create_subscription | POST | `/api/billing/subscriptions` | billing |  |
| 19 | get_subscription | GET | `/api/billing/subscriptions/{param}` | billing |  |
| 20 | cancel_subscription | PUT | `/api/billing/subscriptions/{param}` | billing |  |
| 21 | get_usage_summary | GET | `/api/billing/usage/{param}` | billing |  |
| 22 | record_usage | POST | `/api/billing/usage/{param}/{param}` | billing |  |
| 23 | list_notifications | GET | `/api/communication/notify/list` | communication |  |
| 24 | send_notification | POST | `/api/communication/notify/send` | communication |  |
| 25 | ehs_list_plans | GET | `/api/ehs/checks/plans` | ehs | path exists in frontend but method not called |
| 26 | list_plan_items | GET | `/api/ehs/checks/plans/{param}/items` | ehs | path exists in frontend but method not called |
| 27 | list_records | GET | `/api/ehs/checks/records` | ehs | path exists in frontend but method not called |
| 28 | list_drill_plans | GET | `/api/ehs/drills/plans` | ehs |  |
| 29 | create_drill_plan | POST | `/api/ehs/drills/plans` | ehs |  |
| 30 | get_drill_plan | GET | `/api/ehs/drills/plans/{param}` | ehs |  |
| 31 | update_drill_plan | PUT | `/api/ehs/drills/plans/{param}` | ehs |  |
| 32 | delete_drill_plan | DELETE | `/api/ehs/drills/plans/{param}` | ehs |  |
| 33 | list_drill_records | GET | `/api/ehs/drills/records` | ehs |  |
| 34 | create_drill_record | POST | `/api/ehs/drills/records` | ehs |  |
| 35 | get_drill_record | GET | `/api/ehs/drills/records/{param}` | ehs |  |
| 36 | update_drill_record | PUT | `/api/ehs/drills/records/{param}` | ehs |  |
| 37 | delete_drill_record | DELETE | `/api/ehs/drills/records/{param}` | ehs |  |
| 38 | create_drill_evaluation | POST | `/api/ehs/drills/records/{param}/evaluation` | ehs |  |
| 39 | list_drill_problems | GET | `/api/ehs/drills/records/{param}/problems` | ehs |  |
| 40 | create_drill_problem | POST | `/api/ehs/drills/records/{param}/problems` | ehs |  |
| 41 | update_drill_problem | PUT | `/api/ehs/drills/records/{param}/problems/{param}` | ehs |  |
| 42 | get_drill_statistics | GET | `/api/ehs/drills/statistics` | ehs |  |
| 43 | list_drill_types | GET | `/api/ehs/drills/types` | ehs |  |
| 44 | ehs_list_plans_api_ehs_emergency-plans | GET | `/api/ehs/emergency-plans` | ehs |  |
| 45 | ehs_create_plan_api_ehs_emergency-plans | POST | `/api/ehs/emergency-plans` | ehs |  |
| 46 | list_plan_categories | GET | `/api/ehs/emergency-plans/categories` | ehs |  |
| 47 | ehs_get_plan_api_ehs_emergency-plans_{id} | GET | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 48 | ehs_update_plan_api_ehs_emergency-plans_{id} | PUT | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 49 | ehs_delete_plan_api_ehs_emergency-plans_{id} | DELETE | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 50 | approve_plan | POST | `/api/ehs/emergency-plans/{param}/approve` | ehs |  |
| 51 | submit_plan_approval | POST | `/api/ehs/emergency-plans/{param}/submit-approval` | ehs |  |
| 52 | list_plan_supplies | GET | `/api/ehs/emergency-plans/{param}/supplies` | ehs |  |
| 53 | add_plan_supply | POST | `/api/ehs/emergency-plans/{param}/supplies` | ehs |  |
| 54 | delete_plan_supply | DELETE | `/api/ehs/emergency-plans/{param}/supplies/{param}` | ehs |  |
| 55 | list_plan_versions | GET | `/api/ehs/emergency-plans/{param}/versions` | ehs |  |
| 56 | create_new_version | POST | `/api/ehs/emergency-plans/{param}/versions` | ehs |  |
| 57 | ehs_list_records_api_ehs_environment_records | GET | `/api/ehs/environment/records` | ehs | path exists in frontend but method not called |
| 58 | list_evaluations | GET | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 59 | create_evaluation | POST | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 60 | get_evaluation | GET | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 61 | update_evaluation | PUT | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 62 | delete_evaluation | DELETE | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 63 | list_incidents | GET | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 64 | create_incident | POST | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 65 | get_incident | GET | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 66 | update_incident | PUT | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 67 | delete_incident | DELETE | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 68 | list_monitor_records | GET | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 69 | create_monitor_record | POST | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 70 | list_monitor_types | GET | `/api/ehs/environmental-compliance/monitoring/types` | ehs |  |
| 71 | get_monitor_record | GET | `/api/ehs/environmental-compliance/monitoring/{param}` | ehs |  |
| 72 | delete_monitor_record | DELETE | `/api/ehs/environmental-compliance/monitoring/{param}` | ehs |  |
| 73 | list_permits | GET | `/api/ehs/environmental-compliance/permits` | ehs | path exists in frontend but method not called |
| 74 | list_regulations | GET | `/api/ehs/environmental-compliance/regulations` | ehs | path exists in frontend but method not called |
| 75 | list_regulation_categories | GET | `/api/ehs/environmental-compliance/regulations/categories` | ehs |  |
| 76 | get_compliance_statistics | GET | `/api/ehs/environmental-compliance/statistics` | ehs |  |
| 77 | list_materials | GET | `/api/ehs/hazardous-materials` | ehs | path exists in frontend but method not called |
| 78 | get_material_statistics | GET | `/api/ehs/hazardous-materials/statistics` | ehs |  |
| 79 | list_stock_records | GET | `/api/ehs/hazardous-materials/stock-records` | ehs |  |
| 80 | create_stock_in | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | ehs |  |
| 81 | create_stock_out | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | ehs |  |
| 82 | get_stock_record | GET | `/api/ehs/hazardous-materials/stock-records/{param}` | ehs |  |
| 83 | update_material_msds | PUT | `/api/ehs/hazardous-materials/{param}/msds` | ehs | path exists in frontend but method not called |
| 84 | list_material_stocks | GET | `/api/ehs/hazardous-materials/{param}/stocks` | ehs |  |
| 85 | list_control_measures | GET | `/api/ehs/hazards/{param}/controls` | ehs | path exists in frontend but method not called |
| 86 | ehs_create_record_api_ehs_health | POST | `/api/ehs/health` | ehs | path exists in frontend but method not called |
| 87 | list_hazards | GET | `/api/ehs/issues` | ehs | path exists in frontend but method not called |
| 88 | approve_hazard | POST | `/api/ehs/issues/{param}/approval/approve` | ehs |  |
| 89 | reject_hazard | POST | `/api/ehs/issues/{param}/approval/reject` | ehs |  |
| 90 | start_hazard_approval | POST | `/api/ehs/issues/{param}/approval/start` | ehs |  |
| 91 | list_disease_cases | GET | `/api/ehs/occupational-disease/cases` | ehs |  |
| 92 | create_disease_case | POST | `/api/ehs/occupational-disease/cases` | ehs |  |
| 93 | get_disease_case | GET | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 94 | update_disease_case | PUT | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 95 | delete_disease_case | DELETE | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 96 | list_detection_records | GET | `/api/ehs/occupational-disease/detections` | ehs |  |
| 97 | create_detection_record | POST | `/api/ehs/occupational-disease/detections` | ehs |  |
| 98 | get_detection_record | GET | `/api/ehs/occupational-disease/detections/{param}` | ehs |  |
| 99 | delete_detection_record | DELETE | `/api/ehs/occupational-disease/detections/{param}` | ehs |  |
| 100 | list_factor_types | GET | `/api/ehs/occupational-disease/factor-types` | ehs |  |
| 101 | list_hazard_factors | GET | `/api/ehs/occupational-disease/factors` | ehs |  |
| 102 | create_hazard_factor | POST | `/api/ehs/occupational-disease/factors` | ehs |  |
| 103 | get_hazard_factor | GET | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 104 | update_hazard_factor | PUT | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 105 | delete_hazard_factor | DELETE | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 106 | list_protection_measures | GET | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 107 | create_protection_measure | POST | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 108 | get_protection_measure | GET | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 109 | update_protection_measure | PUT | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 110 | delete_protection_measure | DELETE | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 111 | get_disease_statistics | GET | `/api/ehs/occupational-disease/statistics` | ehs |  |
| 112 | list_health_trainings | GET | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 113 | create_health_training | POST | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 114 | get_health_training | GET | `/api/ehs/occupational-disease/trainings/{param}` | ehs |  |
| 115 | delete_health_training | DELETE | `/api/ehs/occupational-disease/trainings/{param}` | ehs |  |
| 116 | list_abnormalities | GET | `/api/ehs/occupational-health/abnormalities` | ehs |  |
| 117 | update_abnormality | PUT | `/api/ehs/occupational-health/abnormalities/{param}` | ehs |  |
| 118 | get_health_archive | GET | `/api/ehs/occupational-health/archives/{param}` | ehs |  |
| 119 | list_contraindications | GET | `/api/ehs/occupational-health/contraindications` | ehs | path exists in frontend but method not called |
| 120 | list_exam_plans | GET | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 121 | create_exam_plan | POST | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 122 | get_exam_plan | GET | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 123 | update_exam_plan | PUT | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 124 | delete_exam_plan | DELETE | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 125 | list_exam_records | GET | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 126 | create_exam_record | POST | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 127 | get_exam_record | GET | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 128 | update_exam_record | PUT | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 129 | delete_exam_record | DELETE | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 130 | list_exam_types | GET | `/api/ehs/occupational-health/exam-types` | ehs |  |
| 131 | get_health_statistics | GET | `/api/ehs/occupational-health/statistics` | ehs |  |
| 132 | ehs_list_sync_records | GET | `/api/ehs/sync-records` | ehs |  |
| 133 | ehs_delete_sync_record | DELETE | `/api/ehs/sync-records/{param}` | ehs | path exists in frontend but method not called |
| 134 | ehs_retry_sync | POST | `/api/ehs/sync-records/{param}/retry` | ehs |  |
| 135 | sync_accident_to_lims | POST | `/api/ehs/sync/accident-to-lims` | ehs |  |
| 136 | update_sync_configs | PUT | `/api/ehs/sync/configs` | ehs | path exists in frontend but method not called |
| 137 | sync_hazard_to_qms | POST | `/api/ehs/sync/hazard-to-qms` | ehs |  |
| 138 | list_trainings | GET | `/api/ehs/training` | ehs |  |
| 139 | create_training | POST | `/api/ehs/training` | ehs |  |
| 140 | get_training | GET | `/api/ehs/training/{param}` | ehs |  |
| 141 | update_training | PUT | `/api/ehs/training/{param}` | ehs |  |
| 142 | delete_training | DELETE | `/api/ehs/training/{param}` | ehs |  |
| 143 | export_contacts | GET | `/api/erp/addressbook/export` | erp |  |
| 144 | list_sync_jobs | GET | `/api/erp/master-data/sync/jobs` | erp | path exists in frontend but method not called |
| 145 | list_sync_jobs_v2 | GET | `/api/erp/master-data/sync/v2/jobs` | erp | path exists in frontend but method not called |
| 146 | get_account_by_code | GET | `/api/finance/accounts/code/{param}` | finance |  |
| 147 | get_balance_sheet | GET | `/api/finance/balance-sheet/{param}` | finance |  |
| 148 | list_budgets | GET | `/api/finance/budgets` | finance |  |
| 149 | create_budget | POST | `/api/finance/budgets` | finance |  |
| 150 | get_budget | GET | `/api/finance/budgets/{param}` | finance |  |
| 151 | update_budget | PUT | `/api/finance/budgets/{param}` | finance |  |
| 152 | delete_budget | DELETE | `/api/finance/budgets/{param}` | finance |  |
| 153 | get_cash_flow | GET | `/api/finance/cash-flow/{param}` | finance |  |
| 154 | list_expenses | GET | `/api/finance/expenses` | finance |  |
| 155 | create_expense | POST | `/api/finance/expenses` | finance |  |
| 156 | get_expense | GET | `/api/finance/expenses/{param}` | finance |  |
| 157 | update_expense | PUT | `/api/finance/expenses/{param}` | finance |  |
| 158 | delete_expense | DELETE | `/api/finance/expenses/{param}` | finance |  |
| 159 | get_income_statement | GET | `/api/finance/income-statement/{param}` | finance |  |
| 160 | get_ledger | GET | `/api/finance/ledger` | finance |  |
| 161 | batch_create_payables_handler | POST | `/api/finance/payables/batch` | finance |  |
| 162 | batch_create_receivables_handler | POST | `/api/finance/receivables/batch` | finance |  |
| 163 | export_balance_sheet_report | GET | `/api/finance/reports/balance-sheet/export` | finance |  |
| 164 | export_cash_flow_report | GET | `/api/finance/reports/cash-flow/export` | finance |  |
| 165 | export_income_statement_report | GET | `/api/finance/reports/income-statement/export` | finance |  |
| 166 | get_trial_balance | GET | `/api/finance/trial-balance/{param}` | finance |  |
| 167 | get_generation_rule_handler | GET | `/api/finance/voucher-generation-rules/{param}` | finance | path exists in frontend but method not called |
| 168 | list_entries | GET | `/api/finance/voucher-templates/{param}/entries` | finance | path exists in frontend but method not called |
| 169 | get_entry | GET | `/api/finance/voucher-templates/{param}/entries/{param}` | finance | path exists in frontend but method not called |
| 170 | export_template | GET | `/api/finance/voucher-templates/{param}/export` | finance |  |
| 171 | export_vouchers | POST | `/api/finance/vouchers/export` | finance |  |
| 172 | unpost_voucher | POST | `/api/finance/vouchers/{param}/unpost` | finance |  |
| 173 | list_devices | GET | `/api/gis/devices` | gis |  |
| 174 | get_device | GET | `/api/gis/devices/{param}` | gis |  |
| 175 | list_locations | GET | `/api/gis/locations` | gis |  |
| 176 | create_location | POST | `/api/gis/locations/create` | gis |  |
| 177 | get_location | GET | `/api/gis/locations/{param}` | gis |  |
| 178 | list_maps | GET | `/api/gis/maps` | gis |  |
| 179 | create_map | POST | `/api/gis/maps/create` | gis |  |
| 180 | get_map | GET | `/api/gis/maps/{param}` | gis |  |
| 181 | update_map | PUT | `/api/gis/maps/{param}` | gis |  |
| 182 | delete_map | DELETE | `/api/gis/maps/{param}` | gis |  |
| 183 | list_mes_erp_sync_records | GET | `/api/integration/mes-erp/records` | integration |  |
| 184 | sync_erp_order_to_mes | POST | `/api/integration/mes-erp/sync/erp-to-mes` | integration |  |
| 185 | sync_mes_progress_to_erp | POST | `/api/integration/mes-erp/sync/mes-to-erp` | integration |  |
| 186 | get_mes_erp_sync_logs | GET | `/api/integration/mes-erp/{param}/logs` | integration |  |
| 187 | retry_mes_erp_sync | POST | `/api/integration/mes-erp/{param}/retry` | integration |  |
| 188 | list_mes_qms_sync_api | GET | `/api/integration/mes-qms` | integration |  |
| 189 | defect_handling_api | POST | `/api/integration/mes-qms/defect-handling` | integration |  |
| 190 | get_mes_qms_stats_api | GET | `/api/integration/mes-qms/stats` | integration |  |
| 191 | sync_quality_result_api | POST | `/api/integration/mes-qms/sync-result` | integration |  |
| 192 | sync_trace_chain_api | POST | `/api/integration/mes-qms/sync-trace` | integration |  |
| 193 | trigger_qms_inspection_api | POST | `/api/integration/mes-qms/trigger-inspection` | integration |  |
| 194 | get_mes_qms_sync_api | GET | `/api/integration/mes-qms/{param}` | integration |  |
| 195 | retry_mes_qms_sync_api | POST | `/api/integration/mes-qms/{param}/retry` | integration |  |
| 196 | get_pending | GET | `/api/integration/sync/pending` | integration |  |
| 197 | retry_failed | POST | `/api/integration/sync/retry-failed` | integration |  |
| 198 | integration_get_statistics | GET | `/api/integration/sync/statistics` | integration |  |
| 199 | create_task | POST | `/api/integration/sync/tasks` | integration |  |
| 200 | integration_get_task | GET | `/api/integration/sync/tasks/{param}` | integration |  |
| 201 | update_status | POST | `/api/integration/sync/tasks/{param}/status` | integration |  |
| 202 | trigger_scm_wms | POST | `/api/integration/sync/trigger/scm-to-wms` | integration |  |
| 203 | trigger_srm_scm | POST | `/api/integration/sync/trigger/srm-to-scm` | integration |  |
| 204 | trigger_wms_crm | POST | `/api/integration/sync/trigger/wms-to-crm` | integration |  |
| 205 | list_instruments | GET | `/api/lims/instruments` | lims |  |
| 206 | create_instrument | POST | `/api/lims/instruments` | lims |  |
| 207 | list_reagents | GET | `/api/lims/reagents` | lims |  |
| 208 | create_reagent | POST | `/api/lims/reagents` | lims |  |
| 209 | list_samples | GET | `/api/lims/samples` | lims |  |
| 210 | register_sample | POST | `/api/lims/samples` | lims |  |
| 211 | get_sample | GET | `/api/lims/samples/{param}` | lims |  |
| 212 | lims_list_tasks | GET | `/api/lims/tasks` | lims |  |
| 213 | lims_create_task | POST | `/api/lims/tasks` | lims |  |
| 214 | lims_get_task | GET | `/api/lims/tasks/{param}` | lims |  |
| 215 | get_designer_schema | GET | `/api/lowcode/designer/schema` | lowcode |  |
| 216 | generate_suggestions | POST | `/api/master/quality-v51/ai/suggest` | master-data |  |
| 217 | apply_auto_fix | POST | `/api/master/quality-v51/auto-fix/run` | master-data |  |
| 218 | list_quality_checks | GET | `/api/master/quality-v51/checks` | master-data |  |
| 219 | run_quality_check | POST | `/api/master/quality-v51/checks` | master-data |  |
| 220 | get_quality_dashboard | GET | `/api/master/quality-v51/dashboard` | master-data |  |
| 221 | list_quality_rules | GET | `/api/master/quality-v51/rules` | master-data |  |
| 222 | create_quality_rule | POST | `/api/master/quality-v51/rules` | master-data |  |
| 223 | get_quality_score | GET | `/api/master/quality-v51/score` | master-data |  |
| 224 | list_wip_transfers | GET | `/api/mes/wips/{param}/transfers` | mes |  |
| 225 | get_today_production_output | GET | `/api/mes/work-reports/today/output` | mes |  |
| 226 | get_all_tasks | GET | `/api/mobile/mobile-tasks` | mobile |  |
| 227 | mobile_create_task | POST | `/api/mobile/mobile-tasks` | mobile |  |
| 228 | mobile_get_task | GET | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 229 | update_task | PUT | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 230 | delete_task | DELETE | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 231 | get_all_patrol_records | GET | `/api/mobile/patrol-records` | mobile |  |
| 232 | create_patrol_record | POST | `/api/mobile/patrol-records` | mobile |  |
| 233 | get_patrol_record | GET | `/api/mobile/patrol-records/{param}` | mobile |  |
| 234 | scan_barcode | POST | `/api/mobile/scan/barcode` | mobile |  |
| 235 | get_dashboard_stats | GET | `/api/mobile/stats/dashboard` | mobile |  |
| 236 | list_alerts | GET | `/api/monitor/alerts` | monitor |  |
| 237 | acknowledge_alerts | POST | `/api/monitor/alerts/acknowledge` | monitor |  |
| 238 | resolve_alerts | POST | `/api/monitor/alerts/resolve` | monitor |  |
| 239 | get_alert_statistics | GET | `/api/monitor/alerts/statistics` | monitor |  |
| 240 | get_alert | GET | `/api/monitor/alerts/{param}` | monitor |  |
| 241 | update_alert | POST | `/api/monitor/alerts/{param}` | monitor |  |
| 242 | get_alert_history | GET | `/api/monitor/alerts/{param}/history` | monitor |  |
| 243 | get_alert_timeline | GET | `/api/monitor/alerts/{param}/timeline` | monitor |  |
| 244 | list_business_metrics | GET | `/api/monitor/business-metrics` | monitor |  |
| 245 | create_business_metric | POST | `/api/monitor/business-metrics` | monitor |  |
| 246 | get_kpi_dashboard | GET | `/api/monitor/business-metrics/kpi` | monitor |  |
| 247 | get_business_metric_summary | GET | `/api/monitor/business-metrics/summary` | monitor |  |
| 248 | get_business_metric_trend | GET | `/api/monitor/business-metrics/trend` | monitor |  |
| 249 | get_business_metric | GET | `/api/monitor/business-metrics/{param}` | monitor |  |
| 250 | update_business_metric | PUT | `/api/monitor/business-metrics/{param}` | monitor |  |
| 251 | delete_business_metric | DELETE | `/api/monitor/business-metrics/{param}` | monitor |  |
| 252 | get_api_performance | GET | `/api/monitor/performance/api` | monitor |  |
| 253 | export_performance_data | POST | `/api/monitor/performance/export` | monitor |  |
| 254 | get_service_performance | GET | `/api/monitor/performance/services` | monitor |  |
| 255 | get_slow_queries | GET | `/api/monitor/performance/slow-queries` | monitor |  |
| 256 | get_performance_summary | GET | `/api/monitor/performance/summary` | monitor |  |
| 257 | get_performance_trend | GET | `/api/monitor/performance/trend` | monitor |  |
| 258 | list_rules | GET | `/api/monitor/rules` | monitor |  |
| 259 | create_rule | POST | `/api/monitor/rules` | monitor |  |
| 260 | get_rule | GET | `/api/monitor/rules/{param}` | monitor |  |
| 261 | update_rule | PUT | `/api/monitor/rules/{param}` | monitor |  |
| 262 | delete_rule | DELETE | `/api/monitor/rules/{param}` | monitor |  |
| 263 | get_advanced_rule | GET | `/api/monitor/rules/{param}/advanced` | monitor |  |
| 264 | update_advanced_rule | PUT | `/api/monitor/rules/{param}/advanced` | monitor |  |
| 265 | disable_rule | POST | `/api/monitor/rules/{param}/disable` | monitor |  |
| 266 | enable_rule | POST | `/api/monitor/rules/{param}/enable` | monitor |  |
| 267 | get_escalation | GET | `/api/monitor/rules/{param}/escalation` | monitor |  |
| 268 | update_escalation | PUT | `/api/monitor/rules/{param}/escalation` | monitor |  |
| 269 | get_routing | GET | `/api/monitor/rules/{param}/routing` | monitor |  |
| 270 | update_routing | PUT | `/api/monitor/rules/{param}/routing` | monitor |  |
| 271 | get_scheduled_trigger | GET | `/api/monitor/rules/{param}/scheduled-trigger` | monitor |  |
| 272 | update_scheduled_trigger | PUT | `/api/monitor/rules/{param}/scheduled-trigger` | monitor |  |
| 273 | list_slos | GET | `/api/monitor/slos` | monitor |  |
| 274 | create_slo | POST | `/api/monitor/slos` | monitor |  |
| 275 | get_slo_budget | GET | `/api/monitor/slos/budget` | monitor |  |
| 276 | get_slo_summary | GET | `/api/monitor/slos/summary` | monitor |  |
| 277 | get_slo_trend | GET | `/api/monitor/slos/trend` | monitor |  |
| 278 | list_slo_violations | GET | `/api/monitor/slos/violations` | monitor |  |
| 279 | resolve_slo_violation | POST | `/api/monitor/slos/violations/{param}/resolve` | monitor |  |
| 280 | get_slo | GET | `/api/monitor/slos/{param}` | monitor |  |
| 281 | update_slo | PUT | `/api/monitor/slos/{param}` | monitor |  |
| 282 | delete_slo | DELETE | `/api/monitor/slos/{param}` | monitor |  |
| 283 | list_suppression_rules | GET | `/api/monitor/suppression` | monitor |  |
| 284 | create_suppression_rule | POST | `/api/monitor/suppression` | monitor |  |
| 285 | get_suppression_rule | GET | `/api/monitor/suppression/{param}` | monitor |  |
| 286 | update_suppression_rule | PUT | `/api/monitor/suppression/{param}` | monitor |  |
| 287 | delete_suppression_rule | DELETE | `/api/monitor/suppression/{param}` | monitor |  |
| 288 | monitor_list_templates | GET | `/api/monitor/templates` | monitor |  |
| 289 | monitor_create_template | POST | `/api/monitor/templates` | monitor |  |
| 290 | monitor_get_template | GET | `/api/monitor/templates/{param}` | monitor |  |
| 291 | monitor_update_template | PUT | `/api/monitor/templates/{param}` | monitor |  |
| 292 | monitor_delete_template | DELETE | `/api/monitor/templates/{param}` | monitor |  |
| 293 | list_thresholds | GET | `/api/monitor/thresholds` | monitor |  |
| 294 | create_threshold | POST | `/api/monitor/thresholds` | monitor |  |
| 295 | evaluate_thresholds | POST | `/api/monitor/thresholds/evaluate` | monitor |  |
| 296 | get_threshold | GET | `/api/monitor/thresholds/{param}` | monitor |  |
| 297 | update_threshold | PUT | `/api/monitor/thresholds/{param}` | monitor |  |
| 298 | delete_threshold | DELETE | `/api/monitor/thresholds/{param}` | monitor |  |
| 299 | pdm__home | GET | `/api/pdm` | pdm |  |
| 300 | approve_change_notice | POST | `/api/pdm/change-notices/{param}/approve` | pdm |  |
| 301 | reject_change_notice | POST | `/api/pdm/change-notices/{param}/reject` | pdm |  |
| 302 | submit_change_notice | POST | `/api/pdm/change-notices/{param}/submit` | pdm |  |
| 303 | list_pending_documents | GET | `/api/pdm/documents/pending-approval` | pdm |  |
| 304 | get_document_approval_history | GET | `/api/pdm/documents/{param}/approval-history` | pdm |  |
| 305 | start_document_approval | POST | `/api/pdm/documents/{param}/approve` | pdm |  |
| 306 | pdm_get_statistics | GET | `/api/pdm/statistics/{param}` | pdm |  |
| 307 | pdm_list_versions_api_pdm_versions | GET | `/api/pdm/versions` | pdm |  |
| 308 | pdm_create_version_api_pdm_versions | POST | `/api/pdm/versions` | pdm |  |
| 309 | pdm_get_version_api_pdm_versions_{id} | GET | `/api/pdm/versions/{param}` | pdm |  |
| 310 | pdm_update_version_api_pdm_versions_{id} | PUT | `/api/pdm/versions/{param}` | pdm |  |
| 311 | pdm_delete_version_api_pdm_versions_{id} | DELETE | `/api/pdm/versions/{param}` | pdm |  |
| 312 | list_workflow_instances | GET | `/api/pdm/workflow-instances` | pdm |  |
| 313 | get_workflow_instance | GET | `/api/pdm/workflow-instances/{param}` | pdm |  |
| 314 | advance_workflow | POST | `/api/pdm/workflow-instances/{param}/advance` | pdm |  |
| 315 | pdm_list_workflows | GET | `/api/pdm/workflows` | pdm |  |
| 316 | pdm_create_workflow | POST | `/api/pdm/workflows` | pdm |  |
| 317 | start_workflow | POST | `/api/pdm/workflows/start` | pdm |  |
| 318 | pdm_get_workflow | GET | `/api/pdm/workflows/{param}` | pdm |  |
| 319 | pdm_update_workflow | PUT | `/api/pdm/workflows/{param}` | pdm |  |
| 320 | pdm_delete_workflow | DELETE | `/api/pdm/workflows/{param}` | pdm |  |
| 321 | get_announcements | GET | `/api/portal/announcements` | portal |  |
| 322 | portal_create_announcement | POST | `/api/portal/announcements` | portal |  |
| 323 | portal_get_dashboard_stats | GET | `/api/portal/dashboard/stats` | portal |  |
| 324 | get_navigation_menu | GET | `/api/portal/navigation/menu` | portal |  |
| 325 | portal_get_notifications | GET | `/api/portal/notifications` | portal |  |
| 326 | list_services | GET | `/api/portal/services` | portal |  |
| 327 | get_todos | GET | `/api/portal/todos` | portal |  |
| 328 | add_todo | POST | `/api/portal/todos` | portal |  |
| 329 | get_user_info | GET | `/api/portal/user` | portal |  |
| 330 | qms_list_inspections | GET | `/api/qms/checks` | qms | path exists in frontend but method not called |
| 331 | list_issues | GET | `/api/qms/issues` | qms | path exists in frontend but method not called |
| 332 | list_standards | GET | `/api/qms/standards` | qms | path exists in frontend but method not called |
| 333 | reject_order | POST | `/api/scm/purchase-orders/{param}/reject` | scm |  |
| 334 | search_handler | GET | `/api/search` | search |  |
| 335 | list_sla_policies_handler | GET | `/api/ticket/sla-policies` | ticket |  |
| 336 | create_sla_policy_handler | POST | `/api/ticket/sla-policies` | ticket |  |
| 337 | list_tickets_handler | GET | `/api/ticket/tickets` | ticket |  |
| 338 | create_ticket_handler | POST | `/api/ticket/tickets` | ticket |  |
| 339 | get_stats_handler | GET | `/api/ticket/tickets/stats` | ticket |  |
| 340 | get_ticket_handler | GET | `/api/ticket/tickets/{param}` | ticket |  |
| 341 | update_ticket_handler | PUT | `/api/ticket/tickets/{param}` | ticket |  |
| 342 | delete_ticket_handler | DELETE | `/api/ticket/tickets/{param}` | ticket |  |
| 343 | list_comments_handler | GET | `/api/ticket/tickets/{param}/comments` | ticket |  |
| 344 | add_comment_handler | POST | `/api/ticket/tickets/{param}/comments` | ticket |  |
| 345 | wms_list_alerts | GET | `/api/wms/inventory-alerts` | wms |  |
| 346 | wms_get_alert | GET | `/api/wms/inventory-alerts/{param}` | wms |  |
| 347 | acknowledge_alert | POST | `/api/wms/inventory-alerts/{param}/acknowledge` | wms |  |
| 348 | rd_list_audit_logs | GET | `/api/rd/audit-logs` | rd |  |
| 349 | rd_list_projects | GET | `/api/rd/projects` | rd | path exists in frontend but method not called |
| 350 | export_projects | GET | `/api/rd/projects/export` | rd |  |
| 351 | unified-core_create_document | POST | `/api/core/doc/documents` | unified-core | path exists in frontend but method not called |
| 352 | unified-core_update_document | PUT | `/api/core/doc/documents/{param}` | unified-core | path exists in frontend but method not called |
| 353 | download_file | GET | `/api/core/file/download/{param}` | unified-core |  |
| 354 | list_files | GET | `/api/core/file/files` | unified-core |  |
| 355 | get_received_files | GET | `/api/core/file/files/received` | unified-core |  |
| 356 | search_files | GET | `/api/core/file/files/search` | unified-core |  |
| 357 | list_starred_files | GET | `/api/core/file/files/starred` | unified-core |  |
| 358 | update_file | PUT | `/api/core/file/files/{param}` | unified-core | path exists in frontend but method not called |
| 359 | copy_file | POST | `/api/core/file/files/{param}/copy` | unified-core |  |
| 360 | move_file | POST | `/api/core/file/files/{param}/move` | unified-core |  |
| 361 | set_file_permission | POST | `/api/core/file/files/{param}/permission` | unified-core |  |
| 362 | set_file_permissions | POST | `/api/core/file/files/{param}/permissions` | unified-core | path exists in frontend but method not called |
| 363 | get_file_shares | GET | `/api/core/file/files/{param}/shares` | unified-core |  |
| 364 | star_file | POST | `/api/core/file/files/{param}/star` | unified-core |  |
| 365 | unstar_file | POST | `/api/core/file/files/{param}/unstar` | unified-core |  |
| 366 | preview_file | GET | `/api/core/file/preview/{param}` | unified-core |  |
| 367 | delete_share | DELETE | `/api/core/file/shares/{param}` | unified-core |  |
| 368 | get_file_stats | GET | `/api/core/file/stats` | unified-core |  |
| 369 | get_thumbnail | GET | `/api/core/file/thumbnail/{param}` | unified-core |  |
| 370 | upload_multiple | POST | `/api/core/file/upload/multiple` | unified-core |  |
| 371 | list_pending_approvals | GET | `/api/core/flow/approvals/pending` | unified-core |  |
| 372 | approve_task | POST | `/api/core/flow/approvals/{param}/approve` | unified-core |  |
| 373 | reject_task | POST | `/api/core/flow/approvals/{param}/reject` | unified-core |  |
| 374 | approve_instance | POST | `/api/core/flow/instances/{param}/approve` | unified-core |  |
| 375 | reject_instance | POST | `/api/core/flow/instances/{param}/reject` | unified-core |  |
| 376 | start_instance | POST | `/api/core/flow/instances/{param}/start` | unified-core |  |
| 377 | list_workflows | GET | `/api/core/flow/workflows` | unified-core |  |
| 378 | create_workflow | POST | `/api/core/flow/workflows` | unified-core |  |
| 379 | get_workflow | GET | `/api/core/flow/workflows/{param}` | unified-core |  |
| 380 | update_workflow | PUT | `/api/core/flow/workflows/{param}` | unified-core |  |
| 381 | delete_workflow | DELETE | `/api/core/flow/workflows/{param}` | unified-core |  |
| 382 | publish_workflow | POST | `/api/core/flow/workflows/{param}/publish` | unified-core |  |
| 383 | unpublish_workflow | POST | `/api/core/flow/workflows/{param}/unpublish` | unified-core |  |
| 384 | login | POST | `/api/unified-core/iam/auth/login` | unified-core |  |
| 385 | register | POST | `/api/unified-core/iam/auth/register` | unified-core |  |
| 386 | list_users | GET | `/api/unified-core/users` | unified-core |  |
| 387 | create_user | POST | `/api/unified-core/users` | unified-core |  |

## 2. 未文档化前端 API（前端有调用，OpenAPI 无定义）

> 无发现。所有前端 API 调用均在 OpenAPI 中有定义。

## 3. 方法不匹配（路径匹配但 HTTP 方法不一致）

> 无发现。所有匹配路径的 HTTP 方法一致。

## 5. 方法论

### 数据源
- OpenAPI 规范: `docs/api/openapi-aggregated.json`
- 前端 API 调用: `apps/web/src/api/**/*.ts`

### 路径归一化规则
1. OpenAPI 路径缺少 `/api/` 前缀的自动补全（如 `/crm/customers` -> `/api/crm/customers`）
2. 前端调用通过服务名映射 URL 前缀（如 `apiClient.rd.get('/bugs')` -> `/api/rd/bugs`）
3. 模板字面量 `${id}` 转换为 OpenAPI 路径参数 `{id}`
4. 查询字符串 `?param=value` 在比较时被移除

### 匹配逻辑
- 路径 + HTTP 方法双重匹配
- 路径匹配但方法不匹配 -> 方法不匹配
- OpenAPI 有路径但前端无调用 -> 未使用后端 API
- 前端有调用但 OpenAPI 无路径 -> 未文档化前端 API

### CI 阻断规则
- `总不匹配数 >= 5` -> RED (阻断 CI)
- `0 < 总不匹配数 < 5` -> YELLOW (告警不阻断)
- `总不匹配数 = 0` -> GREEN
