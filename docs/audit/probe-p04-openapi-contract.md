# Probe P-04: OpenAPI 前后端契约一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| OpenAPI 端点总数 (method+path) | 3401 |
| 前端 API 调用总数 (去重前) | 2875 |
| 前端唯一路径数 | 1881 |
| 已匹配端点数 | 2946 |
| 未使用后端 API (OpenAPI 有/前端无) | 414 |
| 未使用后端 API — 已豁免 | 41 |
| 未文档化前端 API (前端有/OpenAPI 无) | 0 |
| 未文档化前端 API — 已豁免 | 11 |
| 方法不匹配数 | 0 |
| **总不匹配数** | **0** |
| CI 严重度 | GREEN |

## 1. 未使用后端 API（OpenAPI 有定义，前端未调用）

共 414 个端点：

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
| 147 | compat_get_api_finance_reports_balance_sheet_export | GET | `/api/finance/reports/balance-sheet/export` | finance |  |
| 148 | compat_get_api_finance_reports_cash_flow_export | GET | `/api/finance/reports/cash-flow/export` | finance |  |
| 149 | compat_get_api_finance_reports_consolidated_consolidation_id_export | GET | `/api/finance/reports/consolidated/{param}/export` | finance |  |
| 150 | compat_get_api_finance_reports_export | GET | `/api/finance/reports/export` | finance |  |
| 151 | compat_get_api_finance_reports_income_statement_export | GET | `/api/finance/reports/income-statement/export` | finance |  |
| 152 | compat_get_api_finance_vouchers_export | GET | `/api/finance/vouchers/export` | finance |  |
| 153 | get_balance_sheet | GET | `/api/finance/balance-sheet/{param}` | finance |  |
| 154 | list_budgets | GET | `/api/finance/budgets` | finance |  |
| 155 | create_budget | POST | `/api/finance/budgets` | finance |  |
| 156 | get_budget | GET | `/api/finance/budgets/{param}` | finance |  |
| 157 | update_budget | PUT | `/api/finance/budgets/{param}` | finance |  |
| 158 | delete_budget | DELETE | `/api/finance/budgets/{param}` | finance |  |
| 159 | get_cash_flow | GET | `/api/finance/cash-flow/{param}` | finance |  |
| 160 | list_expenses | GET | `/api/finance/expenses` | finance |  |
| 161 | create_expense | POST | `/api/finance/expenses` | finance |  |
| 162 | get_expense | GET | `/api/finance/expenses/{param}` | finance |  |
| 163 | update_expense | PUT | `/api/finance/expenses/{param}` | finance |  |
| 164 | delete_expense | DELETE | `/api/finance/expenses/{param}` | finance |  |
| 165 | get_income_statement | GET | `/api/finance/income-statement/{param}` | finance |  |
| 166 | get_ledger | GET | `/api/finance/ledger` | finance |  |
| 167 | batch_create_payables_handler | POST | `/api/finance/payables/batch` | finance |  |
| 168 | batch_create_receivables_handler | POST | `/api/finance/receivables/batch` | finance |  |
| 169 | export_balance_sheet_report | GET | `/api/finance/reports/balance-sheet/export` | finance |  |
| 170 | export_cash_flow_report | GET | `/api/finance/reports/cash-flow/export` | finance |  |
| 171 | export_income_statement_report | GET | `/api/finance/reports/income-statement/export` | finance |  |
| 172 | get_trial_balance | GET | `/api/finance/trial-balance/{param}` | finance |  |
| 173 | get_generation_rule_handler | GET | `/api/finance/voucher-generation-rules/{param}` | finance | path exists in frontend but method not called |
| 174 | list_entries | GET | `/api/finance/voucher-templates/{param}/entries` | finance | path exists in frontend but method not called |
| 175 | get_entry | GET | `/api/finance/voucher-templates/{param}/entries/{param}` | finance | path exists in frontend but method not called |
| 176 | export_template | GET | `/api/finance/voucher-templates/{param}/export` | finance |  |
| 177 | export_vouchers | POST | `/api/finance/vouchers/export` | finance |  |
| 178 | unpost_voucher | POST | `/api/finance/vouchers/{param}/unpost` | finance |  |
| 179 | list_pending_approvals | GET | `/api/core/flow/approvals/pending` | flow |  |
| 180 | approve_task | POST | `/api/core/flow/approvals/{param}/approve` | flow |  |
| 181 | reject_task | POST | `/api/core/flow/approvals/{param}/reject` | flow |  |
| 182 | approve_instance | POST | `/api/core/flow/instances/{param}/approve` | flow |  |
| 183 | reject_instance | POST | `/api/core/flow/instances/{param}/reject` | flow |  |
| 184 | start_instance | POST | `/api/core/flow/instances/{param}/start` | flow |  |
| 185 | list_workflows | GET | `/api/core/flow/workflows` | flow |  |
| 186 | create_workflow | POST | `/api/core/flow/workflows` | flow |  |
| 187 | get_workflow | GET | `/api/core/flow/workflows/{param}` | flow |  |
| 188 | update_workflow | PUT | `/api/core/flow/workflows/{param}` | flow |  |
| 189 | delete_workflow | DELETE | `/api/core/flow/workflows/{param}` | flow |  |
| 190 | publish_workflow | POST | `/api/core/flow/workflows/{param}/publish` | flow |  |
| 191 | unpublish_workflow | POST | `/api/core/flow/workflows/{param}/unpublish` | flow |  |
| 192 | list_devices | GET | `/api/gis/devices` | gis |  |
| 193 | get_device | GET | `/api/gis/devices/{param}` | gis |  |
| 194 | list_locations | GET | `/api/gis/locations` | gis |  |
| 195 | create_location | POST | `/api/gis/locations/create` | gis |  |
| 196 | get_location | GET | `/api/gis/locations/{param}` | gis |  |
| 197 | list_maps | GET | `/api/gis/maps` | gis |  |
| 198 | create_map | POST | `/api/gis/maps/create` | gis |  |
| 199 | get_map | GET | `/api/gis/maps/{param}` | gis |  |
| 200 | update_map | PUT | `/api/gis/maps/{param}` | gis |  |
| 201 | delete_map | DELETE | `/api/gis/maps/{param}` | gis |  |
| 202 | compat_get_api_hrm_performance_goals | GET | `/api/hrm/performance-goals` | hrm |  |
| 203 | compat_post_api_hrm_performance_goals | POST | `/api/hrm/performance-goals` | hrm |  |
| 204 | compat_get_api_hrm_performance_goals_id | GET | `/api/hrm/performance-goals/{param}` | hrm |  |
| 205 | compat_put_api_hrm_performance_goals_id | PUT | `/api/hrm/performance-goals/{param}` | hrm |  |
| 206 | compat_delete_api_hrm_performance_goals_id | DELETE | `/api/hrm/performance-goals/{param}` | hrm |  |
| 207 | compat_post_api_hrm_performance_reviews | POST | `/api/hrm/performance-reviews` | hrm | path exists in frontend but method not called |
| 208 | compat_get_api_hrm_performance_reviews_id | GET | `/api/hrm/performance-reviews/{param}` | hrm |  |
| 209 | compat_put_api_hrm_performance_reviews_id | PUT | `/api/hrm/performance-reviews/{param}` | hrm |  |
| 210 | compat_delete_api_hrm_performance_reviews_id | DELETE | `/api/hrm/performance-reviews/{param}` | hrm |  |
| 211 | compat_get_api_hrm_positions | GET | `/api/hrm/positions` | hrm |  |
| 212 | compat_post_api_hrm_positions | POST | `/api/hrm/positions` | hrm |  |
| 213 | compat_get_api_hrm_positions_id | GET | `/api/hrm/positions/{param}` | hrm |  |
| 214 | compat_put_api_hrm_positions_id | PUT | `/api/hrm/positions/{param}` | hrm |  |
| 215 | compat_delete_api_hrm_positions_id | DELETE | `/api/hrm/positions/{param}` | hrm |  |
| 216 | compat_get_api_hrm_roles | GET | `/api/hrm/roles` | hrm |  |
| 217 | compat_post_api_hrm_roles | POST | `/api/hrm/roles` | hrm |  |
| 218 | compat_get_api_hrm_roles_id | GET | `/api/hrm/roles/{param}` | hrm |  |
| 219 | compat_put_api_hrm_roles_id | PUT | `/api/hrm/roles/{param}` | hrm |  |
| 220 | compat_delete_api_hrm_roles_id | DELETE | `/api/hrm/roles/{param}` | hrm |  |
| 221 | compat_get_api_integration_external_erp_export_mappings | GET | `/api/integration/external-erp/export/mappings` | integration |  |
| 222 | compat_get_api_integration_external_erp_export_sync_logs | GET | `/api/integration/external-erp/export/sync-logs` | integration |  |
| 223 | list_mes_erp_sync_records | GET | `/api/integration/mes-erp/records` | integration |  |
| 224 | sync_erp_order_to_mes | POST | `/api/integration/mes-erp/sync/erp-to-mes` | integration |  |
| 225 | sync_mes_progress_to_erp | POST | `/api/integration/mes-erp/sync/mes-to-erp` | integration |  |
| 226 | get_mes_erp_sync_logs | GET | `/api/integration/mes-erp/{param}/logs` | integration |  |
| 227 | retry_mes_erp_sync | POST | `/api/integration/mes-erp/{param}/retry` | integration |  |
| 228 | list_mes_qms_sync_api | GET | `/api/integration/mes-qms` | integration |  |
| 229 | defect_handling_api | POST | `/api/integration/mes-qms/defect-handling` | integration |  |
| 230 | get_mes_qms_stats_api | GET | `/api/integration/mes-qms/stats` | integration |  |
| 231 | sync_quality_result_api | POST | `/api/integration/mes-qms/sync-result` | integration |  |
| 232 | sync_trace_chain_api | POST | `/api/integration/mes-qms/sync-trace` | integration |  |
| 233 | trigger_qms_inspection_api | POST | `/api/integration/mes-qms/trigger-inspection` | integration |  |
| 234 | get_mes_qms_sync_api | GET | `/api/integration/mes-qms/{param}` | integration |  |
| 235 | retry_mes_qms_sync_api | POST | `/api/integration/mes-qms/{param}/retry` | integration |  |
| 236 | get_pending | GET | `/api/integration/sync/pending` | integration |  |
| 237 | retry_failed | POST | `/api/integration/sync/retry-failed` | integration |  |
| 238 | integration_get_statistics | GET | `/api/integration/sync/statistics` | integration |  |
| 239 | create_task | POST | `/api/integration/sync/tasks` | integration |  |
| 240 | integration_get_task | GET | `/api/integration/sync/tasks/{param}` | integration |  |
| 241 | update_status | POST | `/api/integration/sync/tasks/{param}/status` | integration |  |
| 242 | trigger_scm_wms | POST | `/api/integration/sync/trigger/scm-to-wms` | integration |  |
| 243 | trigger_srm_scm | POST | `/api/integration/sync/trigger/srm-to-scm` | integration |  |
| 244 | trigger_wms_crm | POST | `/api/integration/sync/trigger/wms-to-crm` | integration |  |
| 245 | compat_post_api_lims_endpoint_id | POST | `/api/lims/{param}/{param}` | lims | path exists in frontend but method not called |
| 246 | list_instruments | GET | `/api/lims/instruments` | lims |  |
| 247 | create_instrument | POST | `/api/lims/instruments` | lims |  |
| 248 | list_reagents | GET | `/api/lims/reagents` | lims |  |
| 249 | create_reagent | POST | `/api/lims/reagents` | lims |  |
| 250 | list_samples | GET | `/api/lims/samples` | lims |  |
| 251 | register_sample | POST | `/api/lims/samples` | lims |  |
| 252 | get_sample | GET | `/api/lims/samples/{param}` | lims |  |
| 253 | lims_list_tasks | GET | `/api/lims/tasks` | lims |  |
| 254 | lims_create_task | POST | `/api/lims/tasks` | lims |  |
| 255 | lims_get_task | GET | `/api/lims/tasks/{param}` | lims |  |
| 256 | get_designer_schema | GET | `/api/lowcode/designer/schema` | lowcode |  |
| 257 | generate_suggestions | POST | `/api/master/quality-v51/ai/suggest` | master-data |  |
| 258 | apply_auto_fix | POST | `/api/master/quality-v51/auto-fix/run` | master-data |  |
| 259 | list_quality_checks | GET | `/api/master/quality-v51/checks` | master-data |  |
| 260 | run_quality_check | POST | `/api/master/quality-v51/checks` | master-data |  |
| 261 | get_quality_dashboard | GET | `/api/master/quality-v51/dashboard` | master-data |  |
| 262 | list_quality_rules | GET | `/api/master/quality-v51/rules` | master-data |  |
| 263 | create_quality_rule | POST | `/api/master/quality-v51/rules` | master-data |  |
| 264 | get_quality_score | GET | `/api/master/quality-v51/score` | master-data |  |
| 265 | list_wip_transfers | GET | `/api/mes/wips/{param}/transfers` | mes |  |
| 266 | get_today_production_output | GET | `/api/mes/work-reports/today/output` | mes |  |
| 267 | get_all_tasks | GET | `/api/mobile/mobile-tasks` | mobile |  |
| 268 | mobile_create_task | POST | `/api/mobile/mobile-tasks` | mobile |  |
| 269 | mobile_get_task | GET | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 270 | update_task | PUT | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 271 | delete_task | DELETE | `/api/mobile/mobile-tasks/{param}` | mobile |  |
| 272 | get_all_patrol_records | GET | `/api/mobile/patrol-records` | mobile |  |
| 273 | create_patrol_record | POST | `/api/mobile/patrol-records` | mobile |  |
| 274 | get_patrol_record | GET | `/api/mobile/patrol-records/{param}` | mobile |  |
| 275 | scan_barcode | POST | `/api/mobile/scan/barcode` | mobile |  |
| 276 | get_dashboard_stats | GET | `/api/mobile/stats/dashboard` | mobile |  |
| 277 | list_alerts | GET | `/api/monitor/alerts` | monitor |  |
| 278 | acknowledge_alerts | POST | `/api/monitor/alerts/acknowledge` | monitor |  |
| 279 | resolve_alerts | POST | `/api/monitor/alerts/resolve` | monitor |  |
| 280 | get_alert_statistics | GET | `/api/monitor/alerts/statistics` | monitor |  |
| 281 | get_alert | GET | `/api/monitor/alerts/{param}` | monitor |  |
| 282 | update_alert | POST | `/api/monitor/alerts/{param}` | monitor |  |
| 283 | get_alert_history | GET | `/api/monitor/alerts/{param}/history` | monitor |  |
| 284 | get_alert_timeline | GET | `/api/monitor/alerts/{param}/timeline` | monitor |  |
| 285 | list_business_metrics | GET | `/api/monitor/business-metrics` | monitor |  |
| 286 | create_business_metric | POST | `/api/monitor/business-metrics` | monitor |  |
| 287 | get_kpi_dashboard | GET | `/api/monitor/business-metrics/kpi` | monitor |  |
| 288 | get_business_metric_summary | GET | `/api/monitor/business-metrics/summary` | monitor |  |
| 289 | get_business_metric_trend | GET | `/api/monitor/business-metrics/trend` | monitor |  |
| 290 | get_business_metric | GET | `/api/monitor/business-metrics/{param}` | monitor |  |
| 291 | update_business_metric | PUT | `/api/monitor/business-metrics/{param}` | monitor |  |
| 292 | delete_business_metric | DELETE | `/api/monitor/business-metrics/{param}` | monitor |  |
| 293 | get_api_performance | GET | `/api/monitor/performance/api` | monitor |  |
| 294 | export_performance_data | POST | `/api/monitor/performance/export` | monitor |  |
| 295 | get_service_performance | GET | `/api/monitor/performance/services` | monitor |  |
| 296 | get_slow_queries | GET | `/api/monitor/performance/slow-queries` | monitor |  |
| 297 | get_performance_summary | GET | `/api/monitor/performance/summary` | monitor |  |
| 298 | get_performance_trend | GET | `/api/monitor/performance/trend` | monitor |  |
| 299 | list_rules | GET | `/api/monitor/rules` | monitor |  |
| 300 | create_rule | POST | `/api/monitor/rules` | monitor |  |
| 301 | get_rule | GET | `/api/monitor/rules/{param}` | monitor |  |
| 302 | update_rule | PUT | `/api/monitor/rules/{param}` | monitor |  |
| 303 | delete_rule | DELETE | `/api/monitor/rules/{param}` | monitor |  |
| 304 | get_advanced_rule | GET | `/api/monitor/rules/{param}/advanced` | monitor |  |
| 305 | update_advanced_rule | PUT | `/api/monitor/rules/{param}/advanced` | monitor |  |
| 306 | disable_rule | POST | `/api/monitor/rules/{param}/disable` | monitor |  |
| 307 | enable_rule | POST | `/api/monitor/rules/{param}/enable` | monitor |  |
| 308 | get_escalation | GET | `/api/monitor/rules/{param}/escalation` | monitor |  |
| 309 | update_escalation | PUT | `/api/monitor/rules/{param}/escalation` | monitor |  |
| 310 | get_routing | GET | `/api/monitor/rules/{param}/routing` | monitor |  |
| 311 | update_routing | PUT | `/api/monitor/rules/{param}/routing` | monitor |  |
| 312 | get_scheduled_trigger | GET | `/api/monitor/rules/{param}/scheduled-trigger` | monitor |  |
| 313 | update_scheduled_trigger | PUT | `/api/monitor/rules/{param}/scheduled-trigger` | monitor |  |
| 314 | list_slos | GET | `/api/monitor/slos` | monitor |  |
| 315 | create_slo | POST | `/api/monitor/slos` | monitor |  |
| 316 | get_slo_budget | GET | `/api/monitor/slos/budget` | monitor |  |
| 317 | get_slo_summary | GET | `/api/monitor/slos/summary` | monitor |  |
| 318 | get_slo_trend | GET | `/api/monitor/slos/trend` | monitor |  |
| 319 | list_slo_violations | GET | `/api/monitor/slos/violations` | monitor |  |
| 320 | resolve_slo_violation | POST | `/api/monitor/slos/violations/{param}/resolve` | monitor |  |
| 321 | get_slo | GET | `/api/monitor/slos/{param}` | monitor |  |
| 322 | update_slo | PUT | `/api/monitor/slos/{param}` | monitor |  |
| 323 | delete_slo | DELETE | `/api/monitor/slos/{param}` | monitor |  |
| 324 | list_suppression_rules | GET | `/api/monitor/suppression` | monitor |  |
| 325 | create_suppression_rule | POST | `/api/monitor/suppression` | monitor |  |
| 326 | get_suppression_rule | GET | `/api/monitor/suppression/{param}` | monitor |  |
| 327 | update_suppression_rule | PUT | `/api/monitor/suppression/{param}` | monitor |  |
| 328 | delete_suppression_rule | DELETE | `/api/monitor/suppression/{param}` | monitor |  |
| 329 | monitor_list_templates | GET | `/api/monitor/templates` | monitor |  |
| 330 | monitor_create_template | POST | `/api/monitor/templates` | monitor |  |
| 331 | monitor_get_template | GET | `/api/monitor/templates/{param}` | monitor |  |
| 332 | monitor_update_template | PUT | `/api/monitor/templates/{param}` | monitor |  |
| 333 | monitor_delete_template | DELETE | `/api/monitor/templates/{param}` | monitor |  |
| 334 | list_thresholds | GET | `/api/monitor/thresholds` | monitor |  |
| 335 | create_threshold | POST | `/api/monitor/thresholds` | monitor |  |
| 336 | evaluate_thresholds | POST | `/api/monitor/thresholds/evaluate` | monitor |  |
| 337 | get_threshold | GET | `/api/monitor/thresholds/{param}` | monitor |  |
| 338 | update_threshold | PUT | `/api/monitor/thresholds/{param}` | monitor |  |
| 339 | delete_threshold | DELETE | `/api/monitor/thresholds/{param}` | monitor |  |
| 340 | pdm__home | GET | `/api/pdm` | pdm |  |
| 341 | approve_change_notice | POST | `/api/pdm/change-notices/{param}/approve` | pdm |  |
| 342 | reject_change_notice | POST | `/api/pdm/change-notices/{param}/reject` | pdm |  |
| 343 | submit_change_notice | POST | `/api/pdm/change-notices/{param}/submit` | pdm |  |
| 344 | list_pending_documents | GET | `/api/pdm/documents/pending-approval` | pdm |  |
| 345 | get_document_approval_history | GET | `/api/pdm/documents/{param}/approval-history` | pdm |  |
| 346 | start_document_approval | POST | `/api/pdm/documents/{param}/approve` | pdm |  |
| 347 | pdm_get_statistics | GET | `/api/pdm/statistics/{param}` | pdm |  |
| 348 | pdm_list_versions_api_pdm_versions | GET | `/api/pdm/versions` | pdm |  |
| 349 | pdm_create_version_api_pdm_versions | POST | `/api/pdm/versions` | pdm |  |
| 350 | pdm_get_version_api_pdm_versions_{id} | GET | `/api/pdm/versions/{param}` | pdm |  |
| 351 | pdm_update_version_api_pdm_versions_{id} | PUT | `/api/pdm/versions/{param}` | pdm |  |
| 352 | pdm_delete_version_api_pdm_versions_{id} | DELETE | `/api/pdm/versions/{param}` | pdm |  |
| 353 | list_workflow_instances | GET | `/api/pdm/workflow-instances` | pdm |  |
| 354 | get_workflow_instance | GET | `/api/pdm/workflow-instances/{param}` | pdm |  |
| 355 | advance_workflow | POST | `/api/pdm/workflow-instances/{param}/advance` | pdm |  |
| 356 | pdm_list_workflows | GET | `/api/pdm/workflows` | pdm |  |
| 357 | pdm_create_workflow | POST | `/api/pdm/workflows` | pdm |  |
| 358 | start_workflow | POST | `/api/pdm/workflows/start` | pdm |  |
| 359 | pdm_get_workflow | GET | `/api/pdm/workflows/{param}` | pdm |  |
| 360 | pdm_update_workflow | PUT | `/api/pdm/workflows/{param}` | pdm |  |
| 361 | pdm_delete_workflow | DELETE | `/api/pdm/workflows/{param}` | pdm |  |
| 362 | get_announcements | GET | `/api/portal/announcements` | portal |  |
| 363 | portal_create_announcement | POST | `/api/portal/announcements` | portal |  |
| 364 | portal_get_dashboard_stats | GET | `/api/portal/dashboard/stats` | portal |  |
| 365 | get_navigation_menu | GET | `/api/portal/navigation/menu` | portal |  |
| 366 | portal_get_notifications | GET | `/api/portal/notifications` | portal |  |
| 367 | list_services | GET | `/api/portal/services` | portal |  |
| 368 | get_todos | GET | `/api/portal/todos` | portal |  |
| 369 | add_todo | POST | `/api/portal/todos` | portal |  |
| 370 | get_user_info | GET | `/api/portal/user` | portal |  |
| 371 | qms_list_inspections | GET | `/api/qms/checks` | qms | path exists in frontend but method not called |
| 372 | list_issues | GET | `/api/qms/issues` | qms | path exists in frontend but method not called |
| 373 | list_standards | GET | `/api/qms/standards` | qms | path exists in frontend but method not called |
| 374 | rd_list_audit_logs | GET | `/api/rd/audit-logs` | rd |  |
| 375 | rd_list_projects | GET | `/api/rd/projects` | rd | path exists in frontend but method not called |
| 376 | reject_order | POST | `/api/scm/purchase-orders/{param}/reject` | scm |  |
| 377 | search_handler | GET | `/api/search` | search |  |
| 378 | list_sla_policies_handler | GET | `/api/ticket/sla-policies` | ticket |  |
| 379 | create_sla_policy_handler | POST | `/api/ticket/sla-policies` | ticket |  |
| 380 | list_tickets_handler | GET | `/api/ticket/tickets` | ticket |  |
| 381 | create_ticket_handler | POST | `/api/ticket/tickets` | ticket |  |
| 382 | get_stats_handler | GET | `/api/ticket/tickets/stats` | ticket |  |
| 383 | get_ticket_handler | GET | `/api/ticket/tickets/{param}` | ticket |  |
| 384 | update_ticket_handler | PUT | `/api/ticket/tickets/{param}` | ticket |  |
| 385 | delete_ticket_handler | DELETE | `/api/ticket/tickets/{param}` | ticket |  |
| 386 | list_comments_handler | GET | `/api/ticket/tickets/{param}/comments` | ticket |  |
| 387 | add_comment_handler | POST | `/api/ticket/tickets/{param}/comments` | ticket |  |
| 388 | unified-core_create_document | POST | `/api/core/doc/documents` | unified-core | path exists in frontend but method not called |
| 389 | unified-core_update_document | PUT | `/api/core/doc/documents/{param}` | unified-core | path exists in frontend but method not called |
| 390 | download_file | GET | `/api/core/file/download/{param}` | unified-core |  |
| 391 | list_files | GET | `/api/core/file/files` | unified-core |  |
| 392 | get_received_files | GET | `/api/core/file/files/received` | unified-core |  |
| 393 | search_files | GET | `/api/core/file/files/search` | unified-core |  |
| 394 | list_starred_files | GET | `/api/core/file/files/starred` | unified-core |  |
| 395 | update_file | PUT | `/api/core/file/files/{param}` | unified-core | path exists in frontend but method not called |
| 396 | copy_file | POST | `/api/core/file/files/{param}/copy` | unified-core |  |
| 397 | move_file | POST | `/api/core/file/files/{param}/move` | unified-core |  |
| 398 | set_file_permission | POST | `/api/core/file/files/{param}/permission` | unified-core |  |
| 399 | set_file_permissions | POST | `/api/core/file/files/{param}/permissions` | unified-core | path exists in frontend but method not called |
| 400 | get_file_shares | GET | `/api/core/file/files/{param}/shares` | unified-core |  |
| 401 | star_file | POST | `/api/core/file/files/{param}/star` | unified-core |  |
| 402 | unstar_file | POST | `/api/core/file/files/{param}/unstar` | unified-core |  |
| 403 | preview_file | GET | `/api/core/file/preview/{param}` | unified-core |  |
| 404 | delete_share | DELETE | `/api/core/file/shares/{param}` | unified-core |  |
| 405 | get_file_stats | GET | `/api/core/file/stats` | unified-core |  |
| 406 | get_thumbnail | GET | `/api/core/file/thumbnail/{param}` | unified-core |  |
| 407 | upload_multiple | POST | `/api/core/file/upload/multiple` | unified-core |  |
| 408 | login | POST | `/api/unified-core/iam/auth/login` | unified-core |  |
| 409 | register | POST | `/api/unified-core/iam/auth/register` | unified-core |  |
| 410 | list_users | GET | `/api/unified-core/users` | unified-core |  |
| 411 | create_user | POST | `/api/unified-core/users` | unified-core |  |
| 412 | wms_list_alerts | GET | `/api/wms/inventory-alerts` | wms |  |
| 413 | wms_get_alert | GET | `/api/wms/inventory-alerts/{param}` | wms |  |
| 414 | acknowledge_alert | POST | `/api/wms/inventory-alerts/{param}/acknowledge` | wms |  |

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
