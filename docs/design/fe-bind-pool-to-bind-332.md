# 前端绑定池：to_bind 332 条可执行清单（v73 重建基线）

> 来源：`artifacts/audit/orphan-review/v73-rebuild-master.csv`（2026-10-12 重建，to_bind 332 条 = 已注册 real handler、前端未绑定）。
> 处置规则（沿用批 0 建议）：**保留（前端绑定）** / **下线（无业务价值删路由）** / **重构**。优先级自动判定：
> - **P0**：写端点 + 前端弱引用（绑定收益最高，CRUD 补全核心）
> - **P1**：写端点 + 前端无引用（后端已有，前端缺 CRUD 页）
> - **P2**：读端点 + 前端弱引用（读绑定，列表/详情接线）
> - **管理端绑定池**：reason 明确建议进入管理端（ai 平台端点，保留绑定给管理端）
> - **下线候选**：读端点 + 无引用（无绑定价值，人工确认后可删路由）

## ai（10 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /ai/ | home | weak | none | 保留 |
| 管理端绑定池 | POST | /api/ai/agent/run | agent_run | none | none | 待定 |
| 管理端绑定池 | GET | /api/ai/agent/tools | list_agent_tools | none | none | 待定 |
| 管理端绑定池 | GET | /api/ai/connectors | list_connectors | none | none | 待定 |
| 管理端绑定池 | POST | /api/ai/connectors/create | create_connector | none | none | 待定 |
| 管理端绑定池 | POST | /api/ai/connectors/delete | delete_connector | none | none | 待定 |
| 管理端绑定池 | GET | /api/ai/connectors/get | get_connector | none | none | 待定 |
| 管理端绑定池 | POST | /api/ai/connectors/query | query_data | none | none | 待定 |
| 管理端绑定池 | GET | /api/ai/connectors/test | test_connector | none | none | 待定 |
| 管理端绑定池 | POST | /api/ai/connectors/update | update_connector | none | none | 待定 |

## analytics（4 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P2 | GET | /api/bi/analysis | list_analyses | weak | none | 保留 |
| P2 | POST | /api/bi/analysis | create_analysis | weak | none | 保留 |
| P2 | GET | /api/bi/analysis/{id} | get_analysis | weak | none | 保留 |
| P2 | POST | /api/bi/analysis/{id}/execute | execute_analysis | weak | none | 保留 |

## billing（8 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /billing/invoices/{tenant_id} | list_invoices | weak | none | 保留 |
| 管理端绑定池 | GET | /billing/plans | list_plans | weak | none | 保留 |
| 管理端绑定池 | GET | /billing/plans/{id} | get_plan | weak | none | 保留 |
| 管理端绑定池 | POST | /billing/subscriptions | create_subscription | weak | none | 保留 |
| 管理端绑定池 | GET | /billing/subscriptions/{tenant_id} | get_subscription | weak | none | 保留 |
| 管理端绑定池 | PUT | /billing/subscriptions/{tenant_id} | cancel_subscription | weak | none | 保留 |
| 管理端绑定池 | GET | /billing/usage/{tenant_id} | get_usage_summary | weak | none | 保留 |
| 管理端绑定池 | POST | /billing/usage/{tenant_id}/{metric_type} | record_usage | weak | none | 保留 |

## communication（2 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /communication/notify/list | list_notifications | none | write | 待定 |
| 管理端绑定池 | POST | /communication/notify/send | send_notification | none | write | 待定 |

