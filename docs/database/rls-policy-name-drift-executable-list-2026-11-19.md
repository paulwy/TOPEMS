# RLS 策略名漂移归一 · 逐表可执行清单（103 + 234 口径）

- 日期：2026-11-19
- 数据源：`topems_prod`（2026-11-18 生产只读快照）`pg_policies` 实测
- 对应迁移：`20261119130000_rls_normalize_batch1_drop_duplicate_legacy.sql`、`20261119131000_rls_normalize_batch2_rename_legacy.sql`（HEAD 已存在，状态 `to_apply`）
- 等价判定：`pg_get_expr(polqual)` 规范化空白后逐字比较；batch1 的遗留策略省略 `WITH CHECK`，PostgreSQL 语义为回落 `USING`，判定等价
- 代码依赖：`grep` `svc/ lib/ cli/ apps/ packages/`（Rust/TS/YAML）；无运行期依赖命中目标表，通用构造器与注释/测试命中见 §5

## 0. 口径映射

| census 口径 | 数量 | 本清单覆盖 |
|---|---:|---|
| 生产独有策略名（`rls_tenant_isolation`） | 103 | batch2 的 159 张单策略表；`bi.audit_logs` 已单列 §4 |
| 仓库独有策略名（`tenant_isolation_*`） | 234 | 11 条 `flow.*` 影子副本（随 `20261119160000` 删除）+ 71 条 batch1 重复策略 + 159 条 batch2 遗留名 |
| 其中同表同义、仅改名 | 230 | batch1 71 + batch2 159（本清单逐表列出） |
| 其中语义不同、不归一 | — | 以表为单位列于 §4（不按策略条数强行凑数） |

## 1. Batch 1：同表双策略，删除遗留副本（71 张）

