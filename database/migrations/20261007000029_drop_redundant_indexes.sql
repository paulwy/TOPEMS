-- ============================================================================
-- 20261007000029 — DB-02 修复：清理重叠/重复索引（180 个，幂等）
-- ============================================================================
-- 来源：artifacts/audit/TOPEMS审计报告.md DB-02（175 组 / 180 个冗余）
-- 复现口径：同表同有序键列的纯 btree 索引组（indpred/indexprs IS NULL, valid, ready），
-- 每组保留 1 个最具区分度索引，其余 180 个删除。5432 复现值=175 组/180 冗余，与审计一致。
-- 保留优先级：PK > 未带 _key1 的唯一约束 > 带 _key1 的唯一约束 > 独立唯一索引 > 非唯一；
-- 同级再按『非 idx_ 命名优先、短名优先』选幸存者。
-- 拆分：176 个独立索引用 DROP INDEX IF EXISTS；4 个 _key1 重复唯一约束用
-- ALTER TABLE ... DROP CONSTRAINT IF EXISTS（其底层索引随约束一并删除；已核查无任何
-- 外键 confkey 指向这 4 个约束，同列的原始 *_key 约束继续保证唯一性）。
-- 本文件仅为草稿，不在本阶段应用。
-- ============================================================================

-- ---- A. 4 个 _key1 重复唯一约束（DROP CONSTRAINT，索引随约束删除）----
ALTER TABLE "public"."core_tenant_users" DROP CONSTRAINT IF EXISTS "core_tenant_users_tenant_id_email_key1";  -- 同列已有 core_tenant_users_tenant_id_email_key 生效
ALTER TABLE "public"."core_tenant_users" DROP CONSTRAINT IF EXISTS "core_tenant_users_tenant_id_user_id_key1";  -- 同列已有 core_tenant_users_tenant_id_user_id_key 生效
ALTER TABLE "public"."core_users" DROP CONSTRAINT IF EXISTS "core_users_email_key1";  -- 同列已有 core_users_email_key 生效
ALTER TABLE "public"."core_users" DROP CONSTRAINT IF EXISTS "core_users_username_key1";  -- 同列已有 core_users_username_key 生效

