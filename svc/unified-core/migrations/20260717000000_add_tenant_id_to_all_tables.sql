-- ============================================================================
-- Migration: Add tenant_id column and RLS policies to all business tables
-- Date: 2026-07-17
-- Description: Add tenant_id UUID column, create indexes, and enable RLS
--              with tenant isolation policies for multi-tenancy support.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SKIPPED TABLES (no tenant_id needed)
-- ============================================================================
--   SKIP: core.core_plugin_categories (core_plugin_* in core schema)
--   SKIP: core.core_plugin_instances (core_plugin_* in core schema)
--   SKIP: core.core_plugin_permissions (core_plugin_* in core schema)
--   SKIP: core.core_plugin_reviews (core_plugin_* in core schema)
--   SKIP: core.core_plugin_versions (core_plugin_* in core schema)
--   SKIP: public._sqlx_migrations (user preferences / system table)
--   SKIP: public.configurations (user preferences / system table)
--   SKIP: public.shortcuts (user preferences / system table)
--   SKIP: public.spatial_ref_sys (user preferences / system table)
--   SKIP: public.user_settings (user preferences / system table)
--   SKIP: shared.audit_logs (shared schema)
--   SKIP: shared.companies (shared schema)
--   SKIP: shared.departments (shared schema)
--   SKIP: shared.employees (shared schema)
--   SKIP: shared.id_records (shared schema)
--   SKIP: shared.positions (shared schema)
--   SKIP: shared.system_params (shared schema)
--   SKIP: shared.user_employee_map (shared schema)
--   SKIP: shared.users (shared schema)

-- ============================================================================
-- PHASE 1: Add tenant_id column and create indexes
-- ============================================================================

-- -----------------------------------------------------------------------
-- Schema: ai (4 tables)
-- -----------------------------------------------------------------------

-- ai.analysis_results
ALTER TABLE ai.analysis_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_tenant_id ON ai.analysis_results (tenant_id);

-- ai.document_chunks
ALTER TABLE ai.document_chunks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_tenant_id ON ai.document_chunks (tenant_id);

-- ai.documents
ALTER TABLE ai.documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ai_documents_tenant_id ON ai.documents (tenant_id);

