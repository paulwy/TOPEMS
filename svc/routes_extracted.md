# TOPEMS 后端服务 API 路由端点清单

**总计**: 25 个服务, 692 个路由路径, 752 个端点


## ai 服务

- **路由路径数**: 51
- **端点数**: 51
- **扫描文件数**: 26

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:1877 |
| POST | `/api/ai/agent/run` | `agent_run` | api/agent.rs:12 |
| GET | `/api/ai/agent/tools` | `list_agent_tools` | api/agent.rs:13 |
| POST | `/api/ai/analysis/classify` | `AnalysisApi::classify` | main.rs:1960 |
| POST | `/api/ai/analysis/history` | `AnalysisApi::history` | main.rs:1969 |
| POST | `/api/ai/analysis/sentiment` | `AnalysisApi::sentiment` | main.rs:1959 |
| POST | `/api/ai/chat` | `chat` | main.rs:1891 |
| POST | `/api/ai/complete` | `complete` | main.rs:1894 |
| GET | `/api/ai/connectors` | `list_connectors` | main.rs:1944 |
| POST | `/api/ai/connectors/create` | `create_connector` | main.rs:1946 |
| POST | `/api/ai/connectors/delete` | `delete_connector` | main.rs:1948 |
| GET | `/api/ai/connectors/get` | `get_connector` | main.rs:1945 |
| POST | `/api/ai/connectors/query` | `query_data` | main.rs:1950 |
| GET | `/api/ai/connectors/test` | `test_connector` | main.rs:1949 |
| POST | `/api/ai/connectors/update` | `update_connector` | main.rs:1947 |
| GET | `/api/ai/documents` | `DocumentApi::list` | main.rs:1898 |
| POST | `/api/ai/documents/qa` | `DocumentApi::document_qa` | main.rs:1916 |
| POST | `/api/ai/documents/upload` | `DocumentApi::upload` | main.rs:1899 |
| GET | `/api/ai/documents/{id}` | `DocumentApi::get` | main.rs:1904 |
| DELETE | `/api/ai/documents/{id}` | `DocumentApi::delete` | main.rs:1905 |
| POST | `/api/ai/documents/{id}/extract` | `DocumentApi::extract` | main.rs:1907 |
| POST | `/api/ai/documents/{id}/process` | `DocumentApi::process` | main.rs:1906 |
| POST | `/api/ai/embedding/generate` | `EmbeddingApi::generate` | main.rs:1924 |
| POST | `/api/ai/generate` | `generate` | main.rs:1892 |
| GET | `/api/ai/health/detailed` | `health_check_detailed` | main.rs:1881 |
| GET | `/api/ai/metrics` | `VectorApi::stats` | main.rs:1882 |
| POST | `/api/ai/qa/ask` | `QaApi::ask` | main.rs:1931 |
| POST | `/api/ai/qa/ask-conversation` | `QaApi::ask_conversation` | main.rs:1934 |
| POST | `/api/ai/qa/ask-structured` | `QaApi::ask_structured` | main.rs:1933 |
| POST | `/api/ai/qa/ask-with-context` | `QaApi::ask_with_context` | main.rs:1932 |
| POST | `/api/ai/qa/classify` | `QaApi::classify` | main.rs:1935 |
| POST | `/api/ai/qa/feedback` | `QaApi::feedback` | main.rs:1942 |
| GET | `/api/ai/qa/history` | `QaApi::history` | main.rs:1936 |
| DELETE | `/api/ai/qa/history/{id}` | `QaApi::delete_history` | main.rs:1937 |
| POST | `/api/ai/recommend` | `RecommendationApi::recommend` | main.rs:1985 |
| POST | `/api/ai/search` | `ai_search` | main.rs:1883 |
| POST | `/api/ai/summarize` | `summarize` | main.rs:1895 |
| GET | `/api/ai/templates` | `list_templates` | main.rs:1896 |
| POST | `/api/ai/validate` | `validate` | main.rs:1893 |
| POST | `/api/ai/vectors/batch-store` | `VectorApi::batch_store` | main.rs:1923 |
| POST | `/api/ai/vectors/clear` | `VectorApi::clear_all` | main.rs:1929 |
| POST | `/api/ai/vectors/search` | `VectorApi::search` | main.rs:1919 |
| GET | `/api/ai/vectors/stats` | `VectorApi::stats` | main.rs:1918 |
| POST | `/api/ai/vectors/store` | `VectorApi::store` | main.rs:1920 |
| GET | `/api/ai/vectors/{id}` | `VectorApi::get` | main.rs:1921 |
| DELETE | `/api/ai/vectors/{id}` | `VectorApi::delete` | main.rs:1922 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:1880 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:142 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:1879 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:141 |
| GET | `/health` | `health` | main.rs:1878 |

## analytics 服务

- **路由路径数**: 17
- **端点数**: 17
- **扫描文件数**: 27

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:104 |
| GET | `/` | `home` | main_bi.rs:105 |
| GET | `/` | `home` | main_report.rs:105 |
| GET | `/api/bi/widget` | `modules::bi::widget::list_widgets` | main.rs:242 |
| POST | `/api/bi/widget` | `modules::bi::widget::create_widget` | main.rs:243 |
| GET | `/api/bi/widget` | `modules::bi::widget::list_widgets` | main_bi.rs:151 |
| POST | `/api/bi/widget` | `modules::bi::widget::create_widget` | main_bi.rs:152 |
| GET | `/api/bi/widget/{id}` | `modules::bi::widget::get_widget` | main.rs:244 |
| GET | `/api/bi/widget/{id}` | `modules::bi::widget::get_widget` | main_bi.rs:153 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/bi/plugin.rs:111 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/report/report_plugin.rs:98 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/bi/plugin.rs:110 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/report/report_plugin.rs:97 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:649 |
| GET | `/health` | `health` | main.rs:105 |
| GET | `/health` | `health` | main_bi.rs:106 |
| GET | `/health` | `health` | main_report.rs:106 |

## crm 服务