## ehs（102 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /api/ehs/checks/plans/{plan_id}/items | list_plan_items | weak | write | 保留 |
| P0 | GET | /api/ehs/environmental-compliance/regulations/categories | list_regulation_categories | weak | write | 保留 |
| P0 | PUT | /api/ehs/hazardous-materials/{id}/msds | update_material_msds | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/cases | list_disease_cases | weak | write | 保留 |
| P0 | POST | /api/ehs/occupational-disease/cases | create_disease_case | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/cases/{id} | get_disease_case | weak | write | 保留 |
| P0 | PUT | /api/ehs/occupational-disease/cases/{id} | update_disease_case | weak | write | 保留 |
| P0 | DELETE | /api/ehs/occupational-disease/cases/{id} | delete_disease_case | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/detections | list_detection_records | weak | write | 保留 |
| P0 | POST | /api/ehs/occupational-disease/detections | create_detection_record | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/detections/{id} | get_detection_record | weak | write | 保留 |
| P0 | DELETE | /api/ehs/occupational-disease/detections/{id} | delete_detection_record | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/factor-types | list_factor_types | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/factors | list_hazard_factors | weak | write | 保留 |
| P0 | POST | /api/ehs/occupational-disease/factors | create_hazard_factor | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/factors/{id} | get_hazard_factor | weak | write | 保留 |
| P0 | PUT | /api/ehs/occupational-disease/factors/{id} | update_hazard_factor | weak | write | 保留 |
| P0 | DELETE | /api/ehs/occupational-disease/factors/{id} | delete_hazard_factor | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/protection-measures | list_protection_measures | weak | write | 保留 |
| P0 | POST | /api/ehs/occupational-disease/protection-measures | create_protection_measure | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/protection-measures/{id} | get_protection_measure | weak | write | 保留 |
| P0 | PUT | /api/ehs/occupational-disease/protection-measures/{id} | update_protection_measure | weak | write | 保留 |
| P0 | DELETE | /api/ehs/occupational-disease/protection-measures/{id} | delete_protection_measure | weak | write | 保留 |
| P0 | GET | /api/ehs/occupational-disease/statistics | get_disease_statistics | weak | write | 保留 |
| P0 | PUT | /api/ehs/sync/configs | update_sync_configs | weak | write | 保留 |
| P0 | GET | /api/ehs/training | list_trainings | weak | write | 保留 |
| P0 | POST | /api/ehs/training | create_training | weak | write | 保留 |
| P0 | GET | /api/ehs/training/{id} | get_training | weak | write | 保留 |
| P0 | PUT | /api/ehs/training/{id} | update_training | weak | write | 保留 |
| P0 | DELETE | /api/ehs/training/{id} | delete_training | weak | write | 保留 |
| P1 | GET | /api/ehs/drills/plans | list_drill_plans | none | write | 待定 |
| P1 | POST | /api/ehs/drills/plans | create_drill_plan | none | write | 待定 |
| P1 | GET | /api/ehs/drills/plans/{id} | get_drill_plan | none | write | 待定 |
| P1 | PUT | /api/ehs/drills/plans/{id} | update_drill_plan | none | write | 待定 |
| P1 | DELETE | /api/ehs/drills/plans/{id} | delete_drill_plan | none | write | 待定 |
| P1 | GET | /api/ehs/drills/records | list_drill_records | none | write | 待定 |
| P1 | POST | /api/ehs/drills/records | create_drill_record | none | write | 待定 |
| P1 | GET | /api/ehs/drills/records/{id} | get_drill_record | none | write | 待定 |
| P1 | PUT | /api/ehs/drills/records/{id} | update_drill_record | none | write | 待定 |
| P1 | DELETE | /api/ehs/drills/records/{id} | delete_drill_record | none | write | 待定 |
| P1 | POST | /api/ehs/drills/records/{id}/evaluation | create_drill_evaluation | none | write | 待定 |
| P1 | GET | /api/ehs/drills/records/{id}/problems | list_drill_problems | none | write | 待定 |
| P1 | POST | /api/ehs/drills/records/{id}/problems | create_drill_problem | none | write | 待定 |
| P1 | PUT | /api/ehs/drills/records/{id}/problems/{problem_id} | update_drill_problem | none | write | 待定 |
| P1 | GET | /api/ehs/drills/statistics | get_drill_statistics | none | write | 待定 |
| P1 | GET | /api/ehs/drills/types | list_drill_types | none | write | 待定 |
| P1 | GET | /api/ehs/emergency-plans | ehs_list_plans_api_ehs_emergency-plans | none | write | 待定 |
| P1 | POST | /api/ehs/emergency-plans | ehs_create_plan_api_ehs_emergency-plans | none | write | 待定 |
| P1 | GET | /api/ehs/emergency-plans/categories | list_plan_categories | none | write | 待定 |
| P1 | GET | /api/ehs/emergency-plans/{id} | ehs_get_plan_api_ehs_emergency-plans_{id} | none | write | 待定 |
| P1 | PUT | /api/ehs/emergency-plans/{id} | ehs_update_plan_api_ehs_emergency-plans_{id} | none | write | 待定 |
| P1 | DELETE | /api/ehs/emergency-plans/{id} | ehs_delete_plan_api_ehs_emergency-plans_{id} | none | write | 待定 |
| P1 | POST | /api/ehs/emergency-plans/{id}/approve | approve_plan | none | write | 待定 |
| P1 | POST | /api/ehs/emergency-plans/{id}/submit-approval | submit_plan_approval | none | write | 待定 |
| P1 | GET | /api/ehs/emergency-plans/{id}/supplies | list_plan_supplies | none | write | 待定 |
| P1 | POST | /api/ehs/emergency-plans/{id}/supplies | add_plan_supply | none | write | 待定 |
| P1 | DELETE | /api/ehs/emergency-plans/{id}/supplies/{supply_id} | delete_plan_supply | none | write | 待定 |
| P1 | GET | /api/ehs/emergency-plans/{id}/versions | list_plan_versions | none | write | 待定 |
| P1 | POST | /api/ehs/emergency-plans/{id}/versions | create_new_version | none | write | 待定 |
| P1 | GET | /api/ehs/environmental-compliance/evaluations | list_evaluations | none | write | 待定 |
| P1 | POST | /api/ehs/environmental-compliance/evaluations | create_evaluation | none | write | 待定 |
| P1 | GET | /api/ehs/environmental-compliance/evaluations/{id} | get_evaluation | none | write | 待定 |
| P1 | PUT | /api/ehs/environmental-compliance/evaluations/{id} | update_evaluation | none | write | 待定 |
| P1 | DELETE | /api/ehs/environmental-compliance/evaluations/{id} | delete_evaluation | none | write | 待定 |
| P1 | GET | /api/ehs/environmental-compliance/incidents | list_incidents | none | write | 待定 |
| P1 | POST | /api/ehs/environmental-compliance/incidents | create_incident | none | write | 待定 |
| P1 | GET | /api/ehs/environmental-compliance/incidents/{id} | get_incident | none | write | 待定 |
| P1 | PUT | /api/ehs/environmental-compliance/incidents/{id} | update_incident | none | write | 待定 |
| P1 | DELETE | /api/ehs/environmental-compliance/incidents/{id} | delete_incident | none | write | 待定 |
| P1 | GET | /api/ehs/environmental-compliance/statistics | get_compliance_statistics | none | write | 待定 |
| P1 | GET | /api/ehs/hazardous-materials/statistics | get_material_statistics | none | write | 待定 |
| P1 | GET | /api/ehs/hazardous-materials/stock-records | list_stock_records | none | write | 待定 |
| P1 | POST | /api/ehs/hazardous-materials/stock-records/stock-in | create_stock_in | none | write | 待定 |
| P1 | POST | /api/ehs/hazardous-materials/stock-records/stock-out | create_stock_out | none | write | 待定 |
| P1 | GET | /api/ehs/hazardous-materials/stock-records/{id} | get_stock_record | none | write | 待定 |
| P1 | GET | /api/ehs/hazardous-materials/{id}/stocks | list_material_stocks | none | write | 待定 |
| P1 | GET | /api/ehs/hazards/{id}/controls | list_control_measures | none | write | 待定 |
| P1 | POST | /api/ehs/issues/{id}/approval/approve | approve_hazard | none | write | 待定 |
| P1 | POST | /api/ehs/issues/{id}/approval/reject | reject_hazard | none | write | 待定 |
| P1 | POST | /api/ehs/issues/{id}/approval/start | start_hazard_approval | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/abnormalities | list_abnormalities | none | write | 待定 |
| P1 | PUT | /api/ehs/occupational-health/abnormalities/{id} | update_abnormality | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/exam-plans | list_exam_plans | none | write | 待定 |
| P1 | POST | /api/ehs/occupational-health/exam-plans | create_exam_plan | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/exam-plans/{id} | get_exam_plan | none | write | 待定 |
| P1 | PUT | /api/ehs/occupational-health/exam-plans/{id} | update_exam_plan | none | write | 待定 |
| P1 | DELETE | /api/ehs/occupational-health/exam-plans/{id} | delete_exam_plan | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/exam-records | list_exam_records | none | write | 待定 |
| P1 | POST | /api/ehs/occupational-health/exam-records | create_exam_record | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/exam-records/{id} | get_exam_record | none | write | 待定 |
| P1 | PUT | /api/ehs/occupational-health/exam-records/{id} | update_exam_record | none | write | 待定 |
| P1 | DELETE | /api/ehs/occupational-health/exam-records/{id} | delete_exam_record | none | write | 待定 |
| P1 | GET | /api/ehs/occupational-health/exam-types | list_exam_types | none | write | 待定 |
| P1 | POST | /api/ehs/sync/accident-to-lims | sync_accident_to_lims | none | write | 待定 |
| P1 | POST | /api/ehs/sync/hazard-to-qms | sync_hazard_to_qms | none | write | 待定 |
| 管理端绑定池 | GET | /api/ehs/environmental-compliance/monitoring | list_monitor_records | none | write | 待定 |
| 管理端绑定池 | POST | /api/ehs/environmental-compliance/monitoring | create_monitor_record | none | write | 待定 |
| 管理端绑定池 | GET | /api/ehs/environmental-compliance/monitoring/types | list_monitor_types | none | write | 待定 |
| 管理端绑定池 | GET | /api/ehs/environmental-compliance/monitoring/{id} | get_monitor_record | none | write | 待定 |
| 管理端绑定池 | DELETE | /api/ehs/environmental-compliance/monitoring/{id} | delete_monitor_record | none | write | 待定 |
| 管理端绑定池 | DELETE | /api/ehs/sync-records/{id} | ehs_delete_sync_record | weak | write | 保留 |
| 管理端绑定池 | POST | /api/ehs/sync-records/{id}/retry | ehs_retry_sync | none | write | 待定 |