-- ai.qa_history
ALTER TABLE ai.qa_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ai_qa_history_tenant_id ON ai.qa_history (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: bi (16 tables)
-- -----------------------------------------------------------------------

-- bi.analysis_history
ALTER TABLE bi.analysis_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_analysis_history_tenant_id ON bi.analysis_history (tenant_id);

-- bi.analysis_queries
ALTER TABLE bi.analysis_queries ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_analysis_queries_tenant_id ON bi.analysis_queries (tenant_id);

-- bi.analysis_results
ALTER TABLE bi.analysis_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_analysis_results_tenant_id ON bi.analysis_results (tenant_id);

-- bi.audit_logs
ALTER TABLE bi.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_audit_logs_tenant_id ON bi.audit_logs (tenant_id);

-- bi.dashboard_widgets
ALTER TABLE bi.dashboard_widgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_dashboard_widgets_tenant_id ON bi.dashboard_widgets (tenant_id);

-- bi.dashboards
ALTER TABLE bi.dashboards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_dashboards_tenant_id ON bi.dashboards (tenant_id);

-- bi.data_sources
ALTER TABLE bi.data_sources ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_data_sources_tenant_id ON bi.data_sources (tenant_id);

-- bi.datasource_fields
ALTER TABLE bi.datasource_fields ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_datasource_fields_tenant_id ON bi.datasource_fields (tenant_id);

-- bi.datasource_tables
ALTER TABLE bi.datasource_tables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_datasource_tables_tenant_id ON bi.datasource_tables (tenant_id);

-- bi.report_data
ALTER TABLE bi.report_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_report_data_tenant_id ON bi.report_data (tenant_id);

-- bi.report_schedules
ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_report_schedules_tenant_id ON bi.report_schedules (tenant_id);

-- bi.report_templates
ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_report_templates_tenant_id ON bi.report_templates (tenant_id);

-- bi.reports
ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_reports_tenant_id ON bi.reports (tenant_id);

-- bi.saved_analysis_results
ALTER TABLE bi.saved_analysis_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_saved_analysis_results_tenant_id ON bi.saved_analysis_results (tenant_id);

-- bi.visualization_data
ALTER TABLE bi.visualization_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_visualization_data_tenant_id ON bi.visualization_data (tenant_id);

-- bi.visualizations
ALTER TABLE bi.visualizations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_bi_visualizations_tenant_id ON bi.visualizations (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: core (1 tables)
-- -----------------------------------------------------------------------

-- core.core_plugins
ALTER TABLE core.core_plugins ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_core_core_plugins_tenant_id ON core.core_plugins (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: crm (8 tables)
-- -----------------------------------------------------------------------

-- crm.audit_logs
ALTER TABLE crm.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_tenant_id ON crm.audit_logs (tenant_id);

-- crm.contacts
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_id ON crm.contacts (tenant_id);

-- crm.customer_tags
ALTER TABLE crm.customer_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_customer_tags_tenant_id ON crm.customer_tags (tenant_id);

-- crm.customers
ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_customers_tenant_id ON crm.customers (tenant_id);

-- crm.dashboard_metrics
ALTER TABLE crm.dashboard_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_dashboard_metrics_tenant_id ON crm.dashboard_metrics (tenant_id);

-- crm.interactions
ALTER TABLE crm.interactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_interactions_tenant_id ON crm.interactions (tenant_id);

-- crm.opportunities
ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant_id ON crm.opportunities (tenant_id);

-- crm.tags
ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_crm_tags_tenant_id ON crm.tags (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: doc_service (20 tables)
-- -----------------------------------------------------------------------

-- doc_service.archive_borrows
ALTER TABLE doc_service.archive_borrows ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_archive_borrows_tenant_id ON doc_service.archive_borrows (tenant_id);

-- doc_service.archive_categories
ALTER TABLE doc_service.archive_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_archive_categories_tenant_id ON doc_service.archive_categories (tenant_id);

-- doc_service.archive_destructions
ALTER TABLE doc_service.archive_destructions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_archive_destructions_tenant_id ON doc_service.archive_destructions (tenant_id);

-- doc_service.archive_metadata
ALTER TABLE doc_service.archive_metadata ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_archive_metadata_tenant_id ON doc_service.archive_metadata (tenant_id);

-- doc_service.archives
ALTER TABLE doc_service.archives ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_archives_tenant_id ON doc_service.archives (tenant_id);

-- doc_service.faqs
ALTER TABLE doc_service.faqs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_faqs_tenant_id ON doc_service.faqs (tenant_id);

-- doc_service.file_permissions
ALTER TABLE doc_service.file_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_file_permissions_tenant_id ON doc_service.file_permissions (tenant_id);

-- doc_service.file_versions
ALTER TABLE doc_service.file_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_file_versions_tenant_id ON doc_service.file_versions (tenant_id);

-- doc_service.files
ALTER TABLE doc_service.files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_files_tenant_id ON doc_service.files (tenant_id);

-- doc_service.folder_permissions
ALTER TABLE doc_service.folder_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_folder_permissions_tenant_id ON doc_service.folder_permissions (tenant_id);

-- doc_service.folders
ALTER TABLE doc_service.folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_folders_tenant_id ON doc_service.folders (tenant_id);

-- doc_service.help_articles
ALTER TABLE doc_service.help_articles ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_help_articles_tenant_id ON doc_service.help_articles (tenant_id);

-- doc_service.help_categories
ALTER TABLE doc_service.help_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_help_categories_tenant_id ON doc_service.help_categories (tenant_id);

-- doc_service.template_audit_log
ALTER TABLE doc_service.template_audit_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_template_audit_log_tenant_id ON doc_service.template_audit_log (tenant_id);

-- doc_service.template_categories
ALTER TABLE doc_service.template_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_template_categories_tenant_id ON doc_service.template_categories (tenant_id);

-- doc_service.template_instances
ALTER TABLE doc_service.template_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_template_instances_tenant_id ON doc_service.template_instances (tenant_id);

-- doc_service.template_variables
ALTER TABLE doc_service.template_variables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_template_variables_tenant_id ON doc_service.template_variables (tenant_id);

-- doc_service.template_versions
ALTER TABLE doc_service.template_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_template_versions_tenant_id ON doc_service.template_versions (tenant_id);

-- doc_service.templates
ALTER TABLE doc_service.templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_templates_tenant_id ON doc_service.templates (tenant_id);

-- doc_service.video_tutorials
ALTER TABLE doc_service.video_tutorials ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_doc_service_video_tutorials_tenant_id ON doc_service.video_tutorials (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: ehs (16 tables)
-- -----------------------------------------------------------------------

-- ehs.audit_logs
ALTER TABLE ehs.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_audit_logs_tenant_id ON ehs.audit_logs (tenant_id);

-- ehs.drill_records
ALTER TABLE ehs.drill_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_drill_records_tenant_id ON ehs.drill_records (tenant_id);

-- ehs.emergency_plans
ALTER TABLE ehs.emergency_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_emergency_plans_tenant_id ON ehs.emergency_plans (tenant_id);

-- ehs.environmental_alerts
ALTER TABLE ehs.environmental_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_environmental_alerts_tenant_id ON ehs.environmental_alerts (tenant_id);

-- ehs.environmental_data
ALTER TABLE ehs.environmental_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_environmental_data_tenant_id ON ehs.environmental_data (tenant_id);

-- ehs.health_checkups
ALTER TABLE ehs.health_checkups ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_health_checkups_tenant_id ON ehs.health_checkups (tenant_id);

-- ehs.health_records
ALTER TABLE ehs.health_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_health_records_tenant_id ON ehs.health_records (tenant_id);

-- ehs.monitoring_points
ALTER TABLE ehs.monitoring_points ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_monitoring_points_tenant_id ON ehs.monitoring_points (tenant_id);

-- ehs.risk_assessments
ALTER TABLE ehs.risk_assessments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_risk_assessments_tenant_id ON ehs.risk_assessments (tenant_id);

-- ehs.risk_controls
ALTER TABLE ehs.risk_controls ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_risk_controls_tenant_id ON ehs.risk_controls (tenant_id);

-- ehs.safety_checks
ALTER TABLE ehs.safety_checks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_safety_checks_tenant_id ON ehs.safety_checks (tenant_id);

-- ehs.safety_hazards
ALTER TABLE ehs.safety_hazards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_safety_hazards_tenant_id ON ehs.safety_hazards (tenant_id);

-- ehs.safety_incidents
ALTER TABLE ehs.safety_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_safety_incidents_tenant_id ON ehs.safety_incidents (tenant_id);

-- ehs.training_programs
ALTER TABLE ehs.training_programs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_training_programs_tenant_id ON ehs.training_programs (tenant_id);

-- ehs.training_records
ALTER TABLE ehs.training_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_training_records_tenant_id ON ehs.training_records (tenant_id);

-- ehs.vaccination_records
ALTER TABLE ehs.vaccination_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_vaccination_records_tenant_id ON ehs.vaccination_records (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: erp (28 tables)
-- -----------------------------------------------------------------------

-- erp.accounting_subjects
ALTER TABLE erp.accounting_subjects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_accounting_subjects_tenant_id ON erp.accounting_subjects (tenant_id);

-- erp.asset_depreciation_records
ALTER TABLE erp.asset_depreciation_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_asset_depreciation_records_tenant_id ON erp.asset_depreciation_records (tenant_id);

-- erp.assets
ALTER TABLE erp.assets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_assets_tenant_id ON erp.assets (tenant_id);

-- erp.audit_logs
ALTER TABLE erp.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_tenant_id ON erp.audit_logs (tenant_id);

-- erp.bank_accounts
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_bank_accounts_tenant_id ON erp.bank_accounts (tenant_id);

-- erp.bank_transactions
ALTER TABLE erp.bank_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_bank_transactions_tenant_id ON erp.bank_transactions (tenant_id);

-- erp.budgets
ALTER TABLE erp.budgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_budgets_tenant_id ON erp.budgets (tenant_id);

-- erp.company_relations
ALTER TABLE erp.company_relations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_company_relations_tenant_id ON erp.company_relations (tenant_id);

-- erp.consolidation_report_lines
ALTER TABLE erp.consolidation_report_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_consolidation_report_lines_tenant_id ON erp.consolidation_report_lines (tenant_id);

-- erp.consolidation_reports
ALTER TABLE erp.consolidation_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_consolidation_reports_tenant_id ON erp.consolidation_reports (tenant_id);

-- erp.consolidation_scope_companies
ALTER TABLE erp.consolidation_scope_companies ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_consolidation_scope_companies_tenant_id ON erp.consolidation_scope_companies (tenant_id);

-- erp.consolidation_scopes
ALTER TABLE erp.consolidation_scopes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_consolidation_scopes_tenant_id ON erp.consolidation_scopes (tenant_id);

-- erp.customers
ALTER TABLE erp.customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_customers_tenant_id ON erp.customers (tenant_id);

-- erp.db_changes
ALTER TABLE erp.db_changes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_db_changes_tenant_id ON erp.db_changes (tenant_id);

-- erp.dict_items
ALTER TABLE erp.dict_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_dict_items_tenant_id ON erp.dict_items (tenant_id);

-- erp.dict_types
ALTER TABLE erp.dict_types ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_dict_types_tenant_id ON erp.dict_types (tenant_id);

-- erp.elimination_rules
ALTER TABLE erp.elimination_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_elimination_rules_tenant_id ON erp.elimination_rules (tenant_id);

-- erp.expenses
ALTER TABLE erp.expenses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_expenses_tenant_id ON erp.expenses (tenant_id);

-- erp.financial_vouchers
ALTER TABLE erp.financial_vouchers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_financial_vouchers_tenant_id ON erp.financial_vouchers (tenant_id);

-- erp.fixed_assets
ALTER TABLE erp.fixed_assets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_fixed_assets_tenant_id ON erp.fixed_assets (tenant_id);

-- erp.internal_transactions
ALTER TABLE erp.internal_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_internal_transactions_tenant_id ON erp.internal_transactions (tenant_id);

-- erp.inventory
ALTER TABLE erp.inventory ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_inventory_tenant_id ON erp.inventory (tenant_id);

-- erp.materials
ALTER TABLE erp.materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_materials_tenant_id ON erp.materials (tenant_id);

-- erp.opening_balances
ALTER TABLE erp.opening_balances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_opening_balances_tenant_id ON erp.opening_balances (tenant_id);

-- erp.payables
ALTER TABLE erp.payables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_payables_tenant_id ON erp.payables (tenant_id);

-- erp.receivables
ALTER TABLE erp.receivables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_receivables_tenant_id ON erp.receivables (tenant_id);

-- erp.sales_orders
ALTER TABLE erp.sales_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_sales_orders_tenant_id ON erp.sales_orders (tenant_id);

-- erp.suppliers
ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_erp_suppliers_tenant_id ON erp.suppliers (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: flow (10 tables)
-- -----------------------------------------------------------------------

-- flow.approval_records
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_approval_records_tenant_id ON flow.approval_records (tenant_id);

-- flow.approval_withdrawals
ALTER TABLE flow.approval_withdrawals ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_approval_withdrawals_tenant_id ON flow.approval_withdrawals (tenant_id);

-- flow.approvals
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_approvals_tenant_id ON flow.approvals (tenant_id);

-- flow.audit_logs
ALTER TABLE flow.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_audit_logs_tenant_id ON flow.audit_logs (tenant_id);

-- flow.notifications
ALTER TABLE flow.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_notifications_tenant_id ON flow.notifications (tenant_id);

-- flow.workflow_instance_snapshots
ALTER TABLE flow.workflow_instance_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_workflow_instance_snapshots_tenant_id ON flow.workflow_instance_snapshots (tenant_id);

-- flow.workflow_instances
ALTER TABLE flow.workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_workflow_instances_tenant_id ON flow.workflow_instances (tenant_id);

-- flow.workflow_rollbacks
ALTER TABLE flow.workflow_rollbacks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_workflow_rollbacks_tenant_id ON flow.workflow_rollbacks (tenant_id);

-- flow.workflow_versions
ALTER TABLE flow.workflow_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_workflow_versions_tenant_id ON flow.workflow_versions (tenant_id);

-- flow.workflows
ALTER TABLE flow.workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_flow_workflows_tenant_id ON flow.workflows (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: hrm (2 tables)
-- -----------------------------------------------------------------------

-- hrm.initialization_logs
ALTER TABLE hrm.initialization_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_hrm_initialization_logs_tenant_id ON hrm.initialization_logs (tenant_id);

-- hrm.initialization_status
ALTER TABLE hrm.initialization_status ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_hrm_initialization_status_tenant_id ON hrm.initialization_status (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: iam (42 tables)
-- -----------------------------------------------------------------------

-- iam.audit_logs
ALTER TABLE iam.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_audit_logs_tenant_id ON iam.audit_logs (tenant_id);

-- iam.password_reset_tokens
ALTER TABLE iam.password_reset_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_password_reset_tokens_tenant_id ON iam.password_reset_tokens (tenant_id);

-- iam.permissions
ALTER TABLE iam.permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_permissions_tenant_id ON iam.permissions (tenant_id);

-- iam.qa_lab_calibration_records
ALTER TABLE iam.qa_lab_calibration_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_calibration_records_tenant_id ON iam.qa_lab_calibration_records (tenant_id);

-- iam.qa_lab_inspection_reports
ALTER TABLE iam.qa_lab_inspection_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_inspection_reports_tenant_id ON iam.qa_lab_inspection_reports (tenant_id);

-- iam.qa_lab_instruments
ALTER TABLE iam.qa_lab_instruments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_instruments_tenant_id ON iam.qa_lab_instruments (tenant_id);

-- iam.qa_lab_processes
ALTER TABLE iam.qa_lab_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_processes_tenant_id ON iam.qa_lab_processes (tenant_id);

-- iam.qa_lab_reagent_alerts
ALTER TABLE iam.qa_lab_reagent_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_reagent_alerts_tenant_id ON iam.qa_lab_reagent_alerts (tenant_id);

-- iam.qa_lab_reagent_history
ALTER TABLE iam.qa_lab_reagent_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_reagent_history_tenant_id ON iam.qa_lab_reagent_history (tenant_id);

-- iam.qa_lab_reagents
ALTER TABLE iam.qa_lab_reagents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_reagents_tenant_id ON iam.qa_lab_reagents (tenant_id);

-- iam.qa_lab_records
ALTER TABLE iam.qa_lab_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_records_tenant_id ON iam.qa_lab_records (tenant_id);

-- iam.qa_lab_sample_lifecycle
ALTER TABLE iam.qa_lab_sample_lifecycle ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_sample_lifecycle_tenant_id ON iam.qa_lab_sample_lifecycle (tenant_id);

-- iam.qa_lab_samples
ALTER TABLE iam.qa_lab_samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_samples_tenant_id ON iam.qa_lab_samples (tenant_id);

-- iam.qa_lab_tasks
ALTER TABLE iam.qa_lab_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lab_tasks_tenant_id ON iam.qa_lab_tasks (tenant_id);

-- iam.qa_lims_audit_logs
ALTER TABLE iam.qa_lims_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_audit_logs_tenant_id ON iam.qa_lims_audit_logs (tenant_id);

-- iam.qa_lims_barcode_scan_records
ALTER TABLE iam.qa_lims_barcode_scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_barcode_scan_records_tenant_id ON iam.qa_lims_barcode_scan_records (tenant_id);

-- iam.qa_lims_collection_tasks
ALTER TABLE iam.qa_lims_collection_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_collection_tasks_tenant_id ON iam.qa_lims_collection_tasks (tenant_id);

-- iam.qa_lims_instrument_data
ALTER TABLE iam.qa_lims_instrument_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_instrument_data_tenant_id ON iam.qa_lims_instrument_data (tenant_id);

-- iam.qa_lims_method_categories
ALTER TABLE iam.qa_lims_method_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_method_categories_tenant_id ON iam.qa_lims_method_categories (tenant_id);

-- iam.qa_lims_method_validations
ALTER TABLE iam.qa_lims_method_validations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_method_validations_tenant_id ON iam.qa_lims_method_validations (tenant_id);

-- iam.qa_lims_method_versions
ALTER TABLE iam.qa_lims_method_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_method_versions_tenant_id ON iam.qa_lims_method_versions (tenant_id);

-- iam.qa_lims_parse_rules
ALTER TABLE iam.qa_lims_parse_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_parse_rules_tenant_id ON iam.qa_lims_parse_rules (tenant_id);

-- iam.qa_lims_pt_corrective_actions
ALTER TABLE iam.qa_lims_pt_corrective_actions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_pt_corrective_actions_tenant_id ON iam.qa_lims_pt_corrective_actions (tenant_id);

-- iam.qa_lims_pt_evaluations
ALTER TABLE iam.qa_lims_pt_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_pt_evaluations_tenant_id ON iam.qa_lims_pt_evaluations (tenant_id);

-- iam.qa_lims_pt_plans
ALTER TABLE iam.qa_lims_pt_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_pt_plans_tenant_id ON iam.qa_lims_pt_plans (tenant_id);

-- iam.qa_lims_pt_results
ALTER TABLE iam.qa_lims_pt_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_pt_results_tenant_id ON iam.qa_lims_pt_results (tenant_id);

-- iam.qa_lims_pt_samples
ALTER TABLE iam.qa_lims_pt_samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_pt_samples_tenant_id ON iam.qa_lims_pt_samples (tenant_id);

-- iam.qa_lims_rfid_tags
ALTER TABLE iam.qa_lims_rfid_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_rfid_tags_tenant_id ON iam.qa_lims_rfid_tags (tenant_id);

-- iam.qa_lims_sample_barcodes
ALTER TABLE iam.qa_lims_sample_barcodes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_sample_barcodes_tenant_id ON iam.qa_lims_sample_barcodes (tenant_id);

-- iam.qa_lims_sync_records
ALTER TABLE iam.qa_lims_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_sync_records_tenant_id ON iam.qa_lims_sync_records (tenant_id);

-- iam.qa_lims_test_methods
ALTER TABLE iam.qa_lims_test_methods ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_test_methods_tenant_id ON iam.qa_lims_test_methods (tenant_id);

-- iam.qa_lims_uncertainty_components
ALTER TABLE iam.qa_lims_uncertainty_components ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_uncertainty_components_tenant_id ON iam.qa_lims_uncertainty_components (tenant_id);

-- iam.qa_lims_uncertainty_projects
ALTER TABLE iam.qa_lims_uncertainty_projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_uncertainty_projects_tenant_id ON iam.qa_lims_uncertainty_projects (tenant_id);

-- iam.qa_lims_uncertainty_sources
ALTER TABLE iam.qa_lims_uncertainty_sources ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_qa_lims_uncertainty_sources_tenant_id ON iam.qa_lims_uncertainty_sources (tenant_id);

-- iam.refresh_tokens
ALTER TABLE iam.refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_refresh_tokens_tenant_id ON iam.refresh_tokens (tenant_id);

-- iam.role_permissions
ALTER TABLE iam.role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_role_permissions_tenant_id ON iam.role_permissions (tenant_id);

-- iam.roles
ALTER TABLE iam.roles ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_roles_tenant_id ON iam.roles (tenant_id);

-- iam.sessions
ALTER TABLE iam.sessions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_sessions_tenant_id ON iam.sessions (tenant_id);

-- iam.user_access_logs
ALTER TABLE iam.user_access_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_user_access_logs_tenant_id ON iam.user_access_logs (tenant_id);

-- iam.user_preferences
ALTER TABLE iam.user_preferences ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_user_preferences_tenant_id ON iam.user_preferences (tenant_id);

-- iam.user_roles
ALTER TABLE iam.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_user_roles_tenant_id ON iam.user_roles (tenant_id);

-- iam.users
ALTER TABLE iam.users ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_iam_users_tenant_id ON iam.users (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: im (13 tables)
-- -----------------------------------------------------------------------

-- im.audit_logs
ALTER TABLE im.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_audit_logs_tenant_id ON im.audit_logs (tenant_id);

-- im.chat_room_members
ALTER TABLE im.chat_room_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_chat_room_members_tenant_id ON im.chat_room_members (tenant_id);

-- im.chat_rooms
ALTER TABLE im.chat_rooms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_chat_rooms_tenant_id ON im.chat_rooms (tenant_id);

-- im.contact_group_members
ALTER TABLE im.contact_group_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_contact_group_members_tenant_id ON im.contact_group_members (tenant_id);

-- im.contact_groups
ALTER TABLE im.contact_groups ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_contact_groups_tenant_id ON im.contact_groups (tenant_id);

-- im.contacts
ALTER TABLE im.contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_contacts_tenant_id ON im.contacts (tenant_id);

-- im.file_transfers
ALTER TABLE im.file_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_file_transfers_tenant_id ON im.file_transfers (tenant_id);

-- im.friends
ALTER TABLE im.friends ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_friends_tenant_id ON im.friends (tenant_id);

-- im.message_read_receipts
ALTER TABLE im.message_read_receipts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_message_read_receipts_tenant_id ON im.message_read_receipts (tenant_id);

-- im.messages
ALTER TABLE im.messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_messages_tenant_id ON im.messages (tenant_id);

-- im.notifications
ALTER TABLE im.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_notifications_tenant_id ON im.notifications (tenant_id);

-- im.project_groups
ALTER TABLE im.project_groups ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_project_groups_tenant_id ON im.project_groups (tenant_id);

-- im.user_status
ALTER TABLE im.user_status ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_im_user_status_tenant_id ON im.user_status (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: integration (5 tables)
-- -----------------------------------------------------------------------

-- integration.integration_configs
ALTER TABLE integration.integration_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_integration_integration_configs_tenant_id ON integration.integration_configs (tenant_id);

-- integration.integration_events
ALTER TABLE integration.integration_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_integration_integration_events_tenant_id ON integration.integration_events (tenant_id);

-- integration.lims_qms_sync
ALTER TABLE integration.lims_qms_sync ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_integration_lims_qms_sync_tenant_id ON integration.lims_qms_sync (tenant_id);

-- integration.mes_erp_sync
ALTER TABLE integration.mes_erp_sync ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_integration_mes_erp_sync_tenant_id ON integration.mes_erp_sync (tenant_id);

-- integration.wms_scm_sync
ALTER TABLE integration.wms_scm_sync ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_integration_wms_scm_sync_tenant_id ON integration.wms_scm_sync (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: lims (13 tables)
-- -----------------------------------------------------------------------

-- lims.ai_analyses
ALTER TABLE lims.ai_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_ai_analyses_tenant_id ON lims.ai_analyses (tenant_id);

-- lims.audit_logs
ALTER TABLE lims.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_audit_logs_tenant_id ON lims.audit_logs (tenant_id);

-- lims.document_relations
ALTER TABLE lims.document_relations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_document_relations_tenant_id ON lims.document_relations (tenant_id);

-- lims.inspection_processes
ALTER TABLE lims.inspection_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_inspection_processes_tenant_id ON lims.inspection_processes (tenant_id);

-- lims.inspection_records
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_inspection_records_tenant_id ON lims.inspection_records (tenant_id);

-- lims.inspection_tasks
ALTER TABLE lims.inspection_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_inspection_tasks_tenant_id ON lims.inspection_tasks (tenant_id);

-- lims.instrument_calibrations
ALTER TABLE lims.instrument_calibrations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_instrument_calibrations_tenant_id ON lims.instrument_calibrations (tenant_id);

-- lims.instruments
ALTER TABLE lims.instruments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_instruments_tenant_id ON lims.instruments (tenant_id);

-- lims.lab_ledger
ALTER TABLE lims.lab_ledger ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_lab_ledger_tenant_id ON lims.lab_ledger (tenant_id);

-- lims.maintenance_records
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_maintenance_records_tenant_id ON lims.maintenance_records (tenant_id);

-- lims.reagent_usages
ALTER TABLE lims.reagent_usages ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_reagent_usages_tenant_id ON lims.reagent_usages (tenant_id);

-- lims.reagents
ALTER TABLE lims.reagents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_reagents_tenant_id ON lims.reagents (tenant_id);

-- lims.samples
ALTER TABLE lims.samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_lims_samples_tenant_id ON lims.samples (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: mail (3 tables)
-- -----------------------------------------------------------------------

-- mail.attachments
ALTER TABLE mail.attachments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mail_attachments_tenant_id ON mail.attachments (tenant_id);

-- mail.emails
ALTER TABLE mail.emails ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mail_emails_tenant_id ON mail.emails (tenant_id);

-- mail.templates
ALTER TABLE mail.templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mail_templates_tenant_id ON mail.templates (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: mes (10 tables)
-- -----------------------------------------------------------------------

-- mes.audit_logs
ALTER TABLE mes.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_tenant_id ON mes.audit_logs (tenant_id);

-- mes.equipment
ALTER TABLE mes.equipment ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_tenant_id ON mes.equipment (tenant_id);

-- mes.equipment_inspection_records
ALTER TABLE mes.equipment_inspection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_inspection_records_tenant_id ON mes.equipment_inspection_records (tenant_id);

-- mes.equipment_maintenance_records
ALTER TABLE mes.equipment_maintenance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_equipment_maintenance_records_tenant_id ON mes.equipment_maintenance_records (tenant_id);

-- mes.process_route_steps
ALTER TABLE mes.process_route_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_process_route_steps_tenant_id ON mes.process_route_steps (tenant_id);

-- mes.process_routes
ALTER TABLE mes.process_routes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_process_routes_tenant_id ON mes.process_routes (tenant_id);

-- mes.production_orders
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_production_orders_tenant_id ON mes.production_orders (tenant_id);

-- mes.production_processes
ALTER TABLE mes.production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_production_processes_tenant_id ON mes.production_processes (tenant_id);

-- mes.production_records
ALTER TABLE mes.production_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_production_records_tenant_id ON mes.production_records (tenant_id);

-- mes.work_stations
ALTER TABLE mes.work_stations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mes_work_stations_tenant_id ON mes.work_stations (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: mobile (6 tables)
-- -----------------------------------------------------------------------

-- mobile.audio_recordings
ALTER TABLE mobile.audio_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_audio_recordings_tenant_id ON mobile.audio_recordings (tenant_id);

-- mobile.mobile_tasks
ALTER TABLE mobile.mobile_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_mobile_tasks_tenant_id ON mobile.mobile_tasks (tenant_id);

-- mobile.patrol_records
ALTER TABLE mobile.patrol_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_patrol_records_tenant_id ON mobile.patrol_records (tenant_id);

-- mobile.photo_evidences
ALTER TABLE mobile.photo_evidences ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_photo_evidences_tenant_id ON mobile.photo_evidences (tenant_id);

-- mobile.scan_records
ALTER TABLE mobile.scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_scan_records_tenant_id ON mobile.scan_records (tenant_id);

-- mobile.video_recordings
ALTER TABLE mobile.video_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_mobile_video_recordings_tenant_id ON mobile.video_recordings (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: notification (4 tables)
-- -----------------------------------------------------------------------

-- notification.archive_config
ALTER TABLE notification.archive_config ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_notification_archive_config_tenant_id ON notification.archive_config (tenant_id);

-- notification.archived_notifications
ALTER TABLE notification.archived_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_notification_archived_notifications_tenant_id ON notification.archived_notifications (tenant_id);

-- notification.notification_templates
ALTER TABLE notification.notification_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_notification_notification_templates_tenant_id ON notification.notification_templates (tenant_id);

-- notification.notifications
ALTER TABLE notification.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_notification_notifications_tenant_id ON notification.notifications (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: plugin_ai (3 tables)
-- -----------------------------------------------------------------------

-- plugin_ai.document_chunks
ALTER TABLE plugin_ai.document_chunks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_ai_document_chunks_tenant_id ON plugin_ai.document_chunks (tenant_id);

-- plugin_ai.documents
ALTER TABLE plugin_ai.documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_ai_documents_tenant_id ON plugin_ai.documents (tenant_id);

-- plugin_ai.qa_history
ALTER TABLE plugin_ai.qa_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_ai_qa_history_tenant_id ON plugin_ai.qa_history (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: plugin_srm (5 tables)
-- -----------------------------------------------------------------------

-- plugin_srm.bid_requests
ALTER TABLE plugin_srm.bid_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_srm_bid_requests_tenant_id ON plugin_srm.bid_requests (tenant_id);

-- plugin_srm.bids
ALTER TABLE plugin_srm.bids ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_srm_bids_tenant_id ON plugin_srm.bids (tenant_id);

-- plugin_srm.tender_awards
ALTER TABLE plugin_srm.tender_awards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_srm_tender_awards_tenant_id ON plugin_srm.tender_awards (tenant_id);

-- plugin_srm.tender_bids
ALTER TABLE plugin_srm.tender_bids ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_srm_tender_bids_tenant_id ON plugin_srm.tender_bids (tenant_id);

-- plugin_srm.tenders
ALTER TABLE plugin_srm.tenders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_plugin_srm_tenders_tenant_id ON plugin_srm.tenders (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: pm (19 tables)
-- -----------------------------------------------------------------------

-- pm.acceptance_items
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_items_tenant_id ON pm.acceptance_items (tenant_id);

-- pm.acceptance_plans
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_plans_tenant_id ON pm.acceptance_plans (tenant_id);

-- pm.acceptance_records
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_records_tenant_id ON pm.acceptance_records (tenant_id);

-- pm.budget_items
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_budget_items_tenant_id ON pm.budget_items (tenant_id);

-- pm.contract_milestones
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_contract_milestones_tenant_id ON pm.contract_milestones (tenant_id);

-- pm.contract_payment_schedule
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_contract_payment_schedule_tenant_id ON pm.contract_payment_schedule (tenant_id);

-- pm.contract_templates
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_contract_templates_tenant_id ON pm.contract_templates (tenant_id);

-- pm.defects
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_defects_tenant_id ON pm.defects (tenant_id);

-- pm.document_folders
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_document_folders_tenant_id ON pm.document_folders (tenant_id);

-- pm.document_versions
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_document_versions_tenant_id ON pm.document_versions (tenant_id);

-- pm.notification_settings
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_notification_settings_tenant_id ON pm.notification_settings (tenant_id);

-- pm.project_documents
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_project_documents_tenant_id ON pm.project_documents (tenant_id);

-- pm.project_reports
ALTER TABLE pm.project_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_project_reports_tenant_id ON pm.project_reports (tenant_id);

-- pm.project_risks
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_project_risks_tenant_id ON pm.project_risks (tenant_id);

-- pm.report_templates
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_report_templates_tenant_id ON pm.report_templates (tenant_id);

-- pm.risk_events
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_risk_events_tenant_id ON pm.risk_events (tenant_id);

-- pm.service_integrations
ALTER TABLE pm.service_integrations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_service_integrations_tenant_id ON pm.service_integrations (tenant_id);

-- pm.settlement_adjustments
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_settlement_adjustments_tenant_id ON pm.settlement_adjustments (tenant_id);

-- pm.settlement_items
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_pm_settlement_items_tenant_id ON pm.settlement_items (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: portal (6 tables)
-- -----------------------------------------------------------------------

-- portal.portal_access_logs
ALTER TABLE portal.portal_access_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_portal_access_logs_tenant_id ON portal.portal_access_logs (tenant_id);

-- portal.portal_announcements
ALTER TABLE portal.portal_announcements ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_portal_announcements_tenant_id ON portal.portal_announcements (tenant_id);

-- portal.portal_configs
ALTER TABLE portal.portal_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_portal_configs_tenant_id ON portal.portal_configs (tenant_id);

-- portal.portal_layouts
ALTER TABLE portal.portal_layouts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_portal_layouts_tenant_id ON portal.portal_layouts (tenant_id);

-- portal.portal_menus
ALTER TABLE portal.portal_menus ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_portal_menus_tenant_id ON portal.portal_menus (tenant_id);

-- portal.user_preferences
ALTER TABLE portal.user_preferences ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_portal_user_preferences_tenant_id ON portal.user_preferences (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: public (268 tables)
-- -----------------------------------------------------------------------

-- public.accounting_subjects
ALTER TABLE public.accounting_subjects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_accounting_subjects_tenant_id ON public.accounting_subjects (tenant_id);

-- public.analysis_history
ALTER TABLE public.analysis_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analysis_history_tenant_id ON public.analysis_history (tenant_id);

-- public.analysis_queries
ALTER TABLE public.analysis_queries ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analysis_queries_tenant_id ON public.analysis_queries (tenant_id);

-- public.analysis_results
ALTER TABLE public.analysis_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analysis_results_tenant_id ON public.analysis_results (tenant_id);

-- public.analytics_comparison_analyses
ALTER TABLE public.analytics_comparison_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_comparison_analyses_tenant_id ON public.analytics_comparison_analyses (tenant_id);

-- public.analytics_comparison_results
ALTER TABLE public.analytics_comparison_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_comparison_results_tenant_id ON public.analytics_comparison_results (tenant_id);

-- public.analytics_dashboard_shares
ALTER TABLE public.analytics_dashboard_shares ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_dashboard_shares_tenant_id ON public.analytics_dashboard_shares (tenant_id);

-- public.analytics_dashboard_templates
ALTER TABLE public.analytics_dashboard_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_dashboard_templates_tenant_id ON public.analytics_dashboard_templates (tenant_id);

-- public.analytics_dashboards
ALTER TABLE public.analytics_dashboards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_dashboards_tenant_id ON public.analytics_dashboards (tenant_id);

-- public.analytics_datasets
ALTER TABLE public.analytics_datasets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_datasets_tenant_id ON public.analytics_datasets (tenant_id);

-- public.analytics_datasources
ALTER TABLE public.analytics_datasources ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_datasources_tenant_id ON public.analytics_datasources (tenant_id);

-- public.analytics_drilldown_history
ALTER TABLE public.analytics_drilldown_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_drilldown_history_tenant_id ON public.analytics_drilldown_history (tenant_id);

-- public.analytics_drilldown_paths
ALTER TABLE public.analytics_drilldown_paths ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_drilldown_paths_tenant_id ON public.analytics_drilldown_paths (tenant_id);

-- public.analytics_report_schedules
ALTER TABLE public.analytics_report_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_report_schedules_tenant_id ON public.analytics_report_schedules (tenant_id);

-- public.analytics_report_templates
ALTER TABLE public.analytics_report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_report_templates_tenant_id ON public.analytics_report_templates (tenant_id);

-- public.analytics_reports
ALTER TABLE public.analytics_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_reports_tenant_id ON public.analytics_reports (tenant_id);

-- public.analytics_row_level_permissions
ALTER TABLE public.analytics_row_level_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_row_level_permissions_tenant_id ON public.analytics_row_level_permissions (tenant_id);

-- public.analytics_self_service_reports
ALTER TABLE public.analytics_self_service_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_self_service_reports_tenant_id ON public.analytics_self_service_reports (tenant_id);

-- public.analytics_sync_records
ALTER TABLE public.analytics_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_sync_records_tenant_id ON public.analytics_sync_records (tenant_id);

-- public.analytics_widgets
ALTER TABLE public.analytics_widgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_analytics_widgets_tenant_id ON public.analytics_widgets (tenant_id);

-- public.archive_config
ALTER TABLE public.archive_config ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_archive_config_tenant_id ON public.archive_config (tenant_id);

-- public.archived_notifications
ALTER TABLE public.archived_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_archived_notifications_tenant_id ON public.archived_notifications (tenant_id);

-- public.audio_recordings
ALTER TABLE public.audio_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_audio_recordings_tenant_id ON public.audio_recordings (tenant_id);

-- public.audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_audit_logs_tenant_id ON public.audit_logs (tenant_id);

-- public.barcode_scans
ALTER TABLE public.barcode_scans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_barcode_scans_tenant_id ON public.barcode_scans (tenant_id);

-- public.batch_records
ALTER TABLE public.batch_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_batch_records_tenant_id ON public.batch_records (tenant_id);

-- public.bom_items
ALTER TABLE public.bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_bom_items_tenant_id ON public.bom_items (tenant_id);

-- public.budgets
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_budgets_tenant_id ON public.budgets (tenant_id);

-- public.business_locations
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_business_locations_tenant_id ON public.business_locations (tenant_id);

-- public.chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_chat_messages_tenant_id ON public.chat_messages (tenant_id);

-- public.chat_rooms
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_chat_rooms_tenant_id ON public.chat_rooms (tenant_id);

-- public.contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_contacts_tenant_id ON public.contacts (tenant_id);

-- public.conversion_executions
ALTER TABLE public.conversion_executions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_conversion_executions_tenant_id ON public.conversion_executions (tenant_id);

-- public.conversion_rules
ALTER TABLE public.conversion_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_conversion_rules_tenant_id ON public.conversion_rules (tenant_id);

-- public.core_billing_plans
ALTER TABLE public.core_billing_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_billing_plans_tenant_id ON public.core_billing_plans (tenant_id);

-- public.core_chat_members
ALTER TABLE public.core_chat_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_chat_members_tenant_id ON public.core_chat_members (tenant_id);

-- public.core_chat_messages
ALTER TABLE public.core_chat_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_chat_messages_tenant_id ON public.core_chat_messages (tenant_id);

-- public.core_chat_rooms
ALTER TABLE public.core_chat_rooms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_chat_rooms_tenant_id ON public.core_chat_rooms (tenant_id);

-- public.core_dict_items
ALTER TABLE public.core_dict_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_dict_items_tenant_id ON public.core_dict_items (tenant_id);

-- public.core_dict_types
ALTER TABLE public.core_dict_types ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_dict_types_tenant_id ON public.core_dict_types (tenant_id);

-- public.core_doc_folders
ALTER TABLE public.core_doc_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_doc_folders_tenant_id ON public.core_doc_folders (tenant_id);

-- public.core_doc_templates
ALTER TABLE public.core_doc_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_doc_templates_tenant_id ON public.core_doc_templates (tenant_id);

-- public.core_documents
ALTER TABLE public.core_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_documents_tenant_id ON public.core_documents (tenant_id);

-- public.core_email_queue
ALTER TABLE public.core_email_queue ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_email_queue_tenant_id ON public.core_email_queue (tenant_id);

-- public.core_email_templates
ALTER TABLE public.core_email_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_email_templates_tenant_id ON public.core_email_templates (tenant_id);

-- public.core_emails
ALTER TABLE public.core_emails ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_emails_tenant_id ON public.core_emails (tenant_id);

-- public.core_file_folders
ALTER TABLE public.core_file_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_file_folders_tenant_id ON public.core_file_folders (tenant_id);

-- public.core_files
ALTER TABLE public.core_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_files_tenant_id ON public.core_files (tenant_id);

-- public.core_finance_payment_items
ALTER TABLE public.core_finance_payment_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_finance_payment_items_tenant_id ON public.core_finance_payment_items (tenant_id);

-- public.core_finance_voucher_entries
ALTER TABLE public.core_finance_voucher_entries ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_finance_voucher_entries_tenant_id ON public.core_finance_voucher_entries (tenant_id);

-- public.core_finance_voucher_lines
ALTER TABLE public.core_finance_voucher_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_finance_voucher_lines_tenant_id ON public.core_finance_voucher_lines (tenant_id);

-- public.core_mail_templates
ALTER TABLE public.core_mail_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_mail_templates_tenant_id ON public.core_mail_templates (tenant_id);

-- public.core_migration_history
ALTER TABLE public.core_migration_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_migration_history_tenant_id ON public.core_migration_history (tenant_id);

-- public.core_notification_templates
ALTER TABLE public.core_notification_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_notification_templates_tenant_id ON public.core_notification_templates (tenant_id);

-- public.core_notifications
ALTER TABLE public.core_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_notifications_tenant_id ON public.core_notifications (tenant_id);

-- public.core_permissions
ALTER TABLE public.core_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_permissions_tenant_id ON public.core_permissions (tenant_id);

-- public.core_plugin_categories
ALTER TABLE public.core_plugin_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_categories_tenant_id ON public.core_plugin_categories (tenant_id);

-- public.core_plugin_instances
ALTER TABLE public.core_plugin_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_instances_tenant_id ON public.core_plugin_instances (tenant_id);

-- public.core_plugin_permissions
ALTER TABLE public.core_plugin_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_permissions_tenant_id ON public.core_plugin_permissions (tenant_id);

-- public.core_plugin_pricing
ALTER TABLE public.core_plugin_pricing ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_pricing_tenant_id ON public.core_plugin_pricing (tenant_id);

-- public.core_plugin_reviews
ALTER TABLE public.core_plugin_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_reviews_tenant_id ON public.core_plugin_reviews (tenant_id);

-- public.core_plugin_versions
ALTER TABLE public.core_plugin_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugin_versions_tenant_id ON public.core_plugin_versions (tenant_id);

-- public.core_plugins
ALTER TABLE public.core_plugins ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_plugins_tenant_id ON public.core_plugins (tenant_id);

-- public.core_role_permissions
ALTER TABLE public.core_role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_role_permissions_tenant_id ON public.core_role_permissions (tenant_id);

-- public.core_tenants
ALTER TABLE public.core_tenants ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_tenants_tenant_id ON public.core_tenants (tenant_id);

-- public.core_user_roles
ALTER TABLE public.core_user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_user_roles_tenant_id ON public.core_user_roles (tenant_id);

-- public.core_workflow_instances
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_workflow_instances_tenant_id ON public.core_workflow_instances (tenant_id);

-- public.core_workflow_tasks
ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_workflow_tasks_tenant_id ON public.core_workflow_tasks (tenant_id);

-- public.core_workflows
ALTER TABLE public.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_core_workflows_tenant_id ON public.core_workflows (tenant_id);

-- public.dashboard_widgets
ALTER TABLE public.dashboard_widgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_dashboard_widgets_tenant_id ON public.dashboard_widgets (tenant_id);

-- public.dashboards
ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_dashboards_tenant_id ON public.dashboards (tenant_id);

-- public.data_sources
ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_data_sources_tenant_id ON public.data_sources (tenant_id);

-- public.datasource_fields
ALTER TABLE public.datasource_fields ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_datasource_fields_tenant_id ON public.datasource_fields (tenant_id);

-- public.datasource_tables
ALTER TABLE public.datasource_tables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_datasource_tables_tenant_id ON public.datasource_tables (tenant_id);

-- public.defect_records
ALTER TABLE public.defect_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_defect_records_tenant_id ON public.defect_records (tenant_id);

-- public.device_locations
ALTER TABLE public.device_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_device_locations_tenant_id ON public.device_locations (tenant_id);

-- public.devices
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_devices_tenant_id ON public.devices (tenant_id);

-- public.document_versions
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_document_versions_tenant_id ON public.document_versions (tenant_id);

-- public.documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_documents_tenant_id ON public.documents (tenant_id);

-- public.equipment
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_equipment_tenant_id ON public.equipment (tenant_id);

-- public.equipment_inspections
ALTER TABLE public.equipment_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_equipment_inspections_tenant_id ON public.equipment_inspections (tenant_id);

-- public.equipment_maintenance_records
ALTER TABLE public.equipment_maintenance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_equipment_maintenance_records_tenant_id ON public.equipment_maintenance_records (tenant_id);

-- public.equipment_oee
ALTER TABLE public.equipment_oee ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_equipment_oee_tenant_id ON public.equipment_oee (tenant_id);

-- public.expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_expenses_tenant_id ON public.expenses (tenant_id);

-- public.factory_maps
ALTER TABLE public.factory_maps ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_factory_maps_tenant_id ON public.factory_maps (tenant_id);

-- public.financial_vouchers
ALTER TABLE public.financial_vouchers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_financial_vouchers_tenant_id ON public.financial_vouchers (tenant_id);

-- public.inbound_orders
ALTER TABLE public.inbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_inbound_orders_tenant_id ON public.inbound_orders (tenant_id);

-- public.inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_inventory_items_tenant_id ON public.inventory_items (tenant_id);

-- public.location_photos
ALTER TABLE public.location_photos ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_location_photos_tenant_id ON public.location_photos (tenant_id);

-- public.locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_locations_tenant_id ON public.locations (tenant_id);

-- public.map_markers
ALTER TABLE public.map_markers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_map_markers_tenant_id ON public.map_markers (tenant_id);

-- public.material_boms
ALTER TABLE public.material_boms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_boms_tenant_id ON public.material_boms (tenant_id);

-- public.material_categories
ALTER TABLE public.material_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_categories_tenant_id ON public.material_categories (tenant_id);

-- public.material_issue_items
ALTER TABLE public.material_issue_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_issue_items_tenant_id ON public.material_issue_items (tenant_id);

-- public.material_issues
ALTER TABLE public.material_issues ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_issues_tenant_id ON public.material_issues (tenant_id);

-- public.material_requirement_items
ALTER TABLE public.material_requirement_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_requirement_items_tenant_id ON public.material_requirement_items (tenant_id);

-- public.material_requirements
ALTER TABLE public.material_requirements ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_requirements_tenant_id ON public.material_requirements (tenant_id);

-- public.material_return_items
ALTER TABLE public.material_return_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_return_items_tenant_id ON public.material_return_items (tenant_id);

-- public.material_returns
ALTER TABLE public.material_returns ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_material_returns_tenant_id ON public.material_returns (tenant_id);

-- public.materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_materials_tenant_id ON public.materials (tenant_id);

-- public.media_files
ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_media_files_tenant_id ON public.media_files (tenant_id);

-- public.mes_qms_sync
ALTER TABLE public.mes_qms_sync ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_mes_qms_sync_tenant_id ON public.mes_qms_sync (tenant_id);

-- public.mobile_approvals
ALTER TABLE public.mobile_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_mobile_approvals_tenant_id ON public.mobile_approvals (tenant_id);

-- public.mobile_scan_records
ALTER TABLE public.mobile_scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_mobile_scan_records_tenant_id ON public.mobile_scan_records (tenant_id);

-- public.mobile_tasks
ALTER TABLE public.mobile_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_mobile_tasks_tenant_id ON public.mobile_tasks (tenant_id);

-- public.mobile_users
ALTER TABLE public.mobile_users ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_mobile_users_tenant_id ON public.mobile_users (tenant_id);

-- public.notification_templates
ALTER TABLE public.notification_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_notification_templates_tenant_id ON public.notification_templates (tenant_id);

-- public.notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_notifications_tenant_id ON public.notifications (tenant_id);

-- public.offline_operations
ALTER TABLE public.offline_operations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_offline_operations_tenant_id ON public.offline_operations (tenant_id);

-- public.offline_sync_records
ALTER TABLE public.offline_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_offline_sync_records_tenant_id ON public.offline_sync_records (tenant_id);

-- public.outbound_orders
ALTER TABLE public.outbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_outbound_orders_tenant_id ON public.outbound_orders (tenant_id);

-- public.patrol_records
ALTER TABLE public.patrol_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_patrol_records_tenant_id ON public.patrol_records (tenant_id);

-- public.payables
ALTER TABLE public.payables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_payables_tenant_id ON public.payables (tenant_id);

-- public.payment_schedules
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_payment_schedules_tenant_id ON public.payment_schedules (tenant_id);

-- public.pdm_bom_items
ALTER TABLE public.pdm_bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_bom_items_tenant_id ON public.pdm_bom_items (tenant_id);

-- public.pdm_boms
ALTER TABLE public.pdm_boms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_boms_tenant_id ON public.pdm_boms (tenant_id);

-- public.pdm_change_notices
ALTER TABLE public.pdm_change_notices ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_change_notices_tenant_id ON public.pdm_change_notices (tenant_id);

-- public.pdm_configurations
ALTER TABLE public.pdm_configurations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_configurations_tenant_id ON public.pdm_configurations (tenant_id);

-- public.pdm_documents
ALTER TABLE public.pdm_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_documents_tenant_id ON public.pdm_documents (tenant_id);

-- public.pdm_materials
ALTER TABLE public.pdm_materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_materials_tenant_id ON public.pdm_materials (tenant_id);

-- public.pdm_production_batches
ALTER TABLE public.pdm_production_batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_production_batches_tenant_id ON public.pdm_production_batches (tenant_id);

-- public.pdm_production_formulas
ALTER TABLE public.pdm_production_formulas ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_production_formulas_tenant_id ON public.pdm_production_formulas (tenant_id);

-- public.pdm_production_processes
ALTER TABLE public.pdm_production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_production_processes_tenant_id ON public.pdm_production_processes (tenant_id);

-- public.pdm_production_steps
ALTER TABLE public.pdm_production_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_production_steps_tenant_id ON public.pdm_production_steps (tenant_id);

-- public.pdm_products
ALTER TABLE public.pdm_products ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_products_tenant_id ON public.pdm_products (tenant_id);

-- public.pdm_versions
ALTER TABLE public.pdm_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_versions_tenant_id ON public.pdm_versions (tenant_id);

-- public.pdm_workflow_instances
ALTER TABLE public.pdm_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_workflow_instances_tenant_id ON public.pdm_workflow_instances (tenant_id);

-- public.pdm_workflows
ALTER TABLE public.pdm_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pdm_workflows_tenant_id ON public.pdm_workflows (tenant_id);

-- public.photo_evidences
ALTER TABLE public.photo_evidences ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_photo_evidences_tenant_id ON public.photo_evidences (tenant_id);

-- public.photo_uploads
ALTER TABLE public.photo_uploads ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_photo_uploads_tenant_id ON public.photo_uploads (tenant_id);

-- public.pipelines
ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_pipelines_tenant_id ON public.pipelines (tenant_id);

-- public.process_flow_steps
ALTER TABLE public.process_flow_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_process_flow_steps_tenant_id ON public.process_flow_steps (tenant_id);

-- public.process_flows
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_process_flows_tenant_id ON public.process_flows (tenant_id);

-- public.process_route_steps
ALTER TABLE public.process_route_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_process_route_steps_tenant_id ON public.process_route_steps (tenant_id);

-- public.process_routes
ALTER TABLE public.process_routes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_process_routes_tenant_id ON public.process_routes (tenant_id);

-- public.product_boms
ALTER TABLE public.product_boms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_product_boms_tenant_id ON public.product_boms (tenant_id);

-- public.production_kanbans
ALTER TABLE public.production_kanbans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_production_kanbans_tenant_id ON public.production_kanbans (tenant_id);

-- public.production_orders
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_production_orders_tenant_id ON public.production_orders (tenant_id);

-- public.production_processes
ALTER TABLE public.production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_production_processes_tenant_id ON public.production_processes (tenant_id);

-- public.production_records
ALTER TABLE public.production_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_production_records_tenant_id ON public.production_records (tenant_id);

-- public.production_schedules
ALTER TABLE public.production_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_production_schedules_tenant_id ON public.production_schedules (tenant_id);

-- public.products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_products_tenant_id ON public.products (tenant_id);

-- public.project_budget_items
ALTER TABLE public.project_budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_project_budget_items_tenant_id ON public.project_budget_items (tenant_id);

-- public.project_budgets
ALTER TABLE public.project_budgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_project_budgets_tenant_id ON public.project_budgets (tenant_id);

-- public.project_contracts
ALTER TABLE public.project_contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_project_contracts_tenant_id ON public.project_contracts (tenant_id);

-- public.purchase_items
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_purchase_items_tenant_id ON public.purchase_items (tenant_id);

-- public.purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_purchase_orders_tenant_id ON public.purchase_orders (tenant_id);

-- public.push_devices
ALTER TABLE public.push_devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_push_devices_tenant_id ON public.push_devices (tenant_id);

-- public.push_notifications
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_push_notifications_tenant_id ON public.push_notifications (tenant_id);

-- public.push_templates
ALTER TABLE public.push_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_push_templates_tenant_id ON public.push_templates (tenant_id);

-- public.qa_alert_messages
ALTER TABLE public.qa_alert_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_alert_messages_tenant_id ON public.qa_alert_messages (tenant_id);

-- public.qa_alert_rules
ALTER TABLE public.qa_alert_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_alert_rules_tenant_id ON public.qa_alert_rules (tenant_id);

-- public.qa_apqp_approvals
ALTER TABLE public.qa_apqp_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_apqp_approvals_tenant_id ON public.qa_apqp_approvals (tenant_id);

-- public.qa_apqp_phases
ALTER TABLE public.qa_apqp_phases ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_apqp_phases_tenant_id ON public.qa_apqp_phases (tenant_id);

-- public.qa_apqp_projects
ALTER TABLE public.qa_apqp_projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_apqp_projects_tenant_id ON public.qa_apqp_projects (tenant_id);

-- public.qa_apqp_risks
ALTER TABLE public.qa_apqp_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_apqp_risks_tenant_id ON public.qa_apqp_risks (tenant_id);

-- public.qa_apqp_tasks
ALTER TABLE public.qa_apqp_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_apqp_tasks_tenant_id ON public.qa_apqp_tasks (tenant_id);

-- public.qa_audit_findings
ALTER TABLE public.qa_audit_findings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_audit_findings_tenant_id ON public.qa_audit_findings (tenant_id);

-- public.qa_audit_plans
ALTER TABLE public.qa_audit_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_audit_plans_tenant_id ON public.qa_audit_plans (tenant_id);

-- public.qa_audit_tasks
ALTER TABLE public.qa_audit_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_audit_tasks_tenant_id ON public.qa_audit_tasks (tenant_id);

-- public.qa_corrective_action_items
ALTER TABLE public.qa_corrective_action_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_corrective_action_items_tenant_id ON public.qa_corrective_action_items (tenant_id);

-- public.qa_corrective_actions
ALTER TABLE public.qa_corrective_actions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_corrective_actions_tenant_id ON public.qa_corrective_actions (tenant_id);

-- public.qa_ehs_accident_investigations
ALTER TABLE public.qa_ehs_accident_investigations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_accident_investigations_tenant_id ON public.qa_ehs_accident_investigations (tenant_id);

-- public.qa_ehs_accident_reviews
ALTER TABLE public.qa_ehs_accident_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_accident_reviews_tenant_id ON public.qa_ehs_accident_reviews (tenant_id);

-- public.qa_ehs_accident_treatments
ALTER TABLE public.qa_ehs_accident_treatments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_accident_treatments_tenant_id ON public.qa_ehs_accident_treatments (tenant_id);

-- public.qa_ehs_accidents
ALTER TABLE public.qa_ehs_accidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_accidents_tenant_id ON public.qa_ehs_accidents (tenant_id);

-- public.qa_ehs_compliance_evaluations
ALTER TABLE public.qa_ehs_compliance_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_compliance_evaluations_tenant_id ON public.qa_ehs_compliance_evaluations (tenant_id);

-- public.qa_ehs_compliance_items
ALTER TABLE public.qa_ehs_compliance_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_compliance_items_tenant_id ON public.qa_ehs_compliance_items (tenant_id);

-- public.qa_ehs_contraindications
ALTER TABLE public.qa_ehs_contraindications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_contraindications_tenant_id ON public.qa_ehs_contraindications (tenant_id);

-- public.qa_ehs_detection_records
ALTER TABLE public.qa_ehs_detection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_detection_records_tenant_id ON public.qa_ehs_detection_records (tenant_id);

-- public.qa_ehs_discharge_permits
ALTER TABLE public.qa_ehs_discharge_permits ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_discharge_permits_tenant_id ON public.qa_ehs_discharge_permits (tenant_id);

-- public.qa_ehs_disease_cases
ALTER TABLE public.qa_ehs_disease_cases ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_disease_cases_tenant_id ON public.qa_ehs_disease_cases (tenant_id);

-- public.qa_ehs_drill_evaluations
ALTER TABLE public.qa_ehs_drill_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_drill_evaluations_tenant_id ON public.qa_ehs_drill_evaluations (tenant_id);

-- public.qa_ehs_drill_plans
ALTER TABLE public.qa_ehs_drill_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_drill_plans_tenant_id ON public.qa_ehs_drill_plans (tenant_id);

-- public.qa_ehs_drill_problems
ALTER TABLE public.qa_ehs_drill_problems ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_drill_problems_tenant_id ON public.qa_ehs_drill_problems (tenant_id);

-- public.qa_ehs_drill_records
ALTER TABLE public.qa_ehs_drill_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_drill_records_tenant_id ON public.qa_ehs_drill_records (tenant_id);

-- public.qa_ehs_emergency_plan_approvals
ALTER TABLE public.qa_ehs_emergency_plan_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_emergency_plan_approvals_tenant_id ON public.qa_ehs_emergency_plan_approvals (tenant_id);

-- public.qa_ehs_emergency_plan_supplies
ALTER TABLE public.qa_ehs_emergency_plan_supplies ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_emergency_plan_supplies_tenant_id ON public.qa_ehs_emergency_plan_supplies (tenant_id);

-- public.qa_ehs_emergency_plan_versions
ALTER TABLE public.qa_ehs_emergency_plan_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_emergency_plan_versions_tenant_id ON public.qa_ehs_emergency_plan_versions (tenant_id);

-- public.qa_ehs_emergency_plans
ALTER TABLE public.qa_ehs_emergency_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_emergency_plans_tenant_id ON public.qa_ehs_emergency_plans (tenant_id);

-- public.qa_ehs_env_monitor_records
ALTER TABLE public.qa_ehs_env_monitor_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_env_monitor_records_tenant_id ON public.qa_ehs_env_monitor_records (tenant_id);

-- public.qa_ehs_environment
ALTER TABLE public.qa_ehs_environment ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_environment_tenant_id ON public.qa_ehs_environment (tenant_id);

-- public.qa_ehs_environment_incidents
ALTER TABLE public.qa_ehs_environment_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_environment_incidents_tenant_id ON public.qa_ehs_environment_incidents (tenant_id);

-- public.qa_ehs_environmental_regulations
ALTER TABLE public.qa_ehs_environmental_regulations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_environmental_regulations_tenant_id ON public.qa_ehs_environmental_regulations (tenant_id);

-- public.qa_ehs_hazard_factors
ALTER TABLE public.qa_ehs_hazard_factors ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_hazard_factors_tenant_id ON public.qa_ehs_hazard_factors (tenant_id);

-- public.qa_ehs_hazard_rectifications
ALTER TABLE public.qa_ehs_hazard_rectifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_hazard_rectifications_tenant_id ON public.qa_ehs_hazard_rectifications (tenant_id);

-- public.qa_ehs_hazard_verifications
ALTER TABLE public.qa_ehs_hazard_verifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_hazard_verifications_tenant_id ON public.qa_ehs_hazard_verifications (tenant_id);

-- public.qa_ehs_hazardous_materials
ALTER TABLE public.qa_ehs_hazardous_materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_hazardous_materials_tenant_id ON public.qa_ehs_hazardous_materials (tenant_id);

-- public.qa_ehs_hazards
ALTER TABLE public.qa_ehs_hazards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_hazards_tenant_id ON public.qa_ehs_hazards (tenant_id);

-- public.qa_ehs_health_abnormalities
ALTER TABLE public.qa_ehs_health_abnormalities ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_health_abnormalities_tenant_id ON public.qa_ehs_health_abnormalities (tenant_id);

-- public.qa_ehs_health_exam_plans
ALTER TABLE public.qa_ehs_health_exam_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_health_exam_plans_tenant_id ON public.qa_ehs_health_exam_plans (tenant_id);

-- public.qa_ehs_health_exam_records
ALTER TABLE public.qa_ehs_health_exam_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_health_exam_records_tenant_id ON public.qa_ehs_health_exam_records (tenant_id);

-- public.qa_ehs_health_trainings
ALTER TABLE public.qa_ehs_health_trainings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_health_trainings_tenant_id ON public.qa_ehs_health_trainings (tenant_id);

-- public.qa_ehs_inspection_items
ALTER TABLE public.qa_ehs_inspection_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_inspection_items_tenant_id ON public.qa_ehs_inspection_items (tenant_id);

-- public.qa_ehs_inspection_plans
ALTER TABLE public.qa_ehs_inspection_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_inspection_plans_tenant_id ON public.qa_ehs_inspection_plans (tenant_id);

-- public.qa_ehs_inspection_record_items
ALTER TABLE public.qa_ehs_inspection_record_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_inspection_record_items_tenant_id ON public.qa_ehs_inspection_record_items (tenant_id);

-- public.qa_ehs_inspection_records
ALTER TABLE public.qa_ehs_inspection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_inspection_records_tenant_id ON public.qa_ehs_inspection_records (tenant_id);

-- public.qa_ehs_material_stocks
ALTER TABLE public.qa_ehs_material_stocks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_material_stocks_tenant_id ON public.qa_ehs_material_stocks (tenant_id);

-- public.qa_ehs_msds
ALTER TABLE public.qa_ehs_msds ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_msds_tenant_id ON public.qa_ehs_msds (tenant_id);

-- public.qa_ehs_protection_measures
ALTER TABLE public.qa_ehs_protection_measures ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_protection_measures_tenant_id ON public.qa_ehs_protection_measures (tenant_id);

-- public.qa_ehs_risks
ALTER TABLE public.qa_ehs_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_risks_tenant_id ON public.qa_ehs_risks (tenant_id);

-- public.qa_ehs_stock_records
ALTER TABLE public.qa_ehs_stock_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_stock_records_tenant_id ON public.qa_ehs_stock_records (tenant_id);

-- public.qa_ehs_sync_records
ALTER TABLE public.qa_ehs_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_sync_records_tenant_id ON public.qa_ehs_sync_records (tenant_id);

-- public.qa_ehs_trainings
ALTER TABLE public.qa_ehs_trainings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_ehs_trainings_tenant_id ON public.qa_ehs_trainings (tenant_id);

-- public.qa_eightd_audit_logs
ALTER TABLE public.qa_eightd_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_eightd_audit_logs_tenant_id ON public.qa_eightd_audit_logs (tenant_id);

-- public.qa_eightd_reports
ALTER TABLE public.qa_eightd_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_eightd_reports_tenant_id ON public.qa_eightd_reports (tenant_id);

-- public.qa_fmea_analyses
ALTER TABLE public.qa_fmea_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_fmea_analyses_tenant_id ON public.qa_fmea_analyses (tenant_id);

-- public.qa_fmea_items
ALTER TABLE public.qa_fmea_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_fmea_items_tenant_id ON public.qa_fmea_items (tenant_id);

-- public.qa_inspection_audits
ALTER TABLE public.qa_inspection_audits ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_inspection_audits_tenant_id ON public.qa_inspection_audits (tenant_id);

-- public.qa_inspection_results
ALTER TABLE public.qa_inspection_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_inspection_results_tenant_id ON public.qa_inspection_results (tenant_id);

-- public.qa_lab_calibration_records
ALTER TABLE public.qa_lab_calibration_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_calibration_records_tenant_id ON public.qa_lab_calibration_records (tenant_id);

-- public.qa_lab_inspection_reports
ALTER TABLE public.qa_lab_inspection_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_inspection_reports_tenant_id ON public.qa_lab_inspection_reports (tenant_id);

-- public.qa_lab_instruments
ALTER TABLE public.qa_lab_instruments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_instruments_tenant_id ON public.qa_lab_instruments (tenant_id);

-- public.qa_lab_processes
ALTER TABLE public.qa_lab_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_processes_tenant_id ON public.qa_lab_processes (tenant_id);

-- public.qa_lab_reagent_alerts
ALTER TABLE public.qa_lab_reagent_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_reagent_alerts_tenant_id ON public.qa_lab_reagent_alerts (tenant_id);

-- public.qa_lab_reagent_history
ALTER TABLE public.qa_lab_reagent_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_reagent_history_tenant_id ON public.qa_lab_reagent_history (tenant_id);

-- public.qa_lab_reagents
ALTER TABLE public.qa_lab_reagents ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_reagents_tenant_id ON public.qa_lab_reagents (tenant_id);

-- public.qa_lab_records
ALTER TABLE public.qa_lab_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_records_tenant_id ON public.qa_lab_records (tenant_id);

-- public.qa_lab_sample_lifecycle
ALTER TABLE public.qa_lab_sample_lifecycle ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_sample_lifecycle_tenant_id ON public.qa_lab_sample_lifecycle (tenant_id);

-- public.qa_lab_samples
ALTER TABLE public.qa_lab_samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_samples_tenant_id ON public.qa_lab_samples (tenant_id);

-- public.qa_lab_tasks
ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lab_tasks_tenant_id ON public.qa_lab_tasks (tenant_id);

-- public.qa_lims_sync_records
ALTER TABLE public.qa_lims_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_lims_sync_records_tenant_id ON public.qa_lims_sync_records (tenant_id);

-- public.qa_qms_sync_records
ALTER TABLE public.qa_qms_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_qms_sync_records_tenant_id ON public.qa_qms_sync_records (tenant_id);

-- public.qa_quality_costs
ALTER TABLE public.qa_quality_costs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_quality_costs_tenant_id ON public.qa_quality_costs (tenant_id);

-- public.qa_quality_inspections
ALTER TABLE public.qa_quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_quality_inspections_tenant_id ON public.qa_quality_inspections (tenant_id);

-- public.qa_spc_charts
ALTER TABLE public.qa_spc_charts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_spc_charts_tenant_id ON public.qa_spc_charts (tenant_id);

-- public.qa_spc_data_points
ALTER TABLE public.qa_spc_data_points ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_spc_data_points_tenant_id ON public.qa_spc_data_points (tenant_id);

-- public.qa_standard_revisions
ALTER TABLE public.qa_standard_revisions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_standard_revisions_tenant_id ON public.qa_standard_revisions (tenant_id);

-- public.qa_standards
ALTER TABLE public.qa_standards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_qa_standards_tenant_id ON public.qa_standards (tenant_id);

-- public.quality_inspections
ALTER TABLE public.quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_inspections_tenant_id ON public.quality_inspections (tenant_id);

-- public.quality_patrol_items
ALTER TABLE public.quality_patrol_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_patrol_items_tenant_id ON public.quality_patrol_items (tenant_id);

-- public.quality_patrols
ALTER TABLE public.quality_patrols ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_patrols_tenant_id ON public.quality_patrols (tenant_id);

-- public.quality_records
ALTER TABLE public.quality_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_records_tenant_id ON public.quality_records (tenant_id);

-- public.quality_standard_values
ALTER TABLE public.quality_standard_values ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_standard_values_tenant_id ON public.quality_standard_values (tenant_id);

-- public.quality_standards
ALTER TABLE public.quality_standards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_standards_tenant_id ON public.quality_standards (tenant_id);

-- public.quality_tasks
ALTER TABLE public.quality_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_tasks_tenant_id ON public.quality_tasks (tenant_id);

-- public.quality_traceability_records
ALTER TABLE public.quality_traceability_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_quality_traceability_records_tenant_id ON public.quality_traceability_records (tenant_id);

-- public.receivables
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_receivables_tenant_id ON public.receivables (tenant_id);

-- public.refresh_tokens
ALTER TABLE public.refresh_tokens ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_refresh_tokens_tenant_id ON public.refresh_tokens (tenant_id);

-- public.report_data
ALTER TABLE public.report_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_data_tenant_id ON public.report_data (tenant_id);

-- public.report_execution_records
ALTER TABLE public.report_execution_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_execution_records_tenant_id ON public.report_execution_records (tenant_id);

-- public.report_schedule_history
ALTER TABLE public.report_schedule_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_schedule_history_tenant_id ON public.report_schedule_history (tenant_id);

-- public.report_schedules
ALTER TABLE public.report_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_schedules_tenant_id ON public.report_schedules (tenant_id);

-- public.report_subscriptions
ALTER TABLE public.report_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_subscriptions_tenant_id ON public.report_subscriptions (tenant_id);

-- public.report_templates
ALTER TABLE public.report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_report_templates_tenant_id ON public.report_templates (tenant_id);

-- public.reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_reports_tenant_id ON public.reports (tenant_id);

-- public.saved_analysis_results
ALTER TABLE public.saved_analysis_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_saved_analysis_results_tenant_id ON public.saved_analysis_results (tenant_id);

-- public.scan_records
ALTER TABLE public.scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_scan_records_tenant_id ON public.scan_records (tenant_id);

-- public.stocktake_records
ALTER TABLE public.stocktake_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_stocktake_records_tenant_id ON public.stocktake_records (tenant_id);

-- public.stocktake_tasks
ALTER TABLE public.stocktake_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_stocktake_tasks_tenant_id ON public.stocktake_tasks (tenant_id);

-- public.supplier_evaluations
ALTER TABLE public.supplier_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_supplier_evaluations_tenant_id ON public.supplier_evaluations (tenant_id);

-- public.suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_suppliers_tenant_id ON public.suppliers (tenant_id);

-- public.sync_policies
ALTER TABLE public.sync_policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_sync_policies_tenant_id ON public.sync_policies (tenant_id);

-- public.team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_team_members_tenant_id ON public.team_members (tenant_id);

-- public.teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_teams_tenant_id ON public.teams (tenant_id);

-- public.tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_tenants_tenant_id ON public.tenants (tenant_id);

-- public.versions
ALTER TABLE public.versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_versions_tenant_id ON public.versions (tenant_id);

-- public.video_recordings
ALTER TABLE public.video_recordings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_video_recordings_tenant_id ON public.video_recordings (tenant_id);

-- public.visualization_data
ALTER TABLE public.visualization_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_visualization_data_tenant_id ON public.visualization_data (tenant_id);

-- public.visualizations
ALTER TABLE public.visualizations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_visualizations_tenant_id ON public.visualizations (tenant_id);

-- public.voucher_items
ALTER TABLE public.voucher_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_voucher_items_tenant_id ON public.voucher_items (tenant_id);

-- public.warehouse_locations
ALTER TABLE public.warehouse_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_warehouse_locations_tenant_id ON public.warehouse_locations (tenant_id);

-- public.warehouses
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_warehouses_tenant_id ON public.warehouses (tenant_id);

-- public.wip_transfers
ALTER TABLE public.wip_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_wip_transfers_tenant_id ON public.wip_transfers (tenant_id);

-- public.wips
ALTER TABLE public.wips ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_wips_tenant_id ON public.wips (tenant_id);

-- public.work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_work_orders_tenant_id ON public.work_orders (tenant_id);

-- public.work_reports
ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_work_reports_tenant_id ON public.work_reports (tenant_id);

-- public.work_stations
ALTER TABLE public.work_stations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_public_work_stations_tenant_id ON public.work_stations (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: qms (7 tables)
-- -----------------------------------------------------------------------

-- qms.audit_logs
ALTER TABLE qms.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_audit_logs_tenant_id ON qms.audit_logs (tenant_id);

-- qms.corrective_actions
ALTER TABLE qms.corrective_actions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_corrective_actions_tenant_id ON qms.corrective_actions (tenant_id);

-- qms.dashboard_metrics
ALTER TABLE qms.dashboard_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_dashboard_metrics_tenant_id ON qms.dashboard_metrics (tenant_id);

-- qms.inspection_items
ALTER TABLE qms.inspection_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_inspection_items_tenant_id ON qms.inspection_items (tenant_id);

-- qms.quality_inspections
ALTER TABLE qms.quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_quality_inspections_tenant_id ON qms.quality_inspections (tenant_id);

-- qms.quality_issues
ALTER TABLE qms.quality_issues ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_quality_issues_tenant_id ON qms.quality_issues (tenant_id);

-- qms.quality_standards
ALTER TABLE qms.quality_standards ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_qms_quality_standards_tenant_id ON qms.quality_standards (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: report (4 tables)
-- -----------------------------------------------------------------------

-- report.report_exports
ALTER TABLE report.report_exports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_report_report_exports_tenant_id ON report.report_exports (tenant_id);

-- report.report_templates
ALTER TABLE report.report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_report_report_templates_tenant_id ON report.report_templates (tenant_id);

-- report.report_type_configs
ALTER TABLE report.report_type_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_report_report_type_configs_tenant_id ON report.report_type_configs (tenant_id);

-- report.reports
ALTER TABLE report.reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_report_reports_tenant_id ON report.reports (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: rs (7 tables)
-- -----------------------------------------------------------------------

-- rs.audit_logs
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_audit_logs_tenant_id ON rs.audit_logs (tenant_id);

-- rs.experiments
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_experiments_tenant_id ON rs.experiments (tenant_id);

-- rs.formulas
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_formulas_tenant_id ON rs.formulas (tenant_id);

-- rs.project_members
ALTER TABLE rs.project_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_project_members_tenant_id ON rs.project_members (tenant_id);

-- rs.project_milestones
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_project_milestones_tenant_id ON rs.project_milestones (tenant_id);

-- rs.project_phases
ALTER TABLE rs.project_phases ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_project_phases_tenant_id ON rs.project_phases (tenant_id);

-- rs.projects
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_rs_projects_tenant_id ON rs.projects (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: scm (6 tables)
-- -----------------------------------------------------------------------

-- scm.audit_logs
ALTER TABLE scm.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_audit_logs_tenant_id ON scm.audit_logs (tenant_id);

-- scm.purchase_items
ALTER TABLE scm.purchase_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_items_tenant_id ON scm.purchase_items (tenant_id);

-- scm.purchase_orders
ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_purchase_orders_tenant_id ON scm.purchase_orders (tenant_id);

-- scm.supplier_delivery_appointments
ALTER TABLE scm.supplier_delivery_appointments ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_supplier_delivery_appointments_tenant_id ON scm.supplier_delivery_appointments (tenant_id);

-- scm.supplier_evaluations
ALTER TABLE scm.supplier_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_supplier_evaluations_tenant_id ON scm.supplier_evaluations (tenant_id);

-- scm.suppliers
ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_scm_suppliers_tenant_id ON scm.suppliers (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: srm (8 tables)
-- -----------------------------------------------------------------------

-- srm.audit_logs
ALTER TABLE srm.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_audit_logs_tenant_id ON srm.audit_logs (tenant_id);

-- srm.contract_terms
ALTER TABLE srm.contract_terms ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_contract_terms_tenant_id ON srm.contract_terms (tenant_id);

-- srm.purchase_orders
ALTER TABLE srm.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_purchase_orders_tenant_id ON srm.purchase_orders (tenant_id);

-- srm.supplier_categories
ALTER TABLE srm.supplier_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_categories_tenant_id ON srm.supplier_categories (tenant_id);

-- srm.supplier_contracts
ALTER TABLE srm.supplier_contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_contracts_tenant_id ON srm.supplier_contracts (tenant_id);

-- srm.supplier_evaluations
ALTER TABLE srm.supplier_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_evaluations_tenant_id ON srm.supplier_evaluations (tenant_id);

-- srm.supplier_products
ALTER TABLE srm.supplier_products ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_supplier_products_tenant_id ON srm.supplier_products (tenant_id);

-- srm.suppliers
ALTER TABLE srm.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_tenant_id ON srm.suppliers (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: storage (3 tables)
-- -----------------------------------------------------------------------

-- storage.backends
ALTER TABLE storage.backends ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_storage_backends_tenant_id ON storage.backends (tenant_id);

-- storage.file_permissions
ALTER TABLE storage.file_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_storage_file_permissions_tenant_id ON storage.file_permissions (tenant_id);

-- storage.files
ALTER TABLE storage.files ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_storage_files_tenant_id ON storage.files (tenant_id);

-- -----------------------------------------------------------------------
-- Schema: wms (28 tables)
-- -----------------------------------------------------------------------

-- wms.audit_logs
ALTER TABLE wms.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_audit_logs_tenant_id ON wms.audit_logs (tenant_id);

-- wms.batches
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_batches_tenant_id ON wms.batches (tenant_id);

-- wms.cycle_count_configs
ALTER TABLE wms.cycle_count_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_cycle_count_configs_tenant_id ON wms.cycle_count_configs (tenant_id);

-- wms.discrepancy_records
ALTER TABLE wms.discrepancy_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_discrepancy_records_tenant_id ON wms.discrepancy_records (tenant_id);

-- wms.inbound_order_items
ALTER TABLE wms.inbound_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inbound_order_items_tenant_id ON wms.inbound_order_items (tenant_id);

-- wms.inbound_orders
ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inbound_orders_tenant_id ON wms.inbound_orders (tenant_id);

-- wms.inventory
ALTER TABLE wms.inventory ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inventory_tenant_id ON wms.inventory (tenant_id);

-- wms.inventory_alert_records
ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inventory_alert_records_tenant_id ON wms.inventory_alert_records (tenant_id);

-- wms.inventory_alert_rules
ALTER TABLE wms.inventory_alert_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inventory_alert_rules_tenant_id ON wms.inventory_alert_rules (tenant_id);

-- wms.inventory_alerts
ALTER TABLE wms.inventory_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_inventory_alerts_tenant_id ON wms.inventory_alerts (tenant_id);

-- wms.locations
ALTER TABLE wms.locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_locations_tenant_id ON wms.locations (tenant_id);

-- wms.outbound_order_items
ALTER TABLE wms.outbound_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_outbound_order_items_tenant_id ON wms.outbound_order_items (tenant_id);

-- wms.outbound_orders
ALTER TABLE wms.outbound_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_outbound_orders_tenant_id ON wms.outbound_orders (tenant_id);

-- wms.replenishment_order_items
ALTER TABLE wms.replenishment_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_replenishment_order_items_tenant_id ON wms.replenishment_order_items (tenant_id);

-- wms.replenishment_orders
ALTER TABLE wms.replenishment_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_replenishment_orders_tenant_id ON wms.replenishment_orders (tenant_id);

-- wms.replenishment_rules
ALTER TABLE wms.replenishment_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_replenishment_rules_tenant_id ON wms.replenishment_rules (tenant_id);

-- wms.replenishment_suggestions
ALTER TABLE wms.replenishment_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_replenishment_suggestions_tenant_id ON wms.replenishment_suggestions (tenant_id);

-- wms.safety_stock_settings
ALTER TABLE wms.safety_stock_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_safety_stock_settings_tenant_id ON wms.safety_stock_settings (tenant_id);

-- wms.serial_numbers
ALTER TABLE wms.serial_numbers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_serial_numbers_tenant_id ON wms.serial_numbers (tenant_id);

-- wms.stock_take_items
ALTER TABLE wms.stock_take_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_stock_take_items_tenant_id ON wms.stock_take_items (tenant_id);

-- wms.stock_takes
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_stock_takes_tenant_id ON wms.stock_takes (tenant_id);

-- wms.transfer_items
ALTER TABLE wms.transfer_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_transfer_items_tenant_id ON wms.transfer_items (tenant_id);

-- wms.transfer_order_items
ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_transfer_order_items_tenant_id ON wms.transfer_order_items (tenant_id);

-- wms.transfer_orders
ALTER TABLE wms.transfer_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_transfer_orders_tenant_id ON wms.transfer_orders (tenant_id);

-- wms.transfers
ALTER TABLE wms.transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_transfers_tenant_id ON wms.transfers (tenant_id);

-- wms.warehouses
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_warehouses_tenant_id ON wms.warehouses (tenant_id);

-- wms.wave_pick_items
ALTER TABLE wms.wave_pick_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_wave_pick_items_tenant_id ON wms.wave_pick_items (tenant_id);

-- wms.wave_picks
ALTER TABLE wms.wave_picks ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_wms_wave_picks_tenant_id ON wms.wave_picks (tenant_id);

-- ============================================================================
-- PHASE 2: Enable Row-Level Security and create tenant isolation policies
-- ============================================================================

-- -----------------------------------------------------------------------
-- Schema: ai (4 tables)
-- -----------------------------------------------------------------------

-- ai.analysis_results
ALTER TABLE ai.analysis_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ai' AND tablename = 'analysis_results' AND policyname = 'analysis_results_tenant_policy'
  ) THEN
    CREATE POLICY analysis_results_tenant_policy ON ai.analysis_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ai.document_chunks
ALTER TABLE ai.document_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ai' AND tablename = 'document_chunks' AND policyname = 'document_chunks_tenant_policy'
  ) THEN
    CREATE POLICY document_chunks_tenant_policy ON ai.document_chunks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ai.documents
ALTER TABLE ai.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ai' AND tablename = 'documents' AND policyname = 'documents_tenant_policy'
  ) THEN
    CREATE POLICY documents_tenant_policy ON ai.documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ai.qa_history
ALTER TABLE ai.qa_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ai' AND tablename = 'qa_history' AND policyname = 'qa_history_tenant_policy'
  ) THEN
    CREATE POLICY qa_history_tenant_policy ON ai.qa_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: bi (16 tables)
-- -----------------------------------------------------------------------

-- bi.analysis_history
ALTER TABLE bi.analysis_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'analysis_history' AND policyname = 'analysis_history_tenant_policy'
  ) THEN
    CREATE POLICY analysis_history_tenant_policy ON bi.analysis_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.analysis_queries
ALTER TABLE bi.analysis_queries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'analysis_queries' AND policyname = 'analysis_queries_tenant_policy'
  ) THEN
    CREATE POLICY analysis_queries_tenant_policy ON bi.analysis_queries
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.analysis_results
ALTER TABLE bi.analysis_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'analysis_results' AND policyname = 'analysis_results_tenant_policy'
  ) THEN
    CREATE POLICY analysis_results_tenant_policy ON bi.analysis_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.audit_logs
ALTER TABLE bi.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON bi.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.dashboard_widgets
ALTER TABLE bi.dashboard_widgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'dashboard_widgets' AND policyname = 'dashboard_widgets_tenant_policy'
  ) THEN
    CREATE POLICY dashboard_widgets_tenant_policy ON bi.dashboard_widgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.dashboards
ALTER TABLE bi.dashboards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'dashboards' AND policyname = 'dashboards_tenant_policy'
  ) THEN
    CREATE POLICY dashboards_tenant_policy ON bi.dashboards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.data_sources
ALTER TABLE bi.data_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'data_sources' AND policyname = 'data_sources_tenant_policy'
  ) THEN
    CREATE POLICY data_sources_tenant_policy ON bi.data_sources
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.datasource_fields
ALTER TABLE bi.datasource_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'datasource_fields' AND policyname = 'datasource_fields_tenant_policy'
  ) THEN
    CREATE POLICY datasource_fields_tenant_policy ON bi.datasource_fields
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.datasource_tables
ALTER TABLE bi.datasource_tables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'datasource_tables' AND policyname = 'datasource_tables_tenant_policy'
  ) THEN
    CREATE POLICY datasource_tables_tenant_policy ON bi.datasource_tables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.report_data
ALTER TABLE bi.report_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'report_data' AND policyname = 'report_data_tenant_policy'
  ) THEN
    CREATE POLICY report_data_tenant_policy ON bi.report_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.report_schedules
ALTER TABLE bi.report_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'report_schedules' AND policyname = 'report_schedules_tenant_policy'
  ) THEN
    CREATE POLICY report_schedules_tenant_policy ON bi.report_schedules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.report_templates
ALTER TABLE bi.report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'report_templates' AND policyname = 'report_templates_tenant_policy'
  ) THEN
    CREATE POLICY report_templates_tenant_policy ON bi.report_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.reports
ALTER TABLE bi.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'reports' AND policyname = 'reports_tenant_policy'
  ) THEN
    CREATE POLICY reports_tenant_policy ON bi.reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.saved_analysis_results
ALTER TABLE bi.saved_analysis_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'saved_analysis_results' AND policyname = 'saved_analysis_results_tenant_policy'
  ) THEN
    CREATE POLICY saved_analysis_results_tenant_policy ON bi.saved_analysis_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.visualization_data
ALTER TABLE bi.visualization_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'visualization_data' AND policyname = 'visualization_data_tenant_policy'
  ) THEN
    CREATE POLICY visualization_data_tenant_policy ON bi.visualization_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- bi.visualizations
ALTER TABLE bi.visualizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'bi' AND tablename = 'visualizations' AND policyname = 'visualizations_tenant_policy'
  ) THEN
    CREATE POLICY visualizations_tenant_policy ON bi.visualizations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: core (1 tables)
-- -----------------------------------------------------------------------

-- core.core_plugins
ALTER TABLE core.core_plugins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_plugins' AND policyname = 'core_plugins_tenant_policy'
  ) THEN
    CREATE POLICY core_plugins_tenant_policy ON core.core_plugins
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: crm (8 tables)
-- -----------------------------------------------------------------------

-- crm.audit_logs
ALTER TABLE crm.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON crm.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.contacts
ALTER TABLE crm.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'contacts' AND policyname = 'contacts_tenant_policy'
  ) THEN
    CREATE POLICY contacts_tenant_policy ON crm.contacts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.customer_tags
ALTER TABLE crm.customer_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'customer_tags' AND policyname = 'customer_tags_tenant_policy'
  ) THEN
    CREATE POLICY customer_tags_tenant_policy ON crm.customer_tags
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.customers
ALTER TABLE crm.customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'customers' AND policyname = 'customers_tenant_policy'
  ) THEN
    CREATE POLICY customers_tenant_policy ON crm.customers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.dashboard_metrics
ALTER TABLE crm.dashboard_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'dashboard_metrics' AND policyname = 'dashboard_metrics_tenant_policy'
  ) THEN
    CREATE POLICY dashboard_metrics_tenant_policy ON crm.dashboard_metrics
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.interactions
ALTER TABLE crm.interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'interactions' AND policyname = 'interactions_tenant_policy'
  ) THEN
    CREATE POLICY interactions_tenant_policy ON crm.interactions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.opportunities
ALTER TABLE crm.opportunities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'opportunities' AND policyname = 'opportunities_tenant_policy'
  ) THEN
    CREATE POLICY opportunities_tenant_policy ON crm.opportunities
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- crm.tags
ALTER TABLE crm.tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'crm' AND tablename = 'tags' AND policyname = 'tags_tenant_policy'
  ) THEN
    CREATE POLICY tags_tenant_policy ON crm.tags
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: doc_service (20 tables)
-- -----------------------------------------------------------------------