- **路由路径数**: 33
- **端点数**: 39
- **扫描文件数**: 33

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/crm/audit-logs` | `list_audit_logs` | api/audit.rs:19 |
| GET | `/api/crm/audit-logs/{id}` | `get_audit_log` | api/audit.rs:20 |
| POST | `/api/crm/billing/{id}/paid` | `mark_billing_paid` | api/billing.rs:29 |
| GET | `/api/crm/contacts` | `list_contacts` | api/contact.rs:34 |
| POST | `/api/crm/contacts` | `create_contact` | |
| GET | `/api/crm/customer-profiles` | `list_customer_profiles` | api/customer_profile.rs:111 |
| POST | `/api/crm/customer-scoring/calculate` | `batch_calculate` | api/customer_scoring.rs:34 |
| GET | `/api/crm/customers/{id}/details` | `get_customer_details` | api/dashboard.rs:30 |
| GET | `/api/crm/customers/{id}/profile` | `get_customer_profile` | api/customer_profile.rs:102 |
| GET | `/api/crm/customers/{id}/tags` | `get_customer_tags` | api/tag.rs:30 |
| POST | `/api/crm/customers/{id}/tags` | `add_tag_to_customer` | |
| DELETE | `/api/crm/customers/{id}/tags/{tag_id}` | `remove_tag_from_customer` | api/tag.rs:31 |
| GET | `/api/crm/dashboard/forecast` | `get_sales_forecast` | api/dashboard.rs:29 |
| GET | `/api/crm/dashboard/funnel` | `get_sales_funnel` | api/dashboard.rs:28 |
| GET | `/api/crm/dashboard/stats` | `get_dashboard_stats` | api/dashboard.rs:27 |
| GET | `/api/crm/opportunities/funnel` | `get_sales_funnel` | api/opportunity.rs:88 |
| GET | `/api/crm/opportunities/stats` | `get_opportunity_stats` | api/opportunity.rs:89 |
| GET | `/api/crm/recommendations/{id}` | `get_recommendation` | api/customer_recommendation.rs:64 |
| POST | `/api/crm/sales-forecast/generate` | `generate_forecast` | api/sales_forecast.rs:25 |
| GET | `/api/crm/sales-forecast/trend` | `get_sales_trend` | api/sales_forecast.rs:32 |
| GET | `/api/crm/sales-funnel` | `get_funnel_data` | api/sales_funnel.rs:65 |
| GET | `/api/crm/sales-funnel/metrics` | `get_funnel_metrics` | api/sales_funnel.rs:66 |
| GET | `/api/crm/sales-funnel/trend` | `get_funnel_trend` | api/sales_funnel.rs:71 |
| GET | `/api/crm/segments` | `list_segments` | api/customer_segmentation.rs:77 |
| POST | `/api/crm/segments` | `create_segment` | |
| GET | `/api/crm/segments/auto` | `auto_segment` | api/customer_segmentation.rs:84 |
| GET | `/api/crm/segments/{id}` | `get_segment` | api/customer_segmentation.rs:78 |
| DELETE | `/api/crm/segments/{id}` | `delete_segment` | api/customer_segmentation.rs:83 |
| GET | `/api/crm/tags` | `list_tags` | api/tag.rs:27 |
| POST | `/api/crm/tags` | `create_tag` | |
| GET | `/api/crm/tags/{id}` | `get_tag` | api/tag.rs:28 |
| PUT | `/api/crm/tags/{id}` | `update_tag` | |
| DELETE | `/api/crm/tags/{id}` | `delete_tag` | |
| GET | `/api/crm/tags/{id}/customers` | `get_tagged_customers` | api/tag.rs:29 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:118 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:117 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:93 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:94 |
| GET | `/health` | `health_check` | main.rs:92 |

## ehs 服务

- **路由路径数**: 31
- **端点数**: 36
- **扫描文件数**: 20

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:93 |
| GET | `/api/ehs/checks` | `list_plans` | api/safety.rs:36 |
| GET | `/api/ehs/checks/plans` | `list_plans` | api/safety.rs:15 |
| POST | `/api/ehs/checks/plans` | `create_plan` | |
| GET | `/api/ehs/drills` | `list_drill_plans` | api/emergency_drill.rs:49 |
| GET | `/api/ehs/drills/statistics` | `get_drill_statistics` | api/emergency_drill.rs:48 |
| GET | `/api/ehs/drills/types` | `list_drill_types` | api/emergency_drill.rs:47 |
| POST | `/api/ehs/emergency-plans/{id}/approve` | `approve_plan` | api/emergency_plan.rs:43 |
| GET | `/api/ehs/hazardous-materials/msds` | `list_materials` | api/hazardous_material.rs:65 |
| GET | `/api/ehs/hazards` | `list_risks` | api/risk.rs:15 |
| POST | `/api/ehs/hazards` | `create_risk` | |
| POST | `/api/ehs/hazards/{id}/assessments` | `assess_risk` | api/risk.rs:20 |
| GET | `/api/ehs/health` | `list_records` | api/health.rs:10 |
| POST | `/api/ehs/health` | `create_record` | |
| POST | `/api/ehs/incidents/{id}/close` | `close_accident` | api/accident.rs:43 |
| POST | `/api/ehs/incidents/{id}/review` | `create_review` | api/accident.rs:42 |
| POST | `/api/ehs/incidents/{id}/treatment` | `create_treatment` | api/accident.rs:33 |
| GET | `/api/ehs/issues` | `list_hazards` | api/hazard.rs:15 |
| POST | `/api/ehs/issues` | `create_hazard` | |
| POST | `/api/ehs/issues/{id}/close` | `close_hazard` | api/hazard.rs:29 |
| POST | `/api/ehs/issues/{id}/verification` | `verify_hazard` | api/hazard.rs:28 |
| GET | `/api/ehs/plans` | `list_plans` | api/emergency_plan.rs:44 |
| POST | `/api/ehs/plans` | `create_plan` | |
| GET | `/api/ehs/sync` | `list_sync_records` | api/data_sync.rs:27 |
| GET | `/api/ehs/sync-records` | `list_sync_records` | api/data_sync.rs:16 |
| POST | `/api/ehs/sync-records/{id}/retry` | `retry_sync` | api/data_sync.rs:21 |
| POST | `/api/ehs/sync/hazard-to-qms` | `sync_hazard_to_qms` | api/data_sync.rs:22 |
| POST | `/api/ehs/sync/retry` | `batch_retry_sync` | api/data_sync.rs:32 |
| POST | `/api/ehs/sync/to-lims` | `sync_accident_to_lims` | api/data_sync.rs:33 |
| POST | `/api/ehs/sync/to-qms` | `sync_hazard_to_qms` | api/data_sync.rs:34 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:96 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:177 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:95 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:176 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:106 |
| GET | `/health` | `health` | main.rs:94 |

## erp 服务

- **路由路径数**: 61
- **端点数**: 68
- **扫描文件数**: 44

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/consolidation/company-tree` | `get_company_tree` | api/consolidation.rs:170 |
| GET | `/api/erp/addressbook` | `get_contacts` | api/addressbook.rs:490 |
| GET | `/api/erp/assets` | `list_assets` | api/asset.rs:28 |
| POST | `/api/erp/assets` | `create_asset` | |
| GET | `/api/erp/audit-logs` | `list_audit_logs` | api/audit.rs:62 |
| GET | `/api/erp/audit-logs/{id}` | `get_audit_log` | api/audit.rs:63 |
| GET | `/api/erp/bank-transactions/{id}` | `get_bank_transaction` | api/bank.rs:148 |
| GET | `/api/erp/budgets` | `list_budgets` | api/finance.rs:58 |
| POST | `/api/erp/budgets` | `create_budget` | |
| GET | `/api/erp/db/changes` | `list_db_changes` | api/db_structure.rs:53 |
| POST | `/api/erp/db/columns` | `execute_add_column` | api/db_structure.rs:48 |
| POST | `/api/erp/db/columns/preview` | `preview_add_column` | api/db_structure.rs:47 |
| GET | `/api/erp/db/tables` | `list_tables` | api/db_structure.rs:45 |
| GET | `/api/erp/db/tables/{name}` | `get_table_detail` | api/db_structure.rs:46 |
| POST | `/api/erp/dict-items` | `create_dict_item` | api/dict.rs:68 |
| POST | `/api/erp/dict-items/batch` | `batch_create_dict_items` | api/dict.rs:69 |
| GET | `/api/erp/dict-types/{id}/items` | `list_dict_items` | api/dict.rs:63 |
| GET | `/api/erp/example/companies` | `list_companies_from_hrm` | api/hrm_integration_example.rs:22 |
| GET | `/api/erp/example/employees` | `list_employees_from_hrm` | api/hrm_integration_example.rs:13 |
| GET | `/api/erp/expenses` | `list_expenses` | api/finance.rs:53 |
| POST | `/api/erp/expenses` | `create_expense` | |
| POST | `/api/erp/fixed-assets/depreciate` | `depreciate_assets` | api/fixed_asset.rs:92 |
| GET | `/api/erp/meeting-rooms` | `list_rooms` | api/meeting_room.rs:30 |
| POST | `/api/erp/meeting-rooms` | `create_room` | |
| GET | `/api/erp/payables` | `list_payables` | api/finance.rs:73 |
| POST | `/api/erp/payables` | `create_payable` | |
| GET | `/api/erp/reports/aging-analysis` | `aging_analysis` | api/finance_reports.rs:296 |
| GET | `/api/erp/reports/balance-sheet` | `balance_sheet` | api/finance_reports.rs:285 |
| GET | `/api/erp/reports/budget-summary` | `budget_summary` | api/finance_reports.rs:292 |
| GET | `/api/erp/reports/business-overview` | `business_overview` | api/finance_reports.rs:298 |
| GET | `/api/erp/reports/cash-flow` | `cash_flow` | api/finance_reports.rs:287 |
| GET | `/api/erp/reports/category-summary` | `category_summary` | api/finance_reports.rs:295 |
| GET | `/api/erp/reports/employee-summary` | `employee_summary` | api/finance_reports.rs:293 |
| GET | `/api/erp/reports/expense-analysis` | `expense_analysis` | api/finance_reports.rs:308 |
| GET | `/api/erp/reports/income-statement` | `income_statement` | api/finance_reports.rs:286 |
| GET | `/api/erp/reports/monthly-trend` | `monthly_trend` | api/finance_reports.rs:297 |
| GET | `/api/erp/reports/payables` | `payables_report` | api/finance_reports.rs:291 |
| GET | `/api/erp/reports/profit-analysis` | `profit_analysis` | api/finance_reports.rs:309 |
| GET | `/api/erp/reports/project-summary` | `project_summary` | api/finance_reports.rs:299 |
| GET | `/api/erp/reports/receivables` | `receivables_report` | api/finance_reports.rs:290 |
| GET | `/api/erp/reports/voucher-details` | `voucher_details` | api/finance_reports.rs:289 |
| GET | `/api/erp/reports/voucher-summary` | `voucher_summary` | api/finance_reports.rs:288 |
| GET | `/api/erp/reports/voucher-trend` | `voucher_trend` | api/finance_reports.rs:294 |
| GET | `/api/erp/vehicles` | `list_vehicles` | api/vehicles.rs:31 |
| POST | `/api/erp/vehicles` | `create_vehicle` | |
| GET | `/api/erp/vehicles/{id}/requests` | `get_vehicle_requests` | api/vehicles.rs:46 |
| GET | `/api/erp/vouchers` | `list_vouchers` | api/voucher.rs:56 |
| POST | `/api/erp/vouchers` | `create_voucher` | |
| POST | `/api/erp/vouchers/import/u8` | `import_u8_vouchers` | api/voucher.rs:65 |
| POST | `/api/erp/vouchers/{id}/approve` | `approve_voucher` | api/voucher.rs:62 |
| GET | `/api/erp/vouchers/{id}/items` | `get_voucher_items` | api/voucher.rs:61 |
| POST | `/api/erp/vouchers/{id}/post` | `post_voucher` | api/voucher.rs:63 |
| POST | `/api/erp/vouchers/{id}/unpost` | `unpost_voucher` | api/voucher.rs:64 |
| GET | `/api/finance/accounts/balances` | `get_account_balances` | api/finance.rs:95 |
| GET | `/api/finance/accounts/tree` | `get_accounts_tree` | api/finance.rs:86 |
| GET | `/api/finance/ap/aging` | `get_payable_aging` | api/finance.rs:119 |
| GET | `/api/finance/ar/aging` | `get_receivable_aging` | api/finance.rs:118 |
| GET | `/api/finance/period/current` | `get_current_period` | api/finance.rs:78 |
| GET | `/api/finance/periods` | `list_periods` | api/finance.rs:79 |
| POST | `/api/finance/periods/close` | `close_period` | api/finance.rs:81 |
| POST | `/api/finance/periods/open` | `open_period` | api/finance.rs:80 |
| POST | `/api/finance/reconcile` | `reconcile` | api/finance.rs:116 |
| POST | `/api/finance/reconcile/auto` | `auto_reconcile` | api/finance.rs:117 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:243 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:242 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:146 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:147 |
| GET | `/health` | `health_check` | api/health.rs:47 |