## erp（1 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /erp/addressbook/export | export_contacts | weak | write | 保留 |

## finance（27 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /finance/accounts/code/{code} | get_account_by_code | weak | write | 保留 |
| P0 | GET | /finance/balance-sheet/{period} | get_balance_sheet | weak | write | 保留 |
| P0 | GET | /finance/budgets | list_budgets | weak | write | 保留 |
| P0 | POST | /finance/budgets | create_budget | weak | write | 保留 |
| P0 | GET | /finance/budgets/{id} | get_budget | weak | write | 保留 |
| P0 | PUT | /finance/budgets/{id} | update_budget | weak | write | 保留 |
| P0 | DELETE | /finance/budgets/{id} | delete_budget | weak | write | 保留 |
| P0 | GET | /finance/cash-flow/{period} | get_cash_flow | weak | write | 保留 |
| P0 | GET | /finance/expenses | list_expenses | weak | write | 保留 |
| P0 | POST | /finance/expenses | create_expense | weak | write | 保留 |
| P0 | GET | /finance/expenses/{id} | get_expense | weak | write | 保留 |
| P0 | PUT | /finance/expenses/{id} | update_expense | weak | write | 保留 |
| P0 | DELETE | /finance/expenses/{id} | delete_expense | weak | write | 保留 |
| P0 | GET | /finance/income-statement/{period} | get_income_statement | weak | write | 保留 |
| P0 | GET | /finance/ledger | get_ledger | weak | write | 保留 |
| P0 | POST | /finance/payables/batch | batch_create_payables_handler | weak | write | 保留 |
| P0 | POST | /finance/receivables/batch | batch_create_receivables_handler | weak | write | 保留 |
| P0 | GET | /finance/reports/balance-sheet/export | export_balance_sheet_report | weak | write | 保留 |
| P0 | GET | /finance/reports/cash-flow/export | export_cash_flow_report | weak | write | 保留 |
| P0 | GET | /finance/reports/income-statement/export | export_income_statement_report | weak | write | 保留 |
| P0 | GET | /finance/trial-balance/{period} | get_trial_balance | weak | write | 保留 |
| P0 | GET | /finance/voucher-generation-rules/{ruleId} | get_generation_rule_handler | weak | write | 保留 |
| P0 | GET | /finance/voucher-templates/{templateId}/entries | list_entries | weak | write | 保留 |
| P0 | GET | /finance/voucher-templates/{templateId}/entries/{entryId} | get_entry | weak | write | 保留 |
| P0 | GET | /finance/voucher-templates/{templateId}/export | export_template | weak | write | 保留 |
| P0 | POST | /finance/vouchers/export | export_vouchers | weak | write | 保留 |
| P0 | POST | /finance/vouchers/{id}/unpost | unpost_voucher | weak | write | 保留 |