-- doc_service.archive_borrows
ALTER TABLE doc_service.archive_borrows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'archive_borrows' AND policyname = 'archive_borrows_tenant_policy'
  ) THEN
    CREATE POLICY archive_borrows_tenant_policy ON doc_service.archive_borrows
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.archive_categories
ALTER TABLE doc_service.archive_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'archive_categories' AND policyname = 'archive_categories_tenant_policy'
  ) THEN
    CREATE POLICY archive_categories_tenant_policy ON doc_service.archive_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.archive_destructions
ALTER TABLE doc_service.archive_destructions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'archive_destructions' AND policyname = 'archive_destructions_tenant_policy'
  ) THEN
    CREATE POLICY archive_destructions_tenant_policy ON doc_service.archive_destructions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.archive_metadata
ALTER TABLE doc_service.archive_metadata ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'archive_metadata' AND policyname = 'archive_metadata_tenant_policy'
  ) THEN
    CREATE POLICY archive_metadata_tenant_policy ON doc_service.archive_metadata
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.archives
ALTER TABLE doc_service.archives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'archives' AND policyname = 'archives_tenant_policy'
  ) THEN
    CREATE POLICY archives_tenant_policy ON doc_service.archives
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.faqs
ALTER TABLE doc_service.faqs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'faqs' AND policyname = 'faqs_tenant_policy'
  ) THEN
    CREATE POLICY faqs_tenant_policy ON doc_service.faqs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.file_permissions