## finance 服务

- **路由路径数**: 19
- **端点数**: 19
- **扫描文件数**: 6

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:79 |
| POST | `/accounts` | `create_account` | api/mod.rs:614 |
| GET | `/accounts` | `list_accounts` | api/mod.rs:615 |
| GET | `/accounts/{account_id}` | `get_account` | api/mod.rs:616 |
| POST | `/approvals/approve` | `approve_document` | api/mod.rs:680 |
| POST | `/approvals/cancel` | `cancel_approval` | api/mod.rs:682 |
| POST | `/approvals/reject` | `reject_document` | api/mod.rs:681 |
| POST | `/aux-accounts` | `create_aux_account` | api/mod.rs:657 |
| GET | `/aux-accounts` | `list_aux_accounts` | api/mod.rs:658 |
| GET | `/aux-balance` | `get_aux_balance` | api/mod.rs:660 |
| GET | `/aux-ledger` | `get_aux_ledger` | api/mod.rs:659 |
| GET | `/cash-flow/{period}` | `get_cash_flow` | api/mod.rs:661 |
| GET | `/health` | `health` | main.rs:80 |
| GET | `/ledger` | `get_ledger` | api/mod.rs:636 |
| POST | `/vouchers` | `create_voucher` | api/mod.rs:621 |
| GET | `/vouchers` | `list_vouchers` | api/mod.rs:622 |
| POST | `/vouchers/export` | `export_vouchers` | api/mod.rs:674 |
| GET | `/vouchers/{voucher_id}` | `get_voucher` | api/mod.rs:623 |
| POST | `/year-end-close` | `year_end_close` | api/mod.rs:675 |

## gis 服务

- **路由路径数**: 20
- **端点数**: 23
- **扫描文件数**: 23

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:2055 |
| GET | `/api/gis/alerts` | `list_alerts` | api/geofence.rs:313 |
| POST | `/api/gis/alerts/{id}/acknowledge` | `acknowledge_alert` | api/geofence.rs:314 |
| GET | `/api/gis/geofences` | `list_geofences` | api/geofence.rs:311 |
| POST | `/api/gis/geofences` | `create_geofence` | |
| GET | `/api/gis/geofences/{id}` | `get_geofence` | api/geofence.rs:312 |
| PUT | `/api/gis/geofences/{id}` | `update_geofence` | |
| DELETE | `/api/gis/geofences/{id}` | `delete_geofence` | |
| GET | `/api/gis/health/detailed` | `health_check_detailed` | main.rs:2054 |
| POST | `/api/gis/import` | `import_data` | main.rs:2243 |
| GET | `/api/gis/map-markers` | `list_map_markers` | main.rs:2123 |
| GET | `/api/gis/maps` | `api::map::list_maps` | main.rs:2130 |
| GET | `/api/gis/maps/{id}` | `api::map::get_map` | main.rs:2131 |
| GET | `/api/gis/pipelines` | `list_pipelines` | main.rs:2081 |
| POST | `/api/gis/pipelines` | `create_pipeline` | main.rs:2190 |
| GET | `/api/gis/pipelines/{id}` | `get_pipeline` | main.rs:2082 |
| GET | `/api/gis/search` | `search_locations` | main.rs:2128 |
| GET | `/api/gis/statistics` | `get_statistics` | main.rs:2060 |
| GET | `/api/gis/ws` | `websocket_handler` | api/websocket.rs:158 |
| GET | `/api/gis/ws/device/{device_code}` | `websocket_device_handler` | api/websocket.rs:159 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:2053 |
| GET | `/api/plugins/info` | `plugin::get_info` | main.rs:2052 |
| GET | `/health` | `health_check` | main.rs:2051 |

## hrm 服务

- **路由路径数**: 35
- **端点数**: 37
- **扫描文件数**: 37

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:107 |
| GET | `/api/hrm/audit-logs` | `list_audit_logs` | api/audit.rs:16 |
| GET | `/api/hrm/audit-logs/{id}` | `get_audit_log` | api/audit.rs:17 |
| GET | `/api/hrm/contract-renewals` | `list_renewals` | api/contract.rs:33 |
| GET | `/api/hrm/contracts/expiring` | `list_expiring_contracts` | api/contract.rs:31 |
| POST | `/api/hrm/contracts/{id}/renew` | `create_renewal` | api/contract.rs:32 |
| POST | `/api/hrm/employees/export` | `export_employees` | api/employee.rs:26 |
| GET | `/api/hrm/employees/{id}/details` | `get_employee_details` | api/employee.rs:25 |
| POST | `/api/hrm/hrm/setup/admin` | `setup_admin_user` | api/setup.rs:108 |
| POST | `/api/hrm/hrm/setup/company` | `setup_company_info` | api/setup.rs:105 |
| POST | `/api/hrm/hrm/setup/complete` | `complete_initialization` | api/setup.rs:109 |
| POST | `/api/hrm/hrm/setup/departments` | `setup_departments` | api/setup.rs:106 |
| POST | `/api/hrm/hrm/setup/positions` | `setup_positions` | api/setup.rs:107 |
| GET | `/api/hrm/hrm/setup/progress` | `get_init_progress` | api/setup.rs:104 |
| PUT | `/api/hrm/interviews/{id}/complete` | `complete_interview` | api/recruitment.rs:187 |
| PUT | `/api/hrm/job-openings/{id}/close` | `close_job_opening` | api/recruitment.rs:166 |
| GET | `/api/hrm/leaves` | `list_leaves` | api/leave.rs:73 |
| POST | `/api/hrm/leaves` | `create_leave` | |
| PUT | `/api/hrm/leaves/{id}/approve` | `approve_leave` | api/leave.rs:78 |
| PUT | `/api/hrm/leaves/{id}/reject` | `reject_leave` | api/leave.rs:79 |
| GET | `/api/hrm/payroll-items` | `list_payroll_items` | api/payroll.rs:117 |
| GET | `/api/hrm/payroll-items/{id}` | `get_payroll_item` | api/payroll.rs:118 |
| PUT | `/api/hrm/payroll-runs/{id}/pay` | `pay_payroll_run` | api/payroll.rs:112 |
| GET | `/api/hrm/reports/contract-summary` | `contract_summary` | api/reports.rs:20 |
| GET | `/api/hrm/reports/employee-summary` | `employee_summary` | api/reports.rs:15 |
| GET | `/api/hrm/reports/payroll-summary` | `payroll_summary` | api/reports.rs:26 |
| GET | `/api/hrm/reports/training-summary` | `training_summary` | api/reports.rs:21 |
| POST | `/api/hrm/training-courses/{id}/enroll` | `enroll_course` | api/training.rs:41 |
| GET | `/api/hrm/training-plans` | `list_plans` | api/training.rs:20 |
| POST | `/api/hrm/training-plans` | `create_plan` | |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:147 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:100 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:146 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:99 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:95 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:96 |
| GET | `/health` | `health_check` | api/health.rs:47 |