## flow（12 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /api/core/flow/approvals/pending | list_pending_approvals | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/approvals/{id}/approve | approve_task | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/approvals/{id}/reject | reject_task | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/instances/{id}/approve | approve_instance | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/instances/{id}/reject | reject_instance | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/instances/{id}/start | start_instance | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/workflows | create_workflow | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/flow/workflows/{id} | get_workflow | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/core/flow/workflows/{id} | update_workflow | weak | write | 保留 |
| 管理端绑定池 | DELETE | /api/core/flow/workflows/{id} | delete_workflow | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/workflows/{id}/publish | publish_workflow | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/flow/workflows/{id}/unpublish | unpublish_workflow | weak | write | 保留 |

## gis（10 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /gis/locations | list_locations | weak | write | 保留 |
| P0 | GET | /gis/locations/{id} | get_location | weak | write | 保留 |
| P1 | GET | /gis/devices | list_devices | none | write | 待定 |
| P1 | GET | /gis/devices/{id} | get_device | none | write | 待定 |
| P1 | POST | /gis/locations/create | create_location | none | write | 待定 |
| P1 | GET | /gis/maps | list_maps | none | write | 待定 |
| P1 | POST | /gis/maps/create | create_map | none | write | 待定 |
| P1 | GET | /gis/maps/{id} | get_map | none | write | 待定 |
| P1 | PUT | /gis/maps/{id} | update_map | none | write | 待定 |
| P1 | DELETE | /gis/maps/{id} | delete_map | none | write | 待定 |