| # | 表 | 现名（删除） | 目标名（保留） | 表达式等价 | 代码依赖策略名 |
|---:|---|---|---|---|---|
| 1 | `bi.report_templates` | `tenant_isolation_report_templates` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 2 | `communication.notification_channels` | `tenant_isolation_notification_channels` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 3 | `crm.contacts` | `tenant_isolation_contacts` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 4 | `crm.customer_finance` | `tenant_isolation_customer_finance` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 5 | `crm.customer_tags` | `tenant_isolation_customer_tags` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 6 | `crm.interactions` | `tenant_isolation_interactions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 7 | `crm.opportunities` | `tenant_isolation_opportunities` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 8 | `crm.tags` | `tenant_isolation_tags` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 9 | `erp.announcements` | `tenant_isolation_announcements` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 10 | `erp.assets` | `tenant_isolation_assets` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 11 | `erp.fin_reconciliations` | `tenant_isolation_fin_reconciliations` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 12 | `erp.inventory` | `tenant_isolation_inventory` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 13 | `erp.materials` | `tenant_isolation_materials` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 14 | `erp.purchase_orders` | `tenant_isolation_purchase_orders` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 15 | `erp.voucher_items` | `tenant_isolation_voucher_items` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 16 | `hrm.attendance_records` | `tenant_isolation_attendance_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 17 | `hrm.candidates` | `tenant_isolation_candidates` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 18 | `hrm.companies` | `tenant_isolation_companies` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 19 | `hrm.contract_renewals` | `tenant_isolation_contract_renewals` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 20 | `hrm.contracts` | `tenant_isolation_contracts` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 21 | `hrm.departments` | `tenant_isolation_departments` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 22 | `hrm.employees` | `tenant_isolation_employees` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 23 | `hrm.interviews` | `tenant_isolation_interviews` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 24 | `hrm.job_openings` | `tenant_isolation_job_openings` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 25 | `hrm.leave_records` | `tenant_isolation_leave_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 26 | `hrm.payroll_details` | `tenant_isolation_payroll_details` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 27 | `hrm.payroll_items` | `tenant_isolation_payroll_items` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 28 | `hrm.payroll_records` | `tenant_isolation_payroll_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 29 | `hrm.payroll_runs` | `tenant_isolation_payroll_runs` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 30 | `hrm.performance_goals` | `tenant_isolation_performance_goals` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 31 | `hrm.performance_records` | `tenant_isolation_performance_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 32 | `hrm.performance_reviews` | `tenant_isolation_performance_reviews` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 33 | `hrm.positions` | `tenant_isolation_positions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 34 | `hrm.recruitment_applications` | `tenant_isolation_recruitment_applications` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 35 | `hrm.recruitment_records` | `tenant_isolation_recruitment_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 36 | `hrm.salary_adjustments` | `tenant_isolation_salary_adjustments` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 37 | `hrm.training_courses` | `tenant_isolation_training_courses` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 38 | `hrm.training_participants` | `tenant_isolation_training_participants` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 39 | `hrm.training_plans` | `tenant_isolation_training_plans` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 40 | `hrm.training_records` | `tenant_isolation_training_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 41 | `iam.permission_audit_logs` | `tenant_isolation_permission_audit_logs` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 42 | `iam.position_permissions` | `tenant_isolation_position_permissions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 43 | `iam.position_roles` | `tenant_isolation_position_roles` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 44 | `iam.positions` | `tenant_isolation_positions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 45 | `iam.resource_permissions` | `tenant_isolation_resource_permissions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 46 | `iam.user_positions` | `tenant_isolation_user_positions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 47 | `master_data.materials` | `tenant_isolation_materials` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 48 | `master_data.samples` | `tenant_isolation_samples` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 49 | `master_data.uoms` | `tenant_isolation_uoms` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 50 | `public._archive_core_workflow_versions` | `tenant_isolation_core_workflow_versions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 51 | `public.tenant_permissions` | `tenant_isolation_tenant_permissions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 52 | `qms.qa_audit_findings` | `tenant_isolation_qa_audit_findings` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 53 | `qms.qa_audit_plans` | `tenant_isolation_qa_audit_plans` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 54 | `qms.qa_audit_tasks` | `tenant_isolation_qa_audit_tasks` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 55 | `qms.qa_corrective_action_items` | `tenant_isolation_qa_corrective_action_items` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 56 | `qms.qa_corrective_actions` | `tenant_isolation_qa_corrective_actions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 57 | `qms.qa_eightd_audit_logs` | `tenant_isolation_qa_eightd_audit_logs` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 58 | `qms.qa_eightd_reports` | `tenant_isolation_qa_eightd_reports` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 59 | `qms.qa_fmea_analyses` | `tenant_isolation_qa_fmea_analyses` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 60 | `qms.qa_fmea_items` | `tenant_isolation_qa_fmea_items` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 61 | `qms.qa_inspection_audits` | `tenant_isolation_qa_inspection_audits` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 62 | `qms.qa_inspection_results` | `tenant_isolation_qa_inspection_results` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 63 | `qms.qa_qms_sync_records` | `tenant_isolation_qa_qms_sync_records` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 64 | `qms.qa_quality_costs` | `tenant_isolation_qa_quality_costs` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 65 | `qms.qa_quality_inspections` | `tenant_isolation_qa_quality_inspections` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 66 | `qms.qa_quality_issues` | `tenant_isolation_qa_quality_issues` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 67 | `qms.qa_spc_charts` | `tenant_isolation_qa_spc_charts` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 68 | `qms.qa_spc_data_points` | `tenant_isolation_qa_spc_data_points` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 69 | `qms.qa_standard_revisions` | `tenant_isolation_qa_standard_revisions` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 70 | `qms.qa_standards` | `tenant_isolation_qa_standards` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |
| 71 | `rs.change_requests` | `tenant_isolation_change_requests` | `rls_tenant_isolation` | 等价（USING 相同；WITH CHECK 省略） | 无 |

## 2. Batch 2：单遗留策略改名并收紧为严格 B（159 张）

| # | 表 | 现名 | 目标名 | 表达式等价 | 代码依赖策略名 |
|---:|---|---|---|---|---|
| 1 | `analytics.analytics_comparison_analyses` | `tenant_isolation_analytics_comparison_analyses` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 2 | `analytics.analytics_comparison_results` | `tenant_isolation_analytics_comparison_results` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 3 | `analytics.analytics_dashboard_shares` | `tenant_isolation_analytics_dashboard_shares` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 4 | `analytics.analytics_dashboard_templates` | `tenant_isolation_analytics_dashboard_templates` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 5 | `analytics.analytics_dashboards` | `tenant_isolation_analytics_dashboards` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 6 | `analytics.analytics_datasources` | `tenant_isolation_analytics_datasources` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 7 | `analytics.analytics_drilldown_history` | `tenant_isolation_analytics_drilldown_history` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 8 | `analytics.analytics_drilldown_paths` | `tenant_isolation_analytics_drilldown_paths` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 9 | `analytics.analytics_row_level_permissions` | `tenant_isolation_analytics_row_level_permissions` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 10 | `analytics.analytics_self_service_reports` | `tenant_isolation_analytics_self_service_reports` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 11 | `analytics.analytics_widgets` | `tenant_isolation_analytics_widgets` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 12 | `bi.analytics_dashboards` | `tenant_isolation_analytics_dashboards` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 13 | `bi.analytics_datasources` | `tenant_isolation_analytics_datasources` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 14 | `bi.analytics_widgets` | `tenant_isolation_analytics_widgets` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 15 | `communication.core_notification_deliveries` | `notification_deliveries_tenant_isolation` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 16 | `communication.core_notification_preferences` | `notification_preferences_tenant_isolation` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 17 | `communication.core_notification_subscriptions` | `notification_subscriptions_tenant_isolation` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 18 | `core.ai_faqs` | `tenant_isolation_core_ai_faqs` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 19 | `core.user_preferences` | `tenant_isolation_user_preferences` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 20 | `crm.contracts` | `tenant_isolation_contracts` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 21 | `crm.customer_recommendations` | `tenant_isolation_customer_recommendations` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 22 | `crm.customer_segments` | `tenant_isolation_customer_segments` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 23 | `erp.bank_accounts` | `tenant_isolation_bank_accounts` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 24 | `erp.erp_production_orders` | `tenant_isolation` | `rls_tenant_isolation` | 等价（严格 B） | 见 §3 |
| 25 | `erp.inventory_items` | `tenant_isolation_inventory_items` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 26 | `hrm.hrm_cache_invalidation_logs` | `tenant_isolation` | `rls_tenant_isolation` | 等价（严格 B） | 见 §3 |
| 27 | `hrm.initialization_status` | `tenant_isolation_initialization_status` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 28 | `iam.data_permissions` | `tenant_isolation_data_permissions` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 29 | `iam.permission_templates` | `tenant_isolation_permission_templates` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 30 | `iam.tenant_users` | `tenant_isolation_tenant_users` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 31 | `master_data.mdm_api_exposures` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 32 | `master_data.mdm_api_products` | `mdm_api_products_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 33 | `master_data.mdm_assets` | `mdm_assets_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 34 | `master_data.mdm_audit_events` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 35 | `master_data.mdm_audit_export_logs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 36 | `master_data.mdm_auto_fix_actions` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 37 | `master_data.mdm_bc_tests` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 38 | `master_data.mdm_change_events` | `mdm_change_events_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 39 | `master_data.mdm_continuity_plans` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 40 | `master_data.mdm_critical_functions` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 41 | `master_data.mdm_data_asset_categories` | `mdm_data_asset_categories_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 42 | `master_data.mdm_data_contracts` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 43 | `master_data.mdm_data_permissions` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 44 | `master_data.mdm_data_products` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 45 | `master_data.mdm_dimension_scores` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 46 | `master_data.mdm_failover_records` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 47 | `master_data.mdm_fix_strategies` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 48 | `master_data.mdm_governance_insights` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 49 | `master_data.mdm_governance_suggestions` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 50 | `master_data.mdm_graph_communities` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 51 | `master_data.mdm_graph_edges` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 52 | `master_data.mdm_graph_nodes` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 53 | `master_data.mdm_impact_analyses` | `mdm_impact_analyses_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 54 | `master_data.mdm_impact_simulations` | `mdm_impact_simulations_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 55 | `master_data.mdm_improvement_plans` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 56 | `master_data.mdm_interactions` | `mdm_interactions_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 57 | `master_data.mdm_kg_edges` | `mdm_kg_edges_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 58 | `master_data.mdm_kg_graphs` | `mdm_kg_graphs_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 59 | `master_data.mdm_kg_nodes` | `mdm_kg_nodes_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 60 | `master_data.mdm_lifecycle_history` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 61 | `master_data.mdm_lifecycle_policies` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 62 | `master_data.mdm_lifecycle_stages` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 63 | `master_data.mdm_lineage_edges` | `mdm_lineage_edges_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 64 | `master_data.mdm_lineage_graphs` | `mdm_lineage_graphs_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 65 | `master_data.mdm_lineage_nodes` | `mdm_lineage_nodes_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 66 | `master_data.mdm_maturity_assessments` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 67 | `master_data.mdm_maturity_history` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 68 | `master_data.mdm_metadata_attributes` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 69 | `master_data.mdm_metadata_tags` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 70 | `master_data.mdm_permission_roles` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 71 | `master_data.mdm_propagation_logs` | `mdm_propagation_logs_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 72 | `master_data.mdm_propagation_rules` | `mdm_propagation_rules_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 73 | `master_data.mdm_quality_checks` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 74 | `master_data.mdm_quality_loop_configs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 75 | `master_data.mdm_rate_cards` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 76 | `master_data.mdm_recommendations` | `mdm_recommendations_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 77 | `master_data.mdm_recovery_plans` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 78 | `master_data.mdm_recovery_points` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 79 | `master_data.mdm_region_configs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 80 | `master_data.mdm_replication_configs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 81 | `master_data.mdm_search_history` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 82 | `master_data.mdm_search_indexes` | `mdm_search_indexes_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 83 | `master_data.mdm_semantic_search_indexes` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 84 | `master_data.mdm_sla_configs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 85 | `master_data.mdm_supplier_categories` | `tenant_isolation_mdm_supplier_categories` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 86 | `master_data.mdm_suppliers` | `tenant_isolation_mdm_suppliers` | `rls_tenant_isolation` | 等价（严格 B） | 见 §3 |
| 87 | `master_data.mdm_sync_dead_letter` | `tenant_isolation_mdm_sync_dead_letter` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 88 | `master_data.mdm_tag_rules` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 89 | `master_data.mdm_tagged_entities` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 90 | `master_data.mdm_tags` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 91 | `master_data.mdm_user_role_assignments` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 92 | `master_data.mdm_v60_lineage_edges` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 93 | `master_data.mdm_v60_lineage_graphs` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 94 | `master_data.mdm_v60_lineage_nodes` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 95 | `master_data.mdm_version_branches` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 96 | `master_data.mdm_version_snapshots` | `mdm_version_snapshots_tenant_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 97 | `master_data.mdm_workflow_history` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 98 | `master_data.mdm_workflow_templates` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 99 | `master_data.mdm_workflows` | `tenant_isolation_policy` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 100 | `plugin_finance.accounting_subjects` | `tenant_isolation_accounting_subjects` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 101 | `plugin_finance.difference_adjustments` | `tenant_isolation_difference_adjustments` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 102 | `plugin_finance.reconciliation_item_snapshots` | `tenant_isolation_reconciliation_item_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 103 | `plugin_finance.reconciliation_settlement_links` | `tenant_isolation_reconciliation_settlement_links` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 104 | `plugin_finance.reconciliation_snapshots` | `tenant_isolation_reconciliation_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 105 | `plugin_finance.settlement_snapshots` | `tenant_isolation_settlement_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 106 | `portal.portal_dashboard_stats` | `tenant_isolation_portal_dashboard_stats` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 107 | `portal.portal_notifications` | `tenant_isolation_portal_notifications` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 108 | `public._archive_core_workflow_instances` | `tenant_isolation_core_workflow_instances` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 109 | `public.core_doc_documents` | `tenant_isolation_core_doc_documents` | `rls_tenant_isolation` | 等价（严格 B） | 见 §3 |
| 110 | `public.core_doc_folders` | `tenant_isolation_core_doc_folders` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 111 | `public.core_doc_templates` | `tenant_isolation_core_doc_templates` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 112 | `public.core_emails` | `tenant_isolation_core_emails` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 113 | `public.core_file_folders` | `tenant_isolation_core_file_folders` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 114 | `public.core_finance_accounts` | `tenant_isolation_core_finance_accounts` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 115 | `public.core_finance_vouchers` | `tenant_isolation_core_finance_vouchers` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 116 | `public.core_flow_categories` | `tenant_isolation_core_flow_categories` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 117 | `public.core_guide_lessons` | `tenant_isolation_core_guide_lessons` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 118 | `public.core_guide_progress` | `tenant_isolation_core_guide_progress` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 119 | `public.core_inter_module_sync` | `tenant_isolation_core_inter_module_sync` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 120 | `public.core_master_data_change_log` | `tenant_isolation_core_master_data_change_log` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 121 | `public.core_master_data_refs` | `tenant_isolation_core_master_data_refs` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 122 | `public.core_mdm_approvals` | `tenant_isolation_core_mdm_approvals` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 123 | `public.core_mdm_reconciliation_log` | `tenant_isolation_core_mdm_reconciliation_log` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 124 | `public.core_migration_history` | `tenant_isolation_core_migration_history` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 125 | `public.core_notification_templates` | `tenant_isolation_core_notification_templates` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 126 | `public.core_notifications` | `tenant_isolation_core_notifications` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 127 | `public.core_tenant_modules` | `tenant_isolation_core_tenant_modules` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 128 | `public.core_tenant_usage` | `tenant_isolation_core_tenant_usage` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 129 | `public.cqrs_events` | `tenant_isolation_cqrs_events` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 130 | `public.crm_dashboard_snapshots` | `tenant_isolation_crm_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 131 | `public.ehs_dashboard_snapshots` | `tenant_isolation_ehs_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 132 | `public.finance_voucher_templates` | `tenant_isolation_finance_voucher_templates` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 133 | `public.financial_reports` | `tenant_isolation_financial_reports` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 134 | `public.hrm_dashboard_snapshots` | `tenant_isolation_hrm_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 135 | `public.lims_dashboard_snapshots` | `tenant_isolation_lims_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 136 | `public.pdm_change_notices` | `tenant_isolation_pdm_change_notices` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 137 | `public.pdm_dashboard_snapshots` | `tenant_isolation_pdm_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 138 | `public.pdm_materials` | `tenant_isolation_pdm_materials` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 139 | `public.pdm_products` | `tenant_isolation_pdm_products` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 140 | `public.search_entity_projections` | `tenant_isolation_search_entity_projections` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 141 | `public.wms_dashboard_snapshots` | `tenant_isolation_wms_dashboard_snapshots` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 142 | `qms.qa_alert_messages` | `tenant_isolation_qa_alert_messages` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 143 | `qms.qa_alert_rules` | `tenant_isolation_qa_alert_rules` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 144 | `qms.qa_approval_events` | `tenant_isolation_qa_approval_events` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 145 | `qms.qa_apqp_phases` | `tenant_isolation_qa_apqp_phases` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 146 | `qms.qa_apqp_projects` | `tenant_isolation_qa_apqp_projects` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 147 | `qms.qa_apqp_risks` | `tenant_isolation_qa_apqp_risks` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 148 | `qms.qa_apqp_tasks` | `tenant_isolation_qa_apqp_tasks` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 149 | `rs.change_orders` | `tenant_isolation_change_orders` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 150 | `rs.material_tests` | `tenant_isolation_material_tests` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 151 | `rs.project_members` | `tenant_isolation_project_members` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 152 | `rs.project_milestones` | `tenant_isolation_project_milestones` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 153 | `rs.project_phases` | `tenant_isolation_project_phases` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 154 | `rs.projects` | `tenant_isolation_projects` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 155 | `rs.rs_experiments` | `tenant_isolation_rs_experiments` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 156 | `rs.rs_formulas` | `tenant_isolation_rs_formulas` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 157 | `rs.rs_projects` | `tenant_isolation_rs_projects` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 158 | `tms.carriers` | `tenant_isolation_carriers` | `rls_tenant_isolation` | 等价（严格 B） | 无 |
| 159 | `tms.drivers` | `tenant_isolation_drivers` | `rls_tenant_isolation` | 等价（严格 B） | 无 |