## integration 服务

- **路由路径数**: 27
- **端点数**: 27
- **扫描文件数**: 10

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:235 |
| GET | `/api/integration/events` | `list_events` | main.rs:243 |
| POST | `/api/integration/events` | `create_event` | main.rs:244 |
| GET | `/api/integration/lims-qms` | `list_lims_qms_sync` | main.rs:245 |
| POST | `/api/integration/lims-qms` | `create_lims_qms_sync` | main.rs:246 |
| GET | `/api/integration/lims-qms/{id}` | `get_lims_qms_sync` | main.rs:247 |
| POST | `/api/integration/lims-qms/{id}/sync` | `sync_lims_qms` | main.rs:248 |
| GET | `/api/integration/mes-erp` | `list_mes_erp_sync` | main.rs:249 |
| POST | `/api/integration/mes-erp` | `create_mes_erp_sync` | main.rs:250 |
| GET | `/api/integration/mes-erp/{id}` | `get_mes_erp_sync` | main.rs:251 |
| POST | `/api/integration/mes-erp/{id}/sync` | `sync_mes_erp` | main.rs:252 |
| GET | `/api/integration/mes-qms` | `list_mes_qms_sync_api` | main.rs:278 |
| GET | `/api/integration/mes-qms/stats` | `get_mes_qms_stats_api` | main.rs:280 |
| GET | `/api/integration/mes-qms/{id}` | `get_mes_qms_sync_api` | main.rs:279 |
| GET | `/api/integration/rules` | `list_conversion_rules_api` | main.rs:302 |
| POST | `/api/integration/rules` | `create_conversion_rule_api` | main.rs:303 |
| GET | `/api/integration/rules/{id}` | `get_conversion_rule_api` | main.rs:304 |
| GET | `/api/integration/stats` | `get_sync_stats` | main.rs:242 |
| GET | `/api/integration/wms-scm` | `list_wms_scm_sync` | main.rs:273 |
| POST | `/api/integration/wms-scm` | `create_wms_scm_sync` | main.rs:274 |
| GET | `/api/integration/wms-scm/{id}` | `get_wms_scm_sync` | main.rs:275 |
| POST | `/api/integration/wms-scm/{id}/sync` | `sync_wms_scm` | main.rs:276 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:238 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:64 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:237 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:63 |
| GET | `/health` | `health` | main.rs:236 |

## lims 服务

- **路由路径数**: 36
- **端点数**: 40
- **扫描文件数**: 21

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:109 |
| GET | `/api/lims/audit-logs` | `list_audit_logs` | api/audit.rs:68 |
| GET | `/api/lims/audit-logs/export` | `export_audit_logs` | api/audit.rs:70 |
| GET | `/api/lims/audit-logs/{id}` | `get_audit_log` | api/audit.rs:69 |
| POST | `/api/lims/barcodes/scan` | `scan_barcode` | api/sample_barcode.rs:23 |
| GET | `/api/lims/barcodes/types` | `get_barcode_types` | api/sample_barcode.rs:24 |
| POST | `/api/lims/barcodes/{id}/print` | `print_barcode` | api/sample_barcode.rs:22 |
| POST | `/api/lims/instruments/{id}/calibration` | `calibrate` | api/instrument.rs:24 |
| GET | `/api/lims/lifecycle-stages` | `get_lifecycle_stages` | api/sample.rs:32 |
| POST | `/api/lims/pt-evaluations` | `evaluate_result` | api/proficiency_testing.rs:31 |
| GET | `/api/lims/pt-plans` | `list_plans` | api/proficiency_testing.rs:14 |
| POST | `/api/lims/pt-plans` | `create_plan` | |
| GET | `/api/lims/pt-plans/{id}/results` | `list_plan_results` | api/proficiency_testing.rs:20 |
| GET | `/api/lims/pt-plans/{id}/samples` | `list_plan_samples` | api/proficiency_testing.rs:19 |
| POST | `/api/lims/pt-results` | `submit_result` | api/proficiency_testing.rs:30 |
| POST | `/api/lims/pt-samples/receive` | `receive_sample` | api/proficiency_testing.rs:29 |
| GET | `/api/lims/records` | `list_records` | api/inspection_record.rs:14 |
| POST | `/api/lims/records` | `create_record` | |
| DELETE | `/api/lims/rfid-tags/{id}` | `delete_rfid_tag` | api/sample_barcode.rs:37 |
| GET | `/api/lims/samples` | `list_samples` | api/sample.rs:14 |
| POST | `/api/lims/samples` | `register_sample` | |
| POST | `/api/lims/samples/lifecycle` | `record_lifecycle_event` | api/sample.rs:23 |
| GET | `/api/lims/statistics` | `get_statistics` | api/statistics.rs:9 |
| GET | `/api/lims/sync-records` | `list_sync_records` | api/data_sync.rs:16 |
| POST | `/api/lims/sync-records/{id}/retry` | `retry_sync` | api/data_sync.rs:21 |
| POST | `/api/lims/sync/reagent-to-ehs` | `sync_reagent_to_ehs` | api/data_sync.rs:23 |
| POST | `/api/lims/sync/record-to-qms` | `sync_record_to_qms` | api/data_sync.rs:22 |
| GET | `/api/lims/tasks` | `list_tasks` | api/inspection_task.rs:14 |
| POST | `/api/lims/tasks` | `create_task` | |
| POST | `/api/lims/tasks/{id}/result` | `submit_result` | api/inspection_task.rs:19 |
| POST | `/api/lims/uncertainty-components` | `create_component` | api/uncertainty.rs:43 |
| POST | `/api/lims/uncertainty-sources` | `create_source` | api/uncertainty.rs:38 |
| POST | `/api/lims/uncertainty/type-a` | `calculate_type_a` | api/uncertainty.rs:48 |
| POST | `/api/lims/uncertainty/type-b` | `calculate_type_b` | api/uncertainty.rs:49 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:112 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:177 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:111 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:176 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:123 |
| GET | `/health` | `health` | main.rs:110 |

## mes 服务

- **路由路径数**: 29
- **端点数**: 31
- **扫描文件数**: 25

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:95 |
| GET | `/api/mes/kanban/dashboard` | `get_dashboard` | api/production_kanban.rs:25 |
| GET | `/api/mes/kanban/equipment-status` | `get_equipment_status` | api/production_kanban.rs:32 |
| GET | `/api/mes/kanban/order-progress` | `get_order_progress` | api/production_kanban.rs:26 |
| GET | `/api/mes/kanban/quality-trend` | `get_quality_trend` | api/production_kanban.rs:31 |
| POST | `/api/mes/material-requirements/calculate` | `calculate_requirements` | api/material_requirement.rs:34 |
| PUT | `/api/mes/material-requirements/{id}/confirm` | `confirm_requirement` | api/material_requirement.rs:35 |
| PUT | `/api/mes/material-requirements/{id}/release` | `release_requirement` | api/material_requirement.rs:36 |
| POST | `/api/mes/orders/from-erp` | `create_from_erp` | api/production_order.rs:29 |
| PUT | `/api/mes/orders/{id}/cancel` | `cancel_production_order` | api/production_order.rs:45 |
| PUT | `/api/mes/orders/{id}/start` | `start_production_order` | api/production_order.rs:40 |
| GET | `/api/mes/records` | `list_records` | api/production_record.rs:25 |
| POST | `/api/mes/records` | `create_record` | |
| POST | `/api/mes/records/{id}/complete` | `complete_record` | api/production_record.rs:30 |
| GET | `/api/mes/schedules/gantt` | `get_gantt_data` | api/production_scheduling.rs:36 |
| PUT | `/api/mes/schedules/{id}/adjust` | `adjust_schedule` | api/production_scheduling.rs:35 |
| GET | `/api/mes/traceability/chain` | `get_trace_chain` | api/quality_traceability.rs:29 |
| GET | `/api/mes/traceability/quality-records` | `list_quality_records` | api/quality_traceability.rs:30 |
| GET | `/api/mes/wips` | `list_wips` | api/wip.rs:25 |
| POST | `/api/mes/wips` | `create_wip` | |
| GET | `/api/mes/wips/statistics` | `get_wip_statistics` | api/wip.rs:32 |
| POST | `/api/mes/wips/transfer` | `transfer_wip` | api/wip.rs:30 |
| GET | `/api/mes/wips/{wip_id}/transfers` | `list_wip_transfers` | api/wip.rs:31 |
| PUT | `/api/mes/work-orders/{id}/cancel` | `cancel_work_order` | api/work_order.rs:39 |
| PUT | `/api/mes/work-orders/{id}/pause` | `pause_work_order` | api/work_order.rs:40 |
| PUT | `/api/mes/work-orders/{id}/resume` | `resume_work_order` | api/work_order.rs:41 |
| PUT | `/api/mes/work-orders/{id}/start` | `start_work_order` | api/work_order.rs:34 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:100 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:99 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:118 |
| GET | `/health` | `health` | main.rs:96 |