ALTER TABLE doc_service.file_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'file_permissions' AND policyname = 'file_permissions_tenant_policy'
  ) THEN
    CREATE POLICY file_permissions_tenant_policy ON doc_service.file_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.file_versions
ALTER TABLE doc_service.file_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'file_versions' AND policyname = 'file_versions_tenant_policy'
  ) THEN
    CREATE POLICY file_versions_tenant_policy ON doc_service.file_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.files
ALTER TABLE doc_service.files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'files' AND policyname = 'files_tenant_policy'
  ) THEN
    CREATE POLICY files_tenant_policy ON doc_service.files
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.folder_permissions
ALTER TABLE doc_service.folder_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'folder_permissions' AND policyname = 'folder_permissions_tenant_policy'
  ) THEN
    CREATE POLICY folder_permissions_tenant_policy ON doc_service.folder_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.folders
ALTER TABLE doc_service.folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'folders' AND policyname = 'folders_tenant_policy'
  ) THEN
    CREATE POLICY folders_tenant_policy ON doc_service.folders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.help_articles
ALTER TABLE doc_service.help_articles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'help_articles' AND policyname = 'help_articles_tenant_policy'
  ) THEN
    CREATE POLICY help_articles_tenant_policy ON doc_service.help_articles
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.help_categories
ALTER TABLE doc_service.help_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'help_categories' AND policyname = 'help_categories_tenant_policy'
  ) THEN
    CREATE POLICY help_categories_tenant_policy ON doc_service.help_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.template_audit_log
ALTER TABLE doc_service.template_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'template_audit_log' AND policyname = 'template_audit_log_tenant_policy'
  ) THEN
    CREATE POLICY template_audit_log_tenant_policy ON doc_service.template_audit_log
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.template_categories
ALTER TABLE doc_service.template_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'template_categories' AND policyname = 'template_categories_tenant_policy'
  ) THEN
    CREATE POLICY template_categories_tenant_policy ON doc_service.template_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.template_instances
ALTER TABLE doc_service.template_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'template_instances' AND policyname = 'template_instances_tenant_policy'
  ) THEN
    CREATE POLICY template_instances_tenant_policy ON doc_service.template_instances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.template_variables
ALTER TABLE doc_service.template_variables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'template_variables' AND policyname = 'template_variables_tenant_policy'
  ) THEN
    CREATE POLICY template_variables_tenant_policy ON doc_service.template_variables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.template_versions
ALTER TABLE doc_service.template_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'template_versions' AND policyname = 'template_versions_tenant_policy'
  ) THEN
    CREATE POLICY template_versions_tenant_policy ON doc_service.template_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.templates
ALTER TABLE doc_service.templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'templates' AND policyname = 'templates_tenant_policy'
  ) THEN
    CREATE POLICY templates_tenant_policy ON doc_service.templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- doc_service.video_tutorials
ALTER TABLE doc_service.video_tutorials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'doc_service' AND tablename = 'video_tutorials' AND policyname = 'video_tutorials_tenant_policy'
  ) THEN
    CREATE POLICY video_tutorials_tenant_policy ON doc_service.video_tutorials
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: ehs (16 tables)
-- -----------------------------------------------------------------------

-- ehs.audit_logs
ALTER TABLE ehs.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON ehs.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.drill_records
ALTER TABLE ehs.drill_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'drill_records' AND policyname = 'drill_records_tenant_policy'
  ) THEN
    CREATE POLICY drill_records_tenant_policy ON ehs.drill_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.emergency_plans
ALTER TABLE ehs.emergency_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'emergency_plans' AND policyname = 'emergency_plans_tenant_policy'
  ) THEN
    CREATE POLICY emergency_plans_tenant_policy ON ehs.emergency_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.environmental_alerts
ALTER TABLE ehs.environmental_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'environmental_alerts' AND policyname = 'environmental_alerts_tenant_policy'
  ) THEN
    CREATE POLICY environmental_alerts_tenant_policy ON ehs.environmental_alerts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.environmental_data
ALTER TABLE ehs.environmental_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'environmental_data' AND policyname = 'environmental_data_tenant_policy'
  ) THEN
    CREATE POLICY environmental_data_tenant_policy ON ehs.environmental_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.health_checkups
ALTER TABLE ehs.health_checkups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'health_checkups' AND policyname = 'health_checkups_tenant_policy'
  ) THEN
    CREATE POLICY health_checkups_tenant_policy ON ehs.health_checkups
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.health_records
ALTER TABLE ehs.health_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'health_records' AND policyname = 'health_records_tenant_policy'
  ) THEN
    CREATE POLICY health_records_tenant_policy ON ehs.health_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.monitoring_points
ALTER TABLE ehs.monitoring_points ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'monitoring_points' AND policyname = 'monitoring_points_tenant_policy'
  ) THEN
    CREATE POLICY monitoring_points_tenant_policy ON ehs.monitoring_points
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.risk_assessments
ALTER TABLE ehs.risk_assessments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'risk_assessments' AND policyname = 'risk_assessments_tenant_policy'
  ) THEN
    CREATE POLICY risk_assessments_tenant_policy ON ehs.risk_assessments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.risk_controls
ALTER TABLE ehs.risk_controls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'risk_controls' AND policyname = 'risk_controls_tenant_policy'
  ) THEN
    CREATE POLICY risk_controls_tenant_policy ON ehs.risk_controls
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.safety_checks
ALTER TABLE ehs.safety_checks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'safety_checks' AND policyname = 'safety_checks_tenant_policy'
  ) THEN
    CREATE POLICY safety_checks_tenant_policy ON ehs.safety_checks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.safety_hazards
ALTER TABLE ehs.safety_hazards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'safety_hazards' AND policyname = 'safety_hazards_tenant_policy'
  ) THEN
    CREATE POLICY safety_hazards_tenant_policy ON ehs.safety_hazards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.safety_incidents
ALTER TABLE ehs.safety_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'safety_incidents' AND policyname = 'safety_incidents_tenant_policy'
  ) THEN
    CREATE POLICY safety_incidents_tenant_policy ON ehs.safety_incidents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.training_programs
ALTER TABLE ehs.training_programs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'training_programs' AND policyname = 'training_programs_tenant_policy'
  ) THEN
    CREATE POLICY training_programs_tenant_policy ON ehs.training_programs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.training_records
ALTER TABLE ehs.training_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'training_records' AND policyname = 'training_records_tenant_policy'
  ) THEN
    CREATE POLICY training_records_tenant_policy ON ehs.training_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ehs.vaccination_records
ALTER TABLE ehs.vaccination_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ehs' AND tablename = 'vaccination_records' AND policyname = 'vaccination_records_tenant_policy'
  ) THEN
    CREATE POLICY vaccination_records_tenant_policy ON ehs.vaccination_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: erp (28 tables)
-- -----------------------------------------------------------------------

-- erp.accounting_subjects
ALTER TABLE erp.accounting_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'accounting_subjects' AND policyname = 'accounting_subjects_tenant_policy'
  ) THEN
    CREATE POLICY accounting_subjects_tenant_policy ON erp.accounting_subjects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.asset_depreciation_records
ALTER TABLE erp.asset_depreciation_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'asset_depreciation_records' AND policyname = 'asset_depreciation_records_tenant_policy'
  ) THEN
    CREATE POLICY asset_depreciation_records_tenant_policy ON erp.asset_depreciation_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.assets
ALTER TABLE erp.assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'assets' AND policyname = 'assets_tenant_policy'
  ) THEN
    CREATE POLICY assets_tenant_policy ON erp.assets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.audit_logs
ALTER TABLE erp.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON erp.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.bank_accounts
ALTER TABLE erp.bank_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'bank_accounts' AND policyname = 'bank_accounts_tenant_policy'
  ) THEN
    CREATE POLICY bank_accounts_tenant_policy ON erp.bank_accounts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.bank_transactions
ALTER TABLE erp.bank_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'bank_transactions' AND policyname = 'bank_transactions_tenant_policy'
  ) THEN
    CREATE POLICY bank_transactions_tenant_policy ON erp.bank_transactions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.budgets
ALTER TABLE erp.budgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'budgets' AND policyname = 'budgets_tenant_policy'
  ) THEN
    CREATE POLICY budgets_tenant_policy ON erp.budgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.company_relations
ALTER TABLE erp.company_relations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'company_relations' AND policyname = 'company_relations_tenant_policy'
  ) THEN
    CREATE POLICY company_relations_tenant_policy ON erp.company_relations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.consolidation_report_lines
ALTER TABLE erp.consolidation_report_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'consolidation_report_lines' AND policyname = 'consolidation_report_lines_tenant_policy'
  ) THEN
    CREATE POLICY consolidation_report_lines_tenant_policy ON erp.consolidation_report_lines
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.consolidation_reports
ALTER TABLE erp.consolidation_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'consolidation_reports' AND policyname = 'consolidation_reports_tenant_policy'
  ) THEN
    CREATE POLICY consolidation_reports_tenant_policy ON erp.consolidation_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.consolidation_scope_companies
ALTER TABLE erp.consolidation_scope_companies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'consolidation_scope_companies' AND policyname = 'consolidation_scope_companies_tenant_policy'
  ) THEN
    CREATE POLICY consolidation_scope_companies_tenant_policy ON erp.consolidation_scope_companies
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.consolidation_scopes
ALTER TABLE erp.consolidation_scopes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'consolidation_scopes' AND policyname = 'consolidation_scopes_tenant_policy'
  ) THEN
    CREATE POLICY consolidation_scopes_tenant_policy ON erp.consolidation_scopes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.customers
ALTER TABLE erp.customers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'customers' AND policyname = 'customers_tenant_policy'
  ) THEN
    CREATE POLICY customers_tenant_policy ON erp.customers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.db_changes
ALTER TABLE erp.db_changes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'db_changes' AND policyname = 'db_changes_tenant_policy'
  ) THEN
    CREATE POLICY db_changes_tenant_policy ON erp.db_changes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.dict_items
ALTER TABLE erp.dict_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'dict_items' AND policyname = 'dict_items_tenant_policy'
  ) THEN
    CREATE POLICY dict_items_tenant_policy ON erp.dict_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.dict_types
ALTER TABLE erp.dict_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'dict_types' AND policyname = 'dict_types_tenant_policy'
  ) THEN
    CREATE POLICY dict_types_tenant_policy ON erp.dict_types
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.elimination_rules
ALTER TABLE erp.elimination_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'elimination_rules' AND policyname = 'elimination_rules_tenant_policy'
  ) THEN
    CREATE POLICY elimination_rules_tenant_policy ON erp.elimination_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.expenses
ALTER TABLE erp.expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'expenses' AND policyname = 'expenses_tenant_policy'
  ) THEN
    CREATE POLICY expenses_tenant_policy ON erp.expenses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.financial_vouchers
ALTER TABLE erp.financial_vouchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'financial_vouchers' AND policyname = 'financial_vouchers_tenant_policy'
  ) THEN
    CREATE POLICY financial_vouchers_tenant_policy ON erp.financial_vouchers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.fixed_assets
ALTER TABLE erp.fixed_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'fixed_assets' AND policyname = 'fixed_assets_tenant_policy'
  ) THEN
    CREATE POLICY fixed_assets_tenant_policy ON erp.fixed_assets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.internal_transactions
ALTER TABLE erp.internal_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'internal_transactions' AND policyname = 'internal_transactions_tenant_policy'
  ) THEN
    CREATE POLICY internal_transactions_tenant_policy ON erp.internal_transactions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.inventory
ALTER TABLE erp.inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'inventory' AND policyname = 'inventory_tenant_policy'
  ) THEN
    CREATE POLICY inventory_tenant_policy ON erp.inventory
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.materials
ALTER TABLE erp.materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'materials' AND policyname = 'materials_tenant_policy'
  ) THEN
    CREATE POLICY materials_tenant_policy ON erp.materials
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.opening_balances
ALTER TABLE erp.opening_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'opening_balances' AND policyname = 'opening_balances_tenant_policy'
  ) THEN
    CREATE POLICY opening_balances_tenant_policy ON erp.opening_balances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.payables
ALTER TABLE erp.payables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'payables' AND policyname = 'payables_tenant_policy'
  ) THEN
    CREATE POLICY payables_tenant_policy ON erp.payables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.receivables
ALTER TABLE erp.receivables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'receivables' AND policyname = 'receivables_tenant_policy'
  ) THEN
    CREATE POLICY receivables_tenant_policy ON erp.receivables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.sales_orders
ALTER TABLE erp.sales_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'sales_orders' AND policyname = 'sales_orders_tenant_policy'
  ) THEN
    CREATE POLICY sales_orders_tenant_policy ON erp.sales_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- erp.suppliers
