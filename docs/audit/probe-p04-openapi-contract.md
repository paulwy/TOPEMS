# Probe P-04: OpenAPI 前后端契约一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| OpenAPI 端点总数 (method+path) | 740 |
| 前端 API 调用总数 (去重前) | 2875 |
| 前端唯一路径数 | 1881 |
| 已匹配端点数 | 499 |
| 未使用后端 API (OpenAPI 有/前端无) | 237 |
| 未使用后端 API — 已豁免 | 4 |
| 未文档化前端 API (前端有/OpenAPI 无) | 2318 |
| 未文档化前端 API — 已豁免 | 18 |
| 方法不匹配数 | 2 |
| **总不匹配数** | **2320** |
| CI 严重度 | RED (mismatch >= 5) |

## 1. 未使用后端 API（OpenAPI 有定义，前端未调用）

共 237 个端点：

| # | operationId | 方法 | 路径 | Tag | 备注 |
|---|-------------|------|------|-----|------|
| 1 | list_analyses | GET | `/api/bi/analysis` | bi |  |
| 2 | create_analysis | POST | `/api/bi/analysis` | bi |  |
| 3 | get_analysis | GET | `/api/bi/analysis/{param}` | bi |  |
| 4 | execute_analysis | POST | `/api/bi/analysis/{param}/execute` | bi |  |
| 5 | list_plans | GET | `/api/ehs/checks/plans` | ehs | path exists in frontend but method not called |
| 6 | list_plan_items | GET | `/api/ehs/checks/plans/{param}/items` | ehs | path exists in frontend but method not called |
| 7 | list_records | GET | `/api/ehs/checks/records` | ehs | path exists in frontend but method not called |
| 8 | list_drill_plans | GET | `/api/ehs/drills/plans` | ehs |  |
| 9 | create_drill_plan | POST | `/api/ehs/drills/plans` | ehs |  |
| 10 | get_drill_plan | GET | `/api/ehs/drills/plans/{param}` | ehs |  |
| 11 | update_drill_plan | PUT | `/api/ehs/drills/plans/{param}` | ehs |  |
| 12 | delete_drill_plan | DELETE | `/api/ehs/drills/plans/{param}` | ehs |  |
| 13 | list_drill_records | GET | `/api/ehs/drills/records` | ehs |  |
| 14 | create_drill_record | POST | `/api/ehs/drills/records` | ehs |  |
| 15 | get_drill_record | GET | `/api/ehs/drills/records/{param}` | ehs |  |
| 16 | update_drill_record | PUT | `/api/ehs/drills/records/{param}` | ehs |  |
| 17 | delete_drill_record | DELETE | `/api/ehs/drills/records/{param}` | ehs |  |
| 18 | create_drill_evaluation | POST | `/api/ehs/drills/records/{param}/evaluation` | ehs |  |
| 19 | list_drill_problems | GET | `/api/ehs/drills/records/{param}/problems` | ehs |  |
| 20 | create_drill_problem | POST | `/api/ehs/drills/records/{param}/problems` | ehs |  |
| 21 | update_drill_problem | PUT | `/api/ehs/drills/records/{param}/problems/{param}` | ehs |  |
| 22 | get_drill_statistics | GET | `/api/ehs/drills/statistics` | ehs |  |
| 23 | list_drill_types | GET | `/api/ehs/drills/types` | ehs |  |
| 24 | ehs_list_plans_api_ehs_emergency-plans | GET | `/api/ehs/emergency-plans` | ehs |  |
| 25 | ehs_create_plan_api_ehs_emergency-plans | POST | `/api/ehs/emergency-plans` | ehs |  |
| 26 | list_plan_categories | GET | `/api/ehs/emergency-plans/categories` | ehs |  |
| 27 | ehs_get_plan_api_ehs_emergency-plans_{id} | GET | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 28 | ehs_update_plan_api_ehs_emergency-plans_{id} | PUT | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 29 | ehs_delete_plan_api_ehs_emergency-plans_{id} | DELETE | `/api/ehs/emergency-plans/{param}` | ehs |  |
| 30 | approve_plan | POST | `/api/ehs/emergency-plans/{param}/approve` | ehs |  |
| 31 | submit_plan_approval | POST | `/api/ehs/emergency-plans/{param}/submit-approval` | ehs |  |
| 32 | list_plan_supplies | GET | `/api/ehs/emergency-plans/{param}/supplies` | ehs |  |
| 33 | add_plan_supply | POST | `/api/ehs/emergency-plans/{param}/supplies` | ehs |  |
| 34 | delete_plan_supply | DELETE | `/api/ehs/emergency-plans/{param}/supplies/{param}` | ehs |  |
| 35 | list_plan_versions | GET | `/api/ehs/emergency-plans/{param}/versions` | ehs |  |
| 36 | create_new_version | POST | `/api/ehs/emergency-plans/{param}/versions` | ehs |  |
| 37 | ehs_list_records_api_ehs_environment_records | GET | `/api/ehs/environment/records` | ehs | path exists in frontend but method not called |
| 38 | list_evaluations | GET | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 39 | create_evaluation | POST | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 40 | get_evaluation | GET | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 41 | update_evaluation | PUT | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 42 | delete_evaluation | DELETE | `/api/ehs/environmental-compliance/evaluations/{param}` | ehs |  |
| 43 | list_incidents | GET | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 44 | create_incident | POST | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 45 | get_incident | GET | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 46 | update_incident | PUT | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 47 | delete_incident | DELETE | `/api/ehs/environmental-compliance/incidents/{param}` | ehs |  |
| 48 | list_monitor_records | GET | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 49 | create_monitor_record | POST | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 50 | list_monitor_types | GET | `/api/ehs/environmental-compliance/monitoring/types` | ehs |  |
| 51 | get_monitor_record | GET | `/api/ehs/environmental-compliance/monitoring/{param}` | ehs |  |
| 52 | delete_monitor_record | DELETE | `/api/ehs/environmental-compliance/monitoring/{param}` | ehs |  |
| 53 | list_permits | GET | `/api/ehs/environmental-compliance/permits` | ehs | path exists in frontend but method not called |
| 54 | list_regulations | GET | `/api/ehs/environmental-compliance/regulations` | ehs | path exists in frontend but method not called |
| 55 | list_regulation_categories | GET | `/api/ehs/environmental-compliance/regulations/categories` | ehs |  |
| 56 | get_compliance_statistics | GET | `/api/ehs/environmental-compliance/statistics` | ehs |  |
| 57 | list_materials | GET | `/api/ehs/hazardous-materials` | ehs | path exists in frontend but method not called |
| 58 | get_material_statistics | GET | `/api/ehs/hazardous-materials/statistics` | ehs |  |
| 59 | list_stock_records | GET | `/api/ehs/hazardous-materials/stock-records` | ehs |  |
| 60 | create_stock_in | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | ehs |  |
| 61 | create_stock_out | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | ehs |  |
| 62 | get_stock_record | GET | `/api/ehs/hazardous-materials/stock-records/{param}` | ehs |  |
| 63 | update_material_msds | PUT | `/api/ehs/hazardous-materials/{param}/msds` | ehs | path exists in frontend but method not called |
| 64 | list_material_stocks | GET | `/api/ehs/hazardous-materials/{param}/stocks` | ehs |  |
| 65 | list_control_measures | GET | `/api/ehs/hazards/{param}/controls` | ehs | path exists in frontend but method not called |
| 66 | ehs_create_record_api_ehs_health | POST | `/api/ehs/health` | ehs | path exists in frontend but method not called |
| 67 | list_hazards | GET | `/api/ehs/issues` | ehs | path exists in frontend but method not called |
| 68 | approve_hazard | POST | `/api/ehs/issues/{param}/approval/approve` | ehs |  |
| 69 | reject_hazard | POST | `/api/ehs/issues/{param}/approval/reject` | ehs |  |
| 70 | start_hazard_approval | POST | `/api/ehs/issues/{param}/approval/start` | ehs |  |
| 71 | list_disease_cases | GET | `/api/ehs/occupational-disease/cases` | ehs |  |
| 72 | create_disease_case | POST | `/api/ehs/occupational-disease/cases` | ehs |  |
| 73 | get_disease_case | GET | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 74 | update_disease_case | PUT | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 75 | delete_disease_case | DELETE | `/api/ehs/occupational-disease/cases/{param}` | ehs |  |
| 76 | list_detection_records | GET | `/api/ehs/occupational-disease/detections` | ehs |  |
| 77 | create_detection_record | POST | `/api/ehs/occupational-disease/detections` | ehs |  |
| 78 | get_detection_record | GET | `/api/ehs/occupational-disease/detections/{param}` | ehs |  |
| 79 | delete_detection_record | DELETE | `/api/ehs/occupational-disease/detections/{param}` | ehs |  |
| 80 | list_factor_types | GET | `/api/ehs/occupational-disease/factor-types` | ehs |  |
| 81 | list_hazard_factors | GET | `/api/ehs/occupational-disease/factors` | ehs |  |
| 82 | create_hazard_factor | POST | `/api/ehs/occupational-disease/factors` | ehs |  |
| 83 | get_hazard_factor | GET | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 84 | update_hazard_factor | PUT | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 85 | delete_hazard_factor | DELETE | `/api/ehs/occupational-disease/factors/{param}` | ehs |  |
| 86 | list_protection_measures | GET | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 87 | create_protection_measure | POST | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 88 | get_protection_measure | GET | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 89 | update_protection_measure | PUT | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 90 | delete_protection_measure | DELETE | `/api/ehs/occupational-disease/protection-measures/{param}` | ehs |  |
| 91 | get_disease_statistics | GET | `/api/ehs/occupational-disease/statistics` | ehs |  |
| 92 | list_health_trainings | GET | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 93 | create_health_training | POST | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 94 | get_health_training | GET | `/api/ehs/occupational-disease/trainings/{param}` | ehs |  |
| 95 | delete_health_training | DELETE | `/api/ehs/occupational-disease/trainings/{param}` | ehs |  |
| 96 | list_abnormalities | GET | `/api/ehs/occupational-health/abnormalities` | ehs |  |
| 97 | update_abnormality | PUT | `/api/ehs/occupational-health/abnormalities/{param}` | ehs |  |
| 98 | get_health_archive | GET | `/api/ehs/occupational-health/archives/{param}` | ehs |  |
| 99 | list_contraindications | GET | `/api/ehs/occupational-health/contraindications` | ehs | path exists in frontend but method not called |
| 100 | list_exam_plans | GET | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 101 | create_exam_plan | POST | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 102 | get_exam_plan | GET | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 103 | update_exam_plan | PUT | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 104 | delete_exam_plan | DELETE | `/api/ehs/occupational-health/exam-plans/{param}` | ehs |  |
| 105 | list_exam_records | GET | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 106 | create_exam_record | POST | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 107 | get_exam_record | GET | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 108 | update_exam_record | PUT | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 109 | delete_exam_record | DELETE | `/api/ehs/occupational-health/exam-records/{param}` | ehs |  |
| 110 | list_exam_types | GET | `/api/ehs/occupational-health/exam-types` | ehs |  |
| 111 | get_health_statistics | GET | `/api/ehs/occupational-health/statistics` | ehs |  |
| 112 | list_sync_records | GET | `/api/ehs/sync-records` | ehs |  |
| 113 | delete_sync_record | DELETE | `/api/ehs/sync-records/{param}` | ehs | path exists in frontend but method not called |
| 114 | retry_sync | POST | `/api/ehs/sync-records/{param}/retry` | ehs |  |
| 115 | sync_accident_to_lims | POST | `/api/ehs/sync/accident-to-lims` | ehs |  |
| 116 | update_sync_configs | PUT | `/api/ehs/sync/configs` | ehs | path exists in frontend but method not called |
| 117 | sync_hazard_to_qms | POST | `/api/ehs/sync/hazard-to-qms` | ehs |  |
| 118 | list_trainings | GET | `/api/ehs/training` | ehs |  |
| 119 | create_training | POST | `/api/ehs/training` | ehs |  |
| 120 | get_training | GET | `/api/ehs/training/{param}` | ehs |  |
| 121 | update_training | PUT | `/api/ehs/training/{param}` | ehs |  |
| 122 | delete_training | DELETE | `/api/ehs/training/{param}` | ehs |  |
| 123 | export_contacts | GET | `/api/erp/addressbook/export` | erp |  |
| 124 | get_account_by_code | GET | `/api/finance/accounts/code/{param}` | finance |  |
| 125 | get_balance_sheet | GET | `/api/finance/balance-sheet/{param}` | finance |  |
| 126 | get_cash_flow | GET | `/api/finance/cash-flow/{param}` | finance |  |
| 127 | get_income_statement | GET | `/api/finance/income-statement/{param}` | finance |  |
| 128 | get_ledger | GET | `/api/finance/ledger` | finance |  |
| 129 | get_trial_balance | GET | `/api/finance/trial-balance/{param}` | finance |  |
| 130 | export_vouchers | POST | `/api/finance/vouchers/export` | finance |  |
| 131 | unpost_voucher | POST | `/api/finance/vouchers/{param}/unpost` | finance |  |
| 132 | list_pending_approvals | GET | `/api/core/flow/approvals/pending` | flow |  |
| 133 | approve_task | POST | `/api/core/flow/approvals/{param}/approve` | flow |  |
| 134 | reject_task | POST | `/api/core/flow/approvals/{param}/reject` | flow |  |
| 135 | approve_instance | POST | `/api/core/flow/instances/{param}/approve` | flow |  |
| 136 | reject_instance | POST | `/api/core/flow/instances/{param}/reject` | flow |  |
| 137 | start_instance | POST | `/api/core/flow/instances/{param}/start` | flow |  |
| 138 | list_workflows | GET | `/api/core/flow/workflows` | flow |  |
| 139 | create_workflow | POST | `/api/core/flow/workflows` | flow |  |
| 140 | get_workflow | GET | `/api/core/flow/workflows/{param}` | flow |  |
| 141 | update_workflow | PUT | `/api/core/flow/workflows/{param}` | flow |  |
| 142 | delete_workflow | DELETE | `/api/core/flow/workflows/{param}` | flow |  |
| 143 | publish_workflow | POST | `/api/core/flow/workflows/{param}/publish` | flow |  |
| 144 | unpublish_workflow | POST | `/api/core/flow/workflows/{param}/unpublish` | flow |  |
| 145 | list_instruments | GET | `/api/lims/instruments` | lims |  |
| 146 | create_instrument | POST | `/api/lims/instruments` | lims |  |
| 147 | list_reagents | GET | `/api/lims/reagents` | lims |  |
| 148 | create_reagent | POST | `/api/lims/reagents` | lims |  |
| 149 | list_samples | GET | `/api/lims/samples` | lims |  |
| 150 | register_sample | POST | `/api/lims/samples` | lims |  |
| 151 | get_sample | GET | `/api/lims/samples/{param}` | lims |  |
| 152 | lims_list_tasks | GET | `/api/lims/tasks` | lims |  |
| 153 | create_task | POST | `/api/lims/tasks` | lims |  |
| 154 | lims_get_task | GET | `/api/lims/tasks/{param}` | lims |  |
| 155 | generate_suggestions | POST | `/api/master/quality-v51/ai/suggest` | master-data |  |
| 156 | apply_auto_fix | POST | `/api/master/quality-v51/auto-fix/run` | master-data |  |
| 157 | list_quality_checks | GET | `/api/master/quality-v51/checks` | master-data |  |
| 158 | run_quality_check | POST | `/api/master/quality-v51/checks` | master-data |  |
| 159 | get_quality_dashboard | GET | `/api/master/quality-v51/dashboard` | master-data |  |
| 160 | list_quality_rules | GET | `/api/master/quality-v51/rules` | master-data |  |
| 161 | create_quality_rule | POST | `/api/master/quality-v51/rules` | master-data |  |
| 162 | get_quality_score | GET | `/api/master/quality-v51/score` | master-data |  |
| 163 | list_wip_transfers | GET | `/api/mes/wips/{param}/transfers` | mes |  |
| 164 | get_today_production_output | GET | `/api/mes/work-reports/today/output` | mes |  |
| 165 | pdm__home | GET | `/api/pdm` | pdm |  |
| 166 | list_change_notices | GET | `/api/pdm/change-notices` | pdm |  |
| 167 | create_change_notice | POST | `/api/pdm/change-notices` | pdm |  |
| 168 | get_change_notice | GET | `/api/pdm/change-notices/{param}` | pdm |  |
| 169 | update_change_notice | PUT | `/api/pdm/change-notices/{param}` | pdm |  |
| 170 | delete_change_notice | DELETE | `/api/pdm/change-notices/{param}` | pdm |  |
| 171 | approve_change_notice | POST | `/api/pdm/change-notices/{param}/approve` | pdm |  |
| 172 | reject_change_notice | POST | `/api/pdm/change-notices/{param}/reject` | pdm |  |
| 173 | submit_change_notice | POST | `/api/pdm/change-notices/{param}/submit` | pdm |  |
| 174 | list_configurations | GET | `/api/pdm/configurations` | pdm |  |
| 175 | create_configuration | POST | `/api/pdm/configurations` | pdm |  |
| 176 | get_configuration | GET | `/api/pdm/configurations/{param}` | pdm |  |
| 177 | update_configuration | PUT | `/api/pdm/configurations/{param}` | pdm |  |
| 178 | delete_configuration | DELETE | `/api/pdm/configurations/{param}` | pdm |  |
| 179 | list_pending_documents | GET | `/api/pdm/documents/pending-approval` | pdm |  |
| 180 | get_document_approval_history | GET | `/api/pdm/documents/{param}/approval-history` | pdm |  |
| 181 | start_document_approval | POST | `/api/pdm/documents/{param}/approve` | pdm |  |
| 182 | pdm_get_statistics | GET | `/api/pdm/statistics/{param}` | pdm |  |
| 183 | list_versions | GET | `/api/pdm/versions` | pdm |  |
| 184 | create_version | POST | `/api/pdm/versions` | pdm |  |
| 185 | get_version | GET | `/api/pdm/versions/{param}` | pdm |  |
| 186 | update_version | PUT | `/api/pdm/versions/{param}` | pdm |  |
| 187 | delete_version | DELETE | `/api/pdm/versions/{param}` | pdm |  |
| 188 | list_workflow_instances | GET | `/api/pdm/workflow-instances` | pdm |  |
| 189 | get_workflow_instance | GET | `/api/pdm/workflow-instances/{param}` | pdm |  |
| 190 | advance_workflow | POST | `/api/pdm/workflow-instances/{param}/advance` | pdm |  |
| 191 | pdm_list_workflows | GET | `/api/pdm/workflows` | pdm |  |
| 192 | pdm_create_workflow | POST | `/api/pdm/workflows` | pdm |  |
| 193 | start_workflow | POST | `/api/pdm/workflows/start` | pdm |  |
| 194 | pdm_get_workflow | GET | `/api/pdm/workflows/{param}` | pdm |  |
| 195 | pdm_update_workflow | PUT | `/api/pdm/workflows/{param}` | pdm |  |
| 196 | pdm_delete_workflow | DELETE | `/api/pdm/workflows/{param}` | pdm |  |
| 197 | list_audit_logs | GET | `/api/rd/audit-logs` | rd |  |
| 198 | list_projects | GET | `/api/rd/projects` | rd | path exists in frontend but method not called |
| 199 | reject_order | POST | `/api/scm/purchase-orders/{param}/reject` | scm |  |
| 200 | unified-core_create_document | POST | `/api/core/doc/documents` | unified-core | path exists in frontend but method not called |
| 201 | unified-core_update_document | PUT | `/api/core/doc/documents/{param}` | unified-core | path exists in frontend but method not called |
| 202 | download_file | GET | `/api/core/file/download/{param}` | unified-core |  |
| 203 | list_files | GET | `/api/core/file/files` | unified-core |  |
| 204 | get_received_files | GET | `/api/core/file/files/received` | unified-core |  |
| 205 | search_files | GET | `/api/core/file/files/search` | unified-core |  |
| 206 | list_starred_files | GET | `/api/core/file/files/starred` | unified-core |  |
| 207 | update_file | PUT | `/api/core/file/files/{param}` | unified-core | path exists in frontend but method not called |
| 208 | copy_file | POST | `/api/core/file/files/{param}/copy` | unified-core |  |
| 209 | move_file | POST | `/api/core/file/files/{param}/move` | unified-core |  |
| 210 | set_file_permission | POST | `/api/core/file/files/{param}/permission` | unified-core |  |
| 211 | set_file_permissions | POST | `/api/core/file/files/{param}/permissions` | unified-core | path exists in frontend but method not called |
| 212 | get_file_shares | GET | `/api/core/file/files/{param}/shares` | unified-core |  |
| 213 | star_file | POST | `/api/core/file/files/{param}/star` | unified-core |  |
| 214 | unstar_file | POST | `/api/core/file/files/{param}/unstar` | unified-core |  |
| 215 | preview_file | GET | `/api/core/file/preview/{param}` | unified-core |  |
| 216 | delete_share | DELETE | `/api/core/file/shares/{param}` | unified-core |  |
| 217 | get_file_stats | GET | `/api/core/file/stats` | unified-core |  |
| 218 | get_thumbnail | GET | `/api/core/file/thumbnail/{param}` | unified-core |  |
| 219 | upload_multiple | POST | `/api/core/file/upload/multiple` | unified-core |  |
| 220 | login | POST | `/api/unified-core/iam/auth/login` | unified-core |  |
| 221 | register | POST | `/api/unified-core/iam/auth/register` | unified-core |  |
| 222 | list_users | GET | `/api/unified-core/users` | unified-core |  |
| 223 | create_user | POST | `/api/unified-core/users` | unified-core |  |
| 224 | list_alerts | GET | `/api/wms/inventory-alerts` | wms |  |
| 225 | get_alert | GET | `/api/wms/inventory-alerts/{param}` | wms |  |
| 226 | acknowledge_alert | POST | `/api/wms/inventory-alerts/{param}/acknowledge` | wms |  |
| 227 | get_account_by_code | GET | `/api/finance/accounts/code/{param}` | Accounting |  |
| 228 | get_balance_sheet | GET | `/api/finance/balance-sheet/{param}` | Report |  |
| 229 | get_cash_flow | GET | `/api/finance/cash-flow/{param}` | Report |  |
| 230 | get_income_statement | GET | `/api/finance/income-statement/{param}` | Report |  |
| 231 | get_ledger | GET | `/api/finance/ledger` | Report |  |
| 232 | get_trial_balance | GET | `/api/finance/trial-balance/{param}` | Report |  |
| 233 | list_entries | GET | `/api/finance/voucher-templates/{param}/entries` | Voucher Template | path exists in frontend but method not called |
| 234 | get_entry | GET | `/api/finance/voucher-templates/{param}/entries/{param}` | Voucher Template | path exists in frontend but method not called |
| 235 | export_template | GET | `/api/finance/voucher-templates/{param}/export` | Voucher Template |  |
| 236 | export_vouchers | POST | `/api/finance/vouchers/export` | Voucher |  |
| 237 | unpost_voucher | POST | `/api/finance/vouchers/{param}/unpost` | Voucher |  |

## 2. 未文档化前端 API（前端有调用，OpenAPI 无定义）

共 2318 个调用：