## 3. Merge：两条遗留策略合并为一条（8 张）

| # | 表 | 现名（删除） | 目标名（新建） | 表达式等价 | 代码依赖策略名 |
|---:|---|---|---|---|---|
| 1 | `core.ai_conversations` | `tenant_isolation_ai_conversations` + `ai_conversations_tenant_isolation` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 2 | `master_data.mdm_ai_models` | `tenant_isolation_policy` + `tenant_isolation_mdm_ai_models` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 3 | `master_data.mdm_ai_suggestions` | `tenant_isolation_policy` + `tenant_isolation_mdm_ai_suggestions` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 4 | `master_data.mdm_classification_models` | `tenant_isolation_policy` + `tenant_isolation_mdm_classification_models` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 5 | `master_data.mdm_classification_results` | `tenant_isolation_policy` + `tenant_isolation_mdm_classification_results` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 6 | `master_data.mdm_classifier_rules` | `tenant_isolation_policy` + `tenant_isolation_mdm_classifier_rules` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 7 | `master_data.mdm_match_results` | `tenant_isolation_policy` + `tenant_isolation_mdm_match_results` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |
| 8 | `master_data.mdm_match_rules` | `tenant_isolation_policy` + `tenant_isolation_mdm_match_rules` | `rls_tenant_isolation` | 等价（合并后为严格 B） | 无 |