## migration-sdk 服务

- **路由路径数**: 0
- **端点数**: 0
- **扫描文件数**: 7


## mobile 服务

- **路由路径数**: 13
- **端点数**: 13
- **扫描文件数**: 30

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| POST | `/api/mobile/auth/login` | `login` | main.rs:282 |
| POST | `/api/mobile/auth/logout` | `logout` | main.rs:306 |
| GET | `/api/mobile/media/audio` | `get_audio` | main.rs:420 |
| GET | `/api/mobile/media/photos` | `get_photos` | main.rs:419 |
| GET | `/api/mobile/media/video` | `get_video` | main.rs:421 |
| GET | `/api/mobile/photos` | `get_photo_list` | main.rs:524 |
| GET | `/api/mobile/push/devices` | `get_devices` | main.rs:473 |
| POST | `/api/mobile/scan/image-ocr` | `image_ocr` | main.rs:343 |
| POST | `/api/mobile/scan/qrcode` | `scan_qrcode` | main.rs:342 |
| GET | `/api/mobile/stats/task` | `get_task_stats` | main.rs:304 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:133 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:132 |
| GET | `/health` | `health_check` | main.rs:281 |

## monitor 服务

- **路由路径数**: 15
- **端点数**: 16
- **扫描文件数**: 7

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:80 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:61 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:81 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:60 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:78 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:79 |
| GET | `/api/v1/monitor/alerts` | `list_alerts` | api/alerts.rs:275 |
| POST | `/api/v1/monitor/alerts/resolve` | `resolve_alerts` | api/alerts.rs:288 |
| GET | `/api/v1/monitor/health` | `get_service_health` | api/health_check.rs:24 |
| GET | `/api/v1/monitor/metrics/system` | `get_system_metrics` | api/metrics.rs:61 |
| GET | `/api/v1/monitor/performance/api` | `get_api_performance` | api/metrics.rs:66 |
| GET | `/api/v1/monitor/rules` | `list_rules` | api/alerts.rs:298 |
| POST | `/api/v1/monitor/rules` | `create_rule` | |
| POST | `/api/v1/monitor/rules/{id}/disable` | `disable_rule` | api/alerts.rs:304 |
| POST | `/api/v1/monitor/rules/{id}/enable` | `enable_rule` | api/alerts.rs:303 |
| GET | `/health` | `health_check` | main.rs:77 |

## pdm 服务

- **路由路径数**: 11
- **端点数**: 13
- **扫描文件数**: 17

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:95 |
| GET | `/api/pdm/production-statistics` | `list_statistics` | api/production_statistics.rs:9 |
| GET | `/api/pdm/products` | `list_products` | api/product.rs:14 |
| POST | `/api/pdm/products` | `create_product` | |
| GET | `/api/pdm/statistics` | `get_statistics` | api/production_statistics.rs:10 |
| GET | `/api/pdm/versions` | `list_versions` | api/version.rs:14 |
| POST | `/api/pdm/versions` | `create_version` | |
| GET | `/api/pdm/workflow-instances` | `list_workflow_instances` | api/workflow.rs:28 |
| POST | `/api/pdm/workflows/start` | `start_workflow` | api/workflow.rs:27 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:98 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:97 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:110 |
| GET | `/health` | `health` | main.rs:96 |

## pm 服务

- **路由路径数**: 25
- **端点数**: 28
- **扫描文件数**: 48

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:61 |
| POST | `/api/plugin_pm.budgets/{id}/approve` | `approve_budget` | api/budget.rs:28 |
| POST | `/api/plugin_pm.budgets/{id}/submit` | `submit_budget` | api/budget.rs:27 |
| POST | `/api/plugin_pm.notifications/{id}/read` | `mark_as_read` | api/notification.rs:36 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:102 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:67 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:101 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:66 |
| POST | `/api/pm/contracts/{id}/approve` | `approve_contract` | api/contract.rs:31 |
| POST | `/api/pm/contracts/{id}/reject` | `reject_contract` | api/contract.rs:32 |
| POST | `/api/pm/contracts/{id}/submit` | `submit_contract` | api/contract.rs:30 |
| PUT | `/api/pm/notification-settings/{id}` | `update_setting` | api/notification.rs:41 |
| GET | `/api/pm/notification-types` | `list_notification_types` | api/notification.rs:42 |
| POST | `/api/pm/notifications/{id}/read` | `mark_as_read` | api/notification.rs:27 |
| GET | `/api/pm/project-types` | `list_types` | api/project_type_config.rs:12 |
| POST | `/api/pm/project-types` | `create_type` | |
| GET | `/api/pm/projects` | `list_projects` | api/project.rs:81 |
| POST | `/api/pm/projects` | `create_project` | |
| GET | `/api/pm/projects/{id}/gantt` | `get_project_gantt` | api/project.rs:90 |
| GET | `/api/pm/reports/{id}` | `get_report` | api/report.rs:22 |
| GET | `/api/pm/risks/{id}` | `get_risk` | api/risk.rs:22 |
| PUT | `/api/pm/risks/{id}` | `update_risk` | |
| POST | `/api/pm/settlements/{id}/approve` | `approve_settlement` | api/settlement.rs:28 |
| GET | `/api/pm/statistics` | `get_statistics` | api/statistics.rs:37 |
| POST | `/api/v1/auth/login` | `login` | api/auth.rs:70 |
| POST | `/api/v1/auth/refresh` | `refresh` | api/auth.rs:72 |
| POST | `/api/v1/auth/register` | `register` | api/auth.rs:71 |
| GET | `/health` | `health_check` | main.rs:60 |

## portal 服务

- **路由路径数**: 13
- **端点数**: 13
- **扫描文件数**: 15

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:93 |
| GET | `/api/plugins/health` | `plugin_health_check` | main.rs:88 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:62 |
| GET | `/api/plugins/info` | `get_plugin_info` | main.rs:87 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:61 |
| GET | `/api/portal/v1/services` | `api::services::list_services` | main.rs:96 |
| GET | `/api/portal/v1/todos` | `api::todos::get_todos` | main.rs:97 |
| POST | `/api/portal/v1/todos` | `api::todos::add_todo` | main.rs:98 |
| POST | `/api/portal/v1/todos/{id}` | `api::todos::complete_todo` | main.rs:99 |
| DELETE | `/api/portal/v1/todos/{id}` | `api::todos::delete_todo` | main.rs:100 |
| GET | `/api/portal/v1/user` | `api::user::get_user_info` | main.rs:101 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:86 |
| GET | `/health` | `health_check` | main.rs:85 |

## qms 服务