| # | 方法 | 完整路径 | 服务 | 文件 | 行号 |
|---|------|----------|------|------|------|
| 1 | GET | `/api/core/system/api-keys` | core | apps/web/src/api/admin/apiKeys.ts | 24 |
| 2 | POST | `/api/core/system/api-keys` | core | apps/web/src/api/admin/apiKeys.ts | 28 |
| 3 | DELETE | `/api/core/system/api-keys/{param}` | core | apps/web/src/api/admin/apiKeys.ts | 32 |
| 4 | GET | `/api/erp/system/audit-logs` | erp | apps/web/src/api/admin/auditLog.ts | 25 |
| 5 | GET | `/api/erp/system/audit-logs/{param}` | erp | apps/web/src/api/admin/auditLog.ts | 29 |
| 6 | GET | `/api/erp/system/audit-logs/export` | erp | apps/web/src/api/admin/auditLog.ts | 42 |
| 7 | GET | `/api/core/monitor/alerts` | core | apps/web/src/api/admin/monitoring.ts | 165 |
| 8 | GET | `/api/core/monitor/alerts/{param}` | core | apps/web/src/api/admin/monitoring.ts | 169 |
| 9 | POST | `/api/core/monitor/alerts/acknowledge` | core | apps/web/src/api/admin/monitoring.ts | 173 |
| 10 | POST | `/api/core/monitor/alerts/resolve` | core | apps/web/src/api/admin/monitoring.ts | 180 |
| 11 | POST | `/api/core/monitor/alerts/{param}/escalate` | core | apps/web/src/api/admin/monitoring.ts | 190 |
| 12 | POST | `/api/core/monitor/alerts/{param}/dismiss` | core | apps/web/src/api/admin/monitoring.ts | 194 |
| 13 | GET | `/api/core/monitor/alerts/statistics` | core | apps/web/src/api/admin/monitoring.ts | 205 |
| 14 | GET | `/api/core/monitor/alerts/export` | core | apps/web/src/api/admin/monitoring.ts | 218 |
| 15 | GET | `/api/core/monitor/rules` | core | apps/web/src/api/admin/monitoring.ts | 240 |
| 16 | GET | `/api/core/monitor/rules/{param}` | core | apps/web/src/api/admin/monitoring.ts | 244 |
| 17 | POST | `/api/core/monitor/rules` | core | apps/web/src/api/admin/monitoring.ts | 248 |
| 18 | PUT | `/api/core/monitor/rules/{param}` | core | apps/web/src/api/admin/monitoring.ts | 255 |
| 19 | DELETE | `/api/core/monitor/rules/{param}` | core | apps/web/src/api/admin/monitoring.ts | 259 |
| 20 | POST | `/api/core/monitor/rules/{param}/enable` | core | apps/web/src/api/admin/monitoring.ts | 263 |
| 21 | POST | `/api/core/monitor/rules/{param}/disable` | core | apps/web/src/api/admin/monitoring.ts | 267 |
| 22 | GET | `/api/core/monitor/health` | core | apps/web/src/api/admin/monitoring.ts | 271 |
| 23 | GET | `/api/core/monitor/metrics` | core | apps/web/src/api/admin/monitoring.ts | 282 |
| 24 | GET | `/api/core/audit/operations` | core | apps/web/src/api/admin/operationAudit.ts | 77 |
| 25 | GET | `/api/core/audit/operations/{param}` | core | apps/web/src/api/admin/operationAudit.ts | 83 |
| 26 | GET | `/api/core/audit/operations/stats` | core | apps/web/src/api/admin/operationAudit.ts | 87 |
| 27 | GET | `/api/core/audit/permission-changes` | core | apps/web/src/api/admin/permissionAudit.ts | 148 |
| 28 | GET | `/api/core/audit/permission-changes/{param}` | core | apps/web/src/api/admin/permissionAudit.ts | 154 |
| 29 | GET | `/api/core/audit/permission-changes/stats` | core | apps/web/src/api/admin/permissionAudit.ts | 165 |
| 30 | GET | `/api/core/audit/permission-changes/export` | core | apps/web/src/api/admin/permissionAudit.ts | 183 |
| 31 | GET | `/api/core/audit/access-logs` | core | apps/web/src/api/admin/permissionAudit.ts | 207 |
| 32 | GET | `/api/core/audit/access-logs/{param}` | core | apps/web/src/api/admin/permissionAudit.ts | 211 |
| 33 | GET | `/api/core/audit/access-logs/stats` | core | apps/web/src/api/admin/permissionAudit.ts | 222 |
| 34 | GET | `/api/core/audit/access-logs/export` | core | apps/web/src/api/admin/permissionAudit.ts | 238 |
| 35 | GET | `/api/core/system/settings/smtp` | core | apps/web/src/api/admin/smtpSettings.ts | 23 |
| 36 | PUT | `/api/core/system/settings/smtp` | core | apps/web/src/api/admin/smtpSettings.ts | 27 |
| 37 | GET | `/api/erp/system/settings` | erp | apps/web/src/api/admin/systemSetting.ts | 13 |
| 38 | GET | `/api/erp/system/settings/{param}` | erp | apps/web/src/api/admin/systemSetting.ts | 17 |
| 39 | POST | `/api/erp/system/settings` | erp | apps/web/src/api/admin/systemSetting.ts | 26 |
| 40 | PUT | `/api/erp/system/settings/{param}` | erp | apps/web/src/api/admin/systemSetting.ts | 37 |
| 41 | DELETE | `/api/erp/system/settings/{param}` | erp | apps/web/src/api/admin/systemSetting.ts | 41 |
| 42 | PUT | `/api/erp/system/settings/batch` | erp | apps/web/src/api/admin/systemSetting.ts | 47 |
| 43 | GET | `/api/erp/system/config` | erp | apps/web/src/api/admin/systemSetting.ts | 51 |
| 44 | PUT | `/api/erp/system/config` | erp | apps/web/src/api/admin/systemSetting.ts | 55 |
| 45 | POST | `/api/ai/analysis/sentiment` | ai | apps/web/src/api/ai/analysis.ts | 18 |
| 46 | POST | `/api/ai/analysis/classify` | ai | apps/web/src/api/ai/analysis.ts | 22 |
| 47 | POST | `/api/ai/analysis/entities` | ai | apps/web/src/api/ai/analysis.ts | 28 |
| 48 | POST | `/api/ai/analysis/keywords` | ai | apps/web/src/api/ai/analysis.ts | 34 |
| 49 | POST | `/api/ai/assistant/report` | ai | apps/web/src/api/ai/assistant.ts | 99 |
| 50 | POST | `/api/ai/assistant/flow` | ai | apps/web/src/api/ai/assistant.ts | 101 |
| 51 | POST | `/api/ai/assistant/anomaly/predict` | ai | apps/web/src/api/ai/assistant.ts | 103 |
| 52 | POST | `/api/ai/assistant/knowledge/ask` | ai | apps/web/src/api/ai/assistant.ts | 105 |
| 53 | POST | `/api/ai/ai/chat` | ai | apps/web/src/api/ai/chat.ts | 21 |
| 54 | POST | `/api/ai/ai/search` | ai | apps/web/src/api/ai/chat.ts | 25 |
| 55 | POST | `/api/ai/ai/generate` | ai | apps/web/src/api/ai/chat.ts | 29 |
| 56 | GET | `/api/ai/conversations` | ai | apps/web/src/api/ai/chat.ts | 33 |
| 57 | GET | `/api/ai/conversations/{param}` | ai | apps/web/src/api/ai/chat.ts | 37 |
| 58 | POST | `/api/ai/conversations` | ai | apps/web/src/api/ai/chat.ts | 41 |
| 59 | DELETE | `/api/ai/conversations/{param}` | ai | apps/web/src/api/ai/chat.ts | 45 |
| 60 | POST | `/api/ai/ai/validate` | ai | apps/web/src/api/ai/chat.ts | 49 |
| 61 | POST | `/api/ai/ai/complete` | ai | apps/web/src/api/ai/chat.ts | 53 |
| 62 | POST | `/api/ai/ai/summarize` | ai | apps/web/src/api/ai/chat.ts | 57 |
| 63 | POST | `/api/ai/code/generate` | ai | apps/web/src/api/ai/code.ts | 17 |
| 64 | POST | `/api/ai/code/explain` | ai | apps/web/src/api/ai/code.ts | 30 |
| 65 | POST | `/api/ai/code/fix-bug` | ai | apps/web/src/api/ai/code.ts | 44 |
| 66 | POST | `/api/ai/code/optimize` | ai | apps/web/src/api/ai/code.ts | 58 |
| 67 | POST | `/api/ai/code/review` | ai | apps/web/src/api/ai/code.ts | 77 |
| 68 | GET | `/api/ai/documents` | ai | apps/web/src/api/ai/documentTyped.ts | 8 |
| 69 | GET | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documentTyped.ts | 9 |
| 70 | DELETE | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documentTyped.ts | 10 |
| 71 | GET | `/api/ai/documents` | ai | apps/web/src/api/ai/documentTyped.ts | 37 |
| 72 | GET | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documentTyped.ts | 46 |
| 73 | DELETE | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documentTyped.ts | 53 |
| 74 | GET | `/api/ai/documents` | ai | apps/web/src/api/ai/documents.ts | 26 |
| 75 | GET | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documents.ts | 30 |
| 76 | POST | `/api/ai/documents` | ai | apps/web/src/api/ai/documents.ts | 34 |
| 77 | PUT | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documents.ts | 38 |
| 78 | DELETE | `/api/ai/documents/{param}` | ai | apps/web/src/api/ai/documents.ts | 42 |
| 79 | POST | `/api/ai/documents/{param}/summarize` | ai | apps/web/src/api/ai/documents.ts | 49 |
| 80 | POST | `/api/ai/documents/{param}/key-points` | ai | apps/web/src/api/ai/documents.ts | 56 |
| 81 | POST | `/api/ai/documents/{param}/extract` | ai | apps/web/src/api/ai/documents.ts | 63 |
| 82 | POST | `/api/ai/documents/{param}/translate` | ai | apps/web/src/api/ai/documents.ts | 80 |
| 83 | POST | `/api/ai/documents/{param}/ocr` | ai | apps/web/src/api/ai/documents.ts | 93 |
| 84 | POST | `/api/ai/documents/{param}/classify` | ai | apps/web/src/api/ai/documents.ts | 106 |
| 85 | POST | `/api/ai/documents/{param}/entities` | ai | apps/web/src/api/ai/documents.ts | 123 |
| 86 | GET | `/api/ai/health` | ai | apps/web/src/api/ai/index.ts | 43 |
| 87 | GET | `/api/ai/ai/templates` | ai | apps/web/src/api/ai/index.ts | 47 |
| 88 | PUT | `/api/ai/conversations/{param}` | ai | apps/web/src/api/ai/index.ts | 59 |
| 89 | GET | `/api/ai/conversations/{param}/messages` | ai | apps/web/src/api/ai/index.ts | 73 |
| 90 | POST | `/api/ai/conversations/{param}/messages/{param}/regenerate` | ai | apps/web/src/api/ai/index.ts | 80 |
| 91 | GET | `/api/ai/dashboard/stats` | ai | apps/web/src/api/ai/index.ts | 99 |
| 92 | GET | `/api/ai/dashboard/activity-trend` | ai | apps/web/src/api/ai/index.ts | 119 |
| 93 | GET | `/api/ai/dashboard/feature-usage` | ai | apps/web/src/api/ai/index.ts | 132 |
| 94 | GET | `/api/ai/models` | ai | apps/web/src/api/ai/index.ts | 154 |
| 95 | GET | `/api/ai/models/{param}/config` | ai | apps/web/src/api/ai/index.ts | 170 |
| 96 | PUT | `/api/ai/models/{param}/config` | ai | apps/web/src/api/ai/index.ts | 184 |
| 97 | GET | `/api/ai/models/usage` | ai | apps/web/src/api/ai/index.ts | 212 |
| 98 | GET | `/api/ai/prompts/templates` | ai | apps/web/src/api/ai/index.ts | 239 |
| 99 | GET | `/api/ai/prompts/templates/{param}` | ai | apps/web/src/api/ai/index.ts | 254 |
| 100 | POST | `/api/ai/prompts/templates` | ai | apps/web/src/api/ai/index.ts | 258 |
| 101 | PUT | `/api/ai/prompts/templates/{param}` | ai | apps/web/src/api/ai/index.ts | 265 |
| 102 | DELETE | `/api/ai/prompts/templates/{param}` | ai | apps/web/src/api/ai/index.ts | 269 |
| 103 | POST | `/api/ai/prompts/templates/{param}/favorite` | ai | apps/web/src/api/ai/index.ts | 280 |
| 104 | GET | `/api/ai/prompts/categories` | ai | apps/web/src/api/ai/index.ts | 292 |
| 105 | POST | `/api/ai/prompts/templates/{param}/use` | ai | apps/web/src/api/ai/index.ts | 304 |
| 106 | POST | `/api/ai/documents/qa` | ai | apps/web/src/api/ai/qa.ts | 7 |
| 107 | POST | `/api/ai/qa/ask` | ai | apps/web/src/api/ai/qa.ts | 25 |
| 108 | POST | `/api/ai/qa/ask-with-context` | ai | apps/web/src/api/ai/qa.ts | 44 |
| 109 | POST | `/api/ai/qa/ask-structured` | ai | apps/web/src/api/ai/qa.ts | 60 |
| 110 | POST | `/api/ai/qa/ask-conversation` | ai | apps/web/src/api/ai/qa.ts | 80 |
| 111 | POST | `/api/ai/qa/classify` | ai | apps/web/src/api/ai/qa.ts | 86 |
| 112 | GET | `/api/ai/qa/history` | ai | apps/web/src/api/ai/qa.ts | 100 |
| 113 | DELETE | `/api/ai/qa/history/{param}` | ai | apps/web/src/api/ai/qa.ts | 104 |
| 114 | POST | `/api/ai/qa/history/batch-delete` | ai | apps/web/src/api/ai/qa.ts | 110 |
| 115 | POST | `/api/ai/qa/feedback` | ai | apps/web/src/api/ai/qa.ts | 118 |
| 116 | GET | `/api/ai/qa/history` | ai | apps/web/src/api/ai/qaTyped.ts | 8 |
| 117 | DELETE | `/api/ai/qa/history/{param}` | ai | apps/web/src/api/ai/qaTyped.ts | 9 |
| 118 | POST | `/api/ai/qa/history/batch-delete` | ai | apps/web/src/api/ai/qaTyped.ts | 10 |
| 119 | GET | `/api/ai/qa/history` | ai | apps/web/src/api/ai/qaTyped.ts | 48 |
| 120 | DELETE | `/api/ai/qa/history/{param}` | ai | apps/web/src/api/ai/qaTyped.ts | 59 |
| 121 | POST | `/api/ai/qa/history/batch-delete` | ai | apps/web/src/api/ai/qaTyped.ts | 69 |
| 122 | POST | `/api/ai/recommendations` | ai | apps/web/src/api/ai/recommendation.ts | 22 |
| 123 | GET | `/api/ai/recommendations/personalized` | ai | apps/web/src/api/ai/recommendation.ts | 39 |
| 124 | POST | `/api/ai/recommendations/feedback` | ai | apps/web/src/api/ai/recommendation.ts | 47 |
| 125 | POST | `/api/ai/vector/search` | ai | apps/web/src/api/ai/vector.ts | 23 |
| 126 | GET | `/api/ai/vector/collections` | ai | apps/web/src/api/ai/vector.ts | 39 |
| 127 | POST | `/api/ai/vector/collections` | ai | apps/web/src/api/ai/vector.ts | 47 |
| 128 | DELETE | `/api/ai/vector/collections/{param}` | ai | apps/web/src/api/ai/vector.ts | 51 |
| 129 | POST | `/api/ai/vector/index/{param}` | ai | apps/web/src/api/ai/vector.ts | 64 |
| 130 | GET | `/api/core/automation/dashboard/stats` | automation | apps/web/src/api/automation/dashboard.ts | 9 |
| 131 | GET | `/api/core/automation/health` | automation | apps/web/src/api/automation/dashboard.ts | 14 |
| 132 | GET | `/api/core/automation/designer/canvas/{param}` | automation | apps/web/src/api/automation/designer.ts | 13 |
| 133 | PUT | `/api/core/automation/designer/canvas/{param}` | automation | apps/web/src/api/automation/designer.ts | 23 |
| 134 | GET | `/api/core/automation/designer/resources` | automation | apps/web/src/api/automation/designer.ts | 47 |
| 135 | POST | `/api/core/automation/designer/canvas/{param}/sync-to-rule` | automation | apps/web/src/api/automation/designer.ts | 54 |
| 136 | POST | `/api/core/automation/designer/canvas/{param}/sync-from-rule` | automation | apps/web/src/api/automation/designer.ts | 61 |
| 137 | GET | `/api/core/automation/rules` | automation | apps/web/src/api/automation/rules.ts | 22 |
| 138 | GET | `/api/core/automation/rules/{param}` | automation | apps/web/src/api/automation/rules.ts | 28 |
| 139 | GET | `/api/core/automation/rules/by-code/{param}` | automation | apps/web/src/api/automation/rules.ts | 32 |
| 140 | POST | `/api/core/automation/rules` | automation | apps/web/src/api/automation/rules.ts | 36 |
| 141 | PUT | `/api/core/automation/rules/{param}` | automation | apps/web/src/api/automation/rules.ts | 43 |
| 142 | DELETE | `/api/core/automation/rules/{param}` | automation | apps/web/src/api/automation/rules.ts | 47 |
| 143 | POST | `/api/core/automation/rules/{param}/enable` | automation | apps/web/src/api/automation/rules.ts | 51 |
| 144 | POST | `/api/core/automation/rules/{param}/disable` | automation | apps/web/src/api/automation/rules.ts | 55 |
| 145 | POST | `/api/core/automation/rules/{param}/duplicate` | automation | apps/web/src/api/automation/rules.ts | 59 |
| 146 | POST | `/api/core/automation/rules/{param}/trigger` | automation | apps/web/src/api/automation/rules.ts | 67 |
| 147 | GET | `/api/core/automation/runs` | automation | apps/web/src/api/automation/runs.ts | 18 |
| 148 | GET | `/api/core/automation/runs/{param}` | automation | apps/web/src/api/automation/runs.ts | 24 |
| 149 | POST | `/api/core/automation/runs/{param}/retry` | automation | apps/web/src/api/automation/runs.ts | 29 |
| 150 | POST | `/api/core/automation/runs/{param}/cancel` | automation | apps/web/src/api/automation/runs.ts | 34 |
| 151 | GET | `/api/core/automation/runs/{param}/logs` | automation | apps/web/src/api/automation/runs.ts | 51 |
| 152 | POST | `/api/core/automation/runs/purge` | automation | apps/web/src/api/automation/runs.ts | 61 |
| 153 | GET | `/api/core/automation/variables` | automation | apps/web/src/api/automation/variables.ts | 26 |
| 154 | GET | `/api/core/automation/variables/{param}` | automation | apps/web/src/api/automation/variables.ts | 32 |
| 155 | POST | `/api/core/automation/variables` | automation | apps/web/src/api/automation/variables.ts | 38 |
| 156 | PUT | `/api/core/automation/variables/{param}` | automation | apps/web/src/api/automation/variables.ts | 45 |
| 157 | DELETE | `/api/core/automation/variables/{param}` | automation | apps/web/src/api/automation/variables.ts | 52 |
| 158 | GET | `/api/core/automation/variables/{param}/reveal` | automation | apps/web/src/api/automation/variables.ts | 59 |
| 159 | POST | `/api/core/automation/variables/bulk-import` | automation | apps/web/src/api/automation/variables.ts | 68 |
| 160 | GET | `/api/bi/summary` | bi | apps/web/src/api/bi/analytics.ts | 4 |
| 161 | GET | `/api/bi/development` | bi | apps/web/src/api/bi/analytics.ts | 8 |
| 162 | GET | `/api/bi/quality` | bi | apps/web/src/api/bi/analytics.ts | 12 |
| 163 | GET | `/api/bi/production` | bi | apps/web/src/api/bi/analytics.ts | 16 |
| 164 | GET | `/api/bi/laboratory` | bi | apps/web/src/api/bi/analytics.ts | 20 |
| 165 | GET | `/api/bi/overview` | bi | apps/web/src/api/bi/analytics.ts | 24 |
| 166 | GET | `/api/bi/{param}` | bi | apps/web/src/api/bi/analytics.ts | 28 |
| 167 | GET | `/api/bi/rs/summary` | bi | apps/web/src/api/bi/analytics.ts | 45 |
| 168 | GET | `/api/bi/rs/project-timeline` | bi | apps/web/src/api/bi/analytics.ts | 49 |
| 169 | GET | `/api/bi/rs/experiment-success-rate` | bi | apps/web/src/api/bi/analytics.ts | 53 |
| 170 | GET | `/api/bi/rs/material-usage` | bi | apps/web/src/api/bi/analytics.ts | 57 |
| 171 | GET | `/api/bi/rs/project-ranking` | bi | apps/web/src/api/bi/analytics.ts | 61 |
| 172 | GET | `/api/bi/lims/summary` | bi | apps/web/src/api/bi/analytics.ts | 65 |
| 173 | GET | `/api/bi/lims/sample-timeline` | bi | apps/web/src/api/bi/analytics.ts | 69 |
| 174 | GET | `/api/bi/lims/instrument-usage` | bi | apps/web/src/api/bi/analytics.ts | 77 |
| 175 | GET | `/api/bi/lims/sample-status-distribution` | bi | apps/web/src/api/bi/analytics.ts | 81 |
| 176 | GET | `/api/bi/qms/summary` | bi | apps/web/src/api/bi/analytics.ts | 85 |
| 177 | GET | `/api/bi/qms/quality-trend` | bi | apps/web/src/api/bi/analytics.ts | 89 |
| 178 | GET | `/api/bi/qms/issue-distribution` | bi | apps/web/src/api/bi/analytics.ts | 93 |
| 179 | GET | `/api/bi/ehs/summary` | bi | apps/web/src/api/bi/analytics.ts | 97 |
| 180 | GET | `/api/bi/ehs/risk-distribution` | bi | apps/web/src/api/bi/analytics.ts | 101 |
| 181 | GET | `/api/bi/ehs/incident-trend` | bi | apps/web/src/api/bi/analytics.ts | 105 |
| 182 | GET | `/api/bi/srm/summary` | bi | apps/web/src/api/bi/analytics.ts | 109 |
| 183 | GET | `/api/bi/srm/supplier-ranking` | bi | apps/web/src/api/bi/analytics.ts | 113 |
| 184 | GET | `/api/bi/srm/order-timeline` | bi | apps/web/src/api/bi/analytics.ts | 117 |
| 185 | GET | `/api/bi/pdm/summary` | bi | apps/web/src/api/bi/analytics.ts | 121 |
| 186 | GET | `/api/bi/pdm/production-trend` | bi | apps/web/src/api/bi/analytics.ts | 125 |
| 187 | GET | `/api/bi/pdm/batch-status-distribution` | bi | apps/web/src/api/bi/analytics.ts | 129 |
| 188 | GET | `/api/bi/{param}` | bi | apps/web/src/api/bi/analytics.ts | 133 |
| 189 | GET | `/api/bi/comparison-analysis` | bi | apps/web/src/api/bi/comparison.ts | 10 |
| 190 | GET | `/api/bi/comparison-analysis/{param}` | bi | apps/web/src/api/bi/comparison.ts | 14 |
| 191 | POST | `/api/bi/comparison-analysis` | bi | apps/web/src/api/bi/comparison.ts | 18 |
| 192 | PUT | `/api/bi/comparison-analysis/{param}` | bi | apps/web/src/api/bi/comparison.ts | 22 |
| 193 | DELETE | `/api/bi/comparison-analysis/{param}` | bi | apps/web/src/api/bi/comparison.ts | 26 |
| 194 | POST | `/api/bi/comparison-analysis/{param}/run` | bi | apps/web/src/api/bi/comparison.ts | 30 |
| 195 | GET | `/api/bi/comparison-analysis/{param}/result` | bi | apps/web/src/api/bi/comparison.ts | 34 |
| 196 | POST | `/api/bi/dashboard/{param}/clone` | bi | apps/web/src/api/bi/dashboard.ts | 25 |
| 197 | GET | `/api/bi/dashboard/public` | bi | apps/web/src/api/bi/dashboard.ts | 29 |
| 198 | GET | `/api/bi/dashboard/user/{param}` | bi | apps/web/src/api/bi/dashboard.ts | 33 |
| 199 | GET | `/api/bi/dashboard/template` | bi | apps/web/src/api/bi/dashboard.ts | 37 |
| 200 | GET | `/api/bi/dashboard/template/{param}` | bi | apps/web/src/api/bi/dashboard.ts | 41 |
| 201 | POST | `/api/bi/dashboard/template` | bi | apps/web/src/api/bi/dashboard.ts | 45 |
| 202 | PUT | `/api/bi/dashboard/template/{param}` | bi | apps/web/src/api/bi/dashboard.ts | 49 |
| 203 | DELETE | `/api/bi/dashboard/template/{param}` | bi | apps/web/src/api/bi/dashboard.ts | 53 |
| 204 | POST | `/api/bi/dashboard/template/{param}/create` | bi | apps/web/src/api/bi/dashboard.ts | 57 |
| 205 | GET | `/api/bi/data-analysis/sales-trend` | bi | apps/web/src/api/bi/dataAnalysis.ts | 41 |
| 206 | GET | `/api/bi/data-analysis/region-sales` | bi | apps/web/src/api/bi/dataAnalysis.ts | 47 |
| 207 | GET | `/api/bi/data-analysis/category-pivot` | bi | apps/web/src/api/bi/dataAnalysis.ts | 53 |
| 208 | GET | `/api/bi/data-analysis` | bi | apps/web/src/api/bi/dataAnalysis.ts | 59 |
| 209 | GET | `/api/bi/data-sources` | bi | apps/web/src/api/bi/dataSource.ts | 12 |
| 210 | GET | `/api/bi/data-sources/{param}` | bi | apps/web/src/api/bi/dataSource.ts | 16 |
| 211 | POST | `/api/bi/data-sources` | bi | apps/web/src/api/bi/dataSource.ts | 20 |
| 212 | PUT | `/api/bi/data-sources/{param}` | bi | apps/web/src/api/bi/dataSource.ts | 24 |
| 213 | DELETE | `/api/bi/data-sources/{param}` | bi | apps/web/src/api/bi/dataSource.ts | 28 |
| 214 | POST | `/api/bi/data-sources/{param}/refresh` | bi | apps/web/src/api/bi/dataSource.ts | 36 |
| 215 | GET | `/api/bi/permissions/row-level` | bi | apps/web/src/api/bi/permission.ts | 9 |
| 216 | GET | `/api/bi/permissions/row-level/{param}` | bi | apps/web/src/api/bi/permission.ts | 13 |
| 217 | POST | `/api/bi/permissions/row-level` | bi | apps/web/src/api/bi/permission.ts | 17 |
| 218 | PUT | `/api/bi/permissions/row-level/{param}` | bi | apps/web/src/api/bi/permission.ts | 21 |
| 219 | DELETE | `/api/bi/permissions/row-level/{param}` | bi | apps/web/src/api/bi/permission.ts | 25 |
| 220 | GET | `/api/bi/permissions/data` | bi | apps/web/src/api/bi/permission.ts | 33 |
| 221 | POST | `/api/bi/permissions/data` | bi | apps/web/src/api/bi/permission.ts | 37 |
| 222 | PUT | `/api/bi/permissions/data/{param}` | bi | apps/web/src/api/bi/permission.ts | 41 |
| 223 | DELETE | `/api/bi/permissions/data/{param}` | bi | apps/web/src/api/bi/permission.ts | 45 |
| 224 | GET | `/api/bi/permissions/check` | bi | apps/web/src/api/bi/permission.ts | 53 |
| 225 | POST | `/api/bi/report/{param}/export` | bi | apps/web/src/api/bi/report.ts | 44 |
| 226 | GET | `/api/bi/report/{param}/exports` | bi | apps/web/src/api/bi/report.ts | 48 |
| 227 | GET | `/api/bi/report/exports/{param}` | bi | apps/web/src/api/bi/report.ts | 52 |
| 228 | GET | `/api/bi/report/exports/{param}/download` | bi | apps/web/src/api/bi/report.ts | 56 |
| 229 | GET | `/api/bi/report/{param}/schedules` | bi | apps/web/src/api/bi/report.ts | 62 |
| 230 | POST | `/api/bi/report/{param}/schedules` | bi | apps/web/src/api/bi/report.ts | 66 |
| 231 | PUT | `/api/bi/report/schedules/{param}` | bi | apps/web/src/api/bi/report.ts | 70 |
| 232 | DELETE | `/api/bi/report/schedules/{param}` | bi | apps/web/src/api/bi/report.ts | 74 |
| 233 | POST | `/api/bi/report/schedules/{param}/run` | bi | apps/web/src/api/bi/report.ts | 78 |
| 234 | POST | `/api/bi/report/schedules/{param}/toggle` | bi | apps/web/src/api/bi/report.ts | 82 |
| 235 | GET | `/api/bi/sync-records` | bi | apps/web/src/api/bi/sync.ts | 12 |
| 236 | GET | `/api/bi/sync-records/{param}` | bi | apps/web/src/api/bi/sync.ts | 16 |
| 237 | POST | `/api/bi/sync-records` | bi | apps/web/src/api/bi/sync.ts | 20 |
| 238 | PUT | `/api/bi/sync-records/{param}` | bi | apps/web/src/api/bi/sync.ts | 24 |
| 239 | DELETE | `/api/bi/sync-records/{param}` | bi | apps/web/src/api/bi/sync.ts | 28 |
| 240 | POST | `/api/bi/sync-records/{param}/retry` | bi | apps/web/src/api/bi/sync.ts | 32 |
| 241 | GET | `/api/bi/widgets/{param}/drilldown` | bi | apps/web/src/api/bi/visualization.ts | 5 |
| 242 | PUT | `/api/bi/widgets/{param}/drilldown` | bi | apps/web/src/api/bi/visualization.ts | 9 |
| 243 | POST | `/api/bi/widgets/{param}/drilldown/execute` | bi | apps/web/src/api/bi/visualization.ts | 17 |
| 244 | GET | `/api/bi/dashboards/{param}/links` | bi | apps/web/src/api/bi/visualization.ts | 24 |
| 245 | PUT | `/api/bi/dashboards/{param}/links` | bi | apps/web/src/api/bi/visualization.ts | 28 |
| 246 | GET | `/api/bi/widgets/{param}/annotations` | bi | apps/web/src/api/bi/visualization.ts | 32 |
| 247 | POST | `/api/bi/widgets/{param}/annotations` | bi | apps/web/src/api/bi/visualization.ts | 44 |
| 248 | DELETE | `/api/bi/annotations/{param}` | bi | apps/web/src/api/bi/visualization.ts | 48 |
| 249 | POST | `/api/bi/widgets/{param}/export` | bi | apps/web/src/api/bi/visualization.ts | 52 |
| 250 | GET | `/api/bi/widgets/{param}/fullscreen` | bi | apps/web/src/api/bi/visualization.ts | 56 |
| 251 | GET | `/api/bi/widget/dashboard/{param}` | bi | apps/web/src/api/bi/widget.ts | 9 |
| 252 | GET | `/api/bi/widget/{param}/data` | bi | apps/web/src/api/bi/widget.ts | 29 |
| 253 | GET | `/api/erp/consolidation/scopes` | erp | apps/web/src/api/consolidation/index.ts | 38 |
| 254 | GET | `/api/erp/consolidation/scopes/{param}` | erp | apps/web/src/api/consolidation/index.ts | 47 |
| 255 | POST | `/api/erp/consolidation/scopes` | erp | apps/web/src/api/consolidation/index.ts | 56 |
| 256 | PUT | `/api/erp/consolidation/scopes/{param}` | erp | apps/web/src/api/consolidation/index.ts | 66 |
| 257 | DELETE | `/api/erp/consolidation/scopes/{param}` | erp | apps/web/src/api/consolidation/index.ts | 73 |
| 258 | GET | `/api/erp/consolidation/scopes/{param}/companies` | erp | apps/web/src/api/consolidation/index.ts | 82 |
| 259 | POST | `/api/erp/consolidation/scopes/companies` | erp | apps/web/src/api/consolidation/index.ts | 91 |
| 260 | PUT | `/api/erp/consolidation/scopes/companies/{param}` | erp | apps/web/src/api/consolidation/index.ts | 101 |
| 261 | DELETE | `/api/erp/consolidation/scopes/companies/{param}` | erp | apps/web/src/api/consolidation/index.ts | 108 |
| 262 | GET | `/api/erp/consolidation/elimination-rules` | erp | apps/web/src/api/consolidation/index.ts | 121 |
| 263 | GET | `/api/erp/consolidation/elimination-rules/{param}` | erp | apps/web/src/api/consolidation/index.ts | 130 |
| 264 | POST | `/api/erp/consolidation/elimination-rules` | erp | apps/web/src/api/consolidation/index.ts | 139 |
| 265 | PUT | `/api/erp/consolidation/elimination-rules/{param}` | erp | apps/web/src/api/consolidation/index.ts | 149 |
| 266 | DELETE | `/api/erp/consolidation/elimination-rules/{param}` | erp | apps/web/src/api/consolidation/index.ts | 156 |
| 267 | GET | `/api/erp/consolidation/internal-transactions` | erp | apps/web/src/api/consolidation/index.ts | 165 |
| 268 | GET | `/api/erp/consolidation/internal-transactions/{param}` | erp | apps/web/src/api/consolidation/index.ts | 176 |
| 269 | POST | `/api/erp/consolidation/execute-elimination` | erp | apps/web/src/api/consolidation/index.ts | 192 |
| 270 | GET | `/api/erp/consolidation/reports` | erp | apps/web/src/api/consolidation/index.ts | 205 |
| 271 | GET | `/api/erp/consolidation/reports/{param}` | erp | apps/web/src/api/consolidation/index.ts | 214 |
| 272 | POST | `/api/erp/consolidation/reports/generate` | erp | apps/web/src/api/consolidation/index.ts | 223 |
| 273 | GET | `/api/erp/consolidation/reports/{param}/lines` | erp | apps/web/src/api/consolidation/index.ts | 232 |
| 274 | POST | `/api/erp/consolidation/reports/{param}/approve` | erp | apps/web/src/api/consolidation/index.ts | 241 |
| 275 | POST | `/api/erp/consolidation/reports/{param}/publish` | erp | apps/web/src/api/consolidation/index.ts | 250 |
| 276 | DELETE | `/api/erp/consolidation/reports/{param}` | erp | apps/web/src/api/consolidation/index.ts | 257 |
| 277 | GET | `/api/erp/consolidation/company-relations` | erp | apps/web/src/api/consolidation/index.ts | 272 |
| 278 | POST | `/api/erp/consolidation/company-relations` | erp | apps/web/src/api/consolidation/index.ts | 283 |
| 279 | PUT | `/api/erp/consolidation/company-relations/{param}` | erp | apps/web/src/api/consolidation/index.ts | 293 |
| 280 | DELETE | `/api/erp/consolidation/company-relations/{param}` | erp | apps/web/src/api/consolidation/index.ts | 300 |
| 281 | GET | `/api/erp/consolidation/companies/{param}/financial-data` | erp | apps/web/src/api/consolidation/index.ts | 310 |
| 282 | GET | `/api/erp/consolidation/company-tree` | erp | apps/web/src/api/consolidation/index.ts | 319 |
| 283 | GET | `/api/crm/billing` | crm | apps/web/src/api/crm/billing.ts | 9 |
| 284 | GET | `/api/crm/billing/{param}` | crm | apps/web/src/api/crm/billing.ts | 13 |
| 285 | POST | `/api/crm/billing` | crm | apps/web/src/api/crm/billing.ts | 17 |
| 286 | PUT | `/api/crm/billing/{param}` | crm | apps/web/src/api/crm/billing.ts | 21 |
| 287 | DELETE | `/api/crm/billing/{param}` | crm | apps/web/src/api/crm/billing.ts | 25 |
| 288 | POST | `/api/crm/billing/{param}/paid` | crm | apps/web/src/api/crm/billing.ts | 29 |
| 289 | POST | `/api/crm/billing/{param}/notify` | crm | apps/web/src/api/crm/billing.ts | 33 |
| 290 | GET | `/api/crm/contacts/{param}` | crm | apps/web/src/api/crm/contact.ts | 44 |
| 291 | PUT | `/api/crm/contacts/{param}` | crm | apps/web/src/api/crm/contact.ts | 48 |
| 292 | DELETE | `/api/crm/contacts/{param}` | crm | apps/web/src/api/crm/contact.ts | 52 |
| 293 | POST | `/api/crm/contacts/batch-delete` | crm | apps/web/src/api/crm/contact.ts | 56 |
| 294 | POST | `/api/crm/customers/batch-delete` | crm | apps/web/src/api/crm/customer.ts | 64 |
| 295 | GET | `/api/crm/customers/{param}/tags` | crm | apps/web/src/api/crm/customer.ts | 68 |
| 296 | POST | `/api/crm/customers/{param}/tags` | crm | apps/web/src/api/crm/customer.ts | 72 |
| 297 | DELETE | `/api/crm/customers/{param}/tags/{param}` | crm | apps/web/src/api/crm/customer.ts | 78 |
| 298 | GET | `/api/crm/tags` | crm | apps/web/src/api/crm/customer.ts | 84 |
| 299 | POST | `/api/crm/tags` | crm | apps/web/src/api/crm/customer.ts | 88 |
| 300 | GET | `/api/crm/tags/{param}` | crm | apps/web/src/api/crm/customer.ts | 92 |
| 301 | PUT | `/api/crm/tags/{param}` | crm | apps/web/src/api/crm/customer.ts | 96 |
| 302 | DELETE | `/api/crm/tags/{param}` | crm | apps/web/src/api/crm/customer.ts | 100 |
| 303 | GET | `/api/crm/tags/{param}/customers` | crm | apps/web/src/api/crm/customer.ts | 104 |
| 304 | GET | `/api/crm/dashboard` | crm | apps/web/src/api/crm/dashboard.ts | 16 |
| 305 | GET | `/api/crm/sales-forecast` | crm | apps/web/src/api/crm/forecast.ts | 9 |
| 306 | GET | `/api/crm/sales-forecast/{param}` | crm | apps/web/src/api/crm/forecast.ts | 13 |
| 307 | POST | `/api/crm/sales-forecast` | crm | apps/web/src/api/crm/forecast.ts | 17 |
| 308 | PUT | `/api/crm/sales-forecast/{param}` | crm | apps/web/src/api/crm/forecast.ts | 21 |
| 309 | DELETE | `/api/crm/sales-forecast/{param}` | crm | apps/web/src/api/crm/forecast.ts | 25 |
| 310 | POST | `/api/crm/sales-forecast/generate` | crm | apps/web/src/api/crm/forecast.ts | 29 |
| 311 | GET | `/api/crm/health` | crm | apps/web/src/api/crm/index.ts | 43 |
| 312 | GET | `/api/crm/interactions` | crm | apps/web/src/api/crm/interaction.ts | 14 |
| 313 | POST | `/api/crm/interactions` | crm | apps/web/src/api/crm/interaction.ts | 18 |
| 314 | GET | `/api/crm/interactions/{param}` | crm | apps/web/src/api/crm/interaction.ts | 22 |
| 315 | PUT | `/api/crm/interactions/{param}` | crm | apps/web/src/api/crm/interaction.ts | 26 |
| 316 | DELETE | `/api/crm/interactions/{param}` | crm | apps/web/src/api/crm/interaction.ts | 30 |
| 317 | POST | `/api/crm/interactions/batch-delete` | crm | apps/web/src/api/crm/interaction.ts | 34 |
| 318 | GET | `/api/crm/opportunities/{param}` | crm | apps/web/src/api/crm/opportunity.ts | 36 |
| 319 | PUT | `/api/crm/opportunities/{param}` | crm | apps/web/src/api/crm/opportunity.ts | 40 |
| 320 | DELETE | `/api/crm/opportunities/{param}` | crm | apps/web/src/api/crm/opportunity.ts | 44 |
| 321 | POST | `/api/crm/opportunities/batch-delete` | crm | apps/web/src/api/crm/opportunity.ts | 48 |
| 322 | GET | `/api/crm/opportunities/funnel` | crm | apps/web/src/api/crm/opportunity.ts | 52 |
| 323 | GET | `/api/crm/opportunities/stats` | crm | apps/web/src/api/crm/opportunity.ts | 56 |
| 324 | GET | `/api/crm/opportunities/forecast` | crm | apps/web/src/api/crm/opportunity.ts | 62 |
| 325 | GET | `/api/crm/returns` | crm | apps/web/src/api/crm/returns.ts | 17 |
| 326 | POST | `/api/crm/returns` | crm | apps/web/src/api/crm/returns.ts | 21 |
| 327 | GET | `/api/crm/returns/{param}` | crm | apps/web/src/api/crm/returns.ts | 25 |
| 328 | PUT | `/api/crm/returns/{param}` | crm | apps/web/src/api/crm/returns.ts | 29 |
| 329 | DELETE | `/api/crm/returns/{param}` | crm | apps/web/src/api/crm/returns.ts | 33 |
| 330 | POST | `/api/crm/returns/{param}/approve` | crm | apps/web/src/api/crm/returns.ts | 37 |
| 331 | POST | `/api/crm/returns/{param}/reject` | crm | apps/web/src/api/crm/returns.ts | 41 |
| 332 | POST | `/api/crm/returns/{param}/receive` | crm | apps/web/src/api/crm/returns.ts | 45 |
| 333 | POST | `/api/crm/returns/{param}/complete` | crm | apps/web/src/api/crm/returns.ts | 49 |
| 334 | POST | `/api/crm/returns/{param}/cancel` | crm | apps/web/src/api/crm/returns.ts | 53 |
| 335 | GET | `/api/crm/returns/{param}/items` | crm | apps/web/src/api/crm/returns.ts | 57 |
| 336 | POST | `/api/crm/returns/{param}/items` | crm | apps/web/src/api/crm/returns.ts | 64 |
| 337 | GET | `/api/crm/returns/{param}/finance-status` | crm | apps/web/src/api/crm/returns.ts | 68 |
| 338 | GET | `/api/crm/returns/{param}/inventory-status` | crm | apps/web/src/api/crm/returns.ts | 72 |
| 339 | GET | `/api/crm/customer-scoring` | crm | apps/web/src/api/crm/scoring.ts | 13 |
| 340 | GET | `/api/crm/customer-scoring/{param}` | crm | apps/web/src/api/crm/scoring.ts | 17 |
| 341 | POST | `/api/crm/customer-scoring` | crm | apps/web/src/api/crm/scoring.ts | 21 |
| 342 | PUT | `/api/crm/customer-scoring/{param}` | crm | apps/web/src/api/crm/scoring.ts | 28 |
| 343 | DELETE | `/api/crm/customer-scoring/{param}` | crm | apps/web/src/api/crm/scoring.ts | 32 |
| 344 | POST | `/api/crm/customer-scoring/calculate` | crm | apps/web/src/api/crm/scoring.ts | 36 |
| 345 | GET | `/api/crm/segments` | crm | apps/web/src/api/crm/segmentation.ts | 17 |
| 346 | POST | `/api/crm/segments` | crm | apps/web/src/api/crm/segmentation.ts | 21 |
| 347 | GET | `/api/crm/segments/{param}` | crm | apps/web/src/api/crm/segmentation.ts | 25 |
| 348 | DELETE | `/api/crm/segments/{param}` | crm | apps/web/src/api/crm/segmentation.ts | 29 |
| 349 | GET | `/api/crm/segments/{param}/customers` | crm | apps/web/src/api/crm/segmentation.ts | 36 |
| 350 | GET | `/api/crm/segments/auto` | crm | apps/web/src/api/crm/segmentation.ts | 40 |
| 351 | GET | `/api/crm/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 48 |
| 352 | POST | `/api/crm/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 52 |
| 353 | GET | `/api/crm/recommendations/{param}` | crm | apps/web/src/api/crm/segmentation.ts | 56 |
| 354 | GET | `/api/crm/customers/{param}/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 63 |
| 355 | GET | `/api/crm/customers/{param}/finance` | crm | apps/web/src/api/crmFinance/index.ts | 75 |
| 356 | PUT | `/api/crm/customers/{param}/finance` | crm | apps/web/src/api/crmFinance/index.ts | 83 |
| 357 | GET | `/api/crm/invoices/{param}` | crm | apps/web/src/api/crmFinance/index.ts | 109 |
| 358 | POST | `/api/crm/invoices` | crm | apps/web/src/api/crmFinance/index.ts | 115 |
| 359 | PUT | `/api/crm/invoices/{param}` | crm | apps/web/src/api/crmFinance/index.ts | 121 |
| 360 | DELETE | `/api/crm/invoices/{param}` | crm | apps/web/src/api/crmFinance/index.ts | 130 |
| 361 | POST | `/api/crm/invoices/{param}/issue` | crm | apps/web/src/api/crmFinance/index.ts | 136 |
| 362 | POST | `/api/crm/invoices/{param}/cancel` | crm | apps/web/src/api/crmFinance/index.ts | 144 |
| 363 | POST | `/api/crm/invoices/{param}/red-flush` | crm | apps/web/src/api/crmFinance/index.ts | 153 |
| 364 | GET | `/api/crm/collections/{param}` | crm | apps/web/src/api/crmFinance/index.ts | 178 |
| 365 | POST | `/api/crm/collections` | crm | apps/web/src/api/crmFinance/index.ts | 186 |
| 366 | POST | `/api/crm/collections/{param}/confirm` | crm | apps/web/src/api/crmFinance/index.ts | 192 |
| 367 | POST | `/api/crm/collections/batch-confirm` | crm | apps/web/src/api/crmFinance/index.ts | 200 |
| 368 | GET | `/api/crm/reports/receivable-aging` | crm | apps/web/src/api/crmFinance/index.ts | 212 |
| 369 | GET | `/api/crm/reports/receivable-summary` | crm | apps/web/src/api/crmFinance/index.ts | 220 |
| 370 | GET | `/api/crm/reports/overdue-receivables` | crm | apps/web/src/api/crmFinance/index.ts | 234 |
| 371 | GET | `/api/crm/invoices/export` | crm | apps/web/src/api/crmFinance/index.ts | 249 |
| 372 | GET | `/api/crm/collections/export` | crm | apps/web/src/api/crmFinance/index.ts | 263 |
| 373 | GET | `/api/crm/reports/receivable-aging/export` | crm | apps/web/src/api/crmFinance/index.ts | 277 |
| 374 | GET | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 28 |
| 375 | GET | `/api/core/dict/types/{param}` | core | apps/web/src/api/dict/dict.ts | 32 |
| 376 | POST | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 41 |
| 377 | PUT | `/api/core/dict/types/{param}` | core | apps/web/src/api/dict/dict.ts | 48 |
| 378 | DELETE | `/api/core/dict/types/{param}` | core | apps/web/src/api/dict/dict.ts | 52 |
| 379 | GET | `/api/core/dict/types/{param}/items` | core | apps/web/src/api/dict/dict.ts | 56 |
| 380 | GET | `/api/core/dict/types/{param}/items/{param}` | core | apps/web/src/api/dict/dict.ts | 60 |
| 381 | POST | `/api/core/dict/types/{param}/items` | core | apps/web/src/api/dict/dict.ts | 67 |
| 382 | PUT | `/api/core/dict/types/{param}/items/{param}` | core | apps/web/src/api/dict/dict.ts | 75 |
| 383 | DELETE | `/api/core/dict/types/{param}/items/{param}` | core | apps/web/src/api/dict/dict.ts | 79 |
| 384 | GET | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 83 |
| 385 | GET | `/api/core/doc/documents/{param}/versions` | doc | apps/web/src/api/doc/index.ts | 132 |
| 386 | GET | `/api/core/doc/documents/{param}/versions/{param}` | doc | apps/web/src/api/doc/index.ts | 136 |
| 387 | POST | `/api/core/doc/documents/{param}/versions/{param}/restore` | doc | apps/web/src/api/doc/index.ts | 140 |
| 388 | GET | `/api/core/doc/health` | doc | apps/web/src/api/doc/index.ts | 144 |
| 389 | GET | `/api/ehs/environmental-compliance/assessments/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 88 |
| 390 | POST | `/api/ehs/environmental-compliance/assessments` | ehs | apps/web/src/api/ehs/compliance.ts | 94 |
| 391 | PUT | `/api/ehs/environmental-compliance/assessments/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 101 |
| 392 | DELETE | `/api/ehs/environmental-compliance/assessments/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 108 |
| 393 | GET | `/api/ehs/environmental-compliance/events/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 168 |
| 394 | POST | `/api/ehs/environmental-compliance/events` | ehs | apps/web/src/api/ehs/compliance.ts | 174 |
| 395 | PUT | `/api/ehs/environmental-compliance/events/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 181 |
| 396 | DELETE | `/api/ehs/environmental-compliance/events/{param}` | ehs | apps/web/src/api/ehs/compliance.ts | 185 |
| 397 | GET | `/api/ehs/dashboard` | ehs | apps/web/src/api/ehs/dashboard.ts | 16 |
| 398 | GET | `/api/ehs/plans/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 26 |
| 399 | POST | `/api/ehs/plans` | ehs | apps/web/src/api/ehs/emergency.ts | 30 |
| 400 | PUT | `/api/ehs/plans/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 37 |
| 401 | DELETE | `/api/ehs/plans/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 41 |
| 402 | GET | `/api/ehs/drills/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 56 |
| 403 | POST | `/api/ehs/drills` | ehs | apps/web/src/api/ehs/emergency.ts | 60 |
| 404 | PUT | `/api/ehs/drills/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 67 |
| 405 | DELETE | `/api/ehs/drills/{param}` | ehs | apps/web/src/api/ehs/emergency.ts | 71 |
| 406 | GET | `/api/ehs/environment/monitors/{param}` | ehs | apps/web/src/api/ehs/environment.ts | 33 |
| 407 | POST | `/api/ehs/environment/monitors` | ehs | apps/web/src/api/ehs/environment.ts | 39 |
| 408 | PUT | `/api/ehs/environment/monitors/{param}` | ehs | apps/web/src/api/ehs/environment.ts | 46 |
| 409 | DELETE | `/api/ehs/environment/monitors/{param}` | ehs | apps/web/src/api/ehs/environment.ts | 50 |
| 410 | GET | `/api/ehs/environment/records/{param}` | ehs | apps/web/src/api/ehs/environment.ts | 88 |
| 411 | PUT | `/api/ehs/hazards/{param}/assessments/{param}` | ehs | apps/web/src/api/ehs/hazard.ts | 65 |
| 412 | PUT | `/api/ehs/hazardous-materials/categories/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 78 |
| 413 | DELETE | `/api/ehs/hazardous-materials/categories/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 85 |
| 414 | GET | `/api/ehs/hazardous-materials/inventory/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 107 |
| 415 | POST | `/api/ehs/hazardous-materials/inventory` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 113 |
| 416 | PUT | `/api/ehs/hazardous-materials/inventory/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 120 |
| 417 | DELETE | `/api/ehs/hazardous-materials/inventory/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 127 |
| 418 | GET | `/api/ehs/hazardous-materials/movements/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 151 |
| 419 | POST | `/api/ehs/hazardous-materials/movements` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 157 |
| 420 | PUT | `/api/ehs/hazardous-materials/movements/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 164 |
| 421 | DELETE | `/api/ehs/hazardous-materials/movements/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 171 |
| 422 | GET | `/api/ehs/hazardous-materials/msds/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 186 |
| 423 | POST | `/api/ehs/hazardous-materials/msds` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 194 |
| 424 | PUT | `/api/ehs/hazardous-materials/msds/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 198 |
| 425 | DELETE | `/api/ehs/hazardous-materials/msds/{param}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 202 |
| 426 | POST | `/api/ehs/incidents/{param}/actions` | ehs | apps/web/src/api/ehs/incident.ts | 54 |
| 427 | PUT | `/api/ehs/incidents/{param}/actions/{param}` | ehs | apps/web/src/api/ehs/incident.ts | 62 |
| 428 | GET | `/api/ehs/occupational-diseases/factors/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 43 |
| 429 | POST | `/api/ehs/occupational-diseases/factors` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 49 |
| 430 | PUT | `/api/ehs/occupational-diseases/factors/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 56 |
| 431 | DELETE | `/api/ehs/occupational-diseases/factors/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 60 |
| 432 | GET | `/api/ehs/occupational-diseases/detection-records/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 81 |
| 433 | POST | `/api/ehs/occupational-diseases/detection-records` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 89 |
| 434 | PUT | `/api/ehs/occupational-diseases/detection-records/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 99 |
| 435 | DELETE | `/api/ehs/occupational-diseases/detection-records/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 106 |
| 436 | GET | `/api/ehs/occupational-diseases/cases/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 127 |
| 437 | POST | `/api/ehs/occupational-diseases/cases` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 133 |
| 438 | PUT | `/api/ehs/occupational-diseases/cases/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 140 |
| 439 | DELETE | `/api/ehs/occupational-diseases/cases/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 144 |
| 440 | GET | `/api/ehs/occupational-diseases/protection-measures/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 164 |
| 441 | POST | `/api/ehs/occupational-diseases/protection-measures` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 170 |
| 442 | PUT | `/api/ehs/occupational-diseases/protection-measures/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 180 |
| 443 | DELETE | `/api/ehs/occupational-diseases/protection-measures/{param}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 187 |
| 444 | GET | `/api/ehs/occupational-health/records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 43 |
| 445 | POST | `/api/ehs/occupational-health/records` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 49 |
| 446 | PUT | `/api/ehs/occupational-health/records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 56 |
| 447 | DELETE | `/api/ehs/occupational-health/records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 60 |
| 448 | GET | `/api/ehs/occupational-health/check-plans/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 80 |
| 449 | POST | `/api/ehs/occupational-health/check-plans` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 86 |
| 450 | PUT | `/api/ehs/occupational-health/check-plans/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 93 |
| 451 | DELETE | `/api/ehs/occupational-health/check-plans/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 97 |
| 452 | GET | `/api/ehs/occupational-health/check-records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 119 |
| 453 | POST | `/api/ehs/occupational-health/check-records` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 125 |
| 454 | PUT | `/api/ehs/occupational-health/check-records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 132 |
| 455 | DELETE | `/api/ehs/occupational-health/check-records/{param}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 136 |
| 456 | GET | `/api/ehs/checks/{param}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 24 |
| 457 | POST | `/api/ehs/checks` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 28 |
| 458 | PUT | `/api/ehs/checks/{param}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 35 |
| 459 | DELETE | `/api/ehs/checks/{param}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 39 |
| 460 | POST | `/api/ehs/sync` | ehs | apps/web/src/api/ehs/sync.ts | 43 |
| 461 | POST | `/api/ehs/sync/to-qms` | ehs | apps/web/src/api/ehs/sync.ts | 51 |
| 462 | POST | `/api/ehs/sync/to-lims` | ehs | apps/web/src/api/ehs/sync.ts | 61 |
| 463 | GET | `/api/ehs/sync/configs/{param}` | ehs | apps/web/src/api/ehs/sync.ts | 86 |
| 464 | GET | `/api/communication/notification/email/email-logs` | notification | apps/web/src/api/email/index.ts | 102 |
| 465 | POST | `/api/communication/notification/email/email-logs/{param}/resend` | notification | apps/web/src/api/email/index.ts | 108 |
| 466 | POST | `/api/communication/notification/email/batch-send` | notification | apps/web/src/api/email/index.ts | 116 |
| 467 | GET | `/api/communication/notification/email/stats` | notification | apps/web/src/api/email/index.ts | 128 |
| 468 | GET | `/api/communication/notification/email/email-logs/{param}` | notification | apps/web/src/api/email/index.ts | 132 |
| 469 | DELETE | `/api/communication/notification/email/email-logs/{param}` | notification | apps/web/src/api/email/index.ts | 136 |
| 470 | POST | `/api/communication/notification/email/send` | notification | apps/web/src/api/email/index.ts | 140 |
| 471 | POST | `/api/communication/notification/email/send-with-template` | notification | apps/web/src/api/email/index.ts | 154 |
| 472 | GET | `/api/communication/notification/email/email-templates` | notification | apps/web/src/api/email/index.ts | 167 |
| 473 | GET | `/api/communication/notification/email/email-templates/{param}` | notification | apps/web/src/api/email/index.ts | 173 |
| 474 | POST | `/api/communication/notification/email/email-templates` | notification | apps/web/src/api/email/index.ts | 179 |
| 475 | PUT | `/api/communication/notification/email/email-templates/{param}` | notification | apps/web/src/api/email/index.ts | 191 |
| 476 | DELETE | `/api/communication/notification/email/email-templates/{param}` | notification | apps/web/src/api/email/index.ts | 200 |
| 477 | GET | `/api/erp/audit-logs` | erp | apps/web/src/api/erp/audit.ts | 41 |
| 478 | GET | `/api/erp/audit-logs/{param}` | erp | apps/web/src/api/erp/audit.ts | 45 |
| 479 | GET | `/api/erp/inventory/low-stock` | erp | apps/web/src/api/erp/core/inventory.ts | 46 |
| 480 | GET | `/api/erp/materials/{param}` | erp | apps/web/src/api/erp/core/material.ts | 31 |
| 481 | PUT | `/api/erp/materials/{param}` | erp | apps/web/src/api/erp/core/material.ts | 39 |
| 482 | DELETE | `/api/erp/materials/{param}` | erp | apps/web/src/api/erp/core/material.ts | 43 |
| 483 | PUT | `/api/erp/purchase-orders/{param}/cancel` | erp | apps/web/src/api/erp/core/purchaseOrder.ts | 50 |
| 484 | PUT | `/api/erp/sales-orders/{param}/approve` | erp | apps/web/src/api/erp/core/salesOrder.ts | 46 |
| 485 | PUT | `/api/erp/sales-orders/{param}/ship` | erp | apps/web/src/api/erp/core/salesOrder.ts | 50 |
| 486 | PUT | `/api/erp/sales-orders/{param}/complete` | erp | apps/web/src/api/erp/core/salesOrder.ts | 54 |
| 487 | PUT | `/api/erp/sales-orders/{param}/cancel` | erp | apps/web/src/api/erp/core/salesOrder.ts | 58 |
| 488 | GET | `/api/erp/db/tables` | erp | apps/web/src/api/erp/database.ts | 60 |
| 489 | GET | `/api/erp/db/tables/{param}` | erp | apps/web/src/api/erp/database.ts | 64 |
| 490 | GET | `/api/erp/db/changes` | erp | apps/web/src/api/erp/database.ts | 68 |
| 491 | GET | `/api/erp/accounting-subjects` | erp | apps/web/src/api/erp/finance/accounting.ts | 21 |
| 492 | GET | `/api/erp/accounting-subjects/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 25 |
| 493 | POST | `/api/erp/accounting-subjects` | erp | apps/web/src/api/erp/finance/accounting.ts | 29 |
| 494 | PUT | `/api/erp/accounting-subjects/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 36 |
| 495 | DELETE | `/api/erp/accounting-subjects/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 40 |
| 496 | GET | `/api/erp/finance/accounts/opening-balances` | erp | apps/web/src/api/erp/finance/accounting.ts | 56 |
| 497 | GET | `/api/erp/finance/accounts/opening-balances/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 62 |
| 498 | POST | `/api/erp/finance/accounts/opening-balances` | erp | apps/web/src/api/erp/finance/accounting.ts | 66 |
| 499 | PUT | `/api/erp/finance/accounts/opening-balances/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 70 |
| 500 | DELETE | `/api/erp/finance/accounts/opening-balances/{param}` | erp | apps/web/src/api/erp/finance/accounting.ts | 74 |
| 501 | POST | `/api/erp/finance/accounts/opening-balances/batch` | erp | apps/web/src/api/erp/finance/accounting.ts | 80 |
| 502 | POST | `/api/erp/finance/accounts/opening-balances/carry-forward` | erp | apps/web/src/api/erp/finance/accounting.ts | 84 |
| 503 | GET | `/api/erp/fixed-assets` | erp | apps/web/src/api/erp/finance/asset.ts | 54 |
| 504 | GET | `/api/erp/fixed-assets/{param}` | erp | apps/web/src/api/erp/finance/asset.ts | 58 |
| 505 | POST | `/api/erp/fixed-assets` | erp | apps/web/src/api/erp/finance/asset.ts | 62 |
| 506 | PUT | `/api/erp/fixed-assets/{param}` | erp | apps/web/src/api/erp/finance/asset.ts | 66 |
| 507 | DELETE | `/api/erp/fixed-assets/{param}` | erp | apps/web/src/api/erp/finance/asset.ts | 70 |
| 508 | POST | `/api/erp/fixed-assets/depreciate` | erp | apps/web/src/api/erp/finance/asset.ts | 74 |
| 509 | GET | `/api/erp/asset-categories/{param}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 51 |
| 510 | POST | `/api/erp/asset-categories` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 55 |
| 511 | PUT | `/api/erp/asset-categories/{param}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 62 |
| 512 | DELETE | `/api/erp/asset-categories/{param}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 66 |
| 513 | GET | `/api/erp/bank-accounts` | erp | apps/web/src/api/erp/finance/bank.ts | 23 |
| 514 | GET | `/api/erp/bank-accounts/{param}` | erp | apps/web/src/api/erp/finance/bank.ts | 27 |
| 515 | POST | `/api/erp/bank-accounts` | erp | apps/web/src/api/erp/finance/bank.ts | 31 |
| 516 | PUT | `/api/erp/bank-accounts/{param}` | erp | apps/web/src/api/erp/finance/bank.ts | 35 |
| 517 | DELETE | `/api/erp/bank-accounts/{param}` | erp | apps/web/src/api/erp/finance/bank.ts | 39 |
| 518 | GET | `/api/erp/bank-transactions` | erp | apps/web/src/api/erp/finance/bank.ts | 58 |
| 519 | GET | `/api/erp/bank-transactions/{param}` | erp | apps/web/src/api/erp/finance/bank.ts | 62 |
| 520 | POST | `/api/erp/bank-transactions` | erp | apps/web/src/api/erp/finance/bank.ts | 66 |
| 521 | DELETE | `/api/erp/bank-transactions/{param}` | erp | apps/web/src/api/erp/finance/bank.ts | 70 |
| 522 | GET | `/api/erp/budgets` | erp | apps/web/src/api/erp/finance/budget.ts | 15 |
| 523 | GET | `/api/erp/budgets/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 19 |
| 524 | POST | `/api/erp/budgets` | erp | apps/web/src/api/erp/finance/budget.ts | 23 |
| 525 | PUT | `/api/erp/budgets/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 27 |
| 526 | DELETE | `/api/erp/budgets/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 31 |
| 527 | GET | `/api/erp/expenses` | erp | apps/web/src/api/erp/finance/budget.ts | 44 |
| 528 | GET | `/api/erp/expenses/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 48 |
| 529 | POST | `/api/erp/expenses` | erp | apps/web/src/api/erp/finance/budget.ts | 52 |
| 530 | PUT | `/api/erp/expenses/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 56 |
| 531 | DELETE | `/api/erp/expenses/{param}` | erp | apps/web/src/api/erp/finance/budget.ts | 60 |
| 532 | GET | `/api/erp/receivables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 15 |
| 533 | GET | `/api/erp/receivables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 19 |
| 534 | POST | `/api/erp/receivables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 23 |
| 535 | PUT | `/api/erp/receivables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 27 |
| 536 | DELETE | `/api/erp/receivables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 31 |
| 537 | GET | `/api/erp/payables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 44 |
| 538 | GET | `/api/erp/payables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 48 |
| 539 | POST | `/api/erp/payables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 52 |
| 540 | PUT | `/api/erp/payables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 56 |
| 541 | DELETE | `/api/erp/payables/{param}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 60 |
| 542 | GET | `/api/erp/reports/balance-sheet` | erp | apps/web/src/api/erp/finance/report.ts | 23 |
| 543 | GET | `/api/erp/reports/income-statement` | erp | apps/web/src/api/erp/finance/report.ts | 30 |
| 544 | GET | `/api/erp/reports/cash-flow` | erp | apps/web/src/api/erp/finance/report.ts | 37 |
| 545 | GET | `/api/erp/reports/business-overview` | erp | apps/web/src/api/erp/finance/report.ts | 44 |
| 546 | GET | `/api/erp/reports/project-summary` | erp | apps/web/src/api/erp/finance/report.ts | 53 |
| 547 | GET | `/api/erp/reports/monthly-trend` | erp | apps/web/src/api/erp/finance/report.ts | 57 |
| 548 | GET | `/api/erp/reports/department-summary` | erp | apps/web/src/api/erp/finance/report.ts | 66 |
| 549 | GET | `/api/erp/reports/aging-analysis` | erp | apps/web/src/api/erp/finance/report.ts | 70 |
| 550 | GET | `/api/erp/reports/voucher-statistics` | erp | apps/web/src/api/erp/finance/report.ts | 77 |
| 551 | GET | `/api/erp/reports/cash-flow-analysis` | erp | apps/web/src/api/erp/finance/report.ts | 84 |
| 552 | GET | `/api/erp/reports/expense-analysis` | erp | apps/web/src/api/erp/finance/report.ts | 91 |
| 553 | GET | `/api/erp/reports/profit-analysis` | erp | apps/web/src/api/erp/finance/report.ts | 98 |
| 554 | GET | `/api/erp/reports/financial-overview` | erp | apps/web/src/api/erp/finance/report.ts | 105 |
| 555 | GET | `/api/erp/vouchers` | erp | apps/web/src/api/erp/finance/voucher.ts | 24 |
| 556 | GET | `/api/erp/vouchers/{param}` | erp | apps/web/src/api/erp/finance/voucher.ts | 28 |
| 557 | GET | `/api/erp/vouchers/{param}/items` | erp | apps/web/src/api/erp/finance/voucher.ts | 32 |
| 558 | POST | `/api/erp/vouchers` | erp | apps/web/src/api/erp/finance/voucher.ts | 36 |
| 559 | PUT | `/api/erp/vouchers/{param}` | erp | apps/web/src/api/erp/finance/voucher.ts | 43 |
| 560 | DELETE | `/api/erp/vouchers/{param}` | erp | apps/web/src/api/erp/finance/voucher.ts | 47 |
| 561 | POST | `/api/erp/vouchers/import/u8` | erp | apps/web/src/api/erp/finance/voucher.ts | 55 |
| 562 | GET | `/api/erp/health` | erp | apps/web/src/api/erp/index.ts | 63 |
| 563 | GET | `/api/erp/dashboard` | erp | apps/web/src/api/erp/index.ts | 67 |
| 564 | POST | `/api/erp/master-data/sync/jobs` | erp | apps/web/src/api/erp/masterData.ts | 118 |
| 565 | GET | `/api/erp/master-data/sync/jobs/{param}` | erp | apps/web/src/api/erp/masterData.ts | 122 |
| 566 | POST | `/api/erp/master-data/sync/jobs/{param}/retry` | erp | apps/web/src/api/erp/masterData.ts | 132 |
| 567 | POST | `/api/erp/master-data/sync/jobs/{param}/cancel` | erp | apps/web/src/api/erp/masterData.ts | 136 |
| 568 | POST | `/api/erp/master-data/sync/jobs/{param}/compensate` | erp | apps/web/src/api/erp/masterData.ts | 140 |
| 569 | GET | `/api/erp/master-data/sync/stats` | erp | apps/web/src/api/erp/masterData.ts | 146 |
| 570 | GET | `/api/erp/master-data/sync/dead-letters` | erp | apps/web/src/api/erp/masterData.ts | 152 |
| 571 | POST | `/api/erp/master-data/sync/dead-letters/{param}/replay` | erp | apps/web/src/api/erp/masterData.ts | 156 |
| 572 | POST | `/api/erp/master-data/sync/dead-letters/batch-replay` | erp | apps/web/src/api/erp/masterData.ts | 160 |
| 573 | DELETE | `/api/erp/master-data/sync/dead-letters/{param}` | erp | apps/web/src/api/erp/masterData.ts | 164 |
| 574 | POST | `/api/erp/master-data/quality/tickets` | erp | apps/web/src/api/erp/masterData.ts | 427 |
| 575 | GET | `/api/erp/master-data/quality/tickets` | erp | apps/web/src/api/erp/masterData.ts | 433 |
| 576 | GET | `/api/erp/master-data/quality/tickets/{param}` | erp | apps/web/src/api/erp/masterData.ts | 437 |
| 577 | GET | `/api/erp/master-data/quality/tickets/{param}/history` | erp | apps/web/src/api/erp/masterData.ts | 441 |
| 578 | POST | `/api/erp/master-data/quality/tickets/{param}/assign` | erp | apps/web/src/api/erp/masterData.ts | 448 |
| 579 | POST | `/api/erp/master-data/quality/tickets/{param}/start` | erp | apps/web/src/api/erp/masterData.ts | 455 |
| 580 | POST | `/api/erp/master-data/quality/tickets/{param}/submit` | erp | apps/web/src/api/erp/masterData.ts | 462 |
| 581 | POST | `/api/erp/master-data/quality/tickets/{param}/verify` | erp | apps/web/src/api/erp/masterData.ts | 469 |
| 582 | POST | `/api/erp/master-data/quality/tickets/{param}/close` | erp | apps/web/src/api/erp/masterData.ts | 476 |
| 583 | POST | `/api/erp/master-data/quality/tickets/{param}/reject` | erp | apps/web/src/api/erp/masterData.ts | 483 |
| 584 | POST | `/api/erp/master-data/quality/tickets/{param}/escalate` | erp | apps/web/src/api/erp/masterData.ts | 490 |
| 585 | GET | `/api/erp/master-data/quality/loop-stats` | erp | apps/web/src/api/erp/masterData.ts | 496 |
| 586 | POST | `/api/erp/master-data/quality/repair-workflows` | erp | apps/web/src/api/erp/masterData.ts | 506 |
| 587 | GET | `/api/erp/master-data/quality/repair-workflows` | erp | apps/web/src/api/erp/masterData.ts | 512 |
| 588 | GET | `/api/erp/master-data/quality/repair-workflows/{param}` | erp | apps/web/src/api/erp/masterData.ts | 518 |
| 589 | POST | `/api/erp/master-data/quality/repair-workflows/{param}/execute` | erp | apps/web/src/api/erp/masterData.ts | 522 |
| 590 | POST | `/api/erp/master-data/quality/repair-workflows/{param}/approve` | erp | apps/web/src/api/erp/masterData.ts | 531 |
| 591 | POST | `/api/erp/master-data/quality/repair-workflows/{param}/verify` | erp | apps/web/src/api/erp/masterData.ts | 538 |
| 592 | POST | `/api/erp/master-data/quality/repair-workflows/{param}/steps/{param}/execute` | erp | apps/web/src/api/erp/masterData.ts | 542 |
| 593 | POST | `/api/erp/master-data/domains` | erp | apps/web/src/api/erp/masterData.ts | 554 |
| 594 | GET | `/api/erp/master-data/domains` | erp | apps/web/src/api/erp/masterData.ts | 558 |
| 595 | GET | `/api/erp/master-data/domains/{param}` | erp | apps/web/src/api/erp/masterData.ts | 562 |
| 596 | PUT | `/api/erp/master-data/domains/{param}` | erp | apps/web/src/api/erp/masterData.ts | 569 |
| 597 | GET | `/api/erp/master-data/ownership-matrix/{param}` | erp | apps/web/src/api/erp/masterData.ts | 575 |
| 598 | PUT | `/api/erp/master-data/ownership-matrix/{param}` | erp | apps/web/src/api/erp/masterData.ts | 582 |
| 599 | GET | `/api/erp/master-data/entities/{param}/owner` | erp | apps/web/src/api/erp/masterData.ts | 591 |
| 600 | GET | `/api/erp/master-data/graph` | erp | apps/web/src/api/erp/masterData.ts | 780 |
| 601 | GET | `/api/erp/master-data/graph/nodes/{param}` | erp | apps/web/src/api/erp/masterData.ts | 784 |
| 602 | GET | `/api/erp/master-data/graph/nodes/{param}/neighbors` | erp | apps/web/src/api/erp/masterData.ts | 791 |
| 603 | GET | `/api/erp/master-data/graph/shortest-path` | erp | apps/web/src/api/erp/masterData.ts | 797 |
| 604 | GET | `/api/erp/master-data/graph/nodes/{param}/multi-hop` | erp | apps/web/src/api/erp/masterData.ts | 806 |
| 605 | GET | `/api/erp/master-data/graph/stats` | erp | apps/web/src/api/erp/masterData.ts | 812 |
| 606 | GET | `/api/erp/master-data/knowledge/concepts/{param}` | erp | apps/web/src/api/erp/masterData.ts | 828 |
| 607 | GET | `/api/erp/master-data/knowledge/inference-rules` | erp | apps/web/src/api/erp/masterData.ts | 840 |
| 608 | POST | `/api/erp/master-data/knowledge/inference` | erp | apps/web/src/api/erp/masterData.ts | 844 |
| 609 | GET | `/api/erp/master-data/recommendations/similar` | erp | apps/web/src/api/erp/masterData.ts | 854 |
| 610 | GET | `/api/erp/master-data/recommendations/associations` | erp | apps/web/src/api/erp/masterData.ts | 860 |
| 611 | GET | `/api/erp/master-data/recommendations/completions` | erp | apps/web/src/api/erp/masterData.ts | 869 |
| 612 | POST | `/api/erp/master-data/sync/v2/jobs` | erp | apps/web/src/api/erp/masterData.ts | 1088 |
| 613 | GET | `/api/erp/master-data/sync/v2/jobs/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1092 |
| 614 | POST | `/api/erp/master-data/sync/v2/dead-letters/{param}/retry` | erp | apps/web/src/api/erp/masterData.ts | 1102 |
| 615 | POST | `/api/erp/master-data/sync/v2/dead-letters/batch-retry` | erp | apps/web/src/api/erp/masterData.ts | 1108 |
| 616 | GET | `/api/erp/master-data/sync/v2/stats` | erp | apps/web/src/api/erp/masterData.ts | 1112 |
| 617 | POST | `/api/erp/master-data/services/register` | erp | apps/web/src/api/erp/masterData.ts | 1145 |
| 618 | POST | `/api/erp/master-data/services/{param}/deregister` | erp | apps/web/src/api/erp/masterData.ts | 1151 |
| 619 | POST | `/api/erp/master-data/services/{param}/heartbeat` | erp | apps/web/src/api/erp/masterData.ts | 1155 |
| 620 | GET | `/api/erp/master-data/services` | erp | apps/web/src/api/erp/masterData.ts | 1159 |
| 621 | GET | `/api/erp/master-data/services/{param}/health` | erp | apps/web/src/api/erp/masterData.ts | 1163 |
| 622 | POST | `/api/erp/master-data/gateway/route` | erp | apps/web/src/api/erp/masterData.ts | 1213 |
| 623 | POST | `/api/erp/master-data/gateway/batch` | erp | apps/web/src/api/erp/masterData.ts | 1217 |
| 624 | GET | `/api/erp/master-data/gateway/stats` | erp | apps/web/src/api/erp/masterData.ts | 1225 |
| 625 | POST | `/api/erp/master-data/quality-ai/score/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1313 |
| 626 | POST | `/api/erp/master-data/quality-ai/batch-score` | erp | apps/web/src/api/erp/masterData.ts | 1317 |
| 627 | POST | `/api/erp/master-data/quality-ai/predict/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1333 |
| 628 | GET | `/api/erp/master-data/quality-ai/stats` | erp | apps/web/src/api/erp/masterData.ts | 1341 |
| 629 | POST | `/api/erp/master-data/matching/find-matches/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1414 |
| 630 | GET | `/api/erp/master-data/matching/duplicate-groups` | erp | apps/web/src/api/erp/masterData.ts | 1426 |
| 631 | POST | `/api/erp/master-data/matching/suggest-merge` | erp | apps/web/src/api/erp/masterData.ts | 1432 |
| 632 | POST | `/api/erp/master-data/classification/classify/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1523 |
| 633 | POST | `/api/erp/master-data/classification/batch-classify` | erp | apps/web/src/api/erp/masterData.ts | 1527 |
| 634 | GET | `/api/erp/master-data/classification/suggest-tags/{param}` | erp | apps/web/src/api/erp/masterData.ts | 1534 |
| 635 | GET | `/api/erp/master-data/classification/categories` | erp | apps/web/src/api/erp/masterData.ts | 1538 |
| 636 | POST | `/api/erp/master-data/classification/learn-rule` | erp | apps/web/src/api/erp/masterData.ts | 1542 |
| 637 | GET | `/api/erp/master-data/classification/stats` | erp | apps/web/src/api/erp/masterData.ts | 1546 |
| 638 | GET | `/api/integration/external-erp/connections` | integration | apps/web/src/api/external-erp/connection.ts | 12 |
| 639 | GET | `/api/integration/external-erp/connections/{param}` | integration | apps/web/src/api/external-erp/connection.ts | 16 |
| 640 | POST | `/api/integration/external-erp/connections` | integration | apps/web/src/api/external-erp/connection.ts | 27 |
| 641 | PUT | `/api/integration/external-erp/connections/{param}` | integration | apps/web/src/api/external-erp/connection.ts | 32 |
| 642 | DELETE | `/api/integration/external-erp/connections/{param}` | integration | apps/web/src/api/external-erp/connection.ts | 34 |
| 643 | PUT | `/api/integration/external-erp/connections/{param}/toggle` | integration | apps/web/src/api/external-erp/connection.ts | 37 |
| 644 | POST | `/api/integration/external-erp/connections/{param}/sync-status` | integration | apps/web/src/api/external-erp/connection.ts | 45 |
| 645 | GET | `/api/integration/external-erp/connections/{param}/company-mappings` | integration | apps/web/src/api/external-erp/connection.ts | 48 |
| 646 | POST | `/api/integration/external-erp/connections/{param}/company-mappings` | integration | apps/web/src/api/external-erp/connection.ts | 51 |
| 647 | PUT | `/api/integration/external-erp/connections/{param}/company-mappings/{param}` | integration | apps/web/src/api/external-erp/connection.ts | 54 |
| 648 | DELETE | `/api/integration/external-erp/connections/{param}/company-mappings/{param}` | integration | apps/web/src/api/external-erp/connection.ts | 60 |
| 649 | GET | `/api/integration/external-erp/connections/{param}/account-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 19 |
| 650 | POST | `/api/integration/external-erp/connections/{param}/account-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 22 |
| 651 | PUT | `/api/integration/external-erp/connections/{param}/account-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 27 |
| 652 | DELETE | `/api/integration/external-erp/connections/{param}/account-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 33 |
| 653 | POST | `/api/integration/external-erp/connections/{param}/account-mappings/auto-match` | integration | apps/web/src/api/external-erp/mapping.ts | 38 |
| 654 | GET | `/api/integration/external-erp/connections/{param}/customer-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 50 |
| 655 | POST | `/api/integration/external-erp/connections/{param}/customer-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 55 |
| 656 | PUT | `/api/integration/external-erp/connections/{param}/customer-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 64 |
| 657 | DELETE | `/api/integration/external-erp/connections/{param}/customer-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 70 |
| 658 | GET | `/api/integration/external-erp/connections/{param}/supplier-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 81 |
| 659 | POST | `/api/integration/external-erp/connections/{param}/supplier-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 86 |
| 660 | PUT | `/api/integration/external-erp/connections/{param}/supplier-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 95 |
| 661 | DELETE | `/api/integration/external-erp/connections/{param}/supplier-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 101 |
| 662 | GET | `/api/integration/external-erp/connections/{param}/project-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 112 |
| 663 | POST | `/api/integration/external-erp/connections/{param}/project-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 115 |
| 664 | PUT | `/api/integration/external-erp/connections/{param}/project-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 120 |
| 665 | DELETE | `/api/integration/external-erp/connections/{param}/project-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 126 |
| 666 | GET | `/api/integration/external-erp/connections/{param}/department-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 137 |
| 667 | POST | `/api/integration/external-erp/connections/{param}/department-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 142 |
| 668 | PUT | `/api/integration/external-erp/connections/{param}/department-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 151 |
| 669 | DELETE | `/api/integration/external-erp/connections/{param}/department-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 157 |
| 670 | GET | `/api/integration/external-erp/connections/{param}/employee-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 168 |
| 671 | POST | `/api/integration/external-erp/connections/{param}/employee-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 173 |
| 672 | PUT | `/api/integration/external-erp/connections/{param}/employee-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 182 |
| 673 | DELETE | `/api/integration/external-erp/connections/{param}/employee-mappings/{param}` | integration | apps/web/src/api/external-erp/mapping.ts | 188 |
| 674 | GET | `/api/integration/external-erp/connections/{param}/preview/accounts` | integration | apps/web/src/api/external-erp/preview.ts | 12 |
| 675 | GET | `/api/integration/external-erp/connections/{param}/preview/customers` | integration | apps/web/src/api/external-erp/preview.ts | 22 |
| 676 | GET | `/api/integration/external-erp/connections/{param}/preview/suppliers` | integration | apps/web/src/api/external-erp/preview.ts | 34 |
| 677 | GET | `/api/integration/external-erp/connections/{param}/preview/vouchers` | integration | apps/web/src/api/external-erp/preview.ts | 47 |
| 678 | POST | `/api/integration/external-erp/sync/accounts` | integration | apps/web/src/api/external-erp/sync.ts | 12 |
| 679 | POST | `/api/integration/external-erp/sync/customers` | integration | apps/web/src/api/external-erp/sync.ts | 15 |
| 680 | POST | `/api/integration/external-erp/sync/suppliers` | integration | apps/web/src/api/external-erp/sync.ts | 18 |
| 681 | POST | `/api/integration/external-erp/sync/projects` | integration | apps/web/src/api/external-erp/sync.ts | 25 |
| 682 | POST | `/api/integration/external-erp/sync/departments` | integration | apps/web/src/api/external-erp/sync.ts | 32 |
| 683 | POST | `/api/integration/external-erp/sync/employees` | integration | apps/web/src/api/external-erp/sync.ts | 39 |
| 684 | POST | `/api/integration/external-erp/sync/vouchers` | integration | apps/web/src/api/external-erp/sync.ts | 42 |
| 685 | POST | `/api/integration/external-erp/sync/invoices` | integration | apps/web/src/api/external-erp/sync.ts | 45 |
| 686 | POST | `/api/integration/external-erp/sync/full` | integration | apps/web/src/api/external-erp/sync.ts | 48 |
| 687 | POST | `/api/integration/external-erp/sync/{param}/cancel` | integration | apps/web/src/api/external-erp/sync.ts | 51 |
| 688 | GET | `/api/integration/external-erp/sync-logs` | integration | apps/web/src/api/external-erp/syncLogs.ts | 13 |
| 689 | GET | `/api/integration/external-erp/sync-logs/{param}` | integration | apps/web/src/api/external-erp/syncLogs.ts | 17 |
| 690 | GET | `/api/integration/external-erp/connections/{param}/sync-statistics` | integration | apps/web/src/api/external-erp/syncLogs.ts | 26 |
| 691 | DELETE | `/api/core/feedbacks/batch` | core | apps/web/src/api/feedback/index.ts | 38 |
| 692 | DELETE | `/api/core/file/files/{param}/permissions/revoke/{param}/{param}/{param}` | file | apps/web/src/api/file/index.ts | 152 |
| 693 | GET | `/api/core/file/files/stats` | file | apps/web/src/api/file/index.ts | 162 |
| 694 | GET | `/api/core/file/health` | file | apps/web/src/api/file/index.ts | 170 |
| 695 | GET | `/api/finance/accounts/tree` | finance | apps/web/src/api/finance/account.ts | 44 |
| 696 | POST | `/api/finance/accounts/{param}/children-batch` | finance | apps/web/src/api/finance/account.ts | 79 |
| 697 | GET | `/api/finance/accounts/opening-balances` | finance | apps/web/src/api/finance/account.ts | 101 |
| 698 | POST | `/api/finance/accounts/{param}/opening-balance` | finance | apps/web/src/api/finance/account.ts | 110 |
| 699 | POST | `/api/finance/accounts/opening-balances/carry-forward` | finance | apps/web/src/api/finance/account.ts | 118 |
| 700 | GET | `/api/finance/approval-configs` | finance | apps/web/src/api/finance/approvalConfig.ts | 50 |
| 701 | GET | `/api/finance/approval-configs/{param}` | finance | apps/web/src/api/finance/approvalConfig.ts | 54 |
| 702 | POST | `/api/finance/approval-configs` | finance | apps/web/src/api/finance/approvalConfig.ts | 58 |
| 703 | PUT | `/api/finance/approval-configs/{param}` | finance | apps/web/src/api/finance/approvalConfig.ts | 62 |
| 704 | DELETE | `/api/finance/approval-configs/{param}` | finance | apps/web/src/api/finance/approvalConfig.ts | 66 |
| 705 | GET | `/api/finance/counterparty/customers/{param}` | finance | apps/web/src/api/finance/counterparty.ts | 12 |
| 706 | PUT | `/api/finance/counterparty/customers/{param}` | finance | apps/web/src/api/finance/counterparty.ts | 19 |
| 707 | GET | `/api/finance/counterparty/suppliers/{param}` | finance | apps/web/src/api/finance/counterparty.ts | 23 |
| 708 | PUT | `/api/finance/counterparty/suppliers/{param}` | finance | apps/web/src/api/finance/counterparty.ts | 30 |
| 709 | GET | `/api/finance/counterparty/customers` | finance | apps/web/src/api/finance/counterparty.ts | 40 |
| 710 | GET | `/api/finance/counterparty/suppliers` | finance | apps/web/src/api/finance/counterparty.ts | 52 |
| 711 | GET | `/api/finance/expense-approvals` | finance | apps/web/src/api/finance/expenseApproval.ts | 76 |
| 712 | POST | `/api/finance/expense-approvals` | finance | apps/web/src/api/finance/expenseApproval.ts | 80 |
| 713 | GET | `/api/finance/expense-approvals/{param}` | finance | apps/web/src/api/finance/expenseApproval.ts | 84 |
| 714 | PUT | `/api/finance/expense-approvals/{param}` | finance | apps/web/src/api/finance/expenseApproval.ts | 91 |
| 715 | DELETE | `/api/finance/expense-approvals/{param}` | finance | apps/web/src/api/finance/expenseApproval.ts | 95 |
| 716 | POST | `/api/finance/expense-approvals/{param}/submit` | finance | apps/web/src/api/finance/expenseApproval.ts | 99 |
| 717 | POST | `/api/finance/expense-approvals/{param}/approve` | finance | apps/web/src/api/finance/expenseApproval.ts | 103 |
| 718 | POST | `/api/finance/expense-approvals/{param}/reject` | finance | apps/web/src/api/finance/expenseApproval.ts | 107 |
| 719 | GET | `/api/finance/dashboard` | finance | apps/web/src/api/finance/index.ts | 47 |
| 720 | GET | `/api/finance/payments` | finance | apps/web/src/api/finance/payment.ts | 96 |
| 721 | GET | `/api/finance/payments/{param}` | finance | apps/web/src/api/finance/payment.ts | 100 |
| 722 | POST | `/api/finance/payments` | finance | apps/web/src/api/finance/payment.ts | 104 |
| 723 | PUT | `/api/finance/payments/{param}` | finance | apps/web/src/api/finance/payment.ts | 108 |
| 724 | DELETE | `/api/finance/payments/{param}` | finance | apps/web/src/api/finance/payment.ts | 112 |
| 725 | POST | `/api/finance/payments/{param}/submit` | finance | apps/web/src/api/finance/payment.ts | 116 |
| 726 | POST | `/api/finance/payments/{param}/approve` | finance | apps/web/src/api/finance/payment.ts | 120 |
| 727 | POST | `/api/finance/payments/{param}/reject` | finance | apps/web/src/api/finance/payment.ts | 124 |
| 728 | POST | `/api/finance/payments/{param}/execute` | finance | apps/web/src/api/finance/payment.ts | 128 |
| 729 | POST | `/api/finance/payments/write-off` | finance | apps/web/src/api/finance/payment.ts | 132 |
| 730 | POST | `/api/finance/payments/export` | finance | apps/web/src/api/finance/payment.ts | 136 |
| 731 | GET | `/api/finance/period/current` | finance | apps/web/src/api/finance/period.ts | 6 |
| 732 | GET | `/api/finance/periods` | finance | apps/web/src/api/finance/period.ts | 24 |
| 733 | POST | `/api/finance/periods/open` | finance | apps/web/src/api/finance/period.ts | 28 |
| 734 | POST | `/api/finance/periods/close` | finance | apps/web/src/api/finance/period.ts | 32 |
| 735 | POST | `/api/finance/periods/close-income` | finance | apps/web/src/api/finance/period.ts | 36 |
| 736 | POST | `/api/finance/periods/year-end-close` | finance | apps/web/src/api/finance/period.ts | 48 |
| 737 | GET | `/api/finance/receivables` | finance | apps/web/src/api/finance/receivablePayable.ts | 20 |
| 738 | GET | `/api/finance/receivables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 24 |
| 739 | POST | `/api/finance/receivables` | finance | apps/web/src/api/finance/receivablePayable.ts | 28 |
| 740 | PUT | `/api/finance/receivables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 35 |
| 741 | DELETE | `/api/finance/receivables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 39 |
| 742 | GET | `/api/finance/payables` | finance | apps/web/src/api/finance/receivablePayable.ts | 50 |
| 743 | GET | `/api/finance/payables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 54 |
| 744 | POST | `/api/finance/payables` | finance | apps/web/src/api/finance/receivablePayable.ts | 60 |
| 745 | PUT | `/api/finance/payables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 67 |
| 746 | DELETE | `/api/finance/payables/{param}` | finance | apps/web/src/api/finance/receivablePayable.ts | 71 |
| 747 | GET | `/api/finance/ar/collections` | finance | apps/web/src/api/finance/receivablePayable.ts | 81 |
| 748 | POST | `/api/finance/ar/collections` | finance | apps/web/src/api/finance/receivablePayable.ts | 85 |
| 749 | GET | `/api/finance/ap/payments` | finance | apps/web/src/api/finance/receivablePayable.ts | 95 |
| 750 | POST | `/api/finance/ap/payments` | finance | apps/web/src/api/finance/receivablePayable.ts | 99 |
| 751 | POST | `/api/finance/ap/payments/{param}/approve` | finance | apps/web/src/api/finance/receivablePayable.ts | 103 |
| 752 | POST | `/api/finance/ap/payments/{param}/reject` | finance | apps/web/src/api/finance/receivablePayable.ts | 107 |
| 753 | POST | `/api/finance/reconcile` | finance | apps/web/src/api/finance/receivablePayable.ts | 115 |
| 754 | POST | `/api/finance/reconcile/auto` | finance | apps/web/src/api/finance/receivablePayable.ts | 123 |
| 755 | GET | `/api/finance/ar/aging` | finance | apps/web/src/api/finance/receivablePayable.ts | 145 |
| 756 | GET | `/api/finance/ap/aging` | finance | apps/web/src/api/finance/receivablePayable.ts | 167 |
| 757 | GET | `/api/finance/reports/balance-sheet` | finance | apps/web/src/api/finance/report.ts | 14 |
| 758 | GET | `/api/finance/reports/income-statement` | finance | apps/web/src/api/finance/report.ts | 20 |
| 759 | GET | `/api/finance/reports/cash-flow` | finance | apps/web/src/api/finance/report.ts | 26 |
| 760 | GET | `/api/finance/reports/account-balance` | finance | apps/web/src/api/finance/report.ts | 43 |
| 761 | GET | `/api/finance/reports/account-ledger` | finance | apps/web/src/api/finance/report.ts | 70 |
| 762 | GET | `/api/finance/reports/dimension-detail` | finance | apps/web/src/api/finance/report.ts | 82 |
| 763 | GET | `/api/finance/vouchers/{param}/entries` | finance | apps/web/src/api/finance/voucher.ts | 42 |
| 764 | GET | `/api/finance/vouchers/{param}/items` | finance | apps/web/src/api/finance/voucher.ts | 46 |
| 765 | POST | `/api/finance/vouchers/batch` | finance | apps/web/src/api/finance/voucher.ts | 64 |
| 766 | POST | `/api/finance/vouchers/batch-delete` | finance | apps/web/src/api/finance/voucher.ts | 81 |
| 767 | POST | `/api/finance/vouchers/{param}/unapprove` | finance | apps/web/src/api/finance/voucher.ts | 107 |
| 768 | POST | `/api/finance/vouchers/{param}/reverse` | finance | apps/web/src/api/finance/voucher.ts | 121 |
| 769 | GET | `/api/finance/vouchers/next-no` | finance | apps/web/src/api/finance/voucher.ts | 130 |
| 770 | POST | `/api/finance/vouchers/generate` | finance | apps/web/src/api/finance/voucher.ts | 139 |
| 771 | POST | `/api/finance/vouchers/import` | finance | apps/web/src/api/finance/voucher.ts | 154 |
| 772 | POST | `/api/finance/vouchers/import/u8` | finance | apps/web/src/api/finance/voucher.ts | 170 |
| 773 | POST | `/api/finance/reports/balance-sheet/generate` | finance | apps/web/src/api/financialReport/index.ts | 58 |
| 774 | GET | `/api/finance/reports/balance-sheet` | finance | apps/web/src/api/financialReport/index.ts | 64 |
| 775 | GET | `/api/finance/reports/balance-sheet/history` | finance | apps/web/src/api/financialReport/index.ts | 76 |
| 776 | POST | `/api/finance/reports/income-statement/generate` | finance | apps/web/src/api/financialReport/index.ts | 89 |
| 777 | GET | `/api/finance/reports/income-statement` | finance | apps/web/src/api/financialReport/index.ts | 95 |
| 778 | GET | `/api/finance/reports/income-statement/history` | finance | apps/web/src/api/financialReport/index.ts | 107 |
| 779 | POST | `/api/finance/reports/cash-flow/generate` | finance | apps/web/src/api/financialReport/index.ts | 120 |
| 780 | GET | `/api/finance/reports/cash-flow` | finance | apps/web/src/api/financialReport/index.ts | 126 |
| 781 | GET | `/api/finance/reports/cash-flow/history` | finance | apps/web/src/api/financialReport/index.ts | 138 |
| 782 | POST | `/api/finance/reports/submit-approval` | finance | apps/web/src/api/financialReport/index.ts | 150 |
| 783 | POST | `/api/finance/reports/approve` | finance | apps/web/src/api/financialReport/index.ts | 159 |
| 784 | POST | `/api/finance/reports/reject` | finance | apps/web/src/api/financialReport/index.ts | 168 |
| 785 | POST | `/api/finance/reports/lock` | finance | apps/web/src/api/financialReport/index.ts | 176 |
| 786 | POST | `/api/finance/reports/unlock` | finance | apps/web/src/api/financialReport/index.ts | 184 |
| 787 | GET | `/api/finance/reports/item-details` | finance | apps/web/src/api/financialReport/index.ts | 198 |
| 788 | GET | `/api/finance/reports/item-vouchers` | finance | apps/web/src/api/financialReport/index.ts | 210 |
| 789 | GET | `/api/finance/reports/comparison` | finance | apps/web/src/api/financialReport/index.ts | 225 |
| 790 | GET | `/api/finance/reports/trend` | finance | apps/web/src/api/financialReport/index.ts | 237 |
| 791 | GET | `/api/finance/reports/year-over-year` | finance | apps/web/src/api/financialReport/index.ts | 248 |
| 792 | GET | `/api/finance/reports/period-over-period` | finance | apps/web/src/api/financialReport/index.ts | 259 |
| 793 | POST | `/api/finance/reports/consolidated/generate` | finance | apps/web/src/api/financialReport/index.ts | 274 |
| 794 | GET | `/api/finance/reports/consolidated/{param}` | finance | apps/web/src/api/financialReport/index.ts | 287 |
| 795 | GET | `/api/finance/reports/consolidated/entities` | finance | apps/web/src/api/financialReport/index.ts | 299 |
| 796 | POST | `/api/finance/reports/consolidated/entities` | finance | apps/web/src/api/financialReport/index.ts | 311 |
| 797 | PUT | `/api/finance/reports/consolidated/entities/{param}` | finance | apps/web/src/api/financialReport/index.ts | 317 |
| 798 | DELETE | `/api/finance/reports/consolidated/entities/{param}` | finance | apps/web/src/api/financialReport/index.ts | 323 |
| 799 | GET | `/api/finance/reports/consolidated/elims` | finance | apps/web/src/api/financialReport/index.ts | 333 |
| 800 | POST | `/api/finance/reports/consolidated/elims` | finance | apps/web/src/api/financialReport/index.ts | 345 |
| 801 | POST | `/api/finance/reports/export/batch` | finance | apps/web/src/api/financialReport/index.ts | 376 |
| 802 | GET | `/api/finance/reports/subscriptions` | finance | apps/web/src/api/financialReport/index.ts | 411 |
| 803 | POST | `/api/finance/reports/subscriptions` | finance | apps/web/src/api/financialReport/index.ts | 428 |
| 804 | PUT | `/api/finance/reports/subscriptions/{param}` | finance | apps/web/src/api/financialReport/index.ts | 434 |
| 805 | DELETE | `/api/finance/reports/subscriptions/{param}` | finance | apps/web/src/api/financialReport/index.ts | 440 |
| 806 | POST | `/api/finance/reports/subscriptions/{param}/send-now` | finance | apps/web/src/api/financialReport/index.ts | 446 |
| 807 | GET | `/api/finance/reports/subscriptions/{param}/history` | finance | apps/web/src/api/financialReport/index.ts | 458 |
| 808 | GET | `/api/gis/business-locations` | gis | apps/web/src/api/gis/business.ts | 21 |
| 809 | GET | `/api/gis/business-locations/{param}` | gis | apps/web/src/api/gis/business.ts | 29 |
| 810 | GET | `/api/gis/business-locations/type/{param}` | gis | apps/web/src/api/gis/business.ts | 40 |
| 811 | POST | `/api/gis/business-locations` | gis | apps/web/src/api/gis/business.ts | 52 |
| 812 | PUT | `/api/gis/business-locations/{param}` | gis | apps/web/src/api/gis/business.ts | 59 |
| 813 | DELETE | `/api/gis/business-locations/{param}` | gis | apps/web/src/api/gis/business.ts | 63 |
| 814 | GET | `/api/gis/device-locations` | gis | apps/web/src/api/gis/device.ts | 23 |
| 815 | GET | `/api/gis/device-locations/{param}` | gis | apps/web/src/api/gis/device.ts | 43 |
| 816 | POST | `/api/gis/device-locations` | gis | apps/web/src/api/gis/device.ts | 60 |
| 817 | PUT | `/api/gis/device-locations/{param}` | gis | apps/web/src/api/gis/device.ts | 67 |
| 818 | DELETE | `/api/gis/device-locations/{param}` | gis | apps/web/src/api/gis/device.ts | 71 |
| 819 | GET | `/api/gis/device-tracks/{param}/statistics` | gis | apps/web/src/api/gis/device.ts | 101 |
| 820 | GET | `/api/gis/device-tracks/devices` | gis | apps/web/src/api/gis/device.ts | 112 |
| 821 | GET | `/api/gis/fences` | gis | apps/web/src/api/gis/fence.ts | 34 |
| 822 | GET | `/api/gis/fences/{param}` | gis | apps/web/src/api/gis/fence.ts | 38 |
| 823 | POST | `/api/gis/fences` | gis | apps/web/src/api/gis/fence.ts | 42 |
| 824 | PUT | `/api/gis/fences/{param}` | gis | apps/web/src/api/gis/fence.ts | 49 |
| 825 | DELETE | `/api/gis/fences/{param}` | gis | apps/web/src/api/gis/fence.ts | 53 |
| 826 | GET | `/api/gis/statistics` | gis | apps/web/src/api/gis/map.ts | 19 |
| 827 | GET | `/api/gis/factory-maps` | gis | apps/web/src/api/gis/map.ts | 30 |
| 828 | GET | `/api/gis/factory-maps/{param}` | gis | apps/web/src/api/gis/map.ts | 38 |
| 829 | POST | `/api/gis/factory-maps` | gis | apps/web/src/api/gis/map.ts | 42 |
| 830 | PUT | `/api/gis/factory-maps/{param}` | gis | apps/web/src/api/gis/map.ts | 49 |
| 831 | DELETE | `/api/gis/factory-maps/{param}` | gis | apps/web/src/api/gis/map.ts | 53 |
| 832 | GET | `/api/gis/map-markers` | gis | apps/web/src/api/gis/map.ts | 64 |
| 833 | POST | `/api/gis/map-markers` | gis | apps/web/src/api/gis/map.ts | 72 |
| 834 | PUT | `/api/gis/map-markers/{param}` | gis | apps/web/src/api/gis/map.ts | 79 |
| 835 | DELETE | `/api/gis/map-markers/{param}` | gis | apps/web/src/api/gis/map.ts | 83 |
| 836 | GET | `/api/gis/search` | gis | apps/web/src/api/gis/map.ts | 89 |
| 837 | GET | `/api/gis/geojson/export` | gis | apps/web/src/api/gis/map.ts | 93 |
| 838 | GET | `/api/gis/health` | gis | apps/web/src/api/gis/map.ts | 97 |
| 839 | POST | `/api/gis/import` | gis | apps/web/src/api/gis/map.ts | 104 |
| 840 | GET | `/api/gis/pipelines` | gis | apps/web/src/api/gis/pipeline.ts | 16 |
| 841 | GET | `/api/gis/pipelines/{param}` | gis | apps/web/src/api/gis/pipeline.ts | 24 |
| 842 | POST | `/api/gis/pipelines` | gis | apps/web/src/api/gis/pipeline.ts | 41 |
| 843 | PUT | `/api/gis/pipelines/{param}` | gis | apps/web/src/api/gis/pipeline.ts | 48 |
| 844 | DELETE | `/api/gis/pipelines/{param}` | gis | apps/web/src/api/gis/pipeline.ts | 52 |
| 845 | GET | `/api/gis/warehouse-locations` | gis | apps/web/src/api/gis/storage.ts | 24 |
| 846 | GET | `/api/gis/warehouse-locations/{param}` | gis | apps/web/src/api/gis/storage.ts | 32 |
| 847 | POST | `/api/gis/warehouse-locations` | gis | apps/web/src/api/gis/storage.ts | 51 |
| 848 | PUT | `/api/gis/warehouse-locations/{param}` | gis | apps/web/src/api/gis/storage.ts | 58 |
| 849 | DELETE | `/api/gis/warehouse-locations/{param}` | gis | apps/web/src/api/gis/storage.ts | 62 |
| 850 | GET | `/api/gis/location-photos` | gis | apps/web/src/api/gis/storage.ts | 73 |
| 851 | GET | `/api/gis/location-photos/{param}` | gis | apps/web/src/api/gis/storage.ts | 81 |
| 852 | POST | `/api/gis/location-photos` | gis | apps/web/src/api/gis/storage.ts | 100 |
| 853 | DELETE | `/api/gis/location-photos/{param}` | gis | apps/web/src/api/gis/storage.ts | 104 |
| 854 | GET | `/api/hrm/attendance` | hrm | apps/web/src/api/hrm/attendance.ts | 9 |
| 855 | GET | `/api/hrm/attendance/{param}` | hrm | apps/web/src/api/hrm/attendance.ts | 13 |
| 856 | POST | `/api/hrm/attendance` | hrm | apps/web/src/api/hrm/attendance.ts | 17 |
| 857 | PUT | `/api/hrm/attendance/{param}` | hrm | apps/web/src/api/hrm/attendance.ts | 21 |
| 858 | DELETE | `/api/hrm/attendance/{param}` | hrm | apps/web/src/api/hrm/attendance.ts | 25 |
| 859 | POST | `/api/hrm/attendance/check-in` | hrm | apps/web/src/api/hrm/attendance.ts | 29 |
| 860 | POST | `/api/hrm/attendance/check-out` | hrm | apps/web/src/api/hrm/attendance.ts | 33 |
| 861 | GET | `/api/hrm/contracts` | hrm | apps/web/src/api/hrm/contract.ts | 9 |
| 862 | GET | `/api/hrm/contracts/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 15 |
| 863 | POST | `/api/hrm/contracts` | hrm | apps/web/src/api/hrm/contract.ts | 19 |
| 864 | PUT | `/api/hrm/contracts/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 23 |
| 865 | DELETE | `/api/hrm/contracts/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 27 |
| 866 | GET | `/api/hrm/contracts/expiring` | hrm | apps/web/src/api/hrm/contract.ts | 36 |
| 867 | POST | `/api/hrm/contracts/{param}/renew` | hrm | apps/web/src/api/hrm/contract.ts | 43 |
| 868 | GET | `/api/hrm/contract-renewals` | hrm | apps/web/src/api/hrm/contract.ts | 50 |
| 869 | GET | `/api/hrm/contract-renewals/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 54 |
| 870 | PUT | `/api/hrm/contract-renewals/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 61 |
| 871 | DELETE | `/api/hrm/contract-renewals/{param}` | hrm | apps/web/src/api/hrm/contract.ts | 65 |
| 872 | PUT | `/api/hrm/contract-renewals/{param}/approve` | hrm | apps/web/src/api/hrm/contract.ts | 69 |
| 873 | PUT | `/api/hrm/contract-renewals/{param}/reject` | hrm | apps/web/src/api/hrm/contract.ts | 73 |
| 874 | PUT | `/api/hrm/contract-renewals/{param}/execute` | hrm | apps/web/src/api/hrm/contract.ts | 79 |
| 875 | GET | `/api/hrm/dashboard` | hrm | apps/web/src/api/hrm/dashboard.ts | 16 |
| 876 | GET | `/api/hrm/{param}` | hrm | apps/web/src/api/hrm/employee.ts | 23 |
| 877 | GET | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/employee.ts | 27 |
| 878 | PUT | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/employee.ts | 35 |
| 879 | DELETE | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/employee.ts | 39 |
| 880 | GET | `/api/hrm/employees/{param}/performance-reviews` | hrm | apps/web/src/api/hrm/employee.ts | 100 |
| 881 | GET | `/api/hrm/employees/{param}/performance-goals` | hrm | apps/web/src/api/hrm/employee.ts | 104 |
| 882 | GET | `/api/hrm/health` | hrm | apps/web/src/api/hrm/index.ts | 55 |
| 883 | GET | `/api/hrm/leaves` | hrm | apps/web/src/api/hrm/leave.ts | 9 |
| 884 | GET | `/api/hrm/leaves/{param}` | hrm | apps/web/src/api/hrm/leave.ts | 13 |
| 885 | POST | `/api/hrm/leaves` | hrm | apps/web/src/api/hrm/leave.ts | 17 |
| 886 | PUT | `/api/hrm/leaves/{param}` | hrm | apps/web/src/api/hrm/leave.ts | 21 |
| 887 | DELETE | `/api/hrm/leaves/{param}` | hrm | apps/web/src/api/hrm/leave.ts | 25 |
| 888 | PUT | `/api/hrm/leaves/{param}/approve` | hrm | apps/web/src/api/hrm/leave.ts | 29 |
| 889 | PUT | `/api/hrm/leaves/{param}/reject` | hrm | apps/web/src/api/hrm/leave.ts | 33 |
| 890 | GET | `/api/hrm/payroll-runs` | hrm | apps/web/src/api/hrm/payroll.ts | 16 |
| 891 | GET | `/api/hrm/payroll-runs/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 20 |
| 892 | POST | `/api/hrm/payroll-runs` | hrm | apps/web/src/api/hrm/payroll.ts | 24 |
| 893 | DELETE | `/api/hrm/payroll-runs/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 28 |
| 894 | PUT | `/api/hrm/payroll-runs/{param}/calculate` | hrm | apps/web/src/api/hrm/payroll.ts | 32 |
| 895 | PUT | `/api/hrm/payroll-runs/{param}/pay` | hrm | apps/web/src/api/hrm/payroll.ts | 36 |
| 896 | GET | `/api/hrm/payroll-items` | hrm | apps/web/src/api/hrm/payroll.ts | 43 |
| 897 | GET | `/api/hrm/payroll-items/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 47 |
| 898 | GET | `/api/hrm/salary-adjustments` | hrm | apps/web/src/api/hrm/payroll.ts | 54 |
| 899 | GET | `/api/hrm/salary-adjustments/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 57 |
| 900 | POST | `/api/hrm/salary-adjustments` | hrm | apps/web/src/api/hrm/payroll.ts | 60 |
| 901 | PUT | `/api/hrm/salary-adjustments/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 66 |
| 902 | DELETE | `/api/hrm/salary-adjustments/{param}` | hrm | apps/web/src/api/hrm/payroll.ts | 69 |
| 903 | PUT | `/api/hrm/salary-adjustments/{param}/approve` | hrm | apps/web/src/api/hrm/payroll.ts | 72 |
| 904 | PUT | `/api/hrm/salary-adjustments/{param}/reject` | hrm | apps/web/src/api/hrm/payroll.ts | 81 |
| 905 | GET | `/api/hrm/{param}` | hrm | apps/web/src/api/hrm/performance.ts | 16 |
| 906 | GET | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/performance.ts | 20 |
| 907 | PUT | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/performance.ts | 28 |
| 908 | DELETE | `/api/hrm/{param}/{param}` | hrm | apps/web/src/api/hrm/performance.ts | 32 |
| 909 | GET | `/api/hrm/performance-reviews` | hrm | apps/web/src/api/hrm/performance.ts | 42 |
| 910 | PUT | `/api/hrm/performance-reviews/{param}/submit` | hrm | apps/web/src/api/hrm/performance.ts | 46 |
| 911 | PUT | `/api/hrm/performance-reviews/{param}/approve` | hrm | apps/web/src/api/hrm/performance.ts | 50 |
| 912 | GET | `/api/hrm/job-openings` | hrm | apps/web/src/api/hrm/recruitment.ts | 9 |
| 913 | GET | `/api/hrm/job-openings/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 13 |
| 914 | POST | `/api/hrm/job-openings` | hrm | apps/web/src/api/hrm/recruitment.ts | 17 |
| 915 | PUT | `/api/hrm/job-openings/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 21 |
| 916 | DELETE | `/api/hrm/job-openings/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 25 |
| 917 | PUT | `/api/hrm/job-openings/{param}/publish` | hrm | apps/web/src/api/hrm/recruitment.ts | 29 |
| 918 | PUT | `/api/hrm/job-openings/{param}/close` | hrm | apps/web/src/api/hrm/recruitment.ts | 33 |
| 919 | GET | `/api/hrm/candidates` | hrm | apps/web/src/api/hrm/recruitment.ts | 40 |
| 920 | GET | `/api/hrm/candidates/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 44 |
| 921 | POST | `/api/hrm/candidates` | hrm | apps/web/src/api/hrm/recruitment.ts | 48 |
| 922 | PUT | `/api/hrm/candidates/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 52 |
| 923 | DELETE | `/api/hrm/candidates/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 56 |
| 924 | GET | `/api/hrm/interviews` | hrm | apps/web/src/api/hrm/recruitment.ts | 63 |
| 925 | GET | `/api/hrm/interviews/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 67 |
| 926 | POST | `/api/hrm/interviews` | hrm | apps/web/src/api/hrm/recruitment.ts | 71 |
| 927 | PUT | `/api/hrm/interviews/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 75 |
| 928 | DELETE | `/api/hrm/interviews/{param}` | hrm | apps/web/src/api/hrm/recruitment.ts | 79 |
| 929 | PUT | `/api/hrm/interviews/{param}/complete` | hrm | apps/web/src/api/hrm/recruitment.ts | 83 |
| 930 | GET | `/api/hrm/training-plans` | hrm | apps/web/src/api/hrm/training.ts | 15 |
| 931 | GET | `/api/hrm/training-plans/{param}` | hrm | apps/web/src/api/hrm/training.ts | 19 |
| 932 | POST | `/api/hrm/training-plans` | hrm | apps/web/src/api/hrm/training.ts | 23 |
| 933 | PUT | `/api/hrm/training-plans/{param}` | hrm | apps/web/src/api/hrm/training.ts | 27 |
| 934 | DELETE | `/api/hrm/training-plans/{param}` | hrm | apps/web/src/api/hrm/training.ts | 31 |
| 935 | PUT | `/api/hrm/training-plans/{param}/activate` | hrm | apps/web/src/api/hrm/training.ts | 35 |
| 936 | PUT | `/api/hrm/training-plans/{param}/deactivate` | hrm | apps/web/src/api/hrm/training.ts | 39 |
| 937 | GET | `/api/hrm/training-courses` | hrm | apps/web/src/api/hrm/training.ts | 46 |
| 938 | GET | `/api/hrm/training-courses/{param}` | hrm | apps/web/src/api/hrm/training.ts | 50 |
| 939 | POST | `/api/hrm/training-courses` | hrm | apps/web/src/api/hrm/training.ts | 54 |
| 940 | PUT | `/api/hrm/training-courses/{param}` | hrm | apps/web/src/api/hrm/training.ts | 61 |
| 941 | DELETE | `/api/hrm/training-courses/{param}` | hrm | apps/web/src/api/hrm/training.ts | 65 |
| 942 | GET | `/api/hrm/training-records` | hrm | apps/web/src/api/hrm/training.ts | 72 |
| 943 | GET | `/api/hrm/training-records/{param}` | hrm | apps/web/src/api/hrm/training.ts | 76 |
| 944 | POST | `/api/hrm/training-records` | hrm | apps/web/src/api/hrm/training.ts | 80 |
| 945 | PUT | `/api/hrm/training-records/{param}` | hrm | apps/web/src/api/hrm/training.ts | 87 |
| 946 | DELETE | `/api/hrm/training-records/{param}` | hrm | apps/web/src/api/hrm/training.ts | 91 |
| 947 | POST | `/api/hrm/training-records/enroll` | hrm | apps/web/src/api/hrm/training.ts | 95 |
| 948 | PUT | `/api/hrm/training-records/{param}/complete` | hrm | apps/web/src/api/hrm/training.ts | 105 |
| 949 | POST | `/api/core/iam/auth/register` | iam | apps/web/src/api/iam/auth.ts | 19 |
| 950 | POST | `/api/core/iam/auth/login` | iam | apps/web/src/api/iam/auth.ts | 26 |
| 951 | POST | `/api/core/iam/auth/logout` | iam | apps/web/src/api/iam/auth.ts | 39 |
| 952 | POST | `/api/core/iam/auth/refresh` | iam | apps/web/src/api/iam/auth.ts | 51 |
| 953 | GET | `/api/core/iam/health` | iam | apps/web/src/api/iam/auth.ts | 63 |
| 954 | POST | `/api/core/iam/auth/forgot-password` | iam | apps/web/src/api/iam/auth.ts | 67 |
| 955 | POST | `/api/core/iam/auth/reset-password` | iam | apps/web/src/api/iam/auth.ts | 71 |
| 956 | GET | `/api/core/iam/auth/password-policy` | iam | apps/web/src/api/iam/auth.ts | 85 |
| 957 | PUT | `/api/core/iam/auth/password-policy` | iam | apps/web/src/api/iam/auth.ts | 97 |
| 958 | GET | `/api/core/iam/auth/sessions` | iam | apps/web/src/api/iam/auth.ts | 113 |
| 959 | DELETE | `/api/core/iam/auth/sessions/{param}` | iam | apps/web/src/api/iam/auth.ts | 117 |
| 960 | POST | `/api/core/iam/auth/sessions/revoke-all` | iam | apps/web/src/api/iam/auth.ts | 121 |
| 961 | GET | `/api/core/iam/auth/security-settings` | iam | apps/web/src/api/iam/auth.ts | 132 |
| 962 | PUT | `/api/core/iam/auth/security-settings` | iam | apps/web/src/api/iam/auth.ts | 141 |
| 963 | GET | `/api/core/iam/permissions` | iam | apps/web/src/api/iam/permission.ts | 7 |
| 964 | POST | `/api/core/iam/permissions` | iam | apps/web/src/api/iam/permission.ts | 11 |
| 965 | PUT | `/api/core/iam/permissions/{param}` | iam | apps/web/src/api/iam/permission.ts | 18 |
| 966 | DELETE | `/api/core/iam/permissions/{param}` | iam | apps/web/src/api/iam/permission.ts | 22 |
| 967 | GET | `/api/core/iam/roles` | iam | apps/web/src/api/iam/role.ts | 7 |
| 968 | GET | `/api/core/iam/roles/{param}` | iam | apps/web/src/api/iam/role.ts | 11 |
| 969 | POST | `/api/core/iam/roles` | iam | apps/web/src/api/iam/role.ts | 15 |
| 970 | PUT | `/api/core/iam/roles/{param}` | iam | apps/web/src/api/iam/role.ts | 19 |
| 971 | DELETE | `/api/core/iam/roles/{param}` | iam | apps/web/src/api/iam/role.ts | 23 |
| 972 | GET | `/api/core/iam/roles/{param}/permissions` | iam | apps/web/src/api/iam/role.ts | 27 |
| 973 | POST | `/api/core/iam/roles/{param}/permissions` | iam | apps/web/src/api/iam/role.ts | 31 |
| 974 | DELETE | `/api/core/iam/roles/{param}/permissions/{param}` | iam | apps/web/src/api/iam/role.ts | 40 |
| 975 | GET | `/api/core/iam/users/me` | iam | apps/web/src/api/iam/user.ts | 22 |
| 976 | GET | `/api/core/iam/users/me/permissions` | iam | apps/web/src/api/iam/user.ts | 26 |
| 977 | POST | `/api/core/iam/users/me/permissions/check` | iam | apps/web/src/api/iam/user.ts | 30 |
| 978 | GET | `/api/core/iam/users` | iam | apps/web/src/api/iam/user.ts | 44 |
| 979 | GET | `/api/core/iam/users/{param}` | iam | apps/web/src/api/iam/user.ts | 48 |
| 980 | PUT | `/api/core/iam/users/{param}` | iam | apps/web/src/api/iam/user.ts | 52 |
| 981 | PUT | `/api/core/iam/users/me` | iam | apps/web/src/api/iam/user.ts | 59 |
| 982 | POST | `/api/core/iam/users/me/password` | iam | apps/web/src/api/iam/user.ts | 66 |
| 983 | POST | `/api/core/iam/users/me/avatar` | iam | apps/web/src/api/iam/user.ts | 70 |
| 984 | GET | `/api/core/iam/users/me/preferences` | iam | apps/web/src/api/iam/user.ts | 74 |
| 985 | PUT | `/api/core/iam/users/me/preferences` | iam | apps/web/src/api/iam/user.ts | 83 |
| 986 | DELETE | `/api/core/iam/users/{param}` | iam | apps/web/src/api/iam/user.ts | 87 |
| 987 | POST | `/api/core/iam/users` | iam | apps/web/src/api/iam/user.ts | 96 |
| 988 | GET | `/api/core/iam/users/{param}/permissions` | iam | apps/web/src/api/iam/user.ts | 100 |
| 989 | GET | `/api/core/iam/users/{param}/roles` | iam | apps/web/src/api/iam/user.ts | 104 |
| 990 | POST | `/api/core/iam/users/{param}/roles/{param}` | iam | apps/web/src/api/iam/user.ts | 108 |
| 991 | DELETE | `/api/core/iam/users/{param}/roles/{param}` | iam | apps/web/src/api/iam/user.ts | 112 |
| 992 | GET | `/api/core/iam/users/{param}/effective-permissions` | iam | apps/web/src/api/iam/user.ts | 125 |
| 993 | POST | `/api/core/iam/users/batch-delete` | iam | apps/web/src/api/iam/user.ts | 131 |
| 994 | PUT | `/api/core/iam/users/batch-update` | iam | apps/web/src/api/iam/user.ts | 137 |
| 995 | GET | `/api/core/iam/users/check-email` | iam | apps/web/src/api/iam/user.ts | 141 |
| 996 | GET | `/api/core/iam/users/check-username` | iam | apps/web/src/api/iam/user.ts | 149 |
| 997 | GET | `/api/core/iam/users/{param}/login-history` | iam | apps/web/src/api/iam/user.ts | 170 |
| 998 | GET | `/api/core/iam/access-logs` | iam | apps/web/src/api/iam/user.ts | 177 |
| 999 | GET | `/api/core/iam/access-logs/user/{param}` | iam | apps/web/src/api/iam/user.ts | 188 |
| 1000 | POST | `/api/core/iam/access-logs` | iam | apps/web/src/api/iam/user.ts | 192 |
| 1001 | GET | `/api/communication/im/rooms` | im | apps/web/src/api/im/index.ts | 117 |
| 1002 | POST | `/api/communication/im/rooms` | im | apps/web/src/api/im/index.ts | 120 |
| 1003 | GET | `/api/communication/im/rooms/{param}` | im | apps/web/src/api/im/index.ts | 123 |
| 1004 | DELETE | `/api/communication/im/rooms/{param}` | im | apps/web/src/api/im/index.ts | 126 |
| 1005 | GET | `/api/communication/im/rooms/{param}/messages` | im | apps/web/src/api/im/index.ts | 129 |
| 1006 | POST | `/api/communication/im/rooms/{param}/messages` | im | apps/web/src/api/im/index.ts | 132 |
| 1007 | PUT | `/api/communication/im/messages/{param}/read` | im | apps/web/src/api/im/index.ts | 135 |
| 1008 | PUT | `/api/communication/im/messages/{param}` | im | apps/web/src/api/im/index.ts | 139 |
| 1009 | DELETE | `/api/communication/im/messages/{param}` | im | apps/web/src/api/im/index.ts | 145 |
| 1010 | GET | `/api/communication/im/rooms/{param}/members` | im | apps/web/src/api/im/index.ts | 149 |
| 1011 | POST | `/api/communication/im/rooms/{param}/members` | im | apps/web/src/api/im/index.ts | 153 |
| 1012 | DELETE | `/api/communication/im/rooms/{param}/members/{param}` | im | apps/web/src/api/im/index.ts | 162 |
| 1013 | GET | `/api/communication/im/project-groups` | im | apps/web/src/api/im/index.ts | 166 |
| 1014 | POST | `/api/communication/im/project-groups` | im | apps/web/src/api/im/index.ts | 171 |
| 1015 | GET | `/api/communication/im/notifications/{param}` | im | apps/web/src/api/im/index.ts | 175 |
| 1016 | POST | `/api/communication/im/notifications` | im | apps/web/src/api/im/index.ts | 180 |
| 1017 | PUT | `/api/communication/im/notifications/{param}/read` | im | apps/web/src/api/im/index.ts | 183 |
| 1018 | PUT | `/api/communication/im/notifications/{param}/read-all` | im | apps/web/src/api/im/index.ts | 186 |
| 1019 | GET | `/api/communication/im/health` | im | apps/web/src/api/im/index.ts | 190 |
| 1020 | GET | `/api/communication/im/online-status/{param}` | im | apps/web/src/api/im/index.ts | 206 |
| 1021 | GET | `/api/communication/im/contacts/{param}` | im | apps/web/src/api/im/index.ts | 210 |
| 1022 | POST | `/api/communication/im/contacts/{param}` | im | apps/web/src/api/im/index.ts | 217 |
| 1023 | PUT | `/api/communication/im/contacts/{param}/{param}/accept` | im | apps/web/src/api/im/index.ts | 221 |
| 1024 | PUT | `/api/communication/im/contacts/{param}/{param}/reject` | im | apps/web/src/api/im/index.ts | 225 |
| 1025 | DELETE | `/api/communication/im/contacts/{param}/{param}` | im | apps/web/src/api/im/index.ts | 229 |
| 1026 | GET | `/api/communication/im/contact-groups/{param}` | im | apps/web/src/api/im/index.ts | 233 |
| 1027 | POST | `/api/communication/im/contact-groups/{param}` | im | apps/web/src/api/im/index.ts | 240 |
| 1028 | PUT | `/api/communication/im/contact-groups/{param}/{param}` | im | apps/web/src/api/im/index.ts | 248 |
| 1029 | DELETE | `/api/communication/im/contact-groups/{param}/{param}` | im | apps/web/src/api/im/index.ts | 252 |
| 1030 | POST | `/api/communication/im/contact-groups/{param}/{param}/members` | im | apps/web/src/api/im/index.ts | 260 |
| 1031 | DELETE | `/api/communication/im/contact-groups/{param}/{param}/members/{param}` | im | apps/web/src/api/im/index.ts | 270 |
| 1032 | PUT | `/api/communication/im/rooms/{param}/mute` | im | apps/web/src/api/im/index.ts | 274 |
| 1033 | PUT | `/api/communication/im/rooms/{param}/unmute` | im | apps/web/src/api/im/index.ts | 278 |
| 1034 | PUT | `/api/communication/im/rooms/{param}/pin` | im | apps/web/src/api/im/index.ts | 282 |
| 1035 | PUT | `/api/communication/im/rooms/{param}/unpin` | im | apps/web/src/api/im/index.ts | 286 |
| 1036 | GET | `/api/integration/erp/connections` | integration | apps/web/src/api/integration/connection.ts | 18 |
| 1037 | GET | `/api/integration/erp/connections/{param}` | integration | apps/web/src/api/integration/connection.ts | 22 |
| 1038 | POST | `/api/integration/erp/connections` | integration | apps/web/src/api/integration/connection.ts | 28 |
| 1039 | PUT | `/api/integration/erp/connections/{param}` | integration | apps/web/src/api/integration/connection.ts | 35 |
| 1040 | DELETE | `/api/integration/erp/connections/{param}` | integration | apps/web/src/api/integration/connection.ts | 39 |
| 1041 | GET | `/api/integration/rules` | integration | apps/web/src/api/integration/conversionRule.ts | 15 |
| 1042 | GET | `/api/integration/rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 19 |
| 1043 | POST | `/api/integration/rules` | integration | apps/web/src/api/integration/conversionRule.ts | 25 |
| 1044 | PUT | `/api/integration/rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 32 |
| 1045 | DELETE | `/api/integration/rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 36 |
| 1046 | GET | `/api/integration/rules/{param}/executions` | integration | apps/web/src/api/integration/conversionRule.ts | 40 |
| 1047 | POST | `/api/integration/rules/{param}/execute` | integration | apps/web/src/api/integration/conversionRule.ts | 47 |
| 1048 | POST | `/api/integration/rules/{param}/enable` | integration | apps/web/src/api/integration/conversionRule.ts | 51 |
| 1049 | POST | `/api/integration/rules/{param}/disable` | integration | apps/web/src/api/integration/conversionRule.ts | 55 |
| 1050 | GET | `/api/integration/conversion-rules` | integration | apps/web/src/api/integration/conversionRule.ts | 65 |
| 1051 | GET | `/api/integration/conversion-rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 69 |
| 1052 | POST | `/api/integration/conversion-rules` | integration | apps/web/src/api/integration/conversionRule.ts | 73 |
| 1053 | PUT | `/api/integration/conversion-rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 80 |
| 1054 | DELETE | `/api/integration/conversion-rules/{param}` | integration | apps/web/src/api/integration/conversionRule.ts | 84 |
| 1055 | GET | `/api/integration/health` | integration | apps/web/src/api/integration/index.ts | 72 |
| 1056 | GET | `/api/integration/endpoints` | integration | apps/web/src/api/integration/index.ts | 84 |
| 1057 | GET | `/api/integration/erp/mappings` | integration | apps/web/src/api/integration/mapping.ts | 15 |
| 1058 | GET | `/api/integration/erp/mappings/{param}` | integration | apps/web/src/api/integration/mapping.ts | 21 |
| 1059 | POST | `/api/integration/erp/mappings` | integration | apps/web/src/api/integration/mapping.ts | 25 |
| 1060 | PUT | `/api/integration/erp/mappings/{param}` | integration | apps/web/src/api/integration/mapping.ts | 32 |
| 1061 | DELETE | `/api/integration/erp/mappings/{param}` | integration | apps/web/src/api/integration/mapping.ts | 36 |
| 1062 | GET | `/api/integration/stats` | integration | apps/web/src/api/integration/sync.ts | 19 |
| 1063 | GET | `/api/integration/events` | integration | apps/web/src/api/integration/sync.ts | 23 |
| 1064 | POST | `/api/integration/events` | integration | apps/web/src/api/integration/sync.ts | 29 |
| 1065 | GET | `/api/integration/lims-qms` | integration | apps/web/src/api/integration/sync.ts | 33 |
| 1066 | GET | `/api/integration/lims-qms/{param}` | integration | apps/web/src/api/integration/sync.ts | 37 |
| 1067 | POST | `/api/integration/lims-qms` | integration | apps/web/src/api/integration/sync.ts | 41 |
| 1068 | POST | `/api/integration/lims-qms/{param}/sync` | integration | apps/web/src/api/integration/sync.ts | 45 |
| 1069 | GET | `/api/integration/mes-erp` | integration | apps/web/src/api/integration/sync.ts | 49 |
| 1070 | GET | `/api/integration/mes-erp/{param}` | integration | apps/web/src/api/integration/sync.ts | 53 |
| 1071 | POST | `/api/integration/mes-erp` | integration | apps/web/src/api/integration/sync.ts | 57 |
| 1072 | POST | `/api/integration/mes-erp/{param}/sync` | integration | apps/web/src/api/integration/sync.ts | 61 |
| 1073 | GET | `/api/integration/wms-scm` | integration | apps/web/src/api/integration/sync.ts | 65 |
| 1074 | GET | `/api/integration/wms-scm/{param}` | integration | apps/web/src/api/integration/sync.ts | 69 |
| 1075 | POST | `/api/integration/wms-scm` | integration | apps/web/src/api/integration/sync.ts | 73 |
| 1076 | POST | `/api/integration/wms-scm/{param}/sync` | integration | apps/web/src/api/integration/sync.ts | 77 |
| 1077 | GET | `/api/integration/sync-stats` | integration | apps/web/src/api/integration/sync.ts | 85 |
| 1078 | GET | `/api/integration/sync-stats/history` | integration | apps/web/src/api/integration/sync.ts | 95 |
| 1079 | GET | `/api/lims/audit-logs/{param}` | lims | apps/web/src/api/lims/audit.ts | 27 |
| 1080 | POST | `/api/lims/barcodes/generate` | lims | apps/web/src/api/lims/barcode.ts | 28 |
| 1081 | POST | `/api/lims/barcodes/print` | lims | apps/web/src/api/lims/barcode.ts | 37 |
| 1082 | GET | `/api/lims/barcodes/scan/{param}` | lims | apps/web/src/api/lims/barcode.ts | 41 |
| 1083 | GET | `/api/lims/barcodes/types` | lims | apps/web/src/api/lims/barcode.ts | 45 |
| 1084 | GET | `/api/lims/barcodes/{param}/trace` | lims | apps/web/src/api/lims/barcode.ts | 49 |
| 1085 | GET | `/api/lims/rfid-tags` | lims | apps/web/src/api/lims/barcode.ts | 55 |
| 1086 | POST | `/api/lims/rfid-tags` | lims | apps/web/src/api/lims/barcode.ts | 59 |
| 1087 | DELETE | `/api/lims/rfid-tags/{param}` | lims | apps/web/src/api/lims/barcode.ts | 63 |
| 1088 | POST | `/api/lims/rfid-tags/assign` | lims | apps/web/src/api/lims/barcode.ts | 67 |
| 1089 | POST | `/api/lims/rfid-tags/{param}/unassign` | lims | apps/web/src/api/lims/barcode.ts | 71 |
| 1090 | GET | `/api/lims/print-config` | lims | apps/web/src/api/lims/barcode.ts | 77 |
| 1091 | GET | `/api/lims/print-config/default` | lims | apps/web/src/api/lims/barcode.ts | 81 |
| 1092 | GET | `/api/lims/collection-tasks` | lims | apps/web/src/api/lims/collection.ts | 16 |
| 1093 | GET | `/api/lims/collection-tasks/{param}` | lims | apps/web/src/api/lims/collection.ts | 20 |
| 1094 | POST | `/api/lims/collection-tasks` | lims | apps/web/src/api/lims/collection.ts | 26 |
| 1095 | PUT | `/api/lims/collection-tasks/{param}` | lims | apps/web/src/api/lims/collection.ts | 33 |
| 1096 | DELETE | `/api/lims/collection-tasks/{param}` | lims | apps/web/src/api/lims/collection.ts | 37 |
| 1097 | POST | `/api/lims/collection-tasks/{param}/trigger` | lims | apps/web/src/api/lims/collection.ts | 41 |
| 1098 | GET | `/api/lims/parse-rules` | lims | apps/web/src/api/lims/collection.ts | 47 |
| 1099 | GET | `/api/lims/parse-rules/{param}` | lims | apps/web/src/api/lims/collection.ts | 51 |
| 1100 | POST | `/api/lims/parse-rules` | lims | apps/web/src/api/lims/collection.ts | 55 |
| 1101 | PUT | `/api/lims/parse-rules/{param}` | lims | apps/web/src/api/lims/collection.ts | 62 |
| 1102 | DELETE | `/api/lims/parse-rules/{param}` | lims | apps/web/src/api/lims/collection.ts | 66 |
| 1103 | GET | `/api/lims/dashboard` | lims | apps/web/src/api/lims/dashboard.ts | 16 |
| 1104 | GET | `/api/lims/statistics` | lims | apps/web/src/api/lims/index.ts | 235 |
| 1105 | GET | `/api/lims/health` | lims | apps/web/src/api/lims/index.ts | 239 |
| 1106 | GET | `/api/lims/tasks/sample/{param}` | lims | apps/web/src/api/lims/inspection.ts | 38 |
| 1107 | POST | `/api/lims/tasks/{param}/complete_step` | lims | apps/web/src/api/lims/inspection.ts | 45 |
| 1108 | POST | `/api/lims/tasks/{param}/submit-result` | lims | apps/web/src/api/lims/inspection.ts | 55 |
| 1109 | GET | `/api/lims/records/task/{param}` | lims | apps/web/src/api/lims/inspection.ts | 72 |
| 1110 | POST | `/api/lims/instruments/{param}/calibrate` | lims | apps/web/src/api/lims/instrument.ts | 39 |
| 1111 | GET | `/api/lims/instruments/{param}/calibrations` | lims | apps/web/src/api/lims/instrument.ts | 45 |
| 1112 | GET | `/api/lims/instruments/{param}/maintenance` | lims | apps/web/src/api/lims/instrument.ts | 51 |
| 1113 | POST | `/api/lims/maintenance` | lims | apps/web/src/api/lims/instrument.ts | 55 |
| 1114 | PUT | `/api/lims/maintenance/{param}` | lims | apps/web/src/api/lims/instrument.ts | 62 |
| 1115 | DELETE | `/api/lims/maintenance/{param}` | lims | apps/web/src/api/lims/instrument.ts | 66 |
| 1116 | GET | `/api/lims/instrument-data` | lims | apps/web/src/api/lims/instrument.ts | 72 |
| 1117 | GET | `/api/lims/instrument-data/{param}` | lims | apps/web/src/api/lims/instrument.ts | 76 |
| 1118 | POST | `/api/lims/instrument-data` | lims | apps/web/src/api/lims/instrument.ts | 82 |
| 1119 | PUT | `/api/lims/instrument-data/{param}` | lims | apps/web/src/api/lims/instrument.ts | 89 |
| 1120 | DELETE | `/api/lims/instrument-data/{param}` | lims | apps/web/src/api/lims/instrument.ts | 93 |
| 1121 | POST | `/api/lims/instrument-data/{param}/parse` | lims | apps/web/src/api/lims/instrument.ts | 97 |
| 1122 | GET | `/api/lims/instrument-data/statistics` | lims | apps/web/src/api/lims/instrument.ts | 105 |
| 1123 | GET | `/api/lims/pt-plans/{param}/samples` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 35 |
| 1124 | GET | `/api/lims/pt-plans/{param}/results` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 39 |
| 1125 | GET | `/api/lims/pt-plans/{param}/evaluations` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 43 |
| 1126 | GET | `/api/lims/pt-plans/{param}/corrective-actions` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 47 |
| 1127 | POST | `/api/lims/pt-samples/receive` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 53 |
| 1128 | POST | `/api/lims/pt-results` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 59 |
| 1129 | POST | `/api/lims/pt-evaluations` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 65 |
| 1130 | POST | `/api/lims/pt-corrective-actions` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 73 |
| 1131 | PUT | `/api/lims/pt-corrective-actions/{param}` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 80 |
| 1132 | GET | `/api/lims/reagents/low-stock` | lims | apps/web/src/api/lims/reagent.ts | 21 |
| 1133 | GET | `/api/lims/reagents/expiring` | lims | apps/web/src/api/lims/reagent.ts | 25 |
| 1134 | POST | `/api/lims/samples/batch` | lims | apps/web/src/api/lims/sample.ts | 37 |
| 1135 | DELETE | `/api/lims/samples/batch` | lims | apps/web/src/api/lims/sample.ts | 43 |
| 1136 | POST | `/api/lims/samples/import` | lims | apps/web/src/api/lims/sample.ts | 53 |
| 1137 | GET | `/api/lims/samples/{param}/lifecycle` | lims | apps/web/src/api/lims/sample.ts | 61 |
| 1138 | POST | `/api/lims/samples/lifecycle-event` | lims | apps/web/src/api/lims/sample.ts | 67 |
| 1139 | POST | `/api/lims/samples/{param}/transition-stage` | lims | apps/web/src/api/lims/sample.ts | 74 |
| 1140 | GET | `/api/lims/samples/{param}/traceability` | lims | apps/web/src/api/lims/sample.ts | 78 |
| 1141 | GET | `/api/lims/lifecycle-stages` | lims | apps/web/src/api/lims/sample.ts | 84 |
| 1142 | GET | `/api/lims/lifecycle-stages/{param}` | lims | apps/web/src/api/lims/sample.ts | 88 |
| 1143 | GET | `/api/lims/sync-records` | lims | apps/web/src/api/lims/sync.ts | 9 |
| 1144 | GET | `/api/lims/sync-records/{param}` | lims | apps/web/src/api/lims/sync.ts | 13 |
| 1145 | DELETE | `/api/lims/sync-records/{param}` | lims | apps/web/src/api/lims/sync.ts | 17 |
| 1146 | POST | `/api/lims/sync-records/{param}/retry` | lims | apps/web/src/api/lims/sync.ts | 21 |
| 1147 | POST | `/api/lims/sync/record-to-qms` | lims | apps/web/src/api/lims/sync.ts | 25 |
| 1148 | POST | `/api/lims/sync/reagent-to-ehs` | lims | apps/web/src/api/lims/sync.ts | 29 |
| 1149 | GET | `/api/lims/method-categories` | lims | apps/web/src/api/lims/testMethod.ts | 47 |
| 1150 | POST | `/api/lims/method-categories` | lims | apps/web/src/api/lims/testMethod.ts | 53 |
| 1151 | PUT | `/api/lims/method-categories/{param}` | lims | apps/web/src/api/lims/testMethod.ts | 60 |
| 1152 | DELETE | `/api/lims/method-categories/{param}` | lims | apps/web/src/api/lims/testMethod.ts | 64 |
| 1153 | GET | `/api/lims/method-validations` | lims | apps/web/src/api/lims/testMethod.ts | 70 |
| 1154 | POST | `/api/lims/method-validations` | lims | apps/web/src/api/lims/testMethod.ts | 76 |
| 1155 | GET | `/api/lims/uncertainty-projects/{param}/sources` | lims | apps/web/src/api/lims/uncertainty.ts | 42 |
| 1156 | POST | `/api/lims/uncertainty-sources` | lims | apps/web/src/api/lims/uncertainty.ts | 48 |
| 1157 | PUT | `/api/lims/uncertainty-sources/{param}` | lims | apps/web/src/api/lims/uncertainty.ts | 55 |
| 1158 | DELETE | `/api/lims/uncertainty-sources/{param}` | lims | apps/web/src/api/lims/uncertainty.ts | 59 |
| 1159 | GET | `/api/lims/uncertainty-projects/{param}/components` | lims | apps/web/src/api/lims/uncertainty.ts | 67 |
| 1160 | POST | `/api/lims/uncertainty-components` | lims | apps/web/src/api/lims/uncertainty.ts | 73 |
| 1161 | PUT | `/api/lims/uncertainty-components/{param}` | lims | apps/web/src/api/lims/uncertainty.ts | 80 |
| 1162 | DELETE | `/api/lims/uncertainty-components/{param}` | lims | apps/web/src/api/lims/uncertainty.ts | 84 |
| 1163 | POST | `/api/lims/uncertainty/type-a` | lims | apps/web/src/api/lims/uncertainty.ts | 90 |
| 1164 | POST | `/api/lims/uncertainty/type-b` | lims | apps/web/src/api/lims/uncertainty.ts | 96 |
| 1165 | POST | `/api/lims/uncertainty-projects/{param}/combined` | lims | apps/web/src/api/lims/uncertainty.ts | 102 |
| 1166 | GET | `/api/lims/uncertainty-projects/{param}/report` | lims | apps/web/src/api/lims/uncertainty.ts | 106 |
| 1167 | GET | `/api/lims/{param}/{param}` | lims | apps/web/src/api/lims/utils.ts | 35 |
| 1168 | PUT | `/api/lims/{param}/{param}` | lims | apps/web/src/api/lims/utils.ts | 43 |
| 1169 | DELETE | `/api/lims/{param}/{param}` | lims | apps/web/src/api/lims/utils.ts | 47 |
| 1170 | GET | `/api/lowcode/apps` | lowcode | apps/web/src/api/lowcode/apps.ts | 21 |
| 1171 | GET | `/api/lowcode/apps/{param}` | lowcode | apps/web/src/api/lowcode/apps.ts | 27 |
| 1172 | POST | `/api/lowcode/apps` | lowcode | apps/web/src/api/lowcode/apps.ts | 31 |
| 1173 | PUT | `/api/lowcode/apps/{param}` | lowcode | apps/web/src/api/lowcode/apps.ts | 35 |
| 1174 | DELETE | `/api/lowcode/apps/{param}` | lowcode | apps/web/src/api/lowcode/apps.ts | 39 |
| 1175 | POST | `/api/lowcode/apps/{param}/publish` | lowcode | apps/web/src/api/lowcode/apps.ts | 43 |
| 1176 | POST | `/api/lowcode/apps/{param}/unpublish` | lowcode | apps/web/src/api/lowcode/apps.ts | 47 |
| 1177 | POST | `/api/lowcode/apps/{param}/duplicate` | lowcode | apps/web/src/api/lowcode/apps.ts | 51 |
| 1178 | GET | `/api/lowcode/apps/{param}/export` | lowcode | apps/web/src/api/lowcode/apps.ts | 55 |
| 1179 | POST | `/api/lowcode/apps/import` | lowcode | apps/web/src/api/lowcode/apps.ts | 59 |
| 1180 | GET | `/api/lowcode/data-models` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 21 |
| 1181 | GET | `/api/lowcode/data-models/{param}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 27 |
| 1182 | POST | `/api/lowcode/data-models` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 31 |
| 1183 | PUT | `/api/lowcode/data-models/{param}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 38 |
| 1184 | DELETE | `/api/lowcode/data-models/{param}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 42 |
| 1185 | POST | `/api/lowcode/data-models/{param}/materialize` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 47 |
| 1186 | GET | `/api/lowcode/apps/{param}/data-models` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 52 |
| 1187 | GET | `/api/lowcode/data-sources` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 22 |
| 1188 | GET | `/api/lowcode/data-sources/{param}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 28 |
| 1189 | POST | `/api/lowcode/data-sources` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 32 |
| 1190 | PUT | `/api/lowcode/data-sources/{param}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 39 |
| 1191 | DELETE | `/api/lowcode/data-sources/{param}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 43 |
| 1192 | GET | `/api/lowcode/forms` | lowcode | apps/web/src/api/lowcode/forms.ts | 22 |
| 1193 | GET | `/api/lowcode/forms/{param}` | lowcode | apps/web/src/api/lowcode/forms.ts | 28 |
| 1194 | POST | `/api/lowcode/forms` | lowcode | apps/web/src/api/lowcode/forms.ts | 32 |
| 1195 | PUT | `/api/lowcode/forms/{param}` | lowcode | apps/web/src/api/lowcode/forms.ts | 36 |
| 1196 | DELETE | `/api/lowcode/forms/{param}` | lowcode | apps/web/src/api/lowcode/forms.ts | 40 |
| 1197 | POST | `/api/lowcode/forms/{param}/publish` | lowcode | apps/web/src/api/lowcode/forms.ts | 45 |
| 1198 | GET | `/api/lowcode/forms/{param}/preview` | lowcode | apps/web/src/api/lowcode/forms.ts | 50 |
| 1199 | GET | `/api/lowcode/apps/{param}/forms` | lowcode | apps/web/src/api/lowcode/forms.ts | 55 |
| 1200 | GET | `/api/lowcode/health` | lowcode | apps/web/src/api/lowcode/index.ts | 31 |
| 1201 | GET | `/api/lowcode/dashboard/stats` | lowcode | apps/web/src/api/lowcode/index.ts | 36 |
| 1202 | GET | `/api/lowcode/pages` | lowcode | apps/web/src/api/lowcode/pages.ts | 24 |
| 1203 | GET | `/api/lowcode/pages/{param}` | lowcode | apps/web/src/api/lowcode/pages.ts | 30 |
| 1204 | POST | `/api/lowcode/pages` | lowcode | apps/web/src/api/lowcode/pages.ts | 34 |
| 1205 | PUT | `/api/lowcode/pages/{param}` | lowcode | apps/web/src/api/lowcode/pages.ts | 38 |
| 1206 | DELETE | `/api/lowcode/pages/{param}` | lowcode | apps/web/src/api/lowcode/pages.ts | 42 |
| 1207 | POST | `/api/lowcode/pages/{param}/publish` | lowcode | apps/web/src/api/lowcode/pages.ts | 47 |
| 1208 | GET | `/api/lowcode/pages/{param}/preview` | lowcode | apps/web/src/api/lowcode/pages.ts | 52 |
| 1209 | POST | `/api/lowcode/pages/{param}/set-home` | lowcode | apps/web/src/api/lowcode/pages.ts | 57 |
| 1210 | GET | `/api/lowcode/apps/{param}/pages` | lowcode | apps/web/src/api/lowcode/pages.ts | 62 |
| 1211 | POST | `/api/lowcode/pages/{param}/on-form-submit` | lowcode | apps/web/src/api/lowcode/pages.ts | 79 |
| 1212 | GET | `/api/lowcode/workflows` | lowcode | apps/web/src/api/lowcode/workflows.ts | 24 |
| 1213 | GET | `/api/lowcode/workflows/{param}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 30 |
| 1214 | POST | `/api/lowcode/workflows` | lowcode | apps/web/src/api/lowcode/workflows.ts | 34 |
| 1215 | PUT | `/api/lowcode/workflows/{param}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 41 |
| 1216 | DELETE | `/api/lowcode/workflows/{param}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 45 |
| 1217 | POST | `/api/lowcode/workflows/{param}/enable` | lowcode | apps/web/src/api/lowcode/workflows.ts | 50 |
| 1218 | POST | `/api/lowcode/workflows/{param}/disable` | lowcode | apps/web/src/api/lowcode/workflows.ts | 55 |
| 1219 | GET | `/api/lowcode/apps/{param}/workflows` | lowcode | apps/web/src/api/lowcode/workflows.ts | 60 |
| 1220 | GET | `/api/communication/mail/emails` | mail | apps/web/src/api/mail/index.ts | 100 |
| 1221 | GET | `/api/communication/mail/emails/{param}` | mail | apps/web/src/api/mail/index.ts | 104 |
| 1222 | POST | `/api/communication/mail/emails` | mail | apps/web/src/api/mail/index.ts | 108 |
| 1223 | POST | `/api/communication/mail/emails/send-with-template` | mail | apps/web/src/api/mail/index.ts | 112 |
| 1224 | DELETE | `/api/communication/mail/emails/{param}` | mail | apps/web/src/api/mail/index.ts | 116 |
| 1225 | POST | `/api/communication/mail/emails/resend` | mail | apps/web/src/api/mail/index.ts | 120 |
| 1226 | GET | `/api/communication/mail/emails/stats` | mail | apps/web/src/api/mail/index.ts | 126 |
| 1227 | GET | `/api/communication/mail/templates` | mail | apps/web/src/api/mail/index.ts | 140 |
| 1228 | GET | `/api/communication/mail/templates/{param}` | mail | apps/web/src/api/mail/index.ts | 144 |
| 1229 | POST | `/api/communication/mail/templates` | mail | apps/web/src/api/mail/index.ts | 148 |
| 1230 | PUT | `/api/communication/mail/templates/{param}` | mail | apps/web/src/api/mail/index.ts | 152 |
| 1231 | DELETE | `/api/communication/mail/templates/{param}` | mail | apps/web/src/api/mail/index.ts | 156 |
| 1232 | PUT | `/api/communication/mail/templates/{param}/status` | mail | apps/web/src/api/mail/index.ts | 160 |
| 1233 | POST | `/api/communication/mail/templates/render` | mail | apps/web/src/api/mail/index.ts | 169 |
| 1234 | GET | `/api/communication/mail/health` | mail | apps/web/src/api/mail/index.ts | 178 |
| 1235 | POST | `/api/master-data/{param}/schemas` | master | apps/web/src/api/master/schemaRegistry.ts | 70 |
| 1236 | GET | `/api/master-data/{param}/schemas` | master | apps/web/src/api/master/schemaRegistry.ts | 76 |
| 1237 | GET | `/api/master-data/{param}/schemas/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 80 |
| 1238 | PUT | `/api/master-data/{param}/schemas/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 87 |
| 1239 | DELETE | `/api/master-data/{param}/schemas/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 91 |
| 1240 | POST | `/api/master-data/{param}/schemas/{param}/data` | master | apps/web/src/api/master/schemaRegistry.ts | 99 |
| 1241 | GET | `/api/master-data/{param}/schemas/{param}/data` | master | apps/web/src/api/master/schemaRegistry.ts | 110 |
| 1242 | GET | `/api/master-data/{param}/schemas/{param}/data/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 114 |
| 1243 | PUT | `/api/master-data/{param}/schemas/{param}/data/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 122 |
| 1244 | DELETE | `/api/master-data/{param}/schemas/{param}/data/{param}` | master | apps/web/src/api/master/schemaRegistry.ts | 126 |
| 1245 | GET | `/api/mes/anomaly/alerts` | mes | apps/web/src/api/mes/anomalyDetection.ts | 86 |
| 1246 | GET | `/api/mes/anomaly/summary` | mes | apps/web/src/api/mes/anomalyDetection.ts | 91 |
| 1247 | GET | `/api/mes/anomaly/equipment/{param}` | mes | apps/web/src/api/mes/anomalyDetection.ts | 96 |
| 1248 | GET | `/api/mes/anomaly/rules` | mes | apps/web/src/api/mes/anomalyDetection.ts | 101 |
| 1249 | GET | `/api/mes/anomaly/rules/{param}` | mes | apps/web/src/api/mes/anomalyDetection.ts | 106 |
| 1250 | PUT | `/api/mes/anomaly/rules` | mes | apps/web/src/api/mes/anomalyDetection.ts | 111 |
| 1251 | POST | `/api/mes/anomaly/scan` | mes | apps/web/src/api/mes/anomalyDetection.ts | 116 |
| 1252 | GET | `/api/mes/anomaly/trend` | mes | apps/web/src/api/mes/anomalyDetection.ts | 124 |
| 1253 | POST | `/api/mes/aps/schedule` | mes | apps/web/src/api/mes/aps.ts | 166 |
| 1254 | POST | `/api/mes/aps/schedule/simulate` | mes | apps/web/src/api/mes/aps.ts | 170 |
| 1255 | POST | `/api/mes/aps/schedule/check-constraints` | mes | apps/web/src/api/mes/aps.ts | 176 |
| 1256 | GET | `/api/mes/aps/schedule/optimization-report` | mes | apps/web/src/api/mes/aps.ts | 180 |
| 1257 | GET | `/api/mes/aps/schedule/bottleneck-analysis` | mes | apps/web/src/api/mes/aps.ts | 185 |
| 1258 | GET | `/api/mes/aps/orders/{param}/feasibility` | mes | apps/web/src/api/mes/aps.ts | 189 |
| 1259 | GET | `/api/mes/health` | mes | apps/web/src/api/mes/index.ts | 72 |
| 1260 | GET | `/api/mes/boms` | mes | apps/web/src/api/mes/material.ts | 30 |
| 1261 | GET | `/api/mes/boms/{param}` | mes | apps/web/src/api/mes/material.ts | 34 |
| 1262 | POST | `/api/mes/boms` | mes | apps/web/src/api/mes/material.ts | 38 |
| 1263 | PUT | `/api/mes/boms/{param}` | mes | apps/web/src/api/mes/material.ts | 42 |
| 1264 | DELETE | `/api/mes/boms/{param}` | mes | apps/web/src/api/mes/material.ts | 46 |
| 1265 | GET | `/api/mes/material-issues` | mes | apps/web/src/api/mes/material.ts | 66 |
| 1266 | POST | `/api/mes/material-issues` | mes | apps/web/src/api/mes/material.ts | 70 |
| 1267 | GET | `/api/mes/material-returns` | mes | apps/web/src/api/mes/material.ts | 90 |
| 1268 | POST | `/api/mes/material-returns` | mes | apps/web/src/api/mes/material.ts | 94 |
| 1269 | GET | `/api/mes/material-requirements` | mes | apps/web/src/api/mes/materialRequirement.ts | 26 |
| 1270 | GET | `/api/mes/material-requirements/{param}` | mes | apps/web/src/api/mes/materialRequirement.ts | 30 |
| 1271 | POST | `/api/mes/material-requirements` | mes | apps/web/src/api/mes/materialRequirement.ts | 34 |
| 1272 | PUT | `/api/mes/material-requirements/{param}` | mes | apps/web/src/api/mes/materialRequirement.ts | 41 |
| 1273 | DELETE | `/api/mes/material-requirements/{param}` | mes | apps/web/src/api/mes/materialRequirement.ts | 45 |
| 1274 | POST | `/api/mes/material-requirements/calculate` | mes | apps/web/src/api/mes/materialRequirement.ts | 49 |
| 1275 | PUT | `/api/mes/material-requirements/{param}/confirm` | mes | apps/web/src/api/mes/materialRequirement.ts | 53 |
| 1276 | PUT | `/api/mes/material-requirements/{param}/release` | mes | apps/web/src/api/mes/materialRequirement.ts | 57 |
| 1277 | GET | `/api/mes/process-routes` | mes | apps/web/src/api/mes/process.ts | 86 |
| 1278 | GET | `/api/mes/process-routes/{param}` | mes | apps/web/src/api/mes/process.ts | 90 |
| 1279 | POST | `/api/mes/process-routes` | mes | apps/web/src/api/mes/process.ts | 94 |
| 1280 | PUT | `/api/mes/process-routes/{param}` | mes | apps/web/src/api/mes/process.ts | 98 |
| 1281 | DELETE | `/api/mes/process-routes/{param}` | mes | apps/web/src/api/mes/process.ts | 102 |
| 1282 | GET | `/api/mes/process-routes/{param}/steps` | mes | apps/web/src/api/mes/process.ts | 106 |
| 1283 | POST | `/api/mes/process-routes/{param}/steps` | mes | apps/web/src/api/mes/process.ts | 113 |
| 1284 | PUT | `/api/mes/process-routes/{param}/steps/{param}` | mes | apps/web/src/api/mes/process.ts | 121 |
| 1285 | DELETE | `/api/mes/process-routes/{param}/steps/{param}` | mes | apps/web/src/api/mes/process.ts | 125 |
| 1286 | PUT | `/api/mes/process-routes/{param}/steps/reorder` | mes | apps/web/src/api/mes/process.ts | 132 |
| 1287 | GET | `/api/mes/process-flows` | mes | apps/web/src/api/mes/processFlow.ts | 123 |
| 1288 | GET | `/api/mes/process-flows/{param}` | mes | apps/web/src/api/mes/processFlow.ts | 127 |
| 1289 | POST | `/api/mes/process-flows` | mes | apps/web/src/api/mes/processFlow.ts | 131 |
| 1290 | PUT | `/api/mes/process-flows/{param}` | mes | apps/web/src/api/mes/processFlow.ts | 135 |
| 1291 | DELETE | `/api/mes/process-flows/{param}` | mes | apps/web/src/api/mes/processFlow.ts | 139 |
| 1292 | GET | `/api/mes/process-flows/{param}/steps` | mes | apps/web/src/api/mes/processFlow.ts | 143 |
| 1293 | POST | `/api/mes/process-flows/{param}/steps` | mes | apps/web/src/api/mes/processFlow.ts | 150 |
| 1294 | PUT | `/api/mes/process-flows/{param}/steps/{param}` | mes | apps/web/src/api/mes/processFlow.ts | 158 |
| 1295 | DELETE | `/api/mes/process-flows/{param}/steps/{param}` | mes | apps/web/src/api/mes/processFlow.ts | 162 |
| 1296 | GET | `/api/mes/process-flows/{param}/capacity` | mes | apps/web/src/api/mes/processFlow.ts | 166 |
| 1297 | GET | `/api/mes/processes` | mes | apps/web/src/api/mes/productionProcess.ts | 26 |
| 1298 | GET | `/api/mes/processes/{param}` | mes | apps/web/src/api/mes/productionProcess.ts | 30 |
| 1299 | POST | `/api/mes/processes` | mes | apps/web/src/api/mes/productionProcess.ts | 34 |
| 1300 | PUT | `/api/mes/processes/{param}` | mes | apps/web/src/api/mes/productionProcess.ts | 41 |
| 1301 | DELETE | `/api/mes/processes/{param}` | mes | apps/web/src/api/mes/productionProcess.ts | 45 |
| 1302 | PUT | `/api/mes/processes/{param}/deactivate` | mes | apps/web/src/api/mes/productionProcess.ts | 49 |
| 1303 | GET | `/api/mes/records` | mes | apps/web/src/api/mes/productionRecord.ts | 26 |
| 1304 | GET | `/api/mes/records/{param}` | mes | apps/web/src/api/mes/productionRecord.ts | 30 |
| 1305 | POST | `/api/mes/records` | mes | apps/web/src/api/mes/productionRecord.ts | 34 |
| 1306 | PUT | `/api/mes/records/{param}` | mes | apps/web/src/api/mes/productionRecord.ts | 41 |
| 1307 | DELETE | `/api/mes/records/{param}` | mes | apps/web/src/api/mes/productionRecord.ts | 45 |
| 1308 | PUT | `/api/mes/records/{param}/complete` | mes | apps/web/src/api/mes/productionRecord.ts | 49 |
| 1309 | GET | `/api/mes/quality/inspections` | mes | apps/web/src/api/mes/quality.ts | 171 |
| 1310 | GET | `/api/mes/quality/inspections/{param}` | mes | apps/web/src/api/mes/quality.ts | 175 |
| 1311 | POST | `/api/mes/quality/inspections` | mes | apps/web/src/api/mes/quality.ts | 181 |
| 1312 | PUT | `/api/mes/quality/inspections/{param}` | mes | apps/web/src/api/mes/quality.ts | 188 |
| 1313 | DELETE | `/api/mes/quality/inspections/{param}` | mes | apps/web/src/api/mes/quality.ts | 192 |
| 1314 | GET | `/api/mes/quality/patrols` | mes | apps/web/src/api/mes/quality.ts | 210 |
| 1315 | GET | `/api/mes/quality/patrols/{param}` | mes | apps/web/src/api/mes/quality.ts | 214 |
| 1316 | POST | `/api/mes/quality/patrols` | mes | apps/web/src/api/mes/quality.ts | 220 |
| 1317 | PUT | `/api/mes/quality/patrols/{param}` | mes | apps/web/src/api/mes/quality.ts | 227 |
| 1318 | DELETE | `/api/mes/quality/patrols/{param}` | mes | apps/web/src/api/mes/quality.ts | 231 |
| 1319 | GET | `/api/mes/quality/patrols/{param}/items` | mes | apps/web/src/api/mes/quality.ts | 235 |
| 1320 | POST | `/api/mes/quality/patrols/{param}/items` | mes | apps/web/src/api/mes/quality.ts | 242 |
| 1321 | GET | `/api/mes/quality/standards` | mes | apps/web/src/api/mes/quality.ts | 260 |
| 1322 | GET | `/api/mes/quality/standards/{param}` | mes | apps/web/src/api/mes/quality.ts | 264 |
| 1323 | POST | `/api/mes/quality/standards` | mes | apps/web/src/api/mes/quality.ts | 268 |
| 1324 | PUT | `/api/mes/quality/standards/{param}` | mes | apps/web/src/api/mes/quality.ts | 275 |
| 1325 | DELETE | `/api/mes/quality/standards/{param}` | mes | apps/web/src/api/mes/quality.ts | 279 |
| 1326 | GET | `/api/mes/teams` | mes | apps/web/src/api/mes/team.ts | 27 |
| 1327 | GET | `/api/mes/teams/{param}` | mes | apps/web/src/api/mes/team.ts | 31 |
| 1328 | POST | `/api/mes/teams` | mes | apps/web/src/api/mes/team.ts | 35 |
| 1329 | PUT | `/api/mes/teams/{param}` | mes | apps/web/src/api/mes/team.ts | 39 |
| 1330 | DELETE | `/api/mes/teams/{param}` | mes | apps/web/src/api/mes/team.ts | 43 |
| 1331 | GET | `/api/mes/teams/{param}/members` | mes | apps/web/src/api/mes/team.ts | 47 |
| 1332 | POST | `/api/mes/teams/{param}/members` | mes | apps/web/src/api/mes/team.ts | 54 |
| 1333 | DELETE | `/api/mes/teams/{param}/members/{param}` | mes | apps/web/src/api/mes/team.ts | 58 |
| 1334 | GET | `/api/mes/traceability/forward/{param}` | mes | apps/web/src/api/mes/traceability.ts | 7 |
| 1335 | GET | `/api/mes/traceability/backward/{param}` | mes | apps/web/src/api/mes/traceability.ts | 11 |
| 1336 | GET | `/api/mes/traceability/chain` | mes | apps/web/src/api/mes/traceability.ts | 23 |
| 1337 | GET | `/api/mes/traceability/quality-records` | mes | apps/web/src/api/mes/traceability.ts | 41 |
| 1338 | GET | `/api/mes/wips/transfers` | mes | apps/web/src/api/mes/wip.ts | 66 |
| 1339 | GET | `/api/mes/workstations` | mes | apps/web/src/api/mes/workStation.ts | 26 |
| 1340 | GET | `/api/mes/workstations/{param}` | mes | apps/web/src/api/mes/workStation.ts | 30 |
| 1341 | POST | `/api/mes/workstations` | mes | apps/web/src/api/mes/workStation.ts | 34 |
| 1342 | PUT | `/api/mes/workstations/{param}` | mes | apps/web/src/api/mes/workStation.ts | 38 |
| 1343 | DELETE | `/api/mes/workstations/{param}` | mes | apps/web/src/api/mes/workStation.ts | 42 |
| 1344 | PUT | `/api/mes/workstations/{param}/activate` | mes | apps/web/src/api/mes/workStation.ts | 46 |
| 1345 | PUT | `/api/mes/workstations/{param}/deactivate` | mes | apps/web/src/api/mes/workStation.ts | 50 |
| 1346 | GET | `/api/core/migration/migrations/services` | migration | apps/web/src/api/migration/index.ts | 66 |
| 1347 | POST | `/api/core/migration/migrations/services/{param}/apply` | migration | apps/web/src/api/migration/index.ts | 82 |
| 1348 | POST | `/api/core/migration/migrations/services/{param}/rollback` | migration | apps/web/src/api/migration/index.ts | 97 |
| 1349 | GET | `/api/mobile/mobile/dashboard/stats` | mobile | apps/web/src/api/mobile/index.ts | 421 |
| 1350 | GET | `/api/mobile/mobile/workbench` | mobile | apps/web/src/api/mobile/index.ts | 425 |
| 1351 | POST | `/api/mobile/mobile/patrol-records` | mobile | apps/web/src/api/mobile/index.ts | 434 |
| 1352 | POST | `/api/mobile/mobile/scan-records` | mobile | apps/web/src/api/mobile/index.ts | 441 |
| 1353 | POST | `/api/mobile/mobile/scan` | mobile | apps/web/src/api/mobile/index.ts | 444 |
| 1354 | POST | `/api/mobile/mobile/photo-evidences` | mobile | apps/web/src/api/mobile/index.ts | 453 |
| 1355 | POST | `/api/mobile/mobile/audio-recordings` | mobile | apps/web/src/api/mobile/index.ts | 462 |
| 1356 | POST | `/api/mobile/mobile/video-recordings` | mobile | apps/web/src/api/mobile/index.ts | 471 |
| 1357 | POST | `/api/mobile/mobile/mobile-tasks` | mobile | apps/web/src/api/mobile/index.ts | 481 |
| 1358 | PUT | `/api/mobile/mobile/mobile-tasks/{param}/status` | mobile | apps/web/src/api/mobile/index.ts | 484 |
| 1359 | GET | `/api/mobile/attendance/stats` | mobile | apps/web/src/api/mobile/index.ts | 488 |
| 1360 | POST | `/api/mobile/attendance/check-in` | mobile | apps/web/src/api/mobile/index.ts | 504 |
| 1361 | POST | `/api/mobile/attendance/check-out` | mobile | apps/web/src/api/mobile/index.ts | 511 |
| 1362 | POST | `/api/mobile/attendance/leaves` | mobile | apps/web/src/api/mobile/index.ts | 523 |
| 1363 | GET | `/api/mobile/mobile/inventory/items/{param}` | mobile | apps/web/src/api/mobile/index.ts | 538 |
| 1364 | POST | `/api/mobile/mobile/inventory/stocktake/{param}/records` | mobile | apps/web/src/api/mobile/index.ts | 556 |
| 1365 | GET | `/api/mobile/mobile/quality/tasks/{param}` | mobile | apps/web/src/api/mobile/index.ts | 591 |
| 1366 | POST | `/api/mobile/mobile/quality/defects` | mobile | apps/web/src/api/mobile/index.ts | 604 |
| 1367 | PUT | `/api/mobile/mobile/quality/tasks/{param}/status` | mobile | apps/web/src/api/mobile/index.ts | 611 |
| 1368 | GET | `/api/mobile/mobile/production/orders/{param}` | mobile | apps/web/src/api/mobile/index.ts | 628 |
| 1369 | POST | `/api/mobile/mobile/production/work-reports` | mobile | apps/web/src/api/mobile/index.ts | 647 |
| 1370 | GET | `/api/mobile/mobile/push/config` | mobile | apps/web/src/api/mobile/index.ts | 660 |
| 1371 | PUT | `/api/mobile/mobile/push/config` | mobile | apps/web/src/api/mobile/index.ts | 664 |
| 1372 | PUT | `/api/mobile/mobile/push/templates/{param}` | mobile | apps/web/src/api/mobile/index.ts | 675 |
| 1373 | GET | `/api/mobile/mobile/offline/sync-status` | mobile | apps/web/src/api/mobile/index.ts | 679 |
| 1374 | POST | `/api/mobile/mobile/offline/sync` | mobile | apps/web/src/api/mobile/index.ts | 682 |
| 1375 | GET | `/api/mobile/health` | mobile | apps/web/src/api/mobile/index.ts | 686 |
| 1376 | GET | `/api/core/monitor/alerts` | monitor | apps/web/src/api/monitor/alertTyped.ts | 8 |
| 1377 | GET | `/api/core/monitor/alerts/{param}` | monitor | apps/web/src/api/monitor/alertTyped.ts | 9 |
| 1378 | PUT | `/api/core/monitor/alerts/{param}/acknowledge` | monitor | apps/web/src/api/monitor/alertTyped.ts | 10 |
| 1379 | PUT | `/api/core/monitor/alerts/{param}/resolve` | monitor | apps/web/src/api/monitor/alertTyped.ts | 11 |
| 1380 | GET | `/api/core/monitor/alerts` | monitor | apps/web/src/api/monitor/alertTyped.ts | 41 |
| 1381 | GET | `/api/core/monitor/alerts/{param}` | monitor | apps/web/src/api/monitor/alertTyped.ts | 50 |
| 1382 | GET | `/api/core/monitor/metrics/system` | monitor | apps/web/src/api/monitor/index.ts | 170 |
| 1383 | GET | `/api/core/monitor/health` | monitor | apps/web/src/api/monitor/index.ts | 178 |
| 1384 | GET | `/api/core/monitor/performance/api` | monitor | apps/web/src/api/monitor/index.ts | 186 |
| 1385 | GET | `/api/core/monitor/metrics/database` | monitor | apps/web/src/api/monitor/index.ts | 194 |
| 1386 | GET | `/api/core/monitor/alerts/{param}` | monitor | apps/web/src/api/monitor/index.ts | 217 |
| 1387 | PUT | `/api/core/monitor/alerts/{param}/acknowledge` | monitor | apps/web/src/api/monitor/index.ts | 225 |
| 1388 | PUT | `/api/core/monitor/alerts/{param}/resolve` | monitor | apps/web/src/api/monitor/index.ts | 233 |
| 1389 | GET | `/api/core/monitor/reports/performance` | monitor | apps/web/src/api/monitor/index.ts | 249 |
| 1390 | GET | `/api/core/monitor/metrics/realtime` | monitor | apps/web/src/api/monitor/index.ts | 257 |
| 1391 | GET | `/api/core/monitor/health` | monitor | apps/web/src/api/monitor/index.ts | 264 |
| 1392 | GET | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 9 |
| 1393 | GET | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 10 |
| 1394 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 11 |
| 1395 | PUT | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 12 |
| 1396 | DELETE | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 13 |
| 1397 | GET | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 44 |
| 1398 | GET | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 55 |
| 1399 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 65 |
| 1400 | PUT | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 78 |
| 1401 | DELETE | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 90 |
| 1402 | GET | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 226 |
| 1403 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metrics.ts | 229 |
| 1404 | PUT | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 235 |
| 1405 | DELETE | `/api/core/monitor/business-metrics/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 238 |
| 1406 | GET | `/api/core/monitor/business-metrics/summary` | monitor | apps/web/src/api/monitor/metrics.ts | 241 |
| 1407 | GET | `/api/core/monitor/business-metrics/trend` | monitor | apps/web/src/api/monitor/metrics.ts | 247 |
| 1408 | GET | `/api/core/monitor/business-metrics/kpi` | monitor | apps/web/src/api/monitor/metrics.ts | 255 |
| 1409 | GET | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 266 |
| 1410 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/metrics.ts | 269 |
| 1411 | PUT | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 272 |
| 1412 | DELETE | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 275 |
| 1413 | GET | `/api/core/monitor/slos/summary` | monitor | apps/web/src/api/monitor/metrics.ts | 278 |
| 1414 | GET | `/api/core/monitor/slos/budget` | monitor | apps/web/src/api/monitor/metrics.ts | 281 |
| 1415 | GET | `/api/core/monitor/slos/trend` | monitor | apps/web/src/api/monitor/metrics.ts | 284 |
| 1416 | POST | `/api/core/monitor/slos/violations/{param}/resolve` | monitor | apps/web/src/api/monitor/metrics.ts | 300 |
| 1417 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/metrics.ts | 306 |
| 1418 | GET | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 309 |
| 1419 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/metrics.ts | 312 |
| 1420 | PUT | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 318 |
| 1421 | DELETE | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/metrics.ts | 321 |
| 1422 | POST | `/api/core/monitor/rules/{param}/enable` | monitor | apps/web/src/api/monitor/metrics.ts | 324 |
| 1423 | POST | `/api/core/monitor/rules/{param}/disable` | monitor | apps/web/src/api/monitor/metrics.ts | 327 |
| 1424 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 8 |
| 1425 | GET | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 9 |
| 1426 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 10 |
| 1427 | PUT | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 11 |
| 1428 | DELETE | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 12 |
| 1429 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 39 |
| 1430 | GET | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 48 |
| 1431 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 58 |
| 1432 | PUT | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 71 |
| 1433 | DELETE | `/api/core/monitor/rules/{param}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 83 |
| 1434 | GET | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 8 |
| 1435 | GET | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 9 |
| 1436 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 10 |
| 1437 | PUT | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 11 |
| 1438 | DELETE | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 12 |
| 1439 | GET | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 39 |
| 1440 | GET | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 48 |
| 1441 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 58 |
| 1442 | PUT | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 71 |
| 1443 | DELETE | `/api/core/monitor/slos/{param}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 81 |
| 1444 | GET | `/api/communication/notification/notifications` | notification | apps/web/src/api/notification/index.ts | 159 |
| 1445 | GET | `/api/communication/notification/notifications/unread` | notification | apps/web/src/api/notification/index.ts | 188 |
| 1446 | GET | `/api/communication/notification/notifications/unread-count` | notification | apps/web/src/api/notification/index.ts | 195 |
| 1447 | PUT | `/api/communication/notification/notifications/{param}` | notification | apps/web/src/api/notification/index.ts | 226 |
| 1448 | PUT | `/api/communication/notification/notifications/read-all` | notification | apps/web/src/api/notification/index.ts | 230 |
| 1449 | DELETE | `/api/communication/notification/notifications/{param}` | notification | apps/web/src/api/notification/index.ts | 234 |
| 1450 | POST | `/api/communication/notification/notifications` | notification | apps/web/src/api/notification/index.ts | 240 |
| 1451 | GET | `/api/communication/notification/notifications/archive/config` | notification | apps/web/src/api/notification/index.ts | 259 |
| 1452 | PUT | `/api/communication/notification/notifications/archive/config` | notification | apps/web/src/api/notification/index.ts | 266 |
| 1453 | POST | `/api/communication/notification/notifications/archive/run` | notification | apps/web/src/api/notification/index.ts | 278 |
| 1454 | GET | `/api/communication/notification/notifications/stats/me` | notification | apps/web/src/api/notification/index.ts | 285 |
| 1455 | GET | `/api/communication/notification/notification-templates` | notification | apps/web/src/api/notification/index.ts | 312 |
| 1456 | GET | `/api/communication/notification/notification-templates/{param}` | notification | apps/web/src/api/notification/index.ts | 320 |
| 1457 | POST | `/api/communication/notification/notification-templates` | notification | apps/web/src/api/notification/index.ts | 329 |
| 1458 | PUT | `/api/communication/notification/notification-templates/{param}` | notification | apps/web/src/api/notification/index.ts | 340 |
| 1459 | DELETE | `/api/communication/notification/notification-templates/{param}` | notification | apps/web/src/api/notification/index.ts | 348 |
| 1460 | POST | `/api/communication/notification/notification-templates/{param}/render` | notification | apps/web/src/api/notification/index.ts | 356 |
| 1461 | PUT | `/api/communication/notification/notifications/bulk-read` | notification | apps/web/src/api/notification/index.ts | 364 |
| 1462 | DELETE | `/api/communication/notification/notifications/bulk` | notification | apps/web/src/api/notification/index.ts | 371 |
| 1463 | GET | `/api/communication/notification/notifications/health/detailed` | notification | apps/web/src/api/notification/index.ts | 395 |
| 1464 | GET | `/api/communication/notification/notifications/{param}` | notification | apps/web/src/api/notification/index.ts | 404 |
| 1465 | PUT | `/api/communication/notification/notifications/{param}` | notification | apps/web/src/api/notification/index.ts | 407 |
| 1466 | PUT | `/api/communication/notification/notifications/{param}/unread` | notification | apps/web/src/api/notification/index.ts | 410 |
| 1467 | GET | `/api/pdm/bom-versions` | pdm | apps/web/src/api/pdm/bom.ts | 89 |
| 1468 | GET | `/api/pdm/bom-versions/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 107 |
| 1469 | POST | `/api/pdm/bom-versions` | pdm | apps/web/src/api/pdm/bom.ts | 110 |
| 1470 | PUT | `/api/pdm/bom-versions/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 116 |
| 1471 | DELETE | `/api/pdm/bom-versions/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 119 |
| 1472 | POST | `/api/pdm/bom-versions/{param}/activate` | pdm | apps/web/src/api/pdm/bom.ts | 122 |
| 1473 | POST | `/api/pdm/bom-versions/{param}/archive` | pdm | apps/web/src/api/pdm/bom.ts | 125 |
| 1474 | GET | `/api/pdm/bom-items` | pdm | apps/web/src/api/pdm/bom.ts | 131 |
| 1475 | GET | `/api/pdm/bom-items/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 134 |
| 1476 | POST | `/api/pdm/bom-items` | pdm | apps/web/src/api/pdm/bom.ts | 137 |
| 1477 | PUT | `/api/pdm/bom-items/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 143 |
| 1478 | DELETE | `/api/pdm/bom-items/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 146 |
| 1479 | POST | `/api/pdm/bom-versions/{param}/items/batch` | pdm | apps/web/src/api/pdm/bom.ts | 152 |
| 1480 | POST | `/api/pdm/bom-compare` | pdm | apps/web/src/api/pdm/bom.ts | 162 |
| 1481 | GET | `/api/pdm/bom-compare/{param}` | pdm | apps/web/src/api/pdm/bom.ts | 168 |
| 1482 | GET | `/api/pdm/bom-compare` | pdm | apps/web/src/api/pdm/bom.ts | 171 |
| 1483 | GET | `/api/pdm/dashboard` | pdm | apps/web/src/api/pdm/dashboard.ts | 16 |
| 1484 | POST | `/api/pdm/documents/search` | pdm | apps/web/src/api/pdm/document.ts | 91 |
| 1485 | PUT | `/api/pdm/documents/{param}/status` | pdm | apps/web/src/api/pdm/document.ts | 109 |
| 1486 | GET | `/api/pdm/documents/{param}/versions` | pdm | apps/web/src/api/pdm/document.ts | 114 |
| 1487 | GET | `/api/pdm/documents/{param}/versions/{param}` | pdm | apps/web/src/api/pdm/document.ts | 120 |
| 1488 | POST | `/api/pdm/documents/{param}/versions` | pdm | apps/web/src/api/pdm/document.ts | 125 |
| 1489 | PUT | `/api/pdm/documents/{param}/versions/{param}` | pdm | apps/web/src/api/pdm/document.ts | 132 |
| 1490 | DELETE | `/api/pdm/documents/{param}/versions/{param}` | pdm | apps/web/src/api/pdm/document.ts | 138 |
| 1491 | POST | `/api/pdm/documents/{param}/versions/{param}/publish` | pdm | apps/web/src/api/pdm/document.ts | 144 |
| 1492 | POST | `/api/pdm/documents/{param}/upload` | pdm | apps/web/src/api/pdm/document.ts | 154 |
| 1493 | GET | `/api/pdm/documents/{param}/versions/{param}/download` | pdm | apps/web/src/api/pdm/document.ts | 161 |
| 1494 | GET | `/api/pdm/statistics` | pdm | apps/web/src/api/pdm/index.ts | 403 |
| 1495 | GET | `/api/pdm/change-orders` | pdm | apps/web/src/api/pdm/index.ts | 445 |
| 1496 | GET | `/api/pdm/change-orders/{param}` | pdm | apps/web/src/api/pdm/index.ts | 448 |
| 1497 | POST | `/api/pdm/change-orders` | pdm | apps/web/src/api/pdm/index.ts | 451 |
| 1498 | PUT | `/api/pdm/change-orders/{param}` | pdm | apps/web/src/api/pdm/index.ts | 457 |
| 1499 | DELETE | `/api/pdm/change-orders/{param}` | pdm | apps/web/src/api/pdm/index.ts | 460 |
| 1500 | GET | `/api/pdm/product-configs` | pdm | apps/web/src/api/pdm/index.ts | 465 |
| 1501 | GET | `/api/pdm/product-configs/{param}` | pdm | apps/web/src/api/pdm/index.ts | 468 |
| 1502 | POST | `/api/pdm/product-configs` | pdm | apps/web/src/api/pdm/index.ts | 473 |
| 1503 | PUT | `/api/pdm/product-configs/{param}` | pdm | apps/web/src/api/pdm/index.ts | 479 |
| 1504 | DELETE | `/api/pdm/product-configs/{param}` | pdm | apps/web/src/api/pdm/index.ts | 482 |
| 1505 | POST | `/api/pdm/import` | pdm | apps/web/src/api/pdm/index.ts | 493 |
| 1506 | GET | `/api/pdm/projects` | pdm | apps/web/src/api/pdm/project.ts | 77 |
| 1507 | GET | `/api/pdm/projects/{param}` | pdm | apps/web/src/api/pdm/project.ts | 80 |
| 1508 | POST | `/api/pdm/projects` | pdm | apps/web/src/api/pdm/project.ts | 83 |
| 1509 | PUT | `/api/pdm/projects/{param}` | pdm | apps/web/src/api/pdm/project.ts | 89 |
| 1510 | DELETE | `/api/pdm/projects/{param}` | pdm | apps/web/src/api/pdm/project.ts | 92 |
| 1511 | PUT | `/api/pdm/projects/{param}/status` | pdm | apps/web/src/api/pdm/project.ts | 95 |
| 1512 | PUT | `/api/pdm/projects/{param}/phase` | pdm | apps/web/src/api/pdm/project.ts | 98 |
| 1513 | GET | `/api/pdm/projects/{param}/members` | pdm | apps/web/src/api/pdm/project.ts | 103 |
| 1514 | POST | `/api/pdm/projects/{param}/members` | pdm | apps/web/src/api/pdm/project.ts | 106 |
| 1515 | DELETE | `/api/pdm/projects/{param}/members/{param}` | pdm | apps/web/src/api/pdm/project.ts | 112 |
| 1516 | PUT | `/api/pdm/projects/{param}/members/{param}` | pdm | apps/web/src/api/pdm/project.ts | 119 |
| 1517 | GET | `/api/pdm/projects/{param}/phases` | pdm | apps/web/src/api/pdm/project.ts | 126 |
| 1518 | POST | `/api/pdm/projects/{param}/phases` | pdm | apps/web/src/api/pdm/project.ts | 129 |
| 1519 | PUT | `/api/pdm/projects/{param}/phases/{param}` | pdm | apps/web/src/api/pdm/project.ts | 136 |
| 1520 | DELETE | `/api/pdm/projects/{param}/phases/{param}` | pdm | apps/web/src/api/pdm/project.ts | 139 |
| 1521 | POST | `/api/core/iam/access-logs` | iam | apps/web/src/api/permissionInterceptor.ts | 106 |
| 1522 | GET | `/api/pm/projects/{param}/acceptance-plans` | pm | apps/web/src/api/pm/acceptance.ts | 6 |
| 1523 | GET | `/api/pm/acceptance-plans/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 10 |
| 1524 | POST | `/api/pm/projects/{param}/acceptance-plans` | pm | apps/web/src/api/pm/acceptance.ts | 28 |
| 1525 | PUT | `/api/pm/acceptance-plans/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 43 |
| 1526 | GET | `/api/pm/acceptance-plans/{param}/items` | pm | apps/web/src/api/pm/acceptance.ts | 49 |
| 1527 | POST | `/api/pm/acceptance-plans/{param}/items` | pm | apps/web/src/api/pm/acceptance.ts | 61 |
| 1528 | PUT | `/api/pm/acceptance-items/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 72 |
| 1529 | DELETE | `/api/pm/acceptance-items/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 76 |
| 1530 | GET | `/api/pm/projects/{param}/acceptance-records` | pm | apps/web/src/api/pm/acceptance.ts | 82 |
| 1531 | GET | `/api/pm/acceptance-records/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 86 |
| 1532 | POST | `/api/pm/acceptance-plans/{param}/records` | pm | apps/web/src/api/pm/acceptance.ts | 103 |
| 1533 | PUT | `/api/pm/acceptance-records/{param}` | pm | apps/web/src/api/pm/acceptance.ts | 117 |
| 1534 | GET | `/api/pm/projects/{param}/benefits` | pm | apps/web/src/api/pm/benefit.ts | 6 |
| 1535 | GET | `/api/pm/projects/{param}/benefits/analysis` | pm | apps/web/src/api/pm/benefit.ts | 10 |
| 1536 | POST | `/api/pm/projects/{param}/benefits` | pm | apps/web/src/api/pm/benefit.ts | 29 |
| 1537 | GET | `/api/pm/projects/{param}/budgets` | pm | apps/web/src/api/pm/budget.ts | 6 |
| 1538 | GET | `/api/pm/budgets/{param}` | pm | apps/web/src/api/pm/budget.ts | 10 |
| 1539 | POST | `/api/pm/projects/{param}/budgets` | pm | apps/web/src/api/pm/budget.ts | 23 |
| 1540 | PUT | `/api/pm/budgets/{param}` | pm | apps/web/src/api/pm/budget.ts | 35 |
| 1541 | POST | `/api/pm/budgets/{param}/submit` | pm | apps/web/src/api/pm/budget.ts | 39 |
| 1542 | POST | `/api/pm/budgets/{param}/approve` | pm | apps/web/src/api/pm/budget.ts | 43 |
| 1543 | GET | `/api/pm/budgets/{param}/items` | pm | apps/web/src/api/pm/budget.ts | 49 |
| 1544 | POST | `/api/pm/budgets/{param}/items` | pm | apps/web/src/api/pm/budget.ts | 63 |
| 1545 | PUT | `/api/pm/budgets/{param}/items/{param}` | pm | apps/web/src/api/pm/budget.ts | 77 |
| 1546 | DELETE | `/api/pm/budgets/{param}/items/{param}` | pm | apps/web/src/api/pm/budget.ts | 81 |
| 1547 | GET | `/api/pm/contracts` | pm | apps/web/src/api/pm/contract.ts | 11 |
| 1548 | GET | `/api/pm/contracts/{param}` | pm | apps/web/src/api/pm/contract.ts | 15 |
| 1549 | POST | `/api/pm/contracts` | pm | apps/web/src/api/pm/contract.ts | 38 |
| 1550 | PUT | `/api/pm/contracts/{param}` | pm | apps/web/src/api/pm/contract.ts | 60 |
| 1551 | DELETE | `/api/pm/contracts/{param}` | pm | apps/web/src/api/pm/contract.ts | 64 |
| 1552 | POST | `/api/pm/contracts/{param}/submit` | pm | apps/web/src/api/pm/contract.ts | 68 |
| 1553 | POST | `/api/pm/contracts/{param}/approve` | pm | apps/web/src/api/pm/contract.ts | 72 |
| 1554 | POST | `/api/pm/contracts/{param}/reject` | pm | apps/web/src/api/pm/contract.ts | 76 |
| 1555 | GET | `/api/pm/contracts/{param}/milestones` | pm | apps/web/src/api/pm/contract.ts | 82 |
| 1556 | POST | `/api/pm/contracts/{param}/milestones` | pm | apps/web/src/api/pm/contract.ts | 96 |
| 1557 | PUT | `/api/pm/contracts/{param}/milestones/{param}` | pm | apps/web/src/api/pm/contract.ts | 110 |
| 1558 | DELETE | `/api/pm/contracts/{param}/milestones/{param}` | pm | apps/web/src/api/pm/contract.ts | 114 |
| 1559 | GET | `/api/pm/contracts/{param}/payments` | pm | apps/web/src/api/pm/contract.ts | 120 |
| 1560 | POST | `/api/pm/contracts/{param}/payments` | pm | apps/web/src/api/pm/contract.ts | 133 |
| 1561 | PUT | `/api/pm/contracts/{param}/payments/{param}` | pm | apps/web/src/api/pm/contract.ts | 146 |
| 1562 | DELETE | `/api/pm/contracts/{param}/payments/{param}` | pm | apps/web/src/api/pm/contract.ts | 150 |
| 1563 | GET | `/api/pm/projects/{param}/contracts` | pm | apps/web/src/api/pm/contract.ts | 156 |
| 1564 | POST | `/api/pm/projects/{param}/contracts` | pm | apps/web/src/api/pm/contract.ts | 181 |
| 1565 | GET | `/api/pm/contract-templates` | pm | apps/web/src/api/pm/contract.ts | 187 |
| 1566 | GET | `/api/pm/contract-templates/{param}` | pm | apps/web/src/api/pm/contract.ts | 191 |
| 1567 | POST | `/api/pm/contract-templates` | pm | apps/web/src/api/pm/contract.ts | 201 |
| 1568 | PUT | `/api/pm/contract-templates/{param}` | pm | apps/web/src/api/pm/contract.ts | 213 |
| 1569 | DELETE | `/api/pm/contract-templates/{param}` | pm | apps/web/src/api/pm/contract.ts | 217 |
| 1570 | GET | `/api/pm/statistics` | pm | apps/web/src/api/pm/dashboard.ts | 7 |
| 1571 | GET | `/api/pm/projects/{param}/documents` | pm | apps/web/src/api/pm/document.ts | 6 |
| 1572 | GET | `/api/pm/documents/{param}` | pm | apps/web/src/api/pm/document.ts | 10 |
| 1573 | POST | `/api/pm/projects/{param}/documents` | pm | apps/web/src/api/pm/document.ts | 27 |
| 1574 | PUT | `/api/pm/documents/{param}` | pm | apps/web/src/api/pm/document.ts | 40 |
| 1575 | DELETE | `/api/pm/documents/{param}` | pm | apps/web/src/api/pm/document.ts | 44 |
| 1576 | GET | `/api/pm/documents/{param}/versions` | pm | apps/web/src/api/pm/document.ts | 50 |
| 1577 | POST | `/api/pm/documents/{param}/versions` | pm | apps/web/src/api/pm/document.ts | 62 |
| 1578 | GET | `/api/pm/projects/{param}/folders` | pm | apps/web/src/api/pm/document.ts | 68 |
| 1579 | GET | `/api/pm/folders/{param}` | pm | apps/web/src/api/pm/document.ts | 72 |
| 1580 | POST | `/api/pm/projects/{param}/folders` | pm | apps/web/src/api/pm/document.ts | 84 |
| 1581 | PUT | `/api/pm/folders/{param}` | pm | apps/web/src/api/pm/document.ts | 94 |
| 1582 | DELETE | `/api/pm/folders/{param}` | pm | apps/web/src/api/pm/document.ts | 98 |
| 1583 | GET | `/api/pm/projects/{param}/notifications` | pm | apps/web/src/api/pm/notification.ts | 6 |
| 1584 | POST | `/api/pm/projects/{param}/notifications` | pm | apps/web/src/api/pm/notification.ts | 19 |
| 1585 | GET | `/api/pm/projects/{param}/notification-settings` | pm | apps/web/src/api/pm/notification.ts | 25 |
| 1586 | POST | `/api/pm/projects/{param}/notification-settings` | pm | apps/web/src/api/pm/notification.ts | 37 |
| 1587 | PUT | `/api/pm/notification-settings/{param}` | pm | apps/web/src/api/pm/notification.ts | 48 |
| 1588 | GET | `/api/pm/notification-types` | pm | apps/web/src/api/pm/notification.ts | 54 |
| 1589 | GET | `/api/pm/projects` | pm | apps/web/src/api/pm/project.ts | 24 |
| 1590 | POST | `/api/pm/projects` | pm | apps/web/src/api/pm/project.ts | 28 |
| 1591 | GET | `/api/pm/projects/{param}` | pm | apps/web/src/api/pm/project.ts | 32 |
| 1592 | PUT | `/api/pm/projects/{param}` | pm | apps/web/src/api/pm/project.ts | 36 |
| 1593 | DELETE | `/api/pm/projects/{param}` | pm | apps/web/src/api/pm/project.ts | 40 |
| 1594 | GET | `/api/pm/projects/{param}/dashboard` | pm | apps/web/src/api/pm/project.ts | 44 |
| 1595 | GET | `/api/pm/projects/{param}/gantt` | pm | apps/web/src/api/pm/project.ts | 48 |
| 1596 | GET | `/api/pm/projects/{param}/phases` | pm | apps/web/src/api/pm/project.ts | 54 |
| 1597 | POST | `/api/pm/projects/{param}/phases` | pm | apps/web/src/api/pm/project.ts | 67 |
| 1598 | GET | `/api/pm/projects/{param}/phases/{param}` | pm | apps/web/src/api/pm/project.ts | 71 |
| 1599 | PUT | `/api/pm/projects/{param}/phases/{param}` | pm | apps/web/src/api/pm/project.ts | 88 |
| 1600 | DELETE | `/api/pm/projects/{param}/phases/{param}` | pm | apps/web/src/api/pm/project.ts | 92 |
| 1601 | GET | `/api/pm/projects/{param}/milestones` | pm | apps/web/src/api/pm/project.ts | 98 |
| 1602 | POST | `/api/pm/projects/{param}/milestones` | pm | apps/web/src/api/pm/project.ts | 111 |
| 1603 | GET | `/api/pm/projects/{param}/milestones/{param}` | pm | apps/web/src/api/pm/project.ts | 115 |
| 1604 | PUT | `/api/pm/projects/{param}/milestones/{param}` | pm | apps/web/src/api/pm/project.ts | 130 |
| 1605 | DELETE | `/api/pm/projects/{param}/milestones/{param}` | pm | apps/web/src/api/pm/project.ts | 134 |
| 1606 | GET | `/api/pm/projects/{param}/approval` | pm | apps/web/src/api/pm/project.ts | 140 |
| 1607 | POST | `/api/pm/projects/{param}/approval` | pm | apps/web/src/api/pm/project.ts | 150 |
| 1608 | POST | `/api/pm/projects/{param}/approval/action` | pm | apps/web/src/api/pm/project.ts | 154 |
| 1609 | GET | `/api/pm/projects/{param}/quality-checks` | pm | apps/web/src/api/pm/quality.ts | 6 |
| 1610 | GET | `/api/pm/quality-checks/{param}` | pm | apps/web/src/api/pm/quality.ts | 10 |
| 1611 | POST | `/api/pm/projects/{param}/quality-checks` | pm | apps/web/src/api/pm/quality.ts | 26 |
| 1612 | PUT | `/api/pm/quality-checks/{param}` | pm | apps/web/src/api/pm/quality.ts | 45 |
| 1613 | GET | `/api/pm/projects/{param}/defects` | pm | apps/web/src/api/pm/quality.ts | 51 |
| 1614 | GET | `/api/pm/defects/{param}` | pm | apps/web/src/api/pm/quality.ts | 55 |
| 1615 | POST | `/api/pm/projects/{param}/defects` | pm | apps/web/src/api/pm/quality.ts | 72 |
| 1616 | PUT | `/api/pm/defects/{param}` | pm | apps/web/src/api/pm/quality.ts | 88 |
| 1617 | DELETE | `/api/pm/defects/{param}` | pm | apps/web/src/api/pm/quality.ts | 92 |
| 1618 | GET | `/api/pm/projects/{param}/reports` | pm | apps/web/src/api/pm/report.ts | 6 |
| 1619 | GET | `/api/pm/reports/{param}` | pm | apps/web/src/api/pm/report.ts | 10 |
| 1620 | POST | `/api/pm/projects/{param}/reports` | pm | apps/web/src/api/pm/report.ts | 23 |
| 1621 | POST | `/api/pm/projects/{param}/reports/generate` | pm | apps/web/src/api/pm/report.ts | 36 |
| 1622 | GET | `/api/pm/report-templates` | pm | apps/web/src/api/pm/report.ts | 42 |
| 1623 | GET | `/api/pm/report-templates/{param}` | pm | apps/web/src/api/pm/report.ts | 46 |
| 1624 | POST | `/api/pm/report-templates` | pm | apps/web/src/api/pm/report.ts | 56 |
| 1625 | PUT | `/api/pm/report-templates/{param}` | pm | apps/web/src/api/pm/report.ts | 66 |
| 1626 | DELETE | `/api/pm/report-templates/{param}` | pm | apps/web/src/api/pm/report.ts | 70 |
| 1627 | GET | `/api/pm/projects/{param}/resources` | pm | apps/web/src/api/pm/resource.ts | 6 |
| 1628 | POST | `/api/pm/projects/{param}/resources` | pm | apps/web/src/api/pm/resource.ts | 22 |
| 1629 | GET | `/api/pm/projects/{param}/resources/{param}` | pm | apps/web/src/api/pm/resource.ts | 26 |
| 1630 | PUT | `/api/pm/projects/{param}/resources/{param}` | pm | apps/web/src/api/pm/resource.ts | 42 |
| 1631 | DELETE | `/api/pm/projects/{param}/resources/{param}` | pm | apps/web/src/api/pm/resource.ts | 46 |
| 1632 | GET | `/api/pm/projects/{param}/expenses` | pm | apps/web/src/api/pm/resource.ts | 52 |
| 1633 | POST | `/api/pm/projects/{param}/expenses` | pm | apps/web/src/api/pm/resource.ts | 74 |
| 1634 | GET | `/api/pm/projects/{param}/expenses/{param}` | pm | apps/web/src/api/pm/resource.ts | 78 |
| 1635 | PUT | `/api/pm/projects/{param}/expenses/{param}` | pm | apps/web/src/api/pm/resource.ts | 95 |
| 1636 | DELETE | `/api/pm/projects/{param}/expenses/{param}` | pm | apps/web/src/api/pm/resource.ts | 99 |
| 1637 | GET | `/api/pm/projects/{param}/risks` | pm | apps/web/src/api/pm/risk.ts | 6 |
| 1638 | GET | `/api/pm/risks/{param}` | pm | apps/web/src/api/pm/risk.ts | 10 |
| 1639 | POST | `/api/pm/projects/{param}/risks` | pm | apps/web/src/api/pm/risk.ts | 33 |
| 1640 | PUT | `/api/pm/risks/{param}` | pm | apps/web/src/api/pm/risk.ts | 55 |
| 1641 | GET | `/api/pm/risks/{param}/events` | pm | apps/web/src/api/pm/risk.ts | 61 |
| 1642 | POST | `/api/pm/risks/{param}/events` | pm | apps/web/src/api/pm/risk.ts | 72 |
| 1643 | GET | `/api/pm/projects/{param}/settlements` | pm | apps/web/src/api/pm/settlement.ts | 6 |
| 1644 | GET | `/api/pm/settlements/{param}` | pm | apps/web/src/api/pm/settlement.ts | 10 |
| 1645 | POST | `/api/pm/projects/{param}/settlements` | pm | apps/web/src/api/pm/settlement.ts | 25 |
| 1646 | PUT | `/api/pm/settlements/{param}` | pm | apps/web/src/api/pm/settlement.ts | 37 |
| 1647 | POST | `/api/pm/settlements/{param}/approve` | pm | apps/web/src/api/pm/settlement.ts | 41 |
| 1648 | GET | `/api/pm/settlements/{param}/items` | pm | apps/web/src/api/pm/settlement.ts | 47 |
| 1649 | POST | `/api/pm/settlements/{param}/items` | pm | apps/web/src/api/pm/settlement.ts | 63 |
| 1650 | PUT | `/api/pm/settlement-items/{param}` | pm | apps/web/src/api/pm/settlement.ts | 75 |
| 1651 | DELETE | `/api/pm/settlement-items/{param}` | pm | apps/web/src/api/pm/settlement.ts | 79 |
| 1652 | GET | `/api/pm/settlements/{param}/adjustments` | pm | apps/web/src/api/pm/settlement.ts | 85 |
| 1653 | POST | `/api/pm/settlements/{param}/adjustments` | pm | apps/web/src/api/pm/settlement.ts | 100 |
| 1654 | GET | `/api/pm/projects/{param}/members` | pm | apps/web/src/api/pm/team.ts | 6 |
| 1655 | POST | `/api/pm/projects/{param}/members` | pm | apps/web/src/api/pm/team.ts | 19 |
| 1656 | GET | `/api/pm/projects/{param}/members/{param}` | pm | apps/web/src/api/pm/team.ts | 23 |
| 1657 | PUT | `/api/pm/projects/{param}/members/{param}` | pm | apps/web/src/api/pm/team.ts | 36 |
| 1658 | DELETE | `/api/pm/projects/{param}/members/{param}` | pm | apps/web/src/api/pm/team.ts | 40 |
| 1659 | GET | `/api/qms/apqp/projects` | qms | apps/web/src/api/qms/apqp.ts | 22 |
| 1660 | GET | `/api/qms/apqp/projects/{param}` | qms | apps/web/src/api/qms/apqp.ts | 27 |
| 1661 | POST | `/api/qms/apqp/projects` | qms | apps/web/src/api/qms/apqp.ts | 31 |
| 1662 | PUT | `/api/qms/apqp/projects/{param}` | qms | apps/web/src/api/qms/apqp.ts | 38 |
| 1663 | DELETE | `/api/qms/apqp/projects/{param}` | qms | apps/web/src/api/qms/apqp.ts | 42 |
| 1664 | POST | `/api/qms/apqp/projects/{param}/transition` | qms | apps/web/src/api/qms/apqp.ts | 49 |
| 1665 | GET | `/api/qms/apqp/projects/{param}/progress` | qms | apps/web/src/api/qms/apqp.ts | 53 |
| 1666 | GET | `/api/qms/apqp/phases/{param}` | qms | apps/web/src/api/qms/apqp.ts | 63 |
| 1667 | POST | `/api/qms/apqp/phases` | qms | apps/web/src/api/qms/apqp.ts | 75 |
| 1668 | PUT | `/api/qms/apqp/phases/{param}` | qms | apps/web/src/api/qms/apqp.ts | 82 |
| 1669 | DELETE | `/api/qms/apqp/phases/{param}` | qms | apps/web/src/api/qms/apqp.ts | 86 |
| 1670 | GET | `/api/qms/apqp/tasks` | qms | apps/web/src/api/qms/apqp.ts | 96 |
| 1671 | GET | `/api/qms/apqp/tasks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 100 |
| 1672 | POST | `/api/qms/apqp/tasks` | qms | apps/web/src/api/qms/apqp.ts | 114 |
| 1673 | PUT | `/api/qms/apqp/tasks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 118 |
| 1674 | DELETE | `/api/qms/apqp/tasks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 122 |
| 1675 | GET | `/api/qms/apqp/risks` | qms | apps/web/src/api/qms/apqp.ts | 131 |
| 1676 | GET | `/api/qms/apqp/risks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 135 |
| 1677 | POST | `/api/qms/apqp/risks` | qms | apps/web/src/api/qms/apqp.ts | 150 |
| 1678 | PUT | `/api/qms/apqp/risks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 154 |
| 1679 | DELETE | `/api/qms/apqp/risks/{param}` | qms | apps/web/src/api/qms/apqp.ts | 158 |
| 1680 | POST | `/api/qms/apqp/approvals` | qms | apps/web/src/api/qms/apqp.ts | 173 |
| 1681 | POST | `/api/qms/apqp/approvals/{param}/process` | qms | apps/web/src/api/qms/apqp.ts | 180 |
| 1682 | GET | `/api/qms/audit-plans` | qms | apps/web/src/api/qms/audit.ts | 7 |
| 1683 | POST | `/api/qms/audit-plans` | qms | apps/web/src/api/qms/audit.ts | 26 |
| 1684 | POST | `/api/qms/audit-plans/{param}/start` | qms | apps/web/src/api/qms/audit.ts | 31 |
| 1685 | POST | `/api/qms/audit-plans/{param}/complete` | qms | apps/web/src/api/qms/audit.ts | 38 |
| 1686 | POST | `/api/qms/audit-tasks` | qms | apps/web/src/api/qms/audit.ts | 51 |
| 1687 | PUT | `/api/qms/audit-tasks/{param}/complete` | qms | apps/web/src/api/qms/audit.ts | 65 |
| 1688 | POST | `/api/qms/audit-findings` | qms | apps/web/src/api/qms/audit.ts | 78 |
| 1689 | POST | `/api/qms/audit-findings/{param}/verify` | qms | apps/web/src/api/qms/audit.ts | 96 |
| 1690 | POST | `/api/qms/actions/{param}/complete` | qms | apps/web/src/api/qms/correctiveAction.ts | 16 |
| 1691 | GET | `/api/qms/actions/{param}/items` | qms | apps/web/src/api/qms/correctiveAction.ts | 28 |
| 1692 | GET | `/api/qms/quality-dashboard/overview` | qms | apps/web/src/api/qms/dashboard.ts | 12 |
| 1693 | GET | `/api/qms/eightd` | qms | apps/web/src/api/qms/eightD.ts | 19 |
| 1694 | GET | `/api/qms/eightd/{param}` | qms | apps/web/src/api/qms/eightD.ts | 25 |
| 1695 | POST | `/api/qms/eightd` | qms | apps/web/src/api/qms/eightD.ts | 36 |
| 1696 | PUT | `/api/qms/eightd/{param}` | qms | apps/web/src/api/qms/eightD.ts | 57 |
| 1697 | DELETE | `/api/qms/eightd/{param}` | qms | apps/web/src/api/qms/eightD.ts | 65 |
| 1698 | PUT | `/api/qms/eightd/{param}/d1-team` | qms | apps/web/src/api/qms/eightD.ts | 72 |
| 1699 | POST | `/api/qms/eightd/{param}/d3-containment` | qms | apps/web/src/api/qms/eightD.ts | 87 |
| 1700 | POST | `/api/qms/eightd/{param}/d4-root-cause` | qms | apps/web/src/api/qms/eightD.ts | 101 |
| 1701 | POST | `/api/qms/eightd/{param}/d5-permanent-action` | qms | apps/web/src/api/qms/eightD.ts | 115 |
| 1702 | POST | `/api/qms/eightd/{param}/d6-verify` | qms | apps/web/src/api/qms/eightD.ts | 129 |
| 1703 | POST | `/api/qms/eightd/{param}/d7-preventive` | qms | apps/web/src/api/qms/eightD.ts | 140 |
| 1704 | POST | `/api/qms/eightd/{param}/close` | qms | apps/web/src/api/qms/eightD.ts | 154 |
| 1705 | GET | `/api/qms/eightd/{param}/audit-logs` | qms | apps/web/src/api/qms/eightD.ts | 162 |
| 1706 | GET | `/api/qms/fmea` | qms | apps/web/src/api/qms/fmea.ts | 25 |
| 1707 | GET | `/api/qms/fmea/{param}` | qms | apps/web/src/api/qms/fmea.ts | 31 |
| 1708 | POST | `/api/qms/fmea` | qms | apps/web/src/api/qms/fmea.ts | 42 |
| 1709 | PUT | `/api/qms/fmea/{param}` | qms | apps/web/src/api/qms/fmea.ts | 67 |
| 1710 | DELETE | `/api/qms/fmea/{param}` | qms | apps/web/src/api/qms/fmea.ts | 75 |
| 1711 | GET | `/api/qms/fmea/{param}/statistics` | qms | apps/web/src/api/qms/fmea.ts | 79 |
| 1712 | GET | `/api/qms/fmea-items` | qms | apps/web/src/api/qms/fmea.ts | 87 |
| 1713 | GET | `/api/qms/fmea-items/{param}` | qms | apps/web/src/api/qms/fmea.ts | 95 |
| 1714 | POST | `/api/qms/fmea-items` | qms | apps/web/src/api/qms/fmea.ts | 117 |
| 1715 | PUT | `/api/qms/fmea-items/{param}` | qms | apps/web/src/api/qms/fmea.ts | 148 |
| 1716 | DELETE | `/api/qms/fmea-items/{param}` | qms | apps/web/src/api/qms/fmea.ts | 156 |
| 1717 | GET | `/api/qms/actions/{param}` | qms | apps/web/src/api/qms/improvement.ts | 24 |
| 1718 | POST | `/api/qms/actions` | qms | apps/web/src/api/qms/improvement.ts | 35 |
| 1719 | PUT | `/api/qms/actions/{param}` | qms | apps/web/src/api/qms/improvement.ts | 54 |
| 1720 | DELETE | `/api/qms/actions/{param}` | qms | apps/web/src/api/qms/improvement.ts | 65 |
| 1721 | GET | `/api/qms/health` | qms | apps/web/src/api/qms/index.ts | 299 |
| 1722 | GET | `/api/qms/checks/{param}` | qms | apps/web/src/api/qms/inspection.ts | 27 |
| 1723 | POST | `/api/qms/checks` | qms | apps/web/src/api/qms/inspection.ts | 38 |
| 1724 | PUT | `/api/qms/checks/{param}` | qms | apps/web/src/api/qms/inspection.ts | 55 |
| 1725 | DELETE | `/api/qms/checks/{param}` | qms | apps/web/src/api/qms/inspection.ts | 66 |
| 1726 | POST | `/api/qms/checks/{param}/assign` | qms | apps/web/src/api/qms/inspection.ts | 73 |
| 1727 | POST | `/api/qms/checks/{param}/submit` | qms | apps/web/src/api/qms/inspection.ts | 87 |
| 1728 | POST | `/api/qms/checks/{param}/audit` | qms | apps/web/src/api/qms/inspection.ts | 101 |
| 1729 | POST | `/api/qms/checks/{param}/rework` | qms | apps/web/src/api/qms/inspection.ts | 115 |
| 1730 | GET | `/api/qms/checks/{param}/results` | qms | apps/web/src/api/qms/inspection.ts | 126 |
| 1731 | GET | `/api/qms/checks/{param}/audits` | qms | apps/web/src/api/qms/inspection.ts | 133 |
| 1732 | GET | `/api/qms/issues/{param}` | qms | apps/web/src/api/qms/issue.ts | 21 |
| 1733 | POST | `/api/qms/issues` | qms | apps/web/src/api/qms/issue.ts | 32 |
| 1734 | PUT | `/api/qms/issues/{param}` | qms | apps/web/src/api/qms/issue.ts | 50 |
| 1735 | DELETE | `/api/qms/issues/{param}` | qms | apps/web/src/api/qms/issue.ts | 58 |
| 1736 | GET | `/api/qms/quality-costs` | qms | apps/web/src/api/qms/qualityCost.ts | 22 |
| 1737 | GET | `/api/qms/quality-costs/{param}` | qms | apps/web/src/api/qms/qualityCost.ts | 28 |
| 1738 | POST | `/api/qms/quality-costs` | qms | apps/web/src/api/qms/qualityCost.ts | 39 |
| 1739 | PUT | `/api/qms/quality-costs/{param}` | qms | apps/web/src/api/qms/qualityCost.ts | 62 |
| 1740 | DELETE | `/api/qms/quality-costs/{param}` | qms | apps/web/src/api/qms/qualityCost.ts | 73 |
| 1741 | GET | `/api/qms/quality-costs/statistics` | qms | apps/web/src/api/qms/qualityCost.ts | 80 |
| 1742 | GET | `/api/qms/quality-costs/trend` | qms | apps/web/src/api/qms/qualityCost.ts | 97 |
| 1743 | GET | `/api/qms/spc/charts` | qms | apps/web/src/api/qms/spc.ts | 23 |
| 1744 | GET | `/api/qms/spc/charts/{param}` | qms | apps/web/src/api/qms/spc.ts | 29 |
| 1745 | POST | `/api/qms/spc/charts` | qms | apps/web/src/api/qms/spc.ts | 40 |
| 1746 | PUT | `/api/qms/spc/charts/{param}` | qms | apps/web/src/api/qms/spc.ts | 68 |
| 1747 | DELETE | `/api/qms/spc/charts/{param}` | qms | apps/web/src/api/qms/spc.ts | 76 |
| 1748 | GET | `/api/qms/spc/charts/{param}/data-points` | qms | apps/web/src/api/qms/spc.ts | 80 |
| 1749 | POST | `/api/qms/spc/data-points` | qms | apps/web/src/api/qms/spc.ts | 109 |
| 1750 | POST | `/api/qms/spc/charts/{param}/calculate` | qms | apps/web/src/api/qms/spc.ts | 119 |
| 1751 | GET | `/api/qms/standards/{param}` | qms | apps/web/src/api/qms/standard.ts | 23 |
| 1752 | POST | `/api/qms/standards` | qms | apps/web/src/api/qms/standard.ts | 34 |
| 1753 | PUT | `/api/qms/standards/{param}` | qms | apps/web/src/api/qms/standard.ts | 52 |
| 1754 | DELETE | `/api/qms/standards/{param}` | qms | apps/web/src/api/qms/standard.ts | 63 |
| 1755 | GET | `/api/qms/standards/{param}/revisions` | qms | apps/web/src/api/qms/standard.ts | 67 |
| 1756 | GET | `/api/qms/sync-records` | qms | apps/web/src/api/qms/sync.ts | 13 |
| 1757 | GET | `/api/qms/sync-records/{param}` | qms | apps/web/src/api/qms/sync.ts | 26 |
| 1758 | DELETE | `/api/qms/sync-records/{param}` | qms | apps/web/src/api/qms/sync.ts | 34 |
| 1759 | POST | `/api/qms/sync-records/{param}/retry` | qms | apps/web/src/api/qms/sync.ts | 38 |
| 1760 | POST | `/api/qms/sync/inspection-to-lims` | qms | apps/web/src/api/qms/sync.ts | 48 |
| 1761 | POST | `/api/qms/sync/issue-to-ehs` | qms | apps/web/src/api/qms/sync.ts | 58 |
| 1762 | GET | `/api/rd/bugs/{param}` | rd | apps/web/src/api/rd/bug.ts | 34 |
| 1763 | POST | `/api/rd/bugs` | rd | apps/web/src/api/rd/bug.ts | 38 |
| 1764 | PUT | `/api/rd/bugs/{param}` | rd | apps/web/src/api/rd/bug.ts | 42 |
| 1765 | DELETE | `/api/rd/bugs/{param}` | rd | apps/web/src/api/rd/bug.ts | 46 |
| 1766 | GET | `/api/rd/builds/{param}` | rd | apps/web/src/api/rd/build.ts | 32 |
| 1767 | POST | `/api/rd/builds` | rd | apps/web/src/api/rd/build.ts | 36 |
| 1768 | GET | `/api/rd/deploys/{param}` | rd | apps/web/src/api/rd/deploy.ts | 33 |
| 1769 | POST | `/api/rd/deploys` | rd | apps/web/src/api/rd/deploy.ts | 37 |
| 1770 | GET | `/api/rd/experiments/{param}` | rd | apps/web/src/api/rd/experiment.ts | 40 |
| 1771 | POST | `/api/rd/experiments` | rd | apps/web/src/api/rd/experiment.ts | 44 |
| 1772 | PUT | `/api/rd/experiments/{param}` | rd | apps/web/src/api/rd/experiment.ts | 51 |
| 1773 | DELETE | `/api/rd/experiments/{param}` | rd | apps/web/src/api/rd/experiment.ts | 55 |
| 1774 | GET | `/api/rd/experiments/project/{param}` | rd | apps/web/src/api/rd/experiment.ts | 59 |
| 1775 | POST | `/api/rd/experiments/{param}/advance-phase` | rd | apps/web/src/api/rd/experiment.ts | 142 |
| 1776 | GET | `/api/rd/batch-trace/{param}` | rd | apps/web/src/api/rd/experiment.ts | 146 |
| 1777 | GET | `/api/rd/experiments/{param}/records` | rd | apps/web/src/api/rd/experiment.ts | 150 |
| 1778 | POST | `/api/rd/experiments/{param}/records` | rd | apps/web/src/api/rd/experiment.ts | 157 |
| 1779 | GET | `/api/rd/formulas/{param}` | rd | apps/web/src/api/rd/formula.ts | 33 |
| 1780 | POST | `/api/rd/formulas` | rd | apps/web/src/api/rd/formula.ts | 37 |
| 1781 | PUT | `/api/rd/formulas/{param}` | rd | apps/web/src/api/rd/formula.ts | 41 |
| 1782 | DELETE | `/api/rd/formulas/{param}` | rd | apps/web/src/api/rd/formula.ts | 45 |
| 1783 | GET | `/api/rd/formulas/{param}/versions` | rd | apps/web/src/api/rd/formula.ts | 49 |
| 1784 | GET | `/api/rd/formulas/{param}/versions` | rd | apps/web/src/api/rd/formula.ts | 53 |
| 1785 | POST | `/api/rd/formulas/{param}/versions` | rd | apps/web/src/api/rd/formula.ts | 60 |
| 1786 | POST | `/api/rd/formulas/{param}/versions` | rd | apps/web/src/api/rd/formula.ts | 67 |
| 1787 | POST | `/api/rd/formulas/{param}/approve` | rd | apps/web/src/api/rd/formula.ts | 71 |
| 1788 | GET | `/api/rd/health` | rd | apps/web/src/api/rd/index.ts | 56 |
| 1789 | GET | `/api/rd/materials/{param}` | rd | apps/web/src/api/rd/material.ts | 35 |
| 1790 | POST | `/api/rd/materials` | rd | apps/web/src/api/rd/material.ts | 39 |
| 1791 | PUT | `/api/rd/materials/{param}` | rd | apps/web/src/api/rd/material.ts | 46 |
| 1792 | DELETE | `/api/rd/materials/{param}` | rd | apps/web/src/api/rd/material.ts | 50 |
| 1793 | DELETE | `/api/rd/materials/batch` | rd | apps/web/src/api/rd/material.ts | 54 |
| 1794 | POST | `/api/rd/materials/import` | rd | apps/web/src/api/rd/material.ts | 59 |
| 1795 | POST | `/api/rd/projects/batch` | rd | apps/web/src/api/rd/project.ts | 59 |
| 1796 | DELETE | `/api/rd/projects/batch` | rd | apps/web/src/api/rd/project.ts | 65 |
| 1797 | POST | `/api/rd/projects/import` | rd | apps/web/src/api/rd/project.ts | 75 |
| 1798 | GET | `/api/rd/projects/{param}/dashboard` | rd | apps/web/src/api/rd/project.ts | 83 |
| 1799 | GET | `/api/rd/projects/{param}/gantt` | rd | apps/web/src/api/rd/project.ts | 87 |
| 1800 | GET | `/api/rd/statistics` | rd | apps/web/src/api/rd/statistics.ts | 7 |
| 1801 | GET | `/api/bi/reports` | bi | apps/web/src/api/report/index.ts | 278 |
| 1802 | GET | `/api/bi/reports/{param}` | bi | apps/web/src/api/report/index.ts | 282 |
| 1803 | POST | `/api/bi/reports` | bi | apps/web/src/api/report/index.ts | 286 |
| 1804 | POST | `/api/bi/reports/from-template` | bi | apps/web/src/api/report/index.ts | 292 |
| 1805 | PUT | `/api/bi/reports/{param}` | bi | apps/web/src/api/report/index.ts | 299 |
| 1806 | DELETE | `/api/bi/reports/{param}` | bi | apps/web/src/api/report/index.ts | 303 |
| 1807 | POST | `/api/bi/reports/{param}/export` | bi | apps/web/src/api/report/index.ts | 310 |
| 1808 | POST | `/api/bi/reports/{param}/run` | bi | apps/web/src/api/report/index.ts | 314 |
| 1809 | GET | `/api/bi/templates` | bi | apps/web/src/api/report/index.ts | 318 |
| 1810 | GET | `/api/bi/templates/{param}` | bi | apps/web/src/api/report/index.ts | 322 |
| 1811 | POST | `/api/bi/templates` | bi | apps/web/src/api/report/index.ts | 328 |
| 1812 | PUT | `/api/bi/templates/{param}` | bi | apps/web/src/api/report/index.ts | 335 |
| 1813 | DELETE | `/api/bi/templates/{param}` | bi | apps/web/src/api/report/index.ts | 339 |
| 1814 | GET | `/api/bi/report-types` | bi | apps/web/src/api/report/index.ts | 343 |
| 1815 | GET | `/api/bi/schedules` | bi | apps/web/src/api/report/index.ts | 347 |
| 1816 | GET | `/api/bi/schedules/{param}` | bi | apps/web/src/api/report/index.ts | 351 |
| 1817 | POST | `/api/bi/schedules` | bi | apps/web/src/api/report/index.ts | 355 |
| 1818 | PUT | `/api/bi/schedules/{param}` | bi | apps/web/src/api/report/index.ts | 362 |
| 1819 | DELETE | `/api/bi/schedules/{param}` | bi | apps/web/src/api/report/index.ts | 366 |
| 1820 | POST | `/api/bi/schedules/{param}/execute` | bi | apps/web/src/api/report/index.ts | 370 |
| 1821 | GET | `/api/bi/schedules/{param}/history` | bi | apps/web/src/api/report/index.ts | 374 |
| 1822 | GET | `/api/bi/subscriptions` | bi | apps/web/src/api/report/index.ts | 378 |
| 1823 | GET | `/api/bi/subscriptions/{param}` | bi | apps/web/src/api/report/index.ts | 382 |
| 1824 | POST | `/api/bi/subscriptions` | bi | apps/web/src/api/report/index.ts | 388 |
| 1825 | PUT | `/api/bi/subscriptions/{param}` | bi | apps/web/src/api/report/index.ts | 395 |
| 1826 | DELETE | `/api/bi/subscriptions/{param}` | bi | apps/web/src/api/report/index.ts | 399 |
| 1827 | POST | `/api/bi/subscriptions/{param}/toggle` | bi | apps/web/src/api/report/index.ts | 403 |
| 1828 | GET | `/api/bi/subscriptions/user/{param}` | bi | apps/web/src/api/report/index.ts | 407 |
| 1829 | GET | `/api/bi/health` | bi | apps/web/src/api/report/index.ts | 411 |
| 1830 | GET | `/api/bi/reports-center/stats` | bi | apps/web/src/api/report/index.ts | 415 |
| 1831 | POST | `/api/bi/reports-center/export/{param}` | bi | apps/web/src/api/report/index.ts | 422 |
| 1832 | GET | `/api/scm/audit-logs` | scm | apps/web/src/api/scm/auditLog.ts | 7 |
| 1833 | GET | `/api/scm/audit-logs/{param}` | scm | apps/web/src/api/scm/auditLog.ts | 11 |
| 1834 | GET | `/api/scm/delivery-appointments` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 19 |
| 1835 | POST | `/api/scm/delivery-appointments` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 25 |
| 1836 | GET | `/api/scm/delivery-appointments/{param}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 29 |
| 1837 | PUT | `/api/scm/delivery-appointments/{param}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 36 |
| 1838 | DELETE | `/api/scm/delivery-appointments/{param}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 40 |
| 1839 | POST | `/api/scm/delivery-appointments/{param}/approve` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 47 |
| 1840 | POST | `/api/scm/delivery-appointments/{param}/reject` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 54 |
| 1841 | POST | `/api/scm/delivery-appointments/{param}/confirm-arrival` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 61 |
| 1842 | POST | `/api/scm/delivery-appointments/{param}/complete` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 68 |
| 1843 | POST | `/api/scm/delivery-appointments/{param}/cancel` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 75 |
| 1844 | GET | `/api/scm/delivery-appointments/stats` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 79 |
| 1845 | GET | `/api/scm/{param}` | scm | apps/web/src/api/scm/factory.ts | 26 |
| 1846 | GET | `/api/scm/{param}/{param}` | scm | apps/web/src/api/scm/factory.ts | 30 |
| 1847 | POST | `/api/scm/{param}` | scm | apps/web/src/api/scm/factory.ts | 34 |
| 1848 | PUT | `/api/scm/{param}/{param}` | scm | apps/web/src/api/scm/factory.ts | 38 |
| 1849 | DELETE | `/api/scm/{param}/{param}` | scm | apps/web/src/api/scm/factory.ts | 42 |
| 1850 | GET | `/api/scm/incoming-inspections` | scm | apps/web/src/api/scm/incomingInspection.ts | 15 |
| 1851 | POST | `/api/scm/incoming-inspections` | scm | apps/web/src/api/scm/incomingInspection.ts | 21 |
| 1852 | GET | `/api/scm/incoming-inspections/{param}` | scm | apps/web/src/api/scm/incomingInspection.ts | 25 |
| 1853 | PUT | `/api/scm/incoming-inspections/{param}` | scm | apps/web/src/api/scm/incomingInspection.ts | 32 |
| 1854 | DELETE | `/api/scm/incoming-inspections/{param}` | scm | apps/web/src/api/scm/incomingInspection.ts | 36 |
| 1855 | POST | `/api/scm/incoming-inspections/{param}/pass` | scm | apps/web/src/api/scm/incomingInspection.ts | 40 |
| 1856 | POST | `/api/scm/incoming-inspections/{param}/reject` | scm | apps/web/src/api/scm/incomingInspection.ts | 47 |
| 1857 | GET | `/api/scm/health` | scm | apps/web/src/api/scm/index.ts | 62 |
| 1858 | GET | `/api/scm/incoming-inspections/{param}/records` | scm | apps/web/src/api/scm/inspectionRecord.ts | 14 |
| 1859 | POST | `/api/scm/inspection-records` | scm | apps/web/src/api/scm/inspectionRecord.ts | 18 |
| 1860 | GET | `/api/scm/inspection-records/{param}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 22 |
| 1861 | PUT | `/api/scm/inspection-records/{param}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 29 |
| 1862 | DELETE | `/api/scm/inspection-records/{param}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 33 |
| 1863 | GET | `/api/scm/inventory-turnover` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 16 |
| 1864 | GET | `/api/scm/inventory-turnover/{param}` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 20 |
| 1865 | GET | `/api/scm/inventory-turnover/abc-classification` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 26 |
| 1866 | GET | `/api/scm/inventory-turnover/trend` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 30 |
| 1867 | GET | `/api/scm/mrp/suggestions` | scm | apps/web/src/api/scm/mrpPlan.ts | 13 |
| 1868 | POST | `/api/scm/mrp/suggestions` | scm | apps/web/src/api/scm/mrpPlan.ts | 17 |
| 1869 | GET | `/api/scm/mrp/suggestions/{param}` | scm | apps/web/src/api/scm/mrpPlan.ts | 21 |
| 1870 | PUT | `/api/scm/mrp/suggestions/{param}` | scm | apps/web/src/api/scm/mrpPlan.ts | 25 |
| 1871 | DELETE | `/api/scm/mrp/suggestions/{param}` | scm | apps/web/src/api/scm/mrpPlan.ts | 29 |
| 1872 | POST | `/api/scm/mrp/suggestions/{param}/confirm` | scm | apps/web/src/api/scm/mrpPlan.ts | 33 |
| 1873 | GET | `/api/scm/mrp-suggestions` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 14 |
| 1874 | GET | `/api/scm/mrp-suggestions/{param}` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 18 |
| 1875 | GET | `/api/scm/mrp-suggestions/summary` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 24 |
| 1876 | GET | `/api/scm/comparisons` | scm | apps/web/src/api/scm/priceComparison.ts | 17 |
| 1877 | POST | `/api/scm/comparisons` | scm | apps/web/src/api/scm/priceComparison.ts | 21 |
| 1878 | GET | `/api/scm/comparisons/{param}` | scm | apps/web/src/api/scm/priceComparison.ts | 25 |
| 1879 | PUT | `/api/scm/comparisons/{param}` | scm | apps/web/src/api/scm/priceComparison.ts | 32 |
| 1880 | DELETE | `/api/scm/comparisons/{param}` | scm | apps/web/src/api/scm/priceComparison.ts | 36 |
| 1881 | GET | `/api/scm/comparisons/{param}` | scm | apps/web/src/api/scm/priceComparison.ts | 40 |
| 1882 | GET | `/api/scm/quotes` | scm | apps/web/src/api/scm/priceComparison.ts | 44 |
| 1883 | POST | `/api/scm/quotes` | scm | apps/web/src/api/scm/priceComparison.ts | 48 |
| 1884 | GET | `/api/scm/purchase-contracts` | scm | apps/web/src/api/scm/purchaseContract.ts | 14 |
| 1885 | POST | `/api/scm/purchase-contracts` | scm | apps/web/src/api/scm/purchaseContract.ts | 18 |
| 1886 | GET | `/api/scm/purchase-contracts/{param}` | scm | apps/web/src/api/scm/purchaseContract.ts | 22 |
| 1887 | PUT | `/api/scm/purchase-contracts/{param}` | scm | apps/web/src/api/scm/purchaseContract.ts | 29 |
| 1888 | DELETE | `/api/scm/purchase-contracts/{param}` | scm | apps/web/src/api/scm/purchaseContract.ts | 33 |
| 1889 | POST | `/api/scm/purchase-contracts/{param}/submit` | scm | apps/web/src/api/scm/purchaseContract.ts | 37 |
| 1890 | POST | `/api/scm/purchase-contracts/{param}/approve` | scm | apps/web/src/api/scm/purchaseContract.ts | 41 |
| 1891 | POST | `/api/scm/purchase-contracts/{param}/reject` | scm | apps/web/src/api/scm/purchaseContract.ts | 45 |
| 1892 | POST | `/api/scm/purchase-contracts/{param}/cancel` | scm | apps/web/src/api/scm/purchaseContract.ts | 49 |
| 1893 | POST | `/api/scm/purchase-contracts/{param}/terminate` | scm | apps/web/src/api/scm/purchaseContract.ts | 53 |
| 1894 | POST | `/api/scm/purchase-contracts/{param}/renew` | scm | apps/web/src/api/scm/purchaseContract.ts | 57 |
| 1895 | GET | `/api/scm/purchase-items` | scm | apps/web/src/api/scm/purchaseItem.ts | 14 |
| 1896 | POST | `/api/scm/purchase-items` | scm | apps/web/src/api/scm/purchaseItem.ts | 18 |
| 1897 | GET | `/api/scm/purchase-items/{param}` | scm | apps/web/src/api/scm/purchaseItem.ts | 22 |
| 1898 | PUT | `/api/scm/purchase-items/{param}` | scm | apps/web/src/api/scm/purchaseItem.ts | 29 |
| 1899 | POST | `/api/scm/purchase-orders/{param}/confirm` | scm | apps/web/src/api/scm/purchaseOrder.ts | 40 |
| 1900 | POST | `/api/scm/purchase-orders/{param}/cancel` | scm | apps/web/src/api/scm/purchaseOrder.ts | 44 |
| 1901 | POST | `/api/scm/purchase-orders/{param}/close` | scm | apps/web/src/api/scm/purchaseOrder.ts | 48 |
| 1902 | GET | `/api/scm/purchase-requisitions` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 14 |
| 1903 | POST | `/api/scm/purchase-requisitions` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 20 |
| 1904 | GET | `/api/scm/purchase-requisitions/{param}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 24 |
| 1905 | PUT | `/api/scm/purchase-requisitions/{param}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 31 |
| 1906 | DELETE | `/api/scm/purchase-requisitions/{param}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 35 |
| 1907 | POST | `/api/scm/purchase-requisitions/{param}/submit` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 39 |
| 1908 | POST | `/api/scm/purchase-requisitions/{param}/approve` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 43 |
| 1909 | POST | `/api/scm/purchase-requisitions/{param}/reject` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 47 |
| 1910 | POST | `/api/scm/purchase-requisitions/{param}/cancel` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 51 |
| 1911 | POST | `/api/scm/purchase-requisitions/{param}/convert-to-order` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 55 |
| 1912 | GET | `/api/scm/supplier-admissions` | scm | apps/web/src/api/scm/supplierAdmission.ts | 14 |
| 1913 | POST | `/api/scm/supplier-admissions` | scm | apps/web/src/api/scm/supplierAdmission.ts | 18 |
| 1914 | GET | `/api/scm/supplier-admissions/{param}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 22 |
| 1915 | PUT | `/api/scm/supplier-admissions/{param}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 29 |
| 1916 | DELETE | `/api/scm/supplier-admissions/{param}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 33 |
| 1917 | POST | `/api/scm/supplier-admissions/{param}/submit` | scm | apps/web/src/api/scm/supplierAdmission.ts | 37 |
| 1918 | POST | `/api/scm/supplier-admissions/{param}/approve` | scm | apps/web/src/api/scm/supplierAdmission.ts | 41 |
| 1919 | POST | `/api/scm/supplier-admissions/{param}/reject` | scm | apps/web/src/api/scm/supplierAdmission.ts | 45 |
| 1920 | POST | `/api/scm/supplier-admissions/{param}/audit` | scm | apps/web/src/api/scm/supplierAdmission.ts | 54 |
| 1921 | POST | `/api/scm/supplier-admissions/{param}/activate-supplier` | scm | apps/web/src/api/scm/supplierAdmission.ts | 58 |
| 1922 | GET | `/api/scm/evaluations` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 14 |
| 1923 | POST | `/api/scm/evaluations` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 20 |
| 1924 | GET | `/api/scm/evaluations/{param}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 24 |
| 1925 | PUT | `/api/scm/evaluations/{param}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 31 |
| 1926 | DELETE | `/api/scm/evaluations/{param}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 35 |
| 1927 | GET | `/api/scm/dashboard/overview` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 12 |
| 1928 | GET | `/api/scm/dashboard/purchase-inbound-outbound` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 16 |
| 1929 | GET | `/api/scm/dashboard/supplier-performance` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 22 |
| 1930 | GET | `/api/scm/sync-records` | scm | apps/web/src/api/scm/syncRecord.ts | 15 |
| 1931 | POST | `/api/scm/sync-records` | scm | apps/web/src/api/scm/syncRecord.ts | 19 |
| 1932 | GET | `/api/scm/sync-records/{param}` | scm | apps/web/src/api/scm/syncRecord.ts | 23 |
| 1933 | POST | `/api/scm/sync-records/{param}/retry` | scm | apps/web/src/api/scm/syncRecord.ts | 27 |
| 1934 | POST | `/api/scm/sync/wms/{param}` | scm | apps/web/src/api/scm/syncRecord.ts | 31 |
| 1935 | POST | `/api/scm/sync/srm/{param}` | scm | apps/web/src/api/scm/syncRecord.ts | 35 |
| 1936 | GET | `/api/scm/sync-records/{param}/details` | scm | apps/web/src/api/scm/syncRecord.ts | 42 |
| 1937 | GET | `/api/portal/search` | portal | apps/web/src/api/search/index.ts | 39 |
| 1938 | GET | `/api/portal/search/suggestions` | portal | apps/web/src/api/search/index.ts | 46 |
| 1939 | GET | `/api/core/file/attachments` | file | apps/web/src/api/shared/index.ts | 47 |
| 1940 | GET | `/api/core/file/attachments/{param}` | file | apps/web/src/api/shared/index.ts | 51 |
| 1941 | DELETE | `/api/core/file/attachments/{param}` | file | apps/web/src/api/shared/index.ts | 55 |
| 1942 | GET | `/api/core/file/attachments/{param}/download` | file | apps/web/src/api/shared/index.ts | 59 |
| 1943 | GET | `/api/core/comments` | core | apps/web/src/api/shared/index.ts | 93 |
| 1944 | POST | `/api/core/comments` | core | apps/web/src/api/shared/index.ts | 97 |
| 1945 | PUT | `/api/core/comments/{param}` | core | apps/web/src/api/shared/index.ts | 101 |
| 1946 | DELETE | `/api/core/comments/{param}` | core | apps/web/src/api/shared/index.ts | 105 |
| 1947 | GET | `/api/core/favorites` | core | apps/web/src/api/shared/index.ts | 127 |
| 1948 | POST | `/api/core/favorites` | core | apps/web/src/api/shared/index.ts | 131 |
| 1949 | DELETE | `/api/core/favorites/{param}` | core | apps/web/src/api/shared/index.ts | 135 |
| 1950 | GET | `/api/core/favorites/check` | core | apps/web/src/api/shared/index.ts | 139 |
| 1951 | GET | `/api/core/search` | core | apps/web/src/api/shared/index.ts | 176 |
| 1952 | GET | `/api/core/search/suggestions` | core | apps/web/src/api/shared/index.ts | 180 |
| 1953 | GET | `/api/core/search/recent` | core | apps/web/src/api/shared/index.ts | 184 |
| 1954 | DELETE | `/api/core/search/recent` | core | apps/web/src/api/shared/index.ts | 188 |
| 1955 | GET | `/api/srm/supplier-evaluations` | srm | apps/web/src/api/srm/index.ts | 498 |
| 1956 | GET | `/api/srm/supplier-evaluations/{param}` | srm | apps/web/src/api/srm/index.ts | 501 |
| 1957 | POST | `/api/srm/supplier-evaluations` | srm | apps/web/src/api/srm/index.ts | 506 |
| 1958 | PUT | `/api/srm/supplier-evaluations/{param}` | srm | apps/web/src/api/srm/index.ts | 512 |
| 1959 | DELETE | `/api/srm/supplier-evaluations/{param}` | srm | apps/web/src/api/srm/index.ts | 515 |
| 1960 | GET | `/api/srm/purchase-orders` | srm | apps/web/src/api/srm/index.ts | 520 |
| 1961 | GET | `/api/srm/purchase-orders/{param}` | srm | apps/web/src/api/srm/index.ts | 523 |
| 1962 | POST | `/api/srm/purchase-orders` | srm | apps/web/src/api/srm/index.ts | 528 |
| 1963 | PUT | `/api/srm/purchase-orders/{param}` | srm | apps/web/src/api/srm/index.ts | 534 |
| 1964 | DELETE | `/api/srm/purchase-orders/{param}` | srm | apps/web/src/api/srm/index.ts | 537 |
| 1965 | GET | `/api/srm/supplier-contracts` | srm | apps/web/src/api/srm/index.ts | 542 |
| 1966 | GET | `/api/srm/supplier-contracts/{param}` | srm | apps/web/src/api/srm/index.ts | 545 |
| 1967 | POST | `/api/srm/supplier-contracts` | srm | apps/web/src/api/srm/index.ts | 550 |
| 1968 | PUT | `/api/srm/supplier-contracts/{param}` | srm | apps/web/src/api/srm/index.ts | 556 |
| 1969 | DELETE | `/api/srm/supplier-contracts/{param}` | srm | apps/web/src/api/srm/index.ts | 559 |
| 1970 | GET | `/api/srm/statistics` | srm | apps/web/src/api/srm/index.ts | 564 |
| 1971 | GET | `/api/srm/statistics/detailed` | srm | apps/web/src/api/srm/index.ts | 567 |
| 1972 | GET | `/api/srm/suppliers-with-stats` | srm | apps/web/src/api/srm/index.ts | 570 |
| 1973 | GET | `/api/srm/scoring-dimensions` | srm | apps/web/src/api/srm/index.ts | 575 |
| 1974 | GET | `/api/srm/scoring-dimensions/active` | srm | apps/web/src/api/srm/index.ts | 578 |
| 1975 | GET | `/api/srm/scoring-dimensions/{param}` | srm | apps/web/src/api/srm/index.ts | 581 |
| 1976 | POST | `/api/srm/scoring-dimensions` | srm | apps/web/src/api/srm/index.ts | 586 |
| 1977 | PUT | `/api/srm/scoring-dimensions/{param}` | srm | apps/web/src/api/srm/index.ts | 592 |
| 1978 | DELETE | `/api/srm/scoring-dimensions/{param}` | srm | apps/web/src/api/srm/index.ts | 595 |
| 1979 | GET | `/api/srm/performance/reports` | srm | apps/web/src/api/srm/index.ts | 610 |
| 1980 | GET | `/api/srm/performance/reports/{param}` | srm | apps/web/src/api/srm/index.ts | 613 |
| 1981 | GET | `/api/srm/performance/summary` | srm | apps/web/src/api/srm/index.ts | 616 |
| 1982 | GET | `/api/srm/performance/score-level-distribution` | srm | apps/web/src/api/srm/index.ts | 624 |
| 1983 | GET | `/api/srm/performance/top-suppliers` | srm | apps/web/src/api/srm/index.ts | 632 |
| 1984 | GET | `/api/srm/performance/trend` | srm | apps/web/src/api/srm/index.ts | 639 |
| 1985 | GET | `/api/srm/performance/compare` | srm | apps/web/src/api/srm/index.ts | 644 |
| 1986 | GET | `/api/srm/health` | srm | apps/web/src/api/srm/index.ts | 648 |
| 1987 | GET | `/api/srm/supplier-portal/{param}/stats` | srm | apps/web/src/api/srm/index.ts | 653 |
| 1988 | GET | `/api/srm/supplier-portal/{param}/orders` | srm | apps/web/src/api/srm/index.ts | 656 |
| 1989 | GET | `/api/srm/supplier-portal/{param}/invoices` | srm | apps/web/src/api/srm/index.ts | 659 |
| 1990 | GET | `/api/srm/supplier-portal/{param}/deliveries` | srm | apps/web/src/api/srm/index.ts | 662 |
| 1991 | GET | `/api/srm/supplier-portal/announcements` | srm | apps/web/src/api/srm/index.ts | 665 |
| 1992 | GET | `/api/srm/inquiries` | srm | apps/web/src/api/srm/index.ts | 672 |
| 1993 | GET | `/api/srm/inquiries/{param}` | srm | apps/web/src/api/srm/index.ts | 675 |
| 1994 | POST | `/api/srm/inquiries` | srm | apps/web/src/api/srm/index.ts | 678 |
| 1995 | PUT | `/api/srm/inquiries/{param}` | srm | apps/web/src/api/srm/index.ts | 684 |
| 1996 | DELETE | `/api/srm/inquiries/{param}` | srm | apps/web/src/api/srm/index.ts | 687 |
| 1997 | POST | `/api/srm/inquiries/{param}/publish` | srm | apps/web/src/api/srm/index.ts | 690 |
| 1998 | POST | `/api/srm/inquiries/{param}/close` | srm | apps/web/src/api/srm/index.ts | 693 |
| 1999 | GET | `/api/srm/quotations/{param}` | srm | apps/web/src/api/srm/index.ts | 701 |
| 2000 | POST | `/api/srm/quotations` | srm | apps/web/src/api/srm/index.ts | 704 |
| 2001 | PUT | `/api/srm/quotations/{param}` | srm | apps/web/src/api/srm/index.ts | 710 |
| 2002 | POST | `/api/srm/quotations/{param}/award` | srm | apps/web/src/api/srm/index.ts | 713 |
| 2003 | POST | `/api/srm/quotations/{param}/reject` | srm | apps/web/src/api/srm/index.ts | 716 |
| 2004 | GET | `/api/srm/biddings` | srm | apps/web/src/api/srm/index.ts | 723 |
| 2005 | GET | `/api/srm/biddings/{param}` | srm | apps/web/src/api/srm/index.ts | 726 |
| 2006 | POST | `/api/srm/biddings` | srm | apps/web/src/api/srm/index.ts | 729 |
| 2007 | PUT | `/api/srm/biddings/{param}` | srm | apps/web/src/api/srm/index.ts | 735 |
| 2008 | DELETE | `/api/srm/biddings/{param}` | srm | apps/web/src/api/srm/index.ts | 738 |
| 2009 | POST | `/api/srm/biddings/{param}/publish` | srm | apps/web/src/api/srm/index.ts | 741 |
| 2010 | POST | `/api/srm/biddings/{param}/open` | srm | apps/web/src/api/srm/index.ts | 744 |
| 2011 | POST | `/api/srm/biddings/{param}/evaluate` | srm | apps/web/src/api/srm/index.ts | 747 |
| 2012 | POST | `/api/srm/biddings/{param}/award` | srm | apps/web/src/api/srm/index.ts | 750 |
| 2013 | GET | `/api/srm/biddings/{param}/suppliers` | srm | apps/web/src/api/srm/index.ts | 753 |
| 2014 | GET | `/api/core/system/audit-logs` | core | apps/web/src/api/system/audit.ts | 20 |
| 2015 | GET | `/api/core/system/audit-logs/{param}` | core | apps/web/src/api/system/audit.ts | 26 |
| 2016 | GET | `/api/core/system/audit-logs/export` | core | apps/web/src/api/system/audit.ts | 41 |
| 2017 | GET | `/api/erp/system/db/tables` | erp | apps/web/src/api/system/index.ts | 198 |
| 2018 | GET | `/api/erp/system/db/tables/{param}` | erp | apps/web/src/api/system/index.ts | 202 |
| 2019 | POST | `/api/erp/system/db/columns/preview` | erp | apps/web/src/api/system/index.ts | 209 |
| 2020 | POST | `/api/erp/system/db/columns` | erp | apps/web/src/api/system/index.ts | 216 |
| 2021 | PUT | `/api/erp/system/db/columns/{param}/{param}` | erp | apps/web/src/api/system/index.ts | 224 |
| 2022 | DELETE | `/api/erp/system/db/columns/{param}/{param}` | erp | apps/web/src/api/system/index.ts | 232 |
| 2023 | GET | `/api/erp/system/db/changes` | erp | apps/web/src/api/system/index.ts | 244 |
| 2024 | GET | `/api/core/system/config` | core | apps/web/src/api/system/params.ts | 7 |
| 2025 | PUT | `/api/core/system/config` | core | apps/web/src/api/system/params.ts | 11 |
| 2026 | GET | `/api/core/system/cache/config` | core | apps/web/src/api/system/params.ts | 15 |
| 2027 | PUT | `/api/core/system/cache/config` | core | apps/web/src/api/system/params.ts | 19 |
| 2028 | POST | `/api/core/system/cache/clear` | core | apps/web/src/api/system/params.ts | 23 |
| 2029 | GET | `/api/core/system/cache/stats` | core | apps/web/src/api/system/params.ts | 33 |
| 2030 | GET | `/api/core/system/log/config` | core | apps/web/src/api/system/params.ts | 37 |
| 2031 | PUT | `/api/core/system/log/config` | core | apps/web/src/api/system/params.ts | 41 |
| 2032 | GET | `/api/core/system/params` | core | apps/web/src/api/system/params.ts | 45 |
| 2033 | PUT | `/api/core/system/params` | core | apps/web/src/api/system/params.ts | 49 |
| 2034 | POST | `/api/core/doc/templates/{param}/render` | doc | apps/web/src/api/template/index.ts | 155 |
| 2035 | POST | `/api/core/doc/templates/{param}/duplicate` | doc | apps/web/src/api/template/index.ts | 161 |
| 2036 | PUT | `/api/core/doc/templates/{param}/toggle-status` | doc | apps/web/src/api/template/index.ts | 165 |
| 2037 | GET | `/api/core/{param}/list` | core | apps/web/src/api/tenant/index.ts | 27 |
| 2038 | GET | `/api/core/{param}/{param}` | core | apps/web/src/api/tenant/index.ts | 31 |
| 2039 | GET | `/api/core/{param}/slug/{param}` | core | apps/web/src/api/tenant/index.ts | 35 |
| 2040 | POST | `/api/core/{param}/create` | core | apps/web/src/api/tenant/index.ts | 39 |
| 2041 | PUT | `/api/core/{param}/{param}` | core | apps/web/src/api/tenant/index.ts | 46 |
| 2042 | DELETE | `/api/core/{param}/{param}` | core | apps/web/src/api/tenant/index.ts | 50 |
| 2043 | POST | `/api/core/{param}/{param}/activate` | core | apps/web/src/api/tenant/index.ts | 54 |
| 2044 | POST | `/api/core/{param}/{param}/suspend` | core | apps/web/src/api/tenant/index.ts | 58 |
| 2045 | GET | `/api/core/{param}/{param}/users` | core | apps/web/src/api/tenant/index.ts | 73 |
| 2046 | POST | `/api/core/{param}/{param}/users/invite` | core | apps/web/src/api/tenant/index.ts | 80 |
| 2047 | DELETE | `/api/core/{param}/{param}/users/{param}` | core | apps/web/src/api/tenant/index.ts | 84 |
| 2048 | PUT | `/api/core/{param}/{param}/users/{param}/role` | core | apps/web/src/api/tenant/index.ts | 92 |
| 2049 | GET | `/api/core/{param}/{param}/stats` | core | apps/web/src/api/tenant/index.ts | 96 |
| 2050 | GET | `/api/core/{param}/{param}/usage` | core | apps/web/src/api/tenant/index.ts | 100 |
| 2051 | GET | `/api/core/{param}/{param}/billing` | core | apps/web/src/api/tenant/index.ts | 104 |
| 2052 | GET | `/api/core/{param}/{param}/invoices` | core | apps/web/src/api/tenant/index.ts | 108 |
| 2053 | GET | `/api/core/{param}/context` | core | apps/web/src/api/tenant/index.ts | 112 |
| 2054 | GET | `/api/core/{param}/my` | core | apps/web/src/api/tenant/index.ts | 116 |
| 2055 | POST | `/api/core/{param}/switch` | core | apps/web/src/api/tenant/index.ts | 120 |
| 2056 | GET | `/api/finance/voucher-generation-rules` | finance | apps/web/src/api/voucherTemplate/index.ts | 232 |
| 2057 | POST | `/api/finance/voucher-generation-rules` | finance | apps/web/src/api/voucherTemplate/index.ts | 245 |
| 2058 | PUT | `/api/finance/voucher-generation-rules/{param}` | finance | apps/web/src/api/voucherTemplate/index.ts | 251 |
| 2059 | DELETE | `/api/finance/voucher-generation-rules/{param}` | finance | apps/web/src/api/voucherTemplate/index.ts | 257 |
| 2060 | PUT | `/api/finance/voucher-generation-rules/{param}/toggle` | finance | apps/web/src/api/voucherTemplate/index.ts | 263 |
| 2061 | GET | `/api/wms/audit-logs` | wms | apps/web/src/api/wms/audit.ts | 9 |
| 2062 | GET | `/api/wms/audit-logs/{param}` | wms | apps/web/src/api/wms/audit.ts | 13 |
| 2063 | GET | `/api/wms/audit-logs/modules` | wms | apps/web/src/api/wms/audit.ts | 17 |
| 2064 | GET | `/api/wms/batches` | wms | apps/web/src/api/wms/batch.ts | 13 |
| 2065 | POST | `/api/wms/batches` | wms | apps/web/src/api/wms/batch.ts | 17 |
| 2066 | GET | `/api/wms/batches/{param}` | wms | apps/web/src/api/wms/batch.ts | 21 |
| 2067 | PUT | `/api/wms/batches/{param}` | wms | apps/web/src/api/wms/batch.ts | 25 |
| 2068 | DELETE | `/api/wms/batches/{param}` | wms | apps/web/src/api/wms/batch.ts | 29 |
| 2069 | GET | `/api/wms/batches/statistics` | wms | apps/web/src/api/wms/batch.ts | 35 |
| 2070 | GET | `/api/wms/batches/expiring-soon` | wms | apps/web/src/api/wms/batch.ts | 42 |
| 2071 | GET | `/api/wms/batches/expired` | wms | apps/web/src/api/wms/batch.ts | 48 |
| 2072 | POST | `/api/wms/batches/{param}/adjust-quantity` | wms | apps/web/src/api/wms/batch.ts | 55 |
| 2073 | POST | `/api/wms/batches/{param}/transfer-location` | wms | apps/web/src/api/wms/batch.ts | 62 |
| 2074 | GET | `/api/wms/dashboard` | wms | apps/web/src/api/wms/dashboard.ts | 16 |
| 2075 | GET | `/api/wms/inbound-orders` | wms | apps/web/src/api/wms/inbound.ts | 17 |
| 2076 | GET | `/api/wms/inbound-orders/{param}` | wms | apps/web/src/api/wms/inbound.ts | 21 |
| 2077 | POST | `/api/wms/inbound-orders` | wms | apps/web/src/api/wms/inbound.ts | 25 |
| 2078 | PUT | `/api/wms/inbound-orders/{param}` | wms | apps/web/src/api/wms/inbound.ts | 29 |
| 2079 | DELETE | `/api/wms/inbound-orders/{param}` | wms | apps/web/src/api/wms/inbound.ts | 33 |
| 2080 | GET | `/api/wms/inbound-orders/{param}/items` | wms | apps/web/src/api/wms/inbound.ts | 39 |
| 2081 | POST | `/api/wms/inbound-orders/{param}/items` | wms | apps/web/src/api/wms/inbound.ts | 46 |
| 2082 | PUT | `/api/wms/inbound-orders/{param}/items/{param}` | wms | apps/web/src/api/wms/inbound.ts | 54 |
| 2083 | DELETE | `/api/wms/inbound-orders/{param}/items/{param}` | wms | apps/web/src/api/wms/inbound.ts | 58 |
| 2084 | POST | `/api/wms/inbound-orders/{param}/confirm` | wms | apps/web/src/api/wms/inbound.ts | 62 |
| 2085 | POST | `/api/wms/inbound-orders/{param}/receive` | wms | apps/web/src/api/wms/inbound.ts | 66 |
| 2086 | POST | `/api/wms/inbound-orders/{param}/complete` | wms | apps/web/src/api/wms/inbound.ts | 70 |
| 2087 | GET | `/api/wms/locations` | wms | apps/web/src/api/wms/location.ts | 15 |
| 2088 | GET | `/api/wms/locations/{param}` | wms | apps/web/src/api/wms/location.ts | 19 |
| 2089 | POST | `/api/wms/locations` | wms | apps/web/src/api/wms/location.ts | 23 |
| 2090 | PUT | `/api/wms/locations/{param}` | wms | apps/web/src/api/wms/location.ts | 27 |
| 2091 | DELETE | `/api/wms/locations/{param}` | wms | apps/web/src/api/wms/location.ts | 31 |
| 2092 | GET | `/api/wms/locations/status` | wms | apps/web/src/api/wms/location.ts | 35 |
| 2093 | POST | `/api/wms/locations/batch` | wms | apps/web/src/api/wms/location.ts | 41 |
| 2094 | PUT | `/api/wms/locations/batch` | wms | apps/web/src/api/wms/location.ts | 48 |
| 2095 | POST | `/api/wms/locations/batch-delete` | wms | apps/web/src/api/wms/location.ts | 52 |
| 2096 | GET | `/api/wms/outbound-orders` | wms | apps/web/src/api/wms/outbound.ts | 21 |
| 2097 | GET | `/api/wms/outbound-orders/{param}` | wms | apps/web/src/api/wms/outbound.ts | 25 |
| 2098 | POST | `/api/wms/outbound-orders` | wms | apps/web/src/api/wms/outbound.ts | 29 |
| 2099 | PUT | `/api/wms/outbound-orders/{param}` | wms | apps/web/src/api/wms/outbound.ts | 33 |
| 2100 | DELETE | `/api/wms/outbound-orders/{param}` | wms | apps/web/src/api/wms/outbound.ts | 37 |
| 2101 | GET | `/api/wms/outbound-orders/{param}/items` | wms | apps/web/src/api/wms/outbound.ts | 43 |
| 2102 | POST | `/api/wms/outbound-orders/{param}/items` | wms | apps/web/src/api/wms/outbound.ts | 50 |
| 2103 | PUT | `/api/wms/outbound-orders/{param}/items/{param}` | wms | apps/web/src/api/wms/outbound.ts | 58 |
| 2104 | DELETE | `/api/wms/outbound-orders/{param}/items/{param}` | wms | apps/web/src/api/wms/outbound.ts | 62 |
| 2105 | POST | `/api/wms/outbound-orders/{param}/confirm` | wms | apps/web/src/api/wms/outbound.ts | 66 |
| 2106 | POST | `/api/wms/outbound-orders/{param}/pick` | wms | apps/web/src/api/wms/outbound.ts | 70 |
| 2107 | POST | `/api/wms/outbound-orders/{param}/pack` | wms | apps/web/src/api/wms/outbound.ts | 74 |
| 2108 | POST | `/api/wms/outbound-orders/{param}/ship` | wms | apps/web/src/api/wms/outbound.ts | 78 |
| 2109 | POST | `/api/wms/outbound-orders/{param}/complete` | wms | apps/web/src/api/wms/outbound.ts | 82 |
| 2110 | GET | `/api/wms/wave-picks` | wms | apps/web/src/api/wms/outbound.ts | 88 |
| 2111 | GET | `/api/wms/wave-picks/{param}` | wms | apps/web/src/api/wms/outbound.ts | 92 |
| 2112 | POST | `/api/wms/wave-picks` | wms | apps/web/src/api/wms/outbound.ts | 96 |
| 2113 | PUT | `/api/wms/wave-picks/{param}` | wms | apps/web/src/api/wms/outbound.ts | 100 |
| 2114 | DELETE | `/api/wms/wave-picks/{param}` | wms | apps/web/src/api/wms/outbound.ts | 104 |
| 2115 | GET | `/api/wms/wave-picks/{param}/items` | wms | apps/web/src/api/wms/outbound.ts | 110 |
| 2116 | POST | `/api/wms/wave-picks/{param}/assign` | wms | apps/web/src/api/wms/outbound.ts | 114 |
| 2117 | POST | `/api/wms/wave-picks/{param}/start` | wms | apps/web/src/api/wms/outbound.ts | 118 |
| 2118 | POST | `/api/wms/wave-picks/{param}/complete` | wms | apps/web/src/api/wms/outbound.ts | 122 |
| 2119 | POST | `/api/wms/wave-picks/{param}/cancel` | wms | apps/web/src/api/wms/outbound.ts | 126 |
| 2120 | GET | `/api/wms/smart-replenishment/suggestions` | wms | apps/web/src/api/wms/replenishment.ts | 20 |
| 2121 | GET | `/api/wms/smart-replenishment/suggestions/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 24 |
| 2122 | POST | `/api/wms/smart-replenishment/suggestions/generate` | wms | apps/web/src/api/wms/replenishment.ts | 32 |
| 2123 | GET | `/api/wms/smart-replenishment/statistics` | wms | apps/web/src/api/wms/replenishment.ts | 39 |
| 2124 | GET | `/api/wms/smart-replenishment/orders` | wms | apps/web/src/api/wms/replenishment.ts | 45 |
| 2125 | GET | `/api/wms/smart-replenishment/orders/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 49 |
| 2126 | POST | `/api/wms/smart-replenishment/orders` | wms | apps/web/src/api/wms/replenishment.ts | 55 |
| 2127 | PUT | `/api/wms/smart-replenishment/orders/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 62 |
| 2128 | DELETE | `/api/wms/smart-replenishment/orders/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 66 |
| 2129 | GET | `/api/wms/smart-replenishment/orders/{param}/items` | wms | apps/web/src/api/wms/replenishment.ts | 72 |
| 2130 | POST | `/api/wms/smart-replenishment/orders/{param}/confirm` | wms | apps/web/src/api/wms/replenishment.ts | 76 |
| 2131 | POST | `/api/wms/smart-replenishment/orders/{param}/complete` | wms | apps/web/src/api/wms/replenishment.ts | 80 |
| 2132 | GET | `/api/wms/smart-replenishment/safety-stock` | wms | apps/web/src/api/wms/replenishment.ts | 86 |
| 2133 | GET | `/api/wms/smart-replenishment/safety-stock/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 90 |
| 2134 | PUT | `/api/wms/smart-replenishment/safety-stock/{param}` | wms | apps/web/src/api/wms/replenishment.ts | 97 |
| 2135 | POST | `/api/wms/smart-replenishment/safety-stock/batch-update` | wms | apps/web/src/api/wms/replenishment.ts | 103 |
| 2136 | POST | `/api/wms/smart-replenishment/safety-stock/calculate` | wms | apps/web/src/api/wms/replenishment.ts | 111 |
| 2137 | GET | `/api/wms/serial-numbers` | wms | apps/web/src/api/wms/serialNumber.ts | 15 |
| 2138 | POST | `/api/wms/serial-numbers` | wms | apps/web/src/api/wms/serialNumber.ts | 19 |
| 2139 | POST | `/api/wms/serial-numbers/bulk` | wms | apps/web/src/api/wms/serialNumber.ts | 23 |
| 2140 | GET | `/api/wms/serial-numbers/{param}` | wms | apps/web/src/api/wms/serialNumber.ts | 27 |
| 2141 | GET | `/api/wms/serial-numbers/by-serial/{param}` | wms | apps/web/src/api/wms/serialNumber.ts | 31 |
| 2142 | PUT | `/api/wms/serial-numbers/{param}` | wms | apps/web/src/api/wms/serialNumber.ts | 38 |
| 2143 | DELETE | `/api/wms/serial-numbers/{param}` | wms | apps/web/src/api/wms/serialNumber.ts | 42 |
| 2144 | GET | `/api/wms/serial-numbers/statistics` | wms | apps/web/src/api/wms/serialNumber.ts | 48 |
| 2145 | GET | `/api/wms/serial-numbers/by-batch/{param}` | wms | apps/web/src/api/wms/serialNumber.ts | 52 |
| 2146 | POST | `/api/wms/serial-numbers/{param}/transfer-location` | wms | apps/web/src/api/wms/serialNumber.ts | 59 |
| 2147 | GET | `/api/wms/serial-numbers/{param}/trace` | wms | apps/web/src/api/wms/serialNumber.ts | 63 |
| 2148 | GET | `/api/wms/stock-takes` | wms | apps/web/src/api/wms/stocktake.ts | 14 |
| 2149 | GET | `/api/wms/stock-takes/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 18 |
| 2150 | POST | `/api/wms/stock-takes` | wms | apps/web/src/api/wms/stocktake.ts | 22 |
| 2151 | PUT | `/api/wms/stock-takes/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 26 |
| 2152 | DELETE | `/api/wms/stock-takes/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 30 |
| 2153 | GET | `/api/wms/stock-takes/{param}/items` | wms | apps/web/src/api/wms/stocktake.ts | 43 |
| 2154 | GET | `/api/wms/stock-takes/{param}/items/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 47 |
| 2155 | POST | `/api/wms/stock-takes/{param}/items` | wms | apps/web/src/api/wms/stocktake.ts | 54 |
| 2156 | PUT | `/api/wms/stock-takes/{param}/items/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 62 |
| 2157 | DELETE | `/api/wms/stock-takes/{param}/items/{param}` | wms | apps/web/src/api/wms/stocktake.ts | 66 |
| 2158 | POST | `/api/wms/stock-takes/{param}/start` | wms | apps/web/src/api/wms/stocktake.ts | 70 |
| 2159 | POST | `/api/wms/stock-takes/{param}/count` | wms | apps/web/src/api/wms/stocktake.ts | 77 |
| 2160 | POST | `/api/wms/stock-takes/{param}/complete` | wms | apps/web/src/api/wms/stocktake.ts | 81 |
| 2161 | POST | `/api/wms/stock-takes/{param}/adjust` | wms | apps/web/src/api/wms/stocktake.ts | 85 |
| 2162 | GET | `/api/wms/sync-records` | wms | apps/web/src/api/wms/sync.ts | 9 |
| 2163 | GET | `/api/wms/sync-records/{param}` | wms | apps/web/src/api/wms/sync.ts | 13 |
| 2164 | GET | `/api/wms/sync-records/{param}/items` | wms | apps/web/src/api/wms/sync.ts | 20 |
| 2165 | POST | `/api/wms/sync-records/{param}/retry` | wms | apps/web/src/api/wms/sync.ts | 24 |
| 2166 | POST | `/api/wms/sync-records/{param}/retry-items` | wms | apps/web/src/api/wms/sync.ts | 31 |
| 2167 | GET | `/api/wms/sync-records/statistics` | wms | apps/web/src/api/wms/sync.ts | 38 |
| 2168 | POST | `/api/wms/sync/scm` | wms | apps/web/src/api/wms/sync.ts | 47 |
| 2169 | POST | `/api/wms/sync/scm/inventory` | wms | apps/web/src/api/wms/sync.ts | 55 |
| 2170 | POST | `/api/wms/sync/scm/orders` | wms | apps/web/src/api/wms/sync.ts | 63 |
| 2171 | GET | `/api/wms/transfers` | wms | apps/web/src/api/wms/transfer.ts | 15 |
| 2172 | GET | `/api/wms/transfers/{param}` | wms | apps/web/src/api/wms/transfer.ts | 19 |
| 2173 | POST | `/api/wms/transfers` | wms | apps/web/src/api/wms/transfer.ts | 23 |
| 2174 | PUT | `/api/wms/transfers/{param}` | wms | apps/web/src/api/wms/transfer.ts | 27 |
| 2175 | DELETE | `/api/wms/transfers/{param}` | wms | apps/web/src/api/wms/transfer.ts | 31 |
| 2176 | GET | `/api/wms/transfers/{param}/items` | wms | apps/web/src/api/wms/transfer.ts | 37 |
| 2177 | POST | `/api/wms/transfers/{param}/confirm` | wms | apps/web/src/api/wms/transfer.ts | 41 |
| 2178 | POST | `/api/wms/transfers/{param}/ship` | wms | apps/web/src/api/wms/transfer.ts | 45 |
| 2179 | POST | `/api/wms/transfers/{param}/receive` | wms | apps/web/src/api/wms/transfer.ts | 52 |
| 2180 | POST | `/api/wms/transfers/{param}/complete` | wms | apps/web/src/api/wms/transfer.ts | 56 |
| 2181 | POST | `/api/core/flow/approval-tasks/{param}/approve` | workflow | apps/web/src/api/workflow/approval.ts | 44 |
| 2182 | POST | `/api/core/flow/approval-tasks/{param}/reject` | workflow | apps/web/src/api/workflow/approval.ts | 48 |
| 2183 | GET | `/api/core/flow/categories/active` | workflow | apps/web/src/api/workflow/category.ts | 22 |
| 2184 | GET | `/api/core/flow/categories/{param}/workflows` | workflow | apps/web/src/api/workflow/category.ts | 26 |
| 2185 | GET | `/api/core/flow/categories/tree` | workflow | apps/web/src/api/workflow/category.ts | 30 |
| 2186 | POST | `/api/core/flow/categories/sort` | workflow | apps/web/src/api/workflow/category.ts | 34 |
| 2187 | GET | `/api/core/flow/workflows/{param}/versions` | workflow | apps/web/src/api/workflow/definition.ts | 40 |
| 2188 | POST | `/api/core/flow/workflows/{param}/versions` | workflow | apps/web/src/api/workflow/definition.ts | 46 |
| 2189 | GET | `/api/core/flow/workflows/{param}/versions/{param}` | workflow | apps/web/src/api/workflow/definition.ts | 50 |
| 2190 | POST | `/api/core/flow/workflows/{param}/versions/{param}/activate` | workflow | apps/web/src/api/workflow/definition.ts | 54 |
| 2191 | GET | `/api/core/flow/workflows/{param}/compare/{param}/{param}` | workflow | apps/web/src/api/workflow/definition.ts | 62 |
| 2192 | DELETE | `/api/core/flow/workflows/{param}/versions/{param}` | workflow | apps/web/src/api/workflow/definition.ts | 66 |
| 2193 | GET | `/api/core/flow/workflows/{param}/export` | workflow | apps/web/src/api/workflow/definition.ts | 70 |
| 2194 | POST | `/api/core/flow/workflows/import` | workflow | apps/web/src/api/workflow/definition.ts | 74 |
| 2195 | POST | `/api/core/flow/workflows/{param}/copy` | workflow | apps/web/src/api/workflow/definition.ts | 78 |
| 2196 | POST | `/api/core/flow/delegates/{param}/activate` | workflow | apps/web/src/api/workflow/delegate.ts | 27 |
| 2197 | POST | `/api/core/flow/delegates/{param}/deactivate` | workflow | apps/web/src/api/workflow/delegate.ts | 31 |
| 2198 | GET | `/api/core/flow/delegates/my` | workflow | apps/web/src/api/workflow/delegate.ts | 35 |
| 2199 | GET | `/api/core/flow/delegates/my/attorneys` | workflow | apps/web/src/api/workflow/delegate.ts | 39 |
| 2200 | GET | `/api/core/flow/delegates/active` | workflow | apps/web/src/api/workflow/delegate.ts | 44 |
| 2201 | GET | `/api/core/flow/delegates/{param}/workflows` | workflow | apps/web/src/api/workflow/delegate.ts | 48 |
| 2202 | GET | `/api/core/flow/delegates/check/{param}` | workflow | apps/web/src/api/workflow/delegate.ts | 53 |
| 2203 | POST | `/api/core/flow/form-definitions/{param}/activate` | workflow | apps/web/src/api/workflow/form.ts | 31 |
| 2204 | POST | `/api/core/flow/form-definitions/{param}/deactivate` | workflow | apps/web/src/api/workflow/form.ts | 35 |
| 2205 | POST | `/api/core/flow/form-definitions/{param}/publish` | workflow | apps/web/src/api/workflow/form.ts | 39 |
| 2206 | POST | `/api/core/flow/form-definitions/{param}/copy` | workflow | apps/web/src/api/workflow/form.ts | 43 |
| 2207 | GET | `/api/core/flow/form-definitions/workflow/{param}` | workflow | apps/web/src/api/workflow/form.ts | 47 |
| 2208 | GET | `/api/core/flow/form-definitions/categories` | workflow | apps/web/src/api/workflow/form.ts | 51 |
| 2209 | GET | `/api/core/flow/form-definitions/{param}/versions/{param}` | workflow | apps/web/src/api/workflow/form.ts | 55 |
| 2210 | GET | `/api/core/flow/form-definitions/{param}/versions` | workflow | apps/web/src/api/workflow/form.ts | 59 |
| 2211 | POST | `/api/core/flow/form-definitions/{param}/versions/{param}/rollback` | workflow | apps/web/src/api/workflow/form.ts | 63 |
| 2212 | POST | `/api/core/flow/form-definitions/{param}/preview` | workflow | apps/web/src/api/workflow/form.ts | 67 |
| 2213 | POST | `/api/core/flow/form-definitions/{param}/validate` | workflow | apps/web/src/api/workflow/form.ts | 71 |
| 2214 | GET | `/api/core/flow/form-definitions/{param}/export` | workflow | apps/web/src/api/workflow/form.ts | 75 |
| 2215 | POST | `/api/core/flow/form-definitions/import` | workflow | apps/web/src/api/workflow/form.ts | 81 |
| 2216 | GET | `/api/core/flow/form-instances/workflow-instance/{param}` | workflow | apps/web/src/api/workflow/form.ts | 102 |
| 2217 | GET | `/api/core/flow/form-instances/form-definition/{param}` | workflow | apps/web/src/api/workflow/form.ts | 106 |
| 2218 | POST | `/api/core/flow/form-instances/{param}/submit` | workflow | apps/web/src/api/workflow/form.ts | 112 |
| 2219 | POST | `/api/core/flow/form-instances/{param}/draft` | workflow | apps/web/src/api/workflow/form.ts | 116 |
| 2220 | GET | `/api/core/flow/form-instances/{param}/data` | workflow | apps/web/src/api/workflow/form.ts | 120 |
| 2221 | PUT | `/api/core/flow/form-instances/{param}/data` | workflow | apps/web/src/api/workflow/form.ts | 124 |
| 2222 | GET | `/api/core/flow/form-instances/{param}/history` | workflow | apps/web/src/api/workflow/form.ts | 128 |
| 2223 | GET | `/api/core/flow/form-instances/my` | workflow | apps/web/src/api/workflow/form.ts | 132 |
| 2224 | GET | `/api/core/flow/form-instances/my/drafts` | workflow | apps/web/src/api/workflow/form.ts | 136 |
| 2225 | GET | `/api/core/flow/form-instances/{param}/export` | workflow | apps/web/src/api/workflow/form.ts | 140 |
| 2226 | GET | `/api/core/flow/performance` | workflow | apps/web/src/api/workflow/index.ts | 236 |
| 2227 | POST | `/api/core/flow/performance/reset` | workflow | apps/web/src/api/workflow/index.ts | 240 |
| 2228 | GET | `/api/core/flow/health` | workflow | apps/web/src/api/workflow/index.ts | 244 |
| 2229 | POST | `/api/core/flow/instances/{param}/activate` | workflow | apps/web/src/api/workflow/instance.ts | 46 |
| 2230 | POST | `/api/core/flow/instances/{param}/terminate` | workflow | apps/web/src/api/workflow/instance.ts | 54 |
| 2231 | GET | `/api/core/flow/instances/{param}/variables` | workflow | apps/web/src/api/workflow/instance.ts | 58 |
| 2232 | POST | `/api/core/flow/instances/{param}/variables` | workflow | apps/web/src/api/workflow/instance.ts | 62 |
| 2233 | GET | `/api/core/flow/instances/{param}/tasks` | workflow | apps/web/src/api/workflow/instance.ts | 66 |
| 2234 | GET | `/api/core/flow/instances/{param}/history` | workflow | apps/web/src/api/workflow/instance.ts | 70 |
| 2235 | GET | `/api/core/flow/instances/{param}/logs` | workflow | apps/web/src/api/workflow/instance.ts | 74 |
| 2236 | GET | `/api/core/flow/instances/{param}/diagram` | workflow | apps/web/src/api/workflow/instance.ts | 78 |
| 2237 | GET | `/api/core/flow/monitor/instances` | workflow | apps/web/src/api/workflow/monitor.ts | 18 |
| 2238 | GET | `/api/core/flow/monitor/instances/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 22 |
| 2239 | GET | `/api/core/flow/monitor/instances/{param}/history` | workflow | apps/web/src/api/workflow/monitor.ts | 28 |
| 2240 | GET | `/api/core/flow/monitor/instances/{param}/tasks` | workflow | apps/web/src/api/workflow/monitor.ts | 32 |
| 2241 | GET | `/api/core/flow/monitor/instances/{param}/variables` | workflow | apps/web/src/api/workflow/monitor.ts | 36 |
| 2242 | GET | `/api/core/flow/monitor/instances/{param}/diagram` | workflow | apps/web/src/api/workflow/monitor.ts | 40 |
| 2243 | GET | `/api/core/flow/monitor/instances/running` | workflow | apps/web/src/api/workflow/monitor.ts | 44 |
| 2244 | GET | `/api/core/flow/monitor/instances/completed` | workflow | apps/web/src/api/workflow/monitor.ts | 48 |
| 2245 | GET | `/api/core/flow/monitor/instances/rejected` | workflow | apps/web/src/api/workflow/monitor.ts | 52 |
| 2246 | GET | `/api/core/flow/monitor/instances/suspended` | workflow | apps/web/src/api/workflow/monitor.ts | 56 |
| 2247 | GET | `/api/core/flow/monitor/instances/overdue` | workflow | apps/web/src/api/workflow/monitor.ts | 60 |
| 2248 | GET | `/api/core/flow/monitor/statistics` | workflow | apps/web/src/api/workflow/monitor.ts | 64 |
| 2249 | GET | `/api/core/flow/monitor/analysis/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 68 |
| 2250 | GET | `/api/core/flow/monitor/analysis/{param}/nodes` | workflow | apps/web/src/api/workflow/monitor.ts | 74 |
| 2251 | GET | `/api/core/flow/monitor/analysis/{param}/bottlenecks` | workflow | apps/web/src/api/workflow/monitor.ts | 78 |
| 2252 | GET | `/api/core/flow/monitor/analysis/efficiency` | workflow | apps/web/src/api/workflow/monitor.ts | 82 |
| 2253 | GET | `/api/core/flow/monitor/analysis/trend` | workflow | apps/web/src/api/workflow/monitor.ts | 88 |
| 2254 | GET | `/api/core/flow/monitor/analysis/users` | workflow | apps/web/src/api/workflow/monitor.ts | 94 |
| 2255 | GET | `/api/core/flow/monitor/analysis/departments` | workflow | apps/web/src/api/workflow/monitor.ts | 100 |
| 2256 | GET | `/api/core/flow/monitor/logs` | workflow | apps/web/src/api/workflow/monitor.ts | 106 |
| 2257 | GET | `/api/core/flow/monitor/logs/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 110 |
| 2258 | GET | `/api/core/flow/monitor/logs/instance/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 114 |
| 2259 | GET | `/api/core/flow/monitor/logs/workflow/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 118 |
| 2260 | GET | `/api/core/flow/monitor/logs/node/{param}/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 122 |
| 2261 | GET | `/api/core/flow/monitor/logs/user/{param}` | workflow | apps/web/src/api/workflow/monitor.ts | 126 |
| 2262 | GET | `/api/core/flow/monitor/realtime` | workflow | apps/web/src/api/workflow/monitor.ts | 130 |
| 2263 | GET | `/api/core/flow/monitor/dashboard` | workflow | apps/web/src/api/workflow/monitor.ts | 134 |
| 2264 | GET | `/api/core/flow/monitor/performance` | workflow | apps/web/src/api/workflow/monitor.ts | 138 |
| 2265 | GET | `/api/core/flow/monitor/sla-compliance` | workflow | apps/web/src/api/workflow/monitor.ts | 142 |
| 2266 | GET | `/api/core/flow/monitor/instances/error` | workflow | apps/web/src/api/workflow/monitor.ts | 146 |
| 2267 | POST | `/api/core/flow/monitor/instances/{param}/retry` | workflow | apps/web/src/api/workflow/monitor.ts | 150 |
| 2268 | POST | `/api/core/flow/monitor/instances/{param}/skip` | workflow | apps/web/src/api/workflow/monitor.ts | 154 |
| 2269 | POST | `/api/core/flow/monitor/instances/{param}/force-complete` | workflow | apps/web/src/api/workflow/monitor.ts | 158 |
| 2270 | POST | `/api/core/flow/monitor/instances/{param}/force-terminate` | workflow | apps/web/src/api/workflow/monitor.ts | 162 |
| 2271 | GET | `/api/core/flow/rules/workflow/{param}` | workflow | apps/web/src/api/workflow/rule.ts | 20 |
| 2272 | GET | `/api/core/flow/rules/node/{param}/{param}` | workflow | apps/web/src/api/workflow/rule.ts | 24 |
| 2273 | GET | `/api/core/flow/rules/type` | workflow | apps/web/src/api/workflow/rule.ts | 28 |
| 2274 | POST | `/api/core/flow/rules/{param}/activate` | workflow | apps/web/src/api/workflow/rule.ts | 34 |
| 2275 | POST | `/api/core/flow/rules/{param}/deactivate` | workflow | apps/web/src/api/workflow/rule.ts | 38 |
| 2276 | POST | `/api/core/flow/rules/batch` | workflow | apps/web/src/api/workflow/rule.ts | 42 |
| 2277 | POST | `/api/core/flow/tasks/{param}/transfer` | workflow | apps/web/src/api/workflow/task.ts | 58 |
| 2278 | POST | `/api/core/flow/tasks/{param}/reassign` | workflow | apps/web/src/api/workflow/task.ts | 65 |
| 2279 | POST | `/api/core/flow/tasks/{param}/add-sign` | workflow | apps/web/src/api/workflow/task.ts | 69 |
| 2280 | POST | `/api/core/flow/tasks/{param}/counter-sign` | workflow | apps/web/src/api/workflow/task.ts | 73 |
| 2281 | POST | `/api/core/flow/tasks/{param}/withdraw` | workflow | apps/web/src/api/workflow/task.ts | 77 |
| 2282 | POST | `/api/core/flow/tasks/{param}/return` | workflow | apps/web/src/api/workflow/task.ts | 81 |
| 2283 | POST | `/api/core/flow/tasks/{param}/jump` | workflow | apps/web/src/api/workflow/task.ts | 85 |
| 2284 | POST | `/api/core/flow/tasks/{param}/urge` | workflow | apps/web/src/api/workflow/task.ts | 89 |
| 2285 | GET | `/api/core/flow/tasks/my/involved` | workflow | apps/web/src/api/workflow/task.ts | 130 |
| 2286 | GET | `/api/core/flow/tasks/my/created` | workflow | apps/web/src/api/workflow/task.ts | 134 |
| 2287 | GET | `/api/core/flow/tasks/{param}/comments` | workflow | apps/web/src/api/workflow/task.ts | 142 |
| 2288 | POST | `/api/core/flow/tasks/{param}/comments` | workflow | apps/web/src/api/workflow/task.ts | 146 |
| 2289 | GET | `/api/core/flow/tasks/{param}/attachments` | workflow | apps/web/src/api/workflow/task.ts | 150 |
| 2290 | POST | `/api/core/flow/tasks/{param}/attachments` | workflow | apps/web/src/api/workflow/task.ts | 154 |
| 2291 | DELETE | `/api/core/flow/tasks/{param}/attachments/{param}` | workflow | apps/web/src/api/workflow/task.ts | 158 |
| 2292 | GET | `/api/core/flow/tasks/{param}/form` | workflow | apps/web/src/api/workflow/task.ts | 162 |
| 2293 | POST | `/api/core/flow/tasks/{param}/form` | workflow | apps/web/src/api/workflow/task.ts | 166 |
| 2294 | GET | `/api/core/flow/tasks/{param}/variables` | workflow | apps/web/src/api/workflow/task.ts | 170 |
| 2295 | POST | `/api/core/flow/tasks/{param}/variables` | workflow | apps/web/src/api/workflow/task.ts | 174 |
| 2296 | GET | `/api/core/flow/tasks/my/count` | workflow | apps/web/src/api/workflow/task.ts | 182 |
| 2297 | GET | `/api/core/flow/tasks/due-soon` | workflow | apps/web/src/api/workflow/task.ts | 194 |
| 2298 | GET | `/api/core/flow/tasks/{param}/timeline` | workflow | apps/web/src/api/workflow/task.ts | 198 |
| 2299 | GET | `/api/core/flow/tasks/{param}/history` | workflow | apps/web/src/api/workflow/task.ts | 202 |
| 2300 | GET | `/api/core/flow/tasks/my/created` | workflow | apps/web/src/api/workflow/task.ts | 214 |
| 2301 | GET | `/api/core/flow/tasks/my/cc` | workflow | apps/web/src/api/workflow/task.ts | 218 |
| 2302 | GET | `/api/core/flow/{param}/{param}` | workflow | apps/web/src/api/workflow/utils.ts | 35 |
| 2303 | PUT | `/api/core/flow/{param}/{param}` | workflow | apps/web/src/api/workflow/utils.ts | 43 |
| 2304 | DELETE | `/api/core/flow/{param}/{param}` | workflow | apps/web/src/api/workflow/utils.ts | 47 |
| 2305 | GET | `/api/core/flow/variables/instance/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 6 |
| 2306 | GET | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 10 |
| 2307 | POST | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 14 |
| 2308 | DELETE | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 21 |
| 2309 | GET | `/api/core/flow/variables/instance/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 25 |
| 2310 | GET | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 29 |
| 2311 | POST | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 33 |
| 2312 | POST | `/api/core/flow/variables/instance/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 40 |
| 2313 | DELETE | `/api/core/flow/variables/instance/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 44 |
| 2314 | GET | `/api/core/flow/variables/task/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 48 |
| 2315 | POST | `/api/core/flow/variables/task/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 52 |
| 2316 | POST | `/api/core/flow/variables/global/{param}/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 64 |
| 2317 | GET | `/api/core/flow/variables/instance/{param}/scope/{param}` | workflow | apps/web/src/api/workflow/variable.ts | 71 |
| 2318 | GET | `/api/core/flow/variables/instance/{param}/{param}/history` | workflow | apps/web/src/api/workflow/variable.ts | 75 |

## 3. 方法不匹配（路径匹配但 HTTP 方法不一致）

共 2 个不匹配：

| # | 前端方法 | OpenAPI 方法 | 路径 | operationId | 文件 | 行号 |
|---|----------|-------------|------|-------------|------|------|
| 1 | PUT | GET | `/api/finance/accounts/{param}` | get_account, get_account | apps/web/src/api/finance/account.ts | 68 |
| 2 | DELETE | GET | `/api/finance/accounts/{param}` | get_account, get_account | apps/web/src/api/finance/account.ts | 72 |

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