ALTER TABLE erp.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'erp' AND tablename = 'suppliers' AND policyname = 'suppliers_tenant_policy'
  ) THEN
    CREATE POLICY suppliers_tenant_policy ON erp.suppliers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: flow (10 tables)
-- -----------------------------------------------------------------------

-- flow.approval_records
ALTER TABLE flow.approval_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'approval_records' AND policyname = 'approval_records_tenant_policy'
  ) THEN
    CREATE POLICY approval_records_tenant_policy ON flow.approval_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.approval_withdrawals
ALTER TABLE flow.approval_withdrawals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'approval_withdrawals' AND policyname = 'approval_withdrawals_tenant_policy'
  ) THEN
    CREATE POLICY approval_withdrawals_tenant_policy ON flow.approval_withdrawals
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.approvals
ALTER TABLE flow.approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'approvals' AND policyname = 'approvals_tenant_policy'
  ) THEN
    CREATE POLICY approvals_tenant_policy ON flow.approvals
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.audit_logs
ALTER TABLE flow.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON flow.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.notifications
ALTER TABLE flow.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'notifications' AND policyname = 'notifications_tenant_policy'
  ) THEN
    CREATE POLICY notifications_tenant_policy ON flow.notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.workflow_instance_snapshots
ALTER TABLE flow.workflow_instance_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'workflow_instance_snapshots' AND policyname = 'workflow_instance_snapshots_tenant_policy'
  ) THEN
    CREATE POLICY workflow_instance_snapshots_tenant_policy ON flow.workflow_instance_snapshots
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.workflow_instances
ALTER TABLE flow.workflow_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'workflow_instances' AND policyname = 'workflow_instances_tenant_policy'
  ) THEN
    CREATE POLICY workflow_instances_tenant_policy ON flow.workflow_instances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.workflow_rollbacks
ALTER TABLE flow.workflow_rollbacks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'workflow_rollbacks' AND policyname = 'workflow_rollbacks_tenant_policy'
  ) THEN
    CREATE POLICY workflow_rollbacks_tenant_policy ON flow.workflow_rollbacks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.workflow_versions
ALTER TABLE flow.workflow_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'workflow_versions' AND policyname = 'workflow_versions_tenant_policy'
  ) THEN
    CREATE POLICY workflow_versions_tenant_policy ON flow.workflow_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- flow.workflows
ALTER TABLE flow.workflows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'flow' AND tablename = 'workflows' AND policyname = 'workflows_tenant_policy'
  ) THEN
    CREATE POLICY workflows_tenant_policy ON flow.workflows
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: hrm (2 tables)
-- -----------------------------------------------------------------------

-- hrm.initialization_logs
ALTER TABLE hrm.initialization_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'hrm' AND tablename = 'initialization_logs' AND policyname = 'initialization_logs_tenant_policy'
  ) THEN
    CREATE POLICY initialization_logs_tenant_policy ON hrm.initialization_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- hrm.initialization_status
ALTER TABLE hrm.initialization_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'hrm' AND tablename = 'initialization_status' AND policyname = 'initialization_status_tenant_policy'
  ) THEN
    CREATE POLICY initialization_status_tenant_policy ON hrm.initialization_status
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: iam (42 tables)
-- -----------------------------------------------------------------------

-- iam.audit_logs
ALTER TABLE iam.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON iam.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.password_reset_tokens
ALTER TABLE iam.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'password_reset_tokens' AND policyname = 'password_reset_tokens_tenant_policy'
  ) THEN
    CREATE POLICY password_reset_tokens_tenant_policy ON iam.password_reset_tokens
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.permissions
ALTER TABLE iam.permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'permissions' AND policyname = 'permissions_tenant_policy'
  ) THEN
    CREATE POLICY permissions_tenant_policy ON iam.permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_calibration_records
ALTER TABLE iam.qa_lab_calibration_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_calibration_records' AND policyname = 'qa_lab_calibration_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_calibration_records_tenant_policy ON iam.qa_lab_calibration_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_inspection_reports
ALTER TABLE iam.qa_lab_inspection_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_inspection_reports' AND policyname = 'qa_lab_inspection_reports_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_inspection_reports_tenant_policy ON iam.qa_lab_inspection_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_instruments
ALTER TABLE iam.qa_lab_instruments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_instruments' AND policyname = 'qa_lab_instruments_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_instruments_tenant_policy ON iam.qa_lab_instruments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_processes
ALTER TABLE iam.qa_lab_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_processes' AND policyname = 'qa_lab_processes_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_processes_tenant_policy ON iam.qa_lab_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_reagent_alerts
ALTER TABLE iam.qa_lab_reagent_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_reagent_alerts' AND policyname = 'qa_lab_reagent_alerts_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagent_alerts_tenant_policy ON iam.qa_lab_reagent_alerts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_reagent_history
ALTER TABLE iam.qa_lab_reagent_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_reagent_history' AND policyname = 'qa_lab_reagent_history_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagent_history_tenant_policy ON iam.qa_lab_reagent_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_reagents
ALTER TABLE iam.qa_lab_reagents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_reagents' AND policyname = 'qa_lab_reagents_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagents_tenant_policy ON iam.qa_lab_reagents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_records
ALTER TABLE iam.qa_lab_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_records' AND policyname = 'qa_lab_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_records_tenant_policy ON iam.qa_lab_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_sample_lifecycle
ALTER TABLE iam.qa_lab_sample_lifecycle ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_sample_lifecycle' AND policyname = 'qa_lab_sample_lifecycle_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_sample_lifecycle_tenant_policy ON iam.qa_lab_sample_lifecycle
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_samples
ALTER TABLE iam.qa_lab_samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_samples' AND policyname = 'qa_lab_samples_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_samples_tenant_policy ON iam.qa_lab_samples
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lab_tasks
ALTER TABLE iam.qa_lab_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lab_tasks' AND policyname = 'qa_lab_tasks_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_tasks_tenant_policy ON iam.qa_lab_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_audit_logs
ALTER TABLE iam.qa_lims_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_audit_logs' AND policyname = 'qa_lims_audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_audit_logs_tenant_policy ON iam.qa_lims_audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_barcode_scan_records
ALTER TABLE iam.qa_lims_barcode_scan_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_barcode_scan_records' AND policyname = 'qa_lims_barcode_scan_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_barcode_scan_records_tenant_policy ON iam.qa_lims_barcode_scan_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_collection_tasks
ALTER TABLE iam.qa_lims_collection_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_collection_tasks' AND policyname = 'qa_lims_collection_tasks_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_collection_tasks_tenant_policy ON iam.qa_lims_collection_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_instrument_data
ALTER TABLE iam.qa_lims_instrument_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_instrument_data' AND policyname = 'qa_lims_instrument_data_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_instrument_data_tenant_policy ON iam.qa_lims_instrument_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_method_categories
ALTER TABLE iam.qa_lims_method_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_method_categories' AND policyname = 'qa_lims_method_categories_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_method_categories_tenant_policy ON iam.qa_lims_method_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_method_validations
ALTER TABLE iam.qa_lims_method_validations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_method_validations' AND policyname = 'qa_lims_method_validations_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_method_validations_tenant_policy ON iam.qa_lims_method_validations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_method_versions
ALTER TABLE iam.qa_lims_method_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_method_versions' AND policyname = 'qa_lims_method_versions_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_method_versions_tenant_policy ON iam.qa_lims_method_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_parse_rules
ALTER TABLE iam.qa_lims_parse_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_parse_rules' AND policyname = 'qa_lims_parse_rules_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_parse_rules_tenant_policy ON iam.qa_lims_parse_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_pt_corrective_actions
ALTER TABLE iam.qa_lims_pt_corrective_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_pt_corrective_actions' AND policyname = 'qa_lims_pt_corrective_actions_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_pt_corrective_actions_tenant_policy ON iam.qa_lims_pt_corrective_actions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_pt_evaluations
ALTER TABLE iam.qa_lims_pt_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_pt_evaluations' AND policyname = 'qa_lims_pt_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_pt_evaluations_tenant_policy ON iam.qa_lims_pt_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_pt_plans
ALTER TABLE iam.qa_lims_pt_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_pt_plans' AND policyname = 'qa_lims_pt_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_pt_plans_tenant_policy ON iam.qa_lims_pt_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_pt_results
ALTER TABLE iam.qa_lims_pt_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_pt_results' AND policyname = 'qa_lims_pt_results_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_pt_results_tenant_policy ON iam.qa_lims_pt_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_pt_samples
ALTER TABLE iam.qa_lims_pt_samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_pt_samples' AND policyname = 'qa_lims_pt_samples_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_pt_samples_tenant_policy ON iam.qa_lims_pt_samples
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_rfid_tags
ALTER TABLE iam.qa_lims_rfid_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_rfid_tags' AND policyname = 'qa_lims_rfid_tags_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_rfid_tags_tenant_policy ON iam.qa_lims_rfid_tags
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_sample_barcodes
ALTER TABLE iam.qa_lims_sample_barcodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_sample_barcodes' AND policyname = 'qa_lims_sample_barcodes_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_sample_barcodes_tenant_policy ON iam.qa_lims_sample_barcodes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_sync_records
ALTER TABLE iam.qa_lims_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_sync_records' AND policyname = 'qa_lims_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_sync_records_tenant_policy ON iam.qa_lims_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_test_methods
ALTER TABLE iam.qa_lims_test_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_test_methods' AND policyname = 'qa_lims_test_methods_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_test_methods_tenant_policy ON iam.qa_lims_test_methods
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_uncertainty_components
ALTER TABLE iam.qa_lims_uncertainty_components ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_uncertainty_components' AND policyname = 'qa_lims_uncertainty_components_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_uncertainty_components_tenant_policy ON iam.qa_lims_uncertainty_components
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_uncertainty_projects
ALTER TABLE iam.qa_lims_uncertainty_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_uncertainty_projects' AND policyname = 'qa_lims_uncertainty_projects_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_uncertainty_projects_tenant_policy ON iam.qa_lims_uncertainty_projects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.qa_lims_uncertainty_sources
ALTER TABLE iam.qa_lims_uncertainty_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'qa_lims_uncertainty_sources' AND policyname = 'qa_lims_uncertainty_sources_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_uncertainty_sources_tenant_policy ON iam.qa_lims_uncertainty_sources
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.refresh_tokens
ALTER TABLE iam.refresh_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'refresh_tokens' AND policyname = 'refresh_tokens_tenant_policy'
  ) THEN
    CREATE POLICY refresh_tokens_tenant_policy ON iam.refresh_tokens
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.role_permissions
ALTER TABLE iam.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'role_permissions' AND policyname = 'role_permissions_tenant_policy'
  ) THEN
    CREATE POLICY role_permissions_tenant_policy ON iam.role_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.roles
ALTER TABLE iam.roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'roles' AND policyname = 'roles_tenant_policy'
  ) THEN
    CREATE POLICY roles_tenant_policy ON iam.roles
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.sessions
ALTER TABLE iam.sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'sessions' AND policyname = 'sessions_tenant_policy'
  ) THEN
    CREATE POLICY sessions_tenant_policy ON iam.sessions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.user_access_logs
ALTER TABLE iam.user_access_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'user_access_logs' AND policyname = 'user_access_logs_tenant_policy'
  ) THEN
    CREATE POLICY user_access_logs_tenant_policy ON iam.user_access_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.user_preferences
ALTER TABLE iam.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'user_preferences' AND policyname = 'user_preferences_tenant_policy'
  ) THEN
    CREATE POLICY user_preferences_tenant_policy ON iam.user_preferences
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.user_roles
ALTER TABLE iam.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'user_roles' AND policyname = 'user_roles_tenant_policy'
  ) THEN
    CREATE POLICY user_roles_tenant_policy ON iam.user_roles
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- iam.users
ALTER TABLE iam.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'users' AND policyname = 'users_tenant_policy'
  ) THEN
    CREATE POLICY users_tenant_policy ON iam.users
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: im (13 tables)
-- -----------------------------------------------------------------------

-- im.audit_logs
ALTER TABLE im.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON im.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.chat_room_members
ALTER TABLE im.chat_room_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'chat_room_members' AND policyname = 'chat_room_members_tenant_policy'
  ) THEN
    CREATE POLICY chat_room_members_tenant_policy ON im.chat_room_members
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.chat_rooms
ALTER TABLE im.chat_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'chat_rooms' AND policyname = 'chat_rooms_tenant_policy'
  ) THEN
    CREATE POLICY chat_rooms_tenant_policy ON im.chat_rooms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.contact_group_members
ALTER TABLE im.contact_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'contact_group_members' AND policyname = 'contact_group_members_tenant_policy'
  ) THEN
    CREATE POLICY contact_group_members_tenant_policy ON im.contact_group_members
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.contact_groups
ALTER TABLE im.contact_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'contact_groups' AND policyname = 'contact_groups_tenant_policy'
  ) THEN
    CREATE POLICY contact_groups_tenant_policy ON im.contact_groups
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.contacts
ALTER TABLE im.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'contacts' AND policyname = 'contacts_tenant_policy'
  ) THEN
    CREATE POLICY contacts_tenant_policy ON im.contacts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.file_transfers
ALTER TABLE im.file_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'file_transfers' AND policyname = 'file_transfers_tenant_policy'
  ) THEN
    CREATE POLICY file_transfers_tenant_policy ON im.file_transfers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.friends
ALTER TABLE im.friends ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'friends' AND policyname = 'friends_tenant_policy'
  ) THEN
    CREATE POLICY friends_tenant_policy ON im.friends
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.message_read_receipts
ALTER TABLE im.message_read_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'message_read_receipts' AND policyname = 'message_read_receipts_tenant_policy'
  ) THEN
    CREATE POLICY message_read_receipts_tenant_policy ON im.message_read_receipts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.messages
ALTER TABLE im.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'messages' AND policyname = 'messages_tenant_policy'
  ) THEN
    CREATE POLICY messages_tenant_policy ON im.messages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.notifications
ALTER TABLE im.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'notifications' AND policyname = 'notifications_tenant_policy'
  ) THEN
    CREATE POLICY notifications_tenant_policy ON im.notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.project_groups
ALTER TABLE im.project_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'project_groups' AND policyname = 'project_groups_tenant_policy'
  ) THEN
    CREATE POLICY project_groups_tenant_policy ON im.project_groups
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- im.user_status
ALTER TABLE im.user_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'im' AND tablename = 'user_status' AND policyname = 'user_status_tenant_policy'
  ) THEN
    CREATE POLICY user_status_tenant_policy ON im.user_status
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: integration (5 tables)
-- -----------------------------------------------------------------------

-- integration.integration_configs
ALTER TABLE integration.integration_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'integration' AND tablename = 'integration_configs' AND policyname = 'integration_configs_tenant_policy'
  ) THEN
    CREATE POLICY integration_configs_tenant_policy ON integration.integration_configs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- integration.integration_events
ALTER TABLE integration.integration_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'integration' AND tablename = 'integration_events' AND policyname = 'integration_events_tenant_policy'
  ) THEN
    CREATE POLICY integration_events_tenant_policy ON integration.integration_events
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- integration.lims_qms_sync
ALTER TABLE integration.lims_qms_sync ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'integration' AND tablename = 'lims_qms_sync' AND policyname = 'lims_qms_sync_tenant_policy'
  ) THEN
    CREATE POLICY lims_qms_sync_tenant_policy ON integration.lims_qms_sync
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- integration.mes_erp_sync
ALTER TABLE integration.mes_erp_sync ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'integration' AND tablename = 'mes_erp_sync' AND policyname = 'mes_erp_sync_tenant_policy'
  ) THEN
    CREATE POLICY mes_erp_sync_tenant_policy ON integration.mes_erp_sync
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- integration.wms_scm_sync
ALTER TABLE integration.wms_scm_sync ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'integration' AND tablename = 'wms_scm_sync' AND policyname = 'wms_scm_sync_tenant_policy'
  ) THEN
    CREATE POLICY wms_scm_sync_tenant_policy ON integration.wms_scm_sync
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: lims (13 tables)
-- -----------------------------------------------------------------------

-- lims.ai_analyses
ALTER TABLE lims.ai_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'ai_analyses' AND policyname = 'ai_analyses_tenant_policy'
  ) THEN
    CREATE POLICY ai_analyses_tenant_policy ON lims.ai_analyses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.audit_logs
ALTER TABLE lims.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON lims.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.document_relations
ALTER TABLE lims.document_relations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'document_relations' AND policyname = 'document_relations_tenant_policy'
  ) THEN
    CREATE POLICY document_relations_tenant_policy ON lims.document_relations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.inspection_processes
ALTER TABLE lims.inspection_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'inspection_processes' AND policyname = 'inspection_processes_tenant_policy'
  ) THEN
    CREATE POLICY inspection_processes_tenant_policy ON lims.inspection_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.inspection_records
ALTER TABLE lims.inspection_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'inspection_records' AND policyname = 'inspection_records_tenant_policy'
  ) THEN
    CREATE POLICY inspection_records_tenant_policy ON lims.inspection_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.inspection_tasks
ALTER TABLE lims.inspection_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'inspection_tasks' AND policyname = 'inspection_tasks_tenant_policy'
  ) THEN
    CREATE POLICY inspection_tasks_tenant_policy ON lims.inspection_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.instrument_calibrations
ALTER TABLE lims.instrument_calibrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'instrument_calibrations' AND policyname = 'instrument_calibrations_tenant_policy'
  ) THEN
    CREATE POLICY instrument_calibrations_tenant_policy ON lims.instrument_calibrations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.instruments
ALTER TABLE lims.instruments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'instruments' AND policyname = 'instruments_tenant_policy'
  ) THEN
    CREATE POLICY instruments_tenant_policy ON lims.instruments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.lab_ledger
ALTER TABLE lims.lab_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'lab_ledger' AND policyname = 'lab_ledger_tenant_policy'
  ) THEN
    CREATE POLICY lab_ledger_tenant_policy ON lims.lab_ledger
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.maintenance_records
ALTER TABLE lims.maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'maintenance_records' AND policyname = 'maintenance_records_tenant_policy'
  ) THEN
    CREATE POLICY maintenance_records_tenant_policy ON lims.maintenance_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.reagent_usages
ALTER TABLE lims.reagent_usages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'reagent_usages' AND policyname = 'reagent_usages_tenant_policy'
  ) THEN
    CREATE POLICY reagent_usages_tenant_policy ON lims.reagent_usages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.reagents
ALTER TABLE lims.reagents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'reagents' AND policyname = 'reagents_tenant_policy'
  ) THEN
    CREATE POLICY reagents_tenant_policy ON lims.reagents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- lims.samples
ALTER TABLE lims.samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lims' AND tablename = 'samples' AND policyname = 'samples_tenant_policy'
  ) THEN
    CREATE POLICY samples_tenant_policy ON lims.samples
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: mail (3 tables)
-- -----------------------------------------------------------------------

-- mail.attachments
ALTER TABLE mail.attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mail' AND tablename = 'attachments' AND policyname = 'attachments_tenant_policy'
  ) THEN
    CREATE POLICY attachments_tenant_policy ON mail.attachments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mail.emails
ALTER TABLE mail.emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mail' AND tablename = 'emails' AND policyname = 'emails_tenant_policy'
  ) THEN
    CREATE POLICY emails_tenant_policy ON mail.emails
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mail.templates
ALTER TABLE mail.templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mail' AND tablename = 'templates' AND policyname = 'templates_tenant_policy'
  ) THEN
    CREATE POLICY templates_tenant_policy ON mail.templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: mes (10 tables)
-- -----------------------------------------------------------------------

-- mes.audit_logs
ALTER TABLE mes.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON mes.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.equipment
ALTER TABLE mes.equipment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'equipment' AND policyname = 'equipment_tenant_policy'
  ) THEN
    CREATE POLICY equipment_tenant_policy ON mes.equipment
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.equipment_inspection_records
ALTER TABLE mes.equipment_inspection_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'equipment_inspection_records' AND policyname = 'equipment_inspection_records_tenant_policy'
  ) THEN
    CREATE POLICY equipment_inspection_records_tenant_policy ON mes.equipment_inspection_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.equipment_maintenance_records
ALTER TABLE mes.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'equipment_maintenance_records' AND policyname = 'equipment_maintenance_records_tenant_policy'
  ) THEN
    CREATE POLICY equipment_maintenance_records_tenant_policy ON mes.equipment_maintenance_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.process_route_steps
ALTER TABLE mes.process_route_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'process_route_steps' AND policyname = 'process_route_steps_tenant_policy'
  ) THEN
    CREATE POLICY process_route_steps_tenant_policy ON mes.process_route_steps
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.process_routes
ALTER TABLE mes.process_routes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'process_routes' AND policyname = 'process_routes_tenant_policy'
  ) THEN
    CREATE POLICY process_routes_tenant_policy ON mes.process_routes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.production_orders
ALTER TABLE mes.production_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'production_orders' AND policyname = 'production_orders_tenant_policy'
  ) THEN
    CREATE POLICY production_orders_tenant_policy ON mes.production_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.production_processes
ALTER TABLE mes.production_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'production_processes' AND policyname = 'production_processes_tenant_policy'
  ) THEN
    CREATE POLICY production_processes_tenant_policy ON mes.production_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.production_records
ALTER TABLE mes.production_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'production_records' AND policyname = 'production_records_tenant_policy'
  ) THEN
    CREATE POLICY production_records_tenant_policy ON mes.production_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mes.work_stations
ALTER TABLE mes.work_stations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'work_stations' AND policyname = 'work_stations_tenant_policy'
  ) THEN
    CREATE POLICY work_stations_tenant_policy ON mes.work_stations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: mobile (6 tables)
-- -----------------------------------------------------------------------

-- mobile.audio_recordings
ALTER TABLE mobile.audio_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'audio_recordings' AND policyname = 'audio_recordings_tenant_policy'
  ) THEN
    CREATE POLICY audio_recordings_tenant_policy ON mobile.audio_recordings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mobile.mobile_tasks
ALTER TABLE mobile.mobile_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'mobile_tasks' AND policyname = 'mobile_tasks_tenant_policy'
  ) THEN
    CREATE POLICY mobile_tasks_tenant_policy ON mobile.mobile_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mobile.patrol_records
ALTER TABLE mobile.patrol_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'patrol_records' AND policyname = 'patrol_records_tenant_policy'
  ) THEN
    CREATE POLICY patrol_records_tenant_policy ON mobile.patrol_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mobile.photo_evidences
ALTER TABLE mobile.photo_evidences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'photo_evidences' AND policyname = 'photo_evidences_tenant_policy'
  ) THEN
    CREATE POLICY photo_evidences_tenant_policy ON mobile.photo_evidences
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mobile.scan_records
ALTER TABLE mobile.scan_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'scan_records' AND policyname = 'scan_records_tenant_policy'
  ) THEN
    CREATE POLICY scan_records_tenant_policy ON mobile.scan_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- mobile.video_recordings
ALTER TABLE mobile.video_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'video_recordings' AND policyname = 'video_recordings_tenant_policy'
  ) THEN
    CREATE POLICY video_recordings_tenant_policy ON mobile.video_recordings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: notification (4 tables)
-- -----------------------------------------------------------------------

-- notification.archive_config
ALTER TABLE notification.archive_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'notification' AND tablename = 'archive_config' AND policyname = 'archive_config_tenant_policy'
  ) THEN
    CREATE POLICY archive_config_tenant_policy ON notification.archive_config
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- notification.archived_notifications
ALTER TABLE notification.archived_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'notification' AND tablename = 'archived_notifications' AND policyname = 'archived_notifications_tenant_policy'
  ) THEN
    CREATE POLICY archived_notifications_tenant_policy ON notification.archived_notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- notification.notification_templates
ALTER TABLE notification.notification_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'notification' AND tablename = 'notification_templates' AND policyname = 'notification_templates_tenant_policy'
  ) THEN
    CREATE POLICY notification_templates_tenant_policy ON notification.notification_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- notification.notifications
ALTER TABLE notification.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'notification' AND tablename = 'notifications' AND policyname = 'notifications_tenant_policy'
  ) THEN
    CREATE POLICY notifications_tenant_policy ON notification.notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: plugin_ai (3 tables)
-- -----------------------------------------------------------------------

-- plugin_ai.document_chunks
ALTER TABLE plugin_ai.document_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_ai' AND tablename = 'document_chunks' AND policyname = 'document_chunks_tenant_policy'
  ) THEN
    CREATE POLICY document_chunks_tenant_policy ON plugin_ai.document_chunks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_ai.documents
ALTER TABLE plugin_ai.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_ai' AND tablename = 'documents' AND policyname = 'documents_tenant_policy'
  ) THEN
    CREATE POLICY documents_tenant_policy ON plugin_ai.documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_ai.qa_history
ALTER TABLE plugin_ai.qa_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_ai' AND tablename = 'qa_history' AND policyname = 'qa_history_tenant_policy'
  ) THEN
    CREATE POLICY qa_history_tenant_policy ON plugin_ai.qa_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: plugin_srm (5 tables)
-- -----------------------------------------------------------------------

-- plugin_srm.bid_requests
ALTER TABLE plugin_srm.bid_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_srm' AND tablename = 'bid_requests' AND policyname = 'bid_requests_tenant_policy'
  ) THEN
    CREATE POLICY bid_requests_tenant_policy ON plugin_srm.bid_requests
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_srm.bids
ALTER TABLE plugin_srm.bids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_srm' AND tablename = 'bids' AND policyname = 'bids_tenant_policy'
  ) THEN
    CREATE POLICY bids_tenant_policy ON plugin_srm.bids
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_srm.tender_awards
ALTER TABLE plugin_srm.tender_awards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_srm' AND tablename = 'tender_awards' AND policyname = 'tender_awards_tenant_policy'
  ) THEN
    CREATE POLICY tender_awards_tenant_policy ON plugin_srm.tender_awards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_srm.tender_bids