## 4. 语义不同 · 不归一同名（单独列）

> 2026-11-19 实测复核：本节判断逐条以 `database/rls_policy_expected.json`（生产只读口径，`pg_get_expr` 实测）重新核对，不沿用原稿转述。更正项见 §4.0。

### 4.0 实测更正：8 张 erp 合并报表表是等价改名，不是语义不同

`erp.company_relations`、`erp.consolidation_report_lines`、`erp.consolidation_reports`、`erp.consolidation_scope_companies`、`erp.consolidation_scopes`、`erp.elimination_candidates`、`erp.elimination_rules`、`erp.internal_transactions`：

- 实测各只有 1 条策略，名 `tenant_isolation_<table>`，`cmd=ALL` / `PERMISSIVE` / `roles=PUBLIC`，`polqual` 与 `polwithcheck` **逐字等于**严格 B（`COALESCE(current_setting('app.rls_system',true),'off')='on' OR tenant_id = ...`）。
- 原稿依据「`erp.group_tenant_of`」判其语义不同**不成立**：该函数只出现在合并报表模块的业务 INSERT 列值里（`svc/erp/src/modules/consolidation/{scopes,scope_companies,company_relations,elimination_rules,elimination_flow,internal_transactions}.rs`）及其函数定义中，**全库策略表达式命中 0 次**。
- 处置更正：按纯策略名漂移机械归一 → `20261119210000_rls_normalize_erp_consolidation_policy_rename.sql`（仅 `ALTER POLICY ... RENAME TO rls_tenant_isolation`，表达式不动），回滚为成对改名。快照实测 798 表 / 810 策略，差异仅这 8 条策略名。

