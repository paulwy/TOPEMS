-- ============================================================================
-- 20261007000014 — 约束级最终收敛（5433 空库重放缺口补链）
-- ============================================================================
-- 背景（②重建验证约束级最终复核）:
--   * 表级（0006/0009）+ 列级（0010-0013）收敛后，约束对拍仍暴露 482 条
--     差异（5432 演进库有/5433 纯链态无）:
--       NOT NULL 414（5432 服务运行时 schema_defense 已收紧、5433 迁移链
--       建表未收紧——列/表计数口径捕捉不到，需约束级补链）
--       FK 60（bi/finance 等运行时 DDL 建的 tenant_id/schedule_id 外键）
--       PK 7 + CHECK 1（对齐 5432 定义）
--   * 目标: 5433 补链后约束对拍归零，结构三要素（表/列/约束）完全收敛。
-- 本迁移（幂等，5433 空库补、5432 no-op）:
--   SET NOT NULL 直连（幂等）；PK/FK/CHECK 用 DO $$ 块按 conname+conrelid
--   存在性检查（PG 不支持 ADD CONSTRAINT IF NOT EXISTS）。
-- ============================================================================

-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@127.0.0.1:5433/topems
-- 同表缺失约束: 482（PK 7 / FK 60 / UNIQUE 0 / CHECK 1 / NOT NULL 414）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

ALTER TABLE "bi"."analytics_comparison_analyses" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_comparison_analyses" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_dashboard_shares" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_dashboard_templates" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_dashboard_templates" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_dashboards" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_dashboards" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_datasets" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_datasets" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_datasources" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_datasources" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_drilldown_history" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_drilldown_paths" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_drilldown_paths" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_row_level_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_row_level_permissions" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_self_service_reports" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_self_service_reports" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_sync_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_sync_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_widgets" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "bi"."analytics_widgets" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "bi"."audit_logs" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_execution_records_schedule_id_fkey' AND conrelid = '"bi"."report_execution_records"'::regclass) THEN
        ALTER TABLE "bi"."report_execution_records" ADD CONSTRAINT "report_execution_records_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES bi.report_schedules(id);
    END IF;
END $$;
ALTER TABLE "bi"."report_subscriptions" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_subscriptions_template_id_fkey' AND conrelid = '"bi"."report_subscriptions"'::regclass) THEN
        ALTER TABLE "bi"."report_subscriptions" ADD CONSTRAINT "report_subscriptions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES bi.report_templates(id);
    END IF;