ALTER TABLE plugin_srm.tender_bids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_srm' AND tablename = 'tender_bids' AND policyname = 'tender_bids_tenant_policy'
  ) THEN
    CREATE POLICY tender_bids_tenant_policy ON plugin_srm.tender_bids
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- plugin_srm.tenders
ALTER TABLE plugin_srm.tenders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'plugin_srm' AND tablename = 'tenders' AND policyname = 'tenders_tenant_policy'
  ) THEN
    CREATE POLICY tenders_tenant_policy ON plugin_srm.tenders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: pm (19 tables)
-- -----------------------------------------------------------------------

-- pm.acceptance_items
ALTER TABLE pm.acceptance_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'acceptance_items' AND policyname = 'acceptance_items_tenant_policy'
  ) THEN
    CREATE POLICY acceptance_items_tenant_policy ON pm.acceptance_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.acceptance_plans
ALTER TABLE pm.acceptance_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'acceptance_plans' AND policyname = 'acceptance_plans_tenant_policy'
  ) THEN
    CREATE POLICY acceptance_plans_tenant_policy ON pm.acceptance_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.acceptance_records
ALTER TABLE pm.acceptance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'acceptance_records' AND policyname = 'acceptance_records_tenant_policy'
  ) THEN
    CREATE POLICY acceptance_records_tenant_policy ON pm.acceptance_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.budget_items
ALTER TABLE pm.budget_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'budget_items' AND policyname = 'budget_items_tenant_policy'
  ) THEN
    CREATE POLICY budget_items_tenant_policy ON pm.budget_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.contract_milestones
ALTER TABLE pm.contract_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'contract_milestones' AND policyname = 'contract_milestones_tenant_policy'
  ) THEN
    CREATE POLICY contract_milestones_tenant_policy ON pm.contract_milestones
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.contract_payment_schedule
ALTER TABLE pm.contract_payment_schedule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'contract_payment_schedule' AND policyname = 'contract_payment_schedule_tenant_policy'
  ) THEN
    CREATE POLICY contract_payment_schedule_tenant_policy ON pm.contract_payment_schedule
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.contract_templates
ALTER TABLE pm.contract_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'contract_templates' AND policyname = 'contract_templates_tenant_policy'
  ) THEN
    CREATE POLICY contract_templates_tenant_policy ON pm.contract_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.defects
ALTER TABLE pm.defects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'defects' AND policyname = 'defects_tenant_policy'
  ) THEN
    CREATE POLICY defects_tenant_policy ON pm.defects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.document_folders
ALTER TABLE pm.document_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'document_folders' AND policyname = 'document_folders_tenant_policy'
  ) THEN
    CREATE POLICY document_folders_tenant_policy ON pm.document_folders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.document_versions
ALTER TABLE pm.document_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'document_versions' AND policyname = 'document_versions_tenant_policy'
  ) THEN
    CREATE POLICY document_versions_tenant_policy ON pm.document_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.notification_settings
ALTER TABLE pm.notification_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'notification_settings' AND policyname = 'notification_settings_tenant_policy'
  ) THEN
    CREATE POLICY notification_settings_tenant_policy ON pm.notification_settings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.project_documents
ALTER TABLE pm.project_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'project_documents' AND policyname = 'project_documents_tenant_policy'
  ) THEN
    CREATE POLICY project_documents_tenant_policy ON pm.project_documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.project_reports
ALTER TABLE pm.project_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'project_reports' AND policyname = 'project_reports_tenant_policy'
  ) THEN
    CREATE POLICY project_reports_tenant_policy ON pm.project_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.project_risks
ALTER TABLE pm.project_risks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'project_risks' AND policyname = 'project_risks_tenant_policy'
  ) THEN
    CREATE POLICY project_risks_tenant_policy ON pm.project_risks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.report_templates
ALTER TABLE pm.report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'report_templates' AND policyname = 'report_templates_tenant_policy'
  ) THEN
    CREATE POLICY report_templates_tenant_policy ON pm.report_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.risk_events
ALTER TABLE pm.risk_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'risk_events' AND policyname = 'risk_events_tenant_policy'
  ) THEN
    CREATE POLICY risk_events_tenant_policy ON pm.risk_events
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.service_integrations
ALTER TABLE pm.service_integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'service_integrations' AND policyname = 'service_integrations_tenant_policy'
  ) THEN
    CREATE POLICY service_integrations_tenant_policy ON pm.service_integrations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.settlement_adjustments
ALTER TABLE pm.settlement_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'settlement_adjustments' AND policyname = 'settlement_adjustments_tenant_policy'
  ) THEN
    CREATE POLICY settlement_adjustments_tenant_policy ON pm.settlement_adjustments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- pm.settlement_items
ALTER TABLE pm.settlement_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'pm' AND tablename = 'settlement_items' AND policyname = 'settlement_items_tenant_policy'
  ) THEN
    CREATE POLICY settlement_items_tenant_policy ON pm.settlement_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: portal (6 tables)
-- -----------------------------------------------------------------------

-- portal.portal_access_logs
ALTER TABLE portal.portal_access_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'portal_access_logs' AND policyname = 'portal_access_logs_tenant_policy'
  ) THEN
    CREATE POLICY portal_access_logs_tenant_policy ON portal.portal_access_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- portal.portal_announcements
ALTER TABLE portal.portal_announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'portal_announcements' AND policyname = 'portal_announcements_tenant_policy'
  ) THEN
    CREATE POLICY portal_announcements_tenant_policy ON portal.portal_announcements
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- portal.portal_configs
ALTER TABLE portal.portal_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'portal_configs' AND policyname = 'portal_configs_tenant_policy'
  ) THEN
    CREATE POLICY portal_configs_tenant_policy ON portal.portal_configs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- portal.portal_layouts
ALTER TABLE portal.portal_layouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'portal_layouts' AND policyname = 'portal_layouts_tenant_policy'
  ) THEN
    CREATE POLICY portal_layouts_tenant_policy ON portal.portal_layouts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- portal.portal_menus
ALTER TABLE portal.portal_menus ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'portal_menus' AND policyname = 'portal_menus_tenant_policy'
  ) THEN
    CREATE POLICY portal_menus_tenant_policy ON portal.portal_menus
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- portal.user_preferences
ALTER TABLE portal.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'portal' AND tablename = 'user_preferences' AND policyname = 'user_preferences_tenant_policy'
  ) THEN
    CREATE POLICY user_preferences_tenant_policy ON portal.user_preferences
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: public (268 tables)
-- -----------------------------------------------------------------------

-- public.accounting_subjects
ALTER TABLE public.accounting_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'accounting_subjects' AND policyname = 'accounting_subjects_tenant_policy'
  ) THEN
    CREATE POLICY accounting_subjects_tenant_policy ON public.accounting_subjects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analysis_history
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analysis_history' AND policyname = 'analysis_history_tenant_policy'
  ) THEN
    CREATE POLICY analysis_history_tenant_policy ON public.analysis_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analysis_queries
ALTER TABLE public.analysis_queries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analysis_queries' AND policyname = 'analysis_queries_tenant_policy'
  ) THEN
    CREATE POLICY analysis_queries_tenant_policy ON public.analysis_queries
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analysis_results
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analysis_results' AND policyname = 'analysis_results_tenant_policy'
  ) THEN
    CREATE POLICY analysis_results_tenant_policy ON public.analysis_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_comparison_analyses
ALTER TABLE public.analytics_comparison_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_comparison_analyses' AND policyname = 'analytics_comparison_analyses_tenant_policy'
  ) THEN
    CREATE POLICY analytics_comparison_analyses_tenant_policy ON public.analytics_comparison_analyses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_comparison_results
ALTER TABLE public.analytics_comparison_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_comparison_results' AND policyname = 'analytics_comparison_results_tenant_policy'
  ) THEN
    CREATE POLICY analytics_comparison_results_tenant_policy ON public.analytics_comparison_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_dashboard_shares
ALTER TABLE public.analytics_dashboard_shares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_dashboard_shares' AND policyname = 'analytics_dashboard_shares_tenant_policy'
  ) THEN
    CREATE POLICY analytics_dashboard_shares_tenant_policy ON public.analytics_dashboard_shares
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_dashboard_templates
ALTER TABLE public.analytics_dashboard_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_dashboard_templates' AND policyname = 'analytics_dashboard_templates_tenant_policy'
  ) THEN
    CREATE POLICY analytics_dashboard_templates_tenant_policy ON public.analytics_dashboard_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_dashboards
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_dashboards' AND policyname = 'analytics_dashboards_tenant_policy'
  ) THEN
    CREATE POLICY analytics_dashboards_tenant_policy ON public.analytics_dashboards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_datasets
ALTER TABLE public.analytics_datasets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_datasets' AND policyname = 'analytics_datasets_tenant_policy'
  ) THEN
    CREATE POLICY analytics_datasets_tenant_policy ON public.analytics_datasets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_datasources
ALTER TABLE public.analytics_datasources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_datasources' AND policyname = 'analytics_datasources_tenant_policy'
  ) THEN
    CREATE POLICY analytics_datasources_tenant_policy ON public.analytics_datasources
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_drilldown_history
ALTER TABLE public.analytics_drilldown_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_drilldown_history' AND policyname = 'analytics_drilldown_history_tenant_policy'
  ) THEN
    CREATE POLICY analytics_drilldown_history_tenant_policy ON public.analytics_drilldown_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_drilldown_paths
ALTER TABLE public.analytics_drilldown_paths ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_drilldown_paths' AND policyname = 'analytics_drilldown_paths_tenant_policy'
  ) THEN
    CREATE POLICY analytics_drilldown_paths_tenant_policy ON public.analytics_drilldown_paths
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_report_schedules
ALTER TABLE public.analytics_report_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_report_schedules' AND policyname = 'analytics_report_schedules_tenant_policy'
  ) THEN
    CREATE POLICY analytics_report_schedules_tenant_policy ON public.analytics_report_schedules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_report_templates
ALTER TABLE public.analytics_report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_report_templates' AND policyname = 'analytics_report_templates_tenant_policy'
  ) THEN
    CREATE POLICY analytics_report_templates_tenant_policy ON public.analytics_report_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_reports
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_reports' AND policyname = 'analytics_reports_tenant_policy'
  ) THEN
    CREATE POLICY analytics_reports_tenant_policy ON public.analytics_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_row_level_permissions
ALTER TABLE public.analytics_row_level_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_row_level_permissions' AND policyname = 'analytics_row_level_permissions_tenant_policy'
  ) THEN
    CREATE POLICY analytics_row_level_permissions_tenant_policy ON public.analytics_row_level_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_self_service_reports
ALTER TABLE public.analytics_self_service_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_self_service_reports' AND policyname = 'analytics_self_service_reports_tenant_policy'
  ) THEN
    CREATE POLICY analytics_self_service_reports_tenant_policy ON public.analytics_self_service_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_sync_records
ALTER TABLE public.analytics_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_sync_records' AND policyname = 'analytics_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY analytics_sync_records_tenant_policy ON public.analytics_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.analytics_widgets
ALTER TABLE public.analytics_widgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analytics_widgets' AND policyname = 'analytics_widgets_tenant_policy'
  ) THEN
    CREATE POLICY analytics_widgets_tenant_policy ON public.analytics_widgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.archive_config
ALTER TABLE public.archive_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'archive_config' AND policyname = 'archive_config_tenant_policy'
  ) THEN
    CREATE POLICY archive_config_tenant_policy ON public.archive_config
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.archived_notifications
ALTER TABLE public.archived_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'archived_notifications' AND policyname = 'archived_notifications_tenant_policy'
  ) THEN
    CREATE POLICY archived_notifications_tenant_policy ON public.archived_notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.audio_recordings
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audio_recordings' AND policyname = 'audio_recordings_tenant_policy'
  ) THEN
    CREATE POLICY audio_recordings_tenant_policy ON public.audio_recordings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON public.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.barcode_scans
ALTER TABLE public.barcode_scans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'barcode_scans' AND policyname = 'barcode_scans_tenant_policy'
  ) THEN
    CREATE POLICY barcode_scans_tenant_policy ON public.barcode_scans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.batch_records
ALTER TABLE public.batch_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'batch_records' AND policyname = 'batch_records_tenant_policy'
  ) THEN
    CREATE POLICY batch_records_tenant_policy ON public.batch_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.bom_items
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bom_items' AND policyname = 'bom_items_tenant_policy'
  ) THEN
    CREATE POLICY bom_items_tenant_policy ON public.bom_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budgets' AND policyname = 'budgets_tenant_policy'
  ) THEN
    CREATE POLICY budgets_tenant_policy ON public.budgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.business_locations
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_locations' AND policyname = 'business_locations_tenant_policy'
  ) THEN
    CREATE POLICY business_locations_tenant_policy ON public.business_locations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_tenant_policy'
  ) THEN
    CREATE POLICY chat_messages_tenant_policy ON public.chat_messages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_rooms' AND policyname = 'chat_rooms_tenant_policy'
  ) THEN
    CREATE POLICY chat_rooms_tenant_policy ON public.chat_rooms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contacts' AND policyname = 'contacts_tenant_policy'
  ) THEN
    CREATE POLICY contacts_tenant_policy ON public.contacts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.conversion_executions
ALTER TABLE public.conversion_executions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversion_executions' AND policyname = 'conversion_executions_tenant_policy'
  ) THEN
    CREATE POLICY conversion_executions_tenant_policy ON public.conversion_executions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.conversion_rules
ALTER TABLE public.conversion_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversion_rules' AND policyname = 'conversion_rules_tenant_policy'
  ) THEN
    CREATE POLICY conversion_rules_tenant_policy ON public.conversion_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_billing_plans
ALTER TABLE public.core_billing_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_billing_plans' AND policyname = 'core_billing_plans_tenant_policy'
  ) THEN
    CREATE POLICY core_billing_plans_tenant_policy ON public.core_billing_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_chat_members
ALTER TABLE public.core_chat_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_chat_members' AND policyname = 'core_chat_members_tenant_policy'
  ) THEN
    CREATE POLICY core_chat_members_tenant_policy ON public.core_chat_members
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_chat_messages
ALTER TABLE public.core_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_chat_messages' AND policyname = 'core_chat_messages_tenant_policy'
  ) THEN
    CREATE POLICY core_chat_messages_tenant_policy ON public.core_chat_messages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_chat_rooms
ALTER TABLE public.core_chat_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_chat_rooms' AND policyname = 'core_chat_rooms_tenant_policy'
  ) THEN
    CREATE POLICY core_chat_rooms_tenant_policy ON public.core_chat_rooms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_dict_items
ALTER TABLE public.core_dict_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_dict_items' AND policyname = 'core_dict_items_tenant_policy'
  ) THEN
    CREATE POLICY core_dict_items_tenant_policy ON public.core_dict_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_dict_types
ALTER TABLE public.core_dict_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_dict_types' AND policyname = 'core_dict_types_tenant_policy'
  ) THEN
    CREATE POLICY core_dict_types_tenant_policy ON public.core_dict_types
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_doc_folders
ALTER TABLE public.core_doc_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_doc_folders' AND policyname = 'core_doc_folders_tenant_policy'
  ) THEN
    CREATE POLICY core_doc_folders_tenant_policy ON public.core_doc_folders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_doc_templates
ALTER TABLE public.core_doc_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_doc_templates' AND policyname = 'core_doc_templates_tenant_policy'
  ) THEN
    CREATE POLICY core_doc_templates_tenant_policy ON public.core_doc_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_documents
ALTER TABLE public.core_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_documents' AND policyname = 'core_documents_tenant_policy'
  ) THEN
    CREATE POLICY core_documents_tenant_policy ON public.core_documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_email_queue
ALTER TABLE public.core_email_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_email_queue' AND policyname = 'core_email_queue_tenant_policy'
  ) THEN
    CREATE POLICY core_email_queue_tenant_policy ON public.core_email_queue
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_email_templates
ALTER TABLE public.core_email_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_email_templates' AND policyname = 'core_email_templates_tenant_policy'
  ) THEN
    CREATE POLICY core_email_templates_tenant_policy ON public.core_email_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_emails
ALTER TABLE public.core_emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_emails' AND policyname = 'core_emails_tenant_policy'
  ) THEN
    CREATE POLICY core_emails_tenant_policy ON public.core_emails
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_file_folders
ALTER TABLE public.core_file_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_file_folders' AND policyname = 'core_file_folders_tenant_policy'
  ) THEN
    CREATE POLICY core_file_folders_tenant_policy ON public.core_file_folders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_files
ALTER TABLE public.core_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_files' AND policyname = 'core_files_tenant_policy'
  ) THEN
    CREATE POLICY core_files_tenant_policy ON public.core_files
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_finance_payment_items
ALTER TABLE public.core_finance_payment_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_finance_payment_items' AND policyname = 'core_finance_payment_items_tenant_policy'
  ) THEN
    CREATE POLICY core_finance_payment_items_tenant_policy ON public.core_finance_payment_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_finance_voucher_entries
ALTER TABLE public.core_finance_voucher_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_finance_voucher_entries' AND policyname = 'core_finance_voucher_entries_tenant_policy'
  ) THEN
    CREATE POLICY core_finance_voucher_entries_tenant_policy ON public.core_finance_voucher_entries
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_finance_voucher_lines
ALTER TABLE public.core_finance_voucher_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_finance_voucher_lines' AND policyname = 'core_finance_voucher_lines_tenant_policy'
  ) THEN
    CREATE POLICY core_finance_voucher_lines_tenant_policy ON public.core_finance_voucher_lines
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_mail_templates
ALTER TABLE public.core_mail_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_mail_templates' AND policyname = 'core_mail_templates_tenant_policy'
  ) THEN
    CREATE POLICY core_mail_templates_tenant_policy ON public.core_mail_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_migration_history
ALTER TABLE public.core_migration_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_migration_history' AND policyname = 'core_migration_history_tenant_policy'
  ) THEN
    CREATE POLICY core_migration_history_tenant_policy ON public.core_migration_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_notification_templates
ALTER TABLE public.core_notification_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_notification_templates' AND policyname = 'core_notification_templates_tenant_policy'
  ) THEN
    CREATE POLICY core_notification_templates_tenant_policy ON public.core_notification_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_notifications
ALTER TABLE public.core_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_notifications' AND policyname = 'core_notifications_tenant_policy'
  ) THEN
    CREATE POLICY core_notifications_tenant_policy ON public.core_notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_permissions
ALTER TABLE public.core_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_permissions' AND policyname = 'core_permissions_tenant_policy'
  ) THEN
    CREATE POLICY core_permissions_tenant_policy ON public.core_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_categories
ALTER TABLE public.core_plugin_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_categories' AND policyname = 'core_plugin_categories_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_categories_tenant_policy ON public.core_plugin_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_instances
ALTER TABLE public.core_plugin_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_instances' AND policyname = 'core_plugin_instances_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_instances_tenant_policy ON public.core_plugin_instances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_permissions
ALTER TABLE public.core_plugin_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_permissions' AND policyname = 'core_plugin_permissions_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_permissions_tenant_policy ON public.core_plugin_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_pricing
ALTER TABLE public.core_plugin_pricing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_pricing' AND policyname = 'core_plugin_pricing_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_pricing_tenant_policy ON public.core_plugin_pricing
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_reviews
ALTER TABLE public.core_plugin_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_reviews' AND policyname = 'core_plugin_reviews_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_reviews_tenant_policy ON public.core_plugin_reviews
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugin_versions
ALTER TABLE public.core_plugin_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugin_versions' AND policyname = 'core_plugin_versions_tenant_policy'
  ) THEN
    CREATE POLICY core_plugin_versions_tenant_policy ON public.core_plugin_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_plugins
ALTER TABLE public.core_plugins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_plugins' AND policyname = 'core_plugins_tenant_policy'
  ) THEN
    CREATE POLICY core_plugins_tenant_policy ON public.core_plugins
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_role_permissions
ALTER TABLE public.core_role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_role_permissions' AND policyname = 'core_role_permissions_tenant_policy'
  ) THEN
    CREATE POLICY core_role_permissions_tenant_policy ON public.core_role_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_tenants
ALTER TABLE public.core_tenants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_tenants' AND policyname = 'core_tenants_tenant_policy'
  ) THEN
    CREATE POLICY core_tenants_tenant_policy ON public.core_tenants
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_user_roles
ALTER TABLE public.core_user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_user_roles' AND policyname = 'core_user_roles_tenant_policy'
  ) THEN
    CREATE POLICY core_user_roles_tenant_policy ON public.core_user_roles
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_workflow_instances
ALTER TABLE public.core_workflow_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_workflow_instances' AND policyname = 'core_workflow_instances_tenant_policy'
  ) THEN
    CREATE POLICY core_workflow_instances_tenant_policy ON public.core_workflow_instances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_workflow_tasks
ALTER TABLE public.core_workflow_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_workflow_tasks' AND policyname = 'core_workflow_tasks_tenant_policy'
  ) THEN
    CREATE POLICY core_workflow_tasks_tenant_policy ON public.core_workflow_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.core_workflows
ALTER TABLE public.core_workflows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'core_workflows' AND policyname = 'core_workflows_tenant_policy'
  ) THEN
    CREATE POLICY core_workflows_tenant_policy ON public.core_workflows
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.dashboard_widgets
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dashboard_widgets' AND policyname = 'dashboard_widgets_tenant_policy'
  ) THEN
    CREATE POLICY dashboard_widgets_tenant_policy ON public.dashboard_widgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.dashboards
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dashboards' AND policyname = 'dashboards_tenant_policy'
  ) THEN
    CREATE POLICY dashboards_tenant_policy ON public.dashboards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.data_sources
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_sources' AND policyname = 'data_sources_tenant_policy'
  ) THEN
    CREATE POLICY data_sources_tenant_policy ON public.data_sources
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.datasource_fields
ALTER TABLE public.datasource_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'datasource_fields' AND policyname = 'datasource_fields_tenant_policy'
  ) THEN
    CREATE POLICY datasource_fields_tenant_policy ON public.datasource_fields
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.datasource_tables
ALTER TABLE public.datasource_tables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'datasource_tables' AND policyname = 'datasource_tables_tenant_policy'
  ) THEN
    CREATE POLICY datasource_tables_tenant_policy ON public.datasource_tables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.defect_records
ALTER TABLE public.defect_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'defect_records' AND policyname = 'defect_records_tenant_policy'
  ) THEN
    CREATE POLICY defect_records_tenant_policy ON public.defect_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.device_locations
ALTER TABLE public.device_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'device_locations' AND policyname = 'device_locations_tenant_policy'
  ) THEN
    CREATE POLICY device_locations_tenant_policy ON public.device_locations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'devices' AND policyname = 'devices_tenant_policy'
  ) THEN
    CREATE POLICY devices_tenant_policy ON public.devices
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'document_versions_tenant_policy'
  ) THEN
    CREATE POLICY document_versions_tenant_policy ON public.document_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_tenant_policy'
  ) THEN
    CREATE POLICY documents_tenant_policy ON public.documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment' AND policyname = 'equipment_tenant_policy'
  ) THEN
    CREATE POLICY equipment_tenant_policy ON public.equipment
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.equipment_inspections
ALTER TABLE public.equipment_inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_inspections' AND policyname = 'equipment_inspections_tenant_policy'
  ) THEN
    CREATE POLICY equipment_inspections_tenant_policy ON public.equipment_inspections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.equipment_maintenance_records
ALTER TABLE public.equipment_maintenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_maintenance_records' AND policyname = 'equipment_maintenance_records_tenant_policy'
  ) THEN
    CREATE POLICY equipment_maintenance_records_tenant_policy ON public.equipment_maintenance_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.equipment_oee
ALTER TABLE public.equipment_oee ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment_oee' AND policyname = 'equipment_oee_tenant_policy'
  ) THEN
    CREATE POLICY equipment_oee_tenant_policy ON public.equipment_oee
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'expenses_tenant_policy'
  ) THEN
    CREATE POLICY expenses_tenant_policy ON public.expenses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.factory_maps
ALTER TABLE public.factory_maps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'factory_maps' AND policyname = 'factory_maps_tenant_policy'
  ) THEN
    CREATE POLICY factory_maps_tenant_policy ON public.factory_maps
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.financial_vouchers
ALTER TABLE public.financial_vouchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_vouchers' AND policyname = 'financial_vouchers_tenant_policy'
  ) THEN
    CREATE POLICY financial_vouchers_tenant_policy ON public.financial_vouchers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.inbound_orders
ALTER TABLE public.inbound_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inbound_orders' AND policyname = 'inbound_orders_tenant_policy'
  ) THEN
    CREATE POLICY inbound_orders_tenant_policy ON public.inbound_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inventory_items' AND policyname = 'inventory_items_tenant_policy'
  ) THEN
    CREATE POLICY inventory_items_tenant_policy ON public.inventory_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.location_photos
ALTER TABLE public.location_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'location_photos' AND policyname = 'location_photos_tenant_policy'
  ) THEN
    CREATE POLICY location_photos_tenant_policy ON public.location_photos
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'locations' AND policyname = 'locations_tenant_policy'
  ) THEN
    CREATE POLICY locations_tenant_policy ON public.locations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.map_markers
ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'map_markers' AND policyname = 'map_markers_tenant_policy'
  ) THEN
    CREATE POLICY map_markers_tenant_policy ON public.map_markers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_boms
ALTER TABLE public.material_boms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_boms' AND policyname = 'material_boms_tenant_policy'
  ) THEN
    CREATE POLICY material_boms_tenant_policy ON public.material_boms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_categories
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_categories' AND policyname = 'material_categories_tenant_policy'
  ) THEN
    CREATE POLICY material_categories_tenant_policy ON public.material_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_issue_items
ALTER TABLE public.material_issue_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_issue_items' AND policyname = 'material_issue_items_tenant_policy'
  ) THEN
    CREATE POLICY material_issue_items_tenant_policy ON public.material_issue_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_issues
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_issues' AND policyname = 'material_issues_tenant_policy'
  ) THEN
    CREATE POLICY material_issues_tenant_policy ON public.material_issues
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_requirement_items
ALTER TABLE public.material_requirement_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_requirement_items' AND policyname = 'material_requirement_items_tenant_policy'
  ) THEN
    CREATE POLICY material_requirement_items_tenant_policy ON public.material_requirement_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_requirements
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_requirements' AND policyname = 'material_requirements_tenant_policy'
  ) THEN
    CREATE POLICY material_requirements_tenant_policy ON public.material_requirements
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_return_items
ALTER TABLE public.material_return_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_return_items' AND policyname = 'material_return_items_tenant_policy'
  ) THEN
    CREATE POLICY material_return_items_tenant_policy ON public.material_return_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.material_returns