-- ---- B. 176 个重复独立索引（DROP INDEX IF EXISTS）----
DROP INDEX IF EXISTS "core"."idx_core_plugin_navigation_code";  -- 重复: core_plugin_navigation(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_core_plugins_code";  -- 重复: core_plugins(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_knowledge_chunks_doc";  -- 重复: knowledge_chunks(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_knowledge_chunks_document_id";  -- 重复: knowledge_chunks(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_knowledge_chunks_kb_id";  -- 重复: knowledge_chunks(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_knowledge_documents_kb";  -- 重复: knowledge_documents(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "core"."idx_knowledge_documents_kb_id";  -- 重复: knowledge_documents(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "crm"."idx_crm_contacts_customer";  -- 重复: contacts(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "crm"."idx_crm_customer_tags_tag";  -- 重复: customer_tags(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "crm"."idx_crm_interactions_customer";  -- 重复: interactions(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "crm"."idx_crm_opportunities_customer";  -- 重复: opportunities(6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_accidents_no";  -- 重复: qa_ehs_accidents(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_compliance_evals_no";  -- 重复: qa_ehs_compliance_evaluations(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_detection_records_no";  -- 重复: qa_ehs_detection_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_discharge_permits_no";  -- 重复: qa_ehs_discharge_permits(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_disease_cases_no";  -- 重复: qa_ehs_disease_cases(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_drill_plans_no";  -- 重复: qa_ehs_drill_plans(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_drill_records_no";  -- 重复: qa_ehs_drill_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_emergency_plans_no";  -- 重复: qa_ehs_emergency_plans(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_env_incidents_no";  -- 重复: qa_ehs_environment_incidents(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_env_monitor_no";  -- 重复: qa_ehs_env_monitor_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_env_regulations_no";  -- 重复: qa_ehs_environmental_regulations(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_health_exam_plans_no";  -- 重复: qa_ehs_health_exam_plans(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_health_exam_records_no";  -- 重复: qa_ehs_health_exam_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_plans_no";  -- 重复: qa_ehs_inspection_plans(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_records_no";  -- 重复: qa_ehs_inspection_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_risks_no";  -- 重复: qa_ehs_risks(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_stock_records_no";  -- 重复: qa_ehs_stock_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "ehs"."idx_qa_ehs_sync_no";  -- 重复: qa_ehs_sync_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "erp"."idx_vehicles_plate_number";  -- 重复: vehicles(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_accounts_parent_id";  -- 重复: core_finance_accounts(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_approval_workflows_tenant_id";  -- 重复: core_finance_approval_workflows(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_aux_accounts_parent_id";  -- 重复: core_finance_aux_accounts(6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_aux_accounts_tenant_id";  -- 重复: core_finance_aux_accounts(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_aux_balances_account_id";  -- 重复: core_finance_aux_balances(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_aux_balances_tenant_id";  -- 重复: core_finance_aux_balances(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_ledger_account_id";  -- 重复: core_finance_ledger(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_ledger_tenant_id";  -- 重复: core_finance_ledger(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_periods_tenant_id";  -- 重复: core_finance_periods(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_reconciliation_items_matched_item_id";  -- 重复: core_finance_reconciliation_items(13)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_reconciliation_items_session_id";  -- 重复: core_finance_reconciliation_items(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_reconciliation_items_tenant_id";  -- 重复: core_finance_reconciliation_items(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_reconciliation_sessions_tenant_id";  -- 重复: core_finance_reconciliation_sessions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_voucher_lines_account_id";  -- 重复: core_finance_voucher_lines(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_voucher_lines_voucher_id";  -- 重复: core_finance_voucher_lines(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_core_finance_vouchers_tenant_id";  -- 重复: core_finance_vouchers(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_reconcile_items_order_id";  -- 重复: reconcile_items(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "finance"."idx_sales_invoices_invoice_no";  -- 重复: sales_invoices(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "flow"."idx_core_tenant_usage_period";  -- 重复: core_tenant_usage(2,6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "flow"."idx_core_tenants_code";  -- 重复: core_tenants(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "flow"."idx_core_workflows_status";  -- 重复: core_workflows(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_plugins_code";  -- 重复: core_plugins(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_roles_name";  -- 重复: core_roles(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_subscriptions_tenant";  -- 重复: core_subscriptions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_tenant_usage_period";  -- 重复: core_tenant_usage(2,6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_tenants_code";  -- 重复: core_tenants(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_users_email";  -- 重复: core_users(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_core_users_username";  -- 重复: core_users(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_positions_code";  -- 重复: positions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_schema_registry_name";  -- 重复: schema_registry(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_users_email";  -- 重复: users(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "iam"."idx_users_username";  -- 重复: users(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "integration"."idx_conversion_executions_rule_id";  -- 重复: conversion_executions(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_calibration_records_instrument_id";  -- 重复: qa_lab_calibration_records(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_inspection_reports_no";  -- 重复: qa_lab_inspection_reports(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_inspection_reports_sample_id";  -- 重复: qa_lab_inspection_reports(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_instruments_no";  -- 重复: qa_lab_instruments(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_processes_no";  -- 重复: qa_lab_processes(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_reagent_alerts_reagent_id";  -- 重复: qa_lab_reagent_alerts(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_reagent_history_reagent_id";  -- 重复: qa_lab_reagent_history(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_reagents_no";  -- 重复: qa_lab_reagents(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_records_no";  -- 重复: qa_lab_records(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_records_task_id";  -- 重复: qa_lab_records(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lab_sample_lifecycle_sample_id";  -- 重复: qa_lab_sample_lifecycle(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_collection_tasks_instrument_id";  -- 重复: qa_lims_collection_tasks(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_collection_tasks_no";  -- 重复: qa_lims_collection_tasks(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_instrument_data_instrument_id";  -- 重复: qa_lims_instrument_data(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_instrument_data_no";  -- 重复: qa_lims_instrument_data(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_method_categories_code";  -- 重复: qa_lims_method_categories(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_method_validations_method_id";  -- 重复: qa_lims_method_validations(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_method_versions_method_id";  -- 重复: qa_lims_method_versions(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_parse_rules_no";  -- 重复: qa_lims_parse_rules(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_corrective_actions_plan_id";  -- 重复: qa_lims_pt_corrective_actions(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_evaluations_plan_id";  -- 重复: qa_lims_pt_evaluations(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_plans_no";  -- 重复: qa_lims_pt_plans(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_results_plan_id";  -- 重复: qa_lims_pt_results(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_results_sample_id";  -- 重复: qa_lims_pt_results(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_pt_samples_plan_id";  -- 重复: qa_lims_pt_samples(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_rfid_tags_tag";  -- 重复: qa_lims_rfid_tags(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_sample_barcodes_no";  -- 重复: qa_lims_sample_barcodes(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_sample_barcodes_sample_id";  -- 重复: qa_lims_sample_barcodes(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_sync_no";  -- 重复: qa_lims_sync_records(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_test_methods_category_id";  -- 重复: qa_lims_test_methods(5)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_test_methods_code";  -- 重复: qa_lims_test_methods(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_uncertainty_components_project_id";  -- 重复: qa_lims_uncertainty_components(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_uncertainty_components_source_id";  -- 重复: qa_lims_uncertainty_components(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_uncertainty_projects_no";  -- 重复: qa_lims_uncertainty_projects(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "lims"."idx_qa_lims_uncertainty_sources_project_id";  -- 重复: qa_lims_uncertainty_sources(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "master_data"."idx_schema_registry_name";  -- 重复: schema_registry(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_batch_records_batch_no";  -- 重复: batch_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_plugins_code";  -- 重复: core_plugins(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_roles_name";  -- 重复: core_roles(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_subscriptions_tenant";  -- 重复: core_subscriptions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_tenant_usage_period";  -- 重复: core_tenant_usage(2,6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_tenants_code";  -- 重复: core_tenants(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_users_email";  -- 重复: core_users(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_core_users_username";  -- 重复: core_users(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_equipment_no";  -- 重复: equipment(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_material_boms_bom_no";  -- 重复: material_boms(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_material_issues_issue_no";  -- 重复: material_issues(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_material_requirements_mrp_no";  -- 重复: material_requirements(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_material_returns_return_no";  -- 重复: material_returns(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_production_schedules_schedule_no";  -- 重复: production_schedules(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_quality_records_record_no";  -- 重复: quality_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_schema_registry_name";  -- 重复: schema_registry(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_teams_team_code";  -- 重复: teams(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_wips_wip_no";  -- 重复: wips(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "mes"."idx_work_stations_station_no";  -- 重复: work_stations(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_bom_items_tenant_id";  -- 重复: pdm_bom_items(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_boms_tenant_id";  -- 重复: pdm_boms(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_change_notices_tenant_id";  -- 重复: pdm_change_notices(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_configurations_tenant_id";  -- 重复: pdm_configurations(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_documents_tenant_id";  -- 重复: pdm_documents(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_materials_tenant_id";  -- 重复: pdm_materials(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_production_batches_tenant_id";  -- 重复: pdm_production_batches(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_production_formulas_tenant_id";  -- 重复: pdm_production_formulas(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_production_processes_tenant_id";  -- 重复: pdm_production_processes(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_production_steps_tenant_id";  -- 重复: pdm_production_steps(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_products_tenant_id";  -- 重复: pdm_products(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_versions_tenant_id";  -- 重复: pdm_versions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_workflow_instances_tenant_id";  -- 重复: pdm_workflow_instances(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "pdm"."idx_pdm_workflows_tenant_id";  -- 重复: pdm_workflows(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_permissions_code";  -- 重复: core_permissions(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_roles_name";  -- 重复: core_roles(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_roles_tenant_id";  -- 重复: core_roles(4)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_tenant_usage_period";  -- 重复: core_tenant_usage(2,6)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_tenants_code";  -- 重复: core_tenants(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_users_email";  -- 重复: core_users(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_users_username";  -- 重复: core_users(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_workflow_instances_workflow_id";  -- 重复: core_workflow_instances(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_core_workflow_tasks_instance_id";  -- 重复: core_workflow_tasks(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_mobile_users_username";  -- 重复: mobile_users(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_offline_sync_records_user_id";  -- 重复: offline_sync_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_push_devices_token";  -- 重复: push_devices(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_push_templates_name";  -- 重复: push_templates(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_inspection_reports_no";  -- 重复: qa_lab_inspection_reports(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_instruments_no";  -- 重复: qa_lab_instruments(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_processes_no";  -- 重复: qa_lab_processes(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_reagents_no";  -- 重复: qa_lab_reagents(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_records_no";  -- 重复: qa_lab_records(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_samples_no";  -- 重复: qa_lab_samples(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_samples_sample_no";  -- 重复: qa_lab_samples(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lab_tasks_no";  -- 重复: qa_lab_tasks(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_collection_tasks_no";  -- 重复: qa_lims_collection_tasks(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_instrument_data_no";  -- 重复: qa_lims_instrument_data(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_method_categories_code";  -- 重复: qa_lims_method_categories(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_parse_rules_no";  -- 重复: qa_lims_parse_rules(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_pt_plans_no";  -- 重复: qa_lims_pt_plans(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_rfid_tags_tag";  -- 重复: qa_lims_rfid_tags(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_sample_barcodes_no";  -- 重复: qa_lims_sample_barcodes(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_sync_no";  -- 重复: qa_lims_sync_records(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_test_methods_code";  -- 重复: qa_lims_test_methods(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_qa_lims_uncertainty_projects_no";  -- 重复: qa_lims_uncertainty_projects(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_refresh_tokens_token";  -- 重复: refresh_tokens(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_schema_registry_name";  -- 重复: schema_registry(3)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_sync_policies_user_id";  -- 重复: sync_policies(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "public"."idx_user_settings_user_id";  -- 重复: user_settings(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_apqp_projects_no";  -- 重复: qa_apqp_projects(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_eightd_reports_no";  -- 重复: qa_eightd_reports(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_fmea_analyses_no";  -- 重复: qa_fmea_analyses(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_inspections_no";  -- 重复: qa_quality_inspections(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_issues_no";  -- 重复: qa_quality_issues(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_qms_sync_no";  -- 重复: qa_qms_sync_records(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_quality_costs_no";  -- 重复: qa_quality_costs(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_spc_charts_no";  -- 重复: qa_spc_charts(2)，组内已保留 1 个等价索引
DROP INDEX IF EXISTS "qms"."idx_qa_standards_code";  -- 重复: qa_standards(2)，组内已保留 1 个等价索引