END $$;
ALTER TABLE "core"."core_plugin_categories" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_reviews" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_reviews" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugins" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugins" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."crm_master_data_refs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."crm_master_data_refs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accident_investigations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accident_investigations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accident_reviews" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accident_treatments" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accident_treatments" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accidents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_accidents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_compliance_evaluations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_compliance_evaluations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_compliance_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_contraindications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_contraindications" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_detection_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_detection_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_discharge_permits" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_discharge_permits" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_disease_cases" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_disease_cases" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_evaluations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_problems" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_problems" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_drill_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_emergency_plan_approvals" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_emergency_plan_supplies" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_emergency_plan_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_emergency_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_emergency_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_env_monitor_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_env_monitor_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environment" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environment" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environment_incidents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environment_incidents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environmental_regulations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_environmental_regulations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazard_rectifications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazard_rectifications" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazard_verifications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_abnormalities" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_abnormalities" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_exam_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_exam_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_exam_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_exam_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_trainings" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_health_trainings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_items" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_record_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_inspection_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_material_stocks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_material_stocks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_msds" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_protection_measures" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_protection_measures" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_risks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_risks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_stock_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_sync_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_sync_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_trainings" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_trainings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "erp"."erp_master_data_refs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "erp"."erp_master_data_refs" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_fraud_rules_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_fraud_rules"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_fraud_rules" ADD CONSTRAINT "finance_v54_fraud_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_fraud_scores_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_fraud_scores"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_fraud_scores" ADD CONSTRAINT "finance_v54_fraud_scores_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_review_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_review_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_review_results" ADD CONSTRAINT "finance_v54_review_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_review_rules_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_review_rules"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_review_rules" ADD CONSTRAINT "finance_v54_review_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_review_workflows_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_review_workflows"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_review_workflows" ADD CONSTRAINT "finance_v54_review_workflows_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_risk_alerts_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_risk_alerts"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_risk_alerts" ADD CONSTRAINT "finance_v54_risk_alerts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v54_risk_indicators_tenant_id_fkey' AND conrelid = '"finance"."finance_v54_risk_indicators"'::regclass) THEN
        ALTER TABLE "finance"."finance_v54_risk_indicators" ADD CONSTRAINT "finance_v54_risk_indicators_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_invoice_items_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_invoice_items"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_invoice_items" ADD CONSTRAINT "finance_v55_invoice_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_invoices_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_invoices"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_invoices" ADD CONSTRAINT "finance_v55_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_payment_requests_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_payment_requests"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_payment_requests" ADD CONSTRAINT "finance_v55_payment_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_payment_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_payment_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_payment_results" ADD CONSTRAINT "finance_v55_payment_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_reconciliation_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_reconciliation_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_results" ADD CONSTRAINT "finance_v55_reconciliation_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v55_reconciliation_rules_tenant_id_fkey' AND conrelid = '"finance"."finance_v55_reconciliation_rules"'::regclass) THEN
        ALTER TABLE "finance"."finance_v55_reconciliation_rules" ADD CONSTRAINT "finance_v55_reconciliation_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_brackets_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_brackets"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_brackets" ADD CONSTRAINT "finance_v56_tax_brackets_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_forms_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_forms"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_forms" ADD CONSTRAINT "finance_v56_tax_forms_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_lines_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_lines"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_lines" ADD CONSTRAINT "finance_v56_tax_lines_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_plans_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_plans"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_plans" ADD CONSTRAINT "finance_v56_tax_plans_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_rates_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_rates"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_rates" ADD CONSTRAINT "finance_v56_tax_rates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v56_tax_suggestions_tenant_id_fkey' AND conrelid = '"finance"."finance_v56_tax_suggestions"'::regclass) THEN
        ALTER TABLE "finance"."finance_v56_tax_suggestions" ADD CONSTRAINT "finance_v56_tax_suggestions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_analysis_dimensions_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_analysis_dimensions"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_analysis_dimensions" ADD CONSTRAINT "finance_v57_analysis_dimensions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_analysis_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_analysis_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_analysis_results" ADD CONSTRAINT "finance_v57_analysis_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_forecast_models_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_forecast_models"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_forecast_models" ADD CONSTRAINT "finance_v57_forecast_models_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_generated_reports_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_generated_reports"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_generated_reports" ADD CONSTRAINT "finance_v57_generated_reports_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_insights_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_insights"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_insights" ADD CONSTRAINT "finance_v57_insights_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v57_report_templates_tenant_id_fkey' AND conrelid = '"finance"."finance_v57_report_templates"'::regclass) THEN
        ALTER TABLE "finance"."finance_v57_report_templates" ADD CONSTRAINT "finance_v57_report_templates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_cash_pools_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_cash_pools"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_cash_pools" ADD CONSTRAINT "finance_v58_cash_pools_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_forecast_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_forecast_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_forecast_results" ADD CONSTRAINT "finance_v58_forecast_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_forecast_scenarios_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_forecast_scenarios"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_forecast_scenarios" ADD CONSTRAINT "finance_v58_forecast_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_liquidity_targets_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_liquidity_targets"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_liquidity_targets" ADD CONSTRAINT "finance_v58_liquidity_targets_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_optimization_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_optimization_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_optimization_results" ADD CONSTRAINT "finance_v58_optimization_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_pool_allocations_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_pool_allocations"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_pool_allocations" ADD CONSTRAINT "finance_v58_pool_allocations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v58_pool_transfers_tenant_id_fkey' AND conrelid = '"finance"."finance_v58_pool_transfers"'::regclass) THEN
        ALTER TABLE "finance"."finance_v58_pool_transfers" ADD CONSTRAINT "finance_v58_pool_transfers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_credit_profiles_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_credit_profiles"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_credit_profiles" ADD CONSTRAINT "finance_v59_credit_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_device_profiles_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_device_profiles"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_device_profiles" ADD CONSTRAINT "finance_v59_device_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_fraud_decisions_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_fraud_decisions"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_fraud_decisions" ADD CONSTRAINT "finance_v59_fraud_decisions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_fraud_rules_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_fraud_rules"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_fraud_rules" ADD CONSTRAINT "finance_v59_fraud_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_fraud_signals_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_fraud_signals"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_fraud_signals" ADD CONSTRAINT "finance_v59_fraud_signals_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_scoring_models_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_scoring_models"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_scoring_models" ADD CONSTRAINT "finance_v59_scoring_models_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_stress_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_stress_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_stress_results" ADD CONSTRAINT "finance_v59_stress_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v59_stress_scenarios_tenant_id_fkey' AND conrelid = '"finance"."finance_v59_stress_scenarios"'::regclass) THEN
        ALTER TABLE "finance"."finance_v59_stress_scenarios" ADD CONSTRAINT "finance_v59_stress_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_alert_channels_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_alert_channels"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_alert_channels" ADD CONSTRAINT "finance_v60_alert_channels_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_alert_rules_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_alert_rules"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_alert_rules" ADD CONSTRAINT "finance_v60_alert_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_alerts_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_alerts"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_alerts" ADD CONSTRAINT "finance_v60_alerts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_decision_results_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_decision_results"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_decision_results" ADD CONSTRAINT "finance_v60_decision_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_decision_scenarios_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_decision_scenarios"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_decision_scenarios" ADD CONSTRAINT "finance_v60_decision_scenarios_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_schedule_dependencies_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_schedule_dependencies"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_schedule_dependencies" ADD CONSTRAINT "finance_v60_schedule_dependencies_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_schedule_executions_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_schedule_executions"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_schedule_executions" ADD CONSTRAINT "finance_v60_schedule_executions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_v60_schedule_tasks_tenant_id_fkey' AND conrelid = '"finance"."finance_v60_schedule_tasks"'::regclass) THEN
        ALTER TABLE "finance"."finance_v60_schedule_tasks" ADD CONSTRAINT "finance_v60_schedule_tasks_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_workflow_instances_workflow_id_fkey' AND conrelid = '"flow"."core_workflow_instances"'::regclass) THEN
        ALTER TABLE "flow"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES flow.core_workflows(id);
    END IF;