- **路由路径数**: 67
- **端点数**: 67
- **扫描文件数**: 37

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:100 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:103 |
| GET | `/api/plugins/health` | `plugin_health_check` | modules/qms/qms_plugin.rs:62 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:177 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:102 |
| GET | `/api/plugins/info` | `get_plugin_info` | modules/qms/qms_plugin.rs:61 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:176 |
| GET | `/api/qms/actions` | `corrective_action::list_actions` | api/mod.rs:104 |
| POST | `/api/qms/actions` | `corrective_action::create_action` | api/mod.rs:105 |
| GET | `/api/qms/actions/{id}` | `corrective_action::get_action` | api/mod.rs:106 |
| GET | `/api/qms/apqp/approvals` | `apqp::list_apqp_approvals` | api/mod.rs:354 |
| POST | `/api/qms/apqp/approvals` | `apqp::create_apqp_approval` | api/mod.rs:355 |
| GET | `/api/qms/apqp/phases` | `apqp::list_apqp_phases` | api/mod.rs:339 |
| POST | `/api/qms/apqp/phases` | `apqp::create_apqp_phase` | api/mod.rs:340 |
| GET | `/api/qms/apqp/phases/{id}` | `apqp::get_apqp_phase` | api/mod.rs:341 |
| PUT | `/api/qms/apqp/phases/{id}` | `apqp::update_apqp_phase` | api/mod.rs:342 |
| DELETE | `/api/qms/apqp/phases/{id}` | `apqp::delete_apqp_phase` | api/mod.rs:343 |
| GET | `/api/qms/apqp/projects` | `apqp::list_apqp_projects` | api/mod.rs:320 |
| POST | `/api/qms/apqp/projects` | `apqp::create_apqp_project` | api/mod.rs:321 |
| GET | `/api/qms/apqp/projects/{id}` | `apqp::get_apqp_project` | api/mod.rs:322 |
| GET | `/api/qms/apqp/risks` | `apqp::list_apqp_risks` | api/mod.rs:349 |
| POST | `/api/qms/apqp/risks` | `apqp::create_apqp_risk` | api/mod.rs:350 |
| GET | `/api/qms/apqp/risks/{id}` | `apqp::get_apqp_risk` | api/mod.rs:351 |
| PUT | `/api/qms/apqp/risks/{id}` | `apqp::update_apqp_risk` | api/mod.rs:352 |
| DELETE | `/api/qms/apqp/risks/{id}` | `apqp::delete_apqp_risk` | api/mod.rs:353 |
| GET | `/api/qms/apqp/tasks` | `apqp::list_apqp_tasks` | api/mod.rs:344 |
| POST | `/api/qms/apqp/tasks` | `apqp::create_apqp_task` | api/mod.rs:345 |
| GET | `/api/qms/apqp/tasks/{id}` | `apqp::get_apqp_task` | api/mod.rs:346 |
| PUT | `/api/qms/apqp/tasks/{id}` | `apqp::update_apqp_task` | api/mod.rs:347 |
| DELETE | `/api/qms/apqp/tasks/{id}` | `apqp::delete_apqp_task` | api/mod.rs:348 |
| GET | `/api/qms/audit-findings` | `audit::list_audit_findings` | api/mod.rs:146 |
| GET | `/api/qms/audit-plans` | `audit::list_audit_plans` | api/mod.rs:124 |
| POST | `/api/qms/audit-plans` | `audit::create_audit_plan` | api/mod.rs:125 |
| GET | `/api/qms/audit-plans/{id}` | `audit::get_audit_plan` | api/mod.rs:126 |
| GET | `/api/qms/audit-tasks` | `audit::list_audit_tasks` | api/mod.rs:136 |
| GET | `/api/qms/checks` | `quality_inspection::list_inspections` | api/mod.rs:50 |
| GET | `/api/qms/dashboard` | `dashboard::get_dashboard_stats` | api/mod.rs:102 |
| GET | `/api/qms/eightd` | `eight_d::list_eightd_reports` | api/mod.rs:219 |
| POST | `/api/qms/eightd` | `eight_d::create_eightd_report` | api/mod.rs:220 |
| GET | `/api/qms/eightd/{id}` | `eight_d::get_eightd_report` | api/mod.rs:221 |
| PUT | `/api/qms/eightd/{id}` | `eight_d::update_eightd_report` | api/mod.rs:222 |
| GET | `/api/qms/fmea` | `fmea::list_fmea_analyses` | api/mod.rs:260 |
| POST | `/api/qms/fmea` | `fmea::create_fmea_analysis` | api/mod.rs:261 |
| GET | `/api/qms/fmea-items` | `fmea::list_fmea_items` | api/mod.rs:269 |
| POST | `/api/qms/fmea-items` | `fmea::create_fmea_item` | api/mod.rs:270 |
| GET | `/api/qms/fmea-items/{id}` | `fmea::get_fmea_item` | api/mod.rs:271 |
| PUT | `/api/qms/fmea-items/{id}` | `fmea::update_fmea_item` | api/mod.rs:272 |
| DELETE | `/api/qms/fmea-items/{id}` | `fmea::delete_fmea_item` | api/mod.rs:273 |
| GET | `/api/qms/fmea/{id}` | `fmea::get_fmea_analysis` | api/mod.rs:262 |
| PUT | `/api/qms/fmea/{id}` | `fmea::update_fmea_analysis` | api/mod.rs:263 |
| DELETE | `/api/qms/fmea/{id}` | `fmea::delete_fmea_analysis` | api/mod.rs:264 |
| GET | `/api/qms/issues` | `quality_issue::list_issues` | api/mod.rs:92 |
| POST | `/api/qms/issues` | `quality_issue::create_issue` | api/mod.rs:93 |
| GET | `/api/qms/issues/{id}` | `quality_issue::get_issue` | api/mod.rs:94 |
| PUT | `/api/qms/issues/{id}` | `quality_issue::update_issue` | api/mod.rs:95 |
| DELETE | `/api/qms/issues/{id}` | `quality_issue::delete_issue` | api/mod.rs:96 |
| GET | `/api/qms/spc/charts` | `spc::list_spc_charts` | api/mod.rs:178 |
| POST | `/api/qms/spc/charts` | `spc::create_spc_chart` | api/mod.rs:179 |
| GET | `/api/qms/spc/charts/{id}` | `spc::get_spc_chart` | api/mod.rs:180 |
| PUT | `/api/qms/spc/charts/{id}` | `spc::update_spc_chart` | api/mod.rs:181 |
| DELETE | `/api/qms/spc/charts/{id}` | `spc::delete_spc_chart` | api/mod.rs:182 |
| GET | `/api/qms/spc/data-points` | `spc::get_spc_data_points` | api/mod.rs:183 |
| POST | `/api/qms/spc/data-points` | `spc::add_spc_data_point` | api/mod.rs:184 |
| GET | `/api/qms/standards` | `quality_standard::list_standards` | api/mod.rs:24 |
| GET | `/api/qms/sync-records` | `data_sync::list_sync_records` | api/mod.rs:156 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:115 |
| GET | `/health` | `health` | main.rs:101 |

## report 服务

- **路由路径数**: 9
- **端点数**: 10
- **扫描文件数**: 11

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:103 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:106 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:105 |
| GET | `/api/report/reports` | `list_reports` | api/report.rs:15 |
| POST | `/api/report/reports` | `create_report` | |
| POST | `/api/report/reports/{id}/export` | `export_report` | api/report.rs:24 |
| POST | `/api/report/reports/{id}/run` | `run_report` | api/report.rs:25 |
| POST | `/api/report/schedules/{id}/execute` | `execute_schedule` | api/schedule.rs:27 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:118 |
| GET | `/health` | `health` | main.rs:104 |

## rs 服务

- **路由路径数**: 41
- **端点数**: 45
- **扫描文件数**: 36

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:113 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:119 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:77 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:118 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:76 |
| GET | `/api/rs/ai/analyses` | `list_analyses` | api/ai_integration.rs:64 |
| POST | `/api/rs/ai/analyses` | `create_analysis` | api/ai_integration.rs:65 |
| GET | `/api/rs/ai/analyses/{id}` | `get_analysis` | api/ai_integration.rs:66 |
| POST | `/api/rs/ai/chat` | `ai_chat` | api/ai_integration.rs:67 |
| GET | `/api/rs/audit-logs` | `list_audit_logs` | api/audit.rs:19 |
| GET | `/api/rs/audit-logs/export` | `export_audit_logs` | api/audit.rs:21 |
| GET | `/api/rs/audit-logs/{id}` | `get_audit_log` | api/audit.rs:20 |
| POST | `/api/rs/auth/login` | `login` | api/auth.rs:48 |
| POST | `/api/rs/auth/logout` | `logout` | api/auth.rs:50 |
| POST | `/api/rs/auth/refresh` | `refresh_token` | api/auth.rs:49 |
| GET | `/api/rs/batch-trace/{batch_number}` | `trace_batch` | api/experiment.rs:54 |
| GET | `/api/rs/documents` | `list_documents` | api/doc_integration.rs:59 |
| GET | `/api/rs/experiments/phase/lab` | `list_lab_experiments` | api/experiment.rs:41 |
| GET | `/api/rs/formulas` | `list_formulas` | api/formula.rs:29 |
| POST | `/api/rs/formulas` | `create_formula` | |
| POST | `/api/rs/formulas/{id}/approve` | `approve_formula` | api/formula.rs:38 |
| GET | `/api/rs/health/detailed` | `health_check_detailed` | main.rs:111 |
| POST | `/api/rs/members` | `create_member` | api/project_member.rs:17 |
| PUT | `/api/rs/members/{id}` | `update_member` | api/project_member.rs:22 |
| DELETE | `/api/rs/members/{id}` | `delete_member` | api/project_member.rs:23 |
| GET | `/api/rs/metrics` | `get_metrics` | main.rs:112 |
| POST | `/api/rs/milestones` | `create_milestone` | api/project_milestone.rs:20 |
| PUT | `/api/rs/milestones/{id}` | `update_milestone` | api/project_milestone.rs:25 |
| DELETE | `/api/rs/milestones/{id}` | `delete_milestone` | api/project_milestone.rs:26 |
| GET | `/api/rs/patents` | `list_patents` | api/patent.rs:82 |
| POST | `/api/rs/patents` | `create_patent` | |
| POST | `/api/rs/phases` | `create_phase` | api/project_phase.rs:20 |
| PUT | `/api/rs/phases/{id}` | `update_phase` | api/project_phase.rs:25 |
| DELETE | `/api/rs/phases/{id}` | `delete_phase` | api/project_phase.rs:26 |
| GET | `/api/rs/projects` | `list_projects` | api/project.rs:53 |
| POST | `/api/rs/projects` | `create_project` | |
| GET | `/api/rs/projects/export` | `export_projects` | api/project.rs:58 |
| POST | `/api/rs/projects/import` | `import_projects` | api/project.rs:59 |
| GET | `/api/rs/projects/{id}/gantt` | `get_project_gantt` | api/project.rs:68 |
| GET | `/api/rs/reports/projects/summary` | `get_project_summary` | api/project_report.rs:61 |
| GET | `/api/rs/reports/projects/trends` | `get_project_trends` | api/project_report.rs:62 |
| GET | `/api/rs/research-costs` | `list_costs` | api/research_cost.rs:76 |
| POST | `/api/rs/research-costs` | `create_cost` | |
| GET | `/api/rs/statistics` | `get_statistics` | api/statistics.rs:27 |
| GET | `/health` | `health_check` | main.rs:110 |

