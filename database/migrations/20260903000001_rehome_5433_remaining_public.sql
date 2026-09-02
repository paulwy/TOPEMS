-- 2026-09-03 运行库(5433)剩余 public 影子清理：对齐 5432 治理后结构
-- 5433 public 163 张 → 归位 123 张（finance/lims/pdm/report/bi/gis）+ DROP 冲突 4 张 + 保留 36 张（5432 同在 public）
-- 全部目标表已核验 0 行（无数据丢失）；5432 各服务 schema 有权威副本
-- 执行时机：停服后或在线（0 行表 SET SCHEMA 无锁竞争风险）

CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS report;

-- 1. 归位 finance 58 张
ALTER TABLE public."core_finance_accounts" SET SCHEMA finance;
ALTER TABLE public."core_finance_approval_workflows" SET SCHEMA finance;
ALTER TABLE public."core_finance_aux_accounts" SET SCHEMA finance;
ALTER TABLE public."core_finance_aux_balances" SET SCHEMA finance;
ALTER TABLE public."core_finance_ledger" SET SCHEMA finance;
ALTER TABLE public."core_finance_periods" SET SCHEMA finance;
ALTER TABLE public."core_finance_reconciliation_items" SET SCHEMA finance;
ALTER TABLE public."core_finance_reconciliation_sessions" SET SCHEMA finance;
ALTER TABLE public."core_finance_voucher_lines" SET SCHEMA finance;
ALTER TABLE public."core_finance_vouchers" SET SCHEMA finance;
ALTER TABLE public."finance_v54_fraud_rules" SET SCHEMA finance;
ALTER TABLE public."finance_v54_fraud_scores" SET SCHEMA finance;
ALTER TABLE public."finance_v54_review_results" SET SCHEMA finance;
ALTER TABLE public."finance_v54_review_rules" SET SCHEMA finance;
ALTER TABLE public."finance_v54_review_workflows" SET SCHEMA finance;
ALTER TABLE public."finance_v54_risk_alerts" SET SCHEMA finance;
ALTER TABLE public."finance_v54_risk_indicators" SET SCHEMA finance;
ALTER TABLE public."finance_v55_invoice_items" SET SCHEMA finance;
ALTER TABLE public."finance_v55_invoices" SET SCHEMA finance;
ALTER TABLE public."finance_v55_payment_requests" SET SCHEMA finance;
ALTER TABLE public."finance_v55_payment_results" SET SCHEMA finance;
ALTER TABLE public."finance_v55_reconciliation_results" SET SCHEMA finance;
ALTER TABLE public."finance_v55_reconciliation_rules" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_brackets" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_forms" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_lines" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_plans" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_rates" SET SCHEMA finance;
ALTER TABLE public."finance_v56_tax_suggestions" SET SCHEMA finance;
ALTER TABLE public."finance_v57_analysis_dimensions" SET SCHEMA finance;
ALTER TABLE public."finance_v57_analysis_results" SET SCHEMA finance;
ALTER TABLE public."finance_v57_forecast_models" SET SCHEMA finance;
ALTER TABLE public."finance_v57_generated_reports" SET SCHEMA finance;
ALTER TABLE public."finance_v57_insights" SET SCHEMA finance;
ALTER TABLE public."finance_v57_report_templates" SET SCHEMA finance;
ALTER TABLE public."finance_v58_cash_pools" SET SCHEMA finance;
ALTER TABLE public."finance_v58_forecast_results" SET SCHEMA finance;
ALTER TABLE public."finance_v58_forecast_scenarios" SET SCHEMA finance;
ALTER TABLE public."finance_v58_liquidity_targets" SET SCHEMA finance;
ALTER TABLE public."finance_v58_optimization_results" SET SCHEMA finance;
ALTER TABLE public."finance_v58_pool_allocations" SET SCHEMA finance;
ALTER TABLE public."finance_v58_pool_transfers" SET SCHEMA finance;
ALTER TABLE public."finance_v59_credit_profiles" SET SCHEMA finance;
ALTER TABLE public."finance_v59_device_profiles" SET SCHEMA finance;
ALTER TABLE public."finance_v59_fraud_decisions" SET SCHEMA finance;
ALTER TABLE public."finance_v59_fraud_rules" SET SCHEMA finance;
ALTER TABLE public."finance_v59_fraud_signals" SET SCHEMA finance;
ALTER TABLE public."finance_v59_scoring_models" SET SCHEMA finance;
ALTER TABLE public."finance_v59_stress_results" SET SCHEMA finance;
ALTER TABLE public."finance_v59_stress_scenarios" SET SCHEMA finance;
ALTER TABLE public."finance_v60_alert_channels" SET SCHEMA finance;
ALTER TABLE public."finance_v60_alert_rules" SET SCHEMA finance;
ALTER TABLE public."finance_v60_alerts" SET SCHEMA finance;
ALTER TABLE public."finance_v60_decision_results" SET SCHEMA finance;
ALTER TABLE public."finance_v60_decision_scenarios" SET SCHEMA finance;
ALTER TABLE public."finance_v60_schedule_dependencies" SET SCHEMA finance;
ALTER TABLE public."finance_v60_schedule_executions" SET SCHEMA finance;
ALTER TABLE public."finance_v60_schedule_tasks" SET SCHEMA finance;