END $$;
ALTER TABLE "gis"."audit_log" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."business_locations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."business_locations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."device_location_records" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_location_records_device_id_fkey' AND conrelid = '"gis"."device_location_records"'::regclass) THEN
        ALTER TABLE "gis"."device_location_records" ADD CONSTRAINT "device_location_records_device_id_fkey" FOREIGN KEY (device_id) REFERENCES gis.devices(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."device_locations" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_locations_map_id_fkey' AND conrelid = '"gis"."device_locations"'::regclass) THEN
        ALTER TABLE "gis"."device_locations" ADD CONSTRAINT "device_locations_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."device_locations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."devices" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."devices" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."evidence_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."evidence_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."factory_maps" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."factory_maps" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."geodata" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."geodata" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."geofeatures" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'geofeatures_geodata_id_fkey' AND conrelid = '"gis"."geofeatures"'::regclass) THEN
        ALTER TABLE "gis"."geofeatures" ADD CONSTRAINT "geofeatures_geodata_id_fkey" FOREIGN KEY (geodata_id) REFERENCES gis.geodata(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."geofeatures" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."geofences" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."geofences" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."location_photos" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'location_photos_map_id_fkey' AND conrelid = '"gis"."location_photos"'::regclass) THEN
        ALTER TABLE "gis"."location_photos" ADD CONSTRAINT "location_photos_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."locations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."locations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."map_layers" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'map_layers_map_id_fkey' AND conrelid = '"gis"."map_layers"'::regclass) THEN
        ALTER TABLE "gis"."map_layers" ADD CONSTRAINT "map_layers_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.maps(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."map_layers" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."map_markers" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."map_markers" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."pipelines" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pipelines_map_id_fkey' AND conrelid = '"gis"."pipelines"'::regclass) THEN
        ALTER TABLE "gis"."pipelines" ADD CONSTRAINT "pipelines_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."pipelines" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "gis"."spatial_analysis" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."track_positions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."track_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "gis"."warehouse_locations" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_locations_map_id_fkey' AND conrelid = '"gis"."warehouse_locations"'::regclass) THEN
        ALTER TABLE "gis"."warehouse_locations" ADD CONSTRAINT "warehouse_locations_map_id_fkey" FOREIGN KEY (map_id) REFERENCES gis.factory_maps(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "gis"."warehouse_locations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "hrm"."hrm_master_data_refs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "hrm"."hrm_master_data_refs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "hrm"."initialization_logs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "iam"."core_billing_invoices" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_billing_invoices" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_billing_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_billing_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_chat_messages" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_chat_rooms" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_chat_rooms" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_email_queue" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_email_queue" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_email_templates" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_email_templates" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_emails" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_file_folders" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_file_folders" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_files" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_files" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_inter_module_sync" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_inter_module_sync" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_login_logs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_migration_history" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_mobile_offline_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_mobile_offline_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_notification_templates" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_notification_templates" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_notifications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_categories" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_pricing" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_pricing" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_reviews" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_reviews" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugin_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugins" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_plugins" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_role_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_roles" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_roles" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_subscriptions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_subscriptions" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenant_plugins" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenant_plugins" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenant_settings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenant_usage" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenant_users" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenants" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_tenants" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_usage_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_user_roles" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_users" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_users" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "iam"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_workflows" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "iam"."core_workflows" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_action' AND conrelid = '"iam"."permission_audit_logs"'::regclass) THEN
        ALTER TABLE "iam"."permission_audit_logs" ADD CONSTRAINT "chk_action" CHECK (((action)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'activate'::character varying, 'deactivate'::character varying, 'role_change'::character varying])::text[])));
    END IF;