## integration（22 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /api/integration/mes-erp/records | list_mes_erp_sync_records | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-erp/sync/erp-to-mes | sync_erp_order_to_mes | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-erp/sync/mes-to-erp | sync_mes_progress_to_erp | weak | write | 保留 |
| 管理端绑定池 | GET | /api/integration/mes-erp/{id}/logs | get_mes_erp_sync_logs | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-erp/{id}/retry | retry_mes_erp_sync | weak | write | 保留 |
| 管理端绑定池 | GET | /api/integration/mes-qms | list_mes_qms_sync_api | weak | none | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-qms/defect-handling | defect_handling_api | weak | none | 保留 |
| 管理端绑定池 | GET | /api/integration/mes-qms/stats | get_mes_qms_stats_api | weak | none | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-qms/sync-result | sync_quality_result_api | weak | none | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-qms/sync-trace | sync_trace_chain_api | weak | none | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-qms/trigger-inspection | trigger_qms_inspection_api | weak | none | 保留 |
| 管理端绑定池 | GET | /api/integration/mes-qms/{id} | get_mes_qms_sync_api | weak | none | 保留 |
| 管理端绑定池 | POST | /api/integration/mes-qms/{id}/retry | retry_mes_qms_sync_api | weak | none | 保留 |
| 管理端绑定池 | GET | /api/integration/sync/pending | get_pending | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/retry-failed | retry_failed | weak | write | 保留 |
| 管理端绑定池 | GET | /api/integration/sync/statistics | integration_get_statistics | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/tasks | create_task | weak | write | 保留 |
| 管理端绑定池 | GET | /api/integration/sync/tasks/{task_id} | integration_get_task | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/tasks/{task_id}/status | update_status | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/trigger/scm-to-wms | trigger_scm_wms | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/trigger/srm-to-scm | trigger_srm_scm | weak | write | 保留 |
| 管理端绑定池 | POST | /api/integration/sync/trigger/wms-to-crm | trigger_wms_crm | weak | write | 保留 |

## lims（6 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | POST | /lims/instruments | create_instrument | weak | write | 保留 |
| P0 | POST | /lims/reagents | create_reagent | weak | write | 保留 |
| P0 | POST | /lims/samples | register_sample | weak | write | 保留 |
| P0 | GET | /lims/samples/{id} | get_sample | weak | write | 保留 |
| P0 | POST | /lims/tasks | lims_create_task | weak | write | 保留 |
| P0 | GET | /lims/tasks/{id} | lims_get_task | weak | write | 保留 |