-- 2. 归位 lims 31 张
ALTER TABLE public."qa_lab_calibration_records" SET SCHEMA lims;
ALTER TABLE public."qa_lab_inspection_reports" SET SCHEMA lims;
ALTER TABLE public."qa_lab_instruments" SET SCHEMA lims;
ALTER TABLE public."qa_lab_processes" SET SCHEMA lims;
ALTER TABLE public."qa_lab_reagent_alerts" SET SCHEMA lims;
ALTER TABLE public."qa_lab_reagent_history" SET SCHEMA lims;
ALTER TABLE public."qa_lab_reagents" SET SCHEMA lims;
ALTER TABLE public."qa_lab_records" SET SCHEMA lims;
ALTER TABLE public."qa_lab_sample_lifecycle" SET SCHEMA lims;
ALTER TABLE public."qa_lab_samples" SET SCHEMA lims;
ALTER TABLE public."qa_lab_tasks" SET SCHEMA lims;
ALTER TABLE public."qa_lims_audit_logs" SET SCHEMA lims;
ALTER TABLE public."qa_lims_barcode_scan_records" SET SCHEMA lims;
ALTER TABLE public."qa_lims_collection_tasks" SET SCHEMA lims;
ALTER TABLE public."qa_lims_instrument_data" SET SCHEMA lims;
ALTER TABLE public."qa_lims_method_categories" SET SCHEMA lims;
ALTER TABLE public."qa_lims_method_validations" SET SCHEMA lims;
ALTER TABLE public."qa_lims_method_versions" SET SCHEMA lims;
ALTER TABLE public."qa_lims_parse_rules" SET SCHEMA lims;
ALTER TABLE public."qa_lims_pt_corrective_actions" SET SCHEMA lims;
ALTER TABLE public."qa_lims_pt_evaluations" SET SCHEMA lims;
ALTER TABLE public."qa_lims_pt_plans" SET SCHEMA lims;
ALTER TABLE public."qa_lims_pt_results" SET SCHEMA lims;
ALTER TABLE public."qa_lims_pt_samples" SET SCHEMA lims;
ALTER TABLE public."qa_lims_rfid_tags" SET SCHEMA lims;
ALTER TABLE public."qa_lims_sample_barcodes" SET SCHEMA lims;
ALTER TABLE public."qa_lims_sync_records" SET SCHEMA lims;
ALTER TABLE public."qa_lims_test_methods" SET SCHEMA lims;
ALTER TABLE public."qa_lims_uncertainty_components" SET SCHEMA lims;
ALTER TABLE public."qa_lims_uncertainty_projects" SET SCHEMA lims;
ALTER TABLE public."qa_lims_uncertainty_sources" SET SCHEMA lims;

-- 3. 归位 pdm 19 张
ALTER TABLE public."pdm_bom_items" SET SCHEMA pdm;
ALTER TABLE public."pdm_boms" SET SCHEMA pdm;
ALTER TABLE public."pdm_change_notices" SET SCHEMA pdm;
ALTER TABLE public."pdm_configurations" SET SCHEMA pdm;
ALTER TABLE public."pdm_document_versions" SET SCHEMA pdm;
ALTER TABLE public."pdm_documents" SET SCHEMA pdm;
ALTER TABLE public."pdm_master_data_refs" SET SCHEMA pdm;
ALTER TABLE public."pdm_materials" SET SCHEMA pdm;
ALTER TABLE public."pdm_production_batches" SET SCHEMA pdm;
ALTER TABLE public."pdm_production_formulas" SET SCHEMA pdm;
ALTER TABLE public."pdm_production_processes" SET SCHEMA pdm;
ALTER TABLE public."pdm_production_steps" SET SCHEMA pdm;
ALTER TABLE public."pdm_products" SET SCHEMA pdm;
ALTER TABLE public."pdm_project_members" SET SCHEMA pdm;
ALTER TABLE public."pdm_project_phases" SET SCHEMA pdm;
ALTER TABLE public."pdm_projects" SET SCHEMA pdm;
ALTER TABLE public."pdm_versions" SET SCHEMA pdm;
ALTER TABLE public."pdm_workflow_instances" SET SCHEMA pdm;
ALTER TABLE public."pdm_workflows" SET SCHEMA pdm;

-- 4. 归位 report 1 张
ALTER TABLE public."report_templates" SET SCHEMA report;

-- 5. 归位 bi 13 张（analytics_*，bi schema 无同名）
ALTER TABLE public."analytics_comparison_analyses" SET SCHEMA bi;
ALTER TABLE public."analytics_comparison_results" SET SCHEMA bi;
ALTER TABLE public."analytics_dashboard_shares" SET SCHEMA bi;
ALTER TABLE public."analytics_dashboard_templates" SET SCHEMA bi;
ALTER TABLE public."analytics_dashboards" SET SCHEMA bi;
ALTER TABLE public."analytics_datasets" SET SCHEMA bi;
ALTER TABLE public."analytics_datasources" SET SCHEMA bi;
ALTER TABLE public."analytics_drilldown_history" SET SCHEMA bi;
ALTER TABLE public."analytics_drilldown_paths" SET SCHEMA bi;
ALTER TABLE public."analytics_row_level_permissions" SET SCHEMA bi;
ALTER TABLE public."analytics_self_service_reports" SET SCHEMA bi;
ALTER TABLE public."analytics_sync_records" SET SCHEMA bi;
ALTER TABLE public."analytics_widgets" SET SCHEMA bi;

-- 6. 归位 gis 1 张
ALTER TABLE public."audit_logs" SET SCHEMA gis;

-- 7. DROP public 冲突残留 4 张（bi schema 已有权威副本）
DROP TABLE IF EXISTS public."report_execution_records";
DROP TABLE IF EXISTS public."report_schedules";
DROP TABLE IF EXISTS public."report_subscriptions";
DROP TABLE IF EXISTS public."reports";