ALTER TABLE public.material_returns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_returns' AND policyname = 'material_returns_tenant_policy'
  ) THEN
    CREATE POLICY material_returns_tenant_policy ON public.material_returns
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'materials' AND policyname = 'materials_tenant_policy'
  ) THEN
    CREATE POLICY materials_tenant_policy ON public.materials
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.media_files
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_files' AND policyname = 'media_files_tenant_policy'
  ) THEN
    CREATE POLICY media_files_tenant_policy ON public.media_files
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.mes_qms_sync
ALTER TABLE public.mes_qms_sync ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mes_qms_sync' AND policyname = 'mes_qms_sync_tenant_policy'
  ) THEN
    CREATE POLICY mes_qms_sync_tenant_policy ON public.mes_qms_sync
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.mobile_approvals
ALTER TABLE public.mobile_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobile_approvals' AND policyname = 'mobile_approvals_tenant_policy'
  ) THEN
    CREATE POLICY mobile_approvals_tenant_policy ON public.mobile_approvals
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.mobile_scan_records
ALTER TABLE public.mobile_scan_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobile_scan_records' AND policyname = 'mobile_scan_records_tenant_policy'
  ) THEN
    CREATE POLICY mobile_scan_records_tenant_policy ON public.mobile_scan_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.mobile_tasks
ALTER TABLE public.mobile_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobile_tasks' AND policyname = 'mobile_tasks_tenant_policy'
  ) THEN
    CREATE POLICY mobile_tasks_tenant_policy ON public.mobile_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.mobile_users
ALTER TABLE public.mobile_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobile_users' AND policyname = 'mobile_users_tenant_policy'
  ) THEN
    CREATE POLICY mobile_users_tenant_policy ON public.mobile_users
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.notification_templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_templates' AND policyname = 'notification_templates_tenant_policy'
  ) THEN
    CREATE POLICY notification_templates_tenant_policy ON public.notification_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_tenant_policy'
  ) THEN
    CREATE POLICY notifications_tenant_policy ON public.notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.offline_operations
ALTER TABLE public.offline_operations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offline_operations' AND policyname = 'offline_operations_tenant_policy'
  ) THEN
    CREATE POLICY offline_operations_tenant_policy ON public.offline_operations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.offline_sync_records
ALTER TABLE public.offline_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'offline_sync_records' AND policyname = 'offline_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY offline_sync_records_tenant_policy ON public.offline_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.outbound_orders
ALTER TABLE public.outbound_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'outbound_orders' AND policyname = 'outbound_orders_tenant_policy'
  ) THEN
    CREATE POLICY outbound_orders_tenant_policy ON public.outbound_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.patrol_records
ALTER TABLE public.patrol_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'patrol_records' AND policyname = 'patrol_records_tenant_policy'
  ) THEN
    CREATE POLICY patrol_records_tenant_policy ON public.patrol_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.payables
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payables' AND policyname = 'payables_tenant_policy'
  ) THEN
    CREATE POLICY payables_tenant_policy ON public.payables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_schedules' AND policyname = 'payment_schedules_tenant_policy'
  ) THEN
    CREATE POLICY payment_schedules_tenant_policy ON public.payment_schedules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_bom_items
ALTER TABLE public.pdm_bom_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_bom_items' AND policyname = 'pdm_bom_items_tenant_policy'
  ) THEN
    CREATE POLICY pdm_bom_items_tenant_policy ON public.pdm_bom_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_boms
ALTER TABLE public.pdm_boms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_boms' AND policyname = 'pdm_boms_tenant_policy'
  ) THEN
    CREATE POLICY pdm_boms_tenant_policy ON public.pdm_boms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_change_notices
ALTER TABLE public.pdm_change_notices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_change_notices' AND policyname = 'pdm_change_notices_tenant_policy'
  ) THEN
    CREATE POLICY pdm_change_notices_tenant_policy ON public.pdm_change_notices
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_configurations
ALTER TABLE public.pdm_configurations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_configurations' AND policyname = 'pdm_configurations_tenant_policy'
  ) THEN
    CREATE POLICY pdm_configurations_tenant_policy ON public.pdm_configurations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_documents
ALTER TABLE public.pdm_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_documents' AND policyname = 'pdm_documents_tenant_policy'
  ) THEN
    CREATE POLICY pdm_documents_tenant_policy ON public.pdm_documents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_materials
ALTER TABLE public.pdm_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_materials' AND policyname = 'pdm_materials_tenant_policy'
  ) THEN
    CREATE POLICY pdm_materials_tenant_policy ON public.pdm_materials
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_production_batches
ALTER TABLE public.pdm_production_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_production_batches' AND policyname = 'pdm_production_batches_tenant_policy'
  ) THEN
    CREATE POLICY pdm_production_batches_tenant_policy ON public.pdm_production_batches
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_production_formulas
ALTER TABLE public.pdm_production_formulas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_production_formulas' AND policyname = 'pdm_production_formulas_tenant_policy'
  ) THEN
    CREATE POLICY pdm_production_formulas_tenant_policy ON public.pdm_production_formulas
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_production_processes
ALTER TABLE public.pdm_production_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_production_processes' AND policyname = 'pdm_production_processes_tenant_policy'
  ) THEN
    CREATE POLICY pdm_production_processes_tenant_policy ON public.pdm_production_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_production_steps
ALTER TABLE public.pdm_production_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_production_steps' AND policyname = 'pdm_production_steps_tenant_policy'
  ) THEN
    CREATE POLICY pdm_production_steps_tenant_policy ON public.pdm_production_steps
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_products
ALTER TABLE public.pdm_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_products' AND policyname = 'pdm_products_tenant_policy'
  ) THEN
    CREATE POLICY pdm_products_tenant_policy ON public.pdm_products
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_versions
ALTER TABLE public.pdm_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_versions' AND policyname = 'pdm_versions_tenant_policy'
  ) THEN
    CREATE POLICY pdm_versions_tenant_policy ON public.pdm_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_workflow_instances
ALTER TABLE public.pdm_workflow_instances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_workflow_instances' AND policyname = 'pdm_workflow_instances_tenant_policy'
  ) THEN
    CREATE POLICY pdm_workflow_instances_tenant_policy ON public.pdm_workflow_instances
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pdm_workflows
ALTER TABLE public.pdm_workflows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pdm_workflows' AND policyname = 'pdm_workflows_tenant_policy'
  ) THEN
    CREATE POLICY pdm_workflows_tenant_policy ON public.pdm_workflows
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.photo_evidences
ALTER TABLE public.photo_evidences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_evidences' AND policyname = 'photo_evidences_tenant_policy'
  ) THEN
    CREATE POLICY photo_evidences_tenant_policy ON public.photo_evidences
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.photo_uploads
ALTER TABLE public.photo_uploads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_uploads' AND policyname = 'photo_uploads_tenant_policy'
  ) THEN
    CREATE POLICY photo_uploads_tenant_policy ON public.photo_uploads
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pipelines' AND policyname = 'pipelines_tenant_policy'
  ) THEN
    CREATE POLICY pipelines_tenant_policy ON public.pipelines
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.process_flow_steps
ALTER TABLE public.process_flow_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'process_flow_steps' AND policyname = 'process_flow_steps_tenant_policy'
  ) THEN
    CREATE POLICY process_flow_steps_tenant_policy ON public.process_flow_steps
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.process_flows
ALTER TABLE public.process_flows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'process_flows' AND policyname = 'process_flows_tenant_policy'
  ) THEN
    CREATE POLICY process_flows_tenant_policy ON public.process_flows
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.process_route_steps
ALTER TABLE public.process_route_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'process_route_steps' AND policyname = 'process_route_steps_tenant_policy'
  ) THEN
    CREATE POLICY process_route_steps_tenant_policy ON public.process_route_steps
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.process_routes
ALTER TABLE public.process_routes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'process_routes' AND policyname = 'process_routes_tenant_policy'
  ) THEN
    CREATE POLICY process_routes_tenant_policy ON public.process_routes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.product_boms
ALTER TABLE public.product_boms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_boms' AND policyname = 'product_boms_tenant_policy'
  ) THEN
    CREATE POLICY product_boms_tenant_policy ON public.product_boms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.production_kanbans
ALTER TABLE public.production_kanbans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_kanbans' AND policyname = 'production_kanbans_tenant_policy'
  ) THEN
    CREATE POLICY production_kanbans_tenant_policy ON public.production_kanbans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.production_orders
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_orders' AND policyname = 'production_orders_tenant_policy'
  ) THEN
    CREATE POLICY production_orders_tenant_policy ON public.production_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.production_processes
ALTER TABLE public.production_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_processes' AND policyname = 'production_processes_tenant_policy'
  ) THEN
    CREATE POLICY production_processes_tenant_policy ON public.production_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.production_records
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_records' AND policyname = 'production_records_tenant_policy'
  ) THEN
    CREATE POLICY production_records_tenant_policy ON public.production_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.production_schedules
ALTER TABLE public.production_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_schedules' AND policyname = 'production_schedules_tenant_policy'
  ) THEN
    CREATE POLICY production_schedules_tenant_policy ON public.production_schedules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'products_tenant_policy'
  ) THEN
    CREATE POLICY products_tenant_policy ON public.products
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.project_budget_items
ALTER TABLE public.project_budget_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_budget_items' AND policyname = 'project_budget_items_tenant_policy'
  ) THEN
    CREATE POLICY project_budget_items_tenant_policy ON public.project_budget_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.project_budgets
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_budgets' AND policyname = 'project_budgets_tenant_policy'
  ) THEN
    CREATE POLICY project_budgets_tenant_policy ON public.project_budgets
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.project_contracts
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_contracts' AND policyname = 'project_contracts_tenant_policy'
  ) THEN
    CREATE POLICY project_contracts_tenant_policy ON public.project_contracts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.purchase_items
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchase_items' AND policyname = 'purchase_items_tenant_policy'
  ) THEN
    CREATE POLICY purchase_items_tenant_policy ON public.purchase_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchase_orders' AND policyname = 'purchase_orders_tenant_policy'
  ) THEN
    CREATE POLICY purchase_orders_tenant_policy ON public.purchase_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.push_devices
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_devices' AND policyname = 'push_devices_tenant_policy'
  ) THEN
    CREATE POLICY push_devices_tenant_policy ON public.push_devices
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_notifications' AND policyname = 'push_notifications_tenant_policy'
  ) THEN
    CREATE POLICY push_notifications_tenant_policy ON public.push_notifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.push_templates
ALTER TABLE public.push_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_templates' AND policyname = 'push_templates_tenant_policy'
  ) THEN
    CREATE POLICY push_templates_tenant_policy ON public.push_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_alert_messages
ALTER TABLE public.qa_alert_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_alert_messages' AND policyname = 'qa_alert_messages_tenant_policy'
  ) THEN
    CREATE POLICY qa_alert_messages_tenant_policy ON public.qa_alert_messages
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_alert_rules
ALTER TABLE public.qa_alert_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_alert_rules' AND policyname = 'qa_alert_rules_tenant_policy'
  ) THEN
    CREATE POLICY qa_alert_rules_tenant_policy ON public.qa_alert_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_apqp_approvals
ALTER TABLE public.qa_apqp_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_apqp_approvals' AND policyname = 'qa_apqp_approvals_tenant_policy'
  ) THEN
    CREATE POLICY qa_apqp_approvals_tenant_policy ON public.qa_apqp_approvals
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_apqp_phases
ALTER TABLE public.qa_apqp_phases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_apqp_phases' AND policyname = 'qa_apqp_phases_tenant_policy'
  ) THEN
    CREATE POLICY qa_apqp_phases_tenant_policy ON public.qa_apqp_phases
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_apqp_projects
ALTER TABLE public.qa_apqp_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_apqp_projects' AND policyname = 'qa_apqp_projects_tenant_policy'
  ) THEN
    CREATE POLICY qa_apqp_projects_tenant_policy ON public.qa_apqp_projects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_apqp_risks
ALTER TABLE public.qa_apqp_risks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_apqp_risks' AND policyname = 'qa_apqp_risks_tenant_policy'
  ) THEN
    CREATE POLICY qa_apqp_risks_tenant_policy ON public.qa_apqp_risks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_apqp_tasks
ALTER TABLE public.qa_apqp_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_apqp_tasks' AND policyname = 'qa_apqp_tasks_tenant_policy'
  ) THEN
    CREATE POLICY qa_apqp_tasks_tenant_policy ON public.qa_apqp_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_audit_findings
ALTER TABLE public.qa_audit_findings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_audit_findings' AND policyname = 'qa_audit_findings_tenant_policy'
  ) THEN
    CREATE POLICY qa_audit_findings_tenant_policy ON public.qa_audit_findings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_audit_plans
ALTER TABLE public.qa_audit_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_audit_plans' AND policyname = 'qa_audit_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_audit_plans_tenant_policy ON public.qa_audit_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_audit_tasks
ALTER TABLE public.qa_audit_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_audit_tasks' AND policyname = 'qa_audit_tasks_tenant_policy'
  ) THEN
    CREATE POLICY qa_audit_tasks_tenant_policy ON public.qa_audit_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_corrective_action_items
ALTER TABLE public.qa_corrective_action_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_corrective_action_items' AND policyname = 'qa_corrective_action_items_tenant_policy'
  ) THEN
    CREATE POLICY qa_corrective_action_items_tenant_policy ON public.qa_corrective_action_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_corrective_actions
ALTER TABLE public.qa_corrective_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_corrective_actions' AND policyname = 'qa_corrective_actions_tenant_policy'
  ) THEN
    CREATE POLICY qa_corrective_actions_tenant_policy ON public.qa_corrective_actions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_accident_investigations
ALTER TABLE public.qa_ehs_accident_investigations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_accident_investigations' AND policyname = 'qa_ehs_accident_investigations_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_accident_investigations_tenant_policy ON public.qa_ehs_accident_investigations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_accident_reviews
ALTER TABLE public.qa_ehs_accident_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_accident_reviews' AND policyname = 'qa_ehs_accident_reviews_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_accident_reviews_tenant_policy ON public.qa_ehs_accident_reviews
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_accident_treatments
ALTER TABLE public.qa_ehs_accident_treatments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_accident_treatments' AND policyname = 'qa_ehs_accident_treatments_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_accident_treatments_tenant_policy ON public.qa_ehs_accident_treatments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_accidents
ALTER TABLE public.qa_ehs_accidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_accidents' AND policyname = 'qa_ehs_accidents_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_accidents_tenant_policy ON public.qa_ehs_accidents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_compliance_evaluations
ALTER TABLE public.qa_ehs_compliance_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_compliance_evaluations' AND policyname = 'qa_ehs_compliance_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_compliance_evaluations_tenant_policy ON public.qa_ehs_compliance_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_compliance_items
ALTER TABLE public.qa_ehs_compliance_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_compliance_items' AND policyname = 'qa_ehs_compliance_items_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_compliance_items_tenant_policy ON public.qa_ehs_compliance_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_contraindications
ALTER TABLE public.qa_ehs_contraindications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_contraindications' AND policyname = 'qa_ehs_contraindications_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_contraindications_tenant_policy ON public.qa_ehs_contraindications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_detection_records
ALTER TABLE public.qa_ehs_detection_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_detection_records' AND policyname = 'qa_ehs_detection_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_detection_records_tenant_policy ON public.qa_ehs_detection_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_discharge_permits
ALTER TABLE public.qa_ehs_discharge_permits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_discharge_permits' AND policyname = 'qa_ehs_discharge_permits_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_discharge_permits_tenant_policy ON public.qa_ehs_discharge_permits
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_disease_cases
ALTER TABLE public.qa_ehs_disease_cases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_disease_cases' AND policyname = 'qa_ehs_disease_cases_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_disease_cases_tenant_policy ON public.qa_ehs_disease_cases
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_drill_evaluations
ALTER TABLE public.qa_ehs_drill_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_drill_evaluations' AND policyname = 'qa_ehs_drill_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_drill_evaluations_tenant_policy ON public.qa_ehs_drill_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_drill_plans
ALTER TABLE public.qa_ehs_drill_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_drill_plans' AND policyname = 'qa_ehs_drill_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_drill_plans_tenant_policy ON public.qa_ehs_drill_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_drill_problems
ALTER TABLE public.qa_ehs_drill_problems ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_drill_problems' AND policyname = 'qa_ehs_drill_problems_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_drill_problems_tenant_policy ON public.qa_ehs_drill_problems
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_drill_records
ALTER TABLE public.qa_ehs_drill_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_drill_records' AND policyname = 'qa_ehs_drill_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_drill_records_tenant_policy ON public.qa_ehs_drill_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_emergency_plan_approvals
ALTER TABLE public.qa_ehs_emergency_plan_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_emergency_plan_approvals' AND policyname = 'qa_ehs_emergency_plan_approvals_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_emergency_plan_approvals_tenant_policy ON public.qa_ehs_emergency_plan_approvals
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_emergency_plan_supplies
ALTER TABLE public.qa_ehs_emergency_plan_supplies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_emergency_plan_supplies' AND policyname = 'qa_ehs_emergency_plan_supplies_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_emergency_plan_supplies_tenant_policy ON public.qa_ehs_emergency_plan_supplies
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_emergency_plan_versions
ALTER TABLE public.qa_ehs_emergency_plan_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_emergency_plan_versions' AND policyname = 'qa_ehs_emergency_plan_versions_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_emergency_plan_versions_tenant_policy ON public.qa_ehs_emergency_plan_versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_emergency_plans
ALTER TABLE public.qa_ehs_emergency_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_emergency_plans' AND policyname = 'qa_ehs_emergency_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_emergency_plans_tenant_policy ON public.qa_ehs_emergency_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_env_monitor_records
ALTER TABLE public.qa_ehs_env_monitor_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_env_monitor_records' AND policyname = 'qa_ehs_env_monitor_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_env_monitor_records_tenant_policy ON public.qa_ehs_env_monitor_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_environment
ALTER TABLE public.qa_ehs_environment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_environment' AND policyname = 'qa_ehs_environment_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_environment_tenant_policy ON public.qa_ehs_environment
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_environment_incidents
ALTER TABLE public.qa_ehs_environment_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_environment_incidents' AND policyname = 'qa_ehs_environment_incidents_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_environment_incidents_tenant_policy ON public.qa_ehs_environment_incidents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_environmental_regulations
ALTER TABLE public.qa_ehs_environmental_regulations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_environmental_regulations' AND policyname = 'qa_ehs_environmental_regulations_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_environmental_regulations_tenant_policy ON public.qa_ehs_environmental_regulations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_hazard_factors
ALTER TABLE public.qa_ehs_hazard_factors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_hazard_factors' AND policyname = 'qa_ehs_hazard_factors_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_hazard_factors_tenant_policy ON public.qa_ehs_hazard_factors
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_hazard_rectifications
ALTER TABLE public.qa_ehs_hazard_rectifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_hazard_rectifications' AND policyname = 'qa_ehs_hazard_rectifications_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_hazard_rectifications_tenant_policy ON public.qa_ehs_hazard_rectifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_hazard_verifications
ALTER TABLE public.qa_ehs_hazard_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_hazard_verifications' AND policyname = 'qa_ehs_hazard_verifications_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_hazard_verifications_tenant_policy ON public.qa_ehs_hazard_verifications
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_hazardous_materials
ALTER TABLE public.qa_ehs_hazardous_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_hazardous_materials' AND policyname = 'qa_ehs_hazardous_materials_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_hazardous_materials_tenant_policy ON public.qa_ehs_hazardous_materials
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_hazards
ALTER TABLE public.qa_ehs_hazards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_hazards' AND policyname = 'qa_ehs_hazards_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_hazards_tenant_policy ON public.qa_ehs_hazards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_health_abnormalities
ALTER TABLE public.qa_ehs_health_abnormalities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_health_abnormalities' AND policyname = 'qa_ehs_health_abnormalities_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_health_abnormalities_tenant_policy ON public.qa_ehs_health_abnormalities
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_health_exam_plans
ALTER TABLE public.qa_ehs_health_exam_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_health_exam_plans' AND policyname = 'qa_ehs_health_exam_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_health_exam_plans_tenant_policy ON public.qa_ehs_health_exam_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_health_exam_records
ALTER TABLE public.qa_ehs_health_exam_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_health_exam_records' AND policyname = 'qa_ehs_health_exam_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_health_exam_records_tenant_policy ON public.qa_ehs_health_exam_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_health_trainings
ALTER TABLE public.qa_ehs_health_trainings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_health_trainings' AND policyname = 'qa_ehs_health_trainings_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_health_trainings_tenant_policy ON public.qa_ehs_health_trainings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_inspection_items
ALTER TABLE public.qa_ehs_inspection_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_inspection_items' AND policyname = 'qa_ehs_inspection_items_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_inspection_items_tenant_policy ON public.qa_ehs_inspection_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_inspection_plans
ALTER TABLE public.qa_ehs_inspection_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_inspection_plans' AND policyname = 'qa_ehs_inspection_plans_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_inspection_plans_tenant_policy ON public.qa_ehs_inspection_plans
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_inspection_record_items
ALTER TABLE public.qa_ehs_inspection_record_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_inspection_record_items' AND policyname = 'qa_ehs_inspection_record_items_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_inspection_record_items_tenant_policy ON public.qa_ehs_inspection_record_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_inspection_records
ALTER TABLE public.qa_ehs_inspection_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_inspection_records' AND policyname = 'qa_ehs_inspection_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_inspection_records_tenant_policy ON public.qa_ehs_inspection_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_material_stocks
ALTER TABLE public.qa_ehs_material_stocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_material_stocks' AND policyname = 'qa_ehs_material_stocks_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_material_stocks_tenant_policy ON public.qa_ehs_material_stocks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_msds
ALTER TABLE public.qa_ehs_msds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_msds' AND policyname = 'qa_ehs_msds_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_msds_tenant_policy ON public.qa_ehs_msds
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_protection_measures
ALTER TABLE public.qa_ehs_protection_measures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_protection_measures' AND policyname = 'qa_ehs_protection_measures_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_protection_measures_tenant_policy ON public.qa_ehs_protection_measures
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_risks
ALTER TABLE public.qa_ehs_risks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_risks' AND policyname = 'qa_ehs_risks_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_risks_tenant_policy ON public.qa_ehs_risks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_stock_records
ALTER TABLE public.qa_ehs_stock_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_stock_records' AND policyname = 'qa_ehs_stock_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_stock_records_tenant_policy ON public.qa_ehs_stock_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_sync_records
ALTER TABLE public.qa_ehs_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_sync_records' AND policyname = 'qa_ehs_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_sync_records_tenant_policy ON public.qa_ehs_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_ehs_trainings
ALTER TABLE public.qa_ehs_trainings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_ehs_trainings' AND policyname = 'qa_ehs_trainings_tenant_policy'
  ) THEN
    CREATE POLICY qa_ehs_trainings_tenant_policy ON public.qa_ehs_trainings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_eightd_audit_logs
ALTER TABLE public.qa_eightd_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_eightd_audit_logs' AND policyname = 'qa_eightd_audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY qa_eightd_audit_logs_tenant_policy ON public.qa_eightd_audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_eightd_reports
ALTER TABLE public.qa_eightd_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_eightd_reports' AND policyname = 'qa_eightd_reports_tenant_policy'
  ) THEN
    CREATE POLICY qa_eightd_reports_tenant_policy ON public.qa_eightd_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_fmea_analyses
ALTER TABLE public.qa_fmea_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_fmea_analyses' AND policyname = 'qa_fmea_analyses_tenant_policy'
  ) THEN
    CREATE POLICY qa_fmea_analyses_tenant_policy ON public.qa_fmea_analyses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_fmea_items
ALTER TABLE public.qa_fmea_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_fmea_items' AND policyname = 'qa_fmea_items_tenant_policy'
  ) THEN
    CREATE POLICY qa_fmea_items_tenant_policy ON public.qa_fmea_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_inspection_audits
ALTER TABLE public.qa_inspection_audits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_inspection_audits' AND policyname = 'qa_inspection_audits_tenant_policy'
  ) THEN
    CREATE POLICY qa_inspection_audits_tenant_policy ON public.qa_inspection_audits
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_inspection_results
ALTER TABLE public.qa_inspection_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_inspection_results' AND policyname = 'qa_inspection_results_tenant_policy'
  ) THEN
    CREATE POLICY qa_inspection_results_tenant_policy ON public.qa_inspection_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_calibration_records
ALTER TABLE public.qa_lab_calibration_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_calibration_records' AND policyname = 'qa_lab_calibration_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_calibration_records_tenant_policy ON public.qa_lab_calibration_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_inspection_reports
ALTER TABLE public.qa_lab_inspection_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_inspection_reports' AND policyname = 'qa_lab_inspection_reports_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_inspection_reports_tenant_policy ON public.qa_lab_inspection_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_instruments
ALTER TABLE public.qa_lab_instruments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_instruments' AND policyname = 'qa_lab_instruments_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_instruments_tenant_policy ON public.qa_lab_instruments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_processes
ALTER TABLE public.qa_lab_processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_processes' AND policyname = 'qa_lab_processes_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_processes_tenant_policy ON public.qa_lab_processes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_reagent_alerts
ALTER TABLE public.qa_lab_reagent_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_reagent_alerts' AND policyname = 'qa_lab_reagent_alerts_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagent_alerts_tenant_policy ON public.qa_lab_reagent_alerts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_reagent_history
ALTER TABLE public.qa_lab_reagent_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_reagent_history' AND policyname = 'qa_lab_reagent_history_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagent_history_tenant_policy ON public.qa_lab_reagent_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_reagents
ALTER TABLE public.qa_lab_reagents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_reagents' AND policyname = 'qa_lab_reagents_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_reagents_tenant_policy ON public.qa_lab_reagents
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_records
ALTER TABLE public.qa_lab_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_records' AND policyname = 'qa_lab_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_records_tenant_policy ON public.qa_lab_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_sample_lifecycle
ALTER TABLE public.qa_lab_sample_lifecycle ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_sample_lifecycle' AND policyname = 'qa_lab_sample_lifecycle_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_sample_lifecycle_tenant_policy ON public.qa_lab_sample_lifecycle
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_samples
ALTER TABLE public.qa_lab_samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_samples' AND policyname = 'qa_lab_samples_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_samples_tenant_policy ON public.qa_lab_samples
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lab_tasks
ALTER TABLE public.qa_lab_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lab_tasks' AND policyname = 'qa_lab_tasks_tenant_policy'
  ) THEN
    CREATE POLICY qa_lab_tasks_tenant_policy ON public.qa_lab_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_lims_sync_records