## lowcode（1 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P2 | GET | /api/lowcode/designer/schema | get_designer_schema | weak | none | 保留 |

## master-data（8 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P1 | POST | /api/master/quality-v51/ai/suggest | generate_suggestions | none | write | 待定 |
| P1 | POST | /api/master/quality-v51/auto-fix/run | apply_auto_fix | none | write | 待定 |
| P1 | GET | /api/master/quality-v51/checks | list_quality_checks | none | write | 待定 |
| P1 | POST | /api/master/quality-v51/checks | run_quality_check | none | write | 待定 |
| P1 | GET | /api/master/quality-v51/dashboard | get_quality_dashboard | none | write | 待定 |
| P1 | GET | /api/master/quality-v51/rules | list_quality_rules | none | write | 待定 |
| P1 | POST | /api/master/quality-v51/rules | create_quality_rule | none | write | 待定 |
| P1 | GET | /api/master/quality-v51/score | get_quality_score | none | write | 待定 |

## mes（2 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P1 | GET | /api/mes/wips/{wip_id}/transfers | list_wip_transfers | none | write | 待定 |
| P1 | GET | /api/mes/work-reports/today/output | get_today_production_output | none | write | 待定 |

## mobile（10 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /mobile-tasks | get_all_tasks | weak | write | 保留 |
| P0 | POST | /mobile-tasks | mobile_create_task | weak | write | 保留 |
| P0 | GET | /mobile-tasks/{id} | mobile_get_task | weak | write | 保留 |
| P0 | PUT | /mobile-tasks/{id} | update_task | weak | write | 保留 |
| P0 | DELETE | /mobile-tasks/{id} | delete_task | weak | write | 保留 |
| P0 | GET | /mobile/patrol-records | get_all_patrol_records | weak | write | 保留 |
| P0 | POST | /mobile/patrol-records | create_patrol_record | weak | write | 保留 |
| P0 | GET | /mobile/patrol-records/{id} | get_patrol_record | weak | write | 保留 |
| P0 | POST | /mobile/scan/barcode | scan_barcode | weak | write | 保留 |
| P0 | GET | /mobile/stats/dashboard | get_dashboard_stats | weak | write | 保留 |

## monitor（38 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | POST | /api/monitor/alerts/acknowledge | acknowledge_alerts | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/alerts/resolve | resolve_alerts | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/alerts/statistics | get_alert_statistics | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/alerts/{id} | update_alert | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/alerts/{id}/history | get_alert_history | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/alerts/{id}/timeline | get_alert_timeline | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/performance/export | export_performance_data | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/performance/services | get_service_performance | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/performance/slow-queries | get_slow_queries | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/performance/summary | get_performance_summary | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/performance/trend | get_performance_trend | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/rules/{id}/advanced | get_advanced_rule | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/monitor/rules/{id}/advanced | update_advanced_rule | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/rules/{id}/disable | disable_rule | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/rules/{id}/enable | enable_rule | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/rules/{id}/escalation | get_escalation | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/monitor/rules/{id}/escalation | update_escalation | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/rules/{id}/routing | get_routing | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/monitor/rules/{id}/routing | update_routing | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/rules/{id}/scheduled-trigger | get_scheduled_trigger | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/monitor/rules/{id}/scheduled-trigger | update_scheduled_trigger | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/slos/violations/{id}/resolve | resolve_slo_violation | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/suppression | list_suppression_rules | none | write | 待定 |
| 管理端绑定池 | POST | /api/monitor/suppression | create_suppression_rule | none | write | 待定 |
| 管理端绑定池 | GET | /api/monitor/suppression/{id} | get_suppression_rule | none | write | 待定 |
| 管理端绑定池 | PUT | /api/monitor/suppression/{id} | update_suppression_rule | none | write | 待定 |
| 管理端绑定池 | DELETE | /api/monitor/suppression/{id} | delete_suppression_rule | none | write | 待定 |
| 管理端绑定池 | GET | /api/monitor/templates | monitor_list_templates | weak | write | 保留 |
| 管理端绑定池 | POST | /api/monitor/templates | monitor_create_template | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/templates/{id} | monitor_get_template | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/monitor/templates/{id} | monitor_update_template | weak | write | 保留 |
| 管理端绑定池 | DELETE | /api/monitor/templates/{id} | monitor_delete_template | weak | write | 保留 |
| 管理端绑定池 | GET | /api/monitor/thresholds | list_thresholds | none | write | 待定 |
| 管理端绑定池 | POST | /api/monitor/thresholds | create_threshold | none | write | 待定 |
| 管理端绑定池 | POST | /api/monitor/thresholds/evaluate | evaluate_thresholds | none | write | 待定 |
| 管理端绑定池 | GET | /api/monitor/thresholds/{id} | get_threshold | none | write | 待定 |
| 管理端绑定池 | PUT | /api/monitor/thresholds/{id} | update_threshold | none | write | 待定 |
| 管理端绑定池 | DELETE | /api/monitor/thresholds/{id} | delete_threshold | none | write | 待定 |