### 4.1 维持现状（现存更严、归一会放宽写口径）

| 表 | 现策略 | 与目标（规范 `rls_tenant_isolation` + 严格 B）的差异 | 处置 |
|---|---|---|---|
| `erp.event_idempotency` | `tenant_isolation`（ALL，USING = WITH CHECK = `tenant_id = NULLIF(...)::uuid`） | 目标多一条 `COALESCE(current_setting('app.rls_system',true),'off')='on'` 的全通分支；并入即新增系统通道，**放宽** | 维持原状，不归一、不写迁移 |
| `public.core_login_logs` | `rls_system_only`（ALL，system-only）+ `rls_tenant_read`（SELECT，system OR tenant） | 合并成单条 ALL 会把写权限从 system-only 放开到「租户可写」，**放宽写口径** | 维持原状；`20261119141000` 守卫钉住租户策略必须为 SELECT |
| `public.core_refresh_tokens` | `rls_system_only`（ALL） | 同上：并入 canonical 后租户可写，**放宽** | 维持原状，不归一 |
| `public.core_sessions` | `rls_system_only`（ALL） | 同上：并入 canonical 后租户可写，**放宽** | 维持原状，不归一 |

### 4.2 只记录、不处理

| 表 / 集合 | 现策略 | 说明 |
|---|---|---|
| `bi.audit_logs` | `bi_allow_all_audit_logs`（ALL `USING(true)`） | 现存更松、目标更严；已从 `20261119110000` 移出（schema-defense 会重建，见 `migration-exemptions.json` B20261119-batch2-bi-audit-logs-keep）；定性需业务确认，不归一 |
| `erp.core_erp_materials` | `erp_allow_all_core_erp_materials`（ALL `USING(true)`） | 同上，现存更松；收紧会改变可见行，需业务定性 |
| `gis.track_positions` | `gis_allow_all_track_positions`（ALL `USING(true)`），且 `rls_enabled=false` / `force_rls=false` | 同上，连同 RLS 均未启用；收紧属另一议题 |
| `iam.roles` | `rls_global_read`（SELECT `USING(true)`）+ `rls_system_write`（ALL system-only） | 归一会同时丢全局读并放开租户写；如需收紧须单独业务定性 |
| 9 张平台/全局双策略表 | `rls_tenant_isolation` + `rls_platform_read` / `rls_global_read` | 已具备规范名，无漂移可归；两条策略语义不同，删任一都会改变可见行（清单见下） |