ALTER TABLE public.qa_lims_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_lims_sync_records' AND policyname = 'qa_lims_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_lims_sync_records_tenant_policy ON public.qa_lims_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_qms_sync_records
ALTER TABLE public.qa_qms_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_qms_sync_records' AND policyname = 'qa_qms_sync_records_tenant_policy'
  ) THEN
    CREATE POLICY qa_qms_sync_records_tenant_policy ON public.qa_qms_sync_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_quality_costs
ALTER TABLE public.qa_quality_costs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_quality_costs' AND policyname = 'qa_quality_costs_tenant_policy'
  ) THEN
    CREATE POLICY qa_quality_costs_tenant_policy ON public.qa_quality_costs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_quality_inspections
ALTER TABLE public.qa_quality_inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_quality_inspections' AND policyname = 'qa_quality_inspections_tenant_policy'
  ) THEN
    CREATE POLICY qa_quality_inspections_tenant_policy ON public.qa_quality_inspections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_spc_charts
ALTER TABLE public.qa_spc_charts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_spc_charts' AND policyname = 'qa_spc_charts_tenant_policy'
  ) THEN
    CREATE POLICY qa_spc_charts_tenant_policy ON public.qa_spc_charts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_spc_data_points
ALTER TABLE public.qa_spc_data_points ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_spc_data_points' AND policyname = 'qa_spc_data_points_tenant_policy'
  ) THEN
    CREATE POLICY qa_spc_data_points_tenant_policy ON public.qa_spc_data_points
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_standard_revisions
ALTER TABLE public.qa_standard_revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_standard_revisions' AND policyname = 'qa_standard_revisions_tenant_policy'
  ) THEN
    CREATE POLICY qa_standard_revisions_tenant_policy ON public.qa_standard_revisions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.qa_standards
ALTER TABLE public.qa_standards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_standards' AND policyname = 'qa_standards_tenant_policy'
  ) THEN
    CREATE POLICY qa_standards_tenant_policy ON public.qa_standards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_inspections
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_inspections' AND policyname = 'quality_inspections_tenant_policy'
  ) THEN
    CREATE POLICY quality_inspections_tenant_policy ON public.quality_inspections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_patrol_items
ALTER TABLE public.quality_patrol_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_patrol_items' AND policyname = 'quality_patrol_items_tenant_policy'
  ) THEN
    CREATE POLICY quality_patrol_items_tenant_policy ON public.quality_patrol_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_patrols
ALTER TABLE public.quality_patrols ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_patrols' AND policyname = 'quality_patrols_tenant_policy'
  ) THEN
    CREATE POLICY quality_patrols_tenant_policy ON public.quality_patrols
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_records
ALTER TABLE public.quality_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_records' AND policyname = 'quality_records_tenant_policy'
  ) THEN
    CREATE POLICY quality_records_tenant_policy ON public.quality_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_standard_values
ALTER TABLE public.quality_standard_values ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_standard_values' AND policyname = 'quality_standard_values_tenant_policy'
  ) THEN
    CREATE POLICY quality_standard_values_tenant_policy ON public.quality_standard_values
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_standards
ALTER TABLE public.quality_standards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_standards' AND policyname = 'quality_standards_tenant_policy'
  ) THEN
    CREATE POLICY quality_standards_tenant_policy ON public.quality_standards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_tasks
ALTER TABLE public.quality_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_tasks' AND policyname = 'quality_tasks_tenant_policy'
  ) THEN
    CREATE POLICY quality_tasks_tenant_policy ON public.quality_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.quality_traceability_records
ALTER TABLE public.quality_traceability_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_traceability_records' AND policyname = 'quality_traceability_records_tenant_policy'
  ) THEN
    CREATE POLICY quality_traceability_records_tenant_policy ON public.quality_traceability_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.receivables
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'receivables' AND policyname = 'receivables_tenant_policy'
  ) THEN
    CREATE POLICY receivables_tenant_policy ON public.receivables
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.refresh_tokens
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refresh_tokens' AND policyname = 'refresh_tokens_tenant_policy'
  ) THEN
    CREATE POLICY refresh_tokens_tenant_policy ON public.refresh_tokens
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_data
ALTER TABLE public.report_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_data' AND policyname = 'report_data_tenant_policy'
  ) THEN
    CREATE POLICY report_data_tenant_policy ON public.report_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_execution_records
ALTER TABLE public.report_execution_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_execution_records' AND policyname = 'report_execution_records_tenant_policy'
  ) THEN
    CREATE POLICY report_execution_records_tenant_policy ON public.report_execution_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_schedule_history
ALTER TABLE public.report_schedule_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_schedule_history' AND policyname = 'report_schedule_history_tenant_policy'
  ) THEN
    CREATE POLICY report_schedule_history_tenant_policy ON public.report_schedule_history
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_schedules
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_schedules' AND policyname = 'report_schedules_tenant_policy'
  ) THEN
    CREATE POLICY report_schedules_tenant_policy ON public.report_schedules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_subscriptions
ALTER TABLE public.report_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_subscriptions' AND policyname = 'report_subscriptions_tenant_policy'
  ) THEN
    CREATE POLICY report_subscriptions_tenant_policy ON public.report_subscriptions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.report_templates
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_templates' AND policyname = 'report_templates_tenant_policy'
  ) THEN
    CREATE POLICY report_templates_tenant_policy ON public.report_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_tenant_policy'
  ) THEN
    CREATE POLICY reports_tenant_policy ON public.reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.saved_analysis_results
ALTER TABLE public.saved_analysis_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'saved_analysis_results' AND policyname = 'saved_analysis_results_tenant_policy'
  ) THEN
    CREATE POLICY saved_analysis_results_tenant_policy ON public.saved_analysis_results
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.scan_records
ALTER TABLE public.scan_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scan_records' AND policyname = 'scan_records_tenant_policy'
  ) THEN
    CREATE POLICY scan_records_tenant_policy ON public.scan_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.stocktake_records
ALTER TABLE public.stocktake_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stocktake_records' AND policyname = 'stocktake_records_tenant_policy'
  ) THEN
    CREATE POLICY stocktake_records_tenant_policy ON public.stocktake_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.stocktake_tasks
ALTER TABLE public.stocktake_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stocktake_tasks' AND policyname = 'stocktake_tasks_tenant_policy'
  ) THEN
    CREATE POLICY stocktake_tasks_tenant_policy ON public.stocktake_tasks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.supplier_evaluations
ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'supplier_evaluations' AND policyname = 'supplier_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY supplier_evaluations_tenant_policy ON public.supplier_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'suppliers_tenant_policy'
  ) THEN
    CREATE POLICY suppliers_tenant_policy ON public.suppliers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.sync_policies
ALTER TABLE public.sync_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sync_policies' AND policyname = 'sync_policies_tenant_policy'
  ) THEN
    CREATE POLICY sync_policies_tenant_policy ON public.sync_policies
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'team_members_tenant_policy'
  ) THEN
    CREATE POLICY team_members_tenant_policy ON public.team_members
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'teams_tenant_policy'
  ) THEN
    CREATE POLICY teams_tenant_policy ON public.teams
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenants_tenant_policy'
  ) THEN
    CREATE POLICY tenants_tenant_policy ON public.tenants
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.versions
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'versions' AND policyname = 'versions_tenant_policy'
  ) THEN
    CREATE POLICY versions_tenant_policy ON public.versions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.video_recordings
ALTER TABLE public.video_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'video_recordings' AND policyname = 'video_recordings_tenant_policy'
  ) THEN
    CREATE POLICY video_recordings_tenant_policy ON public.video_recordings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.visualization_data
ALTER TABLE public.visualization_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visualization_data' AND policyname = 'visualization_data_tenant_policy'
  ) THEN
    CREATE POLICY visualization_data_tenant_policy ON public.visualization_data
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.visualizations
ALTER TABLE public.visualizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'visualizations' AND policyname = 'visualizations_tenant_policy'
  ) THEN
    CREATE POLICY visualizations_tenant_policy ON public.visualizations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.voucher_items
ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_items' AND policyname = 'voucher_items_tenant_policy'
  ) THEN
    CREATE POLICY voucher_items_tenant_policy ON public.voucher_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.warehouse_locations
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'warehouse_locations' AND policyname = 'warehouse_locations_tenant_policy'
  ) THEN
    CREATE POLICY warehouse_locations_tenant_policy ON public.warehouse_locations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'warehouses' AND policyname = 'warehouses_tenant_policy'
  ) THEN
    CREATE POLICY warehouses_tenant_policy ON public.warehouses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.wip_transfers
ALTER TABLE public.wip_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wip_transfers' AND policyname = 'wip_transfers_tenant_policy'
  ) THEN
    CREATE POLICY wip_transfers_tenant_policy ON public.wip_transfers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.wips
ALTER TABLE public.wips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wips' AND policyname = 'wips_tenant_policy'
  ) THEN
    CREATE POLICY wips_tenant_policy ON public.wips
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'work_orders' AND policyname = 'work_orders_tenant_policy'
  ) THEN
    CREATE POLICY work_orders_tenant_policy ON public.work_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.work_reports
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'work_reports' AND policyname = 'work_reports_tenant_policy'
  ) THEN
    CREATE POLICY work_reports_tenant_policy ON public.work_reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- public.work_stations
ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'work_stations' AND policyname = 'work_stations_tenant_policy'
  ) THEN
    CREATE POLICY work_stations_tenant_policy ON public.work_stations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: qms (7 tables)
-- -----------------------------------------------------------------------

-- qms.audit_logs
ALTER TABLE qms.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON qms.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.corrective_actions
ALTER TABLE qms.corrective_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'corrective_actions' AND policyname = 'corrective_actions_tenant_policy'
  ) THEN
    CREATE POLICY corrective_actions_tenant_policy ON qms.corrective_actions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.dashboard_metrics
ALTER TABLE qms.dashboard_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'dashboard_metrics' AND policyname = 'dashboard_metrics_tenant_policy'
  ) THEN
    CREATE POLICY dashboard_metrics_tenant_policy ON qms.dashboard_metrics
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.inspection_items
ALTER TABLE qms.inspection_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'inspection_items' AND policyname = 'inspection_items_tenant_policy'
  ) THEN
    CREATE POLICY inspection_items_tenant_policy ON qms.inspection_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.quality_inspections
ALTER TABLE qms.quality_inspections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'quality_inspections' AND policyname = 'quality_inspections_tenant_policy'
  ) THEN
    CREATE POLICY quality_inspections_tenant_policy ON qms.quality_inspections
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.quality_issues
ALTER TABLE qms.quality_issues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'quality_issues' AND policyname = 'quality_issues_tenant_policy'
  ) THEN
    CREATE POLICY quality_issues_tenant_policy ON qms.quality_issues
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- qms.quality_standards
ALTER TABLE qms.quality_standards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'qms' AND tablename = 'quality_standards' AND policyname = 'quality_standards_tenant_policy'
  ) THEN
    CREATE POLICY quality_standards_tenant_policy ON qms.quality_standards
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: report (4 tables)
-- -----------------------------------------------------------------------

-- report.report_exports
ALTER TABLE report.report_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'report' AND tablename = 'report_exports' AND policyname = 'report_exports_tenant_policy'
  ) THEN
    CREATE POLICY report_exports_tenant_policy ON report.report_exports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- report.report_templates
ALTER TABLE report.report_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'report' AND tablename = 'report_templates' AND policyname = 'report_templates_tenant_policy'
  ) THEN
    CREATE POLICY report_templates_tenant_policy ON report.report_templates
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- report.report_type_configs
ALTER TABLE report.report_type_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'report' AND tablename = 'report_type_configs' AND policyname = 'report_type_configs_tenant_policy'
  ) THEN
    CREATE POLICY report_type_configs_tenant_policy ON report.report_type_configs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- report.reports
ALTER TABLE report.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'report' AND tablename = 'reports' AND policyname = 'reports_tenant_policy'
  ) THEN
    CREATE POLICY reports_tenant_policy ON report.reports
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: rs (7 tables)
-- -----------------------------------------------------------------------

-- rs.audit_logs
ALTER TABLE rs.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON rs.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.experiments
ALTER TABLE rs.experiments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'experiments' AND policyname = 'experiments_tenant_policy'
  ) THEN
    CREATE POLICY experiments_tenant_policy ON rs.experiments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.formulas
ALTER TABLE rs.formulas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'formulas' AND policyname = 'formulas_tenant_policy'
  ) THEN
    CREATE POLICY formulas_tenant_policy ON rs.formulas
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.project_members
ALTER TABLE rs.project_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'project_members' AND policyname = 'project_members_tenant_policy'
  ) THEN
    CREATE POLICY project_members_tenant_policy ON rs.project_members
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.project_milestones
ALTER TABLE rs.project_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'project_milestones' AND policyname = 'project_milestones_tenant_policy'
  ) THEN
    CREATE POLICY project_milestones_tenant_policy ON rs.project_milestones
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.project_phases
ALTER TABLE rs.project_phases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'project_phases' AND policyname = 'project_phases_tenant_policy'
  ) THEN
    CREATE POLICY project_phases_tenant_policy ON rs.project_phases
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- rs.projects
ALTER TABLE rs.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'rs' AND tablename = 'projects' AND policyname = 'projects_tenant_policy'
  ) THEN
    CREATE POLICY projects_tenant_policy ON rs.projects
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: scm (6 tables)
-- -----------------------------------------------------------------------

-- scm.audit_logs
ALTER TABLE scm.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON scm.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- scm.purchase_items
ALTER TABLE scm.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'purchase_items' AND policyname = 'purchase_items_tenant_policy'
  ) THEN
    CREATE POLICY purchase_items_tenant_policy ON scm.purchase_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- scm.purchase_orders
ALTER TABLE scm.purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'purchase_orders' AND policyname = 'purchase_orders_tenant_policy'
  ) THEN
    CREATE POLICY purchase_orders_tenant_policy ON scm.purchase_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- scm.supplier_delivery_appointments
ALTER TABLE scm.supplier_delivery_appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'supplier_delivery_appointments' AND policyname = 'supplier_delivery_appointments_tenant_policy'
  ) THEN
    CREATE POLICY supplier_delivery_appointments_tenant_policy ON scm.supplier_delivery_appointments
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- scm.supplier_evaluations
ALTER TABLE scm.supplier_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'supplier_evaluations' AND policyname = 'supplier_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY supplier_evaluations_tenant_policy ON scm.supplier_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- scm.suppliers
ALTER TABLE scm.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'scm' AND tablename = 'suppliers' AND policyname = 'suppliers_tenant_policy'
  ) THEN
    CREATE POLICY suppliers_tenant_policy ON scm.suppliers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: srm (8 tables)
-- -----------------------------------------------------------------------

-- srm.audit_logs
ALTER TABLE srm.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON srm.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.contract_terms
ALTER TABLE srm.contract_terms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'contract_terms' AND policyname = 'contract_terms_tenant_policy'
  ) THEN
    CREATE POLICY contract_terms_tenant_policy ON srm.contract_terms
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.purchase_orders
ALTER TABLE srm.purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'purchase_orders' AND policyname = 'purchase_orders_tenant_policy'
  ) THEN
    CREATE POLICY purchase_orders_tenant_policy ON srm.purchase_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.supplier_categories
ALTER TABLE srm.supplier_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_categories' AND policyname = 'supplier_categories_tenant_policy'
  ) THEN
    CREATE POLICY supplier_categories_tenant_policy ON srm.supplier_categories
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.supplier_contracts
ALTER TABLE srm.supplier_contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_contracts' AND policyname = 'supplier_contracts_tenant_policy'
  ) THEN
    CREATE POLICY supplier_contracts_tenant_policy ON srm.supplier_contracts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.supplier_evaluations
ALTER TABLE srm.supplier_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_evaluations' AND policyname = 'supplier_evaluations_tenant_policy'
  ) THEN
    CREATE POLICY supplier_evaluations_tenant_policy ON srm.supplier_evaluations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.supplier_products
ALTER TABLE srm.supplier_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_products' AND policyname = 'supplier_products_tenant_policy'
  ) THEN
    CREATE POLICY supplier_products_tenant_policy ON srm.supplier_products
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- srm.suppliers
ALTER TABLE srm.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'suppliers' AND policyname = 'suppliers_tenant_policy'
  ) THEN
    CREATE POLICY suppliers_tenant_policy ON srm.suppliers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: storage (3 tables)
-- -----------------------------------------------------------------------

-- storage.backends
ALTER TABLE storage.backends ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'backends' AND policyname = 'backends_tenant_policy'
  ) THEN
    CREATE POLICY backends_tenant_policy ON storage.backends
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- storage.file_permissions
ALTER TABLE storage.file_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'file_permissions' AND policyname = 'file_permissions_tenant_policy'
  ) THEN
    CREATE POLICY file_permissions_tenant_policy ON storage.file_permissions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- storage.files
ALTER TABLE storage.files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'files' AND policyname = 'files_tenant_policy'
  ) THEN
    CREATE POLICY files_tenant_policy ON storage.files
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Schema: wms (28 tables)
-- -----------------------------------------------------------------------

-- wms.audit_logs
ALTER TABLE wms.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'audit_logs' AND policyname = 'audit_logs_tenant_policy'
  ) THEN
    CREATE POLICY audit_logs_tenant_policy ON wms.audit_logs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.batches
ALTER TABLE wms.batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'batches' AND policyname = 'batches_tenant_policy'
  ) THEN
    CREATE POLICY batches_tenant_policy ON wms.batches
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.cycle_count_configs
ALTER TABLE wms.cycle_count_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'cycle_count_configs' AND policyname = 'cycle_count_configs_tenant_policy'
  ) THEN
    CREATE POLICY cycle_count_configs_tenant_policy ON wms.cycle_count_configs
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.discrepancy_records
ALTER TABLE wms.discrepancy_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'discrepancy_records' AND policyname = 'discrepancy_records_tenant_policy'
  ) THEN
    CREATE POLICY discrepancy_records_tenant_policy ON wms.discrepancy_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inbound_order_items
ALTER TABLE wms.inbound_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inbound_order_items' AND policyname = 'inbound_order_items_tenant_policy'
  ) THEN
    CREATE POLICY inbound_order_items_tenant_policy ON wms.inbound_order_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inbound_orders
ALTER TABLE wms.inbound_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inbound_orders' AND policyname = 'inbound_orders_tenant_policy'
  ) THEN
    CREATE POLICY inbound_orders_tenant_policy ON wms.inbound_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inventory
ALTER TABLE wms.inventory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inventory' AND policyname = 'inventory_tenant_policy'
  ) THEN
    CREATE POLICY inventory_tenant_policy ON wms.inventory
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inventory_alert_records
ALTER TABLE wms.inventory_alert_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inventory_alert_records' AND policyname = 'inventory_alert_records_tenant_policy'
  ) THEN
    CREATE POLICY inventory_alert_records_tenant_policy ON wms.inventory_alert_records
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inventory_alert_rules
ALTER TABLE wms.inventory_alert_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inventory_alert_rules' AND policyname = 'inventory_alert_rules_tenant_policy'
  ) THEN
    CREATE POLICY inventory_alert_rules_tenant_policy ON wms.inventory_alert_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.inventory_alerts
ALTER TABLE wms.inventory_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'inventory_alerts' AND policyname = 'inventory_alerts_tenant_policy'
  ) THEN
    CREATE POLICY inventory_alerts_tenant_policy ON wms.inventory_alerts
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.locations
ALTER TABLE wms.locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'locations' AND policyname = 'locations_tenant_policy'
  ) THEN
    CREATE POLICY locations_tenant_policy ON wms.locations
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.outbound_order_items
ALTER TABLE wms.outbound_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'outbound_order_items' AND policyname = 'outbound_order_items_tenant_policy'
  ) THEN
    CREATE POLICY outbound_order_items_tenant_policy ON wms.outbound_order_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.outbound_orders
ALTER TABLE wms.outbound_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'outbound_orders' AND policyname = 'outbound_orders_tenant_policy'
  ) THEN
    CREATE POLICY outbound_orders_tenant_policy ON wms.outbound_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.replenishment_order_items
ALTER TABLE wms.replenishment_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'replenishment_order_items' AND policyname = 'replenishment_order_items_tenant_policy'
  ) THEN
    CREATE POLICY replenishment_order_items_tenant_policy ON wms.replenishment_order_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.replenishment_orders
ALTER TABLE wms.replenishment_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'replenishment_orders' AND policyname = 'replenishment_orders_tenant_policy'
  ) THEN
    CREATE POLICY replenishment_orders_tenant_policy ON wms.replenishment_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.replenishment_rules
ALTER TABLE wms.replenishment_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'replenishment_rules' AND policyname = 'replenishment_rules_tenant_policy'
  ) THEN
    CREATE POLICY replenishment_rules_tenant_policy ON wms.replenishment_rules
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.replenishment_suggestions
ALTER TABLE wms.replenishment_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'replenishment_suggestions' AND policyname = 'replenishment_suggestions_tenant_policy'
  ) THEN
    CREATE POLICY replenishment_suggestions_tenant_policy ON wms.replenishment_suggestions
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.safety_stock_settings
ALTER TABLE wms.safety_stock_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'safety_stock_settings' AND policyname = 'safety_stock_settings_tenant_policy'
  ) THEN
    CREATE POLICY safety_stock_settings_tenant_policy ON wms.safety_stock_settings
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.serial_numbers
ALTER TABLE wms.serial_numbers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'serial_numbers' AND policyname = 'serial_numbers_tenant_policy'
  ) THEN
    CREATE POLICY serial_numbers_tenant_policy ON wms.serial_numbers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.stock_take_items
ALTER TABLE wms.stock_take_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'stock_take_items' AND policyname = 'stock_take_items_tenant_policy'
  ) THEN
    CREATE POLICY stock_take_items_tenant_policy ON wms.stock_take_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.stock_takes
ALTER TABLE wms.stock_takes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'stock_takes' AND policyname = 'stock_takes_tenant_policy'
  ) THEN
    CREATE POLICY stock_takes_tenant_policy ON wms.stock_takes
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.transfer_items
ALTER TABLE wms.transfer_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'transfer_items' AND policyname = 'transfer_items_tenant_policy'
  ) THEN
    CREATE POLICY transfer_items_tenant_policy ON wms.transfer_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.transfer_order_items
ALTER TABLE wms.transfer_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'transfer_order_items' AND policyname = 'transfer_order_items_tenant_policy'
  ) THEN
    CREATE POLICY transfer_order_items_tenant_policy ON wms.transfer_order_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.transfer_orders
ALTER TABLE wms.transfer_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'transfer_orders' AND policyname = 'transfer_orders_tenant_policy'
  ) THEN
    CREATE POLICY transfer_orders_tenant_policy ON wms.transfer_orders
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.transfers
ALTER TABLE wms.transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'transfers' AND policyname = 'transfers_tenant_policy'
  ) THEN
    CREATE POLICY transfers_tenant_policy ON wms.transfers
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.warehouses
ALTER TABLE wms.warehouses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'warehouses' AND policyname = 'warehouses_tenant_policy'
  ) THEN
    CREATE POLICY warehouses_tenant_policy ON wms.warehouses
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.wave_pick_items
ALTER TABLE wms.wave_pick_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'wave_pick_items' AND policyname = 'wave_pick_items_tenant_policy'
  ) THEN
    CREATE POLICY wave_pick_items_tenant_policy ON wms.wave_pick_items
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- wms.wave_picks
ALTER TABLE wms.wave_picks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'wms' AND tablename = 'wave_picks' AND policyname = 'wave_picks_tenant_policy'
  ) THEN
    CREATE POLICY wave_picks_tenant_policy ON wms.wave_picks
      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: Verification
-- ============================================================================

DO $$
DECLARE
  v_with_tenant BIGINT;
  v_without_tenant BIGINT;
  v_total BIGINT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE has_tenant),
    COUNT(*) FILTER (WHERE NOT has_tenant),
    COUNT(*)
  INTO v_with_tenant, v_without_tenant, v_total
  FROM (
    SELECT DISTINCT t.table_schema, t.table_name,
      EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = t.table_schema
          AND c.table_name = t.table_name
          AND c.column_name = 'tenant_id'
      ) AS has_tenant
    FROM information_schema.tables t
    WHERE t.table_schema NOT IN ('pg_catalog','information_schema','topems_shared')
      AND t.table_type = 'BASE TABLE'
  ) sub;

  RAISE NOTICE '=== TENANT_ID MIGRATION VERIFICATION ===';
  RAISE NOTICE 'Tables WITH tenant_id:    %', v_with_tenant;
  RAISE NOTICE 'Tables WITHOUT tenant_id: %', v_without_tenant;
  RAISE NOTICE 'Total business tables:    %', v_total;
  RAISE NOTICE 'Coverage: %%%', ROUND(v_with_tenant::numeric / v_total * 100, 1);

  IF v_without_tenant > 0 THEN
    RAISE WARNING 'Some tables still missing tenant_id!';
  ELSE
    RAISE NOTICE 'All business tables have tenant_id!';
  END IF;
END $$;

COMMIT;