## pdm（22 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /api/pdm/statistics/{id} | pdm_get_statistics | weak | write | 保留 |
| P0 | GET | /api/pdm/workflows | pdm_list_workflows | weak | write | 保留 |
| P0 | POST | /api/pdm/workflows | pdm_create_workflow | weak | write | 保留 |
| P0 | GET | /api/pdm/workflows/{id} | pdm_get_workflow | weak | write | 保留 |
| P0 | PUT | /api/pdm/workflows/{id} | pdm_update_workflow | weak | write | 保留 |
| P0 | DELETE | /api/pdm/workflows/{id} | pdm_delete_workflow | weak | write | 保留 |
| P1 | POST | /api/pdm/change-notices/{id}/approve | approve_change_notice | none | write | 待定 |
| P1 | POST | /api/pdm/change-notices/{id}/reject | reject_change_notice | none | write | 待定 |
| P1 | POST | /api/pdm/change-notices/{id}/submit | submit_change_notice | none | write | 待定 |
| P1 | GET | /api/pdm/documents/pending-approval | list_pending_documents | none | write | 待定 |
| P1 | GET | /api/pdm/documents/{id}/approval-history | get_document_approval_history | none | write | 待定 |
| P1 | POST | /api/pdm/documents/{id}/approve | start_document_approval | none | write | 待定 |
| P1 | GET | /api/pdm/versions | pdm_list_versions_api_pdm_versions | none | write | 待定 |
| P1 | POST | /api/pdm/versions | pdm_create_version_api_pdm_versions | none | write | 待定 |
| P1 | GET | /api/pdm/versions/{id} | pdm_get_version_api_pdm_versions_{id} | none | write | 待定 |
| P1 | PUT | /api/pdm/versions/{id} | pdm_update_version_api_pdm_versions_{id} | none | write | 待定 |
| P1 | DELETE | /api/pdm/versions/{id} | pdm_delete_version_api_pdm_versions_{id} | none | write | 待定 |
| P1 | GET | /api/pdm/workflow-instances | list_workflow_instances | none | write | 待定 |
| P1 | GET | /api/pdm/workflow-instances/{id} | get_workflow_instance | none | write | 待定 |
| P1 | POST | /api/pdm/workflow-instances/{id}/advance | advance_workflow | none | write | 待定 |
| P1 | POST | /api/pdm/workflows/start | start_workflow | none | write | 待定 |
| P2 | GET | /pdm/ | pdm__home | weak | none | 保留 |

## portal（9 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /portal/announcements | get_announcements | weak | write | 保留 |
| P0 | POST | /portal/announcements | portal_create_announcement | weak | write | 保留 |
| P0 | GET | /portal/dashboard/stats | portal_get_dashboard_stats | weak | write | 保留 |
| P0 | GET | /portal/todos | get_todos | weak | write | 保留 |
| P0 | POST | /portal/todos | add_todo | weak | write | 保留 |
| P2 | GET | /portal/navigation/menu | get_navigation_menu | weak | none | 保留 |
| P2 | GET | /portal/notifications | portal_get_notifications | weak | none | 保留 |
| P2 | GET | /portal/services | list_services | weak | none | 保留 |
| P2 | GET | /portal/user | get_user_info | weak | none | 保留 |

## rd（1 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /rd/audit-logs | rd_list_audit_logs | weak | write | 保留 |

## scm（1 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | POST | /scm/purchase-orders/{id}/reject | reject_order | weak | write | 保留 |