END $$;
ALTER TABLE "iam"."tenant_users" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."inspection_processes" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."inspection_processes" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "lims"."inspection_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."inspection_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."inspection_tasks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "lims"."instrument_calibrations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."instruments" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."instruments" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "lims"."samples" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "lims"."samples" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_returns_order_id_fkey' AND conrelid = '"mes"."material_returns"'::regclass) THEN
        ALTER TABLE "mes"."material_returns" ADD CONSTRAINT "material_returns_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
ALTER TABLE "mobile"."push_config" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "initiator_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_instances" ADD CONSTRAINT "_archive_core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "workflow_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."approval_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."approvals" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_file_permissions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_categories" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_categories" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_delegates" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_delegates" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_rules" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_rules" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_variable_history" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_variables" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_flow_variables" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_refresh_tokens" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_sessions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_tenant_settings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_tenant_usage" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "assignee_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "instance_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "node_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_tasks"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_workflows" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflows" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."pdm_products" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."pdm_products" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accident_investigations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accident_investigations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accident_reviews" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accident_treatments" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accident_treatments" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accidents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_accidents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_compliance_evaluations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_compliance_evaluations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_compliance_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_contraindications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_contraindications" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_detection_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_detection_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_discharge_permits" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_discharge_permits" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_disease_cases" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_disease_cases" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_evaluations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_problems" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_problems" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_drill_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_emergency_plan_approvals" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_emergency_plan_supplies" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_emergency_plan_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_emergency_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_emergency_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_employees" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_employees" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_env_monitor_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_env_monitor_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environment" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environment" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environment_incidents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environment_incidents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environmental_regulations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_environmental_regulations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazard_factors" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazard_factors" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazard_rectifications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazard_rectifications" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazard_verifications" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazardous_materials" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazardous_materials" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazards" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_hazards" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_abnormalities" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_abnormalities" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_exam_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_exam_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_exam_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_exam_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_trainings" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_health_trainings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_items" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_record_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_inspection_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_material_stocks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_material_stocks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_msds" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_protection_measures" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_protection_measures" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_risks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_risks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_stock_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_sync_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_sync_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_trainings" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_ehs_trainings" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_calibration_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_inspection_reports" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_inspection_reports" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_instruments" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_instruments" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_processes" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_processes" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_reagent_alerts" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_reagent_history" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_reagents" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_reagents" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_sample_lifecycle" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lab_tasks" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_tasks_sample_id_fkey' AND conrelid = '"public"."qa_lab_tasks"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_tasks" ADD CONSTRAINT "qa_lab_tasks_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "public"."qa_lab_tasks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_audit_logs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_collection_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_collection_tasks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_instrument_data" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_instrument_data" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_method_categories" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_method_categories" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_method_validations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_method_versions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_parse_rules" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_parse_rules" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_corrective_actions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_corrective_actions" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_evaluations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_plans" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_plans" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_results" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_results" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_pt_samples" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_rfid_tags" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_rfid_tags" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_sample_barcodes" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_sample_barcodes" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_sync_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_sync_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_test_methods" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_test_methods" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_components" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_components" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_projects" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_projects" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_sources" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."qa_lims_uncertainty_sources" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_approvals" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_phases" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_phases" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_risks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_risks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_tasks" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "rs"."change_orders" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "rs"."change_orders" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "rs"."project_members" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "rs"."project_members" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "rs"."project_milestones" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "rs"."project_milestones" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "scm"."scm_master_data_refs" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "scm"."scm_master_data_refs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "wms"."audit_logs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inbound_order_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_records" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_rules" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."outbound_order_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."transfer_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."transfers" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."wave_pick_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."wave_picks" ALTER COLUMN "organization_id" SET NOT NULL;