另有 9 张「平台可见 vs 本租户可见」双策略表退出批 1（`rls_platform_read` / `rls_global_read`）：
`core.core_plugins`、`erp.holidays`、`finance.core_finance_currencies`、`finance.core_finance_report_line_map`、`pm.project_type_configs`、`portal.portal_quick_actions`、`public.core_roles`、`public.core_menu_groups`、`public.core_menus`。两条策略语义不同，删任一条都会改变可见行。

### 4.3 单列待办（本批不动）

- `finance.finance_u8_import_records`：存在两条**定义逐字相同**的策略（`rls_tenant_isolation` 与 `tenant_isolation_finance_u8_import_records`，均为 ALL / PERMISSIVE / PUBLIC、同表达式）。系 `20261119190000` 为对齐 dev 刻意保留；去重在「删一条 PERMISSIVE 同义策略」意义上等价，但不在漂移清单范围，登记为单列小改，独立迁移处理。

- 37 张 `*_allow_all_*`（`USING(true)`）：另立定性（见 `rls-using-true-triage-2026-11-19.md`），不并入本清单。

## 5. 代码依赖策略名核查

### 5.1 直接运行期 DDL（命中但不在目标表）

- [event_handlers/mod.rs](file:///Users/xingzhai/TOPEMS/svc/crm/src/event_handlers/mod.rs#L973)：`crm.billing_records` 重建 `rls_tenant_isolation`
- [analytics.rs](file:///Users/xingzhai/TOPEMS/svc/crm/src/modules/analytics.rs#L984)：`crm.billing_records` 同上

两处使用 `rls_tenant_isolation` 规范名，与本清单一命名口径一致，不冲突；`crm.billing_records` 不在 238 张目标表内。

### 5.2 通用策略名构造器（潜在依赖，当前不命中目标表）

[rls.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/rls.rs#L69) 在 `enable_tenant_rls()` 内按 `format!("tenant_isolation_{}", table)` 生成遗留名，并由 `runtime` 的 `CREATE POLICY` 创建。调用链：

1. [schema.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/schema.rs#L586) `harden_new_tenant_tables()`：**仅**对「本次自愈新增 `tenant_id` 且表为空」的表调用。238 张目标表均已存在 `tenant_id`，不会被再次处理。
2. [rls.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/rls.rs#L151) `RlsMiddleware::enable_rls_on_tables()`：全仓无 `RlsMiddleware::new` 调用方（定义处 `#[allow(dead_code)]`），当前不生效。

结论：**无运行期代码会在归一后重建目标表的 `tenant_isolation_<table>`**。残留风险是未来若启用 `RlsMiddleware` 或自愈逻辑改口径，会把遗留名重新造出来；建议在启用该中间件时把策略名改为 `rls_tenant_isolation` 并复用严格 B 谓词。

### 5.3 注释/测试命中（非运行期依赖）

- `svc/master-data/src/modules/supplier_master.rs` 文档注释提到 `tenant_isolation_mdm_suppliers`。
- `svc/unified-core/tests/documents_e2e.rs`、`src/modules/doc/services/document.rs` 针对 `public.core_doc_documents` 的注释/测试，非目标表。