## search（1 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | GET | /api/search | search_handler | weak | write | 保留 |

## ticket（10 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P0 | GET | /ticket/sla-policies | list_sla_policies_handler | weak | write | 保留 |
| P0 | POST | /ticket/sla-policies | create_sla_policy_handler | weak | write | 保留 |
| P0 | GET | /tickets | list_tickets_handler | weak | write | 保留 |
| P0 | POST | /tickets | create_ticket_handler | weak | write | 保留 |
| P0 | GET | /tickets/stats | get_stats_handler | weak | write | 保留 |
| P0 | GET | /tickets/{id} | get_ticket_handler | weak | write | 保留 |
| P0 | PUT | /tickets/{id} | update_ticket_handler | weak | write | 保留 |
| P0 | DELETE | /tickets/{id} | delete_ticket_handler | weak | write | 保留 |
| P0 | GET | /tickets/{id}/comments | list_comments_handler | weak | write | 保留 |
| P0 | POST | /tickets/{id}/comments | add_comment_handler | weak | write | 保留 |

## unified-core（22 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| 管理端绑定池 | POST | /api/core/doc/documents | unified-core_create_document | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/core/doc/documents/{document_id} | unified-core_update_document | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/download/{id} | download_file | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/files | list_files | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/files/received | get_received_files | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/files/search | search_files | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/files/starred | list_starred_files | weak | write | 保留 |
| 管理端绑定池 | PUT | /api/core/file/files/{id} | update_file | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/copy | copy_file | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/move | move_file | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/permission | set_file_permission | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/permissions | set_file_permissions | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/files/{id}/shares | get_file_shares | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/star | star_file | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/files/{id}/unstar | unstar_file | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/preview/{id} | preview_file | weak | write | 保留 |
| 管理端绑定池 | DELETE | /api/core/file/shares/{id} | delete_share | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/stats | get_file_stats | weak | write | 保留 |
| 管理端绑定池 | GET | /api/core/file/thumbnail/{id} | get_thumbnail | weak | write | 保留 |
| 管理端绑定池 | POST | /api/core/file/upload/multiple | upload_multiple | weak | write | 保留 |
| 管理端绑定池 | POST | /unified-core/iam/auth/login | login | weak | write | 保留 |
| 管理端绑定池 | POST | /unified-core/iam/auth/register | register | weak | write | 保留 |

## wms（3 条）

| 优先级 | 方法 | 路径 | operationId | 前端引用 | 写库 | v73 倾向 |
|---|---|---|---|---|---|---|
| P1 | GET | /api/wms/inventory-alerts | wms_list_alerts | none | write | 待定 |
| P1 | GET | /api/wms/inventory-alerts/{id} | wms_get_alert | none | write | 待定 |
| P1 | POST | /api/wms/inventory-alerts/{id}/acknowledge | acknowledge_alert | none | write | 待定 |

## 汇总

| 服务 | 条数 |
|---|---|
| ehs | 102 |
| monitor | 38 |
| finance | 27 |
| integration | 22 |
| pdm | 22 |
| unified-core | 22 |
| flow | 12 |
| ai | 10 |
| gis | 10 |
| mobile | 10 |
| ticket | 10 |
| portal | 9 |
| billing | 8 |
| master-data | 8 |
| lims | 6 |
| analytics | 4 |
| wms | 3 |
| communication | 2 |
| mes | 2 |
| erp | 1 |
| lowcode | 1 |
| rd | 1 |
| scm | 1 |
| search | 1 |

## 优先级分布

- 管理端绑定池：123 条
- P1：101 条
- P0：98 条
- P2：10 条

## 排期建议

1. **第一批（P0）**：前端按服务逐条接 CRUD 页（复用 ListPageTemplate/FormPageTemplate/CrudPage），每服务 1 批、每批独立 commit + typecheck + WCS。
2. **第二批（P1）**：后端路由已真，前端补页即可（优先核心域：scm/crm/erp/hrm/finance）。
3. **第三批（P2）**：列表/详情接线（占位页或导航入口补挂）。
4. **管理端绑定池（ai 9 条）**：AI 平台管理页接线（connectors 配置 + agent 工具/运行）。
5. 绑定进度回填本文件（勾选即核销）。
