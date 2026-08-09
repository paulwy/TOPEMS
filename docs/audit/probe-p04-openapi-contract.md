# Probe P-04: OpenAPI 前后端契约一致性探针

> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0

## 摘要统计

| 指标 | 数值 |
|------|------|
| OpenAPI 端点总数 (method+path) | 739 |
| 前端 API 调用总数 (去重前) | 2875 |
| 前端唯一路径数 | 1965 |
| 已匹配端点数 | 268 |
| 未使用后端 API (OpenAPI 有/前端无) | 471 |
| 未文档化前端 API (前端有/OpenAPI 无) | 2559 |
| 方法不匹配数 | 0 |
| **总不匹配数** | **2559** |
| CI 严重度 | RED (mismatch >= 5) |

## 1. 未使用后端 API（OpenAPI 有定义，前端未调用）

共 471 个端点：

| # | operationId | 方法 | 路径 | Tag | 备注 |
|---|-------------|------|------|-----|------|
| 1 | home | GET | `/api/ai` | ai |  |
| 2 | agent_run | POST | `/api/ai/agent/run` | ai |  |
| 3 | list_agent_tools | GET | `/api/ai/agent/tools` | ai |  |
| 4 | _analysis_history | POST | `/api/ai/analysis/history` | ai |  |
| 5 | chat | POST | `/api/ai/chat` | ai |  |
| 6 | _code_fix | POST | `/api/ai/code/fix` | ai |  |
| 7 | complete | POST | `/api/ai/complete` | ai |  |
| 8 | list_connectors | GET | `/api/ai/connectors` | ai |  |
| 9 | create_connector | POST | `/api/ai/connectors/create` | ai |  |
| 10 | delete_connector | POST | `/api/ai/connectors/delete` | ai |  |
| 11 | get_connector | GET | `/api/ai/connectors/get` | ai |  |
| 12 | query_data | POST | `/api/ai/connectors/query` | ai |  |
| 13 | test_connector | GET | `/api/ai/connectors/test` | ai |  |
| 14 | update_connector | POST | `/api/ai/connectors/update` | ai |  |
| 15 | _document_upload | POST | `/api/ai/documents/upload` | ai |  |
| 16 | _document_vectorize_from_file | POST | `/api/ai/documents/vectorize-from-file` | ai |  |
| 17 | _document_process | POST | `/api/ai/documents/{id}/process` | ai |  |
| 18 | _embedding_generate | POST | `/api/ai/embedding/generate` | ai |  |
| 19 | generate | POST | `/api/ai/generate` | ai |  |
| 20 | _multimodal_image_analyze | POST | `/api/ai/multimodal/image/analyze` | ai |  |
| 21 | _multimodal_image_caption | POST | `/api/ai/multimodal/image/caption` | ai |  |
| 22 | _multimodal_image_describe | POST | `/api/ai/multimodal/image/describe` | ai |  |
| 23 | _multimodal_image_objects | POST | `/api/ai/multimodal/image/objects` | ai |  |
| 24 | _multimodal_image_text | POST | `/api/ai/multimodal/image/text` | ai |  |
| 25 | _multimodal_video_analyze | POST | `/api/ai/multimodal/video/analyze` | ai |  |
| 26 | _multimodal_video_summary | POST | `/api/ai/multimodal/video/summary` | ai |  |
| 27 | _profile_get | POST | `/api/ai/profile/get` | ai |  |
| 28 | _profile_update | POST | `/api/ai/profile/update` | ai |  |
| 29 | _recommend | POST | `/api/ai/recommend` | ai |  |
| 30 | _recommend_documents | POST | `/api/ai/recommend/documents` | ai |  |
| 31 | _recommend_knowledge | POST | `/api/ai/recommend/knowledge` | ai |  |
| 32 | _recommend_opportunities | POST | `/api/ai/recommend/opportunities` | ai |  |
| 33 | summarize | POST | `/api/ai/summarize` | ai |  |
| 34 | list_templates | GET | `/api/ai/templates` | ai |  |
| 35 | validate | POST | `/api/ai/validate` | ai |  |
| 36 | _vector_batch_store | POST | `/api/ai/vectors/batch-store` | ai |  |
| 37 | _vector_clear | POST | `/api/ai/vectors/clear` | ai |  |
| 38 | _vector_hybrid_search | POST | `/api/ai/vectors/hybrid-search` | ai |  |
| 39 | _vector_search | POST | `/api/ai/vectors/search` | ai |  |
| 40 | _vector_stats | GET | `/api/ai/vectors/stats` | ai |  |
| 41 | _vector_store | POST | `/api/ai/vectors/store` | ai |  |
| 42 | _vector_get | GET | `/api/ai/vectors/{id}` | ai |  |
| 43 | _vector_delete | DELETE | `/api/ai/vectors/{id}` | ai |  |
| 44 | plugin_health_check | GET | `/api/plugins/health` | ai |  |
| 45 | get_plugin_info | GET | `/api/plugins/info` | ai |  |
| 46 | health_check_detailed | GET | `/api/ai/health/detailed` | ai |  |
| 47 | ai_search | POST | `/api/ai/search` | ai |  |
| 48 | list_analyses | GET | `/api/bi/analysis` | analytics |  |
| 49 | create_analysis | POST | `/api/bi/analysis` | analytics |  |
| 50 | get_analysis | GET | `/api/bi/analysis/{id}` | analytics |  |
| 51 | execute_analysis | POST | `/api/bi/analysis/{id}/execute` | analytics |  |
| 52 | list_dashboards | GET | `/api/analytics/dashboard` | analytics |  |
| 53 | create_dashboard | POST | `/api/analytics/dashboard` | analytics |  |
| 54 | get_dashboard | GET | `/api/analytics/dashboard/{id}` | analytics |  |
| 55 | update_dashboard | PUT | `/api/analytics/dashboard/{id}` | analytics |  |
| 56 | delete_dashboard | DELETE | `/api/analytics/dashboard/{id}` | analytics |  |
| 57 | list_reports | GET | `/api/analytics/report` | analytics |  |
| 58 | create_report | POST | `/api/analytics/report` | analytics |  |
| 59 | get_report | GET | `/api/analytics/report/{id}` | analytics |  |
| 60 | update_report | PUT | `/api/analytics/report/{id}` | analytics |  |
| 61 | delete_report | DELETE | `/api/analytics/report/{id}` | analytics |  |
| 62 | list_widgets | GET | `/api/analytics/widget` | analytics |  |
| 63 | create_widget | POST | `/api/analytics/widget` | analytics |  |
| 64 | get_widget | GET | `/api/analytics/widget/{id}` | analytics |  |
| 65 | update_widget | PUT | `/api/analytics/widget/{id}` | analytics |  |
| 66 | delete_widget | DELETE | `/api/analytics/widget/{id}` | analytics |  |
| 67 | list_invoices | GET | `/api/billing/invoices/{tenant_id}` | billing |  |
| 68 | list_plans | GET | `/api/billing/plans` | billing |  |
| 69 | get_plan | GET | `/api/billing/plans/{id}` | billing |  |
| 70 | create_subscription | POST | `/api/billing/subscriptions` | billing |  |
| 71 | get_subscription | GET | `/api/billing/subscriptions/{tenant_id}` | billing |  |
| 72 | cancel_subscription | PUT | `/api/billing/subscriptions/{tenant_id}` | billing |  |
| 73 | get_usage_summary | GET | `/api/billing/usage/{tenant_id}` | billing |  |
| 74 | record_usage | POST | `/api/billing/usage/{tenant_id}/{metric_type}` | billing |  |
| 75 | list_emails | GET | `/api/communication/mail/emails` | communication | path exists in frontend but method not called |
| 76 | list_notifications | GET | `/api/communication/notify/list` | communication |  |
| 77 | send_notification | POST | `/api/communication/notify/send` | communication |  |
| 78 | _home | GET | `/api/ehs` | ehs |  |
| 79 | ehs_list_plans | GET | `/api/ehs/checks/plans` | ehs | path exists in frontend but method not called |
| 80 | list_plan_items | GET | `/api/ehs/checks/plans/{plan_id}/items` | ehs |  |
| 81 | create_plan_item | POST | `/api/ehs/checks/plans/{plan_id}/items` | ehs |  |
| 82 | delete_plan_item | DELETE | `/api/ehs/checks/plans/{plan_id}/items/{item_id}` | ehs |  |
| 83 | list_records | GET | `/api/ehs/checks/records` | ehs | path exists in frontend but method not called |
| 84 | list_drill_plans | GET | `/api/ehs/drills/plans` | ehs |  |
| 85 | create_drill_plan | POST | `/api/ehs/drills/plans` | ehs |  |
| 86 | get_drill_plan | GET | `/api/ehs/drills/plans/{id}` | ehs |  |
| 87 | update_drill_plan | PUT | `/api/ehs/drills/plans/{id}` | ehs |  |
| 88 | delete_drill_plan | DELETE | `/api/ehs/drills/plans/{id}` | ehs |  |
| 89 | list_drill_records | GET | `/api/ehs/drills/records` | ehs |  |
| 90 | create_drill_record | POST | `/api/ehs/drills/records` | ehs |  |
| 91 | get_drill_record | GET | `/api/ehs/drills/records/{id}` | ehs |  |
| 92 | update_drill_record | PUT | `/api/ehs/drills/records/{id}` | ehs |  |
| 93 | delete_drill_record | DELETE | `/api/ehs/drills/records/{id}` | ehs |  |
| 94 | create_drill_evaluation | POST | `/api/ehs/drills/records/{id}/evaluation` | ehs |  |
| 95 | list_drill_problems | GET | `/api/ehs/drills/records/{id}/problems` | ehs |  |
| 96 | create_drill_problem | POST | `/api/ehs/drills/records/{id}/problems` | ehs |  |
| 97 | update_drill_problem | PUT | `/api/ehs/drills/records/{id}/problems/{problem_id}` | ehs |  |
| 98 | get_drill_statistics | GET | `/api/ehs/drills/statistics` | ehs |  |
| 99 | list_drill_types | GET | `/api/ehs/drills/types` | ehs |  |
| 100 | ehs_list_plans_api_ehs_emergency-plans | GET | `/api/ehs/emergency-plans` | ehs |  |
| 101 | ehs_create_plan_api_ehs_emergency-plans | POST | `/api/ehs/emergency-plans` | ehs |  |
| 102 | list_plan_categories | GET | `/api/ehs/emergency-plans/categories` | ehs |  |
| 103 | ehs_get_plan_api_ehs_emergency-plans_{id} | GET | `/api/ehs/emergency-plans/{id}` | ehs |  |
| 104 | ehs_update_plan_api_ehs_emergency-plans_{id} | PUT | `/api/ehs/emergency-plans/{id}` | ehs |  |
| 105 | ehs_delete_plan_api_ehs_emergency-plans_{id} | DELETE | `/api/ehs/emergency-plans/{id}` | ehs |  |
| 106 | approve_plan | POST | `/api/ehs/emergency-plans/{id}/approve` | ehs |  |
| 107 | submit_plan_approval | POST | `/api/ehs/emergency-plans/{id}/submit-approval` | ehs |  |
| 108 | list_plan_supplies | GET | `/api/ehs/emergency-plans/{id}/supplies` | ehs |  |
| 109 | add_plan_supply | POST | `/api/ehs/emergency-plans/{id}/supplies` | ehs |  |
| 110 | delete_plan_supply | DELETE | `/api/ehs/emergency-plans/{id}/supplies/{supply_id}` | ehs |  |
| 111 | list_plan_versions | GET | `/api/ehs/emergency-plans/{id}/versions` | ehs |  |
| 112 | create_new_version | POST | `/api/ehs/emergency-plans/{id}/versions` | ehs |  |
| 113 | ehs_list_records_api_ehs_environment_records | GET | `/api/ehs/environment/records` | ehs | path exists in frontend but method not called |
| 114 | list_evaluations | GET | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 115 | create_evaluation | POST | `/api/ehs/environmental-compliance/evaluations` | ehs |  |
| 116 | get_evaluation | GET | `/api/ehs/environmental-compliance/evaluations/{id}` | ehs |  |
| 117 | update_evaluation | PUT | `/api/ehs/environmental-compliance/evaluations/{id}` | ehs |  |
| 118 | delete_evaluation | DELETE | `/api/ehs/environmental-compliance/evaluations/{id}` | ehs |  |
| 119 | list_incidents | GET | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 120 | create_incident | POST | `/api/ehs/environmental-compliance/incidents` | ehs |  |
| 121 | get_incident | GET | `/api/ehs/environmental-compliance/incidents/{id}` | ehs |  |
| 122 | update_incident | PUT | `/api/ehs/environmental-compliance/incidents/{id}` | ehs |  |
| 123 | delete_incident | DELETE | `/api/ehs/environmental-compliance/incidents/{id}` | ehs |  |
| 124 | list_monitor_records | GET | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 125 | create_monitor_record | POST | `/api/ehs/environmental-compliance/monitoring` | ehs |  |
| 126 | list_monitor_types | GET | `/api/ehs/environmental-compliance/monitoring/types` | ehs |  |
| 127 | get_monitor_record | GET | `/api/ehs/environmental-compliance/monitoring/{id}` | ehs |  |
| 128 | delete_monitor_record | DELETE | `/api/ehs/environmental-compliance/monitoring/{id}` | ehs |  |
| 129 | list_permits | GET | `/api/ehs/environmental-compliance/permits` | ehs | path exists in frontend but method not called |
| 130 | list_regulations | GET | `/api/ehs/environmental-compliance/regulations` | ehs | path exists in frontend but method not called |
| 131 | list_regulation_categories | GET | `/api/ehs/environmental-compliance/regulations/categories` | ehs |  |
| 132 | get_compliance_statistics | GET | `/api/ehs/environmental-compliance/statistics` | ehs |  |
| 133 | list_materials | GET | `/api/ehs/hazardous-materials` | ehs | path exists in frontend but method not called |
| 134 | get_material_statistics | GET | `/api/ehs/hazardous-materials/statistics` | ehs |  |
| 135 | list_stock_records | GET | `/api/ehs/hazardous-materials/stock-records` | ehs |  |
| 136 | create_stock_in | POST | `/api/ehs/hazardous-materials/stock-records/stock-in` | ehs |  |
| 137 | create_stock_out | POST | `/api/ehs/hazardous-materials/stock-records/stock-out` | ehs |  |
| 138 | get_stock_record | GET | `/api/ehs/hazardous-materials/stock-records/{id}` | ehs |  |
| 139 | get_material_msds | GET | `/api/ehs/hazardous-materials/{id}/msds` | ehs |  |
| 140 | update_material_msds | PUT | `/api/ehs/hazardous-materials/{id}/msds` | ehs |  |
| 141 | list_material_stocks | GET | `/api/ehs/hazardous-materials/{id}/stocks` | ehs |  |
| 142 | assess_risk | POST | `/api/ehs/hazards/{id}/assessments` | ehs |  |
| 143 | list_control_measures | GET | `/api/ehs/hazards/{id}/controls` | ehs |  |
| 144 | create_control_measure | POST | `/api/ehs/hazards/{id}/controls` | ehs |  |
| 145 | update_control_measure | PUT | `/api/ehs/hazards/{id}/controls/{measure_id}` | ehs |  |
| 146 | delete_control_measure | DELETE | `/api/ehs/hazards/{id}/controls/{measure_id}` | ehs |  |
| 147 | ehs_create_record_api_ehs_health | POST | `/api/ehs/health` | ehs | path exists in frontend but method not called |
| 148 | start_investigation | POST | `/api/ehs/incidents/{id}/investigation` | ehs |  |
| 149 | update_investigation | PUT | `/api/ehs/incidents/{id}/investigation` | ehs |  |
| 150 | complete_investigation | POST | `/api/ehs/incidents/{id}/investigation/complete` | ehs |  |
| 151 | create_review | POST | `/api/ehs/incidents/{id}/review` | ehs |  |
| 152 | create_treatment | POST | `/api/ehs/incidents/{id}/treatment` | ehs |  |
| 153 | update_treatment_action | PUT | `/api/ehs/incidents/{id}/treatment/actions/{action_id}` | ehs |  |
| 154 | complete_treatment | POST | `/api/ehs/incidents/{id}/treatment/complete` | ehs |  |
| 155 | list_hazards | GET | `/api/ehs/issues` | ehs | path exists in frontend but method not called |
| 156 | approve_hazard | POST | `/api/ehs/issues/{id}/approval/approve` | ehs |  |
| 157 | reject_hazard | POST | `/api/ehs/issues/{id}/approval/reject` | ehs |  |
| 158 | start_hazard_approval | POST | `/api/ehs/issues/{id}/approval/start` | ehs |  |
| 159 | start_rectification | POST | `/api/ehs/issues/{id}/rectification` | ehs |  |
| 160 | update_rectification | PUT | `/api/ehs/issues/{id}/rectification` | ehs |  |
| 161 | submit_rectification | POST | `/api/ehs/issues/{id}/rectification/submit` | ehs |  |
| 162 | verify_hazard | POST | `/api/ehs/issues/{id}/verification` | ehs |  |
| 163 | list_disease_cases | GET | `/api/ehs/occupational-disease/cases` | ehs |  |
| 164 | create_disease_case | POST | `/api/ehs/occupational-disease/cases` | ehs |  |
| 165 | get_disease_case | GET | `/api/ehs/occupational-disease/cases/{id}` | ehs |  |
| 166 | update_disease_case | PUT | `/api/ehs/occupational-disease/cases/{id}` | ehs |  |
| 167 | delete_disease_case | DELETE | `/api/ehs/occupational-disease/cases/{id}` | ehs |  |
| 168 | list_detection_records | GET | `/api/ehs/occupational-disease/detections` | ehs |  |
| 169 | create_detection_record | POST | `/api/ehs/occupational-disease/detections` | ehs |  |
| 170 | get_detection_record | GET | `/api/ehs/occupational-disease/detections/{id}` | ehs |  |
| 171 | delete_detection_record | DELETE | `/api/ehs/occupational-disease/detections/{id}` | ehs |  |
| 172 | list_factor_types | GET | `/api/ehs/occupational-disease/factor-types` | ehs |  |
| 173 | list_hazard_factors | GET | `/api/ehs/occupational-disease/factors` | ehs |  |
| 174 | create_hazard_factor | POST | `/api/ehs/occupational-disease/factors` | ehs |  |
| 175 | get_hazard_factor | GET | `/api/ehs/occupational-disease/factors/{id}` | ehs |  |
| 176 | update_hazard_factor | PUT | `/api/ehs/occupational-disease/factors/{id}` | ehs |  |
| 177 | delete_hazard_factor | DELETE | `/api/ehs/occupational-disease/factors/{id}` | ehs |  |
| 178 | list_protection_measures | GET | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 179 | create_protection_measure | POST | `/api/ehs/occupational-disease/protection-measures` | ehs |  |
| 180 | get_protection_measure | GET | `/api/ehs/occupational-disease/protection-measures/{id}` | ehs |  |
| 181 | update_protection_measure | PUT | `/api/ehs/occupational-disease/protection-measures/{id}` | ehs |  |
| 182 | delete_protection_measure | DELETE | `/api/ehs/occupational-disease/protection-measures/{id}` | ehs |  |
| 183 | get_disease_statistics | GET | `/api/ehs/occupational-disease/statistics` | ehs |  |
| 184 | list_health_trainings | GET | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 185 | create_health_training | POST | `/api/ehs/occupational-disease/trainings` | ehs |  |
| 186 | get_health_training | GET | `/api/ehs/occupational-disease/trainings/{id}` | ehs |  |
| 187 | delete_health_training | DELETE | `/api/ehs/occupational-disease/trainings/{id}` | ehs |  |
| 188 | list_abnormalities | GET | `/api/ehs/occupational-health/abnormalities` | ehs |  |
| 189 | update_abnormality | PUT | `/api/ehs/occupational-health/abnormalities/{id}` | ehs |  |
| 190 | get_health_archive | GET | `/api/ehs/occupational-health/archives/{employee_id}` | ehs |  |
| 191 | list_contraindications | GET | `/api/ehs/occupational-health/contraindications` | ehs | path exists in frontend but method not called |
| 192 | list_exam_plans | GET | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 193 | create_exam_plan | POST | `/api/ehs/occupational-health/exam-plans` | ehs |  |
| 194 | get_exam_plan | GET | `/api/ehs/occupational-health/exam-plans/{id}` | ehs |  |
| 195 | update_exam_plan | PUT | `/api/ehs/occupational-health/exam-plans/{id}` | ehs |  |
| 196 | delete_exam_plan | DELETE | `/api/ehs/occupational-health/exam-plans/{id}` | ehs |  |
| 197 | list_exam_records | GET | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 198 | create_exam_record | POST | `/api/ehs/occupational-health/exam-records` | ehs |  |
| 199 | get_exam_record | GET | `/api/ehs/occupational-health/exam-records/{id}` | ehs |  |
| 200 | update_exam_record | PUT | `/api/ehs/occupational-health/exam-records/{id}` | ehs |  |
| 201 | delete_exam_record | DELETE | `/api/ehs/occupational-health/exam-records/{id}` | ehs |  |
| 202 | list_exam_types | GET | `/api/ehs/occupational-health/exam-types` | ehs |  |
| 203 | get_health_statistics | GET | `/api/ehs/occupational-health/statistics` | ehs |  |
| 204 | list_sync_records | GET | `/api/ehs/sync-records` | ehs |  |
| 205 | delete_sync_record | DELETE | `/api/ehs/sync-records/{id}` | ehs | path exists in frontend but method not called |
| 206 | retry_sync | POST | `/api/ehs/sync-records/{id}/retry` | ehs |  |
| 207 | sync_accident_to_lims | POST | `/api/ehs/sync/accident-to-lims` | ehs |  |
| 208 | update_sync_configs | PUT | `/api/ehs/sync/configs` | ehs | path exists in frontend but method not called |
| 209 | sync_hazard_to_qms | POST | `/api/ehs/sync/hazard-to-qms` | ehs |  |
| 210 | list_trainings | GET | `/api/ehs/training` | ehs |  |
| 211 | create_training | POST | `/api/ehs/training` | ehs |  |
| 212 | get_training | GET | `/api/ehs/training/{id}` | ehs |  |
| 213 | update_training | PUT | `/api/ehs/training/{id}` | ehs |  |
| 214 | delete_training | DELETE | `/api/ehs/training/{id}` | ehs |  |
| 215 | _detailed_health | GET | `/api/health/detailed` | ehs |  |
| 216 | list_assets | GET | `/api/erp/assets` | erp | path exists in frontend but method not called |
| 217 | erp_list_customers | GET | `/api/erp/customers` | erp | path exists in frontend but method not called |
| 218 | list_inventory | GET | `/api/erp/inventory` | erp | path exists in frontend but method not called |
| 219 | erp_list_rooms | GET | `/api/erp/meeting-rooms` | erp | path exists in frontend but method not called |
| 220 | list_bookings | GET | `/api/erp/meeting-rooms/bookings` | erp |  |
| 221 | create_booking | POST | `/api/erp/meeting-rooms/bookings` | erp |  |
| 222 | list_purchase_orders | GET | `/api/erp/purchase-orders` | erp | path exists in frontend but method not called |
| 223 | list_sales_orders | GET | `/api/erp/sales-orders` | erp | path exists in frontend but method not called |
| 224 | list_suppliers | GET | `/api/erp/suppliers` | erp | path exists in frontend but method not called |
| 225 | erp_list_materials | GET | `/api/erp/materials` | erp | path exists in frontend but method not called |
| 226 | list_feedbacks | GET | `/api/feedback/feedbacks` | feedback |  |
| 227 | create_feedback | POST | `/api/feedback/feedbacks` | feedback |  |
| 228 | get_feedback | GET | `/api/feedback/feedbacks/{id}` | feedback |  |
| 229 | response_feedback | PUT | `/api/feedback/feedbacks/{id}` | feedback |  |
| 230 | delete_feedback | DELETE | `/api/feedback/feedbacks/{id}` | feedback |  |
| 231 | get_account | GET | `/api/finance/accounts/{account_id}` | finance |  |
| 232 | get_balance_sheet | GET | `/api/finance/balance-sheet/{period}` | finance |  |
| 233 | get_income_statement | GET | `/api/finance/income-statement/{period}` | finance |  |
| 234 | get_ledger | GET | `/api/finance/ledger` | finance |  |
| 235 | get_trial_balance | GET | `/api/finance/trial-balance/{period}` | finance |  |
| 236 | get_voucher | GET | `/api/finance/vouchers/{voucher_id}` | finance |  |
| 237 | approve_voucher | POST | `/api/finance/vouchers/{voucher_id}/approve` | finance |  |
| 238 | post_voucher | POST | `/api/finance/vouchers/{voucher_id}/post` | finance |  |
| 239 | submit_voucher | POST | `/api/finance/vouchers/{voucher_id}/submit` | finance |  |
| 240 | list_devices | GET | `/api/gis/devices` | gis |  |
| 241 | get_device | GET | `/api/gis/devices/{id}` | gis |  |
| 242 | list_locations | GET | `/api/gis/locations` | gis |  |
| 243 | create_location | POST | `/api/gis/locations/create` | gis |  |
| 244 | get_location | GET | `/api/gis/locations/{id}` | gis |  |
| 245 | list_maps | GET | `/api/gis/maps` | gis |  |
| 246 | create_map | POST | `/api/gis/maps/create` | gis |  |
| 247 | get_map | GET | `/api/gis/maps/{id}` | gis |  |
| 248 | update_map | PUT | `/api/gis/maps/{id}` | gis |  |
| 249 | delete_map | DELETE | `/api/gis/maps/{id}` | gis |  |
| 250 | list_companies | GET | `/api/hrm/companies` | hrm | path exists in frontend but method not called |
| 251 | list_departments | GET | `/api/hrm/departments` | hrm | path exists in frontend but method not called |
| 252 | list_employees | GET | `/api/hrm/employees` | hrm | path exists in frontend but method not called |
| 253 | list_mes_erp_sync_records | GET | `/api/integration/mes-erp/records` | integration |  |
| 254 | sync_erp_order_to_mes | POST | `/api/integration/mes-erp/sync/erp-to-mes` | integration |  |
| 255 | sync_mes_progress_to_erp | POST | `/api/integration/mes-erp/sync/mes-to-erp` | integration |  |
| 256 | get_mes_erp_sync_logs | GET | `/api/integration/mes-erp/{id}/logs` | integration |  |
| 257 | retry_mes_erp_sync | POST | `/api/integration/mes-erp/{id}/retry` | integration |  |
| 258 | list_mes_qms_sync_api | GET | `/api/integration/mes-qms` | integration |  |
| 259 | defect_handling_api | POST | `/api/integration/mes-qms/defect-handling` | integration |  |
| 260 | get_mes_qms_stats_api | GET | `/api/integration/mes-qms/stats` | integration |  |
| 261 | sync_quality_result_api | POST | `/api/integration/mes-qms/sync-result` | integration |  |
| 262 | sync_trace_chain_api | POST | `/api/integration/mes-qms/sync-trace` | integration |  |
| 263 | trigger_qms_inspection_api | POST | `/api/integration/mes-qms/trigger-inspection` | integration |  |
| 264 | get_mes_qms_sync_api | GET | `/api/integration/mes-qms/{id}` | integration |  |
| 265 | retry_mes_qms_sync_api | POST | `/api/integration/mes-qms/{id}/retry` | integration |  |
| 266 | get_pending | GET | `/api/integration/sync/pending` | integration |  |
| 267 | retry_failed | POST | `/api/integration/sync/retry-failed` | integration |  |
| 268 | get_statistics | GET | `/api/integration/sync/statistics` | integration |  |
| 269 | create_task | POST | `/api/integration/sync/tasks` | integration |  |
| 270 | get_task | GET | `/api/integration/sync/tasks/{task_id}` | integration |  |
| 271 | update_status | POST | `/api/integration/sync/tasks/{task_id}/status` | integration |  |
| 272 | trigger_scm_wms | POST | `/api/integration/sync/trigger/scm-to-wms` | integration |  |
| 273 | trigger_srm_scm | POST | `/api/integration/sync/trigger/srm-to-scm` | integration |  |
| 274 | trigger_wms_crm | POST | `/api/integration/sync/trigger/wms-to-crm` | integration |  |
| 275 | list_instruments | GET | `/api/lims/instruments` | lims |  |
| 276 | create_instrument | POST | `/api/lims/instruments` | lims |  |
| 277 | list_reagents | GET | `/api/lims/reagents` | lims |  |
| 278 | create_reagent | POST | `/api/lims/reagents` | lims |  |
| 279 | list_samples | GET | `/api/lims/samples` | lims |  |
| 280 | register_sample | POST | `/api/lims/samples` | lims |  |
| 281 | get_sample | GET | `/api/lims/samples/{id}` | lims |  |
| 282 | list_tasks | GET | `/api/lims/tasks` | lims |  |
| 283 | lims_create_task | POST | `/api/lims/tasks` | lims |  |
| 284 | lims_get_task | GET | `/api/lims/tasks/{id}` | lims |  |
| 285 | list_apps | GET | `/api/lowcode/apps` | lowcode | path exists in frontend but method not called |
| 286 | get_designer_schema | GET | `/api/lowcode/designer/schema` | lowcode |  |
| 287 | generate_suggestions | POST | `/api/master/quality-v51/ai/suggest` | master-data |  |
| 288 | apply_auto_fix | POST | `/api/master/quality-v51/auto-fix/run` | master-data |  |
| 289 | list_quality_checks | GET | `/api/master/quality-v51/checks` | master-data |  |
| 290 | run_quality_check | POST | `/api/master/quality-v51/checks` | master-data |  |
| 291 | get_quality_dashboard | GET | `/api/master/quality-v51/dashboard` | master-data |  |
| 292 | list_quality_rules | GET | `/api/master/quality-v51/rules` | master-data |  |
| 293 | create_quality_rule | POST | `/api/master/quality-v51/rules` | master-data |  |
| 294 | get_quality_score | GET | `/api/master/quality-v51/score` | master-data |  |
| 295 | get_all_tasks | GET | `/api/mobile-tasks` | mobile |  |
| 296 | mobile_create_task | POST | `/api/mobile-tasks` | mobile |  |
| 297 | mobile_get_task | GET | `/api/mobile-tasks/{id}` | mobile |  |
| 298 | update_task | PUT | `/api/mobile-tasks/{id}` | mobile |  |
| 299 | delete_task | DELETE | `/api/mobile-tasks/{id}` | mobile |  |
| 300 | get_all_patrol_records | GET | `/api/mobile/patrol-records` | mobile |  |
| 301 | create_patrol_record | POST | `/api/mobile/patrol-records` | mobile |  |
| 302 | get_patrol_record | GET | `/api/mobile/patrol-records/{id}` | mobile |  |
| 303 | scan_barcode | POST | `/api/mobile/scan/barcode` | mobile |  |
| 304 | get_dashboard_stats | GET | `/api/mobile/stats/dashboard` | mobile |  |
| 305 | list_alerts | GET | `/api/monitor/alerts` | monitor |  |
| 306 | acknowledge_alerts | POST | `/api/monitor/alerts/acknowledge` | monitor |  |
| 307 | resolve_alerts | POST | `/api/monitor/alerts/resolve` | monitor |  |
| 308 | get_alert_statistics | GET | `/api/monitor/alerts/statistics` | monitor |  |
| 309 | get_alert | GET | `/api/monitor/alerts/{id}` | monitor |  |
| 310 | update_alert | POST | `/api/monitor/alerts/{id}` | monitor |  |
| 311 | get_alert_history | GET | `/api/monitor/alerts/{id}/history` | monitor |  |
| 312 | get_alert_timeline | GET | `/api/monitor/alerts/{id}/timeline` | monitor |  |
| 313 | list_business_metrics | GET | `/api/monitor/business-metrics` | monitor |  |
| 314 | create_business_metric | POST | `/api/monitor/business-metrics` | monitor |  |
| 315 | get_kpi_dashboard | GET | `/api/monitor/business-metrics/kpi` | monitor |  |
| 316 | get_business_metric_summary | GET | `/api/monitor/business-metrics/summary` | monitor |  |
| 317 | get_business_metric_trend | GET | `/api/monitor/business-metrics/trend` | monitor |  |
| 318 | get_business_metric | GET | `/api/monitor/business-metrics/{id}` | monitor |  |
| 319 | update_business_metric | PUT | `/api/monitor/business-metrics/{id}` | monitor |  |
| 320 | delete_business_metric | DELETE | `/api/monitor/business-metrics/{id}` | monitor |  |
| 321 | get_service_health | GET | `/api/monitor/health` | monitor |  |
| 322 | get_database_metrics | GET | `/api/monitor/metrics/database` | monitor |  |
| 323 | get_metric_snapshot | GET | `/api/monitor/metrics/snapshot` | monitor |  |
| 324 | get_system_metrics | GET | `/api/monitor/metrics/system` | monitor |  |
| 325 | get_api_performance | GET | `/api/monitor/performance/api` | monitor |  |
| 326 | export_performance_data | POST | `/api/monitor/performance/export` | monitor |  |
| 327 | get_service_performance | GET | `/api/monitor/performance/services` | monitor |  |
| 328 | get_slow_queries | GET | `/api/monitor/performance/slow-queries` | monitor |  |
| 329 | get_performance_summary | GET | `/api/monitor/performance/summary` | monitor |  |
| 330 | get_performance_trend | GET | `/api/monitor/performance/trend` | monitor |  |
| 331 | list_rules | GET | `/api/monitor/rules` | monitor |  |
| 332 | create_rule | POST | `/api/monitor/rules` | monitor |  |
| 333 | get_rule | GET | `/api/monitor/rules/{id}` | monitor |  |
| 334 | update_rule | PUT | `/api/monitor/rules/{id}` | monitor |  |
| 335 | delete_rule | DELETE | `/api/monitor/rules/{id}` | monitor |  |
| 336 | get_advanced_rule | GET | `/api/monitor/rules/{id}/advanced` | monitor |  |
| 337 | update_advanced_rule | PUT | `/api/monitor/rules/{id}/advanced` | monitor |  |
| 338 | disable_rule | POST | `/api/monitor/rules/{id}/disable` | monitor |  |
| 339 | enable_rule | POST | `/api/monitor/rules/{id}/enable` | monitor |  |
| 340 | get_escalation | GET | `/api/monitor/rules/{id}/escalation` | monitor |  |
| 341 | update_escalation | PUT | `/api/monitor/rules/{id}/escalation` | monitor |  |
| 342 | get_routing | GET | `/api/monitor/rules/{id}/routing` | monitor |  |
| 343 | update_routing | PUT | `/api/monitor/rules/{id}/routing` | monitor |  |
| 344 | get_scheduled_trigger | GET | `/api/monitor/rules/{id}/scheduled-trigger` | monitor |  |
| 345 | update_scheduled_trigger | PUT | `/api/monitor/rules/{id}/scheduled-trigger` | monitor |  |
| 346 | list_slos | GET | `/api/monitor/slos` | monitor |  |
| 347 | create_slo | POST | `/api/monitor/slos` | monitor |  |
| 348 | get_slo_budget | GET | `/api/monitor/slos/budget` | monitor |  |
| 349 | get_slo_summary | GET | `/api/monitor/slos/summary` | monitor |  |
| 350 | get_slo_trend | GET | `/api/monitor/slos/trend` | monitor |  |
| 351 | list_slo_violations | GET | `/api/monitor/slos/violations` | monitor |  |
| 352 | resolve_slo_violation | POST | `/api/monitor/slos/violations/{id}/resolve` | monitor |  |
| 353 | get_slo | GET | `/api/monitor/slos/{id}` | monitor |  |
| 354 | update_slo | PUT | `/api/monitor/slos/{id}` | monitor |  |
| 355 | delete_slo | DELETE | `/api/monitor/slos/{id}` | monitor |  |
| 356 | list_suppression_rules | GET | `/api/monitor/suppression` | monitor |  |
| 357 | create_suppression_rule | POST | `/api/monitor/suppression` | monitor |  |
| 358 | get_suppression_rule | GET | `/api/monitor/suppression/{id}` | monitor |  |
| 359 | update_suppression_rule | PUT | `/api/monitor/suppression/{id}` | monitor |  |
| 360 | delete_suppression_rule | DELETE | `/api/monitor/suppression/{id}` | monitor |  |
| 361 | monitor_list_templates | GET | `/api/monitor/templates` | monitor |  |
| 362 | create_template | POST | `/api/monitor/templates` | monitor |  |
| 363 | get_template | GET | `/api/monitor/templates/{id}` | monitor |  |
| 364 | update_template | PUT | `/api/monitor/templates/{id}` | monitor |  |
| 365 | delete_template | DELETE | `/api/monitor/templates/{id}` | monitor |  |
| 366 | list_thresholds | GET | `/api/monitor/thresholds` | monitor |  |
| 367 | create_threshold | POST | `/api/monitor/thresholds` | monitor |  |
| 368 | evaluate_thresholds | POST | `/api/monitor/thresholds/evaluate` | monitor |  |
| 369 | get_threshold | GET | `/api/monitor/thresholds/{id}` | monitor |  |
| 370 | update_threshold | PUT | `/api/monitor/thresholds/{id}` | monitor |  |
| 371 | delete_threshold | DELETE | `/api/monitor/thresholds/{id}` | monitor |  |
| 372 | pdm__home | GET | `/api/pdm` | pdm |  |
| 373 | list_change_notices | GET | `/api/pdm/change-notices` | pdm |  |
| 374 | create_change_notice | POST | `/api/pdm/change-notices` | pdm |  |
| 375 | get_change_notice | GET | `/api/pdm/change-notices/{id}` | pdm |  |
| 376 | update_change_notice | PUT | `/api/pdm/change-notices/{id}` | pdm |  |
| 377 | delete_change_notice | DELETE | `/api/pdm/change-notices/{id}` | pdm |  |
| 378 | approve_change_notice | POST | `/api/pdm/change-notices/{id}/approve` | pdm |  |
| 379 | reject_change_notice | POST | `/api/pdm/change-notices/{id}/reject` | pdm |  |
| 380 | submit_change_notice | POST | `/api/pdm/change-notices/{id}/submit` | pdm |  |
| 381 | list_configurations | GET | `/api/pdm/configurations` | pdm |  |
| 382 | create_configuration | POST | `/api/pdm/configurations` | pdm |  |
| 383 | get_configuration | GET | `/api/pdm/configurations/{id}` | pdm |  |
| 384 | update_configuration | PUT | `/api/pdm/configurations/{id}` | pdm |  |
| 385 | delete_configuration | DELETE | `/api/pdm/configurations/{id}` | pdm |  |
| 386 | list_pending_documents | GET | `/api/pdm/documents/pending-approval` | pdm |  |
| 387 | get_document_approval_history | GET | `/api/pdm/documents/{id}/approval-history` | pdm |  |
| 388 | start_document_approval | POST | `/api/pdm/documents/{id}/approve` | pdm |  |
| 389 | pdm_get_statistics | GET | `/api/pdm/statistics/{id}` | pdm |  |
| 390 | list_versions | GET | `/api/pdm/versions` | pdm |  |
| 391 | create_version | POST | `/api/pdm/versions` | pdm |  |
| 392 | get_version | GET | `/api/pdm/versions/{id}` | pdm |  |
| 393 | update_version | PUT | `/api/pdm/versions/{id}` | pdm |  |
| 394 | delete_version | DELETE | `/api/pdm/versions/{id}` | pdm |  |
| 395 | list_workflow_instances | GET | `/api/pdm/workflow-instances` | pdm |  |
| 396 | get_workflow_instance | GET | `/api/pdm/workflow-instances/{id}` | pdm |  |
| 397 | advance_workflow | POST | `/api/pdm/workflow-instances/{id}/advance` | pdm |  |
| 398 | list_workflows | GET | `/api/pdm/workflows` | pdm |  |
| 399 | create_workflow | POST | `/api/pdm/workflows` | pdm |  |
| 400 | start_workflow | POST | `/api/pdm/workflows/start` | pdm |  |
| 401 | get_workflow | GET | `/api/pdm/workflows/{id}` | pdm |  |
| 402 | update_workflow | PUT | `/api/pdm/workflows/{id}` | pdm |  |
| 403 | delete_workflow | DELETE | `/api/pdm/workflows/{id}` | pdm |  |
| 404 | list_categories | GET | `/api/plugin-registry/marketplace/categories` | plugin-registry |  |
| 405 | list_plugins | GET | `/api/plugin-registry/marketplace/plugins` | plugin-registry |  |
| 406 | get_plugin | GET | `/api/plugin-registry/marketplace/plugins/{code}` | plugin-registry |  |
| 407 | get_marketplace_summary | GET | `/api/plugin-registry/marketplace/summary` | plugin-registry |  |
| 408 | list_tenant_plugins | GET | `/api/plugin-registry/tenants/{tenant_id}/plugins` | plugin-registry |  |
| 409 | install_plugin | POST | `/api/plugin-registry/tenants/{tenant_id}/plugins/{plugin_code}` | plugin-registry |  |
| 410 | get_approval | GET | `/api/pm/projects/{project_id}/approval` | pm |  |
| 411 | submit_approval | POST | `/api/pm/projects/{project_id}/approval` | pm |  |
| 412 | handle_approval_action | POST | `/api/pm/projects/{project_id}/approval/action` | pm |  |
| 413 | get_benefits | GET | `/api/pm/projects/{project_id}/benefits` | pm |  |
| 414 | calculate_benefits | POST | `/api/pm/projects/{project_id}/benefits` | pm |  |
| 415 | pm_get_analysis | GET | `/api/pm/projects/{project_id}/benefits/analysis` | pm |  |
| 416 | list_expenses | GET | `/api/pm/projects/{project_id}/expenses` | pm |  |
| 417 | add_expense | POST | `/api/pm/projects/{project_id}/expenses` | pm |  |
| 418 | get_expense | GET | `/api/pm/projects/{project_id}/expenses/{id}` | pm |  |
| 419 | update_expense | PUT | `/api/pm/projects/{project_id}/expenses/{id}` | pm |  |
| 420 | remove_expense | DELETE | `/api/pm/projects/{project_id}/expenses/{id}` | pm |  |
| 421 | list_members | GET | `/api/pm/projects/{project_id}/members` | pm |  |
| 422 | create_member | POST | `/api/pm/projects/{project_id}/members` | pm |  |
| 423 | get_member | GET | `/api/pm/projects/{project_id}/members/{id}` | pm |  |
| 424 | update_member | PUT | `/api/pm/projects/{project_id}/members/{id}` | pm |  |
| 425 | delete_member | DELETE | `/api/pm/projects/{project_id}/members/{id}` | pm |  |
| 426 | list_milestones | GET | `/api/pm/projects/{project_id}/milestones` | pm |  |
| 427 | create_milestone | POST | `/api/pm/projects/{project_id}/milestones` | pm |  |
| 428 | get_milestone | GET | `/api/pm/projects/{project_id}/milestones/{id}` | pm |  |
| 429 | update_milestone | PUT | `/api/pm/projects/{project_id}/milestones/{id}` | pm |  |
| 430 | delete_milestone | DELETE | `/api/pm/projects/{project_id}/milestones/{id}` | pm |  |
| 431 | list_phases | GET | `/api/pm/projects/{project_id}/phases` | pm |  |
| 432 | create_phase | POST | `/api/pm/projects/{project_id}/phases` | pm |  |
| 433 | get_phase | GET | `/api/pm/projects/{project_id}/phases/{id}` | pm |  |
| 434 | update_phase | PUT | `/api/pm/projects/{project_id}/phases/{id}` | pm |  |
| 435 | delete_phase | DELETE | `/api/pm/projects/{project_id}/phases/{id}` | pm |  |
| 436 | list_resources | GET | `/api/pm/projects/{project_id}/resources` | pm |  |
| 437 | add_resource | POST | `/api/pm/projects/{project_id}/resources` | pm |  |
| 438 | get_resource | GET | `/api/pm/projects/{project_id}/resources/{id}` | pm |  |
| 439 | update_resource | PUT | `/api/pm/projects/{project_id}/resources/{id}` | pm |  |
| 440 | remove_resource | DELETE | `/api/pm/projects/{project_id}/resources/{id}` | pm |  |
| 441 | get_announcements | GET | `/api/portal/announcements` | portal |  |
| 442 | create_announcement | POST | `/api/portal/announcements` | portal |  |
| 443 | portal_get_dashboard_stats | GET | `/api/portal/dashboard/stats` | portal |  |
| 444 | get_navigation_menu | GET | `/api/portal/navigation/menu` | portal |  |
| 445 | portal_get_notifications | GET | `/api/portal/notifications` | portal |  |
| 446 | list_services | GET | `/api/portal/services` | portal |  |
| 447 | get_todos | GET | `/api/portal/todos` | portal |  |
| 448 | add_todo | POST | `/api/portal/todos` | portal |  |
| 449 | get_user_info | GET | `/api/portal/user` | portal |  |
| 450 | list_inspections | GET | `/api/qms/checks` | qms | path exists in frontend but method not called |
| 451 | list_issues | GET | `/api/qms/issues` | qms | path exists in frontend but method not called |
| 452 | list_standards | GET | `/api/qms/standards` | qms | path exists in frontend but method not called |
| 453 | list_audit_logs | GET | `/api/rd/audit-logs` | rd |  |
| 454 | rd_list_projects | GET | `/api/rd/projects` | rd | path exists in frontend but method not called |
| 455 | reject_order | POST | `/api/scm/purchase-orders/{id}/reject` | scm |  |
| 456 | search_handler | GET | `/api/search` | search |  |
| 457 | health_handler | GET | `/api/search/health` | search |  |
| 458 | list_sla_policies_handler | GET | `/api/ticket/sla-policies` | ticket |  |
| 459 | create_sla_policy_handler | POST | `/api/ticket/sla-policies` | ticket |  |
| 460 | list_tickets_handler | GET | `/api/tickets` | ticket |  |
| 461 | create_ticket_handler | POST | `/api/tickets` | ticket |  |
| 462 | get_stats_handler | GET | `/api/tickets/stats` | ticket |  |
| 463 | get_ticket_handler | GET | `/api/tickets/{id}` | ticket |  |
| 464 | update_ticket_handler | PUT | `/api/tickets/{id}` | ticket |  |
| 465 | delete_ticket_handler | DELETE | `/api/tickets/{id}` | ticket |  |
| 466 | list_comments_handler | GET | `/api/tickets/{id}/comments` | ticket |  |
| 467 | add_comment_handler | POST | `/api/tickets/{id}/comments` | ticket |  |
| 468 | login | POST | `/api/unified-core/iam/auth/login` | unified-core |  |
| 469 | register | POST | `/api/unified-core/iam/auth/register` | unified-core |  |
| 470 | list_users | GET | `/api/unified-core/users` | unified-core |  |
| 471 | create_user | POST | `/api/unified-core/users` | unified-core |  |

## 2. 未文档化前端 API（前端有调用，OpenAPI 无定义）

共 2559 个调用：

| # | 方法 | 完整路径 | 服务 | 文件 | 行号 |
|---|------|----------|------|------|------|
| 1 | GET | `/api/erp/addressbook` | erp | apps/web/src/api/addressbook/index.ts | 18 |
| 2 | GET | `/api/erp/addressbook/{id}` | erp | apps/web/src/api/addressbook/index.ts | 26 |
| 3 | GET | `/api/erp/addressbook/search` | erp | apps/web/src/api/addressbook/index.ts | 35 |
| 4 | GET | `/api/erp/addressbook/departments/tree` | erp | apps/web/src/api/addressbook/index.ts | 42 |
| 5 | GET | `/api/core/system/api-keys` | core | apps/web/src/api/admin/apiKeys.ts | 24 |
| 6 | POST | `/api/core/system/api-keys` | core | apps/web/src/api/admin/apiKeys.ts | 28 |
| 7 | DELETE | `/api/core/system/api-keys/{id}` | core | apps/web/src/api/admin/apiKeys.ts | 32 |
| 8 | GET | `/api/erp/system/audit-logs` | erp | apps/web/src/api/admin/auditLog.ts | 25 |
| 9 | GET | `/api/erp/system/audit-logs/{id}` | erp | apps/web/src/api/admin/auditLog.ts | 29 |
| 10 | GET | `/api/erp/system/audit-logs/export` | erp | apps/web/src/api/admin/auditLog.ts | 42 |
| 11 | GET | `/api/core/monitor/alerts` | core | apps/web/src/api/admin/monitoring.ts | 165 |
| 12 | GET | `/api/core/monitor/alerts/{id}` | core | apps/web/src/api/admin/monitoring.ts | 169 |
| 13 | POST | `/api/core/monitor/alerts/acknowledge` | core | apps/web/src/api/admin/monitoring.ts | 173 |
| 14 | POST | `/api/core/monitor/alerts/resolve` | core | apps/web/src/api/admin/monitoring.ts | 180 |
| 15 | POST | `/api/core/monitor/alerts/{id}/escalate` | core | apps/web/src/api/admin/monitoring.ts | 190 |
| 16 | POST | `/api/core/monitor/alerts/{id}/dismiss` | core | apps/web/src/api/admin/monitoring.ts | 194 |
| 17 | GET | `/api/core/monitor/alerts/statistics` | core | apps/web/src/api/admin/monitoring.ts | 205 |
| 18 | GET | `/api/core/monitor/alerts/export` | core | apps/web/src/api/admin/monitoring.ts | 218 |
| 19 | GET | `/api/core/monitor/rules` | core | apps/web/src/api/admin/monitoring.ts | 240 |
| 20 | GET | `/api/core/monitor/rules/{id}` | core | apps/web/src/api/admin/monitoring.ts | 244 |
| 21 | POST | `/api/core/monitor/rules` | core | apps/web/src/api/admin/monitoring.ts | 248 |
| 22 | PUT | `/api/core/monitor/rules/{id}` | core | apps/web/src/api/admin/monitoring.ts | 255 |
| 23 | DELETE | `/api/core/monitor/rules/{id}` | core | apps/web/src/api/admin/monitoring.ts | 259 |
| 24 | POST | `/api/core/monitor/rules/{id}/enable` | core | apps/web/src/api/admin/monitoring.ts | 263 |
| 25 | POST | `/api/core/monitor/rules/{id}/disable` | core | apps/web/src/api/admin/monitoring.ts | 267 |
| 26 | GET | `/api/core/monitor/health` | core | apps/web/src/api/admin/monitoring.ts | 271 |
| 27 | GET | `/api/core/monitor/metrics` | core | apps/web/src/api/admin/monitoring.ts | 282 |
| 28 | POST | `/api/core/monitor/alerts/test` | core | apps/web/src/api/admin/monitoring.ts | 291 |
| 29 | GET | `/api/core/audit/operations${queryString ` | core | apps/web/src/api/admin/operationAudit.ts | 77 |
| 30 | GET | `/api/core/audit/operations/{id}` | core | apps/web/src/api/admin/operationAudit.ts | 83 |
| 31 | GET | `/api/core/audit/operations/stats` | core | apps/web/src/api/admin/operationAudit.ts | 87 |
| 32 | GET | `/api/core/audit/permission-changes` | core | apps/web/src/api/admin/permissionAudit.ts | 148 |
| 33 | GET | `/api/core/audit/permission-changes/{id}` | core | apps/web/src/api/admin/permissionAudit.ts | 154 |
| 34 | GET | `/api/core/audit/permission-changes/stats` | core | apps/web/src/api/admin/permissionAudit.ts | 165 |
| 35 | GET | `/api/core/audit/permission-changes/export` | core | apps/web/src/api/admin/permissionAudit.ts | 183 |
| 36 | GET | `/api/core/audit/access-logs` | core | apps/web/src/api/admin/permissionAudit.ts | 207 |
| 37 | GET | `/api/core/audit/access-logs/{id}` | core | apps/web/src/api/admin/permissionAudit.ts | 211 |
| 38 | GET | `/api/core/audit/access-logs/stats` | core | apps/web/src/api/admin/permissionAudit.ts | 222 |
| 39 | GET | `/api/core/audit/access-logs/export` | core | apps/web/src/api/admin/permissionAudit.ts | 238 |
| 40 | GET | `/api/core/system/settings/smtp` | core | apps/web/src/api/admin/smtpSettings.ts | 23 |
| 41 | PUT | `/api/core/system/settings/smtp` | core | apps/web/src/api/admin/smtpSettings.ts | 27 |
| 42 | POST | `/api/core/system/settings/smtp/test` | core | apps/web/src/api/admin/smtpSettings.ts | 34 |
| 43 | GET | `/api/erp/system/settings` | erp | apps/web/src/api/admin/systemSetting.ts | 13 |
| 44 | GET | `/api/erp/system/settings/{key}` | erp | apps/web/src/api/admin/systemSetting.ts | 17 |
| 45 | POST | `/api/erp/system/settings` | erp | apps/web/src/api/admin/systemSetting.ts | 26 |
| 46 | PUT | `/api/erp/system/settings/{key}` | erp | apps/web/src/api/admin/systemSetting.ts | 37 |
| 47 | DELETE | `/api/erp/system/settings/{key}` | erp | apps/web/src/api/admin/systemSetting.ts | 41 |
| 48 | PUT | `/api/erp/system/settings/batch` | erp | apps/web/src/api/admin/systemSetting.ts | 47 |
| 49 | GET | `/api/erp/system/config` | erp | apps/web/src/api/admin/systemSetting.ts | 51 |
| 50 | PUT | `/api/erp/system/config` | erp | apps/web/src/api/admin/systemSetting.ts | 55 |
| 51 | POST | `/api/ai/ai/chat` | ai | apps/web/src/api/ai/chat.ts | 21 |
| 52 | POST | `/api/ai/ai/search` | ai | apps/web/src/api/ai/chat.ts | 25 |
| 53 | POST | `/api/ai/ai/generate` | ai | apps/web/src/api/ai/chat.ts | 29 |
| 54 | GET | `/api/ai/conversations` | ai | apps/web/src/api/ai/chat.ts | 33 |
| 55 | GET | `/api/ai/conversations/{id}` | ai | apps/web/src/api/ai/chat.ts | 37 |
| 56 | POST | `/api/ai/conversations` | ai | apps/web/src/api/ai/chat.ts | 41 |
| 57 | DELETE | `/api/ai/conversations/{id}` | ai | apps/web/src/api/ai/chat.ts | 45 |
| 58 | POST | `/api/ai/ai/validate` | ai | apps/web/src/api/ai/chat.ts | 49 |
| 59 | POST | `/api/ai/ai/complete` | ai | apps/web/src/api/ai/chat.ts | 53 |
| 60 | POST | `/api/ai/ai/summarize` | ai | apps/web/src/api/ai/chat.ts | 57 |
| 61 | POST | `/api/ai/code/fix-bug` | ai | apps/web/src/api/ai/code.ts | 44 |
| 62 | GET | `/api/ai/documents${queryString ` | ai | apps/web/src/api/ai/documents.ts | 26 |
| 63 | POST | `/api/ai/documents/{id}/translate` | ai | apps/web/src/api/ai/documents.ts | 80 |
| 64 | POST | `/api/ai/documents/{id}/ocr` | ai | apps/web/src/api/ai/documents.ts | 93 |
| 65 | POST | `/api/ai/documents/{id}/classify` | ai | apps/web/src/api/ai/documents.ts | 106 |
| 66 | POST | `/api/ai/documents/{id}/entities` | ai | apps/web/src/api/ai/documents.ts | 123 |
| 67 | GET | `/api/ai/ai/templates` | ai | apps/web/src/api/ai/index.ts | 47 |
| 68 | PUT | `/api/ai/conversations/{id}` | ai | apps/web/src/api/ai/index.ts | 59 |
| 69 | GET | `/api/ai/conversations/{id}/messages${queryString ` | ai | apps/web/src/api/ai/index.ts | 73 |
| 70 | POST | `/api/ai/conversations/{conversationId}/messages/{messageId}/regenerate` | ai | apps/web/src/api/ai/index.ts | 80 |
| 71 | GET | `/api/ai/dashboard/stats` | ai | apps/web/src/api/ai/index.ts | 99 |
| 72 | GET | `/api/ai/dashboard/activity-trend${queryString ` | ai | apps/web/src/api/ai/index.ts | 119 |
| 73 | GET | `/api/ai/dashboard/feature-usage` | ai | apps/web/src/api/ai/index.ts | 132 |
| 74 | GET | `/api/ai/models` | ai | apps/web/src/api/ai/index.ts | 154 |
| 75 | GET | `/api/ai/models/{modelId}/config` | ai | apps/web/src/api/ai/index.ts | 170 |
| 76 | PUT | `/api/ai/models/{modelId}/config` | ai | apps/web/src/api/ai/index.ts | 184 |
| 77 | GET | `/api/ai/models/usage${queryString ` | ai | apps/web/src/api/ai/index.ts | 212 |
| 78 | GET | `/api/ai/prompts/templates${queryString ` | ai | apps/web/src/api/ai/index.ts | 239 |
| 79 | GET | `/api/ai/prompts/templates/{id}` | ai | apps/web/src/api/ai/index.ts | 254 |
| 80 | POST | `/api/ai/prompts/templates` | ai | apps/web/src/api/ai/index.ts | 258 |
| 81 | PUT | `/api/ai/prompts/templates/{id}` | ai | apps/web/src/api/ai/index.ts | 265 |
| 82 | DELETE | `/api/ai/prompts/templates/{id}` | ai | apps/web/src/api/ai/index.ts | 269 |
| 83 | POST | `/api/ai/prompts/templates/{id}/favorite` | ai | apps/web/src/api/ai/index.ts | 280 |
| 84 | GET | `/api/ai/prompts/categories` | ai | apps/web/src/api/ai/index.ts | 292 |
| 85 | POST | `/api/ai/prompts/templates/{id}/use` | ai | apps/web/src/api/ai/index.ts | 304 |
| 86 | GET | `/api/ai/qa/history${queryString ` | ai | apps/web/src/api/ai/qa.ts | 100 |
| 87 | POST | `/api/ai/recommendations` | ai | apps/web/src/api/ai/recommendation.ts | 22 |
| 88 | GET | `/api/ai/recommendations/personalized` | ai | apps/web/src/api/ai/recommendation.ts | 39 |
| 89 | POST | `/api/ai/recommendations/feedback` | ai | apps/web/src/api/ai/recommendation.ts | 47 |
| 90 | POST | `/api/ai/vector/search` | ai | apps/web/src/api/ai/vector.ts | 23 |
| 91 | GET | `/api/ai/vector/collections` | ai | apps/web/src/api/ai/vector.ts | 39 |
| 92 | POST | `/api/ai/vector/collections` | ai | apps/web/src/api/ai/vector.ts | 47 |
| 93 | DELETE | `/api/ai/vector/collections/{id}` | ai | apps/web/src/api/ai/vector.ts | 51 |
| 94 | POST | `/api/ai/vector/index/{documentId}` | ai | apps/web/src/api/ai/vector.ts | 64 |
| 95 | GET | `/api/core/automation/dashboard/stats` | automation | apps/web/src/api/automation/dashboard.ts | 9 |
| 96 | GET | `/api/core/automation/health` | automation | apps/web/src/api/automation/dashboard.ts | 14 |
| 97 | GET | `/api/core/automation/designer/canvas/{encodeURIComponent(ruleId)}` | automation | apps/web/src/api/automation/designer.ts | 13 |
| 98 | PUT | `/api/core/automation/designer/canvas/{encodeURIComponent(ruleId)}` | automation | apps/web/src/api/automation/designer.ts | 23 |
| 99 | GET | `/api/core/automation/designer/resources` | automation | apps/web/src/api/automation/designer.ts | 47 |
| 100 | POST | `/api/core/automation/designer/canvas/{encodeURIComponent(ruleId)}/sync-to-rule` | automation | apps/web/src/api/automation/designer.ts | 54 |
| 101 | POST | `/api/core/automation/designer/canvas/{encodeURIComponent(ruleId)}/sync-from-rule` | automation | apps/web/src/api/automation/designer.ts | 61 |
| 102 | GET | `/api/core/automation/rules${qs ` | automation | apps/web/src/api/automation/rules.ts | 22 |
| 103 | GET | `/api/core/automation/rules/{id}` | automation | apps/web/src/api/automation/rules.ts | 28 |
| 104 | GET | `/api/core/automation/rules/by-code/{encodeURIComponent(code)}` | automation | apps/web/src/api/automation/rules.ts | 32 |
| 105 | POST | `/api/core/automation/rules` | automation | apps/web/src/api/automation/rules.ts | 36 |
| 106 | PUT | `/api/core/automation/rules/{id}` | automation | apps/web/src/api/automation/rules.ts | 43 |
| 107 | DELETE | `/api/core/automation/rules/{id}` | automation | apps/web/src/api/automation/rules.ts | 47 |
| 108 | POST | `/api/core/automation/rules/{id}/enable` | automation | apps/web/src/api/automation/rules.ts | 51 |
| 109 | POST | `/api/core/automation/rules/{id}/disable` | automation | apps/web/src/api/automation/rules.ts | 55 |
| 110 | POST | `/api/core/automation/rules/{id}/duplicate` | automation | apps/web/src/api/automation/rules.ts | 59 |
| 111 | POST | `/api/core/automation/rules/{id}/trigger` | automation | apps/web/src/api/automation/rules.ts | 67 |
| 112 | GET | `/api/core/automation/runs${qs ` | automation | apps/web/src/api/automation/runs.ts | 18 |
| 113 | GET | `/api/core/automation/runs/{id}` | automation | apps/web/src/api/automation/runs.ts | 24 |
| 114 | POST | `/api/core/automation/runs/{id}/retry` | automation | apps/web/src/api/automation/runs.ts | 29 |
| 115 | POST | `/api/core/automation/runs/{id}/cancel` | automation | apps/web/src/api/automation/runs.ts | 34 |
| 116 | GET | `/api/core/automation/runs/{id}/logs${qs ` | automation | apps/web/src/api/automation/runs.ts | 51 |
| 117 | POST | `/api/core/automation/runs/purge` | automation | apps/web/src/api/automation/runs.ts | 61 |
| 118 | GET | `/api/core/automation/variables${qs ` | automation | apps/web/src/api/automation/variables.ts | 26 |
| 119 | GET | `/api/core/automation/variables/{encodeURIComponent(key)}` | automation | apps/web/src/api/automation/variables.ts | 32 |
| 120 | POST | `/api/core/automation/variables` | automation | apps/web/src/api/automation/variables.ts | 38 |
| 121 | PUT | `/api/core/automation/variables/{encodeURIComponent(key)}` | automation | apps/web/src/api/automation/variables.ts | 45 |
| 122 | DELETE | `/api/core/automation/variables/{encodeURIComponent(key)}` | automation | apps/web/src/api/automation/variables.ts | 52 |
| 123 | GET | `/api/core/automation/variables/{encodeURIComponent(key)}/reveal` | automation | apps/web/src/api/automation/variables.ts | 59 |
| 124 | POST | `/api/core/automation/variables/bulk-import` | automation | apps/web/src/api/automation/variables.ts | 68 |
| 125 | GET | `/api/bi/summary` | bi | apps/web/src/api/bi/analytics.ts | 4 |
| 126 | GET | `/api/bi/development` | bi | apps/web/src/api/bi/analytics.ts | 8 |
| 127 | GET | `/api/bi/quality` | bi | apps/web/src/api/bi/analytics.ts | 12 |
| 128 | GET | `/api/bi/production` | bi | apps/web/src/api/bi/analytics.ts | 16 |
| 129 | GET | `/api/bi/laboratory` | bi | apps/web/src/api/bi/analytics.ts | 20 |
| 130 | GET | `/api/bi/overview` | bi | apps/web/src/api/bi/analytics.ts | 24 |
| 131 | GET | `/api/bi/{moduleId}` | bi | apps/web/src/api/bi/analytics.ts | 28 |
| 132 | GET | `/api/bi/rs/summary` | bi | apps/web/src/api/bi/analytics.ts | 45 |
| 133 | GET | `/api/bi/rs/project-timeline` | bi | apps/web/src/api/bi/analytics.ts | 49 |
| 134 | GET | `/api/bi/rs/experiment-success-rate` | bi | apps/web/src/api/bi/analytics.ts | 53 |
| 135 | GET | `/api/bi/rs/material-usage` | bi | apps/web/src/api/bi/analytics.ts | 57 |
| 136 | GET | `/api/bi/rs/project-ranking` | bi | apps/web/src/api/bi/analytics.ts | 61 |
| 137 | GET | `/api/bi/lims/summary` | bi | apps/web/src/api/bi/analytics.ts | 65 |
| 138 | GET | `/api/bi/lims/sample-timeline` | bi | apps/web/src/api/bi/analytics.ts | 69 |
| 139 | GET | `/api/bi/lims/test-pass-rate` | bi | apps/web/src/api/bi/analytics.ts | 73 |
| 140 | GET | `/api/bi/lims/instrument-usage` | bi | apps/web/src/api/bi/analytics.ts | 77 |
| 141 | GET | `/api/bi/lims/sample-status-distribution` | bi | apps/web/src/api/bi/analytics.ts | 81 |
| 142 | GET | `/api/bi/qms/summary` | bi | apps/web/src/api/bi/analytics.ts | 85 |
| 143 | GET | `/api/bi/qms/quality-trend` | bi | apps/web/src/api/bi/analytics.ts | 89 |
| 144 | GET | `/api/bi/qms/issue-distribution` | bi | apps/web/src/api/bi/analytics.ts | 93 |
| 145 | GET | `/api/bi/ehs/summary` | bi | apps/web/src/api/bi/analytics.ts | 97 |
| 146 | GET | `/api/bi/ehs/risk-distribution` | bi | apps/web/src/api/bi/analytics.ts | 101 |
| 147 | GET | `/api/bi/ehs/incident-trend` | bi | apps/web/src/api/bi/analytics.ts | 105 |
| 148 | GET | `/api/bi/srm/summary` | bi | apps/web/src/api/bi/analytics.ts | 109 |
| 149 | GET | `/api/bi/srm/supplier-ranking` | bi | apps/web/src/api/bi/analytics.ts | 113 |
| 150 | GET | `/api/bi/srm/order-timeline` | bi | apps/web/src/api/bi/analytics.ts | 117 |
| 151 | GET | `/api/bi/pdm/summary` | bi | apps/web/src/api/bi/analytics.ts | 121 |
| 152 | GET | `/api/bi/pdm/production-trend` | bi | apps/web/src/api/bi/analytics.ts | 125 |
| 153 | GET | `/api/bi/pdm/batch-status-distribution` | bi | apps/web/src/api/bi/analytics.ts | 129 |
| 154 | GET | `/api/bi/{moduleId}` | bi | apps/web/src/api/bi/analytics.ts | 133 |
| 155 | GET | `/api/bi/comparison-analysis` | bi | apps/web/src/api/bi/comparison.ts | 10 |
| 156 | GET | `/api/bi/comparison-analysis/{id}` | bi | apps/web/src/api/bi/comparison.ts | 14 |
| 157 | POST | `/api/bi/comparison-analysis` | bi | apps/web/src/api/bi/comparison.ts | 18 |
| 158 | PUT | `/api/bi/comparison-analysis/{id}` | bi | apps/web/src/api/bi/comparison.ts | 22 |
| 159 | DELETE | `/api/bi/comparison-analysis/{id}` | bi | apps/web/src/api/bi/comparison.ts | 26 |
| 160 | POST | `/api/bi/comparison-analysis/{id}/run` | bi | apps/web/src/api/bi/comparison.ts | 30 |
| 161 | GET | `/api/bi/comparison-analysis/{id}/result` | bi | apps/web/src/api/bi/comparison.ts | 34 |
| 162 | GET | `/api/bi/dashboard` | bi | apps/web/src/api/bi/dashboard.ts | 5 |
| 163 | GET | `/api/bi/dashboard/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 9 |
| 164 | POST | `/api/bi/dashboard` | bi | apps/web/src/api/bi/dashboard.ts | 13 |
| 165 | PUT | `/api/bi/dashboard/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 17 |
| 166 | DELETE | `/api/bi/dashboard/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 21 |
| 167 | POST | `/api/bi/dashboard/{id}/clone` | bi | apps/web/src/api/bi/dashboard.ts | 25 |
| 168 | GET | `/api/bi/dashboard/public` | bi | apps/web/src/api/bi/dashboard.ts | 29 |
| 169 | GET | `/api/bi/dashboard/user/{ownerId}` | bi | apps/web/src/api/bi/dashboard.ts | 33 |
| 170 | GET | `/api/bi/dashboard/template` | bi | apps/web/src/api/bi/dashboard.ts | 37 |
| 171 | GET | `/api/bi/dashboard/template/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 41 |
| 172 | POST | `/api/bi/dashboard/template` | bi | apps/web/src/api/bi/dashboard.ts | 45 |
| 173 | PUT | `/api/bi/dashboard/template/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 49 |
| 174 | DELETE | `/api/bi/dashboard/template/{id}` | bi | apps/web/src/api/bi/dashboard.ts | 53 |
| 175 | POST | `/api/bi/dashboard/template/{templateId}/create` | bi | apps/web/src/api/bi/dashboard.ts | 57 |
| 176 | GET | `/api/bi/data-analysis/sales-trend` | bi | apps/web/src/api/bi/dataAnalysis.ts | 41 |
| 177 | GET | `/api/bi/data-analysis/region-sales` | bi | apps/web/src/api/bi/dataAnalysis.ts | 47 |
| 178 | GET | `/api/bi/data-analysis/category-pivot` | bi | apps/web/src/api/bi/dataAnalysis.ts | 53 |
| 179 | GET | `/api/bi/data-analysis` | bi | apps/web/src/api/bi/dataAnalysis.ts | 59 |
| 180 | GET | `/api/bi/data-sources` | bi | apps/web/src/api/bi/dataSource.ts | 12 |
| 181 | GET | `/api/bi/data-sources/{id}` | bi | apps/web/src/api/bi/dataSource.ts | 16 |
| 182 | POST | `/api/bi/data-sources` | bi | apps/web/src/api/bi/dataSource.ts | 20 |
| 183 | PUT | `/api/bi/data-sources/{id}` | bi | apps/web/src/api/bi/dataSource.ts | 24 |
| 184 | DELETE | `/api/bi/data-sources/{id}` | bi | apps/web/src/api/bi/dataSource.ts | 28 |
| 185 | POST | `/api/bi/data-sources/{id}/test` | bi | apps/web/src/api/bi/dataSource.ts | 32 |
| 186 | POST | `/api/bi/data-sources/{id}/refresh` | bi | apps/web/src/api/bi/dataSource.ts | 36 |
| 187 | GET | `/api/bi/datasets` | bi | apps/web/src/api/bi/dataset.ts | 12 |
| 188 | GET | `/api/bi/datasets/{id}` | bi | apps/web/src/api/bi/dataset.ts | 16 |
| 189 | POST | `/api/bi/datasets` | bi | apps/web/src/api/bi/dataset.ts | 20 |
| 190 | PUT | `/api/bi/datasets/{id}` | bi | apps/web/src/api/bi/dataset.ts | 24 |
| 191 | DELETE | `/api/bi/datasets/{id}` | bi | apps/web/src/api/bi/dataset.ts | 28 |
| 192 | POST | `/api/bi/datasets/query` | bi | apps/web/src/api/bi/dataset.ts | 45 |
| 193 | POST | `/api/bi/datasets/test-sql` | bi | apps/web/src/api/bi/dataset.ts | 49 |
| 194 | POST | `/api/bi/datasets/{id}/publish` | bi | apps/web/src/api/bi/dataset.ts | 56 |
| 195 | POST | `/api/bi/datasets/{id}/refresh` | bi | apps/web/src/api/bi/dataset.ts | 60 |
| 196 | GET | `/api/bi/datasets/{id}/preview` | bi | apps/web/src/api/bi/dataset.ts | 64 |
| 197 | GET | `/api/bi/permissions/row-level` | bi | apps/web/src/api/bi/permission.ts | 9 |
| 198 | GET | `/api/bi/permissions/row-level/{id}` | bi | apps/web/src/api/bi/permission.ts | 13 |
| 199 | POST | `/api/bi/permissions/row-level` | bi | apps/web/src/api/bi/permission.ts | 17 |
| 200 | PUT | `/api/bi/permissions/row-level/{id}` | bi | apps/web/src/api/bi/permission.ts | 21 |
| 201 | DELETE | `/api/bi/permissions/row-level/{id}` | bi | apps/web/src/api/bi/permission.ts | 25 |
| 202 | POST | `/api/bi/permissions/row-level/{id}/test` | bi | apps/web/src/api/bi/permission.ts | 29 |
| 203 | GET | `/api/bi/permissions/data` | bi | apps/web/src/api/bi/permission.ts | 33 |
| 204 | POST | `/api/bi/permissions/data` | bi | apps/web/src/api/bi/permission.ts | 37 |
| 205 | PUT | `/api/bi/permissions/data/{id}` | bi | apps/web/src/api/bi/permission.ts | 41 |
| 206 | DELETE | `/api/bi/permissions/data/{id}` | bi | apps/web/src/api/bi/permission.ts | 45 |
| 207 | GET | `/api/bi/permissions/check` | bi | apps/web/src/api/bi/permission.ts | 53 |
| 208 | GET | `/api/bi/report` | bi | apps/web/src/api/bi/report.ts | 11 |
| 209 | GET | `/api/bi/report/{id}` | bi | apps/web/src/api/bi/report.ts | 15 |
| 210 | POST | `/api/bi/report` | bi | apps/web/src/api/bi/report.ts | 19 |
| 211 | PUT | `/api/bi/report/{id}` | bi | apps/web/src/api/bi/report.ts | 23 |
| 212 | DELETE | `/api/bi/report/{id}` | bi | apps/web/src/api/bi/report.ts | 27 |
| 213 | POST | `/api/bi/report/{id}/export` | bi | apps/web/src/api/bi/report.ts | 44 |
| 214 | GET | `/api/bi/report/{reportId}/exports` | bi | apps/web/src/api/bi/report.ts | 48 |
| 215 | GET | `/api/bi/report/exports/{jobId}` | bi | apps/web/src/api/bi/report.ts | 52 |
| 216 | GET | `/api/bi/report/exports/{jobId}/download` | bi | apps/web/src/api/bi/report.ts | 56 |
| 217 | GET | `/api/bi/report/{reportId}/schedules` | bi | apps/web/src/api/bi/report.ts | 62 |
| 218 | POST | `/api/bi/report/{reportId}/schedules` | bi | apps/web/src/api/bi/report.ts | 66 |
| 219 | PUT | `/api/bi/report/schedules/{scheduleId}` | bi | apps/web/src/api/bi/report.ts | 70 |
| 220 | DELETE | `/api/bi/report/schedules/{scheduleId}` | bi | apps/web/src/api/bi/report.ts | 74 |
| 221 | POST | `/api/bi/report/schedules/{scheduleId}/run` | bi | apps/web/src/api/bi/report.ts | 78 |
| 222 | POST | `/api/bi/report/schedules/{scheduleId}/toggle` | bi | apps/web/src/api/bi/report.ts | 82 |
| 223 | GET | `/api/bi/sync-records` | bi | apps/web/src/api/bi/sync.ts | 12 |
| 224 | GET | `/api/bi/sync-records/{id}` | bi | apps/web/src/api/bi/sync.ts | 16 |
| 225 | POST | `/api/bi/sync-records` | bi | apps/web/src/api/bi/sync.ts | 20 |
| 226 | PUT | `/api/bi/sync-records/{id}` | bi | apps/web/src/api/bi/sync.ts | 24 |
| 227 | DELETE | `/api/bi/sync-records/{id}` | bi | apps/web/src/api/bi/sync.ts | 28 |
| 228 | POST | `/api/bi/sync-records/{id}/retry` | bi | apps/web/src/api/bi/sync.ts | 32 |
| 229 | GET | `/api/bi/widgets/{widgetId}/drilldown` | bi | apps/web/src/api/bi/visualization.ts | 5 |
| 230 | PUT | `/api/bi/widgets/{widgetId}/drilldown` | bi | apps/web/src/api/bi/visualization.ts | 9 |
| 231 | POST | `/api/bi/widgets/{widgetId}/drilldown/execute` | bi | apps/web/src/api/bi/visualization.ts | 17 |
| 232 | GET | `/api/bi/dashboards/{dashboardId}/links` | bi | apps/web/src/api/bi/visualization.ts | 24 |
| 233 | PUT | `/api/bi/dashboards/{dashboardId}/links` | bi | apps/web/src/api/bi/visualization.ts | 28 |
| 234 | GET | `/api/bi/widgets/{widgetId}/annotations` | bi | apps/web/src/api/bi/visualization.ts | 32 |
| 235 | POST | `/api/bi/widgets/{widgetId}/annotations` | bi | apps/web/src/api/bi/visualization.ts | 44 |
| 236 | DELETE | `/api/bi/annotations/{annotationId}` | bi | apps/web/src/api/bi/visualization.ts | 48 |
| 237 | POST | `/api/bi/widgets/{widgetId}/export` | bi | apps/web/src/api/bi/visualization.ts | 52 |
| 238 | GET | `/api/bi/widgets/{widgetId}/fullscreen` | bi | apps/web/src/api/bi/visualization.ts | 56 |
| 239 | GET | `/api/bi/widget` | bi | apps/web/src/api/bi/widget.ts | 5 |
| 240 | GET | `/api/bi/widget/dashboard/{dashboardId}` | bi | apps/web/src/api/bi/widget.ts | 9 |
| 241 | GET | `/api/bi/widget/{id}` | bi | apps/web/src/api/bi/widget.ts | 13 |
| 242 | POST | `/api/bi/widget` | bi | apps/web/src/api/bi/widget.ts | 17 |
| 243 | PUT | `/api/bi/widget/{id}` | bi | apps/web/src/api/bi/widget.ts | 21 |
| 244 | DELETE | `/api/bi/widget/{id}` | bi | apps/web/src/api/bi/widget.ts | 25 |
| 245 | GET | `/api/bi/widget/{id}/data` | bi | apps/web/src/api/bi/widget.ts | 29 |
| 246 | GET | `/api/erp/consolidation/scopes` | erp | apps/web/src/api/consolidation/index.ts | 38 |
| 247 | GET | `/api/erp/consolidation/scopes/{scopeId}` | erp | apps/web/src/api/consolidation/index.ts | 47 |
| 248 | POST | `/api/erp/consolidation/scopes` | erp | apps/web/src/api/consolidation/index.ts | 56 |
| 249 | PUT | `/api/erp/consolidation/scopes/{scopeId}` | erp | apps/web/src/api/consolidation/index.ts | 66 |
| 250 | DELETE | `/api/erp/consolidation/scopes/{scopeId}` | erp | apps/web/src/api/consolidation/index.ts | 73 |
| 251 | GET | `/api/erp/consolidation/scopes/{scopeId}/companies` | erp | apps/web/src/api/consolidation/index.ts | 82 |
| 252 | POST | `/api/erp/consolidation/scopes/companies` | erp | apps/web/src/api/consolidation/index.ts | 91 |
| 253 | PUT | `/api/erp/consolidation/scopes/companies/{companyId}` | erp | apps/web/src/api/consolidation/index.ts | 101 |
| 254 | DELETE | `/api/erp/consolidation/scopes/companies/{companyId}` | erp | apps/web/src/api/consolidation/index.ts | 108 |
| 255 | GET | `/api/erp/consolidation/elimination-rules` | erp | apps/web/src/api/consolidation/index.ts | 121 |
| 256 | GET | `/api/erp/consolidation/elimination-rules/{ruleId}` | erp | apps/web/src/api/consolidation/index.ts | 130 |
| 257 | POST | `/api/erp/consolidation/elimination-rules` | erp | apps/web/src/api/consolidation/index.ts | 139 |
| 258 | PUT | `/api/erp/consolidation/elimination-rules/{ruleId}` | erp | apps/web/src/api/consolidation/index.ts | 149 |
| 259 | DELETE | `/api/erp/consolidation/elimination-rules/{ruleId}` | erp | apps/web/src/api/consolidation/index.ts | 156 |
| 260 | GET | `/api/erp/consolidation/internal-transactions` | erp | apps/web/src/api/consolidation/index.ts | 165 |
| 261 | GET | `/api/erp/consolidation/internal-transactions/{transactionId}` | erp | apps/web/src/api/consolidation/index.ts | 176 |
| 262 | POST | `/api/erp/consolidation/execute-elimination` | erp | apps/web/src/api/consolidation/index.ts | 192 |
| 263 | GET | `/api/erp/consolidation/reports` | erp | apps/web/src/api/consolidation/index.ts | 205 |
| 264 | GET | `/api/erp/consolidation/reports/{reportId}` | erp | apps/web/src/api/consolidation/index.ts | 214 |
| 265 | POST | `/api/erp/consolidation/reports/generate` | erp | apps/web/src/api/consolidation/index.ts | 223 |
| 266 | GET | `/api/erp/consolidation/reports/{reportId}/lines` | erp | apps/web/src/api/consolidation/index.ts | 232 |
| 267 | POST | `/api/erp/consolidation/reports/{reportId}/approve` | erp | apps/web/src/api/consolidation/index.ts | 241 |
| 268 | POST | `/api/erp/consolidation/reports/{reportId}/publish` | erp | apps/web/src/api/consolidation/index.ts | 250 |
| 269 | DELETE | `/api/erp/consolidation/reports/{reportId}` | erp | apps/web/src/api/consolidation/index.ts | 257 |
| 270 | GET | `/api/erp/consolidation/company-relations` | erp | apps/web/src/api/consolidation/index.ts | 272 |
| 271 | POST | `/api/erp/consolidation/company-relations` | erp | apps/web/src/api/consolidation/index.ts | 283 |
| 272 | PUT | `/api/erp/consolidation/company-relations/{relationId}` | erp | apps/web/src/api/consolidation/index.ts | 293 |
| 273 | DELETE | `/api/erp/consolidation/company-relations/{relationId}` | erp | apps/web/src/api/consolidation/index.ts | 300 |
| 274 | GET | `/api/erp/consolidation/companies/{companyId}/financial-data` | erp | apps/web/src/api/consolidation/index.ts | 310 |
| 275 | GET | `/api/erp/consolidation/company-tree` | erp | apps/web/src/api/consolidation/index.ts | 319 |
| 276 | GET | `/api/crm/billing` | crm | apps/web/src/api/crm/billing.ts | 9 |
| 277 | GET | `/api/crm/billing/{id}` | crm | apps/web/src/api/crm/billing.ts | 13 |
| 278 | POST | `/api/crm/billing` | crm | apps/web/src/api/crm/billing.ts | 17 |
| 279 | PUT | `/api/crm/billing/{id}` | crm | apps/web/src/api/crm/billing.ts | 21 |
| 280 | DELETE | `/api/crm/billing/{id}` | crm | apps/web/src/api/crm/billing.ts | 25 |
| 281 | POST | `/api/crm/billing/{id}/paid` | crm | apps/web/src/api/crm/billing.ts | 29 |
| 282 | POST | `/api/crm/billing/{id}/notify` | crm | apps/web/src/api/crm/billing.ts | 33 |
| 283 | GET | `/api/crm/contacts/{id}` | crm | apps/web/src/api/crm/contact.ts | 44 |
| 284 | PUT | `/api/crm/contacts/{id}` | crm | apps/web/src/api/crm/contact.ts | 48 |
| 285 | DELETE | `/api/crm/contacts/{id}` | crm | apps/web/src/api/crm/contact.ts | 52 |
| 286 | POST | `/api/crm/contacts/batch-delete` | crm | apps/web/src/api/crm/contact.ts | 56 |
| 287 | POST | `/api/crm/customers/batch-delete` | crm | apps/web/src/api/crm/customer.ts | 64 |
| 288 | GET | `/api/crm/customers/{id}/tags` | crm | apps/web/src/api/crm/customer.ts | 68 |
| 289 | POST | `/api/crm/customers/{id}/tags` | crm | apps/web/src/api/crm/customer.ts | 72 |
| 290 | DELETE | `/api/crm/customers/{id}/tags/{tagId}` | crm | apps/web/src/api/crm/customer.ts | 78 |
| 291 | GET | `/api/crm/tags` | crm | apps/web/src/api/crm/customer.ts | 84 |
| 292 | POST | `/api/crm/tags` | crm | apps/web/src/api/crm/customer.ts | 88 |
| 293 | GET | `/api/crm/tags/{id}` | crm | apps/web/src/api/crm/customer.ts | 92 |
| 294 | PUT | `/api/crm/tags/{id}` | crm | apps/web/src/api/crm/customer.ts | 96 |
| 295 | DELETE | `/api/crm/tags/{id}` | crm | apps/web/src/api/crm/customer.ts | 100 |
| 296 | GET | `/api/crm/tags/{id}/customers` | crm | apps/web/src/api/crm/customer.ts | 104 |
| 297 | GET | `/api/crm/dashboard` | crm | apps/web/src/api/crm/dashboard.ts | 16 |
| 298 | GET | `/api/crm/sales-forecast` | crm | apps/web/src/api/crm/forecast.ts | 9 |
| 299 | GET | `/api/crm/sales-forecast/{id}` | crm | apps/web/src/api/crm/forecast.ts | 13 |
| 300 | POST | `/api/crm/sales-forecast` | crm | apps/web/src/api/crm/forecast.ts | 17 |
| 301 | PUT | `/api/crm/sales-forecast/{id}` | crm | apps/web/src/api/crm/forecast.ts | 21 |
| 302 | DELETE | `/api/crm/sales-forecast/{id}` | crm | apps/web/src/api/crm/forecast.ts | 25 |
| 303 | POST | `/api/crm/sales-forecast/generate` | crm | apps/web/src/api/crm/forecast.ts | 29 |
| 304 | GET | `/api/crm/health` | crm | apps/web/src/api/crm/index.ts | 43 |
| 305 | GET | `/api/crm/interactions` | crm | apps/web/src/api/crm/interaction.ts | 14 |
| 306 | POST | `/api/crm/interactions` | crm | apps/web/src/api/crm/interaction.ts | 18 |
| 307 | GET | `/api/crm/interactions/{id}` | crm | apps/web/src/api/crm/interaction.ts | 22 |
| 308 | PUT | `/api/crm/interactions/{id}` | crm | apps/web/src/api/crm/interaction.ts | 26 |
| 309 | DELETE | `/api/crm/interactions/{id}` | crm | apps/web/src/api/crm/interaction.ts | 30 |
| 310 | POST | `/api/crm/interactions/batch-delete` | crm | apps/web/src/api/crm/interaction.ts | 34 |
| 311 | GET | `/api/crm/opportunities/{id}` | crm | apps/web/src/api/crm/opportunity.ts | 36 |
| 312 | PUT | `/api/crm/opportunities/{id}` | crm | apps/web/src/api/crm/opportunity.ts | 40 |
| 313 | DELETE | `/api/crm/opportunities/{id}` | crm | apps/web/src/api/crm/opportunity.ts | 44 |
| 314 | POST | `/api/crm/opportunities/batch-delete` | crm | apps/web/src/api/crm/opportunity.ts | 48 |
| 315 | GET | `/api/crm/opportunities/funnel` | crm | apps/web/src/api/crm/opportunity.ts | 52 |
| 316 | GET | `/api/crm/opportunities/stats` | crm | apps/web/src/api/crm/opportunity.ts | 56 |
| 317 | GET | `/api/crm/opportunities/forecast` | crm | apps/web/src/api/crm/opportunity.ts | 62 |
| 318 | GET | `/api/crm/returns` | crm | apps/web/src/api/crm/returns.ts | 17 |
| 319 | POST | `/api/crm/returns` | crm | apps/web/src/api/crm/returns.ts | 21 |
| 320 | GET | `/api/crm/returns/{id}` | crm | apps/web/src/api/crm/returns.ts | 25 |
| 321 | PUT | `/api/crm/returns/{id}` | crm | apps/web/src/api/crm/returns.ts | 29 |
| 322 | DELETE | `/api/crm/returns/{id}` | crm | apps/web/src/api/crm/returns.ts | 33 |
| 323 | POST | `/api/crm/returns/{id}/approve` | crm | apps/web/src/api/crm/returns.ts | 37 |
| 324 | POST | `/api/crm/returns/{id}/reject` | crm | apps/web/src/api/crm/returns.ts | 41 |
| 325 | POST | `/api/crm/returns/{id}/receive` | crm | apps/web/src/api/crm/returns.ts | 45 |
| 326 | POST | `/api/crm/returns/{id}/complete` | crm | apps/web/src/api/crm/returns.ts | 49 |
| 327 | POST | `/api/crm/returns/{id}/cancel` | crm | apps/web/src/api/crm/returns.ts | 53 |
| 328 | GET | `/api/crm/returns/{id}/items` | crm | apps/web/src/api/crm/returns.ts | 57 |
| 329 | POST | `/api/crm/returns/{id}/items` | crm | apps/web/src/api/crm/returns.ts | 64 |
| 330 | GET | `/api/crm/returns/{id}/finance-status` | crm | apps/web/src/api/crm/returns.ts | 68 |
| 331 | GET | `/api/crm/returns/{id}/inventory-status` | crm | apps/web/src/api/crm/returns.ts | 72 |
| 332 | GET | `/api/crm/customer-scoring` | crm | apps/web/src/api/crm/scoring.ts | 13 |
| 333 | GET | `/api/crm/customer-scoring/{id}` | crm | apps/web/src/api/crm/scoring.ts | 17 |
| 334 | POST | `/api/crm/customer-scoring` | crm | apps/web/src/api/crm/scoring.ts | 21 |
| 335 | PUT | `/api/crm/customer-scoring/{id}` | crm | apps/web/src/api/crm/scoring.ts | 28 |
| 336 | DELETE | `/api/crm/customer-scoring/{id}` | crm | apps/web/src/api/crm/scoring.ts | 32 |
| 337 | POST | `/api/crm/customer-scoring/calculate` | crm | apps/web/src/api/crm/scoring.ts | 36 |
| 338 | GET | `/api/crm/segments` | crm | apps/web/src/api/crm/segmentation.ts | 17 |
| 339 | POST | `/api/crm/segments` | crm | apps/web/src/api/crm/segmentation.ts | 21 |
| 340 | GET | `/api/crm/segments/{id}` | crm | apps/web/src/api/crm/segmentation.ts | 25 |
| 341 | DELETE | `/api/crm/segments/{id}` | crm | apps/web/src/api/crm/segmentation.ts | 29 |
| 342 | GET | `/api/crm/segments/{id}/customers` | crm | apps/web/src/api/crm/segmentation.ts | 36 |
| 343 | GET | `/api/crm/segments/auto` | crm | apps/web/src/api/crm/segmentation.ts | 40 |
| 344 | GET | `/api/crm/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 48 |
| 345 | POST | `/api/crm/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 52 |
| 346 | GET | `/api/crm/recommendations/{id}` | crm | apps/web/src/api/crm/segmentation.ts | 56 |
| 347 | GET | `/api/crm/customers/{customerId}/recommendations` | crm | apps/web/src/api/crm/segmentation.ts | 63 |
| 348 | GET | `/api/crm/customers/{customerId}/finance` | crm | apps/web/src/api/crmFinance/index.ts | 75 |
| 349 | PUT | `/api/crm/customers/{customerId}/finance` | crm | apps/web/src/api/crmFinance/index.ts | 83 |
| 350 | GET | `/api/crm/invoices/{invoiceId}` | crm | apps/web/src/api/crmFinance/index.ts | 109 |
| 351 | POST | `/api/crm/invoices` | crm | apps/web/src/api/crmFinance/index.ts | 115 |
| 352 | PUT | `/api/crm/invoices/{invoiceId}` | crm | apps/web/src/api/crmFinance/index.ts | 121 |
| 353 | DELETE | `/api/crm/invoices/{invoiceId}` | crm | apps/web/src/api/crmFinance/index.ts | 130 |
| 354 | POST | `/api/crm/invoices/{invoiceId}/issue` | crm | apps/web/src/api/crmFinance/index.ts | 136 |
| 355 | POST | `/api/crm/invoices/{invoiceId}/cancel` | crm | apps/web/src/api/crmFinance/index.ts | 144 |
| 356 | POST | `/api/crm/invoices/{invoiceId}/red-flush` | crm | apps/web/src/api/crmFinance/index.ts | 153 |
| 357 | GET | `/api/crm/collections/{recordId}` | crm | apps/web/src/api/crmFinance/index.ts | 178 |
| 358 | POST | `/api/crm/collections` | crm | apps/web/src/api/crmFinance/index.ts | 186 |
| 359 | POST | `/api/crm/collections/{recordId}/confirm` | crm | apps/web/src/api/crmFinance/index.ts | 192 |
| 360 | POST | `/api/crm/collections/batch-confirm` | crm | apps/web/src/api/crmFinance/index.ts | 200 |
| 361 | GET | `/api/crm/reports/receivable-aging` | crm | apps/web/src/api/crmFinance/index.ts | 212 |
| 362 | GET | `/api/crm/reports/receivable-summary` | crm | apps/web/src/api/crmFinance/index.ts | 220 |
| 363 | GET | `/api/crm/reports/overdue-receivables` | crm | apps/web/src/api/crmFinance/index.ts | 234 |
| 364 | GET | `/api/crm/invoices/export` | crm | apps/web/src/api/crmFinance/index.ts | 249 |
| 365 | GET | `/api/crm/collections/export` | crm | apps/web/src/api/crmFinance/index.ts | 263 |
| 366 | GET | `/api/crm/reports/receivable-aging/export` | crm | apps/web/src/api/crmFinance/index.ts | 277 |
| 367 | GET | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 28 |
| 368 | GET | `/api/core/dict/types/{code}` | core | apps/web/src/api/dict/dict.ts | 32 |
| 369 | POST | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 41 |
| 370 | PUT | `/api/core/dict/types/{code}` | core | apps/web/src/api/dict/dict.ts | 48 |
| 371 | DELETE | `/api/core/dict/types/{code}` | core | apps/web/src/api/dict/dict.ts | 52 |
| 372 | GET | `/api/core/dict/types/{typeCode}/items` | core | apps/web/src/api/dict/dict.ts | 56 |
| 373 | GET | `/api/core/dict/types/{typeCode}/items/{itemCode}` | core | apps/web/src/api/dict/dict.ts | 60 |
| 374 | POST | `/api/core/dict/types/{typeCode}/items` | core | apps/web/src/api/dict/dict.ts | 67 |
| 375 | PUT | `/api/core/dict/types/{typeCode}/items/{itemCode}` | core | apps/web/src/api/dict/dict.ts | 75 |
| 376 | DELETE | `/api/core/dict/types/{typeCode}/items/{itemCode}` | core | apps/web/src/api/dict/dict.ts | 79 |
| 377 | GET | `/api/core/dict/types` | core | apps/web/src/api/dict/dict.ts | 83 |
| 378 | GET | `/api/core/doc/documents` | doc | apps/web/src/api/doc/index.ts | 82 |
| 379 | GET | `/api/core/doc/documents/{id}` | doc | apps/web/src/api/doc/index.ts | 86 |
| 380 | POST | `/api/core/file/upload` | file | apps/web/src/api/doc/index.ts | 95 |
| 381 | DELETE | `/api/core/doc/documents/{id}` | doc | apps/web/src/api/doc/index.ts | 107 |
| 382 | GET | `/api/core/doc/folders` | doc | apps/web/src/api/doc/index.ts | 112 |
| 383 | POST | `/api/core/doc/folders` | doc | apps/web/src/api/doc/index.ts | 116 |
| 384 | GET | `/api/core/doc/folders/{id}` | doc | apps/web/src/api/doc/index.ts | 120 |
| 385 | PUT | `/api/core/doc/folders/{id}` | doc | apps/web/src/api/doc/index.ts | 124 |
| 386 | DELETE | `/api/core/doc/folders/{id}` | doc | apps/web/src/api/doc/index.ts | 128 |
| 387 | GET | `/api/core/doc/documents/{fileId}/versions` | doc | apps/web/src/api/doc/index.ts | 132 |
| 388 | GET | `/api/core/doc/documents/{fileId}/versions/{version}` | doc | apps/web/src/api/doc/index.ts | 136 |
| 389 | POST | `/api/core/doc/documents/{fileId}/versions/{version}/restore` | doc | apps/web/src/api/doc/index.ts | 140 |
| 390 | GET | `/api/core/doc/health` | doc | apps/web/src/api/doc/index.ts | 144 |
| 391 | GET | `/api/core/doc/dashboard` | doc | apps/web/src/api/doc/index.ts | 148 |
| 392 | POST | `/api/ehs/incidents/{accidentId}/investigation` | ehs | apps/web/src/api/ehs/accident.ts | 56 |
| 393 | PUT | `/api/ehs/incidents/{accidentId}/investigation` | ehs | apps/web/src/api/ehs/accident.ts | 63 |
| 394 | POST | `/api/ehs/incidents/{accidentId}/investigation/complete` | ehs | apps/web/src/api/ehs/accident.ts | 67 |
| 395 | POST | `/api/ehs/incidents/{accidentId}/treatment` | ehs | apps/web/src/api/ehs/accident.ts | 74 |
| 396 | PUT | `/api/ehs/incidents/{accidentId}/treatment/actions/{actionId}` | ehs | apps/web/src/api/ehs/accident.ts | 82 |
| 397 | POST | `/api/ehs/incidents/{accidentId}/treatment/complete` | ehs | apps/web/src/api/ehs/accident.ts | 89 |
| 398 | POST | `/api/ehs/incidents/{accidentId}/review` | ehs | apps/web/src/api/ehs/accident.ts | 96 |
| 399 | GET | `/api/ehs/environmental-compliance/assessments/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 88 |
| 400 | POST | `/api/ehs/environmental-compliance/assessments` | ehs | apps/web/src/api/ehs/compliance.ts | 94 |
| 401 | PUT | `/api/ehs/environmental-compliance/assessments/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 101 |
| 402 | DELETE | `/api/ehs/environmental-compliance/assessments/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 108 |
| 403 | GET | `/api/ehs/environmental-compliance/events/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 168 |
| 404 | POST | `/api/ehs/environmental-compliance/events` | ehs | apps/web/src/api/ehs/compliance.ts | 174 |
| 405 | PUT | `/api/ehs/environmental-compliance/events/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 181 |
| 406 | DELETE | `/api/ehs/environmental-compliance/events/{id}` | ehs | apps/web/src/api/ehs/compliance.ts | 185 |
| 407 | GET | `/api/ehs/dashboard` | ehs | apps/web/src/api/ehs/dashboard.ts | 16 |
| 408 | GET | `/api/ehs/plans/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 26 |
| 409 | POST | `/api/ehs/plans` | ehs | apps/web/src/api/ehs/emergency.ts | 30 |
| 410 | PUT | `/api/ehs/plans/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 37 |
| 411 | DELETE | `/api/ehs/plans/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 41 |
| 412 | GET | `/api/ehs/drills/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 56 |
| 413 | POST | `/api/ehs/drills` | ehs | apps/web/src/api/ehs/emergency.ts | 60 |
| 414 | PUT | `/api/ehs/drills/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 67 |
| 415 | DELETE | `/api/ehs/drills/{id}` | ehs | apps/web/src/api/ehs/emergency.ts | 71 |
| 416 | GET | `/api/ehs/environment/monitors/{id}` | ehs | apps/web/src/api/ehs/environment.ts | 33 |
| 417 | POST | `/api/ehs/environment/monitors` | ehs | apps/web/src/api/ehs/environment.ts | 39 |
| 418 | PUT | `/api/ehs/environment/monitors/{id}` | ehs | apps/web/src/api/ehs/environment.ts | 46 |
| 419 | DELETE | `/api/ehs/environment/monitors/{id}` | ehs | apps/web/src/api/ehs/environment.ts | 50 |
| 420 | GET | `/api/ehs/environment/records/{id}` | ehs | apps/web/src/api/ehs/environment.ts | 88 |
| 421 | POST | `/api/ehs/hazards/{hazardId}/assessments` | ehs | apps/web/src/api/ehs/hazard.ts | 57 |
| 422 | PUT | `/api/ehs/hazards/{hazardId}/assessments/{assessmentId}` | ehs | apps/web/src/api/ehs/hazard.ts | 65 |
| 423 | POST | `/api/ehs/hazards/{hazardId}/controls` | ehs | apps/web/src/api/ehs/hazard.ts | 81 |
| 424 | PUT | `/api/ehs/hazards/{hazardId}/controls/{measureId}` | ehs | apps/web/src/api/ehs/hazard.ts | 89 |
| 425 | DELETE | `/api/ehs/hazards/{hazardId}/controls/{measureId}` | ehs | apps/web/src/api/ehs/hazard.ts | 93 |
| 426 | PUT | `/api/ehs/hazardous-materials/categories/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 78 |
| 427 | DELETE | `/api/ehs/hazardous-materials/categories/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 85 |
| 428 | GET | `/api/ehs/hazardous-materials/inventory/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 107 |
| 429 | POST | `/api/ehs/hazardous-materials/inventory` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 113 |
| 430 | PUT | `/api/ehs/hazardous-materials/inventory/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 120 |
| 431 | DELETE | `/api/ehs/hazardous-materials/inventory/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 127 |
| 432 | GET | `/api/ehs/hazardous-materials/movements/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 151 |
| 433 | POST | `/api/ehs/hazardous-materials/movements` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 157 |
| 434 | PUT | `/api/ehs/hazardous-materials/movements/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 164 |
| 435 | DELETE | `/api/ehs/hazardous-materials/movements/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 171 |
| 436 | GET | `/api/ehs/hazardous-materials/msds/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 186 |
| 437 | GET | `/api/ehs/hazardous-materials/{materialId}/msds` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 190 |
| 438 | POST | `/api/ehs/hazardous-materials/msds` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 194 |
| 439 | PUT | `/api/ehs/hazardous-materials/msds/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 198 |
| 440 | DELETE | `/api/ehs/hazardous-materials/msds/{id}` | ehs | apps/web/src/api/ehs/hazardousMaterial.ts | 202 |
| 441 | POST | `/api/ehs/incidents/{incidentId}/actions` | ehs | apps/web/src/api/ehs/incident.ts | 54 |
| 442 | PUT | `/api/ehs/incidents/{incidentId}/actions/{actionId}` | ehs | apps/web/src/api/ehs/incident.ts | 62 |
| 443 | POST | `/api/ehs/checks/plans/{planId}/items` | ehs | apps/web/src/api/ehs/inspection.ts | 63 |
| 444 | DELETE | `/api/ehs/checks/plans/{planId}/items/{itemId}` | ehs | apps/web/src/api/ehs/inspection.ts | 67 |
| 445 | GET | `/api/ehs/occupational-diseases/factors/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 43 |
| 446 | POST | `/api/ehs/occupational-diseases/factors` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 49 |
| 447 | PUT | `/api/ehs/occupational-diseases/factors/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 56 |
| 448 | DELETE | `/api/ehs/occupational-diseases/factors/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 60 |
| 449 | GET | `/api/ehs/occupational-diseases/detection-records/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 81 |
| 450 | POST | `/api/ehs/occupational-diseases/detection-records` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 89 |
| 451 | PUT | `/api/ehs/occupational-diseases/detection-records/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 99 |
| 452 | DELETE | `/api/ehs/occupational-diseases/detection-records/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 106 |
| 453 | GET | `/api/ehs/occupational-diseases/cases/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 127 |
| 454 | POST | `/api/ehs/occupational-diseases/cases` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 133 |
| 455 | PUT | `/api/ehs/occupational-diseases/cases/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 140 |
| 456 | DELETE | `/api/ehs/occupational-diseases/cases/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 144 |
| 457 | GET | `/api/ehs/occupational-diseases/protection-measures/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 164 |
| 458 | POST | `/api/ehs/occupational-diseases/protection-measures` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 170 |
| 459 | PUT | `/api/ehs/occupational-diseases/protection-measures/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 180 |
| 460 | DELETE | `/api/ehs/occupational-diseases/protection-measures/{id}` | ehs | apps/web/src/api/ehs/occupationalDisease.ts | 187 |
| 461 | GET | `/api/ehs/occupational-health/records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 43 |
| 462 | POST | `/api/ehs/occupational-health/records` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 49 |
| 463 | PUT | `/api/ehs/occupational-health/records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 56 |
| 464 | DELETE | `/api/ehs/occupational-health/records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 60 |
| 465 | GET | `/api/ehs/occupational-health/check-plans/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 80 |
| 466 | POST | `/api/ehs/occupational-health/check-plans` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 86 |
| 467 | PUT | `/api/ehs/occupational-health/check-plans/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 93 |
| 468 | DELETE | `/api/ehs/occupational-health/check-plans/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 97 |
| 469 | GET | `/api/ehs/occupational-health/check-records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 119 |
| 470 | POST | `/api/ehs/occupational-health/check-records` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 125 |
| 471 | PUT | `/api/ehs/occupational-health/check-records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 132 |
| 472 | DELETE | `/api/ehs/occupational-health/check-records/{id}` | ehs | apps/web/src/api/ehs/occupationalHealth.ts | 136 |
| 473 | POST | `/api/ehs/hazards/{riskId}/assessments` | ehs | apps/web/src/api/ehs/risk.ts | 61 |
| 474 | POST | `/api/ehs/hazards/{riskId}/controls` | ehs | apps/web/src/api/ehs/risk.ts | 74 |
| 475 | PUT | `/api/ehs/hazards/{riskId}/controls/{measureId}` | ehs | apps/web/src/api/ehs/risk.ts | 82 |
| 476 | DELETE | `/api/ehs/hazards/{riskId}/controls/{measureId}` | ehs | apps/web/src/api/ehs/risk.ts | 89 |
| 477 | GET | `/api/ehs/checks/{id}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 24 |
| 478 | POST | `/api/ehs/checks` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 28 |
| 479 | PUT | `/api/ehs/checks/{id}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 35 |
| 480 | DELETE | `/api/ehs/checks/{id}` | ehs | apps/web/src/api/ehs/safetyCheck.ts | 39 |
| 481 | POST | `/api/ehs/issues/{issueId}/rectification` | ehs | apps/web/src/api/ehs/safetyIssue.ts | 52 |
| 482 | PUT | `/api/ehs/issues/{issueId}/rectification` | ehs | apps/web/src/api/ehs/safetyIssue.ts | 59 |
| 483 | POST | `/api/ehs/issues/{issueId}/rectification/submit` | ehs | apps/web/src/api/ehs/safetyIssue.ts | 63 |
| 484 | POST | `/api/ehs/issues/{issueId}/verification` | ehs | apps/web/src/api/ehs/safetyIssue.ts | 70 |
| 485 | POST | `/api/ehs/sync` | ehs | apps/web/src/api/ehs/sync.ts | 43 |
| 486 | POST | `/api/ehs/sync/to-qms` | ehs | apps/web/src/api/ehs/sync.ts | 51 |
| 487 | POST | `/api/ehs/sync/to-lims` | ehs | apps/web/src/api/ehs/sync.ts | 61 |
| 488 | GET | `/api/ehs/sync/configs/{id}` | ehs | apps/web/src/api/ehs/sync.ts | 86 |
| 489 | GET | `/api/communication/notification/email/email-logs` | notification | apps/web/src/api/email/index.ts | 102 |
| 490 | POST | `/api/communication/notification/email/email-logs/{id}/resend` | notification | apps/web/src/api/email/index.ts | 108 |
| 491 | POST | `/api/communication/notification/email/batch-send` | notification | apps/web/src/api/email/index.ts | 116 |
| 492 | GET | `/api/communication/notification/email/stats` | notification | apps/web/src/api/email/index.ts | 128 |
| 493 | GET | `/api/communication/notification/email/email-logs/{id}` | notification | apps/web/src/api/email/index.ts | 132 |
| 494 | DELETE | `/api/communication/notification/email/email-logs/{id}` | notification | apps/web/src/api/email/index.ts | 136 |
| 495 | POST | `/api/communication/notification/email/send` | notification | apps/web/src/api/email/index.ts | 140 |
| 496 | POST | `/api/communication/notification/email/send-with-template` | notification | apps/web/src/api/email/index.ts | 154 |
| 497 | GET | `/api/communication/notification/email/email-templates` | notification | apps/web/src/api/email/index.ts | 167 |
| 498 | GET | `/api/communication/notification/email/email-templates/{id}` | notification | apps/web/src/api/email/index.ts | 173 |
| 499 | POST | `/api/communication/notification/email/email-templates` | notification | apps/web/src/api/email/index.ts | 179 |
| 500 | PUT | `/api/communication/notification/email/email-templates/{id}` | notification | apps/web/src/api/email/index.ts | 191 |
| 501 | DELETE | `/api/communication/notification/email/email-templates/{id}` | notification | apps/web/src/api/email/index.ts | 200 |
| 502 | GET | `/api/erp/announcements${queryString ` | erp | apps/web/src/api/erp/admin/announcement.ts | 18 |
| 503 | GET | `/api/erp/announcements/{id}` | erp | apps/web/src/api/erp/admin/announcement.ts | 22 |
| 504 | POST | `/api/erp/announcements` | erp | apps/web/src/api/erp/admin/announcement.ts | 26 |
| 505 | PUT | `/api/erp/announcements/{id}` | erp | apps/web/src/api/erp/admin/announcement.ts | 30 |
| 506 | DELETE | `/api/erp/announcements/{id}` | erp | apps/web/src/api/erp/admin/announcement.ts | 34 |
| 507 | POST | `/api/erp/announcements/{id}/publish` | erp | apps/web/src/api/erp/admin/announcement.ts | 38 |
| 508 | POST | `/api/erp/announcements/{id}/unpublish` | erp | apps/web/src/api/erp/admin/announcement.ts | 42 |
| 509 | GET | `/api/erp/meeting-rooms${queryString ` | erp | apps/web/src/api/erp/admin/meeting.ts | 15 |
| 510 | GET | `/api/erp/meeting-rooms/{id}/bookings` | erp | apps/web/src/api/erp/admin/meeting.ts | 35 |
| 511 | GET | `/api/erp/meeting-bookings${queryString ` | erp | apps/web/src/api/erp/admin/meeting.ts | 48 |
| 512 | GET | `/api/erp/meeting-bookings/{id}` | erp | apps/web/src/api/erp/admin/meeting.ts | 52 |
| 513 | POST | `/api/erp/meeting-bookings` | erp | apps/web/src/api/erp/admin/meeting.ts | 56 |
| 514 | PUT | `/api/erp/meeting-bookings/{id}` | erp | apps/web/src/api/erp/admin/meeting.ts | 60 |
| 515 | DELETE | `/api/erp/meeting-bookings/{id}` | erp | apps/web/src/api/erp/admin/meeting.ts | 64 |
| 516 | GET | `/api/erp/office-supplies${queryString ` | erp | apps/web/src/api/erp/admin/officeSupplies.ts | 17 |
| 517 | GET | `/api/erp/office-supplies/{id}` | erp | apps/web/src/api/erp/admin/officeSupplies.ts | 21 |
| 518 | POST | `/api/erp/office-supplies` | erp | apps/web/src/api/erp/admin/officeSupplies.ts | 25 |
| 519 | PUT | `/api/erp/office-supplies/{id}` | erp | apps/web/src/api/erp/admin/officeSupplies.ts | 29 |
| 520 | DELETE | `/api/erp/office-supplies/{id}` | erp | apps/web/src/api/erp/admin/officeSupplies.ts | 33 |
| 521 | GET | `/api/erp/vehicles${queryString ` | erp | apps/web/src/api/erp/admin/vehicle.ts | 17 |
| 522 | GET | `/api/erp/vehicles/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 21 |
| 523 | POST | `/api/erp/vehicles` | erp | apps/web/src/api/erp/admin/vehicle.ts | 25 |
| 524 | PUT | `/api/erp/vehicles/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 29 |
| 525 | DELETE | `/api/erp/vehicles/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 33 |
| 526 | GET | `/api/erp/vehicles/{id}/requests` | erp | apps/web/src/api/erp/admin/vehicle.ts | 37 |
| 527 | GET | `/api/erp/vehicle-requests${queryString ` | erp | apps/web/src/api/erp/admin/vehicle.ts | 50 |
| 528 | GET | `/api/erp/vehicle-requests/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 54 |
| 529 | POST | `/api/erp/vehicle-requests` | erp | apps/web/src/api/erp/admin/vehicle.ts | 58 |
| 530 | PUT | `/api/erp/vehicle-requests/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 62 |
| 531 | DELETE | `/api/erp/vehicle-requests/{id}` | erp | apps/web/src/api/erp/admin/vehicle.ts | 66 |
| 532 | GET | `/api/erp/audit-logs` | erp | apps/web/src/api/erp/audit.ts | 41 |
| 533 | GET | `/api/erp/audit-logs/{id}` | erp | apps/web/src/api/erp/audit.ts | 45 |
| 534 | GET | `/api/erp/customers${queryString ` | erp | apps/web/src/api/erp/core/customer.ts | 28 |
| 535 | GET | `/api/erp/inventory${queryString ` | erp | apps/web/src/api/erp/core/inventory.ts | 26 |
| 536 | GET | `/api/erp/inventory/low-stock` | erp | apps/web/src/api/erp/core/inventory.ts | 46 |
| 537 | GET | `/api/erp/materials${queryString ` | erp | apps/web/src/api/erp/core/material.ts | 27 |
| 538 | GET | `/api/erp/materials/{id}` | erp | apps/web/src/api/erp/core/material.ts | 31 |
| 539 | PUT | `/api/erp/materials/{id}` | erp | apps/web/src/api/erp/core/material.ts | 39 |
| 540 | DELETE | `/api/erp/materials/{id}` | erp | apps/web/src/api/erp/core/material.ts | 43 |
| 541 | GET | `/api/erp/purchase-orders${queryString ` | erp | apps/web/src/api/erp/core/purchaseOrder.ts | 26 |
| 542 | PUT | `/api/erp/purchase-orders/{id}/cancel` | erp | apps/web/src/api/erp/core/purchaseOrder.ts | 50 |
| 543 | GET | `/api/erp/sales-orders${queryString ` | erp | apps/web/src/api/erp/core/salesOrder.ts | 26 |
| 544 | PUT | `/api/erp/sales-orders/{id}/approve` | erp | apps/web/src/api/erp/core/salesOrder.ts | 46 |
| 545 | PUT | `/api/erp/sales-orders/{id}/ship` | erp | apps/web/src/api/erp/core/salesOrder.ts | 50 |
| 546 | PUT | `/api/erp/sales-orders/{id}/complete` | erp | apps/web/src/api/erp/core/salesOrder.ts | 54 |
| 547 | PUT | `/api/erp/sales-orders/{id}/cancel` | erp | apps/web/src/api/erp/core/salesOrder.ts | 58 |
| 548 | GET | `/api/erp/suppliers${queryString ` | erp | apps/web/src/api/erp/core/supplier.ts | 27 |
| 549 | GET | `/api/erp/db/tables` | erp | apps/web/src/api/erp/database.ts | 60 |
| 550 | GET | `/api/erp/db/tables/{tableName}` | erp | apps/web/src/api/erp/database.ts | 64 |
| 551 | GET | `/api/erp/db/changes` | erp | apps/web/src/api/erp/database.ts | 68 |
| 552 | GET | `/api/erp/accounting-subjects${queryString ` | erp | apps/web/src/api/erp/finance/accounting.ts | 21 |
| 553 | GET | `/api/erp/accounting-subjects/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 25 |
| 554 | POST | `/api/erp/accounting-subjects` | erp | apps/web/src/api/erp/finance/accounting.ts | 29 |
| 555 | PUT | `/api/erp/accounting-subjects/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 36 |
| 556 | DELETE | `/api/erp/accounting-subjects/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 40 |
| 557 | GET | `/api/erp/finance/accounts/opening-balances${queryString ` | erp | apps/web/src/api/erp/finance/accounting.ts | 56 |
| 558 | GET | `/api/erp/finance/accounts/opening-balances/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 62 |
| 559 | POST | `/api/erp/finance/accounts/opening-balances` | erp | apps/web/src/api/erp/finance/accounting.ts | 66 |
| 560 | PUT | `/api/erp/finance/accounts/opening-balances/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 70 |
| 561 | DELETE | `/api/erp/finance/accounts/opening-balances/{id}` | erp | apps/web/src/api/erp/finance/accounting.ts | 74 |
| 562 | POST | `/api/erp/finance/accounts/opening-balances/batch` | erp | apps/web/src/api/erp/finance/accounting.ts | 80 |
| 563 | POST | `/api/erp/finance/accounts/opening-balances/carry-forward` | erp | apps/web/src/api/erp/finance/accounting.ts | 84 |
| 564 | GET | `/api/erp/assets${queryString ` | erp | apps/web/src/api/erp/finance/asset.ts | 22 |
| 565 | GET | `/api/erp/fixed-assets${queryString ` | erp | apps/web/src/api/erp/finance/asset.ts | 54 |
| 566 | GET | `/api/erp/fixed-assets/{id}` | erp | apps/web/src/api/erp/finance/asset.ts | 58 |
| 567 | POST | `/api/erp/fixed-assets` | erp | apps/web/src/api/erp/finance/asset.ts | 62 |
| 568 | PUT | `/api/erp/fixed-assets/{id}` | erp | apps/web/src/api/erp/finance/asset.ts | 66 |
| 569 | DELETE | `/api/erp/fixed-assets/{id}` | erp | apps/web/src/api/erp/finance/asset.ts | 70 |
| 570 | POST | `/api/erp/fixed-assets/depreciate` | erp | apps/web/src/api/erp/finance/asset.ts | 74 |
| 571 | GET | `/api/erp/asset-categories/{id}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 51 |
| 572 | POST | `/api/erp/asset-categories` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 55 |
| 573 | PUT | `/api/erp/asset-categories/{id}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 62 |
| 574 | DELETE | `/api/erp/asset-categories/{id}` | erp | apps/web/src/api/erp/finance/assetCategory.ts | 66 |
| 575 | GET | `/api/erp/bank-accounts${queryString ` | erp | apps/web/src/api/erp/finance/bank.ts | 23 |
| 576 | GET | `/api/erp/bank-accounts/{id}` | erp | apps/web/src/api/erp/finance/bank.ts | 27 |
| 577 | POST | `/api/erp/bank-accounts` | erp | apps/web/src/api/erp/finance/bank.ts | 31 |
| 578 | PUT | `/api/erp/bank-accounts/{id}` | erp | apps/web/src/api/erp/finance/bank.ts | 35 |
| 579 | DELETE | `/api/erp/bank-accounts/{id}` | erp | apps/web/src/api/erp/finance/bank.ts | 39 |
| 580 | GET | `/api/erp/bank-transactions${queryString ` | erp | apps/web/src/api/erp/finance/bank.ts | 58 |
| 581 | GET | `/api/erp/bank-transactions/{id}` | erp | apps/web/src/api/erp/finance/bank.ts | 62 |
| 582 | POST | `/api/erp/bank-transactions` | erp | apps/web/src/api/erp/finance/bank.ts | 66 |
| 583 | DELETE | `/api/erp/bank-transactions/{id}` | erp | apps/web/src/api/erp/finance/bank.ts | 70 |
| 584 | GET | `/api/erp/budgets${queryString ` | erp | apps/web/src/api/erp/finance/budget.ts | 15 |
| 585 | GET | `/api/erp/budgets/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 19 |
| 586 | POST | `/api/erp/budgets` | erp | apps/web/src/api/erp/finance/budget.ts | 23 |
| 587 | PUT | `/api/erp/budgets/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 27 |
| 588 | DELETE | `/api/erp/budgets/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 31 |
| 589 | GET | `/api/erp/expenses${queryString ` | erp | apps/web/src/api/erp/finance/budget.ts | 44 |
| 590 | GET | `/api/erp/expenses/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 48 |
| 591 | POST | `/api/erp/expenses` | erp | apps/web/src/api/erp/finance/budget.ts | 52 |
| 592 | PUT | `/api/erp/expenses/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 56 |
| 593 | DELETE | `/api/erp/expenses/{id}` | erp | apps/web/src/api/erp/finance/budget.ts | 60 |
| 594 | GET | `/api/erp/receivables${queryString ` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 15 |
| 595 | GET | `/api/erp/receivables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 19 |
| 596 | POST | `/api/erp/receivables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 23 |
| 597 | PUT | `/api/erp/receivables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 27 |
| 598 | DELETE | `/api/erp/receivables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 31 |
| 599 | GET | `/api/erp/payables${queryString ` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 44 |
| 600 | GET | `/api/erp/payables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 48 |
| 601 | POST | `/api/erp/payables` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 52 |
| 602 | PUT | `/api/erp/payables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 56 |
| 603 | DELETE | `/api/erp/payables/{id}` | erp | apps/web/src/api/erp/finance/receivablePayable.ts | 60 |
| 604 | GET | `/api/erp/reports/balance-sheet${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 23 |
| 605 | GET | `/api/erp/reports/income-statement${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 30 |
| 606 | GET | `/api/erp/reports/cash-flow${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 37 |
| 607 | GET | `/api/erp/reports/business-overview${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 44 |
| 608 | GET | `/api/erp/reports/project-summary${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 53 |
| 609 | GET | `/api/erp/reports/monthly-trend` | erp | apps/web/src/api/erp/finance/report.ts | 57 |
| 610 | GET | `/api/erp/reports/department-summary${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 66 |
| 611 | GET | `/api/erp/reports/aging-analysis` | erp | apps/web/src/api/erp/finance/report.ts | 70 |
| 612 | GET | `/api/erp/reports/voucher-statistics${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 77 |
| 613 | GET | `/api/erp/reports/cash-flow-analysis${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 84 |
| 614 | GET | `/api/erp/reports/expense-analysis${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 91 |
| 615 | GET | `/api/erp/reports/profit-analysis${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 98 |
| 616 | GET | `/api/erp/reports/financial-overview${queryString ` | erp | apps/web/src/api/erp/finance/report.ts | 105 |
| 617 | GET | `/api/erp/vouchers${queryString ` | erp | apps/web/src/api/erp/finance/voucher.ts | 24 |
| 618 | GET | `/api/erp/vouchers/{id}` | erp | apps/web/src/api/erp/finance/voucher.ts | 28 |
| 619 | GET | `/api/erp/vouchers/{id}/items` | erp | apps/web/src/api/erp/finance/voucher.ts | 32 |
| 620 | POST | `/api/erp/vouchers` | erp | apps/web/src/api/erp/finance/voucher.ts | 36 |
| 621 | PUT | `/api/erp/vouchers/{id}` | erp | apps/web/src/api/erp/finance/voucher.ts | 43 |
| 622 | DELETE | `/api/erp/vouchers/{id}` | erp | apps/web/src/api/erp/finance/voucher.ts | 47 |
| 623 | POST | `/api/erp/vouchers/import/u8` | erp | apps/web/src/api/erp/finance/voucher.ts | 55 |
| 624 | GET | `/api/erp/health` | erp | apps/web/src/api/erp/index.ts | 63 |
| 625 | GET | `/api/erp/dashboard` | erp | apps/web/src/api/erp/index.ts | 67 |
| 626 | POST | `/api/erp/master-data/sync/jobs` | erp | apps/web/src/api/erp/masterData.ts | 118 |
| 627 | GET | `/api/erp/master-data/sync/jobs/{id}` | erp | apps/web/src/api/erp/masterData.ts | 122 |
| 628 | POST | `/api/erp/master-data/sync/jobs/{id}/retry` | erp | apps/web/src/api/erp/masterData.ts | 132 |
| 629 | POST | `/api/erp/master-data/sync/jobs/{id}/cancel` | erp | apps/web/src/api/erp/masterData.ts | 136 |
| 630 | POST | `/api/erp/master-data/sync/jobs/{id}/compensate` | erp | apps/web/src/api/erp/masterData.ts | 140 |
| 631 | GET | `/api/erp/master-data/sync/stats` | erp | apps/web/src/api/erp/masterData.ts | 146 |
| 632 | GET | `/api/erp/master-data/sync/dead-letters` | erp | apps/web/src/api/erp/masterData.ts | 152 |
| 633 | POST | `/api/erp/master-data/sync/dead-letters/{id}/replay` | erp | apps/web/src/api/erp/masterData.ts | 156 |
| 634 | POST | `/api/erp/master-data/sync/dead-letters/batch-replay` | erp | apps/web/src/api/erp/masterData.ts | 160 |
| 635 | DELETE | `/api/erp/master-data/sync/dead-letters/{id}` | erp | apps/web/src/api/erp/masterData.ts | 164 |
| 636 | POST | `/api/erp/master-data/quality/tickets` | erp | apps/web/src/api/erp/masterData.ts | 427 |
| 637 | GET | `/api/erp/master-data/quality/tickets` | erp | apps/web/src/api/erp/masterData.ts | 433 |
| 638 | GET | `/api/erp/master-data/quality/tickets/{id}` | erp | apps/web/src/api/erp/masterData.ts | 437 |
| 639 | GET | `/api/erp/master-data/quality/tickets/{id}/history` | erp | apps/web/src/api/erp/masterData.ts | 441 |
| 640 | POST | `/api/erp/master-data/quality/tickets/{id}/assign` | erp | apps/web/src/api/erp/masterData.ts | 448 |
| 641 | POST | `/api/erp/master-data/quality/tickets/{id}/start` | erp | apps/web/src/api/erp/masterData.ts | 455 |
| 642 | POST | `/api/erp/master-data/quality/tickets/{id}/submit` | erp | apps/web/src/api/erp/masterData.ts | 462 |
| 643 | POST | `/api/erp/master-data/quality/tickets/{id}/verify` | erp | apps/web/src/api/erp/masterData.ts | 469 |
| 644 | POST | `/api/erp/master-data/quality/tickets/{id}/close` | erp | apps/web/src/api/erp/masterData.ts | 476 |
| 645 | POST | `/api/erp/master-data/quality/tickets/{id}/reject` | erp | apps/web/src/api/erp/masterData.ts | 483 |
| 646 | POST | `/api/erp/master-data/quality/tickets/{id}/escalate` | erp | apps/web/src/api/erp/masterData.ts | 490 |
| 647 | GET | `/api/erp/master-data/quality/loop-stats` | erp | apps/web/src/api/erp/masterData.ts | 496 |
| 648 | POST | `/api/erp/master-data/quality/repair-workflows` | erp | apps/web/src/api/erp/masterData.ts | 506 |
| 649 | GET | `/api/erp/master-data/quality/repair-workflows` | erp | apps/web/src/api/erp/masterData.ts | 512 |
| 650 | GET | `/api/erp/master-data/quality/repair-workflows/{id}` | erp | apps/web/src/api/erp/masterData.ts | 518 |
| 651 | POST | `/api/erp/master-data/quality/repair-workflows/{id}/execute` | erp | apps/web/src/api/erp/masterData.ts | 522 |
| 652 | POST | `/api/erp/master-data/quality/repair-workflows/{id}/approve` | erp | apps/web/src/api/erp/masterData.ts | 531 |
| 653 | POST | `/api/erp/master-data/quality/repair-workflows/{id}/verify` | erp | apps/web/src/api/erp/masterData.ts | 538 |
| 654 | POST | `/api/erp/master-data/quality/repair-workflows/{workflowId}/steps/{stepIndex}/execute` | erp | apps/web/src/api/erp/masterData.ts | 542 |
| 655 | POST | `/api/erp/master-data/domains` | erp | apps/web/src/api/erp/masterData.ts | 554 |
| 656 | GET | `/api/erp/master-data/domains` | erp | apps/web/src/api/erp/masterData.ts | 558 |
| 657 | GET | `/api/erp/master-data/domains/{id}` | erp | apps/web/src/api/erp/masterData.ts | 562 |
| 658 | PUT | `/api/erp/master-data/domains/{id}` | erp | apps/web/src/api/erp/masterData.ts | 569 |
| 659 | GET | `/api/erp/master-data/ownership-matrix/{entityType}` | erp | apps/web/src/api/erp/masterData.ts | 575 |
| 660 | PUT | `/api/erp/master-data/ownership-matrix/{entityType}` | erp | apps/web/src/api/erp/masterData.ts | 582 |
| 661 | GET | `/api/erp/master-data/entities/{entityType}/owner` | erp | apps/web/src/api/erp/masterData.ts | 591 |
| 662 | GET | `/api/erp/master-data/graph` | erp | apps/web/src/api/erp/masterData.ts | 780 |
| 663 | GET | `/api/erp/master-data/graph/nodes/{nodeId}` | erp | apps/web/src/api/erp/masterData.ts | 784 |
| 664 | GET | `/api/erp/master-data/graph/nodes/{nodeId}/neighbors` | erp | apps/web/src/api/erp/masterData.ts | 791 |
| 665 | GET | `/api/erp/master-data/graph/shortest-path` | erp | apps/web/src/api/erp/masterData.ts | 797 |
| 666 | GET | `/api/erp/master-data/graph/nodes/{nodeId}/multi-hop` | erp | apps/web/src/api/erp/masterData.ts | 806 |
| 667 | GET | `/api/erp/master-data/graph/stats` | erp | apps/web/src/api/erp/masterData.ts | 812 |
| 668 | GET | `/api/erp/master-data/knowledge/concepts/{conceptId}` | erp | apps/web/src/api/erp/masterData.ts | 828 |
| 669 | GET | `/api/erp/master-data/knowledge/inference-rules` | erp | apps/web/src/api/erp/masterData.ts | 840 |
| 670 | POST | `/api/erp/master-data/knowledge/inference` | erp | apps/web/src/api/erp/masterData.ts | 844 |
| 671 | GET | `/api/erp/master-data/recommendations/similar` | erp | apps/web/src/api/erp/masterData.ts | 854 |
| 672 | GET | `/api/erp/master-data/recommendations/associations` | erp | apps/web/src/api/erp/masterData.ts | 860 |
| 673 | GET | `/api/erp/master-data/recommendations/completions` | erp | apps/web/src/api/erp/masterData.ts | 869 |
| 674 | POST | `/api/erp/master-data/sync/v2/jobs` | erp | apps/web/src/api/erp/masterData.ts | 1088 |
| 675 | GET | `/api/erp/master-data/sync/v2/jobs/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1092 |
| 676 | POST | `/api/erp/master-data/sync/v2/dead-letters/{id}/retry` | erp | apps/web/src/api/erp/masterData.ts | 1102 |
| 677 | POST | `/api/erp/master-data/sync/v2/dead-letters/batch-retry` | erp | apps/web/src/api/erp/masterData.ts | 1108 |
| 678 | GET | `/api/erp/master-data/sync/v2/stats` | erp | apps/web/src/api/erp/masterData.ts | 1112 |
| 679 | POST | `/api/erp/master-data/services/register` | erp | apps/web/src/api/erp/masterData.ts | 1145 |
| 680 | POST | `/api/erp/master-data/services/{serviceId}/deregister` | erp | apps/web/src/api/erp/masterData.ts | 1151 |
| 681 | POST | `/api/erp/master-data/services/{serviceId}/heartbeat` | erp | apps/web/src/api/erp/masterData.ts | 1155 |
| 682 | GET | `/api/erp/master-data/services` | erp | apps/web/src/api/erp/masterData.ts | 1159 |
| 683 | GET | `/api/erp/master-data/services/{serviceId}/health` | erp | apps/web/src/api/erp/masterData.ts | 1163 |
| 684 | POST | `/api/erp/master-data/gateway/route` | erp | apps/web/src/api/erp/masterData.ts | 1213 |
| 685 | POST | `/api/erp/master-data/gateway/batch` | erp | apps/web/src/api/erp/masterData.ts | 1217 |
| 686 | GET | `/api/erp/master-data/gateway/stats` | erp | apps/web/src/api/erp/masterData.ts | 1225 |
| 687 | POST | `/api/erp/master-data/quality-ai/score/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1313 |
| 688 | POST | `/api/erp/master-data/quality-ai/batch-score` | erp | apps/web/src/api/erp/masterData.ts | 1317 |
| 689 | POST | `/api/erp/master-data/quality-ai/predict/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1333 |
| 690 | GET | `/api/erp/master-data/quality-ai/stats` | erp | apps/web/src/api/erp/masterData.ts | 1341 |
| 691 | POST | `/api/erp/master-data/matching/find-matches/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1414 |
| 692 | GET | `/api/erp/master-data/matching/duplicate-groups` | erp | apps/web/src/api/erp/masterData.ts | 1426 |
| 693 | POST | `/api/erp/master-data/matching/suggest-merge` | erp | apps/web/src/api/erp/masterData.ts | 1432 |
| 694 | POST | `/api/erp/master-data/classification/classify/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1523 |
| 695 | POST | `/api/erp/master-data/classification/batch-classify` | erp | apps/web/src/api/erp/masterData.ts | 1527 |
| 696 | GET | `/api/erp/master-data/classification/suggest-tags/{id}` | erp | apps/web/src/api/erp/masterData.ts | 1534 |
| 697 | GET | `/api/erp/master-data/classification/categories` | erp | apps/web/src/api/erp/masterData.ts | 1538 |
| 698 | POST | `/api/erp/master-data/classification/learn-rule` | erp | apps/web/src/api/erp/masterData.ts | 1542 |
| 699 | GET | `/api/erp/master-data/classification/stats` | erp | apps/web/src/api/erp/masterData.ts | 1546 |
| 700 | GET | `/api/integration/external-erp/connections` | integration | apps/web/src/api/external-erp/connection.ts | 12 |
| 701 | GET | `/api/integration/external-erp/connections/{id}` | integration | apps/web/src/api/external-erp/connection.ts | 16 |
| 702 | POST | `/api/integration/external-erp/connections` | integration | apps/web/src/api/external-erp/connection.ts | 27 |
| 703 | PUT | `/api/integration/external-erp/connections/{id}` | integration | apps/web/src/api/external-erp/connection.ts | 32 |
| 704 | DELETE | `/api/integration/external-erp/connections/{id}` | integration | apps/web/src/api/external-erp/connection.ts | 34 |
| 705 | PUT | `/api/integration/external-erp/connections/{id}/toggle` | integration | apps/web/src/api/external-erp/connection.ts | 37 |
| 706 | POST | `/api/integration/external-erp/connections/test` | integration | apps/web/src/api/external-erp/connection.ts | 42 |
| 707 | POST | `/api/integration/external-erp/connections/{id}/sync-status` | integration | apps/web/src/api/external-erp/connection.ts | 45 |
| 708 | GET | `/api/integration/external-erp/connections/{configId}/company-mappings` | integration | apps/web/src/api/external-erp/connection.ts | 48 |
| 709 | POST | `/api/integration/external-erp/connections/{configId}/company-mappings` | integration | apps/web/src/api/external-erp/connection.ts | 51 |
| 710 | PUT | `/api/integration/external-erp/connections/{configId}/company-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/connection.ts | 54 |
| 711 | DELETE | `/api/integration/external-erp/connections/{configId}/company-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/connection.ts | 60 |
| 712 | GET | `/api/integration/external-erp/connections/{configId}/account-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 19 |
| 713 | POST | `/api/integration/external-erp/connections/{configId}/account-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 22 |
| 714 | PUT | `/api/integration/external-erp/connections/{configId}/account-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 27 |
| 715 | DELETE | `/api/integration/external-erp/connections/{configId}/account-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 33 |
| 716 | POST | `/api/integration/external-erp/connections/{configId}/account-mappings/auto-match` | integration | apps/web/src/api/external-erp/mapping.ts | 38 |
| 717 | GET | `/api/integration/external-erp/connections/{configId}/customer-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 50 |
| 718 | POST | `/api/integration/external-erp/connections/{configId}/customer-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 55 |
| 719 | PUT | `/api/integration/external-erp/connections/{configId}/customer-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 64 |
| 720 | DELETE | `/api/integration/external-erp/connections/{configId}/customer-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 70 |
| 721 | GET | `/api/integration/external-erp/connections/{configId}/supplier-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 81 |
| 722 | POST | `/api/integration/external-erp/connections/{configId}/supplier-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 86 |
| 723 | PUT | `/api/integration/external-erp/connections/{configId}/supplier-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 95 |
| 724 | DELETE | `/api/integration/external-erp/connections/{configId}/supplier-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 101 |
| 725 | GET | `/api/integration/external-erp/connections/{configId}/project-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 112 |
| 726 | POST | `/api/integration/external-erp/connections/{configId}/project-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 115 |
| 727 | PUT | `/api/integration/external-erp/connections/{configId}/project-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 120 |
| 728 | DELETE | `/api/integration/external-erp/connections/{configId}/project-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 126 |
| 729 | GET | `/api/integration/external-erp/connections/{configId}/department-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 137 |
| 730 | POST | `/api/integration/external-erp/connections/{configId}/department-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 142 |
| 731 | PUT | `/api/integration/external-erp/connections/{configId}/department-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 151 |
| 732 | DELETE | `/api/integration/external-erp/connections/{configId}/department-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 157 |
| 733 | GET | `/api/integration/external-erp/connections/{configId}/employee-mappings` | integration | apps/web/src/api/external-erp/mapping.ts | 168 |
| 734 | POST | `/api/integration/external-erp/connections/{configId}/employee-mappings/batch` | integration | apps/web/src/api/external-erp/mapping.ts | 173 |
| 735 | PUT | `/api/integration/external-erp/connections/{configId}/employee-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 182 |
| 736 | DELETE | `/api/integration/external-erp/connections/{configId}/employee-mappings/{mappingId}` | integration | apps/web/src/api/external-erp/mapping.ts | 188 |
| 737 | GET | `/api/integration/external-erp/connections/{configId}/preview/accounts` | integration | apps/web/src/api/external-erp/preview.ts | 12 |
| 738 | GET | `/api/integration/external-erp/connections/{configId}/preview/customers` | integration | apps/web/src/api/external-erp/preview.ts | 22 |
| 739 | GET | `/api/integration/external-erp/connections/{configId}/preview/suppliers` | integration | apps/web/src/api/external-erp/preview.ts | 34 |
| 740 | GET | `/api/integration/external-erp/connections/{configId}/preview/vouchers` | integration | apps/web/src/api/external-erp/preview.ts | 47 |
| 741 | POST | `/api/integration/external-erp/sync/accounts` | integration | apps/web/src/api/external-erp/sync.ts | 12 |
| 742 | POST | `/api/integration/external-erp/sync/customers` | integration | apps/web/src/api/external-erp/sync.ts | 15 |
| 743 | POST | `/api/integration/external-erp/sync/suppliers` | integration | apps/web/src/api/external-erp/sync.ts | 18 |
| 744 | POST | `/api/integration/external-erp/sync/projects` | integration | apps/web/src/api/external-erp/sync.ts | 25 |
| 745 | POST | `/api/integration/external-erp/sync/departments` | integration | apps/web/src/api/external-erp/sync.ts | 32 |
| 746 | POST | `/api/integration/external-erp/sync/employees` | integration | apps/web/src/api/external-erp/sync.ts | 39 |
| 747 | POST | `/api/integration/external-erp/sync/vouchers` | integration | apps/web/src/api/external-erp/sync.ts | 42 |
| 748 | POST | `/api/integration/external-erp/sync/invoices` | integration | apps/web/src/api/external-erp/sync.ts | 45 |
| 749 | POST | `/api/integration/external-erp/sync/full` | integration | apps/web/src/api/external-erp/sync.ts | 48 |
| 750 | POST | `/api/integration/external-erp/sync/{logId}/cancel` | integration | apps/web/src/api/external-erp/sync.ts | 51 |
| 751 | GET | `/api/integration/external-erp/sync-logs` | integration | apps/web/src/api/external-erp/syncLogs.ts | 13 |
| 752 | GET | `/api/integration/external-erp/sync-logs/{logId}` | integration | apps/web/src/api/external-erp/syncLogs.ts | 17 |
| 753 | GET | `/api/integration/external-erp/connections/{configId}/sync-statistics` | integration | apps/web/src/api/external-erp/syncLogs.ts | 26 |
| 754 | GET | `/api/core/feedbacks` | core | apps/web/src/api/feedback/index.ts | 15 |
| 755 | GET | `/api/core/feedbacks/{id}` | core | apps/web/src/api/feedback/index.ts | 19 |
| 756 | POST | `/api/core/feedbacks` | core | apps/web/src/api/feedback/index.ts | 23 |
| 757 | PUT | `/api/core/feedbacks/{id}` | core | apps/web/src/api/feedback/index.ts | 30 |
| 758 | DELETE | `/api/core/feedbacks/{id}` | core | apps/web/src/api/feedback/index.ts | 34 |
| 759 | DELETE | `/api/core/feedbacks/batch` | core | apps/web/src/api/feedback/index.ts | 38 |
| 760 | POST | `/api/core/file/upload` | file | apps/web/src/api/file/index.ts | 103 |
| 761 | GET | `/api/core/file/files/{id}` | file | apps/web/src/api/file/index.ts | 126 |
| 762 | DELETE | `/api/core/file/files/{id}` | file | apps/web/src/api/file/index.ts | 135 |
| 763 | POST | `/api/core/file/files/{id}/share` | file | apps/web/src/api/file/index.ts | 139 |
| 764 | GET | `/api/core/file/files/{id}/permissions` | file | apps/web/src/api/file/index.ts | 143 |
| 765 | DELETE | `/api/core/file/files/{id}/permissions/revoke/{principal_type}/{principal_id}/{permission}` | file | apps/web/src/api/file/index.ts | 152 |
| 766 | GET | `/api/core/file/files/shared` | file | apps/web/src/api/file/index.ts | 158 |
| 767 | GET | `/api/core/file/files/stats` | file | apps/web/src/api/file/index.ts | 162 |
| 768 | POST | `/api/core/file/files/export` | file | apps/web/src/api/file/index.ts | 166 |
| 769 | GET | `/api/core/file/health` | file | apps/web/src/api/file/index.ts | 170 |
| 770 | GET | `/api/finance/accounts/tree` | finance | apps/web/src/api/finance/account.ts | 44 |
| 771 | GET | `/api/finance/accounts/{id}` | finance | apps/web/src/api/finance/account.ts | 51 |
| 772 | PUT | `/api/finance/accounts/{id}` | finance | apps/web/src/api/finance/account.ts | 68 |
| 773 | DELETE | `/api/finance/accounts/{id}` | finance | apps/web/src/api/finance/account.ts | 72 |
| 774 | POST | `/api/finance/accounts/{parentId}/children-batch` | finance | apps/web/src/api/finance/account.ts | 79 |
| 775 | GET | `/api/finance/accounts/balances` | finance | apps/web/src/api/finance/account.ts | 89 |
| 776 | GET | `/api/finance/accounts/opening-balances` | finance | apps/web/src/api/finance/account.ts | 101 |
| 777 | POST | `/api/finance/accounts/{accountId}/opening-balance` | finance | apps/web/src/api/finance/account.ts | 110 |
| 778 | POST | `/api/finance/accounts/opening-balances/carry-forward` | finance | apps/web/src/api/finance/account.ts | 118 |
| 779 | GET | `/api/finance/approval-configs` | finance | apps/web/src/api/finance/approvalConfig.ts | 50 |
| 780 | GET | `/api/finance/approval-configs/{id}` | finance | apps/web/src/api/finance/approvalConfig.ts | 54 |
| 781 | POST | `/api/finance/approval-configs` | finance | apps/web/src/api/finance/approvalConfig.ts | 58 |
| 782 | PUT | `/api/finance/approval-configs/{id}` | finance | apps/web/src/api/finance/approvalConfig.ts | 62 |
| 783 | DELETE | `/api/finance/approval-configs/{id}` | finance | apps/web/src/api/finance/approvalConfig.ts | 66 |
| 784 | GET | `/api/finance/counterparty/customers/{customerId}` | finance | apps/web/src/api/finance/counterparty.ts | 12 |
| 785 | PUT | `/api/finance/counterparty/customers/{customerId}` | finance | apps/web/src/api/finance/counterparty.ts | 19 |
| 786 | GET | `/api/finance/counterparty/suppliers/{supplierId}` | finance | apps/web/src/api/finance/counterparty.ts | 23 |
| 787 | PUT | `/api/finance/counterparty/suppliers/{supplierId}` | finance | apps/web/src/api/finance/counterparty.ts | 30 |
| 788 | GET | `/api/finance/counterparty/customers` | finance | apps/web/src/api/finance/counterparty.ts | 40 |
| 789 | GET | `/api/finance/counterparty/suppliers` | finance | apps/web/src/api/finance/counterparty.ts | 52 |
| 790 | GET | `/api/finance/expense-approvals` | finance | apps/web/src/api/finance/expenseApproval.ts | 76 |
| 791 | POST | `/api/finance/expense-approvals` | finance | apps/web/src/api/finance/expenseApproval.ts | 80 |
| 792 | GET | `/api/finance/expense-approvals/{id}` | finance | apps/web/src/api/finance/expenseApproval.ts | 84 |
| 793 | PUT | `/api/finance/expense-approvals/{id}` | finance | apps/web/src/api/finance/expenseApproval.ts | 91 |
| 794 | DELETE | `/api/finance/expense-approvals/{id}` | finance | apps/web/src/api/finance/expenseApproval.ts | 95 |
| 795 | POST | `/api/finance/expense-approvals/{id}/submit` | finance | apps/web/src/api/finance/expenseApproval.ts | 99 |
| 796 | POST | `/api/finance/expense-approvals/{id}/approve` | finance | apps/web/src/api/finance/expenseApproval.ts | 103 |
| 797 | POST | `/api/finance/expense-approvals/{id}/reject` | finance | apps/web/src/api/finance/expenseApproval.ts | 107 |
| 798 | GET | `/api/finance/dashboard` | finance | apps/web/src/api/finance/index.ts | 47 |
| 799 | GET | `/api/finance/payments` | finance | apps/web/src/api/finance/payment.ts | 96 |
| 800 | GET | `/api/finance/payments/{id}` | finance | apps/web/src/api/finance/payment.ts | 100 |
| 801 | POST | `/api/finance/payments` | finance | apps/web/src/api/finance/payment.ts | 104 |
| 802 | PUT | `/api/finance/payments/{id}` | finance | apps/web/src/api/finance/payment.ts | 108 |
| 803 | DELETE | `/api/finance/payments/{id}` | finance | apps/web/src/api/finance/payment.ts | 112 |
| 804 | POST | `/api/finance/payments/{id}/submit` | finance | apps/web/src/api/finance/payment.ts | 116 |
| 805 | POST | `/api/finance/payments/{id}/approve` | finance | apps/web/src/api/finance/payment.ts | 120 |
| 806 | POST | `/api/finance/payments/{id}/reject` | finance | apps/web/src/api/finance/payment.ts | 124 |
| 807 | POST | `/api/finance/payments/{id}/execute` | finance | apps/web/src/api/finance/payment.ts | 128 |
| 808 | POST | `/api/finance/payments/write-off` | finance | apps/web/src/api/finance/payment.ts | 132 |
| 809 | POST | `/api/finance/payments/export` | finance | apps/web/src/api/finance/payment.ts | 136 |
| 810 | GET | `/api/finance/period/current` | finance | apps/web/src/api/finance/period.ts | 6 |
| 811 | GET | `/api/finance/periods` | finance | apps/web/src/api/finance/period.ts | 24 |
| 812 | POST | `/api/finance/periods/open` | finance | apps/web/src/api/finance/period.ts | 28 |
| 813 | POST | `/api/finance/periods/close` | finance | apps/web/src/api/finance/period.ts | 32 |
| 814 | POST | `/api/finance/periods/close-income` | finance | apps/web/src/api/finance/period.ts | 36 |
| 815 | POST | `/api/finance/periods/year-end-close` | finance | apps/web/src/api/finance/period.ts | 48 |
| 816 | GET | `/api/finance/receivables` | finance | apps/web/src/api/finance/receivablePayable.ts | 20 |
| 817 | GET | `/api/finance/receivables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 24 |
| 818 | POST | `/api/finance/receivables` | finance | apps/web/src/api/finance/receivablePayable.ts | 28 |
| 819 | PUT | `/api/finance/receivables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 35 |
| 820 | DELETE | `/api/finance/receivables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 39 |
| 821 | GET | `/api/finance/payables` | finance | apps/web/src/api/finance/receivablePayable.ts | 50 |
| 822 | GET | `/api/finance/payables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 54 |
| 823 | POST | `/api/finance/payables` | finance | apps/web/src/api/finance/receivablePayable.ts | 60 |
| 824 | PUT | `/api/finance/payables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 67 |
| 825 | DELETE | `/api/finance/payables/{id}` | finance | apps/web/src/api/finance/receivablePayable.ts | 71 |
| 826 | GET | `/api/finance/ar/collections` | finance | apps/web/src/api/finance/receivablePayable.ts | 81 |
| 827 | POST | `/api/finance/ar/collections` | finance | apps/web/src/api/finance/receivablePayable.ts | 85 |
| 828 | GET | `/api/finance/ap/payments` | finance | apps/web/src/api/finance/receivablePayable.ts | 95 |
| 829 | POST | `/api/finance/ap/payments` | finance | apps/web/src/api/finance/receivablePayable.ts | 99 |
| 830 | POST | `/api/finance/ap/payments/{id}/approve` | finance | apps/web/src/api/finance/receivablePayable.ts | 103 |
| 831 | POST | `/api/finance/ap/payments/{id}/reject` | finance | apps/web/src/api/finance/receivablePayable.ts | 107 |
| 832 | POST | `/api/finance/reconcile` | finance | apps/web/src/api/finance/receivablePayable.ts | 115 |
| 833 | POST | `/api/finance/reconcile/auto` | finance | apps/web/src/api/finance/receivablePayable.ts | 123 |
| 834 | GET | `/api/finance/ar/aging` | finance | apps/web/src/api/finance/receivablePayable.ts | 145 |
| 835 | GET | `/api/finance/ap/aging` | finance | apps/web/src/api/finance/receivablePayable.ts | 167 |
| 836 | GET | `/api/finance/reports/balance-sheet` | finance | apps/web/src/api/finance/report.ts | 14 |
| 837 | GET | `/api/finance/reports/income-statement` | finance | apps/web/src/api/finance/report.ts | 20 |
| 838 | GET | `/api/finance/reports/cash-flow` | finance | apps/web/src/api/finance/report.ts | 26 |
| 839 | GET | `/api/finance/reports/account-balance` | finance | apps/web/src/api/finance/report.ts | 43 |
| 840 | GET | `/api/finance/reports/account-ledger` | finance | apps/web/src/api/finance/report.ts | 70 |
| 841 | GET | `/api/finance/reports/dimension-detail` | finance | apps/web/src/api/finance/report.ts | 82 |
| 842 | GET | `/api/finance/vouchers/{id}` | finance | apps/web/src/api/finance/voucher.ts | 38 |
| 843 | GET | `/api/finance/vouchers/{id}/entries` | finance | apps/web/src/api/finance/voucher.ts | 42 |
| 844 | GET | `/api/finance/vouchers/{id}/items` | finance | apps/web/src/api/finance/voucher.ts | 46 |
| 845 | POST | `/api/finance/vouchers/batch` | finance | apps/web/src/api/finance/voucher.ts | 64 |
| 846 | PUT | `/api/finance/vouchers/{id}` | finance | apps/web/src/api/finance/voucher.ts | 73 |
| 847 | DELETE | `/api/finance/vouchers/{id}` | finance | apps/web/src/api/finance/voucher.ts | 77 |
| 848 | POST | `/api/finance/vouchers/batch-delete` | finance | apps/web/src/api/finance/voucher.ts | 81 |
| 849 | POST | `/api/finance/vouchers/{id}/submit` | finance | apps/web/src/api/finance/voucher.ts | 87 |
| 850 | POST | `/api/finance/vouchers/{id}/approve` | finance | apps/web/src/api/finance/voucher.ts | 91 |
| 851 | POST | `/api/finance/vouchers/batch/submit` | finance | apps/web/src/api/finance/voucher.ts | 95 |
| 852 | POST | `/api/finance/vouchers/batch/approve` | finance | apps/web/src/api/finance/voucher.ts | 101 |
| 853 | POST | `/api/finance/vouchers/{id}/unapprove` | finance | apps/web/src/api/finance/voucher.ts | 107 |
| 854 | POST | `/api/finance/vouchers/{id}/post` | finance | apps/web/src/api/finance/voucher.ts | 111 |
| 855 | POST | `/api/finance/vouchers/batch/post` | finance | apps/web/src/api/finance/voucher.ts | 115 |
| 856 | POST | `/api/finance/vouchers/{id}/reverse` | finance | apps/web/src/api/finance/voucher.ts | 121 |
| 857 | GET | `/api/finance/vouchers/next-no` | finance | apps/web/src/api/finance/voucher.ts | 130 |
| 858 | POST | `/api/finance/vouchers/generate` | finance | apps/web/src/api/finance/voucher.ts | 139 |
| 859 | POST | `/api/finance/vouchers/import` | finance | apps/web/src/api/finance/voucher.ts | 154 |
| 860 | POST | `/api/finance/vouchers/import/u8` | finance | apps/web/src/api/finance/voucher.ts | 170 |
| 861 | POST | `/api/finance/reports/balance-sheet/generate` | finance | apps/web/src/api/financialReport/index.ts | 58 |
| 862 | GET | `/api/finance/reports/balance-sheet` | finance | apps/web/src/api/financialReport/index.ts | 64 |
| 863 | GET | `/api/finance/reports/balance-sheet/history` | finance | apps/web/src/api/financialReport/index.ts | 76 |
| 864 | POST | `/api/finance/reports/income-statement/generate` | finance | apps/web/src/api/financialReport/index.ts | 89 |
| 865 | GET | `/api/finance/reports/income-statement` | finance | apps/web/src/api/financialReport/index.ts | 95 |
| 866 | GET | `/api/finance/reports/income-statement/history` | finance | apps/web/src/api/financialReport/index.ts | 107 |
| 867 | POST | `/api/finance/reports/cash-flow/generate` | finance | apps/web/src/api/financialReport/index.ts | 120 |
| 868 | GET | `/api/finance/reports/cash-flow` | finance | apps/web/src/api/financialReport/index.ts | 126 |
| 869 | GET | `/api/finance/reports/cash-flow/history` | finance | apps/web/src/api/financialReport/index.ts | 138 |
| 870 | POST | `/api/finance/reports/submit-approval` | finance | apps/web/src/api/financialReport/index.ts | 150 |
| 871 | POST | `/api/finance/reports/approve` | finance | apps/web/src/api/financialReport/index.ts | 159 |
| 872 | POST | `/api/finance/reports/reject` | finance | apps/web/src/api/financialReport/index.ts | 168 |
| 873 | POST | `/api/finance/reports/lock` | finance | apps/web/src/api/financialReport/index.ts | 176 |
| 874 | POST | `/api/finance/reports/unlock` | finance | apps/web/src/api/financialReport/index.ts | 184 |
| 875 | GET | `/api/finance/reports/item-details` | finance | apps/web/src/api/financialReport/index.ts | 198 |
| 876 | GET | `/api/finance/reports/item-vouchers` | finance | apps/web/src/api/financialReport/index.ts | 210 |
| 877 | GET | `/api/finance/reports/comparison` | finance | apps/web/src/api/financialReport/index.ts | 225 |
| 878 | GET | `/api/finance/reports/trend` | finance | apps/web/src/api/financialReport/index.ts | 237 |
| 879 | GET | `/api/finance/reports/year-over-year` | finance | apps/web/src/api/financialReport/index.ts | 248 |
| 880 | GET | `/api/finance/reports/period-over-period` | finance | apps/web/src/api/financialReport/index.ts | 259 |
| 881 | POST | `/api/finance/reports/consolidated/generate` | finance | apps/web/src/api/financialReport/index.ts | 274 |
| 882 | GET | `/api/finance/reports/consolidated/{consolidationId}` | finance | apps/web/src/api/financialReport/index.ts | 287 |
| 883 | GET | `/api/finance/reports/consolidated/entities` | finance | apps/web/src/api/financialReport/index.ts | 299 |
| 884 | POST | `/api/finance/reports/consolidated/entities` | finance | apps/web/src/api/financialReport/index.ts | 311 |
| 885 | PUT | `/api/finance/reports/consolidated/entities/{entityId}` | finance | apps/web/src/api/financialReport/index.ts | 317 |
| 886 | DELETE | `/api/finance/reports/consolidated/entities/{entityId}` | finance | apps/web/src/api/financialReport/index.ts | 323 |
| 887 | GET | `/api/finance/reports/consolidated/elims` | finance | apps/web/src/api/financialReport/index.ts | 333 |
| 888 | POST | `/api/finance/reports/consolidated/elims` | finance | apps/web/src/api/financialReport/index.ts | 345 |
| 889 | POST | `/api/finance/reports/export/batch` | finance | apps/web/src/api/financialReport/index.ts | 376 |
| 890 | GET | `/api/finance/reports/subscriptions` | finance | apps/web/src/api/financialReport/index.ts | 411 |
| 891 | POST | `/api/finance/reports/subscriptions` | finance | apps/web/src/api/financialReport/index.ts | 428 |
| 892 | PUT | `/api/finance/reports/subscriptions/{subscriptionId}` | finance | apps/web/src/api/financialReport/index.ts | 434 |
| 893 | DELETE | `/api/finance/reports/subscriptions/{subscriptionId}` | finance | apps/web/src/api/financialReport/index.ts | 440 |
| 894 | POST | `/api/finance/reports/subscriptions/{subscriptionId}/send-now` | finance | apps/web/src/api/financialReport/index.ts | 446 |
| 895 | GET | `/api/finance/reports/subscriptions/{subscriptionId}/history` | finance | apps/web/src/api/financialReport/index.ts | 458 |
| 896 | GET | `/api/gis/business-locations` | gis | apps/web/src/api/gis/business.ts | 21 |
| 897 | GET | `/api/gis/business-locations/{id}` | gis | apps/web/src/api/gis/business.ts | 29 |
| 898 | GET | `/api/gis/business-locations/type/{type}` | gis | apps/web/src/api/gis/business.ts | 40 |
| 899 | POST | `/api/gis/business-locations` | gis | apps/web/src/api/gis/business.ts | 52 |
| 900 | PUT | `/api/gis/business-locations/{id}` | gis | apps/web/src/api/gis/business.ts | 59 |
| 901 | DELETE | `/api/gis/business-locations/{id}` | gis | apps/web/src/api/gis/business.ts | 63 |
| 902 | GET | `/api/gis/device-locations` | gis | apps/web/src/api/gis/device.ts | 23 |
| 903 | GET | `/api/gis/device-locations/{id}` | gis | apps/web/src/api/gis/device.ts | 43 |
| 904 | POST | `/api/gis/device-locations` | gis | apps/web/src/api/gis/device.ts | 60 |
| 905 | PUT | `/api/gis/device-locations/{id}` | gis | apps/web/src/api/gis/device.ts | 67 |
| 906 | DELETE | `/api/gis/device-locations/{id}` | gis | apps/web/src/api/gis/device.ts | 71 |
| 907 | GET | `/api/gis/device-tracks/{device_id}/statistics` | gis | apps/web/src/api/gis/device.ts | 101 |
| 908 | GET | `/api/gis/device-tracks/devices` | gis | apps/web/src/api/gis/device.ts | 112 |
| 909 | GET | `/api/gis/fences` | gis | apps/web/src/api/gis/fence.ts | 34 |
| 910 | GET | `/api/gis/fences/{id}` | gis | apps/web/src/api/gis/fence.ts | 38 |
| 911 | POST | `/api/gis/fences` | gis | apps/web/src/api/gis/fence.ts | 42 |
| 912 | PUT | `/api/gis/fences/{id}` | gis | apps/web/src/api/gis/fence.ts | 49 |
| 913 | DELETE | `/api/gis/fences/{id}` | gis | apps/web/src/api/gis/fence.ts | 53 |
| 914 | GET | `/api/gis/statistics` | gis | apps/web/src/api/gis/map.ts | 19 |
| 915 | GET | `/api/gis/factory-maps` | gis | apps/web/src/api/gis/map.ts | 30 |
| 916 | GET | `/api/gis/factory-maps/{id}` | gis | apps/web/src/api/gis/map.ts | 38 |
| 917 | POST | `/api/gis/factory-maps` | gis | apps/web/src/api/gis/map.ts | 42 |
| 918 | PUT | `/api/gis/factory-maps/{id}` | gis | apps/web/src/api/gis/map.ts | 49 |
| 919 | DELETE | `/api/gis/factory-maps/{id}` | gis | apps/web/src/api/gis/map.ts | 53 |
| 920 | GET | `/api/gis/map-markers` | gis | apps/web/src/api/gis/map.ts | 64 |
| 921 | POST | `/api/gis/map-markers` | gis | apps/web/src/api/gis/map.ts | 72 |
| 922 | PUT | `/api/gis/map-markers/{id}` | gis | apps/web/src/api/gis/map.ts | 79 |
| 923 | DELETE | `/api/gis/map-markers/{id}` | gis | apps/web/src/api/gis/map.ts | 83 |
| 924 | GET | `/api/gis/search` | gis | apps/web/src/api/gis/map.ts | 89 |
| 925 | GET | `/api/gis/geojson/export` | gis | apps/web/src/api/gis/map.ts | 93 |
| 926 | GET | `/api/gis/health` | gis | apps/web/src/api/gis/map.ts | 97 |
| 927 | POST | `/api/gis/import` | gis | apps/web/src/api/gis/map.ts | 104 |
| 928 | GET | `/api/gis/pipelines` | gis | apps/web/src/api/gis/pipeline.ts | 16 |
| 929 | GET | `/api/gis/pipelines/{id}` | gis | apps/web/src/api/gis/pipeline.ts | 24 |
| 930 | POST | `/api/gis/pipelines` | gis | apps/web/src/api/gis/pipeline.ts | 41 |
| 931 | PUT | `/api/gis/pipelines/{id}` | gis | apps/web/src/api/gis/pipeline.ts | 48 |
| 932 | DELETE | `/api/gis/pipelines/{id}` | gis | apps/web/src/api/gis/pipeline.ts | 52 |
| 933 | GET | `/api/gis/warehouse-locations` | gis | apps/web/src/api/gis/storage.ts | 24 |
| 934 | GET | `/api/gis/warehouse-locations/{id}` | gis | apps/web/src/api/gis/storage.ts | 32 |
| 935 | POST | `/api/gis/warehouse-locations` | gis | apps/web/src/api/gis/storage.ts | 51 |
| 936 | PUT | `/api/gis/warehouse-locations/{id}` | gis | apps/web/src/api/gis/storage.ts | 58 |
| 937 | DELETE | `/api/gis/warehouse-locations/{id}` | gis | apps/web/src/api/gis/storage.ts | 62 |
| 938 | GET | `/api/gis/location-photos` | gis | apps/web/src/api/gis/storage.ts | 73 |
| 939 | GET | `/api/gis/location-photos/{id}` | gis | apps/web/src/api/gis/storage.ts | 81 |
| 940 | POST | `/api/gis/location-photos` | gis | apps/web/src/api/gis/storage.ts | 100 |
| 941 | DELETE | `/api/gis/location-photos/{id}` | gis | apps/web/src/api/gis/storage.ts | 104 |
| 942 | GET | `/api/hrm/attendance{queryString}` | hrm | apps/web/src/api/hrm/attendance.ts | 9 |
| 943 | GET | `/api/hrm/attendance/{id}` | hrm | apps/web/src/api/hrm/attendance.ts | 13 |
| 944 | POST | `/api/hrm/attendance` | hrm | apps/web/src/api/hrm/attendance.ts | 17 |
| 945 | PUT | `/api/hrm/attendance/{id}` | hrm | apps/web/src/api/hrm/attendance.ts | 21 |
| 946 | DELETE | `/api/hrm/attendance/{id}` | hrm | apps/web/src/api/hrm/attendance.ts | 25 |
| 947 | POST | `/api/hrm/attendance/check-in` | hrm | apps/web/src/api/hrm/attendance.ts | 29 |
| 948 | POST | `/api/hrm/attendance/check-out` | hrm | apps/web/src/api/hrm/attendance.ts | 33 |
| 949 | GET | `/api/hrm/companies{queryString}` | hrm | apps/web/src/api/hrm/company.ts | 25 |
| 950 | GET | `/api/hrm/contracts{queryString}` | hrm | apps/web/src/api/hrm/contract.ts | 9 |
| 951 | GET | `/api/hrm/contracts/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 15 |
| 952 | POST | `/api/hrm/contracts` | hrm | apps/web/src/api/hrm/contract.ts | 19 |
| 953 | PUT | `/api/hrm/contracts/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 23 |
| 954 | DELETE | `/api/hrm/contracts/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 27 |
| 955 | GET | `/api/hrm/contracts/expiring{queryString}` | hrm | apps/web/src/api/hrm/contract.ts | 36 |
| 956 | POST | `/api/hrm/contracts/{contract_id}/renew` | hrm | apps/web/src/api/hrm/contract.ts | 43 |
| 957 | GET | `/api/hrm/contract-renewals{queryString}` | hrm | apps/web/src/api/hrm/contract.ts | 50 |
| 958 | GET | `/api/hrm/contract-renewals/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 54 |
| 959 | PUT | `/api/hrm/contract-renewals/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 61 |
| 960 | DELETE | `/api/hrm/contract-renewals/{id}` | hrm | apps/web/src/api/hrm/contract.ts | 65 |
| 961 | PUT | `/api/hrm/contract-renewals/{id}/approve` | hrm | apps/web/src/api/hrm/contract.ts | 69 |
| 962 | PUT | `/api/hrm/contract-renewals/{id}/reject` | hrm | apps/web/src/api/hrm/contract.ts | 73 |
| 963 | PUT | `/api/hrm/contract-renewals/{id}/execute` | hrm | apps/web/src/api/hrm/contract.ts | 79 |
| 964 | GET | `/api/hrm/dashboard` | hrm | apps/web/src/api/hrm/dashboard.ts | 16 |
| 965 | GET | `/api/hrm/departments{queryString}` | hrm | apps/web/src/api/hrm/department.ts | 25 |
| 966 | GET | `/api/hrm/{endpoint}{queryString}` | hrm | apps/web/src/api/hrm/employee.ts | 23 |
| 967 | GET | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/employee.ts | 27 |
| 968 | PUT | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/employee.ts | 35 |
| 969 | DELETE | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/employee.ts | 39 |
| 970 | GET | `/api/hrm/employees{queryString}` | hrm | apps/web/src/api/hrm/employee.ts | 52 |
| 971 | GET | `/api/hrm/employees/{employee_id}/performance-reviews` | hrm | apps/web/src/api/hrm/employee.ts | 100 |
| 972 | GET | `/api/hrm/employees/{employee_id}/performance-goals` | hrm | apps/web/src/api/hrm/employee.ts | 104 |
| 973 | GET | `/api/hrm/health` | hrm | apps/web/src/api/hrm/index.ts | 55 |
| 974 | GET | `/api/hrm/leaves{queryString}` | hrm | apps/web/src/api/hrm/leave.ts | 9 |
| 975 | GET | `/api/hrm/leaves/{id}` | hrm | apps/web/src/api/hrm/leave.ts | 13 |
| 976 | POST | `/api/hrm/leaves` | hrm | apps/web/src/api/hrm/leave.ts | 17 |
| 977 | PUT | `/api/hrm/leaves/{id}` | hrm | apps/web/src/api/hrm/leave.ts | 21 |
| 978 | DELETE | `/api/hrm/leaves/{id}` | hrm | apps/web/src/api/hrm/leave.ts | 25 |
| 979 | PUT | `/api/hrm/leaves/{id}/approve` | hrm | apps/web/src/api/hrm/leave.ts | 29 |
| 980 | PUT | `/api/hrm/leaves/{id}/reject` | hrm | apps/web/src/api/hrm/leave.ts | 33 |
| 981 | GET | `/api/hrm/payroll-runs{queryString}` | hrm | apps/web/src/api/hrm/payroll.ts | 16 |
| 982 | GET | `/api/hrm/payroll-runs/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 20 |
| 983 | POST | `/api/hrm/payroll-runs` | hrm | apps/web/src/api/hrm/payroll.ts | 24 |
| 984 | DELETE | `/api/hrm/payroll-runs/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 28 |
| 985 | PUT | `/api/hrm/payroll-runs/{id}/calculate` | hrm | apps/web/src/api/hrm/payroll.ts | 32 |
| 986 | PUT | `/api/hrm/payroll-runs/{id}/pay` | hrm | apps/web/src/api/hrm/payroll.ts | 36 |
| 987 | GET | `/api/hrm/payroll-items{queryString}` | hrm | apps/web/src/api/hrm/payroll.ts | 43 |
| 988 | GET | `/api/hrm/payroll-items/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 47 |
| 989 | GET | `/api/hrm/salary-adjustments{queryString}` | hrm | apps/web/src/api/hrm/payroll.ts | 54 |
| 990 | GET | `/api/hrm/salary-adjustments/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 57 |
| 991 | POST | `/api/hrm/salary-adjustments` | hrm | apps/web/src/api/hrm/payroll.ts | 60 |
| 992 | PUT | `/api/hrm/salary-adjustments/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 66 |
| 993 | DELETE | `/api/hrm/salary-adjustments/{id}` | hrm | apps/web/src/api/hrm/payroll.ts | 69 |
| 994 | PUT | `/api/hrm/salary-adjustments/{id}/approve` | hrm | apps/web/src/api/hrm/payroll.ts | 72 |
| 995 | PUT | `/api/hrm/salary-adjustments/{id}/reject` | hrm | apps/web/src/api/hrm/payroll.ts | 81 |
| 996 | GET | `/api/hrm/{endpoint}{queryString}` | hrm | apps/web/src/api/hrm/performance.ts | 16 |
| 997 | GET | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/performance.ts | 20 |
| 998 | PUT | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/performance.ts | 28 |
| 999 | DELETE | `/api/hrm/{endpoint}/{id}` | hrm | apps/web/src/api/hrm/performance.ts | 32 |
| 1000 | GET | `/api/hrm/performance-reviews{queryString}` | hrm | apps/web/src/api/hrm/performance.ts | 42 |
| 1001 | PUT | `/api/hrm/performance-reviews/{id}/submit` | hrm | apps/web/src/api/hrm/performance.ts | 46 |
| 1002 | PUT | `/api/hrm/performance-reviews/{id}/approve` | hrm | apps/web/src/api/hrm/performance.ts | 50 |
| 1003 | GET | `/api/hrm/job-openings{queryString}` | hrm | apps/web/src/api/hrm/recruitment.ts | 9 |
| 1004 | GET | `/api/hrm/job-openings/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 13 |
| 1005 | POST | `/api/hrm/job-openings` | hrm | apps/web/src/api/hrm/recruitment.ts | 17 |
| 1006 | PUT | `/api/hrm/job-openings/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 21 |
| 1007 | DELETE | `/api/hrm/job-openings/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 25 |
| 1008 | PUT | `/api/hrm/job-openings/{id}/publish` | hrm | apps/web/src/api/hrm/recruitment.ts | 29 |
| 1009 | PUT | `/api/hrm/job-openings/{id}/close` | hrm | apps/web/src/api/hrm/recruitment.ts | 33 |
| 1010 | GET | `/api/hrm/candidates{queryString}` | hrm | apps/web/src/api/hrm/recruitment.ts | 40 |
| 1011 | GET | `/api/hrm/candidates/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 44 |
| 1012 | POST | `/api/hrm/candidates` | hrm | apps/web/src/api/hrm/recruitment.ts | 48 |
| 1013 | PUT | `/api/hrm/candidates/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 52 |
| 1014 | DELETE | `/api/hrm/candidates/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 56 |
| 1015 | GET | `/api/hrm/interviews{queryString}` | hrm | apps/web/src/api/hrm/recruitment.ts | 63 |
| 1016 | GET | `/api/hrm/interviews/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 67 |
| 1017 | POST | `/api/hrm/interviews` | hrm | apps/web/src/api/hrm/recruitment.ts | 71 |
| 1018 | PUT | `/api/hrm/interviews/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 75 |
| 1019 | DELETE | `/api/hrm/interviews/{id}` | hrm | apps/web/src/api/hrm/recruitment.ts | 79 |
| 1020 | PUT | `/api/hrm/interviews/{id}/complete` | hrm | apps/web/src/api/hrm/recruitment.ts | 83 |
| 1021 | GET | `/api/hrm/training-plans{queryString}` | hrm | apps/web/src/api/hrm/training.ts | 15 |
| 1022 | GET | `/api/hrm/training-plans/{id}` | hrm | apps/web/src/api/hrm/training.ts | 19 |
| 1023 | POST | `/api/hrm/training-plans` | hrm | apps/web/src/api/hrm/training.ts | 23 |
| 1024 | PUT | `/api/hrm/training-plans/{id}` | hrm | apps/web/src/api/hrm/training.ts | 27 |
| 1025 | DELETE | `/api/hrm/training-plans/{id}` | hrm | apps/web/src/api/hrm/training.ts | 31 |
| 1026 | PUT | `/api/hrm/training-plans/{id}/activate` | hrm | apps/web/src/api/hrm/training.ts | 35 |
| 1027 | PUT | `/api/hrm/training-plans/{id}/deactivate` | hrm | apps/web/src/api/hrm/training.ts | 39 |
| 1028 | GET | `/api/hrm/training-courses{queryString}` | hrm | apps/web/src/api/hrm/training.ts | 46 |
| 1029 | GET | `/api/hrm/training-courses/{id}` | hrm | apps/web/src/api/hrm/training.ts | 50 |
| 1030 | POST | `/api/hrm/training-courses` | hrm | apps/web/src/api/hrm/training.ts | 54 |
| 1031 | PUT | `/api/hrm/training-courses/{id}` | hrm | apps/web/src/api/hrm/training.ts | 61 |
| 1032 | DELETE | `/api/hrm/training-courses/{id}` | hrm | apps/web/src/api/hrm/training.ts | 65 |
| 1033 | GET | `/api/hrm/training-records{queryString}` | hrm | apps/web/src/api/hrm/training.ts | 72 |
| 1034 | GET | `/api/hrm/training-records/{id}` | hrm | apps/web/src/api/hrm/training.ts | 76 |
| 1035 | POST | `/api/hrm/training-records` | hrm | apps/web/src/api/hrm/training.ts | 80 |
| 1036 | PUT | `/api/hrm/training-records/{id}` | hrm | apps/web/src/api/hrm/training.ts | 87 |
| 1037 | DELETE | `/api/hrm/training-records/{id}` | hrm | apps/web/src/api/hrm/training.ts | 91 |
| 1038 | POST | `/api/hrm/training-records/enroll` | hrm | apps/web/src/api/hrm/training.ts | 95 |
| 1039 | PUT | `/api/hrm/training-records/{id}/complete` | hrm | apps/web/src/api/hrm/training.ts | 105 |
| 1040 | POST | `/api/core/iam/auth/register` | iam | apps/web/src/api/iam/auth.ts | 19 |
| 1041 | POST | `/api/core/iam/auth/login` | iam | apps/web/src/api/iam/auth.ts | 26 |
| 1042 | POST | `/api/core/iam/auth/logout` | iam | apps/web/src/api/iam/auth.ts | 39 |
| 1043 | POST | `/api/core/iam/auth/refresh` | iam | apps/web/src/api/iam/auth.ts | 51 |
| 1044 | GET | `/api/core/iam/health` | iam | apps/web/src/api/iam/auth.ts | 63 |
| 1045 | POST | `/api/core/iam/auth/forgot-password` | iam | apps/web/src/api/iam/auth.ts | 67 |
| 1046 | POST | `/api/core/iam/auth/reset-password` | iam | apps/web/src/api/iam/auth.ts | 71 |
| 1047 | GET | `/api/core/iam/auth/password-policy` | iam | apps/web/src/api/iam/auth.ts | 85 |
| 1048 | PUT | `/api/core/iam/auth/password-policy` | iam | apps/web/src/api/iam/auth.ts | 97 |
| 1049 | GET | `/api/core/iam/auth/sessions` | iam | apps/web/src/api/iam/auth.ts | 113 |
| 1050 | DELETE | `/api/core/iam/auth/sessions/{sessionId}` | iam | apps/web/src/api/iam/auth.ts | 117 |
| 1051 | POST | `/api/core/iam/auth/sessions/revoke-all` | iam | apps/web/src/api/iam/auth.ts | 121 |
| 1052 | GET | `/api/core/iam/auth/security-settings` | iam | apps/web/src/api/iam/auth.ts | 132 |
| 1053 | PUT | `/api/core/iam/auth/security-settings` | iam | apps/web/src/api/iam/auth.ts | 141 |
| 1054 | GET | `/api/core/iam/permissions` | iam | apps/web/src/api/iam/permission.ts | 7 |
| 1055 | POST | `/api/core/iam/permissions` | iam | apps/web/src/api/iam/permission.ts | 11 |
| 1056 | PUT | `/api/core/iam/permissions/{permissionId}` | iam | apps/web/src/api/iam/permission.ts | 18 |
| 1057 | DELETE | `/api/core/iam/permissions/{permissionId}` | iam | apps/web/src/api/iam/permission.ts | 22 |
| 1058 | GET | `/api/core/iam/roles` | iam | apps/web/src/api/iam/role.ts | 7 |
| 1059 | GET | `/api/core/iam/roles/{id}` | iam | apps/web/src/api/iam/role.ts | 11 |
| 1060 | POST | `/api/core/iam/roles` | iam | apps/web/src/api/iam/role.ts | 15 |
| 1061 | PUT | `/api/core/iam/roles/{roleId}` | iam | apps/web/src/api/iam/role.ts | 19 |
| 1062 | DELETE | `/api/core/iam/roles/{id}` | iam | apps/web/src/api/iam/role.ts | 23 |
| 1063 | GET | `/api/core/iam/roles/{roleId}/permissions` | iam | apps/web/src/api/iam/role.ts | 27 |
| 1064 | POST | `/api/core/iam/roles/{roleId}/permissions` | iam | apps/web/src/api/iam/role.ts | 31 |
| 1065 | DELETE | `/api/core/iam/roles/{roleId}/permissions/{permissionId}` | iam | apps/web/src/api/iam/role.ts | 40 |
| 1066 | GET | `/api/core/iam/users/me` | iam | apps/web/src/api/iam/user.ts | 22 |
| 1067 | GET | `/api/core/iam/users/me/permissions` | iam | apps/web/src/api/iam/user.ts | 26 |
| 1068 | POST | `/api/core/iam/users/me/permissions/check` | iam | apps/web/src/api/iam/user.ts | 30 |
| 1069 | GET | `/api/core/iam/users` | iam | apps/web/src/api/iam/user.ts | 44 |
| 1070 | GET | `/api/core/iam/users/{userId}` | iam | apps/web/src/api/iam/user.ts | 48 |
| 1071 | PUT | `/api/core/iam/users/{userId}` | iam | apps/web/src/api/iam/user.ts | 52 |
| 1072 | PUT | `/api/core/iam/users/me` | iam | apps/web/src/api/iam/user.ts | 59 |
| 1073 | POST | `/api/core/iam/users/me/password` | iam | apps/web/src/api/iam/user.ts | 66 |
| 1074 | POST | `/api/core/iam/users/me/avatar` | iam | apps/web/src/api/iam/user.ts | 70 |
| 1075 | GET | `/api/core/iam/users/me/preferences` | iam | apps/web/src/api/iam/user.ts | 74 |
| 1076 | PUT | `/api/core/iam/users/me/preferences` | iam | apps/web/src/api/iam/user.ts | 83 |
| 1077 | DELETE | `/api/core/iam/users/{userId}` | iam | apps/web/src/api/iam/user.ts | 87 |
| 1078 | POST | `/api/core/iam/users` | iam | apps/web/src/api/iam/user.ts | 96 |
| 1079 | GET | `/api/core/iam/users/{userId}/permissions` | iam | apps/web/src/api/iam/user.ts | 100 |
| 1080 | GET | `/api/core/iam/users/{userId}/roles` | iam | apps/web/src/api/iam/user.ts | 104 |
| 1081 | POST | `/api/core/iam/users/{userId}/roles/{roleId}` | iam | apps/web/src/api/iam/user.ts | 108 |
| 1082 | DELETE | `/api/core/iam/users/{userId}/roles/{roleId}` | iam | apps/web/src/api/iam/user.ts | 112 |
| 1083 | GET | `/api/core/iam/users/{userId}/effective-permissions` | iam | apps/web/src/api/iam/user.ts | 125 |
| 1084 | POST | `/api/core/iam/users/batch-delete` | iam | apps/web/src/api/iam/user.ts | 131 |
| 1085 | PUT | `/api/core/iam/users/batch-update` | iam | apps/web/src/api/iam/user.ts | 137 |
| 1086 | GET | `/api/core/iam/users/check-email` | iam | apps/web/src/api/iam/user.ts | 141 |
| 1087 | GET | `/api/core/iam/users/check-username` | iam | apps/web/src/api/iam/user.ts | 149 |
| 1088 | GET | `/api/core/iam/users/{userId}/login-history{params}` | iam | apps/web/src/api/iam/user.ts | 170 |
| 1089 | GET | `/api/core/iam/access-logs` | iam | apps/web/src/api/iam/user.ts | 177 |
| 1090 | GET | `/api/core/iam/access-logs/user/{userId}` | iam | apps/web/src/api/iam/user.ts | 188 |
| 1091 | POST | `/api/core/iam/access-logs` | iam | apps/web/src/api/iam/user.ts | 192 |
| 1092 | GET | `/api/communication/im/rooms/{id}` | im | apps/web/src/api/im/index.ts | 123 |
| 1093 | DELETE | `/api/communication/im/rooms/{id}` | im | apps/web/src/api/im/index.ts | 126 |
| 1094 | GET | `/api/communication/im/rooms/{chatId}/messages` | im | apps/web/src/api/im/index.ts | 129 |
| 1095 | POST | `/api/communication/im/rooms/{data.chat_id}/messages` | im | apps/web/src/api/im/index.ts | 132 |
| 1096 | PUT | `/api/communication/im/messages/{id}/read` | im | apps/web/src/api/im/index.ts | 135 |
| 1097 | PUT | `/api/communication/im/messages/{id}` | im | apps/web/src/api/im/index.ts | 139 |
| 1098 | DELETE | `/api/communication/im/messages/{id}` | im | apps/web/src/api/im/index.ts | 145 |
| 1099 | GET | `/api/communication/im/rooms/{chatRoomId}/members` | im | apps/web/src/api/im/index.ts | 149 |
| 1100 | POST | `/api/communication/im/rooms/{chatRoomId}/members` | im | apps/web/src/api/im/index.ts | 153 |
| 1101 | DELETE | `/api/communication/im/rooms/{chatRoomId}/members/{userId}` | im | apps/web/src/api/im/index.ts | 162 |
| 1102 | GET | `/api/communication/im/project-groups` | im | apps/web/src/api/im/index.ts | 166 |
| 1103 | POST | `/api/communication/im/project-groups` | im | apps/web/src/api/im/index.ts | 171 |
| 1104 | GET | `/api/communication/im/notifications/{userId}` | im | apps/web/src/api/im/index.ts | 175 |
| 1105 | POST | `/api/communication/im/notifications` | im | apps/web/src/api/im/index.ts | 180 |
| 1106 | PUT | `/api/communication/im/notifications/{id}/read` | im | apps/web/src/api/im/index.ts | 183 |
| 1107 | PUT | `/api/communication/im/notifications/{userId}/read-all` | im | apps/web/src/api/im/index.ts | 186 |
| 1108 | GET | `/api/communication/im/health` | im | apps/web/src/api/im/index.ts | 190 |
| 1109 | GET | `/api/communication/im/online-status/{userId}` | im | apps/web/src/api/im/index.ts | 206 |
| 1110 | GET | `/api/communication/im/contacts/{userId}` | im | apps/web/src/api/im/index.ts | 210 |
| 1111 | POST | `/api/communication/im/contacts/{userId}` | im | apps/web/src/api/im/index.ts | 217 |
| 1112 | PUT | `/api/communication/im/contacts/{userId}/{friendId}/accept` | im | apps/web/src/api/im/index.ts | 221 |
| 1113 | PUT | `/api/communication/im/contacts/{userId}/{friendId}/reject` | im | apps/web/src/api/im/index.ts | 225 |
| 1114 | DELETE | `/api/communication/im/contacts/{userId}/{friendId}` | im | apps/web/src/api/im/index.ts | 229 |
| 1115 | GET | `/api/communication/im/contact-groups/{userId}` | im | apps/web/src/api/im/index.ts | 233 |
| 1116 | POST | `/api/communication/im/contact-groups/{userId}` | im | apps/web/src/api/im/index.ts | 240 |
| 1117 | PUT | `/api/communication/im/contact-groups/{userId}/{groupId}` | im | apps/web/src/api/im/index.ts | 248 |
| 1118 | DELETE | `/api/communication/im/contact-groups/{userId}/{groupId}` | im | apps/web/src/api/im/index.ts | 252 |
| 1119 | POST | `/api/communication/im/contact-groups/{userId}/{groupId}/members` | im | apps/web/src/api/im/index.ts | 260 |
| 1120 | DELETE | `/api/communication/im/contact-groups/{userId}/{groupId}/members/{memberUserId}` | im | apps/web/src/api/im/index.ts | 270 |
| 1121 | PUT | `/api/communication/im/rooms/{chatId}/mute` | im | apps/web/src/api/im/index.ts | 274 |
| 1122 | PUT | `/api/communication/im/rooms/{chatId}/unmute` | im | apps/web/src/api/im/index.ts | 278 |
| 1123 | PUT | `/api/communication/im/rooms/{chatId}/pin` | im | apps/web/src/api/im/index.ts | 282 |
| 1124 | PUT | `/api/communication/im/rooms/{chatId}/unpin` | im | apps/web/src/api/im/index.ts | 286 |
| 1125 | GET | `/api/integration/erp/connections` | integration | apps/web/src/api/integration/connection.ts | 18 |
| 1126 | GET | `/api/integration/erp/connections/{id}` | integration | apps/web/src/api/integration/connection.ts | 22 |
| 1127 | POST | `/api/integration/erp/connections` | integration | apps/web/src/api/integration/connection.ts | 28 |
| 1128 | PUT | `/api/integration/erp/connections/{id}` | integration | apps/web/src/api/integration/connection.ts | 35 |
| 1129 | DELETE | `/api/integration/erp/connections/{id}` | integration | apps/web/src/api/integration/connection.ts | 39 |
| 1130 | POST | `/api/integration/erp/connections/test` | integration | apps/web/src/api/integration/connection.ts | 45 |
| 1131 | GET | `/api/integration/conversion-rules` | integration | apps/web/src/api/integration/conversionRule.ts | 65 |
| 1132 | GET | `/api/integration/conversion-rules/{id}` | integration | apps/web/src/api/integration/conversionRule.ts | 69 |
| 1133 | POST | `/api/integration/conversion-rules` | integration | apps/web/src/api/integration/conversionRule.ts | 73 |
| 1134 | PUT | `/api/integration/conversion-rules/{id}` | integration | apps/web/src/api/integration/conversionRule.ts | 80 |
| 1135 | DELETE | `/api/integration/conversion-rules/{id}` | integration | apps/web/src/api/integration/conversionRule.ts | 84 |
| 1136 | GET | `/api/integration/health` | integration | apps/web/src/api/integration/index.ts | 72 |
| 1137 | GET | `/api/integration/endpoints` | integration | apps/web/src/api/integration/index.ts | 84 |
| 1138 | GET | `/api/integration/erp/mappings` | integration | apps/web/src/api/integration/mapping.ts | 15 |
| 1139 | GET | `/api/integration/erp/mappings/{id}` | integration | apps/web/src/api/integration/mapping.ts | 21 |
| 1140 | POST | `/api/integration/erp/mappings` | integration | apps/web/src/api/integration/mapping.ts | 25 |
| 1141 | PUT | `/api/integration/erp/mappings/{id}` | integration | apps/web/src/api/integration/mapping.ts | 32 |
| 1142 | DELETE | `/api/integration/erp/mappings/{id}` | integration | apps/web/src/api/integration/mapping.ts | 36 |
| 1143 | GET | `/api/integration/sync-stats` | integration | apps/web/src/api/integration/sync.ts | 85 |
| 1144 | GET | `/api/integration/sync-stats/history` | integration | apps/web/src/api/integration/sync.ts | 95 |
| 1145 | GET | `/api/lims/audit-logs/{id}` | lims | apps/web/src/api/lims/audit.ts | 27 |
| 1146 | POST | `/api/lims/barcodes/generate` | lims | apps/web/src/api/lims/barcode.ts | 28 |
| 1147 | POST | `/api/lims/barcodes/print` | lims | apps/web/src/api/lims/barcode.ts | 37 |
| 1148 | GET | `/api/lims/barcodes/scan/{barcode}` | lims | apps/web/src/api/lims/barcode.ts | 41 |
| 1149 | GET | `/api/lims/barcodes/types` | lims | apps/web/src/api/lims/barcode.ts | 45 |
| 1150 | GET | `/api/lims/barcodes/{barcode}/trace` | lims | apps/web/src/api/lims/barcode.ts | 49 |
| 1151 | GET | `/api/lims/rfid-tags` | lims | apps/web/src/api/lims/barcode.ts | 55 |
| 1152 | POST | `/api/lims/rfid-tags` | lims | apps/web/src/api/lims/barcode.ts | 59 |
| 1153 | DELETE | `/api/lims/rfid-tags/{id}` | lims | apps/web/src/api/lims/barcode.ts | 63 |
| 1154 | POST | `/api/lims/rfid-tags/assign` | lims | apps/web/src/api/lims/barcode.ts | 67 |
| 1155 | POST | `/api/lims/rfid-tags/{tagId}/unassign` | lims | apps/web/src/api/lims/barcode.ts | 71 |
| 1156 | GET | `/api/lims/print-config` | lims | apps/web/src/api/lims/barcode.ts | 77 |
| 1157 | GET | `/api/lims/print-config/default` | lims | apps/web/src/api/lims/barcode.ts | 81 |
| 1158 | GET | `/api/lims/collection-tasks` | lims | apps/web/src/api/lims/collection.ts | 16 |
| 1159 | GET | `/api/lims/collection-tasks/{id}` | lims | apps/web/src/api/lims/collection.ts | 20 |
| 1160 | POST | `/api/lims/collection-tasks` | lims | apps/web/src/api/lims/collection.ts | 26 |
| 1161 | PUT | `/api/lims/collection-tasks/{id}` | lims | apps/web/src/api/lims/collection.ts | 33 |
| 1162 | DELETE | `/api/lims/collection-tasks/{id}` | lims | apps/web/src/api/lims/collection.ts | 37 |
| 1163 | POST | `/api/lims/collection-tasks/{id}/trigger` | lims | apps/web/src/api/lims/collection.ts | 41 |
| 1164 | GET | `/api/lims/parse-rules` | lims | apps/web/src/api/lims/collection.ts | 47 |
| 1165 | GET | `/api/lims/parse-rules/{id}` | lims | apps/web/src/api/lims/collection.ts | 51 |
| 1166 | POST | `/api/lims/parse-rules` | lims | apps/web/src/api/lims/collection.ts | 55 |
| 1167 | PUT | `/api/lims/parse-rules/{id}` | lims | apps/web/src/api/lims/collection.ts | 62 |
| 1168 | DELETE | `/api/lims/parse-rules/{id}` | lims | apps/web/src/api/lims/collection.ts | 66 |
| 1169 | GET | `/api/lims/dashboard` | lims | apps/web/src/api/lims/dashboard.ts | 16 |
| 1170 | GET | `/api/lims/statistics` | lims | apps/web/src/api/lims/index.ts | 235 |
| 1171 | GET | `/api/lims/health` | lims | apps/web/src/api/lims/index.ts | 239 |
| 1172 | GET | `/api/lims/tasks/sample/{sampleId}` | lims | apps/web/src/api/lims/inspection.ts | 38 |
| 1173 | POST | `/api/lims/tasks/{id}/complete_step` | lims | apps/web/src/api/lims/inspection.ts | 45 |
| 1174 | POST | `/api/lims/tasks/{id}/submit-result` | lims | apps/web/src/api/lims/inspection.ts | 55 |
| 1175 | GET | `/api/lims/records/task/{taskId}` | lims | apps/web/src/api/lims/inspection.ts | 72 |
| 1176 | POST | `/api/lims/instruments/{id}/calibrate` | lims | apps/web/src/api/lims/instrument.ts | 39 |
| 1177 | GET | `/api/lims/instruments/{instrumentId}/calibrations` | lims | apps/web/src/api/lims/instrument.ts | 45 |
| 1178 | GET | `/api/lims/instruments/{instrumentId}/maintenance` | lims | apps/web/src/api/lims/instrument.ts | 51 |
| 1179 | POST | `/api/lims/maintenance` | lims | apps/web/src/api/lims/instrument.ts | 55 |
| 1180 | PUT | `/api/lims/maintenance/{id}` | lims | apps/web/src/api/lims/instrument.ts | 62 |
| 1181 | DELETE | `/api/lims/maintenance/{id}` | lims | apps/web/src/api/lims/instrument.ts | 66 |
| 1182 | GET | `/api/lims/instrument-data` | lims | apps/web/src/api/lims/instrument.ts | 72 |
| 1183 | GET | `/api/lims/instrument-data/{id}` | lims | apps/web/src/api/lims/instrument.ts | 76 |
| 1184 | POST | `/api/lims/instrument-data` | lims | apps/web/src/api/lims/instrument.ts | 82 |
| 1185 | PUT | `/api/lims/instrument-data/{id}` | lims | apps/web/src/api/lims/instrument.ts | 89 |
| 1186 | DELETE | `/api/lims/instrument-data/{id}` | lims | apps/web/src/api/lims/instrument.ts | 93 |
| 1187 | POST | `/api/lims/instrument-data/{id}/parse` | lims | apps/web/src/api/lims/instrument.ts | 97 |
| 1188 | POST | `/api/lims/instrument-data/parse/test` | lims | apps/web/src/api/lims/instrument.ts | 101 |
| 1189 | GET | `/api/lims/instrument-data/statistics` | lims | apps/web/src/api/lims/instrument.ts | 105 |
| 1190 | GET | `/api/lims/pt-plans/{planId}/samples` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 35 |
| 1191 | GET | `/api/lims/pt-plans/{planId}/results` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 39 |
| 1192 | GET | `/api/lims/pt-plans/{planId}/evaluations` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 43 |
| 1193 | GET | `/api/lims/pt-plans/{planId}/corrective-actions` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 47 |
| 1194 | POST | `/api/lims/pt-samples/receive` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 53 |
| 1195 | POST | `/api/lims/pt-results` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 59 |
| 1196 | POST | `/api/lims/pt-evaluations` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 65 |
| 1197 | POST | `/api/lims/pt-corrective-actions` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 73 |
| 1198 | PUT | `/api/lims/pt-corrective-actions/{id}` | lims | apps/web/src/api/lims/proficiencyTesting.ts | 80 |
| 1199 | GET | `/api/lims/reagents/low-stock` | lims | apps/web/src/api/lims/reagent.ts | 21 |
| 1200 | GET | `/api/lims/reagents/expiring` | lims | apps/web/src/api/lims/reagent.ts | 25 |
| 1201 | POST | `/api/lims/samples/batch` | lims | apps/web/src/api/lims/sample.ts | 37 |
| 1202 | DELETE | `/api/lims/samples/batch` | lims | apps/web/src/api/lims/sample.ts | 43 |
| 1203 | POST | `/api/lims/samples/import` | lims | apps/web/src/api/lims/sample.ts | 53 |
| 1204 | GET | `/api/lims/samples/{sampleId}/lifecycle` | lims | apps/web/src/api/lims/sample.ts | 61 |
| 1205 | POST | `/api/lims/samples/lifecycle-event` | lims | apps/web/src/api/lims/sample.ts | 67 |
| 1206 | POST | `/api/lims/samples/{sampleId}/transition-stage` | lims | apps/web/src/api/lims/sample.ts | 74 |
| 1207 | GET | `/api/lims/samples/{sampleId}/traceability` | lims | apps/web/src/api/lims/sample.ts | 78 |
| 1208 | GET | `/api/lims/lifecycle-stages` | lims | apps/web/src/api/lims/sample.ts | 84 |
| 1209 | GET | `/api/lims/lifecycle-stages/{id}` | lims | apps/web/src/api/lims/sample.ts | 88 |
| 1210 | GET | `/api/lims/sync-records` | lims | apps/web/src/api/lims/sync.ts | 9 |
| 1211 | GET | `/api/lims/sync-records/{id}` | lims | apps/web/src/api/lims/sync.ts | 13 |
| 1212 | DELETE | `/api/lims/sync-records/{id}` | lims | apps/web/src/api/lims/sync.ts | 17 |
| 1213 | POST | `/api/lims/sync-records/{id}/retry` | lims | apps/web/src/api/lims/sync.ts | 21 |
| 1214 | POST | `/api/lims/sync/record-to-qms` | lims | apps/web/src/api/lims/sync.ts | 25 |
| 1215 | POST | `/api/lims/sync/reagent-to-ehs` | lims | apps/web/src/api/lims/sync.ts | 29 |
| 1216 | GET | `/api/lims/test-methods/{methodId}/versions` | lims | apps/web/src/api/lims/testMethod.ts | 34 |
| 1217 | POST | `/api/lims/test-methods/{methodId}/new-version` | lims | apps/web/src/api/lims/testMethod.ts | 41 |
| 1218 | GET | `/api/lims/method-categories` | lims | apps/web/src/api/lims/testMethod.ts | 47 |
| 1219 | POST | `/api/lims/method-categories` | lims | apps/web/src/api/lims/testMethod.ts | 53 |
| 1220 | PUT | `/api/lims/method-categories/{id}` | lims | apps/web/src/api/lims/testMethod.ts | 60 |
| 1221 | DELETE | `/api/lims/method-categories/{id}` | lims | apps/web/src/api/lims/testMethod.ts | 64 |
| 1222 | GET | `/api/lims/method-validations` | lims | apps/web/src/api/lims/testMethod.ts | 70 |
| 1223 | POST | `/api/lims/method-validations` | lims | apps/web/src/api/lims/testMethod.ts | 76 |
| 1224 | GET | `/api/lims/uncertainty-projects/{projectId}/sources` | lims | apps/web/src/api/lims/uncertainty.ts | 42 |
| 1225 | POST | `/api/lims/uncertainty-sources` | lims | apps/web/src/api/lims/uncertainty.ts | 48 |
| 1226 | PUT | `/api/lims/uncertainty-sources/{id}` | lims | apps/web/src/api/lims/uncertainty.ts | 55 |
| 1227 | DELETE | `/api/lims/uncertainty-sources/{id}` | lims | apps/web/src/api/lims/uncertainty.ts | 59 |
| 1228 | GET | `/api/lims/uncertainty-projects/{projectId}/components` | lims | apps/web/src/api/lims/uncertainty.ts | 67 |
| 1229 | POST | `/api/lims/uncertainty-components` | lims | apps/web/src/api/lims/uncertainty.ts | 73 |
| 1230 | PUT | `/api/lims/uncertainty-components/{id}` | lims | apps/web/src/api/lims/uncertainty.ts | 80 |
| 1231 | DELETE | `/api/lims/uncertainty-components/{id}` | lims | apps/web/src/api/lims/uncertainty.ts | 84 |
| 1232 | POST | `/api/lims/uncertainty/type-a` | lims | apps/web/src/api/lims/uncertainty.ts | 90 |
| 1233 | POST | `/api/lims/uncertainty/type-b` | lims | apps/web/src/api/lims/uncertainty.ts | 96 |
| 1234 | POST | `/api/lims/uncertainty-projects/{projectId}/combined` | lims | apps/web/src/api/lims/uncertainty.ts | 102 |
| 1235 | GET | `/api/lims/uncertainty-projects/{projectId}/report` | lims | apps/web/src/api/lims/uncertainty.ts | 106 |
| 1236 | GET | `/api/lims/{endpoint}/{id}` | lims | apps/web/src/api/lims/utils.ts | 35 |
| 1237 | PUT | `/api/lims/{endpoint}/{id}` | lims | apps/web/src/api/lims/utils.ts | 43 |
| 1238 | DELETE | `/api/lims/{endpoint}/{id}` | lims | apps/web/src/api/lims/utils.ts | 47 |
| 1239 | GET | `/api/lowcode/apps${qs ` | lowcode | apps/web/src/api/lowcode/apps.ts | 21 |
| 1240 | GET | `/api/lowcode/apps/{id}` | lowcode | apps/web/src/api/lowcode/apps.ts | 27 |
| 1241 | PUT | `/api/lowcode/apps/{id}` | lowcode | apps/web/src/api/lowcode/apps.ts | 35 |
| 1242 | DELETE | `/api/lowcode/apps/{id}` | lowcode | apps/web/src/api/lowcode/apps.ts | 39 |
| 1243 | POST | `/api/lowcode/apps/{id}/publish` | lowcode | apps/web/src/api/lowcode/apps.ts | 43 |
| 1244 | POST | `/api/lowcode/apps/{id}/unpublish` | lowcode | apps/web/src/api/lowcode/apps.ts | 47 |
| 1245 | POST | `/api/lowcode/apps/{id}/duplicate` | lowcode | apps/web/src/api/lowcode/apps.ts | 51 |
| 1246 | GET | `/api/lowcode/apps/{id}/export` | lowcode | apps/web/src/api/lowcode/apps.ts | 55 |
| 1247 | POST | `/api/lowcode/apps/import` | lowcode | apps/web/src/api/lowcode/apps.ts | 59 |
| 1248 | GET | `/api/lowcode/data-models${qs ` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 21 |
| 1249 | GET | `/api/lowcode/data-models/{id}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 27 |
| 1250 | POST | `/api/lowcode/data-models` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 31 |
| 1251 | PUT | `/api/lowcode/data-models/{id}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 38 |
| 1252 | DELETE | `/api/lowcode/data-models/{id}` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 42 |
| 1253 | POST | `/api/lowcode/data-models/{id}/materialize` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 47 |
| 1254 | GET | `/api/lowcode/apps/{appId}/data-models` | lowcode | apps/web/src/api/lowcode/dataModels.ts | 52 |
| 1255 | GET | `/api/lowcode/data-sources${qs ` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 22 |
| 1256 | GET | `/api/lowcode/data-sources/{id}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 28 |
| 1257 | POST | `/api/lowcode/data-sources` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 32 |
| 1258 | PUT | `/api/lowcode/data-sources/{id}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 39 |
| 1259 | DELETE | `/api/lowcode/data-sources/{id}` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 43 |
| 1260 | POST | `/api/lowcode/data-sources/test` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 50 |
| 1261 | POST | `/api/lowcode/data-sources/{id}/test` | lowcode | apps/web/src/api/lowcode/dataSources.ts | 55 |
| 1262 | GET | `/api/lowcode/forms${qs ` | lowcode | apps/web/src/api/lowcode/forms.ts | 22 |
| 1263 | GET | `/api/lowcode/forms/{id}` | lowcode | apps/web/src/api/lowcode/forms.ts | 28 |
| 1264 | POST | `/api/lowcode/forms` | lowcode | apps/web/src/api/lowcode/forms.ts | 32 |
| 1265 | PUT | `/api/lowcode/forms/{id}` | lowcode | apps/web/src/api/lowcode/forms.ts | 36 |
| 1266 | DELETE | `/api/lowcode/forms/{id}` | lowcode | apps/web/src/api/lowcode/forms.ts | 40 |
| 1267 | POST | `/api/lowcode/forms/{id}/publish` | lowcode | apps/web/src/api/lowcode/forms.ts | 45 |
| 1268 | GET | `/api/lowcode/forms/{id}/preview` | lowcode | apps/web/src/api/lowcode/forms.ts | 50 |
| 1269 | GET | `/api/lowcode/apps/{appId}/forms` | lowcode | apps/web/src/api/lowcode/forms.ts | 55 |
| 1270 | GET | `/api/lowcode/dashboard/stats` | lowcode | apps/web/src/api/lowcode/index.ts | 36 |
| 1271 | GET | `/api/lowcode/pages${qs ` | lowcode | apps/web/src/api/lowcode/pages.ts | 24 |
| 1272 | GET | `/api/lowcode/pages/{id}` | lowcode | apps/web/src/api/lowcode/pages.ts | 30 |
| 1273 | POST | `/api/lowcode/pages` | lowcode | apps/web/src/api/lowcode/pages.ts | 34 |
| 1274 | PUT | `/api/lowcode/pages/{id}` | lowcode | apps/web/src/api/lowcode/pages.ts | 38 |
| 1275 | DELETE | `/api/lowcode/pages/{id}` | lowcode | apps/web/src/api/lowcode/pages.ts | 42 |
| 1276 | POST | `/api/lowcode/pages/{id}/publish` | lowcode | apps/web/src/api/lowcode/pages.ts | 47 |
| 1277 | GET | `/api/lowcode/pages/{id}/preview` | lowcode | apps/web/src/api/lowcode/pages.ts | 52 |
| 1278 | POST | `/api/lowcode/pages/{id}/set-home` | lowcode | apps/web/src/api/lowcode/pages.ts | 57 |
| 1279 | GET | `/api/lowcode/apps/{appId}/pages` | lowcode | apps/web/src/api/lowcode/pages.ts | 62 |
| 1280 | POST | `/api/lowcode/pages/{pageId}/on-form-submit` | lowcode | apps/web/src/api/lowcode/pages.ts | 79 |
| 1281 | GET | `/api/lowcode/workflows${qs ` | lowcode | apps/web/src/api/lowcode/workflows.ts | 24 |
| 1282 | GET | `/api/lowcode/workflows/{id}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 30 |
| 1283 | POST | `/api/lowcode/workflows` | lowcode | apps/web/src/api/lowcode/workflows.ts | 34 |
| 1284 | PUT | `/api/lowcode/workflows/{id}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 41 |
| 1285 | DELETE | `/api/lowcode/workflows/{id}` | lowcode | apps/web/src/api/lowcode/workflows.ts | 45 |
| 1286 | POST | `/api/lowcode/workflows/{id}/enable` | lowcode | apps/web/src/api/lowcode/workflows.ts | 50 |
| 1287 | POST | `/api/lowcode/workflows/{id}/disable` | lowcode | apps/web/src/api/lowcode/workflows.ts | 55 |
| 1288 | GET | `/api/lowcode/apps/{appId}/workflows` | lowcode | apps/web/src/api/lowcode/workflows.ts | 60 |
| 1289 | GET | `/api/communication/mail/emails${queryString ` | mail | apps/web/src/api/mail/index.ts | 100 |
| 1290 | GET | `/api/communication/mail/emails/{id}` | mail | apps/web/src/api/mail/index.ts | 104 |
| 1291 | POST | `/api/communication/mail/emails/send-with-template` | mail | apps/web/src/api/mail/index.ts | 112 |
| 1292 | DELETE | `/api/communication/mail/emails/{id}` | mail | apps/web/src/api/mail/index.ts | 116 |
| 1293 | POST | `/api/communication/mail/emails/resend` | mail | apps/web/src/api/mail/index.ts | 120 |
| 1294 | GET | `/api/communication/mail/emails/stats` | mail | apps/web/src/api/mail/index.ts | 126 |
| 1295 | GET | `/api/communication/mail/templates${queryString ` | mail | apps/web/src/api/mail/index.ts | 140 |
| 1296 | GET | `/api/communication/mail/templates/{id}` | mail | apps/web/src/api/mail/index.ts | 144 |
| 1297 | POST | `/api/communication/mail/templates` | mail | apps/web/src/api/mail/index.ts | 148 |
| 1298 | PUT | `/api/communication/mail/templates/{id}` | mail | apps/web/src/api/mail/index.ts | 152 |
| 1299 | DELETE | `/api/communication/mail/templates/{id}` | mail | apps/web/src/api/mail/index.ts | 156 |
| 1300 | PUT | `/api/communication/mail/templates/{id}/status` | mail | apps/web/src/api/mail/index.ts | 160 |
| 1301 | POST | `/api/communication/mail/templates/render` | mail | apps/web/src/api/mail/index.ts | 169 |
| 1302 | GET | `/api/communication/mail/health` | mail | apps/web/src/api/mail/index.ts | 178 |
| 1303 | POST | `/api/master-data/{BASE_PATH}/schemas` | master | apps/web/src/api/master/schemaRegistry.ts | 70 |
| 1304 | GET | `/api/master-data/{BASE_PATH}/schemas` | master | apps/web/src/api/master/schemaRegistry.ts | 76 |
| 1305 | GET | `/api/master-data/{BASE_PATH}/schemas/{id}` | master | apps/web/src/api/master/schemaRegistry.ts | 80 |
| 1306 | PUT | `/api/master-data/{BASE_PATH}/schemas/{id}` | master | apps/web/src/api/master/schemaRegistry.ts | 87 |
| 1307 | DELETE | `/api/master-data/{BASE_PATH}/schemas/{id}` | master | apps/web/src/api/master/schemaRegistry.ts | 91 |
| 1308 | POST | `/api/master-data/{BASE_PATH}/schemas/{schemaId}/data` | master | apps/web/src/api/master/schemaRegistry.ts | 99 |
| 1309 | GET | `/api/master-data/{BASE_PATH}/schemas/{schemaId}/data` | master | apps/web/src/api/master/schemaRegistry.ts | 110 |
| 1310 | GET | `/api/master-data/{BASE_PATH}/schemas/{schemaId}/data/{recordId}` | master | apps/web/src/api/master/schemaRegistry.ts | 114 |
| 1311 | PUT | `/api/master-data/{BASE_PATH}/schemas/{schemaId}/data/{recordId}` | master | apps/web/src/api/master/schemaRegistry.ts | 122 |
| 1312 | DELETE | `/api/master-data/{BASE_PATH}/schemas/{schemaId}/data/{recordId}` | master | apps/web/src/api/master/schemaRegistry.ts | 126 |
| 1313 | GET | `/api/mes/anomaly/alerts` | mes | apps/web/src/api/mes/anomalyDetection.ts | 86 |
| 1314 | GET | `/api/mes/anomaly/summary` | mes | apps/web/src/api/mes/anomalyDetection.ts | 91 |
| 1315 | GET | `/api/mes/anomaly/equipment/{equipmentId}` | mes | apps/web/src/api/mes/anomalyDetection.ts | 96 |
| 1316 | GET | `/api/mes/anomaly/rules` | mes | apps/web/src/api/mes/anomalyDetection.ts | 101 |
| 1317 | GET | `/api/mes/anomaly/rules/{ruleId}` | mes | apps/web/src/api/mes/anomalyDetection.ts | 106 |
| 1318 | PUT | `/api/mes/anomaly/rules` | mes | apps/web/src/api/mes/anomalyDetection.ts | 111 |
| 1319 | POST | `/api/mes/anomaly/scan` | mes | apps/web/src/api/mes/anomalyDetection.ts | 116 |
| 1320 | GET | `/api/mes/anomaly/trend` | mes | apps/web/src/api/mes/anomalyDetection.ts | 124 |
| 1321 | POST | `/api/mes/aps/schedule` | mes | apps/web/src/api/mes/aps.ts | 166 |
| 1322 | POST | `/api/mes/aps/schedule/simulate` | mes | apps/web/src/api/mes/aps.ts | 170 |
| 1323 | POST | `/api/mes/aps/schedule/check-constraints` | mes | apps/web/src/api/mes/aps.ts | 176 |
| 1324 | GET | `/api/mes/aps/schedule/optimization-report` | mes | apps/web/src/api/mes/aps.ts | 180 |
| 1325 | GET | `/api/mes/aps/schedule/bottleneck-analysis{query}` | mes | apps/web/src/api/mes/aps.ts | 185 |
| 1326 | GET | `/api/mes/aps/orders/{orderId}/feasibility` | mes | apps/web/src/api/mes/aps.ts | 189 |
| 1327 | GET | `/api/mes/equipment${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 39 |
| 1328 | GET | `/api/mes/equipment/{id}` | mes | apps/web/src/api/mes/equipment.ts | 43 |
| 1329 | POST | `/api/mes/equipment` | mes | apps/web/src/api/mes/equipment.ts | 47 |
| 1330 | PUT | `/api/mes/equipment/{id}` | mes | apps/web/src/api/mes/equipment.ts | 51 |
| 1331 | DELETE | `/api/mes/equipment/{id}` | mes | apps/web/src/api/mes/equipment.ts | 55 |
| 1332 | POST | `/api/mes/equipment/{id}/maintenance` | mes | apps/web/src/api/mes/equipment.ts | 62 |
| 1333 | GET | `/api/mes/equipment/statistics` | mes | apps/web/src/api/mes/equipment.ts | 66 |
| 1334 | GET | `/api/mes/equipment/statistics` | mes | apps/web/src/api/mes/equipment.ts | 72 |
| 1335 | GET | `/api/mes/inspections${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 84 |
| 1336 | POST | `/api/mes/inspections` | mes | apps/web/src/api/mes/equipment.ts | 88 |
| 1337 | GET | `/api/mes/maintenances${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 100 |
| 1338 | POST | `/api/mes/maintenances` | mes | apps/web/src/api/mes/equipment.ts | 104 |
| 1339 | PUT | `/api/mes/maintenances/{id}/status` | mes | apps/web/src/api/mes/equipment.ts | 111 |
| 1340 | GET | `/api/mes/equipment-oee${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 134 |
| 1341 | GET | `/api/mes/equipment-oee/{id}` | mes | apps/web/src/api/mes/equipment.ts | 138 |
| 1342 | POST | `/api/mes/equipment-oee` | mes | apps/web/src/api/mes/equipment.ts | 142 |
| 1343 | PUT | `/api/mes/equipment-oee/{id}` | mes | apps/web/src/api/mes/equipment.ts | 146 |
| 1344 | DELETE | `/api/mes/equipment-oee/{id}` | mes | apps/web/src/api/mes/equipment.ts | 150 |
| 1345 | GET | `/api/mes/equipment-oee/statistics${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 164 |
| 1346 | GET | `/api/mes/equipment-oee/{equipmentId}/efficiency${queryString ` | mes | apps/web/src/api/mes/equipment.ts | 177 |
| 1347 | GET | `/api/mes/health` | mes | apps/web/src/api/mes/index.ts | 72 |
| 1348 | GET | `/api/mes/boms${queryString ` | mes | apps/web/src/api/mes/material.ts | 30 |
| 1349 | GET | `/api/mes/boms/{id}` | mes | apps/web/src/api/mes/material.ts | 34 |
| 1350 | POST | `/api/mes/boms` | mes | apps/web/src/api/mes/material.ts | 38 |
| 1351 | PUT | `/api/mes/boms/{id}` | mes | apps/web/src/api/mes/material.ts | 42 |
| 1352 | DELETE | `/api/mes/boms/{id}` | mes | apps/web/src/api/mes/material.ts | 46 |
| 1353 | GET | `/api/mes/material-issues${queryString ` | mes | apps/web/src/api/mes/material.ts | 66 |
| 1354 | POST | `/api/mes/material-issues` | mes | apps/web/src/api/mes/material.ts | 70 |
| 1355 | GET | `/api/mes/material-returns${queryString ` | mes | apps/web/src/api/mes/material.ts | 90 |
| 1356 | POST | `/api/mes/material-returns` | mes | apps/web/src/api/mes/material.ts | 94 |
| 1357 | GET | `/api/mes/material-requirements${queryString ` | mes | apps/web/src/api/mes/materialRequirement.ts | 26 |
| 1358 | GET | `/api/mes/material-requirements/{id}` | mes | apps/web/src/api/mes/materialRequirement.ts | 30 |
| 1359 | POST | `/api/mes/material-requirements` | mes | apps/web/src/api/mes/materialRequirement.ts | 34 |
| 1360 | PUT | `/api/mes/material-requirements/{id}` | mes | apps/web/src/api/mes/materialRequirement.ts | 41 |
| 1361 | DELETE | `/api/mes/material-requirements/{id}` | mes | apps/web/src/api/mes/materialRequirement.ts | 45 |
| 1362 | POST | `/api/mes/material-requirements/calculate` | mes | apps/web/src/api/mes/materialRequirement.ts | 49 |
| 1363 | PUT | `/api/mes/material-requirements/{id}/confirm` | mes | apps/web/src/api/mes/materialRequirement.ts | 53 |
| 1364 | PUT | `/api/mes/material-requirements/{id}/release` | mes | apps/web/src/api/mes/materialRequirement.ts | 57 |
| 1365 | GET | `/api/mes/process-routes${queryString ` | mes | apps/web/src/api/mes/process.ts | 86 |
| 1366 | GET | `/api/mes/process-routes/{id}` | mes | apps/web/src/api/mes/process.ts | 90 |
| 1367 | POST | `/api/mes/process-routes` | mes | apps/web/src/api/mes/process.ts | 94 |
| 1368 | PUT | `/api/mes/process-routes/{id}` | mes | apps/web/src/api/mes/process.ts | 98 |
| 1369 | DELETE | `/api/mes/process-routes/{id}` | mes | apps/web/src/api/mes/process.ts | 102 |
| 1370 | GET | `/api/mes/process-routes/{routeId}/steps` | mes | apps/web/src/api/mes/process.ts | 106 |
| 1371 | POST | `/api/mes/process-routes/{routeId}/steps` | mes | apps/web/src/api/mes/process.ts | 113 |
| 1372 | PUT | `/api/mes/process-routes/{routeId}/steps/{stepId}` | mes | apps/web/src/api/mes/process.ts | 121 |
| 1373 | DELETE | `/api/mes/process-routes/{routeId}/steps/{stepId}` | mes | apps/web/src/api/mes/process.ts | 125 |
| 1374 | PUT | `/api/mes/process-routes/{routeId}/steps/reorder` | mes | apps/web/src/api/mes/process.ts | 132 |
| 1375 | GET | `/api/mes/process-flows${queryString ` | mes | apps/web/src/api/mes/processFlow.ts | 123 |
| 1376 | GET | `/api/mes/process-flows/{id}` | mes | apps/web/src/api/mes/processFlow.ts | 127 |
| 1377 | POST | `/api/mes/process-flows` | mes | apps/web/src/api/mes/processFlow.ts | 131 |
| 1378 | PUT | `/api/mes/process-flows/{id}` | mes | apps/web/src/api/mes/processFlow.ts | 135 |
| 1379 | DELETE | `/api/mes/process-flows/{id}` | mes | apps/web/src/api/mes/processFlow.ts | 139 |
| 1380 | GET | `/api/mes/process-flows/{flowId}/steps` | mes | apps/web/src/api/mes/processFlow.ts | 143 |
| 1381 | POST | `/api/mes/process-flows/{flowId}/steps` | mes | apps/web/src/api/mes/processFlow.ts | 150 |
| 1382 | PUT | `/api/mes/process-flows/{flowId}/steps/{stepId}` | mes | apps/web/src/api/mes/processFlow.ts | 158 |
| 1383 | DELETE | `/api/mes/process-flows/{flowId}/steps/{stepId}` | mes | apps/web/src/api/mes/processFlow.ts | 162 |
| 1384 | GET | `/api/mes/process-flows/{flowId}/capacity` | mes | apps/web/src/api/mes/processFlow.ts | 166 |
| 1385 | GET | `/api/mes/kanban/dashboard` | mes | apps/web/src/api/mes/productionKanban.ts | 7 |
| 1386 | GET | `/api/mes/kanban/order-progress${queryString ` | mes | apps/web/src/api/mes/productionKanban.ts | 26 |
| 1387 | GET | `/api/mes/kanban/workstation-status` | mes | apps/web/src/api/mes/productionKanban.ts | 42 |
| 1388 | GET | `/api/mes/kanban/quality-trend${queryString ` | mes | apps/web/src/api/mes/productionKanban.ts | 58 |
| 1389 | GET | `/api/mes/kanban/equipment-status` | mes | apps/web/src/api/mes/productionKanban.ts | 72 |
| 1390 | GET | `/api/mes/orders${queryString ` | mes | apps/web/src/api/mes/productionOrder.ts | 27 |
| 1391 | GET | `/api/mes/orders/{id}` | mes | apps/web/src/api/mes/productionOrder.ts | 31 |
| 1392 | POST | `/api/mes/orders` | mes | apps/web/src/api/mes/productionOrder.ts | 35 |
| 1393 | PUT | `/api/mes/orders/{id}` | mes | apps/web/src/api/mes/productionOrder.ts | 42 |
| 1394 | DELETE | `/api/mes/orders/{id}` | mes | apps/web/src/api/mes/productionOrder.ts | 46 |
| 1395 | PUT | `/api/mes/orders/{id}/release` | mes | apps/web/src/api/mes/productionOrder.ts | 50 |
| 1396 | PUT | `/api/mes/orders/{id}/start` | mes | apps/web/src/api/mes/productionOrder.ts | 54 |
| 1397 | PUT | `/api/mes/orders/{id}/complete` | mes | apps/web/src/api/mes/productionOrder.ts | 58 |
| 1398 | PUT | `/api/mes/orders/{id}/cancel` | mes | apps/web/src/api/mes/productionOrder.ts | 62 |
| 1399 | POST | `/api/mes/orders/from-erp` | mes | apps/web/src/api/mes/productionOrder.ts | 66 |
| 1400 | GET | `/api/mes/processes${queryString ` | mes | apps/web/src/api/mes/productionProcess.ts | 26 |
| 1401 | GET | `/api/mes/processes/{id}` | mes | apps/web/src/api/mes/productionProcess.ts | 30 |
| 1402 | POST | `/api/mes/processes` | mes | apps/web/src/api/mes/productionProcess.ts | 34 |
| 1403 | PUT | `/api/mes/processes/{id}` | mes | apps/web/src/api/mes/productionProcess.ts | 41 |
| 1404 | DELETE | `/api/mes/processes/{id}` | mes | apps/web/src/api/mes/productionProcess.ts | 45 |
| 1405 | PUT | `/api/mes/processes/{id}/deactivate` | mes | apps/web/src/api/mes/productionProcess.ts | 49 |
| 1406 | GET | `/api/mes/records${queryString ` | mes | apps/web/src/api/mes/productionRecord.ts | 26 |
| 1407 | GET | `/api/mes/records/{id}` | mes | apps/web/src/api/mes/productionRecord.ts | 30 |
| 1408 | POST | `/api/mes/records` | mes | apps/web/src/api/mes/productionRecord.ts | 34 |
| 1409 | PUT | `/api/mes/records/{id}` | mes | apps/web/src/api/mes/productionRecord.ts | 41 |
| 1410 | DELETE | `/api/mes/records/{id}` | mes | apps/web/src/api/mes/productionRecord.ts | 45 |
| 1411 | PUT | `/api/mes/records/{id}/complete` | mes | apps/web/src/api/mes/productionRecord.ts | 49 |
| 1412 | GET | `/api/mes/schedules${queryString ` | mes | apps/web/src/api/mes/productionSchedule.ts | 28 |
| 1413 | GET | `/api/mes/schedules/{id}` | mes | apps/web/src/api/mes/productionSchedule.ts | 32 |
| 1414 | POST | `/api/mes/schedules` | mes | apps/web/src/api/mes/productionSchedule.ts | 36 |
| 1415 | PUT | `/api/mes/schedules/{id}` | mes | apps/web/src/api/mes/productionSchedule.ts | 43 |
| 1416 | DELETE | `/api/mes/schedules/{id}` | mes | apps/web/src/api/mes/productionSchedule.ts | 47 |
| 1417 | PUT | `/api/mes/schedules/{id}/adjust` | mes | apps/web/src/api/mes/productionSchedule.ts | 51 |
| 1418 | GET | `/api/mes/schedules/gantt${queryString ` | mes | apps/web/src/api/mes/productionSchedule.ts | 65 |
| 1419 | GET | `/api/mes/quality/inspections${queryString ` | mes | apps/web/src/api/mes/quality.ts | 171 |
| 1420 | GET | `/api/mes/quality/inspections/{id}` | mes | apps/web/src/api/mes/quality.ts | 175 |
| 1421 | POST | `/api/mes/quality/inspections` | mes | apps/web/src/api/mes/quality.ts | 181 |
| 1422 | PUT | `/api/mes/quality/inspections/{id}` | mes | apps/web/src/api/mes/quality.ts | 188 |
| 1423 | DELETE | `/api/mes/quality/inspections/{id}` | mes | apps/web/src/api/mes/quality.ts | 192 |
| 1424 | GET | `/api/mes/quality/patrols${queryString ` | mes | apps/web/src/api/mes/quality.ts | 210 |
| 1425 | GET | `/api/mes/quality/patrols/{id}` | mes | apps/web/src/api/mes/quality.ts | 214 |
| 1426 | POST | `/api/mes/quality/patrols` | mes | apps/web/src/api/mes/quality.ts | 220 |
| 1427 | PUT | `/api/mes/quality/patrols/{id}` | mes | apps/web/src/api/mes/quality.ts | 227 |
| 1428 | DELETE | `/api/mes/quality/patrols/{id}` | mes | apps/web/src/api/mes/quality.ts | 231 |
| 1429 | GET | `/api/mes/quality/patrols/{patrolId}/items` | mes | apps/web/src/api/mes/quality.ts | 235 |
| 1430 | POST | `/api/mes/quality/patrols/{patrolId}/items` | mes | apps/web/src/api/mes/quality.ts | 242 |
| 1431 | GET | `/api/mes/quality/standards${queryString ` | mes | apps/web/src/api/mes/quality.ts | 260 |
| 1432 | GET | `/api/mes/quality/standards/{id}` | mes | apps/web/src/api/mes/quality.ts | 264 |
| 1433 | POST | `/api/mes/quality/standards` | mes | apps/web/src/api/mes/quality.ts | 268 |
| 1434 | PUT | `/api/mes/quality/standards/{id}` | mes | apps/web/src/api/mes/quality.ts | 275 |
| 1435 | DELETE | `/api/mes/quality/standards/{id}` | mes | apps/web/src/api/mes/quality.ts | 279 |
| 1436 | GET | `/api/mes/teams${queryString ` | mes | apps/web/src/api/mes/team.ts | 27 |
| 1437 | GET | `/api/mes/teams/{id}` | mes | apps/web/src/api/mes/team.ts | 31 |
| 1438 | POST | `/api/mes/teams` | mes | apps/web/src/api/mes/team.ts | 35 |
| 1439 | PUT | `/api/mes/teams/{id}` | mes | apps/web/src/api/mes/team.ts | 39 |
| 1440 | DELETE | `/api/mes/teams/{id}` | mes | apps/web/src/api/mes/team.ts | 43 |
| 1441 | GET | `/api/mes/teams/{teamId}/members` | mes | apps/web/src/api/mes/team.ts | 47 |
| 1442 | POST | `/api/mes/teams/{teamId}/members` | mes | apps/web/src/api/mes/team.ts | 54 |
| 1443 | DELETE | `/api/mes/teams/{teamId}/members/{memberId}` | mes | apps/web/src/api/mes/team.ts | 58 |
| 1444 | GET | `/api/mes/traceability/forward/{orderId}` | mes | apps/web/src/api/mes/traceability.ts | 7 |
| 1445 | GET | `/api/mes/traceability/backward/{batchNo}` | mes | apps/web/src/api/mes/traceability.ts | 11 |
| 1446 | GET | `/api/mes/traceability/chain${queryString ` | mes | apps/web/src/api/mes/traceability.ts | 23 |
| 1447 | GET | `/api/mes/traceability/quality-records${queryString ` | mes | apps/web/src/api/mes/traceability.ts | 41 |
| 1448 | GET | `/api/mes/wips${queryString ` | mes | apps/web/src/api/mes/wip.ts | 29 |
| 1449 | GET | `/api/mes/wips/{id}` | mes | apps/web/src/api/mes/wip.ts | 33 |
| 1450 | POST | `/api/mes/wips` | mes | apps/web/src/api/mes/wip.ts | 37 |
| 1451 | PUT | `/api/mes/wips/{id}` | mes | apps/web/src/api/mes/wip.ts | 41 |
| 1452 | DELETE | `/api/mes/wips/{id}` | mes | apps/web/src/api/mes/wip.ts | 45 |
| 1453 | POST | `/api/mes/wips/transfer` | mes | apps/web/src/api/mes/wip.ts | 49 |
| 1454 | GET | `/api/mes/wips/transfers${queryString ` | mes | apps/web/src/api/mes/wip.ts | 66 |
| 1455 | GET | `/api/mes/wips/statistics` | mes | apps/web/src/api/mes/wip.ts | 70 |
| 1456 | GET | `/api/mes/work-orders${queryString ` | mes | apps/web/src/api/mes/workOrder.ts | 26 |
| 1457 | GET | `/api/mes/work-orders/{id}` | mes | apps/web/src/api/mes/workOrder.ts | 30 |
| 1458 | POST | `/api/mes/work-orders` | mes | apps/web/src/api/mes/workOrder.ts | 34 |
| 1459 | PUT | `/api/mes/work-orders/{id}` | mes | apps/web/src/api/mes/workOrder.ts | 38 |
| 1460 | DELETE | `/api/mes/work-orders/{id}` | mes | apps/web/src/api/mes/workOrder.ts | 42 |
| 1461 | PUT | `/api/mes/work-orders/{id}/start` | mes | apps/web/src/api/mes/workOrder.ts | 46 |
| 1462 | PUT | `/api/mes/work-orders/{id}/complete` | mes | apps/web/src/api/mes/workOrder.ts | 50 |
| 1463 | PUT | `/api/mes/work-orders/{id}/cancel` | mes | apps/web/src/api/mes/workOrder.ts | 54 |
| 1464 | PUT | `/api/mes/work-orders/{id}/pause` | mes | apps/web/src/api/mes/workOrder.ts | 58 |
| 1465 | PUT | `/api/mes/work-orders/{id}/resume` | mes | apps/web/src/api/mes/workOrder.ts | 62 |
| 1466 | GET | `/api/mes/work-reports${queryString ` | mes | apps/web/src/api/mes/workReport.ts | 26 |
| 1467 | GET | `/api/mes/work-reports/{id}` | mes | apps/web/src/api/mes/workReport.ts | 30 |
| 1468 | POST | `/api/mes/work-reports` | mes | apps/web/src/api/mes/workReport.ts | 34 |
| 1469 | PUT | `/api/mes/work-reports/{id}` | mes | apps/web/src/api/mes/workReport.ts | 38 |
| 1470 | DELETE | `/api/mes/work-reports/{id}` | mes | apps/web/src/api/mes/workReport.ts | 42 |
| 1471 | PUT | `/api/mes/work-reports/{id}/approve` | mes | apps/web/src/api/mes/workReport.ts | 46 |
| 1472 | PUT | `/api/mes/work-reports/{id}/reject` | mes | apps/web/src/api/mes/workReport.ts | 50 |
| 1473 | GET | `/api/mes/workstations${queryString ` | mes | apps/web/src/api/mes/workStation.ts | 26 |
| 1474 | GET | `/api/mes/workstations/{id}` | mes | apps/web/src/api/mes/workStation.ts | 30 |
| 1475 | POST | `/api/mes/workstations` | mes | apps/web/src/api/mes/workStation.ts | 34 |
| 1476 | PUT | `/api/mes/workstations/{id}` | mes | apps/web/src/api/mes/workStation.ts | 38 |
| 1477 | DELETE | `/api/mes/workstations/{id}` | mes | apps/web/src/api/mes/workStation.ts | 42 |
| 1478 | PUT | `/api/mes/workstations/{id}/activate` | mes | apps/web/src/api/mes/workStation.ts | 46 |
| 1479 | PUT | `/api/mes/workstations/{id}/deactivate` | mes | apps/web/src/api/mes/workStation.ts | 50 |
| 1480 | GET | `/api/core/migration/migrations/services` | migration | apps/web/src/api/migration/index.ts | 66 |
| 1481 | POST | `/api/core/migration/migrations/services/{encodeURIComponent(serviceName)}/apply` | migration | apps/web/src/api/migration/index.ts | 82 |
| 1482 | POST | `/api/core/migration/migrations/services/{encodeURIComponent(serviceName)}/rollback` | migration | apps/web/src/api/migration/index.ts | 97 |
| 1483 | GET | `/api/mobile/mobile/dashboard/stats` | mobile | apps/web/src/api/mobile/index.ts | 421 |
| 1484 | GET | `/api/mobile/mobile/workbench` | mobile | apps/web/src/api/mobile/index.ts | 425 |
| 1485 | POST | `/api/mobile/mobile/patrol-records` | mobile | apps/web/src/api/mobile/index.ts | 434 |
| 1486 | POST | `/api/mobile/mobile/scan-records` | mobile | apps/web/src/api/mobile/index.ts | 441 |
| 1487 | POST | `/api/mobile/mobile/scan` | mobile | apps/web/src/api/mobile/index.ts | 444 |
| 1488 | POST | `/api/mobile/mobile/photo-evidences` | mobile | apps/web/src/api/mobile/index.ts | 453 |
| 1489 | POST | `/api/mobile/mobile/audio-recordings` | mobile | apps/web/src/api/mobile/index.ts | 462 |
| 1490 | POST | `/api/mobile/mobile/video-recordings` | mobile | apps/web/src/api/mobile/index.ts | 471 |
| 1491 | POST | `/api/mobile/mobile/mobile-tasks` | mobile | apps/web/src/api/mobile/index.ts | 481 |
| 1492 | PUT | `/api/mobile/mobile/mobile-tasks/{id}/status` | mobile | apps/web/src/api/mobile/index.ts | 484 |
| 1493 | GET | `/api/mobile/attendance/stats` | mobile | apps/web/src/api/mobile/index.ts | 488 |
| 1494 | POST | `/api/mobile/attendance/check-in` | mobile | apps/web/src/api/mobile/index.ts | 504 |
| 1495 | POST | `/api/mobile/attendance/check-out` | mobile | apps/web/src/api/mobile/index.ts | 511 |
| 1496 | POST | `/api/mobile/attendance/leaves` | mobile | apps/web/src/api/mobile/index.ts | 523 |
| 1497 | GET | `/api/mobile/mobile/inventory/items/{id}` | mobile | apps/web/src/api/mobile/index.ts | 538 |
| 1498 | POST | `/api/mobile/mobile/inventory/stocktake/{taskId}/records` | mobile | apps/web/src/api/mobile/index.ts | 556 |
| 1499 | GET | `/api/mobile/mobile/quality/tasks/{id}` | mobile | apps/web/src/api/mobile/index.ts | 591 |
| 1500 | POST | `/api/mobile/mobile/quality/defects` | mobile | apps/web/src/api/mobile/index.ts | 604 |
| 1501 | PUT | `/api/mobile/mobile/quality/tasks/{id}/status` | mobile | apps/web/src/api/mobile/index.ts | 611 |
| 1502 | GET | `/api/mobile/mobile/production/orders/{id}` | mobile | apps/web/src/api/mobile/index.ts | 628 |
| 1503 | POST | `/api/mobile/mobile/production/work-reports` | mobile | apps/web/src/api/mobile/index.ts | 647 |
| 1504 | GET | `/api/mobile/mobile/push/config` | mobile | apps/web/src/api/mobile/index.ts | 660 |
| 1505 | PUT | `/api/mobile/mobile/push/config` | mobile | apps/web/src/api/mobile/index.ts | 664 |
| 1506 | PUT | `/api/mobile/mobile/push/templates/{id}` | mobile | apps/web/src/api/mobile/index.ts | 675 |
| 1507 | GET | `/api/mobile/mobile/offline/sync-status` | mobile | apps/web/src/api/mobile/index.ts | 679 |
| 1508 | POST | `/api/mobile/mobile/offline/sync` | mobile | apps/web/src/api/mobile/index.ts | 682 |
| 1509 | GET | `/api/mobile/health` | mobile | apps/web/src/api/mobile/index.ts | 686 |
| 1510 | GET | `/api/core/monitor/alerts` | monitor | apps/web/src/api/monitor/alertTyped.ts | 8 |
| 1511 | GET | `/api/core/monitor/alerts/{id}` | monitor | apps/web/src/api/monitor/alertTyped.ts | 9 |
| 1512 | PUT | `/api/core/monitor/alerts/{id}/acknowledge` | monitor | apps/web/src/api/monitor/alertTyped.ts | 10 |
| 1513 | PUT | `/api/core/monitor/alerts/{id}/resolve` | monitor | apps/web/src/api/monitor/alertTyped.ts | 11 |
| 1514 | GET | `/api/core/monitor/alerts` | monitor | apps/web/src/api/monitor/alertTyped.ts | 41 |
| 1515 | GET | `/api/core/monitor/alerts/{id}` | monitor | apps/web/src/api/monitor/alertTyped.ts | 50 |
| 1516 | GET | `/api/core/monitor/metrics/system` | monitor | apps/web/src/api/monitor/index.ts | 170 |
| 1517 | GET | `/api/core/monitor/health` | monitor | apps/web/src/api/monitor/index.ts | 178 |
| 1518 | GET | `/api/core/monitor/performance/api` | monitor | apps/web/src/api/monitor/index.ts | 186 |
| 1519 | GET | `/api/core/monitor/metrics/database` | monitor | apps/web/src/api/monitor/index.ts | 194 |
| 1520 | GET | `/api/core/monitor/alerts/{id}` | monitor | apps/web/src/api/monitor/index.ts | 217 |
| 1521 | PUT | `/api/core/monitor/alerts/{id}/acknowledge` | monitor | apps/web/src/api/monitor/index.ts | 225 |
| 1522 | PUT | `/api/core/monitor/alerts/{id}/resolve` | monitor | apps/web/src/api/monitor/index.ts | 233 |
| 1523 | GET | `/api/core/monitor/reports/performance` | monitor | apps/web/src/api/monitor/index.ts | 249 |
| 1524 | GET | `/api/core/monitor/metrics/realtime` | monitor | apps/web/src/api/monitor/index.ts | 257 |
| 1525 | GET | `/api/core/monitor/health` | monitor | apps/web/src/api/monitor/index.ts | 264 |
| 1526 | GET | `/api/core/monitor/metrics/test-retry` | monitor | apps/web/src/api/monitor/index.ts | 269 |
| 1527 | GET | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 9 |
| 1528 | GET | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 10 |
| 1529 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 11 |
| 1530 | PUT | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 12 |
| 1531 | DELETE | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 13 |
| 1532 | GET | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 44 |
| 1533 | GET | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 55 |
| 1534 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metricTyped.ts | 65 |
| 1535 | PUT | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 78 |
| 1536 | DELETE | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metricTyped.ts | 90 |
| 1537 | GET | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 226 |
| 1538 | POST | `/api/core/monitor/business-metrics` | monitor | apps/web/src/api/monitor/metrics.ts | 229 |
| 1539 | PUT | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 235 |
| 1540 | DELETE | `/api/core/monitor/business-metrics/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 238 |
| 1541 | GET | `/api/core/monitor/business-metrics/summary` | monitor | apps/web/src/api/monitor/metrics.ts | 241 |
| 1542 | GET | `/api/core/monitor/business-metrics/trend` | monitor | apps/web/src/api/monitor/metrics.ts | 247 |
| 1543 | GET | `/api/core/monitor/business-metrics/kpi` | monitor | apps/web/src/api/monitor/metrics.ts | 255 |
| 1544 | GET | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 266 |
| 1545 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/metrics.ts | 269 |
| 1546 | PUT | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 272 |
| 1547 | DELETE | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 275 |
| 1548 | GET | `/api/core/monitor/slos/summary` | monitor | apps/web/src/api/monitor/metrics.ts | 278 |
| 1549 | GET | `/api/core/monitor/slos/budget` | monitor | apps/web/src/api/monitor/metrics.ts | 281 |
| 1550 | GET | `/api/core/monitor/slos/trend` | monitor | apps/web/src/api/monitor/metrics.ts | 284 |
| 1551 | POST | `/api/core/monitor/slos/violations/{id}/resolve` | monitor | apps/web/src/api/monitor/metrics.ts | 300 |
| 1552 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/metrics.ts | 306 |
| 1553 | GET | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 309 |
| 1554 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/metrics.ts | 312 |
| 1555 | PUT | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 318 |
| 1556 | DELETE | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/metrics.ts | 321 |
| 1557 | POST | `/api/core/monitor/rules/{id}/enable` | monitor | apps/web/src/api/monitor/metrics.ts | 324 |
| 1558 | POST | `/api/core/monitor/rules/{id}/disable` | monitor | apps/web/src/api/monitor/metrics.ts | 327 |
| 1559 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 8 |
| 1560 | GET | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 9 |
| 1561 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 10 |
| 1562 | PUT | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 11 |
| 1563 | DELETE | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 12 |
| 1564 | GET | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 39 |
| 1565 | GET | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 48 |
| 1566 | POST | `/api/core/monitor/rules` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 58 |
| 1567 | PUT | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 71 |
| 1568 | DELETE | `/api/core/monitor/rules/{id}` | monitor | apps/web/src/api/monitor/ruleTyped.ts | 83 |
| 1569 | GET | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 8 |
| 1570 | GET | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 9 |
| 1571 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 10 |
| 1572 | PUT | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 11 |
| 1573 | DELETE | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 12 |
| 1574 | GET | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 39 |
| 1575 | GET | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 48 |
| 1576 | POST | `/api/core/monitor/slos` | monitor | apps/web/src/api/monitor/sloTyped.ts | 58 |
| 1577 | PUT | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 71 |
| 1578 | DELETE | `/api/core/monitor/slos/{id}` | monitor | apps/web/src/api/monitor/sloTyped.ts | 81 |
| 1579 | GET | `/api/communication/notification/notifications/unread` | notification | apps/web/src/api/notification/index.ts | 188 |
| 1580 | GET | `/api/communication/notification/notifications/unread-count` | notification | apps/web/src/api/notification/index.ts | 195 |
| 1581 | PUT | `/api/communication/notification/notifications/read-all` | notification | apps/web/src/api/notification/index.ts | 230 |
| 1582 | GET | `/api/communication/notification/notifications/archive/config` | notification | apps/web/src/api/notification/index.ts | 259 |
| 1583 | PUT | `/api/communication/notification/notifications/archive/config` | notification | apps/web/src/api/notification/index.ts | 266 |
| 1584 | POST | `/api/communication/notification/notifications/archive/run` | notification | apps/web/src/api/notification/index.ts | 278 |
| 1585 | GET | `/api/communication/notification/notifications/stats/me` | notification | apps/web/src/api/notification/index.ts | 285 |
| 1586 | GET | `/api/communication/notification/notification-templates` | notification | apps/web/src/api/notification/index.ts | 312 |
| 1587 | GET | `/api/communication/notification/notification-templates/{id}` | notification | apps/web/src/api/notification/index.ts | 320 |
| 1588 | POST | `/api/communication/notification/notification-templates` | notification | apps/web/src/api/notification/index.ts | 329 |
| 1589 | PUT | `/api/communication/notification/notification-templates/{id}` | notification | apps/web/src/api/notification/index.ts | 340 |
| 1590 | DELETE | `/api/communication/notification/notification-templates/{id}` | notification | apps/web/src/api/notification/index.ts | 348 |
| 1591 | POST | `/api/communication/notification/notification-templates/{id}/render` | notification | apps/web/src/api/notification/index.ts | 356 |
| 1592 | PUT | `/api/communication/notification/notifications/bulk-read` | notification | apps/web/src/api/notification/index.ts | 364 |
| 1593 | DELETE | `/api/communication/notification/notifications/bulk` | notification | apps/web/src/api/notification/index.ts | 371 |
| 1594 | GET | `/api/communication/notification/notifications/health/detailed` | notification | apps/web/src/api/notification/index.ts | 395 |
| 1595 | PUT | `/api/communication/notification/notifications/{id}/unread` | notification | apps/web/src/api/notification/index.ts | 410 |
| 1596 | GET | `/api/pdm/bom-versions` | pdm | apps/web/src/api/pdm/bom.ts | 89 |
| 1597 | GET | `/api/pdm/bom-versions/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 107 |
| 1598 | POST | `/api/pdm/bom-versions` | pdm | apps/web/src/api/pdm/bom.ts | 110 |
| 1599 | PUT | `/api/pdm/bom-versions/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 116 |
| 1600 | DELETE | `/api/pdm/bom-versions/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 119 |
| 1601 | POST | `/api/pdm/bom-versions/{id}/activate` | pdm | apps/web/src/api/pdm/bom.ts | 122 |
| 1602 | POST | `/api/pdm/bom-versions/{id}/archive` | pdm | apps/web/src/api/pdm/bom.ts | 125 |
| 1603 | GET | `/api/pdm/bom-items{params}` | pdm | apps/web/src/api/pdm/bom.ts | 131 |
| 1604 | GET | `/api/pdm/bom-items/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 134 |
| 1605 | POST | `/api/pdm/bom-items` | pdm | apps/web/src/api/pdm/bom.ts | 137 |
| 1606 | PUT | `/api/pdm/bom-items/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 143 |
| 1607 | DELETE | `/api/pdm/bom-items/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 146 |
| 1608 | POST | `/api/pdm/bom-versions/{bomVersionId}/items/batch` | pdm | apps/web/src/api/pdm/bom.ts | 152 |
| 1609 | POST | `/api/pdm/bom-compare` | pdm | apps/web/src/api/pdm/bom.ts | 162 |
| 1610 | GET | `/api/pdm/bom-compare/{id}` | pdm | apps/web/src/api/pdm/bom.ts | 168 |
| 1611 | GET | `/api/pdm/bom-compare` | pdm | apps/web/src/api/pdm/bom.ts | 171 |
| 1612 | GET | `/api/pdm/dashboard` | pdm | apps/web/src/api/pdm/dashboard.ts | 16 |
| 1613 | POST | `/api/pdm/documents/search` | pdm | apps/web/src/api/pdm/document.ts | 91 |
| 1614 | PUT | `/api/pdm/documents/{id}/status` | pdm | apps/web/src/api/pdm/document.ts | 109 |
| 1615 | GET | `/api/pdm/documents/{documentId}/versions` | pdm | apps/web/src/api/pdm/document.ts | 114 |
| 1616 | GET | `/api/pdm/documents/{documentId}/versions/{versionId}` | pdm | apps/web/src/api/pdm/document.ts | 120 |
| 1617 | POST | `/api/pdm/documents/{data.document_id}/versions` | pdm | apps/web/src/api/pdm/document.ts | 125 |
| 1618 | PUT | `/api/pdm/documents/{documentId}/versions/{versionId}` | pdm | apps/web/src/api/pdm/document.ts | 132 |
| 1619 | DELETE | `/api/pdm/documents/{documentId}/versions/{versionId}` | pdm | apps/web/src/api/pdm/document.ts | 138 |
| 1620 | POST | `/api/pdm/documents/{documentId}/versions/{versionId}/publish` | pdm | apps/web/src/api/pdm/document.ts | 144 |
| 1621 | POST | `/api/pdm/documents/{documentId}/upload` | pdm | apps/web/src/api/pdm/document.ts | 154 |
| 1622 | GET | `/api/pdm/documents/{documentId}/versions/{versionId}/download` | pdm | apps/web/src/api/pdm/document.ts | 161 |
| 1623 | GET | `/api/pdm/statistics` | pdm | apps/web/src/api/pdm/index.ts | 403 |
| 1624 | GET | `/api/pdm/change-orders` | pdm | apps/web/src/api/pdm/index.ts | 445 |
| 1625 | GET | `/api/pdm/change-orders/{id}` | pdm | apps/web/src/api/pdm/index.ts | 448 |
| 1626 | POST | `/api/pdm/change-orders` | pdm | apps/web/src/api/pdm/index.ts | 451 |
| 1627 | PUT | `/api/pdm/change-orders/{id}` | pdm | apps/web/src/api/pdm/index.ts | 457 |
| 1628 | DELETE | `/api/pdm/change-orders/{id}` | pdm | apps/web/src/api/pdm/index.ts | 460 |
| 1629 | GET | `/api/pdm/product-configs` | pdm | apps/web/src/api/pdm/index.ts | 465 |
| 1630 | GET | `/api/pdm/product-configs/{id}` | pdm | apps/web/src/api/pdm/index.ts | 468 |
| 1631 | POST | `/api/pdm/product-configs` | pdm | apps/web/src/api/pdm/index.ts | 473 |
| 1632 | PUT | `/api/pdm/product-configs/{id}` | pdm | apps/web/src/api/pdm/index.ts | 479 |
| 1633 | DELETE | `/api/pdm/product-configs/{id}` | pdm | apps/web/src/api/pdm/index.ts | 482 |
| 1634 | POST | `/api/pdm/import` | pdm | apps/web/src/api/pdm/index.ts | 493 |
| 1635 | GET | `/api/pdm/projects` | pdm | apps/web/src/api/pdm/project.ts | 77 |
| 1636 | GET | `/api/pdm/projects/{id}` | pdm | apps/web/src/api/pdm/project.ts | 80 |
| 1637 | POST | `/api/pdm/projects` | pdm | apps/web/src/api/pdm/project.ts | 83 |
| 1638 | PUT | `/api/pdm/projects/{id}` | pdm | apps/web/src/api/pdm/project.ts | 89 |
| 1639 | DELETE | `/api/pdm/projects/{id}` | pdm | apps/web/src/api/pdm/project.ts | 92 |
| 1640 | PUT | `/api/pdm/projects/{id}/status` | pdm | apps/web/src/api/pdm/project.ts | 95 |
| 1641 | PUT | `/api/pdm/projects/{id}/phase` | pdm | apps/web/src/api/pdm/project.ts | 98 |
| 1642 | GET | `/api/pdm/projects/{projectId}/members` | pdm | apps/web/src/api/pdm/project.ts | 103 |
| 1643 | POST | `/api/pdm/projects/{data.project_id}/members` | pdm | apps/web/src/api/pdm/project.ts | 106 |
| 1644 | DELETE | `/api/pdm/projects/{projectId}/members/{userId}` | pdm | apps/web/src/api/pdm/project.ts | 112 |
| 1645 | PUT | `/api/pdm/projects/{projectId}/members/{userId}` | pdm | apps/web/src/api/pdm/project.ts | 119 |
| 1646 | GET | `/api/pdm/projects/{projectId}/phases` | pdm | apps/web/src/api/pdm/project.ts | 126 |
| 1647 | POST | `/api/pdm/projects/{data.project_id}/phases` | pdm | apps/web/src/api/pdm/project.ts | 129 |
| 1648 | PUT | `/api/pdm/projects/{projectId}/phases/{phaseId}` | pdm | apps/web/src/api/pdm/project.ts | 136 |
| 1649 | DELETE | `/api/pdm/projects/{projectId}/phases/{phaseId}` | pdm | apps/web/src/api/pdm/project.ts | 139 |
| 1650 | POST | `/api/core/iam/access-logs` | iam | apps/web/src/api/permissionInterceptor.ts | 106 |
| 1651 | GET | `/api/pm/projects/{projectId}/acceptance-plans` | pm | apps/web/src/api/pm/acceptance.ts | 6 |
| 1652 | GET | `/api/pm/acceptance-plans/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 10 |
| 1653 | POST | `/api/pm/projects/{projectId}/acceptance-plans` | pm | apps/web/src/api/pm/acceptance.ts | 28 |
| 1654 | PUT | `/api/pm/acceptance-plans/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 43 |
| 1655 | GET | `/api/pm/acceptance-plans/{planId}/items` | pm | apps/web/src/api/pm/acceptance.ts | 49 |
| 1656 | POST | `/api/pm/acceptance-plans/{planId}/items` | pm | apps/web/src/api/pm/acceptance.ts | 61 |
| 1657 | PUT | `/api/pm/acceptance-items/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 72 |
| 1658 | DELETE | `/api/pm/acceptance-items/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 76 |
| 1659 | GET | `/api/pm/projects/{projectId}/acceptance-records` | pm | apps/web/src/api/pm/acceptance.ts | 82 |
| 1660 | GET | `/api/pm/acceptance-records/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 86 |
| 1661 | POST | `/api/pm/acceptance-plans/{planId}/records` | pm | apps/web/src/api/pm/acceptance.ts | 103 |
| 1662 | PUT | `/api/pm/acceptance-records/{id}` | pm | apps/web/src/api/pm/acceptance.ts | 117 |
| 1663 | GET | `/api/pm/projects/{projectId}/benefits` | pm | apps/web/src/api/pm/benefit.ts | 6 |
| 1664 | GET | `/api/pm/projects/{projectId}/benefits/analysis` | pm | apps/web/src/api/pm/benefit.ts | 10 |
| 1665 | POST | `/api/pm/projects/{projectId}/benefits` | pm | apps/web/src/api/pm/benefit.ts | 29 |
| 1666 | GET | `/api/pm/projects/{projectId}/budgets` | pm | apps/web/src/api/pm/budget.ts | 6 |
| 1667 | GET | `/api/pm/budgets/{id}` | pm | apps/web/src/api/pm/budget.ts | 10 |
| 1668 | POST | `/api/pm/projects/{projectId}/budgets` | pm | apps/web/src/api/pm/budget.ts | 23 |
| 1669 | PUT | `/api/pm/budgets/{id}` | pm | apps/web/src/api/pm/budget.ts | 35 |
| 1670 | POST | `/api/pm/budgets/{id}/submit` | pm | apps/web/src/api/pm/budget.ts | 39 |
| 1671 | POST | `/api/pm/budgets/{id}/approve` | pm | apps/web/src/api/pm/budget.ts | 43 |
| 1672 | GET | `/api/pm/budgets/{budgetId}/items` | pm | apps/web/src/api/pm/budget.ts | 49 |
| 1673 | POST | `/api/pm/budgets/{budgetId}/items` | pm | apps/web/src/api/pm/budget.ts | 63 |
| 1674 | PUT | `/api/pm/budgets/{budgetId}/items/{itemId}` | pm | apps/web/src/api/pm/budget.ts | 77 |
| 1675 | DELETE | `/api/pm/budgets/{budgetId}/items/{itemId}` | pm | apps/web/src/api/pm/budget.ts | 81 |
| 1676 | GET | `/api/pm/contracts` | pm | apps/web/src/api/pm/contract.ts | 11 |
| 1677 | GET | `/api/pm/contracts/{id}` | pm | apps/web/src/api/pm/contract.ts | 15 |
| 1678 | POST | `/api/pm/contracts` | pm | apps/web/src/api/pm/contract.ts | 38 |
| 1679 | PUT | `/api/pm/contracts/{id}` | pm | apps/web/src/api/pm/contract.ts | 60 |
| 1680 | DELETE | `/api/pm/contracts/{id}` | pm | apps/web/src/api/pm/contract.ts | 64 |
| 1681 | POST | `/api/pm/contracts/{id}/submit` | pm | apps/web/src/api/pm/contract.ts | 68 |
| 1682 | POST | `/api/pm/contracts/{id}/approve` | pm | apps/web/src/api/pm/contract.ts | 72 |
| 1683 | POST | `/api/pm/contracts/{id}/reject` | pm | apps/web/src/api/pm/contract.ts | 76 |
| 1684 | GET | `/api/pm/contracts/{contractId}/milestones` | pm | apps/web/src/api/pm/contract.ts | 82 |
| 1685 | POST | `/api/pm/contracts/{contractId}/milestones` | pm | apps/web/src/api/pm/contract.ts | 96 |
| 1686 | PUT | `/api/pm/contracts/{contractId}/milestones/{milestoneId}` | pm | apps/web/src/api/pm/contract.ts | 110 |
| 1687 | DELETE | `/api/pm/contracts/{contractId}/milestones/{milestoneId}` | pm | apps/web/src/api/pm/contract.ts | 114 |
| 1688 | GET | `/api/pm/contracts/{contractId}/payments` | pm | apps/web/src/api/pm/contract.ts | 120 |
| 1689 | POST | `/api/pm/contracts/{contractId}/payments` | pm | apps/web/src/api/pm/contract.ts | 133 |
| 1690 | PUT | `/api/pm/contracts/{contractId}/payments/{paymentId}` | pm | apps/web/src/api/pm/contract.ts | 146 |
| 1691 | DELETE | `/api/pm/contracts/{contractId}/payments/{paymentId}` | pm | apps/web/src/api/pm/contract.ts | 150 |
| 1692 | GET | `/api/pm/projects/{projectId}/contracts` | pm | apps/web/src/api/pm/contract.ts | 156 |
| 1693 | POST | `/api/pm/projects/{projectId}/contracts` | pm | apps/web/src/api/pm/contract.ts | 181 |
| 1694 | GET | `/api/pm/contract-templates` | pm | apps/web/src/api/pm/contract.ts | 187 |
| 1695 | GET | `/api/pm/contract-templates/{id}` | pm | apps/web/src/api/pm/contract.ts | 191 |
| 1696 | POST | `/api/pm/contract-templates` | pm | apps/web/src/api/pm/contract.ts | 201 |
| 1697 | PUT | `/api/pm/contract-templates/{id}` | pm | apps/web/src/api/pm/contract.ts | 213 |
| 1698 | DELETE | `/api/pm/contract-templates/{id}` | pm | apps/web/src/api/pm/contract.ts | 217 |
| 1699 | GET | `/api/pm/statistics` | pm | apps/web/src/api/pm/dashboard.ts | 7 |
| 1700 | GET | `/api/pm/projects/{projectId}/documents` | pm | apps/web/src/api/pm/document.ts | 6 |
| 1701 | GET | `/api/pm/documents/{id}` | pm | apps/web/src/api/pm/document.ts | 10 |
| 1702 | POST | `/api/pm/projects/{projectId}/documents` | pm | apps/web/src/api/pm/document.ts | 27 |
| 1703 | PUT | `/api/pm/documents/{id}` | pm | apps/web/src/api/pm/document.ts | 40 |
| 1704 | DELETE | `/api/pm/documents/{id}` | pm | apps/web/src/api/pm/document.ts | 44 |
| 1705 | GET | `/api/pm/documents/{documentId}/versions` | pm | apps/web/src/api/pm/document.ts | 50 |
| 1706 | POST | `/api/pm/documents/{documentId}/versions` | pm | apps/web/src/api/pm/document.ts | 62 |
| 1707 | GET | `/api/pm/projects/{projectId}/folders` | pm | apps/web/src/api/pm/document.ts | 68 |
| 1708 | GET | `/api/pm/folders/{id}` | pm | apps/web/src/api/pm/document.ts | 72 |
| 1709 | POST | `/api/pm/projects/{projectId}/folders` | pm | apps/web/src/api/pm/document.ts | 84 |
| 1710 | PUT | `/api/pm/folders/{id}` | pm | apps/web/src/api/pm/document.ts | 94 |
| 1711 | DELETE | `/api/pm/folders/{id}` | pm | apps/web/src/api/pm/document.ts | 98 |
| 1712 | GET | `/api/pm/projects/{projectId}/notifications` | pm | apps/web/src/api/pm/notification.ts | 6 |
| 1713 | POST | `/api/pm/projects/{data.project_id}/notifications` | pm | apps/web/src/api/pm/notification.ts | 19 |
| 1714 | GET | `/api/pm/projects/{projectId}/notification-settings` | pm | apps/web/src/api/pm/notification.ts | 25 |
| 1715 | POST | `/api/pm/projects/{projectId}/notification-settings` | pm | apps/web/src/api/pm/notification.ts | 37 |
| 1716 | PUT | `/api/pm/notification-settings/{id}` | pm | apps/web/src/api/pm/notification.ts | 48 |
| 1717 | GET | `/api/pm/notification-types` | pm | apps/web/src/api/pm/notification.ts | 54 |
| 1718 | GET | `/api/pm/projects/{projectId}/phases` | pm | apps/web/src/api/pm/project.ts | 54 |
| 1719 | POST | `/api/pm/projects/{projectId}/phases` | pm | apps/web/src/api/pm/project.ts | 67 |
| 1720 | GET | `/api/pm/projects/{projectId}/phases/{id}` | pm | apps/web/src/api/pm/project.ts | 71 |
| 1721 | PUT | `/api/pm/projects/{projectId}/phases/{id}` | pm | apps/web/src/api/pm/project.ts | 88 |
| 1722 | DELETE | `/api/pm/projects/{projectId}/phases/{id}` | pm | apps/web/src/api/pm/project.ts | 92 |
| 1723 | GET | `/api/pm/projects/{projectId}/milestones` | pm | apps/web/src/api/pm/project.ts | 98 |
| 1724 | POST | `/api/pm/projects/{projectId}/milestones` | pm | apps/web/src/api/pm/project.ts | 111 |
| 1725 | GET | `/api/pm/projects/{projectId}/milestones/{id}` | pm | apps/web/src/api/pm/project.ts | 115 |
| 1726 | PUT | `/api/pm/projects/{projectId}/milestones/{id}` | pm | apps/web/src/api/pm/project.ts | 130 |
| 1727 | DELETE | `/api/pm/projects/{projectId}/milestones/{id}` | pm | apps/web/src/api/pm/project.ts | 134 |
| 1728 | GET | `/api/pm/projects/{projectId}/approval` | pm | apps/web/src/api/pm/project.ts | 140 |
| 1729 | POST | `/api/pm/projects/{projectId}/approval` | pm | apps/web/src/api/pm/project.ts | 150 |
| 1730 | POST | `/api/pm/projects/{projectId}/approval/action` | pm | apps/web/src/api/pm/project.ts | 154 |
| 1731 | GET | `/api/pm/projects/{projectId}/quality-checks` | pm | apps/web/src/api/pm/quality.ts | 6 |
| 1732 | GET | `/api/pm/quality-checks/{id}` | pm | apps/web/src/api/pm/quality.ts | 10 |
| 1733 | POST | `/api/pm/projects/{projectId}/quality-checks` | pm | apps/web/src/api/pm/quality.ts | 26 |
| 1734 | PUT | `/api/pm/quality-checks/{id}` | pm | apps/web/src/api/pm/quality.ts | 45 |
| 1735 | GET | `/api/pm/projects/{projectId}/defects` | pm | apps/web/src/api/pm/quality.ts | 51 |
| 1736 | GET | `/api/pm/defects/{id}` | pm | apps/web/src/api/pm/quality.ts | 55 |
| 1737 | POST | `/api/pm/projects/{projectId}/defects` | pm | apps/web/src/api/pm/quality.ts | 72 |
| 1738 | PUT | `/api/pm/defects/{id}` | pm | apps/web/src/api/pm/quality.ts | 88 |
| 1739 | DELETE | `/api/pm/defects/{id}` | pm | apps/web/src/api/pm/quality.ts | 92 |
| 1740 | GET | `/api/pm/projects/{projectId}/reports` | pm | apps/web/src/api/pm/report.ts | 6 |
| 1741 | GET | `/api/pm/reports/{id}` | pm | apps/web/src/api/pm/report.ts | 10 |
| 1742 | POST | `/api/pm/projects/{projectId}/reports` | pm | apps/web/src/api/pm/report.ts | 23 |
| 1743 | POST | `/api/pm/projects/{projectId}/reports/generate` | pm | apps/web/src/api/pm/report.ts | 36 |
| 1744 | GET | `/api/pm/report-templates` | pm | apps/web/src/api/pm/report.ts | 42 |
| 1745 | GET | `/api/pm/report-templates/{id}` | pm | apps/web/src/api/pm/report.ts | 46 |
| 1746 | POST | `/api/pm/report-templates` | pm | apps/web/src/api/pm/report.ts | 56 |
| 1747 | PUT | `/api/pm/report-templates/{id}` | pm | apps/web/src/api/pm/report.ts | 66 |
| 1748 | DELETE | `/api/pm/report-templates/{id}` | pm | apps/web/src/api/pm/report.ts | 70 |
| 1749 | GET | `/api/pm/projects/{projectId}/resources` | pm | apps/web/src/api/pm/resource.ts | 6 |
| 1750 | POST | `/api/pm/projects/{projectId}/resources` | pm | apps/web/src/api/pm/resource.ts | 22 |
| 1751 | GET | `/api/pm/projects/{projectId}/resources/{id}` | pm | apps/web/src/api/pm/resource.ts | 26 |
| 1752 | PUT | `/api/pm/projects/{projectId}/resources/{id}` | pm | apps/web/src/api/pm/resource.ts | 42 |
| 1753 | DELETE | `/api/pm/projects/{projectId}/resources/{id}` | pm | apps/web/src/api/pm/resource.ts | 46 |
| 1754 | GET | `/api/pm/projects/{projectId}/expenses` | pm | apps/web/src/api/pm/resource.ts | 52 |
| 1755 | POST | `/api/pm/projects/{projectId}/expenses` | pm | apps/web/src/api/pm/resource.ts | 74 |
| 1756 | GET | `/api/pm/projects/{projectId}/expenses/{id}` | pm | apps/web/src/api/pm/resource.ts | 78 |
| 1757 | PUT | `/api/pm/projects/{projectId}/expenses/{id}` | pm | apps/web/src/api/pm/resource.ts | 95 |
| 1758 | DELETE | `/api/pm/projects/{projectId}/expenses/{id}` | pm | apps/web/src/api/pm/resource.ts | 99 |
| 1759 | GET | `/api/pm/projects/{projectId}/risks` | pm | apps/web/src/api/pm/risk.ts | 6 |
| 1760 | GET | `/api/pm/risks/{id}` | pm | apps/web/src/api/pm/risk.ts | 10 |
| 1761 | POST | `/api/pm/projects/{projectId}/risks` | pm | apps/web/src/api/pm/risk.ts | 33 |
| 1762 | PUT | `/api/pm/risks/{id}` | pm | apps/web/src/api/pm/risk.ts | 55 |
| 1763 | GET | `/api/pm/risks/{riskId}/events` | pm | apps/web/src/api/pm/risk.ts | 61 |
| 1764 | POST | `/api/pm/risks/{riskId}/events` | pm | apps/web/src/api/pm/risk.ts | 72 |
| 1765 | GET | `/api/pm/projects/{projectId}/settlements` | pm | apps/web/src/api/pm/settlement.ts | 6 |
| 1766 | GET | `/api/pm/settlements/{id}` | pm | apps/web/src/api/pm/settlement.ts | 10 |
| 1767 | POST | `/api/pm/projects/{projectId}/settlements` | pm | apps/web/src/api/pm/settlement.ts | 25 |
| 1768 | PUT | `/api/pm/settlements/{id}` | pm | apps/web/src/api/pm/settlement.ts | 37 |
| 1769 | POST | `/api/pm/settlements/{id}/approve` | pm | apps/web/src/api/pm/settlement.ts | 41 |
| 1770 | GET | `/api/pm/settlements/{settlementId}/items` | pm | apps/web/src/api/pm/settlement.ts | 47 |
| 1771 | POST | `/api/pm/settlements/{settlementId}/items` | pm | apps/web/src/api/pm/settlement.ts | 63 |
| 1772 | PUT | `/api/pm/settlement-items/{id}` | pm | apps/web/src/api/pm/settlement.ts | 75 |
| 1773 | DELETE | `/api/pm/settlement-items/{id}` | pm | apps/web/src/api/pm/settlement.ts | 79 |
| 1774 | GET | `/api/pm/settlements/{settlementId}/adjustments` | pm | apps/web/src/api/pm/settlement.ts | 85 |
| 1775 | POST | `/api/pm/settlements/{settlementId}/adjustments` | pm | apps/web/src/api/pm/settlement.ts | 100 |
| 1776 | GET | `/api/pm/projects/{projectId}/members` | pm | apps/web/src/api/pm/team.ts | 6 |
| 1777 | POST | `/api/pm/projects/{projectId}/members` | pm | apps/web/src/api/pm/team.ts | 19 |
| 1778 | GET | `/api/pm/projects/{projectId}/members/{id}` | pm | apps/web/src/api/pm/team.ts | 23 |
| 1779 | PUT | `/api/pm/projects/{projectId}/members/{id}` | pm | apps/web/src/api/pm/team.ts | 36 |
| 1780 | DELETE | `/api/pm/projects/{projectId}/members/{id}` | pm | apps/web/src/api/pm/team.ts | 40 |
| 1781 | GET | `/api/qms/apqp/projects` | qms | apps/web/src/api/qms/apqp.ts | 22 |
| 1782 | GET | `/api/qms/apqp/projects/{id}` | qms | apps/web/src/api/qms/apqp.ts | 27 |
| 1783 | POST | `/api/qms/apqp/projects` | qms | apps/web/src/api/qms/apqp.ts | 31 |
| 1784 | PUT | `/api/qms/apqp/projects/{id}` | qms | apps/web/src/api/qms/apqp.ts | 38 |
| 1785 | DELETE | `/api/qms/apqp/projects/{id}` | qms | apps/web/src/api/qms/apqp.ts | 42 |
| 1786 | POST | `/api/qms/apqp/projects/{id}/transition` | qms | apps/web/src/api/qms/apqp.ts | 49 |
| 1787 | GET | `/api/qms/apqp/projects/{id}/progress` | qms | apps/web/src/api/qms/apqp.ts | 53 |
| 1788 | GET | `/api/qms/apqp/phases/{id}` | qms | apps/web/src/api/qms/apqp.ts | 63 |
| 1789 | POST | `/api/qms/apqp/phases` | qms | apps/web/src/api/qms/apqp.ts | 75 |
| 1790 | PUT | `/api/qms/apqp/phases/{id}` | qms | apps/web/src/api/qms/apqp.ts | 82 |
| 1791 | DELETE | `/api/qms/apqp/phases/{id}` | qms | apps/web/src/api/qms/apqp.ts | 86 |
| 1792 | GET | `/api/qms/apqp/tasks` | qms | apps/web/src/api/qms/apqp.ts | 96 |
| 1793 | GET | `/api/qms/apqp/tasks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 100 |
| 1794 | POST | `/api/qms/apqp/tasks` | qms | apps/web/src/api/qms/apqp.ts | 114 |
| 1795 | PUT | `/api/qms/apqp/tasks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 118 |
| 1796 | DELETE | `/api/qms/apqp/tasks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 122 |
| 1797 | GET | `/api/qms/apqp/risks` | qms | apps/web/src/api/qms/apqp.ts | 131 |
| 1798 | GET | `/api/qms/apqp/risks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 135 |
| 1799 | POST | `/api/qms/apqp/risks` | qms | apps/web/src/api/qms/apqp.ts | 150 |
| 1800 | PUT | `/api/qms/apqp/risks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 154 |
| 1801 | DELETE | `/api/qms/apqp/risks/{id}` | qms | apps/web/src/api/qms/apqp.ts | 158 |
| 1802 | POST | `/api/qms/apqp/approvals` | qms | apps/web/src/api/qms/apqp.ts | 173 |
| 1803 | POST | `/api/qms/apqp/approvals/{id}/process` | qms | apps/web/src/api/qms/apqp.ts | 180 |
| 1804 | GET | `/api/qms/audit-plans` | qms | apps/web/src/api/qms/audit.ts | 7 |
| 1805 | POST | `/api/qms/audit-plans` | qms | apps/web/src/api/qms/audit.ts | 26 |
| 1806 | POST | `/api/qms/audit-plans/{id}/start` | qms | apps/web/src/api/qms/audit.ts | 31 |
| 1807 | POST | `/api/qms/audit-plans/{id}/complete` | qms | apps/web/src/api/qms/audit.ts | 38 |
| 1808 | POST | `/api/qms/audit-tasks` | qms | apps/web/src/api/qms/audit.ts | 51 |
| 1809 | PUT | `/api/qms/audit-tasks/{taskId}/complete` | qms | apps/web/src/api/qms/audit.ts | 65 |
| 1810 | POST | `/api/qms/audit-findings` | qms | apps/web/src/api/qms/audit.ts | 78 |
| 1811 | POST | `/api/qms/audit-findings/{findingId}/verify` | qms | apps/web/src/api/qms/audit.ts | 96 |
| 1812 | POST | `/api/qms/actions/{id}/complete` | qms | apps/web/src/api/qms/correctiveAction.ts | 16 |
| 1813 | GET | `/api/qms/actions/{actionId}/items` | qms | apps/web/src/api/qms/correctiveAction.ts | 28 |
| 1814 | GET | `/api/qms/quality-dashboard/overview` | qms | apps/web/src/api/qms/dashboard.ts | 12 |
| 1815 | GET | `/api/qms/eightd` | qms | apps/web/src/api/qms/eightD.ts | 19 |
| 1816 | GET | `/api/qms/eightd/{id}` | qms | apps/web/src/api/qms/eightD.ts | 25 |
| 1817 | POST | `/api/qms/eightd` | qms | apps/web/src/api/qms/eightD.ts | 36 |
| 1818 | PUT | `/api/qms/eightd/{id}` | qms | apps/web/src/api/qms/eightD.ts | 57 |
| 1819 | DELETE | `/api/qms/eightd/{id}` | qms | apps/web/src/api/qms/eightD.ts | 65 |
| 1820 | PUT | `/api/qms/eightd/{id}/d1-team` | qms | apps/web/src/api/qms/eightD.ts | 72 |
| 1821 | POST | `/api/qms/eightd/{id}/d3-containment` | qms | apps/web/src/api/qms/eightD.ts | 87 |
| 1822 | POST | `/api/qms/eightd/{id}/d4-root-cause` | qms | apps/web/src/api/qms/eightD.ts | 101 |
| 1823 | POST | `/api/qms/eightd/{id}/d5-permanent-action` | qms | apps/web/src/api/qms/eightD.ts | 115 |
| 1824 | POST | `/api/qms/eightd/{id}/d6-verify` | qms | apps/web/src/api/qms/eightD.ts | 129 |
| 1825 | POST | `/api/qms/eightd/{id}/d7-preventive` | qms | apps/web/src/api/qms/eightD.ts | 140 |
| 1826 | POST | `/api/qms/eightd/{id}/close` | qms | apps/web/src/api/qms/eightD.ts | 154 |
| 1827 | GET | `/api/qms/eightd/{id}/audit-logs` | qms | apps/web/src/api/qms/eightD.ts | 162 |
| 1828 | GET | `/api/qms/fmea` | qms | apps/web/src/api/qms/fmea.ts | 25 |
| 1829 | GET | `/api/qms/fmea/{id}` | qms | apps/web/src/api/qms/fmea.ts | 31 |
| 1830 | POST | `/api/qms/fmea` | qms | apps/web/src/api/qms/fmea.ts | 42 |
| 1831 | PUT | `/api/qms/fmea/{id}` | qms | apps/web/src/api/qms/fmea.ts | 67 |
| 1832 | DELETE | `/api/qms/fmea/{id}` | qms | apps/web/src/api/qms/fmea.ts | 75 |
| 1833 | GET | `/api/qms/fmea/{fmeaId}/statistics` | qms | apps/web/src/api/qms/fmea.ts | 79 |
| 1834 | GET | `/api/qms/fmea-items` | qms | apps/web/src/api/qms/fmea.ts | 87 |
| 1835 | GET | `/api/qms/fmea-items/{id}` | qms | apps/web/src/api/qms/fmea.ts | 95 |
| 1836 | POST | `/api/qms/fmea-items` | qms | apps/web/src/api/qms/fmea.ts | 117 |
| 1837 | PUT | `/api/qms/fmea-items/{id}` | qms | apps/web/src/api/qms/fmea.ts | 148 |
| 1838 | DELETE | `/api/qms/fmea-items/{id}` | qms | apps/web/src/api/qms/fmea.ts | 156 |
| 1839 | GET | `/api/qms/actions/{id}` | qms | apps/web/src/api/qms/improvement.ts | 24 |
| 1840 | POST | `/api/qms/actions` | qms | apps/web/src/api/qms/improvement.ts | 35 |
| 1841 | PUT | `/api/qms/actions/{id}` | qms | apps/web/src/api/qms/improvement.ts | 54 |
| 1842 | DELETE | `/api/qms/actions/{id}` | qms | apps/web/src/api/qms/improvement.ts | 65 |
| 1843 | GET | `/api/qms/health` | qms | apps/web/src/api/qms/index.ts | 299 |
| 1844 | POST | `/api/qms/checks/{id}/assign` | qms | apps/web/src/api/qms/inspection.ts | 73 |
| 1845 | POST | `/api/qms/checks/{id}/submit` | qms | apps/web/src/api/qms/inspection.ts | 87 |
| 1846 | POST | `/api/qms/checks/{id}/audit` | qms | apps/web/src/api/qms/inspection.ts | 101 |
| 1847 | POST | `/api/qms/checks/{id}/rework` | qms | apps/web/src/api/qms/inspection.ts | 115 |
| 1848 | GET | `/api/qms/checks/{id}/results` | qms | apps/web/src/api/qms/inspection.ts | 126 |
| 1849 | GET | `/api/qms/checks/{id}/audits` | qms | apps/web/src/api/qms/inspection.ts | 133 |
| 1850 | GET | `/api/qms/issues/{id}` | qms | apps/web/src/api/qms/issue.ts | 21 |
| 1851 | PUT | `/api/qms/issues/{id}` | qms | apps/web/src/api/qms/issue.ts | 50 |
| 1852 | DELETE | `/api/qms/issues/{id}` | qms | apps/web/src/api/qms/issue.ts | 58 |
| 1853 | GET | `/api/qms/quality-costs` | qms | apps/web/src/api/qms/qualityCost.ts | 22 |
| 1854 | GET | `/api/qms/quality-costs/{id}` | qms | apps/web/src/api/qms/qualityCost.ts | 28 |
| 1855 | POST | `/api/qms/quality-costs` | qms | apps/web/src/api/qms/qualityCost.ts | 39 |
| 1856 | PUT | `/api/qms/quality-costs/{id}` | qms | apps/web/src/api/qms/qualityCost.ts | 62 |
| 1857 | DELETE | `/api/qms/quality-costs/{id}` | qms | apps/web/src/api/qms/qualityCost.ts | 73 |
| 1858 | GET | `/api/qms/quality-costs/statistics` | qms | apps/web/src/api/qms/qualityCost.ts | 80 |
| 1859 | GET | `/api/qms/quality-costs/trend` | qms | apps/web/src/api/qms/qualityCost.ts | 97 |
| 1860 | GET | `/api/qms/spc/charts` | qms | apps/web/src/api/qms/spc.ts | 23 |
| 1861 | GET | `/api/qms/spc/charts/{id}` | qms | apps/web/src/api/qms/spc.ts | 29 |
| 1862 | POST | `/api/qms/spc/charts` | qms | apps/web/src/api/qms/spc.ts | 40 |
| 1863 | PUT | `/api/qms/spc/charts/{id}` | qms | apps/web/src/api/qms/spc.ts | 68 |
| 1864 | DELETE | `/api/qms/spc/charts/{id}` | qms | apps/web/src/api/qms/spc.ts | 76 |
| 1865 | GET | `/api/qms/spc/charts/{chartId}/data-points` | qms | apps/web/src/api/qms/spc.ts | 80 |
| 1866 | POST | `/api/qms/spc/data-points` | qms | apps/web/src/api/qms/spc.ts | 109 |
| 1867 | POST | `/api/qms/spc/charts/{chartId}/calculate` | qms | apps/web/src/api/qms/spc.ts | 119 |
| 1868 | GET | `/api/qms/standards/{standardId}/revisions` | qms | apps/web/src/api/qms/standard.ts | 67 |
| 1869 | GET | `/api/qms/sync-records` | qms | apps/web/src/api/qms/sync.ts | 13 |
| 1870 | GET | `/api/qms/sync-records/{id}` | qms | apps/web/src/api/qms/sync.ts | 26 |
| 1871 | DELETE | `/api/qms/sync-records/{id}` | qms | apps/web/src/api/qms/sync.ts | 34 |
| 1872 | POST | `/api/qms/sync-records/{id}/retry` | qms | apps/web/src/api/qms/sync.ts | 38 |
| 1873 | POST | `/api/qms/sync/inspection-to-lims` | qms | apps/web/src/api/qms/sync.ts | 48 |
| 1874 | POST | `/api/qms/sync/issue-to-ehs` | qms | apps/web/src/api/qms/sync.ts | 58 |
| 1875 | GET | `/api/rd/bugs/{id}` | rd | apps/web/src/api/rd/bug.ts | 34 |
| 1876 | POST | `/api/rd/bugs` | rd | apps/web/src/api/rd/bug.ts | 38 |
| 1877 | PUT | `/api/rd/bugs/{id}` | rd | apps/web/src/api/rd/bug.ts | 42 |
| 1878 | DELETE | `/api/rd/bugs/{id}` | rd | apps/web/src/api/rd/bug.ts | 46 |
| 1879 | GET | `/api/rd/builds/{id}` | rd | apps/web/src/api/rd/build.ts | 32 |
| 1880 | POST | `/api/rd/builds` | rd | apps/web/src/api/rd/build.ts | 36 |
| 1881 | GET | `/api/rd/deploys/{id}` | rd | apps/web/src/api/rd/deploy.ts | 33 |
| 1882 | POST | `/api/rd/deploys` | rd | apps/web/src/api/rd/deploy.ts | 37 |
| 1883 | GET | `/api/rd/experiments/{id}` | rd | apps/web/src/api/rd/experiment.ts | 40 |
| 1884 | POST | `/api/rd/experiments` | rd | apps/web/src/api/rd/experiment.ts | 44 |
| 1885 | PUT | `/api/rd/experiments/{id}` | rd | apps/web/src/api/rd/experiment.ts | 51 |
| 1886 | DELETE | `/api/rd/experiments/{id}` | rd | apps/web/src/api/rd/experiment.ts | 55 |
| 1887 | GET | `/api/rd/experiments/project/{projectId}` | rd | apps/web/src/api/rd/experiment.ts | 59 |
| 1888 | POST | `/api/rd/experiments/{id}/advance-phase` | rd | apps/web/src/api/rd/experiment.ts | 142 |
| 1889 | GET | `/api/rd/batch-trace/{batchNumber}` | rd | apps/web/src/api/rd/experiment.ts | 146 |
| 1890 | GET | `/api/rd/experiments/{experimentId}/records` | rd | apps/web/src/api/rd/experiment.ts | 150 |
| 1891 | POST | `/api/rd/experiments/{experimentId}/records` | rd | apps/web/src/api/rd/experiment.ts | 157 |
| 1892 | GET | `/api/rd/formulas/{id}` | rd | apps/web/src/api/rd/formula.ts | 33 |
| 1893 | POST | `/api/rd/formulas` | rd | apps/web/src/api/rd/formula.ts | 37 |
| 1894 | PUT | `/api/rd/formulas/{id}` | rd | apps/web/src/api/rd/formula.ts | 41 |
| 1895 | DELETE | `/api/rd/formulas/{id}` | rd | apps/web/src/api/rd/formula.ts | 45 |
| 1896 | GET | `/api/rd/formulas/{formulaId}/versions` | rd | apps/web/src/api/rd/formula.ts | 49 |
| 1897 | GET | `/api/rd/formulas/{formulaId}/versions` | rd | apps/web/src/api/rd/formula.ts | 53 |
| 1898 | POST | `/api/rd/formulas/{formulaId}/versions` | rd | apps/web/src/api/rd/formula.ts | 60 |
| 1899 | POST | `/api/rd/formulas/{formulaId}/versions` | rd | apps/web/src/api/rd/formula.ts | 67 |
| 1900 | POST | `/api/rd/formulas/{id}/approve` | rd | apps/web/src/api/rd/formula.ts | 71 |
| 1901 | GET | `/api/rd/health` | rd | apps/web/src/api/rd/index.ts | 56 |
| 1902 | GET | `/api/rd/materials/{id}` | rd | apps/web/src/api/rd/material.ts | 35 |
| 1903 | POST | `/api/rd/materials` | rd | apps/web/src/api/rd/material.ts | 39 |
| 1904 | PUT | `/api/rd/materials/{id}` | rd | apps/web/src/api/rd/material.ts | 46 |
| 1905 | DELETE | `/api/rd/materials/{id}` | rd | apps/web/src/api/rd/material.ts | 50 |
| 1906 | DELETE | `/api/rd/materials/batch` | rd | apps/web/src/api/rd/material.ts | 54 |
| 1907 | POST | `/api/rd/materials/import` | rd | apps/web/src/api/rd/material.ts | 59 |
| 1908 | POST | `/api/rd/projects/batch` | rd | apps/web/src/api/rd/project.ts | 59 |
| 1909 | DELETE | `/api/rd/projects/batch` | rd | apps/web/src/api/rd/project.ts | 65 |
| 1910 | POST | `/api/rd/projects/import` | rd | apps/web/src/api/rd/project.ts | 75 |
| 1911 | GET | `/api/rd/projects/{id}/dashboard` | rd | apps/web/src/api/rd/project.ts | 83 |
| 1912 | GET | `/api/rd/projects/{id}/gantt` | rd | apps/web/src/api/rd/project.ts | 87 |
| 1913 | GET | `/api/rd/statistics` | rd | apps/web/src/api/rd/statistics.ts | 7 |
| 1914 | GET | `/api/rd/tests/{id}` | rd | apps/web/src/api/rd/test.ts | 33 |
| 1915 | POST | `/api/rd/tests` | rd | apps/web/src/api/rd/test.ts | 37 |
| 1916 | PUT | `/api/rd/tests/{id}` | rd | apps/web/src/api/rd/test.ts | 41 |
| 1917 | DELETE | `/api/rd/tests/{id}` | rd | apps/web/src/api/rd/test.ts | 45 |
| 1918 | GET | `/api/bi/reports` | bi | apps/web/src/api/report/index.ts | 278 |
| 1919 | GET | `/api/bi/reports/{id}` | bi | apps/web/src/api/report/index.ts | 282 |
| 1920 | POST | `/api/bi/reports` | bi | apps/web/src/api/report/index.ts | 286 |
| 1921 | POST | `/api/bi/reports/from-template` | bi | apps/web/src/api/report/index.ts | 292 |
| 1922 | PUT | `/api/bi/reports/{id}` | bi | apps/web/src/api/report/index.ts | 299 |
| 1923 | DELETE | `/api/bi/reports/{id}` | bi | apps/web/src/api/report/index.ts | 303 |
| 1924 | POST | `/api/bi/reports/{id}/export` | bi | apps/web/src/api/report/index.ts | 310 |
| 1925 | POST | `/api/bi/reports/{id}/run` | bi | apps/web/src/api/report/index.ts | 314 |
| 1926 | GET | `/api/bi/templates` | bi | apps/web/src/api/report/index.ts | 318 |
| 1927 | GET | `/api/bi/templates/{id}` | bi | apps/web/src/api/report/index.ts | 322 |
| 1928 | POST | `/api/bi/templates` | bi | apps/web/src/api/report/index.ts | 328 |
| 1929 | PUT | `/api/bi/templates/{id}` | bi | apps/web/src/api/report/index.ts | 335 |
| 1930 | DELETE | `/api/bi/templates/{id}` | bi | apps/web/src/api/report/index.ts | 339 |
| 1931 | GET | `/api/bi/report-types` | bi | apps/web/src/api/report/index.ts | 343 |
| 1932 | GET | `/api/bi/schedules` | bi | apps/web/src/api/report/index.ts | 347 |
| 1933 | GET | `/api/bi/schedules/{id}` | bi | apps/web/src/api/report/index.ts | 351 |
| 1934 | POST | `/api/bi/schedules` | bi | apps/web/src/api/report/index.ts | 355 |
| 1935 | PUT | `/api/bi/schedules/{id}` | bi | apps/web/src/api/report/index.ts | 362 |
| 1936 | DELETE | `/api/bi/schedules/{id}` | bi | apps/web/src/api/report/index.ts | 366 |
| 1937 | POST | `/api/bi/schedules/{id}/execute` | bi | apps/web/src/api/report/index.ts | 370 |
| 1938 | GET | `/api/bi/schedules/{id}/history` | bi | apps/web/src/api/report/index.ts | 374 |
| 1939 | GET | `/api/bi/subscriptions` | bi | apps/web/src/api/report/index.ts | 378 |
| 1940 | GET | `/api/bi/subscriptions/{id}` | bi | apps/web/src/api/report/index.ts | 382 |
| 1941 | POST | `/api/bi/subscriptions` | bi | apps/web/src/api/report/index.ts | 388 |
| 1942 | PUT | `/api/bi/subscriptions/{id}` | bi | apps/web/src/api/report/index.ts | 395 |
| 1943 | DELETE | `/api/bi/subscriptions/{id}` | bi | apps/web/src/api/report/index.ts | 399 |
| 1944 | POST | `/api/bi/subscriptions/{id}/toggle` | bi | apps/web/src/api/report/index.ts | 403 |
| 1945 | GET | `/api/bi/subscriptions/user/{user_id}` | bi | apps/web/src/api/report/index.ts | 407 |
| 1946 | GET | `/api/bi/health` | bi | apps/web/src/api/report/index.ts | 411 |
| 1947 | GET | `/api/bi/reports-center/stats` | bi | apps/web/src/api/report/index.ts | 415 |
| 1948 | POST | `/api/bi/reports-center/export/{reportType}` | bi | apps/web/src/api/report/index.ts | 422 |
| 1949 | GET | `/api/scm/audit-logs` | scm | apps/web/src/api/scm/auditLog.ts | 7 |
| 1950 | GET | `/api/scm/audit-logs/{id}` | scm | apps/web/src/api/scm/auditLog.ts | 11 |
| 1951 | GET | `/api/scm/delivery-appointments` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 19 |
| 1952 | POST | `/api/scm/delivery-appointments` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 25 |
| 1953 | GET | `/api/scm/delivery-appointments/{id}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 29 |
| 1954 | PUT | `/api/scm/delivery-appointments/{id}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 36 |
| 1955 | DELETE | `/api/scm/delivery-appointments/{id}` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 40 |
| 1956 | POST | `/api/scm/delivery-appointments/{id}/approve` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 47 |
| 1957 | POST | `/api/scm/delivery-appointments/{id}/reject` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 54 |
| 1958 | POST | `/api/scm/delivery-appointments/{id}/confirm-arrival` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 61 |
| 1959 | POST | `/api/scm/delivery-appointments/{id}/complete` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 68 |
| 1960 | POST | `/api/scm/delivery-appointments/{id}/cancel` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 75 |
| 1961 | GET | `/api/scm/delivery-appointments/stats` | scm | apps/web/src/api/scm/deliveryAppointment.ts | 79 |
| 1962 | GET | `/api/scm/{resource}` | scm | apps/web/src/api/scm/factory.ts | 26 |
| 1963 | GET | `/api/scm/{resource}/{id}` | scm | apps/web/src/api/scm/factory.ts | 30 |
| 1964 | POST | `/api/scm/{resource}` | scm | apps/web/src/api/scm/factory.ts | 34 |
| 1965 | PUT | `/api/scm/{resource}/{id}` | scm | apps/web/src/api/scm/factory.ts | 38 |
| 1966 | DELETE | `/api/scm/{resource}/{id}` | scm | apps/web/src/api/scm/factory.ts | 42 |
| 1967 | GET | `/api/scm/incoming-inspections` | scm | apps/web/src/api/scm/incomingInspection.ts | 15 |
| 1968 | POST | `/api/scm/incoming-inspections` | scm | apps/web/src/api/scm/incomingInspection.ts | 21 |
| 1969 | GET | `/api/scm/incoming-inspections/{id}` | scm | apps/web/src/api/scm/incomingInspection.ts | 25 |
| 1970 | PUT | `/api/scm/incoming-inspections/{id}` | scm | apps/web/src/api/scm/incomingInspection.ts | 32 |
| 1971 | DELETE | `/api/scm/incoming-inspections/{id}` | scm | apps/web/src/api/scm/incomingInspection.ts | 36 |
| 1972 | POST | `/api/scm/incoming-inspections/{id}/pass` | scm | apps/web/src/api/scm/incomingInspection.ts | 40 |
| 1973 | POST | `/api/scm/incoming-inspections/{id}/reject` | scm | apps/web/src/api/scm/incomingInspection.ts | 47 |
| 1974 | GET | `/api/scm/health` | scm | apps/web/src/api/scm/index.ts | 62 |
| 1975 | GET | `/api/scm/incoming-inspections/{inspectionId}/records` | scm | apps/web/src/api/scm/inspectionRecord.ts | 14 |
| 1976 | POST | `/api/scm/inspection-records` | scm | apps/web/src/api/scm/inspectionRecord.ts | 18 |
| 1977 | GET | `/api/scm/inspection-records/{id}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 22 |
| 1978 | PUT | `/api/scm/inspection-records/{id}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 29 |
| 1979 | DELETE | `/api/scm/inspection-records/{id}` | scm | apps/web/src/api/scm/inspectionRecord.ts | 33 |
| 1980 | GET | `/api/scm/inventory-turnover` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 16 |
| 1981 | GET | `/api/scm/inventory-turnover/{id}` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 20 |
| 1982 | GET | `/api/scm/inventory-turnover/abc-classification` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 26 |
| 1983 | GET | `/api/scm/inventory-turnover/trend` | scm | apps/web/src/api/scm/inventoryTurnover.ts | 30 |
| 1984 | GET | `/api/scm/mrp/suggestions` | scm | apps/web/src/api/scm/mrpPlan.ts | 13 |
| 1985 | POST | `/api/scm/mrp/suggestions` | scm | apps/web/src/api/scm/mrpPlan.ts | 17 |
| 1986 | GET | `/api/scm/mrp/suggestions/{id}` | scm | apps/web/src/api/scm/mrpPlan.ts | 21 |
| 1987 | PUT | `/api/scm/mrp/suggestions/{id}` | scm | apps/web/src/api/scm/mrpPlan.ts | 25 |
| 1988 | DELETE | `/api/scm/mrp/suggestions/{id}` | scm | apps/web/src/api/scm/mrpPlan.ts | 29 |
| 1989 | POST | `/api/scm/mrp/suggestions/{id}/confirm` | scm | apps/web/src/api/scm/mrpPlan.ts | 33 |
| 1990 | GET | `/api/scm/mrp-suggestions` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 14 |
| 1991 | GET | `/api/scm/mrp-suggestions/{id}` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 18 |
| 1992 | GET | `/api/scm/mrp-suggestions/summary` | scm | apps/web/src/api/scm/mrpSuggestion.ts | 24 |
| 1993 | GET | `/api/scm/comparisons` | scm | apps/web/src/api/scm/priceComparison.ts | 17 |
| 1994 | POST | `/api/scm/comparisons` | scm | apps/web/src/api/scm/priceComparison.ts | 21 |
| 1995 | GET | `/api/scm/comparisons/{id}` | scm | apps/web/src/api/scm/priceComparison.ts | 25 |
| 1996 | PUT | `/api/scm/comparisons/{id}` | scm | apps/web/src/api/scm/priceComparison.ts | 32 |
| 1997 | DELETE | `/api/scm/comparisons/{id}` | scm | apps/web/src/api/scm/priceComparison.ts | 36 |
| 1998 | GET | `/api/scm/comparisons/{id}` | scm | apps/web/src/api/scm/priceComparison.ts | 40 |
| 1999 | GET | `/api/scm/quotes` | scm | apps/web/src/api/scm/priceComparison.ts | 44 |
| 2000 | POST | `/api/scm/quotes` | scm | apps/web/src/api/scm/priceComparison.ts | 48 |
| 2001 | GET | `/api/scm/purchase-contracts` | scm | apps/web/src/api/scm/purchaseContract.ts | 14 |
| 2002 | POST | `/api/scm/purchase-contracts` | scm | apps/web/src/api/scm/purchaseContract.ts | 18 |
| 2003 | GET | `/api/scm/purchase-contracts/{id}` | scm | apps/web/src/api/scm/purchaseContract.ts | 22 |
| 2004 | PUT | `/api/scm/purchase-contracts/{id}` | scm | apps/web/src/api/scm/purchaseContract.ts | 29 |
| 2005 | DELETE | `/api/scm/purchase-contracts/{id}` | scm | apps/web/src/api/scm/purchaseContract.ts | 33 |
| 2006 | POST | `/api/scm/purchase-contracts/{id}/submit` | scm | apps/web/src/api/scm/purchaseContract.ts | 37 |
| 2007 | POST | `/api/scm/purchase-contracts/{id}/approve` | scm | apps/web/src/api/scm/purchaseContract.ts | 41 |
| 2008 | POST | `/api/scm/purchase-contracts/{id}/reject` | scm | apps/web/src/api/scm/purchaseContract.ts | 45 |
| 2009 | POST | `/api/scm/purchase-contracts/{id}/cancel` | scm | apps/web/src/api/scm/purchaseContract.ts | 49 |
| 2010 | POST | `/api/scm/purchase-contracts/{id}/terminate` | scm | apps/web/src/api/scm/purchaseContract.ts | 53 |
| 2011 | POST | `/api/scm/purchase-contracts/{id}/renew` | scm | apps/web/src/api/scm/purchaseContract.ts | 57 |
| 2012 | GET | `/api/scm/purchase-items` | scm | apps/web/src/api/scm/purchaseItem.ts | 14 |
| 2013 | POST | `/api/scm/purchase-items` | scm | apps/web/src/api/scm/purchaseItem.ts | 18 |
| 2014 | GET | `/api/scm/purchase-items/{id}` | scm | apps/web/src/api/scm/purchaseItem.ts | 22 |
| 2015 | PUT | `/api/scm/purchase-items/{id}` | scm | apps/web/src/api/scm/purchaseItem.ts | 29 |
| 2016 | POST | `/api/scm/purchase-orders/{id}/confirm` | scm | apps/web/src/api/scm/purchaseOrder.ts | 40 |
| 2017 | POST | `/api/scm/purchase-orders/{id}/cancel` | scm | apps/web/src/api/scm/purchaseOrder.ts | 44 |
| 2018 | POST | `/api/scm/purchase-orders/{id}/close` | scm | apps/web/src/api/scm/purchaseOrder.ts | 48 |
| 2019 | GET | `/api/scm/purchase-requisitions` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 14 |
| 2020 | POST | `/api/scm/purchase-requisitions` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 20 |
| 2021 | GET | `/api/scm/purchase-requisitions/{id}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 24 |
| 2022 | PUT | `/api/scm/purchase-requisitions/{id}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 31 |
| 2023 | DELETE | `/api/scm/purchase-requisitions/{id}` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 35 |
| 2024 | POST | `/api/scm/purchase-requisitions/{id}/submit` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 39 |
| 2025 | POST | `/api/scm/purchase-requisitions/{id}/approve` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 43 |
| 2026 | POST | `/api/scm/purchase-requisitions/{id}/reject` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 47 |
| 2027 | POST | `/api/scm/purchase-requisitions/{id}/cancel` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 51 |
| 2028 | POST | `/api/scm/purchase-requisitions/{id}/convert-to-order` | scm | apps/web/src/api/scm/purchaseRequisition.ts | 55 |
| 2029 | GET | `/api/scm/supplier-admissions` | scm | apps/web/src/api/scm/supplierAdmission.ts | 14 |
| 2030 | POST | `/api/scm/supplier-admissions` | scm | apps/web/src/api/scm/supplierAdmission.ts | 18 |
| 2031 | GET | `/api/scm/supplier-admissions/{id}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 22 |
| 2032 | PUT | `/api/scm/supplier-admissions/{id}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 29 |
| 2033 | DELETE | `/api/scm/supplier-admissions/{id}` | scm | apps/web/src/api/scm/supplierAdmission.ts | 33 |
| 2034 | POST | `/api/scm/supplier-admissions/{id}/submit` | scm | apps/web/src/api/scm/supplierAdmission.ts | 37 |
| 2035 | POST | `/api/scm/supplier-admissions/{id}/approve` | scm | apps/web/src/api/scm/supplierAdmission.ts | 41 |
| 2036 | POST | `/api/scm/supplier-admissions/{id}/reject` | scm | apps/web/src/api/scm/supplierAdmission.ts | 45 |
| 2037 | POST | `/api/scm/supplier-admissions/{id}/audit` | scm | apps/web/src/api/scm/supplierAdmission.ts | 54 |
| 2038 | POST | `/api/scm/supplier-admissions/{id}/activate-supplier` | scm | apps/web/src/api/scm/supplierAdmission.ts | 58 |
| 2039 | GET | `/api/scm/evaluations` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 14 |
| 2040 | POST | `/api/scm/evaluations` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 20 |
| 2041 | GET | `/api/scm/evaluations/{id}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 24 |
| 2042 | PUT | `/api/scm/evaluations/{id}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 31 |
| 2043 | DELETE | `/api/scm/evaluations/{id}` | scm | apps/web/src/api/scm/supplierEvaluation.ts | 35 |
| 2044 | GET | `/api/scm/dashboard/overview` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 12 |
| 2045 | GET | `/api/scm/dashboard/purchase-inbound-outbound` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 16 |
| 2046 | GET | `/api/scm/dashboard/supplier-performance` | scm | apps/web/src/api/scm/supplyChainDashboard.ts | 22 |
| 2047 | GET | `/api/scm/sync-records` | scm | apps/web/src/api/scm/syncRecord.ts | 15 |
| 2048 | POST | `/api/scm/sync-records` | scm | apps/web/src/api/scm/syncRecord.ts | 19 |
| 2049 | GET | `/api/scm/sync-records/{id}` | scm | apps/web/src/api/scm/syncRecord.ts | 23 |
| 2050 | POST | `/api/scm/sync-records/{id}/retry` | scm | apps/web/src/api/scm/syncRecord.ts | 27 |
| 2051 | POST | `/api/scm/sync/wms/{syncType}` | scm | apps/web/src/api/scm/syncRecord.ts | 31 |
| 2052 | POST | `/api/scm/sync/srm/{syncType}` | scm | apps/web/src/api/scm/syncRecord.ts | 35 |
| 2053 | GET | `/api/scm/sync-records/{syncId}/details` | scm | apps/web/src/api/scm/syncRecord.ts | 42 |
| 2054 | GET | `/api/portal/search/suggestions` | portal | apps/web/src/api/search/index.ts | 46 |
| 2055 | POST | `/api/core/file/upload` | file | apps/web/src/api/shared/index.ts | 34 |
| 2056 | GET | `/api/core/file/attachments${queryString ` | file | apps/web/src/api/shared/index.ts | 47 |
| 2057 | GET | `/api/core/file/attachments/{id}` | file | apps/web/src/api/shared/index.ts | 51 |
| 2058 | DELETE | `/api/core/file/attachments/{id}` | file | apps/web/src/api/shared/index.ts | 55 |
| 2059 | GET | `/api/core/file/attachments/{id}/download` | file | apps/web/src/api/shared/index.ts | 59 |
| 2060 | GET | `/api/core/comments` | core | apps/web/src/api/shared/index.ts | 93 |
| 2061 | POST | `/api/core/comments` | core | apps/web/src/api/shared/index.ts | 97 |
| 2062 | PUT | `/api/core/comments/{id}` | core | apps/web/src/api/shared/index.ts | 101 |
| 2063 | DELETE | `/api/core/comments/{id}` | core | apps/web/src/api/shared/index.ts | 105 |
| 2064 | GET | `/api/core/favorites` | core | apps/web/src/api/shared/index.ts | 127 |
| 2065 | POST | `/api/core/favorites` | core | apps/web/src/api/shared/index.ts | 131 |
| 2066 | DELETE | `/api/core/favorites/{id}` | core | apps/web/src/api/shared/index.ts | 135 |
| 2067 | GET | `/api/core/favorites/check` | core | apps/web/src/api/shared/index.ts | 139 |
| 2068 | GET | `/api/core/search` | core | apps/web/src/api/shared/index.ts | 176 |
| 2069 | GET | `/api/core/search/suggestions` | core | apps/web/src/api/shared/index.ts | 180 |
| 2070 | GET | `/api/core/search/recent` | core | apps/web/src/api/shared/index.ts | 184 |
| 2071 | DELETE | `/api/core/search/recent` | core | apps/web/src/api/shared/index.ts | 188 |
| 2072 | GET | `/api/srm/supplier-evaluations` | srm | apps/web/src/api/srm/index.ts | 498 |
| 2073 | GET | `/api/srm/supplier-evaluations/{id}` | srm | apps/web/src/api/srm/index.ts | 501 |
| 2074 | POST | `/api/srm/supplier-evaluations` | srm | apps/web/src/api/srm/index.ts | 506 |
| 2075 | PUT | `/api/srm/supplier-evaluations/{id}` | srm | apps/web/src/api/srm/index.ts | 512 |
| 2076 | DELETE | `/api/srm/supplier-evaluations/{id}` | srm | apps/web/src/api/srm/index.ts | 515 |
| 2077 | GET | `/api/srm/purchase-orders` | srm | apps/web/src/api/srm/index.ts | 520 |
| 2078 | GET | `/api/srm/purchase-orders/{id}` | srm | apps/web/src/api/srm/index.ts | 523 |
| 2079 | POST | `/api/srm/purchase-orders` | srm | apps/web/src/api/srm/index.ts | 528 |
| 2080 | PUT | `/api/srm/purchase-orders/{id}` | srm | apps/web/src/api/srm/index.ts | 534 |
| 2081 | DELETE | `/api/srm/purchase-orders/{id}` | srm | apps/web/src/api/srm/index.ts | 537 |
| 2082 | GET | `/api/srm/supplier-contracts` | srm | apps/web/src/api/srm/index.ts | 542 |
| 2083 | GET | `/api/srm/supplier-contracts/{id}` | srm | apps/web/src/api/srm/index.ts | 545 |
| 2084 | POST | `/api/srm/supplier-contracts` | srm | apps/web/src/api/srm/index.ts | 550 |
| 2085 | PUT | `/api/srm/supplier-contracts/{id}` | srm | apps/web/src/api/srm/index.ts | 556 |
| 2086 | DELETE | `/api/srm/supplier-contracts/{id}` | srm | apps/web/src/api/srm/index.ts | 559 |
| 2087 | GET | `/api/srm/statistics` | srm | apps/web/src/api/srm/index.ts | 564 |
| 2088 | GET | `/api/srm/statistics/detailed` | srm | apps/web/src/api/srm/index.ts | 567 |
| 2089 | GET | `/api/srm/suppliers-with-stats` | srm | apps/web/src/api/srm/index.ts | 570 |
| 2090 | GET | `/api/srm/scoring-dimensions` | srm | apps/web/src/api/srm/index.ts | 575 |
| 2091 | GET | `/api/srm/scoring-dimensions/active` | srm | apps/web/src/api/srm/index.ts | 578 |
| 2092 | GET | `/api/srm/scoring-dimensions/{id}` | srm | apps/web/src/api/srm/index.ts | 581 |
| 2093 | POST | `/api/srm/scoring-dimensions` | srm | apps/web/src/api/srm/index.ts | 586 |
| 2094 | PUT | `/api/srm/scoring-dimensions/{id}` | srm | apps/web/src/api/srm/index.ts | 592 |
| 2095 | DELETE | `/api/srm/scoring-dimensions/{id}` | srm | apps/web/src/api/srm/index.ts | 595 |
| 2096 | GET | `/api/srm/performance/reports${query ` | srm | apps/web/src/api/srm/index.ts | 610 |
| 2097 | GET | `/api/srm/performance/reports/{id}` | srm | apps/web/src/api/srm/index.ts | 613 |
| 2098 | GET | `/api/srm/performance/summary` | srm | apps/web/src/api/srm/index.ts | 616 |
| 2099 | GET | `/api/srm/performance/score-level-distribution` | srm | apps/web/src/api/srm/index.ts | 624 |
| 2100 | GET | `/api/srm/performance/top-suppliers` | srm | apps/web/src/api/srm/index.ts | 632 |
| 2101 | GET | `/api/srm/performance/trend${query ` | srm | apps/web/src/api/srm/index.ts | 639 |
| 2102 | GET | `/api/srm/performance/compare` | srm | apps/web/src/api/srm/index.ts | 644 |
| 2103 | GET | `/api/srm/health` | srm | apps/web/src/api/srm/index.ts | 648 |
| 2104 | GET | `/api/srm/supplier-portal/{supplierId}/stats` | srm | apps/web/src/api/srm/index.ts | 653 |
| 2105 | GET | `/api/srm/supplier-portal/{supplierId}/orders` | srm | apps/web/src/api/srm/index.ts | 656 |
| 2106 | GET | `/api/srm/supplier-portal/{supplierId}/invoices` | srm | apps/web/src/api/srm/index.ts | 659 |
| 2107 | GET | `/api/srm/supplier-portal/{supplierId}/deliveries` | srm | apps/web/src/api/srm/index.ts | 662 |
| 2108 | GET | `/api/srm/supplier-portal/announcements` | srm | apps/web/src/api/srm/index.ts | 665 |
| 2109 | GET | `/api/srm/inquiries` | srm | apps/web/src/api/srm/index.ts | 672 |
| 2110 | GET | `/api/srm/inquiries/{id}` | srm | apps/web/src/api/srm/index.ts | 675 |
| 2111 | POST | `/api/srm/inquiries` | srm | apps/web/src/api/srm/index.ts | 678 |
| 2112 | PUT | `/api/srm/inquiries/{id}` | srm | apps/web/src/api/srm/index.ts | 684 |
| 2113 | DELETE | `/api/srm/inquiries/{id}` | srm | apps/web/src/api/srm/index.ts | 687 |
| 2114 | POST | `/api/srm/inquiries/{id}/publish` | srm | apps/web/src/api/srm/index.ts | 690 |
| 2115 | POST | `/api/srm/inquiries/{id}/close` | srm | apps/web/src/api/srm/index.ts | 693 |
| 2116 | GET | `/api/srm/quotations/{id}` | srm | apps/web/src/api/srm/index.ts | 701 |
| 2117 | POST | `/api/srm/quotations` | srm | apps/web/src/api/srm/index.ts | 704 |
| 2118 | PUT | `/api/srm/quotations/{id}` | srm | apps/web/src/api/srm/index.ts | 710 |
| 2119 | POST | `/api/srm/quotations/{id}/award` | srm | apps/web/src/api/srm/index.ts | 713 |
| 2120 | POST | `/api/srm/quotations/{id}/reject` | srm | apps/web/src/api/srm/index.ts | 716 |
| 2121 | GET | `/api/srm/biddings` | srm | apps/web/src/api/srm/index.ts | 723 |
| 2122 | GET | `/api/srm/biddings/{id}` | srm | apps/web/src/api/srm/index.ts | 726 |
| 2123 | POST | `/api/srm/biddings` | srm | apps/web/src/api/srm/index.ts | 729 |
| 2124 | PUT | `/api/srm/biddings/{id}` | srm | apps/web/src/api/srm/index.ts | 735 |
| 2125 | DELETE | `/api/srm/biddings/{id}` | srm | apps/web/src/api/srm/index.ts | 738 |
| 2126 | POST | `/api/srm/biddings/{id}/publish` | srm | apps/web/src/api/srm/index.ts | 741 |
| 2127 | POST | `/api/srm/biddings/{id}/open` | srm | apps/web/src/api/srm/index.ts | 744 |
| 2128 | POST | `/api/srm/biddings/{id}/evaluate` | srm | apps/web/src/api/srm/index.ts | 747 |
| 2129 | POST | `/api/srm/biddings/{id}/award` | srm | apps/web/src/api/srm/index.ts | 750 |
| 2130 | GET | `/api/srm/biddings/{biddingId}/suppliers` | srm | apps/web/src/api/srm/index.ts | 753 |
| 2131 | GET | `/api/core/system/audit-logs${queryString ` | core | apps/web/src/api/system/audit.ts | 20 |
| 2132 | GET | `/api/core/system/audit-logs/{id}` | core | apps/web/src/api/system/audit.ts | 26 |
| 2133 | GET | `/api/core/system/audit-logs/export${queryString ` | core | apps/web/src/api/system/audit.ts | 41 |
| 2134 | GET | `/api/core/dict/dict-types${queryString ` | core | apps/web/src/api/system/index.ts | 111 |
| 2135 | GET | `/api/core/dict/dict-types/{id}` | core | apps/web/src/api/system/index.ts | 115 |
| 2136 | POST | `/api/core/dict/dict-types` | core | apps/web/src/api/system/index.ts | 119 |
| 2137 | PUT | `/api/core/dict/dict-types/{id}` | core | apps/web/src/api/system/index.ts | 123 |
| 2138 | DELETE | `/api/core/dict/dict-types/{id}` | core | apps/web/src/api/system/index.ts | 127 |
| 2139 | GET | `/api/core/dict/dict-types/{dictTypeId}/items${queryString ` | core | apps/web/src/api/system/index.ts | 155 |
| 2140 | GET | `/api/core/dict/dict-items/{id}` | core | apps/web/src/api/system/index.ts | 161 |
| 2141 | POST | `/api/core/dict/dict-items` | core | apps/web/src/api/system/index.ts | 165 |
| 2142 | PUT | `/api/core/dict/dict-items/{id}` | core | apps/web/src/api/system/index.ts | 169 |
| 2143 | DELETE | `/api/core/dict/dict-items/{id}` | core | apps/web/src/api/system/index.ts | 173 |
| 2144 | POST | `/api/core/dict/dict-items/batch` | core | apps/web/src/api/system/index.ts | 177 |
| 2145 | GET | `/api/core/dict/dict-types/{dictTypeId}/items/export` | core | apps/web/src/api/system/index.ts | 181 |
| 2146 | GET | `/api/erp/system/db/tables${queryString ` | erp | apps/web/src/api/system/index.ts | 198 |
| 2147 | GET | `/api/erp/system/db/tables/{tableName}` | erp | apps/web/src/api/system/index.ts | 202 |
| 2148 | POST | `/api/erp/system/db/columns/preview` | erp | apps/web/src/api/system/index.ts | 209 |
| 2149 | POST | `/api/erp/system/db/columns` | erp | apps/web/src/api/system/index.ts | 216 |
| 2150 | PUT | `/api/erp/system/db/columns/{tableName}/{columnName}` | erp | apps/web/src/api/system/index.ts | 224 |
| 2151 | DELETE | `/api/erp/system/db/columns/{tableName}/{columnName}` | erp | apps/web/src/api/system/index.ts | 232 |
| 2152 | GET | `/api/erp/system/db/changes${queryString ` | erp | apps/web/src/api/system/index.ts | 244 |
| 2153 | GET | `/api/core/system/config` | core | apps/web/src/api/system/params.ts | 7 |
| 2154 | PUT | `/api/core/system/config` | core | apps/web/src/api/system/params.ts | 11 |
| 2155 | GET | `/api/core/system/cache/config` | core | apps/web/src/api/system/params.ts | 15 |
| 2156 | PUT | `/api/core/system/cache/config` | core | apps/web/src/api/system/params.ts | 19 |
| 2157 | POST | `/api/core/system/cache/clear` | core | apps/web/src/api/system/params.ts | 23 |
| 2158 | GET | `/api/core/system/cache/stats` | core | apps/web/src/api/system/params.ts | 33 |
| 2159 | GET | `/api/core/system/log/config` | core | apps/web/src/api/system/params.ts | 37 |
| 2160 | PUT | `/api/core/system/log/config` | core | apps/web/src/api/system/params.ts | 41 |
| 2161 | GET | `/api/core/system/params` | core | apps/web/src/api/system/params.ts | 45 |
| 2162 | PUT | `/api/core/system/params` | core | apps/web/src/api/system/params.ts | 49 |
| 2163 | GET | `/api/core/doc/templates${queryString ` | doc | apps/web/src/api/template/index.ts | 121 |
| 2164 | GET | `/api/core/doc/templates/{id}` | doc | apps/web/src/api/template/index.ts | 125 |
| 2165 | POST | `/api/core/doc/templates` | doc | apps/web/src/api/template/index.ts | 129 |
| 2166 | PUT | `/api/core/doc/templates/{id}` | doc | apps/web/src/api/template/index.ts | 133 |
| 2167 | DELETE | `/api/core/doc/templates/{id}` | doc | apps/web/src/api/template/index.ts | 137 |
| 2168 | GET | `/api/core/doc/templates/categories${queryString ` | doc | apps/web/src/api/template/index.ts | 148 |
| 2169 | POST | `/api/core/doc/templates/{id}/render` | doc | apps/web/src/api/template/index.ts | 155 |
| 2170 | POST | `/api/core/doc/templates/{id}/duplicate` | doc | apps/web/src/api/template/index.ts | 161 |
| 2171 | PUT | `/api/core/doc/templates/{id}/toggle-status` | doc | apps/web/src/api/template/index.ts | 165 |
| 2172 | GET | `/api/core/{API_BASE}/list` | core | apps/web/src/api/tenant/index.ts | 27 |
| 2173 | GET | `/api/core/{API_BASE}/{tenantId}` | core | apps/web/src/api/tenant/index.ts | 31 |
| 2174 | GET | `/api/core/{API_BASE}/slug/{slug}` | core | apps/web/src/api/tenant/index.ts | 35 |
| 2175 | POST | `/api/core/{API_BASE}/create` | core | apps/web/src/api/tenant/index.ts | 39 |
| 2176 | PUT | `/api/core/{API_BASE}/{tenantId}` | core | apps/web/src/api/tenant/index.ts | 46 |
| 2177 | DELETE | `/api/core/{API_BASE}/{tenantId}` | core | apps/web/src/api/tenant/index.ts | 50 |
| 2178 | POST | `/api/core/{API_BASE}/{tenantId}/activate` | core | apps/web/src/api/tenant/index.ts | 54 |
| 2179 | POST | `/api/core/{API_BASE}/{tenantId}/suspend` | core | apps/web/src/api/tenant/index.ts | 58 |
| 2180 | GET | `/api/core/{API_BASE}/{tenantId}/users` | core | apps/web/src/api/tenant/index.ts | 73 |
| 2181 | POST | `/api/core/{API_BASE}/{tenantId}/users/invite` | core | apps/web/src/api/tenant/index.ts | 80 |
| 2182 | DELETE | `/api/core/{API_BASE}/{tenantId}/users/{userId}` | core | apps/web/src/api/tenant/index.ts | 84 |
| 2183 | PUT | `/api/core/{API_BASE}/{tenantId}/users/{userId}/role` | core | apps/web/src/api/tenant/index.ts | 92 |
| 2184 | GET | `/api/core/{API_BASE}/{tenantId}/stats` | core | apps/web/src/api/tenant/index.ts | 96 |
| 2185 | GET | `/api/core/{API_BASE}/{tenantId}/usage` | core | apps/web/src/api/tenant/index.ts | 100 |
| 2186 | GET | `/api/core/{API_BASE}/{tenantId}/billing` | core | apps/web/src/api/tenant/index.ts | 104 |
| 2187 | GET | `/api/core/{API_BASE}/{tenantId}/invoices` | core | apps/web/src/api/tenant/index.ts | 108 |
| 2188 | GET | `/api/core/{API_BASE}/context` | core | apps/web/src/api/tenant/index.ts | 112 |
| 2189 | GET | `/api/core/{API_BASE}/my` | core | apps/web/src/api/tenant/index.ts | 116 |
| 2190 | POST | `/api/core/{API_BASE}/switch` | core | apps/web/src/api/tenant/index.ts | 120 |
| 2191 | GET | `/api/finance/voucher-templates` | finance | apps/web/src/api/voucherTemplate/index.ts | 41 |
| 2192 | GET | `/api/finance/voucher-templates/{templateId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 46 |
| 2193 | POST | `/api/finance/voucher-templates` | finance | apps/web/src/api/voucherTemplate/index.ts | 60 |
| 2194 | PUT | `/api/finance/voucher-templates/{templateId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 66 |
| 2195 | DELETE | `/api/finance/voucher-templates/{templateId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 72 |
| 2196 | POST | `/api/finance/voucher-templates/{templateId}/copy` | finance | apps/web/src/api/voucherTemplate/index.ts | 78 |
| 2197 | POST | `/api/finance/voucher-templates/{templateId}/set-default` | finance | apps/web/src/api/voucherTemplate/index.ts | 87 |
| 2198 | PUT | `/api/finance/voucher-templates/{templateId}/toggle` | finance | apps/web/src/api/voucherTemplate/index.ts | 95 |
| 2199 | POST | `/api/finance/voucher-templates/{templateId}/entries` | finance | apps/web/src/api/voucherTemplate/index.ts | 107 |
| 2200 | PUT | `/api/finance/voucher-templates/{templateId}/entries/{entryId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 116 |
| 2201 | DELETE | `/api/finance/voucher-templates/{templateId}/entries/{entryId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 122 |
| 2202 | PUT | `/api/finance/voucher-templates/{templateId}/entries/reorder` | finance | apps/web/src/api/voucherTemplate/index.ts | 128 |
| 2203 | POST | `/api/finance/voucher/generate/preview` | finance | apps/web/src/api/voucherTemplate/index.ts | 145 |
| 2204 | POST | `/api/finance/voucher/generate/from-source` | finance | apps/web/src/api/voucherTemplate/index.ts | 158 |
| 2205 | POST | `/api/finance/voucher/generate/batch` | finance | apps/web/src/api/voucherTemplate/index.ts | 169 |
| 2206 | POST | `/api/finance/voucher/generate/auto` | finance | apps/web/src/api/voucherTemplate/index.ts | 181 |
| 2207 | POST | `/api/finance/voucher/generate/regenerate/{originalVoucherId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 187 |
| 2208 | POST | `/api/finance/voucher-templates/match` | finance | apps/web/src/api/voucherTemplate/index.ts | 204 |
| 2209 | GET | `/api/finance/voucher-templates/{templateId}/usage-stats` | finance | apps/web/src/api/voucherTemplate/index.ts | 216 |
| 2210 | GET | `/api/finance/voucher-generation-rules` | finance | apps/web/src/api/voucherTemplate/index.ts | 232 |
| 2211 | POST | `/api/finance/voucher-generation-rules` | finance | apps/web/src/api/voucherTemplate/index.ts | 245 |
| 2212 | PUT | `/api/finance/voucher-generation-rules/{ruleId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 251 |
| 2213 | DELETE | `/api/finance/voucher-generation-rules/{ruleId}` | finance | apps/web/src/api/voucherTemplate/index.ts | 257 |
| 2214 | PUT | `/api/finance/voucher-generation-rules/{ruleId}/toggle` | finance | apps/web/src/api/voucherTemplate/index.ts | 263 |
| 2215 | POST | `/api/finance/voucher-templates/import` | finance | apps/web/src/api/voucherTemplate/index.ts | 285 |
| 2216 | GET | `/api/wms/audit-logs` | wms | apps/web/src/api/wms/audit.ts | 9 |
| 2217 | GET | `/api/wms/audit-logs/{id}` | wms | apps/web/src/api/wms/audit.ts | 13 |
| 2218 | GET | `/api/wms/audit-logs/modules` | wms | apps/web/src/api/wms/audit.ts | 17 |
| 2219 | GET | `/api/wms/batches` | wms | apps/web/src/api/wms/batch.ts | 13 |
| 2220 | POST | `/api/wms/batches` | wms | apps/web/src/api/wms/batch.ts | 17 |
| 2221 | GET | `/api/wms/batches/{id}` | wms | apps/web/src/api/wms/batch.ts | 21 |
| 2222 | PUT | `/api/wms/batches/{id}` | wms | apps/web/src/api/wms/batch.ts | 25 |
| 2223 | DELETE | `/api/wms/batches/{id}` | wms | apps/web/src/api/wms/batch.ts | 29 |
| 2224 | GET | `/api/wms/batches/statistics` | wms | apps/web/src/api/wms/batch.ts | 35 |
| 2225 | GET | `/api/wms/batches/expiring-soon` | wms | apps/web/src/api/wms/batch.ts | 42 |
| 2226 | GET | `/api/wms/batches/expired` | wms | apps/web/src/api/wms/batch.ts | 48 |
| 2227 | POST | `/api/wms/batches/{id}/adjust-quantity` | wms | apps/web/src/api/wms/batch.ts | 55 |
| 2228 | POST | `/api/wms/batches/{id}/transfer-location` | wms | apps/web/src/api/wms/batch.ts | 62 |
| 2229 | GET | `/api/wms/dashboard` | wms | apps/web/src/api/wms/dashboard.ts | 16 |
| 2230 | GET | `/api/wms/inbound-orders` | wms | apps/web/src/api/wms/inbound.ts | 17 |
| 2231 | GET | `/api/wms/inbound-orders/{id}` | wms | apps/web/src/api/wms/inbound.ts | 21 |
| 2232 | POST | `/api/wms/inbound-orders` | wms | apps/web/src/api/wms/inbound.ts | 25 |
| 2233 | PUT | `/api/wms/inbound-orders/{id}` | wms | apps/web/src/api/wms/inbound.ts | 29 |
| 2234 | DELETE | `/api/wms/inbound-orders/{id}` | wms | apps/web/src/api/wms/inbound.ts | 33 |
| 2235 | GET | `/api/wms/inbound-orders/{order_id}/items` | wms | apps/web/src/api/wms/inbound.ts | 39 |
| 2236 | POST | `/api/wms/inbound-orders/{order_id}/items` | wms | apps/web/src/api/wms/inbound.ts | 46 |
| 2237 | PUT | `/api/wms/inbound-orders/{order_id}/items/{item_id}` | wms | apps/web/src/api/wms/inbound.ts | 54 |
| 2238 | DELETE | `/api/wms/inbound-orders/{order_id}/items/{item_id}` | wms | apps/web/src/api/wms/inbound.ts | 58 |
| 2239 | POST | `/api/wms/inbound-orders/{id}/confirm` | wms | apps/web/src/api/wms/inbound.ts | 62 |
| 2240 | POST | `/api/wms/inbound-orders/{id}/receive` | wms | apps/web/src/api/wms/inbound.ts | 66 |
| 2241 | POST | `/api/wms/inbound-orders/{id}/complete` | wms | apps/web/src/api/wms/inbound.ts | 70 |
| 2242 | GET | `/api/wms/inventory/low-stock` | wms | apps/web/src/api/wms/inventory.ts | 73 |
| 2243 | GET | `/api/wms/inventory/warehouse/{warehouse_id}` | wms | apps/web/src/api/wms/inventory.ts | 86 |
| 2244 | GET | `/api/wms/inventory-alerts/rules` | wms | apps/web/src/api/wms/inventory.ts | 94 |
| 2245 | GET | `/api/wms/inventory-alerts/rules/{id}` | wms | apps/web/src/api/wms/inventory.ts | 98 |
| 2246 | POST | `/api/wms/inventory-alerts/rules` | wms | apps/web/src/api/wms/inventory.ts | 104 |
| 2247 | PUT | `/api/wms/inventory-alerts/rules/{id}` | wms | apps/web/src/api/wms/inventory.ts | 111 |
| 2248 | DELETE | `/api/wms/inventory-alerts/rules/{id}` | wms | apps/web/src/api/wms/inventory.ts | 115 |
| 2249 | GET | `/api/wms/inventory-alerts/records` | wms | apps/web/src/api/wms/inventory.ts | 121 |
| 2250 | GET | `/api/wms/inventory-alerts/records/{id}` | wms | apps/web/src/api/wms/inventory.ts | 125 |
| 2251 | POST | `/api/wms/inventory-alerts/records/{id}/confirm` | wms | apps/web/src/api/wms/inventory.ts | 132 |
| 2252 | GET | `/api/wms/inventory-alerts/statistics` | wms | apps/web/src/api/wms/inventory.ts | 138 |
| 2253 | GET | `/api/wms/inventory/statistics` | wms | apps/web/src/api/wms/inventory.ts | 146 |
| 2254 | GET | `/api/wms/inventory/abc-analysis` | wms | apps/web/src/api/wms/inventory.ts | 152 |
| 2255 | GET | `/api/wms/inventory/turnover` | wms | apps/web/src/api/wms/inventory.ts | 158 |
| 2256 | GET | `/api/wms/inventory/value-by-warehouse` | wms | apps/web/src/api/wms/inventory.ts | 164 |
| 2257 | GET | `/api/wms/locations` | wms | apps/web/src/api/wms/location.ts | 15 |
| 2258 | GET | `/api/wms/locations/{id}` | wms | apps/web/src/api/wms/location.ts | 19 |
| 2259 | POST | `/api/wms/locations` | wms | apps/web/src/api/wms/location.ts | 23 |
| 2260 | PUT | `/api/wms/locations/{id}` | wms | apps/web/src/api/wms/location.ts | 27 |
| 2261 | DELETE | `/api/wms/locations/{id}` | wms | apps/web/src/api/wms/location.ts | 31 |
| 2262 | GET | `/api/wms/locations/status` | wms | apps/web/src/api/wms/location.ts | 35 |
| 2263 | POST | `/api/wms/locations/batch` | wms | apps/web/src/api/wms/location.ts | 41 |
| 2264 | PUT | `/api/wms/locations/batch` | wms | apps/web/src/api/wms/location.ts | 48 |
| 2265 | POST | `/api/wms/locations/batch-delete` | wms | apps/web/src/api/wms/location.ts | 52 |
| 2266 | GET | `/api/wms/outbound-orders` | wms | apps/web/src/api/wms/outbound.ts | 21 |
| 2267 | GET | `/api/wms/outbound-orders/{id}` | wms | apps/web/src/api/wms/outbound.ts | 25 |
| 2268 | POST | `/api/wms/outbound-orders` | wms | apps/web/src/api/wms/outbound.ts | 29 |
| 2269 | PUT | `/api/wms/outbound-orders/{id}` | wms | apps/web/src/api/wms/outbound.ts | 33 |
| 2270 | DELETE | `/api/wms/outbound-orders/{id}` | wms | apps/web/src/api/wms/outbound.ts | 37 |
| 2271 | GET | `/api/wms/outbound-orders/{order_id}/items` | wms | apps/web/src/api/wms/outbound.ts | 43 |
| 2272 | POST | `/api/wms/outbound-orders/{order_id}/items` | wms | apps/web/src/api/wms/outbound.ts | 50 |
| 2273 | PUT | `/api/wms/outbound-orders/{order_id}/items/{item_id}` | wms | apps/web/src/api/wms/outbound.ts | 58 |
| 2274 | DELETE | `/api/wms/outbound-orders/{order_id}/items/{item_id}` | wms | apps/web/src/api/wms/outbound.ts | 62 |
| 2275 | POST | `/api/wms/outbound-orders/{id}/confirm` | wms | apps/web/src/api/wms/outbound.ts | 66 |
| 2276 | POST | `/api/wms/outbound-orders/{id}/pick` | wms | apps/web/src/api/wms/outbound.ts | 70 |
| 2277 | POST | `/api/wms/outbound-orders/{id}/pack` | wms | apps/web/src/api/wms/outbound.ts | 74 |
| 2278 | POST | `/api/wms/outbound-orders/{id}/ship` | wms | apps/web/src/api/wms/outbound.ts | 78 |
| 2279 | POST | `/api/wms/outbound-orders/{id}/complete` | wms | apps/web/src/api/wms/outbound.ts | 82 |
| 2280 | GET | `/api/wms/wave-picks` | wms | apps/web/src/api/wms/outbound.ts | 88 |
| 2281 | GET | `/api/wms/wave-picks/{id}` | wms | apps/web/src/api/wms/outbound.ts | 92 |
| 2282 | POST | `/api/wms/wave-picks` | wms | apps/web/src/api/wms/outbound.ts | 96 |
| 2283 | PUT | `/api/wms/wave-picks/{id}` | wms | apps/web/src/api/wms/outbound.ts | 100 |
| 2284 | DELETE | `/api/wms/wave-picks/{id}` | wms | apps/web/src/api/wms/outbound.ts | 104 |
| 2285 | GET | `/api/wms/wave-picks/{wave_id}/items` | wms | apps/web/src/api/wms/outbound.ts | 110 |
| 2286 | POST | `/api/wms/wave-picks/{id}/assign` | wms | apps/web/src/api/wms/outbound.ts | 114 |
| 2287 | POST | `/api/wms/wave-picks/{id}/start` | wms | apps/web/src/api/wms/outbound.ts | 118 |
| 2288 | POST | `/api/wms/wave-picks/{id}/complete` | wms | apps/web/src/api/wms/outbound.ts | 122 |
| 2289 | POST | `/api/wms/wave-picks/{id}/cancel` | wms | apps/web/src/api/wms/outbound.ts | 126 |
| 2290 | GET | `/api/wms/smart-replenishment/suggestions` | wms | apps/web/src/api/wms/replenishment.ts | 20 |
| 2291 | GET | `/api/wms/smart-replenishment/suggestions/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 24 |
| 2292 | POST | `/api/wms/smart-replenishment/suggestions/generate` | wms | apps/web/src/api/wms/replenishment.ts | 32 |
| 2293 | GET | `/api/wms/smart-replenishment/statistics` | wms | apps/web/src/api/wms/replenishment.ts | 39 |
| 2294 | GET | `/api/wms/smart-replenishment/orders` | wms | apps/web/src/api/wms/replenishment.ts | 45 |
| 2295 | GET | `/api/wms/smart-replenishment/orders/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 49 |
| 2296 | POST | `/api/wms/smart-replenishment/orders` | wms | apps/web/src/api/wms/replenishment.ts | 55 |
| 2297 | PUT | `/api/wms/smart-replenishment/orders/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 62 |
| 2298 | DELETE | `/api/wms/smart-replenishment/orders/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 66 |
| 2299 | GET | `/api/wms/smart-replenishment/orders/{order_id}/items` | wms | apps/web/src/api/wms/replenishment.ts | 72 |
| 2300 | POST | `/api/wms/smart-replenishment/orders/{id}/confirm` | wms | apps/web/src/api/wms/replenishment.ts | 76 |
| 2301 | POST | `/api/wms/smart-replenishment/orders/{id}/complete` | wms | apps/web/src/api/wms/replenishment.ts | 80 |
| 2302 | GET | `/api/wms/smart-replenishment/safety-stock` | wms | apps/web/src/api/wms/replenishment.ts | 86 |
| 2303 | GET | `/api/wms/smart-replenishment/safety-stock/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 90 |
| 2304 | PUT | `/api/wms/smart-replenishment/safety-stock/{id}` | wms | apps/web/src/api/wms/replenishment.ts | 97 |
| 2305 | POST | `/api/wms/smart-replenishment/safety-stock/batch-update` | wms | apps/web/src/api/wms/replenishment.ts | 103 |
| 2306 | POST | `/api/wms/smart-replenishment/safety-stock/calculate` | wms | apps/web/src/api/wms/replenishment.ts | 111 |
| 2307 | GET | `/api/wms/serial-numbers` | wms | apps/web/src/api/wms/serialNumber.ts | 15 |
| 2308 | POST | `/api/wms/serial-numbers` | wms | apps/web/src/api/wms/serialNumber.ts | 19 |
| 2309 | POST | `/api/wms/serial-numbers/bulk` | wms | apps/web/src/api/wms/serialNumber.ts | 23 |
| 2310 | GET | `/api/wms/serial-numbers/{id}` | wms | apps/web/src/api/wms/serialNumber.ts | 27 |
| 2311 | GET | `/api/wms/serial-numbers/by-serial/{serialNo}` | wms | apps/web/src/api/wms/serialNumber.ts | 31 |
| 2312 | PUT | `/api/wms/serial-numbers/{id}` | wms | apps/web/src/api/wms/serialNumber.ts | 38 |
| 2313 | DELETE | `/api/wms/serial-numbers/{id}` | wms | apps/web/src/api/wms/serialNumber.ts | 42 |
| 2314 | GET | `/api/wms/serial-numbers/statistics` | wms | apps/web/src/api/wms/serialNumber.ts | 48 |
| 2315 | GET | `/api/wms/serial-numbers/by-batch/{batchNo}` | wms | apps/web/src/api/wms/serialNumber.ts | 52 |
| 2316 | POST | `/api/wms/serial-numbers/{id}/transfer-location` | wms | apps/web/src/api/wms/serialNumber.ts | 59 |
| 2317 | GET | `/api/wms/serial-numbers/{id}/trace` | wms | apps/web/src/api/wms/serialNumber.ts | 63 |
| 2318 | GET | `/api/wms/stock-takes` | wms | apps/web/src/api/wms/stocktake.ts | 14 |
| 2319 | GET | `/api/wms/stock-takes/{id}` | wms | apps/web/src/api/wms/stocktake.ts | 18 |
| 2320 | POST | `/api/wms/stock-takes` | wms | apps/web/src/api/wms/stocktake.ts | 22 |
| 2321 | PUT | `/api/wms/stock-takes/{id}` | wms | apps/web/src/api/wms/stocktake.ts | 26 |
| 2322 | DELETE | `/api/wms/stock-takes/{id}` | wms | apps/web/src/api/wms/stocktake.ts | 30 |
| 2323 | GET | `/api/wms/stock-takes/{id}/items` | wms | apps/web/src/api/wms/stocktake.ts | 43 |
| 2324 | GET | `/api/wms/stock-takes/{id}/items/{item_id}` | wms | apps/web/src/api/wms/stocktake.ts | 47 |
| 2325 | POST | `/api/wms/stock-takes/{id}/items` | wms | apps/web/src/api/wms/stocktake.ts | 54 |
| 2326 | PUT | `/api/wms/stock-takes/{id}/items/{item_id}` | wms | apps/web/src/api/wms/stocktake.ts | 62 |
| 2327 | DELETE | `/api/wms/stock-takes/{id}/items/{item_id}` | wms | apps/web/src/api/wms/stocktake.ts | 66 |
| 2328 | POST | `/api/wms/stock-takes/{id}/start` | wms | apps/web/src/api/wms/stocktake.ts | 70 |
| 2329 | POST | `/api/wms/stock-takes/{id}/count` | wms | apps/web/src/api/wms/stocktake.ts | 77 |
| 2330 | POST | `/api/wms/stock-takes/{id}/complete` | wms | apps/web/src/api/wms/stocktake.ts | 81 |
| 2331 | POST | `/api/wms/stock-takes/{id}/adjust` | wms | apps/web/src/api/wms/stocktake.ts | 85 |
| 2332 | GET | `/api/wms/sync-records` | wms | apps/web/src/api/wms/sync.ts | 9 |
| 2333 | GET | `/api/wms/sync-records/{id}` | wms | apps/web/src/api/wms/sync.ts | 13 |
| 2334 | GET | `/api/wms/sync-records/{sync_record_id}/items` | wms | apps/web/src/api/wms/sync.ts | 20 |
| 2335 | POST | `/api/wms/sync-records/{id}/retry` | wms | apps/web/src/api/wms/sync.ts | 24 |
| 2336 | POST | `/api/wms/sync-records/{id}/retry-items` | wms | apps/web/src/api/wms/sync.ts | 31 |
| 2337 | GET | `/api/wms/sync-records/statistics` | wms | apps/web/src/api/wms/sync.ts | 38 |
| 2338 | POST | `/api/wms/sync/scm` | wms | apps/web/src/api/wms/sync.ts | 47 |
| 2339 | POST | `/api/wms/sync/scm/inventory` | wms | apps/web/src/api/wms/sync.ts | 55 |
| 2340 | POST | `/api/wms/sync/scm/orders` | wms | apps/web/src/api/wms/sync.ts | 63 |
| 2341 | GET | `/api/wms/transfers` | wms | apps/web/src/api/wms/transfer.ts | 15 |
| 2342 | GET | `/api/wms/transfers/{id}` | wms | apps/web/src/api/wms/transfer.ts | 19 |
| 2343 | POST | `/api/wms/transfers` | wms | apps/web/src/api/wms/transfer.ts | 23 |
| 2344 | PUT | `/api/wms/transfers/{id}` | wms | apps/web/src/api/wms/transfer.ts | 27 |
| 2345 | DELETE | `/api/wms/transfers/{id}` | wms | apps/web/src/api/wms/transfer.ts | 31 |
| 2346 | GET | `/api/wms/transfers/{transfer_id}/items` | wms | apps/web/src/api/wms/transfer.ts | 37 |
| 2347 | POST | `/api/wms/transfers/{id}/confirm` | wms | apps/web/src/api/wms/transfer.ts | 41 |
| 2348 | POST | `/api/wms/transfers/{id}/ship` | wms | apps/web/src/api/wms/transfer.ts | 45 |
| 2349 | POST | `/api/wms/transfers/{id}/receive` | wms | apps/web/src/api/wms/transfer.ts | 52 |
| 2350 | POST | `/api/wms/transfers/{id}/complete` | wms | apps/web/src/api/wms/transfer.ts | 56 |
| 2351 | GET | `/api/core/flow/approvals` | workflow | apps/web/src/api/workflow/approval.ts | 6 |
| 2352 | POST | `/api/core/flow/approvals` | workflow | apps/web/src/api/workflow/approval.ts | 10 |
| 2353 | GET | `/api/core/flow/approvals/{id}` | workflow | apps/web/src/api/workflow/approval.ts | 14 |
| 2354 | POST | `/api/core/flow/approvals/{id}/process` | workflow | apps/web/src/api/workflow/approval.ts | 18 |
| 2355 | GET | `/api/core/flow/approvals` | workflow | apps/web/src/api/workflow/approval.ts | 22 |
| 2356 | GET | `/api/core/flow/records` | workflow | apps/web/src/api/workflow/approval.ts | 26 |
| 2357 | GET | `/api/core/flow/records/{approvalId}` | workflow | apps/web/src/api/workflow/approval.ts | 30 |
| 2358 | GET | `/api/core/flow/approval-tasks` | workflow | apps/web/src/api/workflow/approval.ts | 36 |
| 2359 | GET | `/api/core/flow/approval-tasks/{id}` | workflow | apps/web/src/api/workflow/approval.ts | 40 |
| 2360 | POST | `/api/core/flow/approval-tasks/{id}/approve` | workflow | apps/web/src/api/workflow/approval.ts | 44 |
| 2361 | POST | `/api/core/flow/approval-tasks/{id}/reject` | workflow | apps/web/src/api/workflow/approval.ts | 48 |
| 2362 | POST | `/api/core/flow/approval-tasks/{id}/delegate` | workflow | apps/web/src/api/workflow/approval.ts | 52 |
| 2363 | POST | `/api/core/flow/approval-tasks/{id}/reassign` | workflow | apps/web/src/api/workflow/approval.ts | 56 |
| 2364 | POST | `/api/core/flow/approval-tasks/{id}/claim` | workflow | apps/web/src/api/workflow/approval.ts | 60 |
| 2365 | POST | `/api/core/flow/approval-tasks/{id}/unclaim` | workflow | apps/web/src/api/workflow/approval.ts | 64 |
| 2366 | GET | `/api/core/flow/categories/active` | workflow | apps/web/src/api/workflow/category.ts | 22 |
| 2367 | GET | `/api/core/flow/categories/{categoryId}/workflows` | workflow | apps/web/src/api/workflow/category.ts | 26 |
| 2368 | GET | `/api/core/flow/categories/tree` | workflow | apps/web/src/api/workflow/category.ts | 30 |
| 2369 | POST | `/api/core/flow/categories/sort` | workflow | apps/web/src/api/workflow/category.ts | 34 |
| 2370 | POST | `/api/core/flow/workflows/{id}/deploy` | workflow | apps/web/src/api/workflow/definition.ts | 28 |
| 2371 | POST | `/api/core/flow/workflows/{id}/activate` | workflow | apps/web/src/api/workflow/definition.ts | 32 |
| 2372 | POST | `/api/core/flow/workflows/{id}/deactivate` | workflow | apps/web/src/api/workflow/definition.ts | 36 |
| 2373 | GET | `/api/core/flow/workflows/{workflowId}/versions` | workflow | apps/web/src/api/workflow/definition.ts | 40 |
| 2374 | POST | `/api/core/flow/workflows/{workflowId}/versions` | workflow | apps/web/src/api/workflow/definition.ts | 46 |
| 2375 | GET | `/api/core/flow/workflows/{workflowId}/versions/{versionId}` | workflow | apps/web/src/api/workflow/definition.ts | 50 |
| 2376 | POST | `/api/core/flow/workflows/{workflowId}/versions/{versionId}/activate` | workflow | apps/web/src/api/workflow/definition.ts | 54 |
| 2377 | POST | `/api/core/flow/workflows/{workflowId}/rollback` | workflow | apps/web/src/api/workflow/definition.ts | 58 |
| 2378 | GET | `/api/core/flow/workflows/{workflowId}/compare/{version1}/{version2}` | workflow | apps/web/src/api/workflow/definition.ts | 62 |
| 2379 | DELETE | `/api/core/flow/workflows/{workflowId}/versions/{versionId}` | workflow | apps/web/src/api/workflow/definition.ts | 66 |
| 2380 | GET | `/api/core/flow/workflows/{id}/export` | workflow | apps/web/src/api/workflow/definition.ts | 70 |
| 2381 | POST | `/api/core/flow/workflows/import` | workflow | apps/web/src/api/workflow/definition.ts | 74 |
| 2382 | POST | `/api/core/flow/workflows/{id}/copy` | workflow | apps/web/src/api/workflow/definition.ts | 78 |
| 2383 | POST | `/api/core/flow/delegates/{id}/activate` | workflow | apps/web/src/api/workflow/delegate.ts | 27 |
| 2384 | POST | `/api/core/flow/delegates/{id}/deactivate` | workflow | apps/web/src/api/workflow/delegate.ts | 31 |
| 2385 | GET | `/api/core/flow/delegates/my` | workflow | apps/web/src/api/workflow/delegate.ts | 35 |
| 2386 | GET | `/api/core/flow/delegates/my/attorneys` | workflow | apps/web/src/api/workflow/delegate.ts | 39 |
| 2387 | GET | `/api/core/flow/delegates/active` | workflow | apps/web/src/api/workflow/delegate.ts | 44 |
| 2388 | GET | `/api/core/flow/delegates/{id}/workflows` | workflow | apps/web/src/api/workflow/delegate.ts | 48 |
| 2389 | GET | `/api/core/flow/delegates/check/{workflowId}` | workflow | apps/web/src/api/workflow/delegate.ts | 53 |
| 2390 | POST | `/api/core/flow/form-definitions/{id}/activate` | workflow | apps/web/src/api/workflow/form.ts | 31 |
| 2391 | POST | `/api/core/flow/form-definitions/{id}/deactivate` | workflow | apps/web/src/api/workflow/form.ts | 35 |
| 2392 | POST | `/api/core/flow/form-definitions/{id}/publish` | workflow | apps/web/src/api/workflow/form.ts | 39 |
| 2393 | POST | `/api/core/flow/form-definitions/{id}/copy` | workflow | apps/web/src/api/workflow/form.ts | 43 |
| 2394 | GET | `/api/core/flow/form-definitions/workflow/{workflowId}` | workflow | apps/web/src/api/workflow/form.ts | 47 |
| 2395 | GET | `/api/core/flow/form-definitions/categories` | workflow | apps/web/src/api/workflow/form.ts | 51 |
| 2396 | GET | `/api/core/flow/form-definitions/{formId}/versions/{versionId}` | workflow | apps/web/src/api/workflow/form.ts | 55 |
| 2397 | GET | `/api/core/flow/form-definitions/{formId}/versions` | workflow | apps/web/src/api/workflow/form.ts | 59 |
| 2398 | POST | `/api/core/flow/form-definitions/{formId}/versions/{versionId}/rollback` | workflow | apps/web/src/api/workflow/form.ts | 63 |
| 2399 | POST | `/api/core/flow/form-definitions/{id}/preview` | workflow | apps/web/src/api/workflow/form.ts | 67 |
| 2400 | POST | `/api/core/flow/form-definitions/{id}/validate` | workflow | apps/web/src/api/workflow/form.ts | 71 |
| 2401 | GET | `/api/core/flow/form-definitions/{id}/export` | workflow | apps/web/src/api/workflow/form.ts | 75 |
| 2402 | POST | `/api/core/flow/form-definitions/import` | workflow | apps/web/src/api/workflow/form.ts | 81 |
| 2403 | GET | `/api/core/flow/form-instances/workflow-instance/{workflowInstanceId}` | workflow | apps/web/src/api/workflow/form.ts | 102 |
| 2404 | GET | `/api/core/flow/form-instances/form-definition/{formDefinitionId}` | workflow | apps/web/src/api/workflow/form.ts | 106 |
| 2405 | POST | `/api/core/flow/form-instances/{id}/submit` | workflow | apps/web/src/api/workflow/form.ts | 112 |
| 2406 | POST | `/api/core/flow/form-instances/{id}/draft` | workflow | apps/web/src/api/workflow/form.ts | 116 |
| 2407 | GET | `/api/core/flow/form-instances/{id}/data` | workflow | apps/web/src/api/workflow/form.ts | 120 |
| 2408 | PUT | `/api/core/flow/form-instances/{id}/data` | workflow | apps/web/src/api/workflow/form.ts | 124 |
| 2409 | GET | `/api/core/flow/form-instances/{id}/history` | workflow | apps/web/src/api/workflow/form.ts | 128 |
| 2410 | GET | `/api/core/flow/form-instances/my` | workflow | apps/web/src/api/workflow/form.ts | 132 |
| 2411 | GET | `/api/core/flow/form-instances/my/drafts` | workflow | apps/web/src/api/workflow/form.ts | 136 |
| 2412 | GET | `/api/core/flow/form-instances/{id}/export` | workflow | apps/web/src/api/workflow/form.ts | 140 |
| 2413 | GET | `/api/core/flow/history` | workflow | apps/web/src/api/workflow/history.ts | 6 |
| 2414 | GET | `/api/core/flow/history/{id}` | workflow | apps/web/src/api/workflow/history.ts | 10 |
| 2415 | GET | `/api/core/flow/history/instance/{instanceId}` | workflow | apps/web/src/api/workflow/history.ts | 14 |
| 2416 | GET | `/api/core/flow/history/workflow/{workflowId}` | workflow | apps/web/src/api/workflow/history.ts | 18 |
| 2417 | GET | `/api/core/flow/statistics` | workflow | apps/web/src/api/workflow/index.ts | 232 |
| 2418 | GET | `/api/core/flow/performance` | workflow | apps/web/src/api/workflow/index.ts | 236 |
| 2419 | POST | `/api/core/flow/performance/reset` | workflow | apps/web/src/api/workflow/index.ts | 240 |
| 2420 | GET | `/api/core/flow/health` | workflow | apps/web/src/api/workflow/index.ts | 244 |
| 2421 | GET | `/api/core/flow/instances` | workflow | apps/web/src/api/workflow/instance.ts | 6 |
| 2422 | POST | `/api/core/flow/instances` | workflow | apps/web/src/api/workflow/instance.ts | 10 |
| 2423 | GET | `/api/core/flow/instances/{id}` | workflow | apps/web/src/api/workflow/instance.ts | 14 |
| 2424 | GET | `/api/core/flow/instances/{id}/details` | workflow | apps/web/src/api/workflow/instance.ts | 18 |
| 2425 | GET | `/api/core/flow/instances` | workflow | apps/web/src/api/workflow/instance.ts | 22 |
| 2426 | GET | `/api/core/flow/instances/{id}` | workflow | apps/web/src/api/workflow/instance.ts | 26 |
| 2427 | POST | `/api/core/flow/instances/{id}/cancel` | workflow | apps/web/src/api/workflow/instance.ts | 30 |
| 2428 | POST | `/api/core/flow/instances/{id}/suspend` | workflow | apps/web/src/api/workflow/instance.ts | 34 |
| 2429 | POST | `/api/core/flow/instances/{id}/resume` | workflow | apps/web/src/api/workflow/instance.ts | 38 |
| 2430 | DELETE | `/api/core/flow/instances/{id}` | workflow | apps/web/src/api/workflow/instance.ts | 42 |
| 2431 | POST | `/api/core/flow/instances/{id}/activate` | workflow | apps/web/src/api/workflow/instance.ts | 46 |
| 2432 | DELETE | `/api/core/flow/instances/{id}` | workflow | apps/web/src/api/workflow/instance.ts | 50 |
| 2433 | POST | `/api/core/flow/instances/{id}/terminate` | workflow | apps/web/src/api/workflow/instance.ts | 54 |
| 2434 | GET | `/api/core/flow/instances/{id}/variables` | workflow | apps/web/src/api/workflow/instance.ts | 58 |
| 2435 | POST | `/api/core/flow/instances/{id}/variables` | workflow | apps/web/src/api/workflow/instance.ts | 62 |
| 2436 | GET | `/api/core/flow/instances/{id}/tasks` | workflow | apps/web/src/api/workflow/instance.ts | 66 |
| 2437 | GET | `/api/core/flow/instances/{id}/history` | workflow | apps/web/src/api/workflow/instance.ts | 70 |
| 2438 | GET | `/api/core/flow/instances/{id}/logs` | workflow | apps/web/src/api/workflow/instance.ts | 74 |
| 2439 | GET | `/api/core/flow/instances/{id}/diagram` | workflow | apps/web/src/api/workflow/instance.ts | 78 |
| 2440 | GET | `/api/core/flow/monitor/instances` | workflow | apps/web/src/api/workflow/monitor.ts | 18 |
| 2441 | GET | `/api/core/flow/monitor/instances/{id}` | workflow | apps/web/src/api/workflow/monitor.ts | 22 |
| 2442 | GET | `/api/core/flow/monitor/instances/{id}/history` | workflow | apps/web/src/api/workflow/monitor.ts | 28 |
| 2443 | GET | `/api/core/flow/monitor/instances/{id}/tasks` | workflow | apps/web/src/api/workflow/monitor.ts | 32 |
| 2444 | GET | `/api/core/flow/monitor/instances/{id}/variables` | workflow | apps/web/src/api/workflow/monitor.ts | 36 |
| 2445 | GET | `/api/core/flow/monitor/instances/{id}/diagram` | workflow | apps/web/src/api/workflow/monitor.ts | 40 |
| 2446 | GET | `/api/core/flow/monitor/instances/running` | workflow | apps/web/src/api/workflow/monitor.ts | 44 |
| 2447 | GET | `/api/core/flow/monitor/instances/completed` | workflow | apps/web/src/api/workflow/monitor.ts | 48 |
| 2448 | GET | `/api/core/flow/monitor/instances/rejected` | workflow | apps/web/src/api/workflow/monitor.ts | 52 |
| 2449 | GET | `/api/core/flow/monitor/instances/suspended` | workflow | apps/web/src/api/workflow/monitor.ts | 56 |
| 2450 | GET | `/api/core/flow/monitor/instances/overdue` | workflow | apps/web/src/api/workflow/monitor.ts | 60 |
| 2451 | GET | `/api/core/flow/monitor/statistics` | workflow | apps/web/src/api/workflow/monitor.ts | 64 |
| 2452 | GET | `/api/core/flow/monitor/analysis/{workflowId}` | workflow | apps/web/src/api/workflow/monitor.ts | 68 |
| 2453 | GET | `/api/core/flow/monitor/analysis/{workflowId}/nodes` | workflow | apps/web/src/api/workflow/monitor.ts | 74 |
| 2454 | GET | `/api/core/flow/monitor/analysis/{workflowId}/bottlenecks` | workflow | apps/web/src/api/workflow/monitor.ts | 78 |
| 2455 | GET | `/api/core/flow/monitor/analysis/efficiency` | workflow | apps/web/src/api/workflow/monitor.ts | 82 |
| 2456 | GET | `/api/core/flow/monitor/analysis/trend` | workflow | apps/web/src/api/workflow/monitor.ts | 88 |
| 2457 | GET | `/api/core/flow/monitor/analysis/users` | workflow | apps/web/src/api/workflow/monitor.ts | 94 |
| 2458 | GET | `/api/core/flow/monitor/analysis/departments` | workflow | apps/web/src/api/workflow/monitor.ts | 100 |
| 2459 | GET | `/api/core/flow/monitor/logs` | workflow | apps/web/src/api/workflow/monitor.ts | 106 |
| 2460 | GET | `/api/core/flow/monitor/logs/{id}` | workflow | apps/web/src/api/workflow/monitor.ts | 110 |
| 2461 | GET | `/api/core/flow/monitor/logs/instance/{instanceId}` | workflow | apps/web/src/api/workflow/monitor.ts | 114 |
| 2462 | GET | `/api/core/flow/monitor/logs/workflow/{workflowId}` | workflow | apps/web/src/api/workflow/monitor.ts | 118 |
| 2463 | GET | `/api/core/flow/monitor/logs/node/{workflowId}/{nodeId}` | workflow | apps/web/src/api/workflow/monitor.ts | 122 |
| 2464 | GET | `/api/core/flow/monitor/logs/user/{userId}` | workflow | apps/web/src/api/workflow/monitor.ts | 126 |
| 2465 | GET | `/api/core/flow/monitor/realtime` | workflow | apps/web/src/api/workflow/monitor.ts | 130 |
| 2466 | GET | `/api/core/flow/monitor/dashboard` | workflow | apps/web/src/api/workflow/monitor.ts | 134 |
| 2467 | GET | `/api/core/flow/monitor/performance` | workflow | apps/web/src/api/workflow/monitor.ts | 138 |
| 2468 | GET | `/api/core/flow/monitor/sla-compliance` | workflow | apps/web/src/api/workflow/monitor.ts | 142 |
| 2469 | GET | `/api/core/flow/monitor/instances/error` | workflow | apps/web/src/api/workflow/monitor.ts | 146 |
| 2470 | POST | `/api/core/flow/monitor/instances/{id}/retry` | workflow | apps/web/src/api/workflow/monitor.ts | 150 |
| 2471 | POST | `/api/core/flow/monitor/instances/{id}/skip` | workflow | apps/web/src/api/workflow/monitor.ts | 154 |
| 2472 | POST | `/api/core/flow/monitor/instances/{id}/force-complete` | workflow | apps/web/src/api/workflow/monitor.ts | 158 |
| 2473 | POST | `/api/core/flow/monitor/instances/{id}/force-terminate` | workflow | apps/web/src/api/workflow/monitor.ts | 162 |
| 2474 | GET | `/api/core/flow/rules/workflow/{workflowId}` | workflow | apps/web/src/api/workflow/rule.ts | 20 |
| 2475 | GET | `/api/core/flow/rules/node/{workflowId}/{nodeId}` | workflow | apps/web/src/api/workflow/rule.ts | 24 |
| 2476 | GET | `/api/core/flow/rules/type` | workflow | apps/web/src/api/workflow/rule.ts | 28 |
| 2477 | POST | `/api/core/flow/rules/{id}/activate` | workflow | apps/web/src/api/workflow/rule.ts | 34 |
| 2478 | POST | `/api/core/flow/rules/{id}/deactivate` | workflow | apps/web/src/api/workflow/rule.ts | 38 |
| 2479 | POST | `/api/core/flow/rules/batch` | workflow | apps/web/src/api/workflow/rule.ts | 42 |
| 2480 | POST | `/api/core/flow/rules/{id}/test` | workflow | apps/web/src/api/workflow/rule.ts | 46 |
| 2481 | GET | `/api/core/flow/settings` | workflow | apps/web/src/api/workflow/setting.ts | 6 |
| 2482 | GET | `/api/core/flow/settings/{id}` | workflow | apps/web/src/api/workflow/setting.ts | 10 |
| 2483 | PUT | `/api/core/flow/settings/{id}` | workflow | apps/web/src/api/workflow/setting.ts | 14 |
| 2484 | GET | `/api/core/flow/settings/key/{key}` | workflow | apps/web/src/api/workflow/setting.ts | 18 |
| 2485 | POST | `/api/core/flow/settings/batch` | workflow | apps/web/src/api/workflow/setting.ts | 22 |
| 2486 | POST | `/api/core/flow/settings/{id}/reset` | workflow | apps/web/src/api/workflow/setting.ts | 26 |
| 2487 | GET | `/api/core/flow/tasks` | workflow | apps/web/src/api/workflow/task.ts | 15 |
| 2488 | GET | `/api/core/flow/tasks/{id}` | workflow | apps/web/src/api/workflow/task.ts | 19 |
| 2489 | GET | `/api/core/flow/tasks` | workflow | apps/web/src/api/workflow/task.ts | 23 |
| 2490 | GET | `/api/core/flow/tasks/{id}` | workflow | apps/web/src/api/workflow/task.ts | 27 |
| 2491 | POST | `/api/core/flow/tasks/{id}/claim` | workflow | apps/web/src/api/workflow/task.ts | 31 |
| 2492 | POST | `/api/core/flow/tasks/{id}/unclaim` | workflow | apps/web/src/api/workflow/task.ts | 35 |
| 2493 | POST | `/api/core/flow/tasks/{id}/complete` | workflow | apps/web/src/api/workflow/task.ts | 42 |
| 2494 | POST | `/api/core/flow/tasks/{id}/approve` | workflow | apps/web/src/api/workflow/task.ts | 46 |
| 2495 | POST | `/api/core/flow/tasks/{id}/reject` | workflow | apps/web/src/api/workflow/task.ts | 50 |
| 2496 | POST | `/api/core/flow/tasks/{id}/delegate` | workflow | apps/web/src/api/workflow/task.ts | 54 |
| 2497 | POST | `/api/core/flow/tasks/{id}/transfer` | workflow | apps/web/src/api/workflow/task.ts | 58 |
| 2498 | POST | `/api/core/flow/tasks/{id}/reassign` | workflow | apps/web/src/api/workflow/task.ts | 65 |
| 2499 | POST | `/api/core/flow/tasks/{id}/add-sign` | workflow | apps/web/src/api/workflow/task.ts | 69 |
| 2500 | POST | `/api/core/flow/tasks/{id}/counter-sign` | workflow | apps/web/src/api/workflow/task.ts | 73 |
| 2501 | POST | `/api/core/flow/tasks/{id}/withdraw` | workflow | apps/web/src/api/workflow/task.ts | 77 |
| 2502 | POST | `/api/core/flow/tasks/{id}/return` | workflow | apps/web/src/api/workflow/task.ts | 81 |
| 2503 | POST | `/api/core/flow/tasks/{id}/jump` | workflow | apps/web/src/api/workflow/task.ts | 85 |
| 2504 | POST | `/api/core/flow/tasks/{id}/urge` | workflow | apps/web/src/api/workflow/task.ts | 89 |
| 2505 | POST | `/api/core/flow/tasks/batch/approve` | workflow | apps/web/src/api/workflow/task.ts | 93 |
| 2506 | POST | `/api/core/flow/tasks/batch/complete` | workflow | apps/web/src/api/workflow/task.ts | 100 |
| 2507 | POST | `/api/core/flow/tasks/batch/delegate` | workflow | apps/web/src/api/workflow/task.ts | 111 |
| 2508 | GET | `/api/core/flow/tasks/my` | workflow | apps/web/src/api/workflow/task.ts | 118 |
| 2509 | GET | `/api/core/flow/tasks/my/pending` | workflow | apps/web/src/api/workflow/task.ts | 122 |
| 2510 | GET | `/api/core/flow/tasks/my/completed` | workflow | apps/web/src/api/workflow/task.ts | 126 |
| 2511 | GET | `/api/core/flow/tasks/my/involved` | workflow | apps/web/src/api/workflow/task.ts | 130 |
| 2512 | GET | `/api/core/flow/tasks/my/created` | workflow | apps/web/src/api/workflow/task.ts | 134 |
| 2513 | GET | `/api/core/flow/tasks/candidate` | workflow | apps/web/src/api/workflow/task.ts | 138 |
| 2514 | GET | `/api/core/flow/tasks/{taskId}/comments` | workflow | apps/web/src/api/workflow/task.ts | 142 |
| 2515 | POST | `/api/core/flow/tasks/{taskId}/comments` | workflow | apps/web/src/api/workflow/task.ts | 146 |
| 2516 | GET | `/api/core/flow/tasks/{taskId}/attachments` | workflow | apps/web/src/api/workflow/task.ts | 150 |
| 2517 | POST | `/api/core/flow/tasks/{taskId}/attachments` | workflow | apps/web/src/api/workflow/task.ts | 154 |
| 2518 | DELETE | `/api/core/flow/tasks/{taskId}/attachments/{attachmentId}` | workflow | apps/web/src/api/workflow/task.ts | 158 |
| 2519 | GET | `/api/core/flow/tasks/{taskId}/form` | workflow | apps/web/src/api/workflow/task.ts | 162 |
| 2520 | POST | `/api/core/flow/tasks/{taskId}/form` | workflow | apps/web/src/api/workflow/task.ts | 166 |
| 2521 | GET | `/api/core/flow/tasks/{taskId}/variables` | workflow | apps/web/src/api/workflow/task.ts | 170 |
| 2522 | POST | `/api/core/flow/tasks/{taskId}/variables` | workflow | apps/web/src/api/workflow/task.ts | 174 |
| 2523 | GET | `/api/core/flow/tasks/count` | workflow | apps/web/src/api/workflow/task.ts | 178 |
| 2524 | GET | `/api/core/flow/tasks/my/count` | workflow | apps/web/src/api/workflow/task.ts | 182 |
| 2525 | GET | `/api/core/flow/tasks/high-priority` | workflow | apps/web/src/api/workflow/task.ts | 186 |
| 2526 | GET | `/api/core/flow/tasks/overdue` | workflow | apps/web/src/api/workflow/task.ts | 190 |
| 2527 | GET | `/api/core/flow/tasks/due-soon` | workflow | apps/web/src/api/workflow/task.ts | 194 |
| 2528 | GET | `/api/core/flow/tasks/{taskId}/timeline` | workflow | apps/web/src/api/workflow/task.ts | 198 |
| 2529 | GET | `/api/core/flow/tasks/{taskId}/history` | workflow | apps/web/src/api/workflow/task.ts | 202 |
| 2530 | GET | `/api/core/flow/tasks/my/pending` | workflow | apps/web/src/api/workflow/task.ts | 206 |
| 2531 | GET | `/api/core/flow/tasks/my/completed` | workflow | apps/web/src/api/workflow/task.ts | 210 |
| 2532 | GET | `/api/core/flow/tasks/my/created` | workflow | apps/web/src/api/workflow/task.ts | 214 |
| 2533 | GET | `/api/core/flow/tasks/my/cc` | workflow | apps/web/src/api/workflow/task.ts | 218 |
| 2534 | GET | `/api/core/flow/tasks/my/stats` | workflow | apps/web/src/api/workflow/task.ts | 222 |
| 2535 | GET | `/api/core/flow/templates` | workflow | apps/web/src/api/workflow/template.ts | 6 |
| 2536 | GET | `/api/core/flow/templates/{id}` | workflow | apps/web/src/api/workflow/template.ts | 10 |
| 2537 | POST | `/api/core/flow/templates` | workflow | apps/web/src/api/workflow/template.ts | 14 |
| 2538 | PUT | `/api/core/flow/templates/{id}` | workflow | apps/web/src/api/workflow/template.ts | 18 |
| 2539 | DELETE | `/api/core/flow/templates/{id}` | workflow | apps/web/src/api/workflow/template.ts | 22 |
| 2540 | POST | `/api/core/flow/templates/{id}/copy` | workflow | apps/web/src/api/workflow/template.ts | 26 |
| 2541 | GET | `/api/core/flow/templates/{id}/export` | workflow | apps/web/src/api/workflow/template.ts | 30 |
| 2542 | POST | `/api/core/flow/templates/import` | workflow | apps/web/src/api/workflow/template.ts | 34 |
| 2543 | GET | `/api/core/flow/{endpoint}/{id}` | workflow | apps/web/src/api/workflow/utils.ts | 35 |
| 2544 | PUT | `/api/core/flow/{endpoint}/{id}` | workflow | apps/web/src/api/workflow/utils.ts | 43 |
| 2545 | DELETE | `/api/core/flow/{endpoint}/{id}` | workflow | apps/web/src/api/workflow/utils.ts | 47 |
| 2546 | GET | `/api/core/flow/variables/instance/{instanceId}` | workflow | apps/web/src/api/workflow/variable.ts | 6 |
| 2547 | GET | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 10 |
| 2548 | POST | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 14 |
| 2549 | DELETE | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 21 |
| 2550 | GET | `/api/core/flow/variables/instance/{instanceId}` | workflow | apps/web/src/api/workflow/variable.ts | 25 |
| 2551 | GET | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 29 |
| 2552 | POST | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 33 |
| 2553 | POST | `/api/core/flow/variables/instance/{instanceId}` | workflow | apps/web/src/api/workflow/variable.ts | 40 |
| 2554 | DELETE | `/api/core/flow/variables/instance/{instanceId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 44 |
| 2555 | GET | `/api/core/flow/variables/task/{taskId}` | workflow | apps/web/src/api/workflow/variable.ts | 48 |
| 2556 | POST | `/api/core/flow/variables/task/{taskId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 52 |
| 2557 | POST | `/api/core/flow/variables/global/{workflowId}/{key}` | workflow | apps/web/src/api/workflow/variable.ts | 64 |
| 2558 | GET | `/api/core/flow/variables/instance/{instanceId}/scope/{scope}` | workflow | apps/web/src/api/workflow/variable.ts | 71 |
| 2559 | GET | `/api/core/flow/variables/instance/{instanceId}/{key}/history` | workflow | apps/web/src/api/workflow/variable.ts | 75 |

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