## scm 服务

- **路由路径数**: 29
- **端点数**: 32
- **扫描文件数**: 32

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:125 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:116 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:124 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:115 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:123 |
| GET | `/api/scm/audit-logs` | `list_audit_logs` | api/audit.rs:29 |
| GET | `/api/scm/dashboard/overview` | `overview` | api/supply_chain_dashboard.rs:16 |
| GET | `/api/scm/dashboard/real-time-status` | `real_time_status` | api/supply_chain_dashboard.rs:25 |
| GET | `/api/scm/inventory-turnover` | `calculate_turnover` | api/inventory_turnover.rs:16 |
| GET | `/api/scm/inventory-turnover/days` | `turnover_days` | api/inventory_turnover.rs:17 |
| GET | `/api/scm/inventory-turnover/trend` | `turnover_trend` | api/inventory_turnover.rs:22 |
| GET | `/api/scm/mrp-suggestions` | `list_suggestions` | api/mrp.rs:31 |
| GET | `/api/scm/mrp-suggestions/{id}` | `get_suggestion` | api/mrp.rs:32 |
| GET | `/api/scm/purchase-items` | `list_items` | api/purchase_item.rs:27 |
| POST | `/api/scm/purchase-items` | `create_item` | |
| POST | `/api/scm/purchase-orders/{id}/approve` | `approve_order` | api/purchase_order.rs:27 |
| POST | `/api/scm/purchase-orders/{id}/reject` | `reject_order` | api/purchase_order.rs:28 |
| GET | `/api/scm/quotes` | `list_quotes` | api/price_comparison.rs:118 |
| POST | `/api/scm/quotes` | `create_quote` | |
| POST | `/api/scm/sync/consistency-check` | `check_consistency` | api/data_sync.rs:93 |
| POST | `/api/scm/sync/retry-failed` | `retry_failed_syncs` | api/data_sync.rs:86 |
| POST | `/api/scm/sync/statistics` | `get_sync_statistics` | api/data_sync.rs:87 |
| POST | `/api/scm/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:88 |
| GET | `/api/v1/audit-logs/{id}` | `get_audit_log` | api/audit.rs:30 |
| GET | `/api/v1/comparisons/{id}` | `get_comparison` | api/price_comparison.rs:125 |
| POST | `/api/v1/comparisons/{id}/approve` | `approve_comparison` | api/price_comparison.rs:126 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:128 |
| POST | `/api/v1/inquiries/{id}/publish` | `publish_inquiry` | api/price_comparison.rs:117 |
| GET | `/api/v1/quotes/{id}` | `get_quote` | api/price_comparison.rs:119 |
| PUT | `/api/v1/quotes/{id}` | `update_quote` | |
| POST | `/api/v1/quotes/{id}/submit` | `submit_quote` | api/price_comparison.rs:120 |
| GET | `/health` | `health_check` | main.rs:118 |

## shared 服务

- **路由路径数**: 18
- **端点数**: 24
- **扫描文件数**: 19

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api/shared/mappings` | `list_mappings` | modules/code_mapping.rs:160 |
| POST | `/api/shared/mappings` | `create_mapping` | modules/code_mapping.rs:161 |
| GET | `/api/shared/sequences` | `list_sequences` | modules/code_sequence.rs:115 |
| POST | `/api/shared/sequences` | `create_sequence` | modules/code_sequence.rs:116 |
| POST | `/api/shared/sequences/{code_type}/next` | `get_next_code` | modules/code_sequence.rs:117 |
| POST | `/api/shared/sync` | `sync_data` | modules/code_mapping.rs:162 |
| GET | `/api/shared/sync/logs` | `list_sync_logs` | modules/sync_log.rs:79 |
| GET | `/companies` | `get_companies` | api/handlers.rs:150 |
| POST | `/companies` | `create_company` | |
| GET | `/companies/{id}` | `get_company` | api/handlers.rs:151 |
| PUT | `/companies/{id}` | `update_company` | |
| DELETE | `/companies/{id}` | `delete_company` | |
| GET | `/departments` | `get_departments` | api/handlers.rs:152 |
| POST | `/departments` | `create_department` | |
| GET | `/departments/{id}` | `get_department` | api/handlers.rs:153 |
| GET | `/employees` | `get_employees` | api/handlers.rs:156 |
| POST | `/employees` | `create_employee` | |
| GET | `/employees/{id}` | `get_employee` | api/handlers.rs:157 |
| POST | `/id/generate` | `generate_id` | api/handlers.rs:158 |
| GET | `/id/{id}` | `get_id_info` | api/handlers.rs:159 |
| GET | `/params/{param_key}` | `get_system_param` | api/handlers.rs:160 |
| PUT | `/params/{param_key}` | `set_system_param` | |
| POST | `/positions` | `create_position` | api/handlers.rs:154 |
| GET | `/positions/{id}` | `get_position` | api/handlers.rs:155 |

## srm 服务

- **路由路径数**: 16
- **端点数**: 16
- **扫描文件数**: 28

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:119 |
| GET | `/api/plugins/health` | `plugin::plugin_health_check` | main.rs:125 |
| GET | `/api/plugins/health` | `plugin_health_check` | plugin.rs:77 |
| GET | `/api/plugins/info` | `plugin::get_plugin_info` | main.rs:124 |
| GET | `/api/plugins/info` | `get_plugin_info` | plugin.rs:76 |
| GET | `/api/srm/health/detailed` | `health_check_detailed` | main.rs:118 |
| GET | `/api/srm/performance/reports` | `get_performance_reports` | api/supplier_performance.rs:50 |
| GET | `/api/srm/performance/summary` | `get_performance_summary` | api/supplier_performance.rs:69 |
| GET | `/api/srm/performance/top-suppliers` | `get_top_suppliers` | api/supplier_performance.rs:60 |
| GET | `/api/srm/performance/trend` | `get_performance_trend` | api/supplier_performance.rs:59 |
| GET | `/api/srm/statistics` | `get_statistics` | api/statistics.rs:17 |
| GET | `/api/srm/statistics/detailed` | `get_detailed_statistics` | api/statistics.rs:18 |
| GET | `/api/srm/suppliers/{id}/score-trend` | `get_score_trend` | api/supplier_evaluation.rs:58 |
| POST | `/api/srm/sync/supplier-to-scm` | `sync_supplier_to_scm` | api/data_sync.rs:52 |
| POST | `/api/srm/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:57 |
| GET | `/health` | `health_check` | main.rs:117 |

## unified-core 服务

- **路由路径数**: 27
- **端点数**: 27
- **扫描文件数**: 51

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/` | `home` | main.rs:204 |
| GET | `/api/core/iam/roles` | `modules::iam::role::list_roles` | main.rs:340 |
| POST | `/api/core/iam/roles` | `modules::iam::role::create_role` | main.rs:395 |
| GET | `/api/core/iam/users` | `modules::iam::user::list_users` | main.rs:316 |
| POST | `/api/core/iam/users` | `modules::iam::user::create_user` | main.rs:367 |
| POST | `/api/core/iam/users` | `create_user` | middleware/permission.rs:8 |
| POST | `/api/core/iam/users` | `create_user` | middleware/permission.rs:49 |
| GET | `/api/flow/instances` | `super::instance::list_instances` | modules/flow/plugin.rs:106 |
| GET | `/api/flow/workflows` | `super::workflow::list_workflows` | modules/flow/plugin.rs:81 |
| POST | `/api/iam/auth/login` | `modules::iam::auth::login` | main.rs:240 |
| POST | `/api/iam/auth/logout` | `modules::iam::auth::logout` | main.rs:308 |
| POST | `/api/iam/auth/register` | `modules::iam::auth::register` | main.rs:241 |
| GET | `/api/iam/roles` | `modules::iam::role::list_roles` | main.rs:346 |
| GET | `/api/iam/roles/{id}` | `modules::iam::role::get_role` | main.rs:347 |
| GET | `/api/iam/users` | `modules::iam::user::list_users` | main.rs:330 |
| POST | `/api/iam/users` | `modules::iam::user::create_user` | main.rs:389 |
| POST | `/api/iam/users` | `create_user` | middleware/permission.rs:279 |
| GET | `/api/iam/users/{id}` | `modules::iam::user::get_user` | main.rs:331 |
| PUT | `/api/iam/users/{id}` | `modules::iam::user::update_user` | main.rs:390 |
| GET | `/api/plugins/health` | `plugin_health_check` | main.rs:215 |
| GET | `/api/plugins/{plugin_code}/{*path}` | `plugin_proxy` | main.rs:265 |
| POST | `/api/v1/auth/login` | `modules::iam::auth::login` | main.rs:225 |
| POST | `/api/v1/auth/logout` | `modules::iam::auth::logout` | main.rs:307 |
| POST | `/api/v1/auth/register` | `modules::iam::auth::register` | main.rs:226 |
| GET | `/api/v1/health/detailed` | `detailed_health` | main.rs:1382 |
| GET | `/health` | `health` | main.rs:205 |
| GET | `/ws/im` | `modules::communication::ws::websocket_handler` | main.rs:263 |

## wms 服务

- **路由路径数**: 49
- **端点数**: 60
- **扫描文件数**: 36

| 方法 | 路径 | 处理函数 | 模块/文件 |
|------|------|----------|-----------|
| GET | `/api-docs/openapi.json` | `serve_openapi_json` | main.rs:84 |
| GET | `/api/plugins/health` | `plugin_health_check` | api/plugin.rs:156 |
| GET | `/api/plugins/health` | `plugin_health_check` | main.rs:83 |
| GET | `/api/plugins/info` | `get_plugin_info` | api/plugin.rs:155 |
| GET | `/api/plugins/info` | `get_plugin_info` | main.rs:82 |
| GET | `/api/v1/alerts/{id}` | `get_alert` | api/inventory_alert.rs:88 |
| POST | `/api/v1/alerts/{id}/acknowledge` | `acknowledge_alert` | api/inventory_alert.rs:89 |
| GET | `/api/v1/audit-logs/{id}` | `get_audit_log` | api/audit.rs:53 |
| GET | `/api/v1/cycle-counts/{id}` | `get_cycle_count_config` | api/cycle_count.rs:35 |
| PUT | `/api/v1/cycle-counts/{id}` | `update_cycle_count_config` | |
| DELETE | `/api/v1/cycle-counts/{id}` | `delete_cycle_count_config` | |
| POST | `/api/v1/cycle-counts/{id}/generate` | `generate_cycle_count` | api/cycle_count.rs:36 |
| GET | `/api/v1/discrepancies/{id}` | `get_discrepancy` | api/discrepancy.rs:35 |
| POST | `/api/v1/discrepancies/{id}/adjust` | `adjust_inventory` | api/discrepancy.rs:37 |
| POST | `/api/v1/discrepancies/{id}/approve` | `approve_discrepancy` | api/discrepancy.rs:36 |
| GET | `/api/v1/health/detailed` | `health_check_detailed` | main.rs:80 |
| GET | `/api/v1/metrics` | `get_metrics` | main.rs:81 |
| POST | `/api/v1/stock-takes/{id}/adjust` | `adjust_stock_take` | api/stock_take.rs:105 |
| POST | `/api/v1/stock-takes/{id}/count` | `count_stock_take` | api/stock_take.rs:100 |
| POST | `/api/v1/stock-takes/{id}/start` | `start_stock_take` | api/stock_take.rs:99 |
| GET | `/api/v1/transfers/{id}` | `get_transfer` | api/transfer.rs:35 |
| PUT | `/api/v1/transfers/{id}` | `update_transfer` | |
| DELETE | `/api/v1/transfers/{id}` | `delete_transfer` | |
| POST | `/api/v1/transfers/{id}/execute` | `execute_transfer` | api/transfer.rs:38 |
| GET | `/api/v1/transfers/{id}/items` | `list_transfer_items` | api/transfer.rs:36 |
| POST | `/api/v1/transfers/{id}/items` | `create_transfer_item` | |
| GET | `/api/v1/transfers/{id}/items/{item_id}` | `get_transfer_item` | api/transfer.rs:37 |
| PUT | `/api/v1/transfers/{id}/items/{item_id}` | `update_transfer_item` | |
| DELETE | `/api/v1/transfers/{id}/items/{item_id}` | `delete_transfer_item` | |
| GET | `/api/wms/alerts` | `list_alerts` | api/inventory_alert.rs:87 |
| GET | `/api/wms/alerts/by-warehouse` | `get_alerts_by_warehouse` | api/inventory_alert.rs:92 |
| GET | `/api/wms/alerts/statistics` | `get_alert_statistics` | api/inventory_alert.rs:90 |
| GET | `/api/wms/alerts/summary` | `get_alert_summary` | api/inventory_alert.rs:91 |
| GET | `/api/wms/audit-logs` | `list_audit_logs` | api/audit.rs:52 |
| GET | `/api/wms/batches` | `list_batches` | api/batch.rs:25 |
| POST | `/api/wms/batches` | `create_batch` | |
| GET | `/api/wms/batches/expired` | `get_expired` | api/batch.rs:28 |
| GET | `/api/wms/batches/expiring-soon` | `get_expiring_soon` | api/batch.rs:27 |
| GET | `/api/wms/batches/statistics` | `get_batch_statistics` | api/batch.rs:26 |
| GET | `/api/wms/cycle-counts` | `list_cycle_count_configs` | api/cycle_count.rs:34 |
| POST | `/api/wms/cycle-counts` | `create_cycle_count_config` | |
| POST | `/api/wms/cycle-counts/generate-all` | `generate_all_cycle_counts` | api/cycle_count.rs:37 |
| GET | `/api/wms/discrepancies` | `list_discrepancies` | api/discrepancy.rs:34 |
| POST | `/api/wms/discrepancies` | `create_discrepancy` | |
| POST | `/api/wms/discrepancies/process-stock-take/{stock_take_id}` | `process_stock_take_discrepancies` | api/discrepancy.rs:38 |
| GET | `/api/wms/inventory-alerts` | `list_alerts` | api/inventory_alert.rs:93 |
| GET | `/api/wms/inventory-alerts/{id}` | `get_alert` | api/inventory_alert.rs:98 |
| GET | `/api/wms/inventory/abc-analysis` | `get_abc_analysis` | api/inventory.rs:82 |
| GET | `/api/wms/inventory/turnover` | `get_turnover` | api/inventory.rs:83 |
| GET | `/api/wms/locations/status` | `get_location_status` | api/location.rs:63 |
| GET | `/api/wms/serial-numbers/{id}/trace` | `get_trace` | api/serial_number.rs:54 |
| POST | `/api/wms/sync/sync-logs` | `get_sync_logs` | api/data_sync.rs:58 |
| GET | `/api/wms/transfers` | `list_transfers` | api/transfer.rs:34 |
| POST | `/api/wms/transfers` | `create_transfer` | |
| POST | `/api/wms/transfers/{id}/complete` | `complete_transfer` | api/transfer_order.rs:37 |
| POST | `/api/wms/transfers/{id}/confirm` | `confirm_transfer` | api/transfer_order.rs:34 |
| GET | `/api/wms/transfers/{id}/items` | `list_transfer_items` | api/transfer_order.rs:33 |
| POST | `/api/wms/transfers/{id}/receive` | `receive_transfer` | api/transfer_order.rs:36 |
| POST | `/api/wms/transfers/{id}/ship` | `ship_transfer` | api/transfer_order.rs:35 |
| GET | `/health` | `health_check` | main.rs:79 |