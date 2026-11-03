-- 数据库治理：FK 引用列补索引（库无关幂等）
-- 来源：topems_prod 只读审计 2026-11-03 —— FK 列无索引缺口 246 处；已先经 topems_prepare 演练。
-- 守卫：to_regclass(表) + information_schema(列) 双检查；CREATE INDEX IF NOT EXISTS 幂等。

DO $$ BEGIN
  IF to_regclass('bi.analytics_comparison_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='analytics_comparison_results' AND column_name='comparison_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_comparison_results_comparison_id ON bi.analytics_comparison_results (comparison_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('bi.analytics_dashboard_shares') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='analytics_dashboard_shares' AND column_name='dashboard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_shares_dashboard_id ON bi.analytics_dashboard_shares (dashboard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('bi.analytics_datasets') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='analytics_datasets' AND column_name='datasource_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_datasets_datasource_id ON bi.analytics_datasets (datasource_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('bi.analytics_drilldown_history') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='analytics_drilldown_history' AND column_name='path_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_drilldown_history_path_id ON bi.analytics_drilldown_history (path_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('bi.report_execution_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='report_execution_records' AND column_name='schedule_id') THEN
    CREATE INDEX IF NOT EXISTS idx_report_execution_records_schedule_id ON bi.report_execution_records (schedule_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('bi.report_subscriptions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='bi' AND table_name='report_subscriptions' AND column_name='template_id') THEN
    CREATE INDEX IF NOT EXISTS idx_report_subscriptions_template_id ON bi.report_subscriptions (template_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('core.core_plugin_instances') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='core_plugin_instances' AND column_name='plugin_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_plugin_instances_plugin_id ON core.core_plugin_instances (plugin_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('core.core_plugin_reviews') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='core_plugin_reviews' AND column_name='plugin_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_plugin_reviews_plugin_id ON core.core_plugin_reviews (plugin_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('core.core_plugin_versions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='core_plugin_versions' AND column_name='plugin_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_plugin_versions_plugin_id ON core.core_plugin_versions (plugin_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='hazard_control_measures' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_hazard_control_measures_hazard_id ON ehs.hazard_control_measures (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='hazard_risk_assessments' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_hazard_risk_assessments_hazard_id ON ehs.hazard_risk_assessments (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_accident_investigations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_accident_investigations' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_investigations_accident_id ON ehs.qa_ehs_accident_investigations (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_accident_reviews') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_accident_reviews' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_reviews_accident_id ON ehs.qa_ehs_accident_reviews (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_accident_treatments') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_accident_treatments' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_treatments_accident_id ON ehs.qa_ehs_accident_treatments (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_compliance_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_compliance_items' AND column_name='evaluation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_evaluation_id ON ehs.qa_ehs_compliance_items (evaluation_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_compliance_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_compliance_items' AND column_name='regulation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_regulation_id ON ehs.qa_ehs_compliance_items (regulation_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_detection_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_detection_records' AND column_name='factor_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_factor_id ON ehs.qa_ehs_detection_records (factor_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_drill_evaluations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_drill_evaluations' AND column_name='drill_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_evaluations_drill_id ON ehs.qa_ehs_drill_evaluations (drill_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_drill_problems') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_drill_problems' AND column_name='drill_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_problems_drill_id ON ehs.qa_ehs_drill_problems (drill_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_drill_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_drill_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_plan_id ON ehs.qa_ehs_drill_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_emergency_plan_approvals') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_emergency_plan_approvals' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_approvals_plan_id ON ehs.qa_ehs_emergency_plan_approvals (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_emergency_plan_supplies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_emergency_plan_supplies' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_supplies_plan_id ON ehs.qa_ehs_emergency_plan_supplies (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_emergency_plan_versions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_emergency_plan_versions' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_versions_plan_id ON ehs.qa_ehs_emergency_plan_versions (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_hazard_rectifications') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_hazard_rectifications' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_rectifications_hazard_id ON ehs.qa_ehs_hazard_rectifications (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_hazard_verifications') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_hazard_verifications' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_verifications_hazard_id ON ehs.qa_ehs_hazard_verifications (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_health_abnormalities') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_health_abnormalities' AND column_name='record_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_abnormalities_record_id ON ehs.qa_ehs_health_abnormalities (record_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_health_exam_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_health_exam_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_plan_id ON ehs.qa_ehs_health_exam_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_inspection_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_items' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_items_plan_id ON ehs.qa_ehs_inspection_items (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_inspection_record_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_record_items' AND column_name='item_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_item_id ON ehs.qa_ehs_inspection_record_items (item_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_inspection_record_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_record_items' AND column_name='record_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_record_id ON ehs.qa_ehs_inspection_record_items (record_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_inspection_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_inspection_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_records_plan_id ON ehs.qa_ehs_inspection_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_material_stocks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_material_stocks' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_material_stocks_material_id ON ehs.qa_ehs_material_stocks (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_msds') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_msds' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_msds_material_id ON ehs.qa_ehs_msds (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('ehs.qa_ehs_stock_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='ehs' AND table_name='qa_ehs_stock_records' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_material_id ON ehs.qa_ehs_stock_records (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('erp.asset_categories') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='asset_categories' AND column_name='parent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_categories_parent_id ON erp.asset_categories (parent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('erp.meeting_bookings') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='meeting_bookings' AND column_name='room_id') THEN
    CREATE INDEX IF NOT EXISTS idx_meeting_bookings_room_id ON erp.meeting_bookings (room_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('erp.vehicle_requests') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='vehicle_requests' AND column_name='vehicle_id') THEN
    CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle_id ON erp.vehicle_requests (vehicle_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_fraud_rules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_fraud_rules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_fraud_rules_tenant_id ON finance.finance_v54_fraud_rules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_fraud_scores') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_fraud_scores' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_fraud_scores_tenant_id ON finance.finance_v54_fraud_scores (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_review_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_review_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_review_results_tenant_id ON finance.finance_v54_review_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_review_rules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_review_rules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_review_rules_tenant_id ON finance.finance_v54_review_rules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_review_workflows') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_review_workflows' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_review_workflows_tenant_id ON finance.finance_v54_review_workflows (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_risk_alerts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_risk_alerts' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_risk_alerts_tenant_id ON finance.finance_v54_risk_alerts (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v54_risk_indicators') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v54_risk_indicators' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v54_risk_indicators_tenant_id ON finance.finance_v54_risk_indicators (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_invoice_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_invoice_items' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_invoice_items_tenant_id ON finance.finance_v55_invoice_items (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_invoices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_invoices' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_invoices_tenant_id ON finance.finance_v55_invoices (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_payment_requests') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_payment_requests' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_payment_requests_tenant_id ON finance.finance_v55_payment_requests (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_payment_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_payment_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_payment_results_tenant_id ON finance.finance_v55_payment_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_reconciliation_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_reconciliation_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_reconciliation_results_tenant_id ON finance.finance_v55_reconciliation_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v55_reconciliation_rules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v55_reconciliation_rules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v55_reconciliation_rules_tenant_id ON finance.finance_v55_reconciliation_rules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_brackets') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_brackets' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_brackets_tenant_id ON finance.finance_v56_tax_brackets (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_forms') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_forms' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_forms_tenant_id ON finance.finance_v56_tax_forms (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_lines') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_lines' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_lines_tenant_id ON finance.finance_v56_tax_lines (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_plans') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_plans' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_plans_tenant_id ON finance.finance_v56_tax_plans (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_rates') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_rates' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_rates_tenant_id ON finance.finance_v56_tax_rates (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v56_tax_suggestions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v56_tax_suggestions' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v56_tax_suggestions_tenant_id ON finance.finance_v56_tax_suggestions (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_analysis_dimensions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_analysis_dimensions' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_analysis_dimensions_tenant_id ON finance.finance_v57_analysis_dimensions (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_analysis_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_analysis_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_analysis_results_tenant_id ON finance.finance_v57_analysis_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_forecast_models') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_forecast_models' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_forecast_models_tenant_id ON finance.finance_v57_forecast_models (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_generated_reports') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_generated_reports' AND column_name='template_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_generated_reports_template_id ON finance.finance_v57_generated_reports (template_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_generated_reports') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_generated_reports' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_generated_reports_tenant_id ON finance.finance_v57_generated_reports (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_insights') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_insights' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_insights_tenant_id ON finance.finance_v57_insights (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v57_report_templates') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v57_report_templates' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v57_report_templates_tenant_id ON finance.finance_v57_report_templates (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_cash_pools') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_cash_pools' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_cash_pools_tenant_id ON finance.finance_v58_cash_pools (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_forecast_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_forecast_results' AND column_name='scenario_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_results_scenario_id ON finance.finance_v58_forecast_results (scenario_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_forecast_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_forecast_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_results_tenant_id ON finance.finance_v58_forecast_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_forecast_scenarios') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_forecast_scenarios' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_forecast_scenarios_tenant_id ON finance.finance_v58_forecast_scenarios (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_liquidity_targets') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_liquidity_targets' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_liquidity_targets_tenant_id ON finance.finance_v58_liquidity_targets (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_optimization_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_optimization_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_optimization_results_tenant_id ON finance.finance_v58_optimization_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_pool_allocations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_pool_allocations' AND column_name='pool_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_allocations_pool_id ON finance.finance_v58_pool_allocations (pool_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_pool_allocations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_pool_allocations' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_allocations_tenant_id ON finance.finance_v58_pool_allocations (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_pool_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_pool_transfers' AND column_name='from_pool') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_from_pool ON finance.finance_v58_pool_transfers (from_pool);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_pool_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_pool_transfers' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_tenant_id ON finance.finance_v58_pool_transfers (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v58_pool_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v58_pool_transfers' AND column_name='to_pool') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v58_pool_transfers_to_pool ON finance.finance_v58_pool_transfers (to_pool);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_credit_profiles') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_credit_profiles' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_credit_profiles_tenant_id ON finance.finance_v59_credit_profiles (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_device_profiles') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_device_profiles' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_device_profiles_tenant_id ON finance.finance_v59_device_profiles (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_fraud_decisions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_fraud_decisions' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_decisions_tenant_id ON finance.finance_v59_fraud_decisions (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_fraud_rules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_fraud_rules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_rules_tenant_id ON finance.finance_v59_fraud_rules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_fraud_signals') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_fraud_signals' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_fraud_signals_tenant_id ON finance.finance_v59_fraud_signals (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_scoring_models') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_scoring_models' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_scoring_models_tenant_id ON finance.finance_v59_scoring_models (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_stress_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_stress_results' AND column_name='scenario_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_results_scenario_id ON finance.finance_v59_stress_results (scenario_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_stress_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_stress_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_results_tenant_id ON finance.finance_v59_stress_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v59_stress_scenarios') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v59_stress_scenarios' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v59_stress_scenarios_tenant_id ON finance.finance_v59_stress_scenarios (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_alert_channels') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_alert_channels' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_alert_channels_tenant_id ON finance.finance_v60_alert_channels (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_alert_rules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_alert_rules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_alert_rules_tenant_id ON finance.finance_v60_alert_rules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_alerts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_alerts' AND column_name='rule_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_alerts_rule_id ON finance.finance_v60_alerts (rule_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_alerts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_alerts' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_alerts_tenant_id ON finance.finance_v60_alerts (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_decision_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_decision_results' AND column_name='scenario_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_results_scenario_id ON finance.finance_v60_decision_results (scenario_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_decision_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_decision_results' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_results_tenant_id ON finance.finance_v60_decision_results (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_decision_scenarios') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_decision_scenarios' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_decision_scenarios_tenant_id ON finance.finance_v60_decision_scenarios (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_dependencies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_dependencies' AND column_name='depends_on') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_depends_on ON finance.finance_v60_schedule_dependencies (depends_on);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_dependencies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_dependencies' AND column_name='task_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_task_id ON finance.finance_v60_schedule_dependencies (task_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_dependencies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_dependencies' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_dependencies_tenant_id ON finance.finance_v60_schedule_dependencies (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_executions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_executions' AND column_name='task_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_executions_task_id ON finance.finance_v60_schedule_executions (task_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_executions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_executions' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_executions_tenant_id ON finance.finance_v60_schedule_executions (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.finance_v60_schedule_tasks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='finance_v60_schedule_tasks' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_finance_v60_schedule_tasks_tenant_id ON finance.finance_v60_schedule_tasks (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('finance.reconcile_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='reconcile_items' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_reconcile_items_order_id ON finance.reconcile_items (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.device_location_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='device_location_records' AND column_name='device_id') THEN
    CREATE INDEX IF NOT EXISTS idx_device_location_records_device_id ON gis.device_location_records (device_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.device_locations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='device_locations' AND column_name='map_id') THEN
    CREATE INDEX IF NOT EXISTS idx_device_locations_map_id ON gis.device_locations (map_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.geofeatures') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='geofeatures' AND column_name='geodata_id') THEN
    CREATE INDEX IF NOT EXISTS idx_geofeatures_geodata_id ON gis.geofeatures (geodata_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.location_photos') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='location_photos' AND column_name='map_id') THEN
    CREATE INDEX IF NOT EXISTS idx_location_photos_map_id ON gis.location_photos (map_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.map_layers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='map_layers' AND column_name='map_id') THEN
    CREATE INDEX IF NOT EXISTS idx_map_layers_map_id ON gis.map_layers (map_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.pipelines') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='pipelines' AND column_name='map_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pipelines_map_id ON gis.pipelines (map_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('gis.warehouse_locations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='gis' AND table_name='warehouse_locations' AND column_name='map_id') THEN
    CREATE INDEX IF NOT EXISTS idx_warehouse_locations_map_id ON gis.warehouse_locations (map_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('hrm.positions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='positions' AND column_name='department_id') THEN
    CREATE INDEX IF NOT EXISTS idx_positions_department_id ON hrm.positions (department_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('hrm.training_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='course_id') THEN
    CREATE INDEX IF NOT EXISTS idx_training_records_course_id ON hrm.training_records (course_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('hrm.training_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='hrm' AND table_name='training_records' AND column_name='employee_id') THEN
    CREATE INDEX IF NOT EXISTS idx_training_records_employee_id ON hrm.training_records (employee_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.data_permissions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='data_permissions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_data_permissions_user_id ON iam.data_permissions (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.dynamic_data') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='dynamic_data' AND column_name='schema_id') THEN
    CREATE INDEX IF NOT EXISTS idx_dynamic_data_schema_id ON iam.dynamic_data (schema_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.permission_audit_logs') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='permission_audit_logs' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON iam.permission_audit_logs (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.position_permissions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='position_permissions' AND column_name='position_id') THEN
    CREATE INDEX IF NOT EXISTS idx_position_permissions_position_id ON iam.position_permissions (position_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.position_roles') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='position_roles' AND column_name='position_id') THEN
    CREATE INDEX IF NOT EXISTS idx_position_roles_position_id ON iam.position_roles (position_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.resource_permissions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='resource_permissions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON iam.resource_permissions (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.user_positions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='user_positions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON iam.user_positions (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('iam.users') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='iam' AND table_name='users' AND column_name='role_id') THEN
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON iam.users (role_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.bom_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='bom_items' AND column_name='bom_id') THEN
    CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON mes.bom_items (bom_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.equipment_inspections') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='equipment_inspections' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_equipment_inspections_equipment_id ON mes.equipment_inspections (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.equipment_maintenance_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='equipment_maintenance_records' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_records_equipment_id ON mes.equipment_maintenance_records (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.equipment_oee') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='equipment_oee' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_equipment_oee_equipment_id ON mes.equipment_oee (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_issue_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_issue_items' AND column_name='issue_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_issue_items_issue_id ON mes.material_issue_items (issue_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_issues') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_issues' AND column_name='bom_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_issues_bom_id ON mes.material_issues (bom_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_issues') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_issues' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_issues_order_id ON mes.material_issues (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_requirements') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_requirements' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_requirements_order_id ON mes.material_requirements (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_return_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_return_items' AND column_name='return_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_return_items_return_id ON mes.material_return_items (return_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.material_returns') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='material_returns' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_material_returns_order_id ON mes.material_returns (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.process_flow_steps') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='process_flow_steps' AND column_name='flow_id') THEN
    CREATE INDEX IF NOT EXISTS idx_process_flow_steps_flow_id ON mes.process_flow_steps (flow_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_lines') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_lines' AND column_name='workshop_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_lines_workshop_id ON mes.production_lines (workshop_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_orders') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_orders' AND column_name='workshop_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_orders_workshop_id ON mes.production_orders (workshop_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_records' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_records_equipment_id ON mes.production_records (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_records' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_records_order_id ON mes.production_records (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_records' AND column_name='process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_records_process_id ON mes.production_records (process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_records' AND column_name='work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_records_work_station_id ON mes.production_records (work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_schedules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_schedules_equipment_id ON mes.production_schedules (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_schedules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_schedules_order_id ON mes.production_schedules (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_schedules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_schedules_process_id ON mes.production_schedules (process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.production_schedules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_schedules' AND column_name='work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_schedules_work_station_id ON mes.production_schedules (work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.quality_patrol_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='quality_patrol_items' AND column_name='patrol_id') THEN
    CREATE INDEX IF NOT EXISTS idx_quality_patrol_items_patrol_id ON mes.quality_patrol_items (patrol_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.quality_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='quality_records' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_quality_records_order_id ON mes.quality_records (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.quality_standard_values') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='quality_standard_values' AND column_name='standard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_quality_standard_values_standard_id ON mes.quality_standard_values (standard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.team_members') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='team_members' AND column_name='team_id') THEN
    CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON mes.team_members (team_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.teams') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='teams' AND column_name='work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_teams_work_station_id ON mes.teams (work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.tool_permissions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='tool_permissions' AND column_name='tenant_permission_id') THEN
    CREATE INDEX IF NOT EXISTS idx_tool_permissions_tenant_permission_id ON mes.tool_permissions (tenant_permission_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wip_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wip_transfers' AND column_name='from_process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wip_transfers_from_process_id ON mes.wip_transfers (from_process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wip_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wip_transfers' AND column_name='from_work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wip_transfers_from_work_station_id ON mes.wip_transfers (from_work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wip_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wip_transfers' AND column_name='to_process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wip_transfers_to_process_id ON mes.wip_transfers (to_process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wip_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wip_transfers' AND column_name='to_work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wip_transfers_to_work_station_id ON mes.wip_transfers (to_work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wip_transfers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wip_transfers' AND column_name='wip_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wip_transfers_wip_id ON mes.wip_transfers (wip_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wips') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wips' AND column_name='current_process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wips_current_process_id ON mes.wips (current_process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wips') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wips' AND column_name='current_work_station_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wips_current_work_station_id ON mes.wips (current_work_station_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.wips') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='wips' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_wips_order_id ON mes.wips (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.work_calendars') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='work_calendars' AND column_name='shift_id') THEN
    CREATE INDEX IF NOT EXISTS idx_work_calendars_shift_id ON mes.work_calendars (shift_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.work_orders') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='work_orders' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_work_orders_order_id ON mes.work_orders (order_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.work_stations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='work_stations' AND column_name='equipment_id') THEN
    CREATE INDEX IF NOT EXISTS idx_work_stations_equipment_id ON mes.work_stations (equipment_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.work_stations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='work_stations' AND column_name='process_id') THEN
    CREATE INDEX IF NOT EXISTS idx_work_stations_process_id ON mes.work_stations (process_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mes.work_stations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='work_stations' AND column_name='workshop_id') THEN
    CREATE INDEX IF NOT EXISTS idx_work_stations_workshop_id ON mes.work_stations (workshop_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mobile.oa_announcement_reads') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mobile' AND table_name='oa_announcement_reads' AND column_name='announcement_id') THEN
    CREATE INDEX IF NOT EXISTS idx_oa_announcement_reads_announcement_id ON mobile.oa_announcement_reads (announcement_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('mobile.shortcuts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mobile' AND table_name='shortcuts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_shortcuts_user_id ON mobile.shortcuts (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.barcode_scans') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='barcode_scans' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_barcode_scans_user_id ON public.barcode_scans (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_dict_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_dict_items' AND column_name='dict_type_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_dict_items_dict_type_id ON public.core_dict_items (dict_type_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_dict_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_dict_items' AND column_name='parent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_dict_items_parent_id ON public.core_dict_items (parent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_doc_document_versions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_doc_document_versions' AND column_name='document_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_doc_document_versions_document_id ON public.core_doc_document_versions (document_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_finance_vouchers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_finance_vouchers' AND column_name='template_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_finance_vouchers_template_id ON public.core_finance_vouchers (template_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_flow_variable_history') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_flow_variable_history' AND column_name='variable_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_flow_variable_history_variable_id ON public.core_flow_variable_history (variable_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_guide_lessons') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_guide_lessons' AND column_name='guide_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_guide_lessons_guide_id ON public.core_guide_lessons (guide_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_guide_progress') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_guide_progress' AND column_name='guide_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_guide_progress_guide_id ON public.core_guide_progress (guide_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_menus') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_menus' AND column_name='group_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_menus_group_id ON public.core_menus (group_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_menus') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_menus' AND column_name='parent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_menus_parent_id ON public.core_menus (parent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_refresh_tokens') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_refresh_tokens' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_refresh_tokens_user_id ON public.core_refresh_tokens (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_role_permissions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_role_permissions' AND column_name='role_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_role_permissions_role_id ON public.core_role_permissions (role_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_sessions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_sessions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_sessions_user_id ON public.core_sessions (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_tenant_modules') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenant_modules' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_tenant_modules_tenant_id ON public.core_tenant_modules (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_tenant_settings') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenant_settings' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_tenant_settings_tenant_id ON public.core_tenant_settings (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_tenant_usage') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenant_usage' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_tenant_usage_tenant_id ON public.core_tenant_usage (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_tenant_users') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_tenant_users' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_tenant_users_tenant_id ON public.core_tenant_users (tenant_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.core_user_roles') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='core_user_roles' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_core_user_roles_user_id ON public.core_user_roles (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.devices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='devices' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.mobile_scan_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mobile_scan_records' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mobile_scan_records_user_id ON public.mobile_scan_records (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.offline_operations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='offline_operations' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_offline_operations_user_id ON public.offline_operations (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.offline_sync_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='offline_sync_records' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_offline_sync_records_user_id ON public.offline_sync_records (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.photo_uploads') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='photo_uploads' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_photo_uploads_user_id ON public.photo_uploads (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.push_devices') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='push_devices' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_push_devices_user_id ON public.push_devices (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_accident_investigations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_accident_investigations' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_investigations_accident_id ON public.qa_ehs_accident_investigations (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_accident_reviews') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_accident_reviews' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_reviews_accident_id ON public.qa_ehs_accident_reviews (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_accident_treatments') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_accident_treatments' AND column_name='accident_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_accident_treatments_accident_id ON public.qa_ehs_accident_treatments (accident_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_compliance_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_compliance_items' AND column_name='evaluation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_evaluation_id ON public.qa_ehs_compliance_items (evaluation_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_compliance_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_compliance_items' AND column_name='regulation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_items_regulation_id ON public.qa_ehs_compliance_items (regulation_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_detection_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_detection_records' AND column_name='factor_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_factor_id ON public.qa_ehs_detection_records (factor_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_drill_evaluations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_drill_evaluations' AND column_name='drill_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_evaluations_drill_id ON public.qa_ehs_drill_evaluations (drill_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_drill_problems') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_drill_problems' AND column_name='drill_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_problems_drill_id ON public.qa_ehs_drill_problems (drill_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_drill_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_drill_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_plan_id ON public.qa_ehs_drill_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_approvals') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_emergency_plan_approvals' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_approvals_plan_id ON public.qa_ehs_emergency_plan_approvals (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_supplies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_emergency_plan_supplies' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_supplies_plan_id ON public.qa_ehs_emergency_plan_supplies (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_emergency_plan_versions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_emergency_plan_versions' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plan_versions_plan_id ON public.qa_ehs_emergency_plan_versions (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_hazard_rectifications') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_hazard_rectifications' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_rectifications_hazard_id ON public.qa_ehs_hazard_rectifications (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_hazard_verifications') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_hazard_verifications' AND column_name='hazard_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_verifications_hazard_id ON public.qa_ehs_hazard_verifications (hazard_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_hazards') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_hazards' AND column_name='inspection_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_inspection_id ON public.qa_ehs_hazards (inspection_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_health_abnormalities') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_health_abnormalities' AND column_name='record_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_abnormalities_record_id ON public.qa_ehs_health_abnormalities (record_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_health_exam_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_health_exam_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_plan_id ON public.qa_ehs_health_exam_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_inspection_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_inspection_items' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_items_plan_id ON public.qa_ehs_inspection_items (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_inspection_record_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_inspection_record_items' AND column_name='item_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_item_id ON public.qa_ehs_inspection_record_items (item_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_inspection_record_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_inspection_record_items' AND column_name='record_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_record_items_record_id ON public.qa_ehs_inspection_record_items (record_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_inspection_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_inspection_records' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_inspection_records_plan_id ON public.qa_ehs_inspection_records (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_material_stocks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_material_stocks' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_material_stocks_material_id ON public.qa_ehs_material_stocks (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_msds') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_msds' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_msds_material_id ON public.qa_ehs_msds (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_ehs_stock_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_ehs_stock_records' AND column_name='material_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_material_id ON public.qa_ehs_stock_records (material_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_calibration_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_calibration_records' AND column_name='instrument_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_calibration_records_instrument_id ON public.qa_lab_calibration_records (instrument_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_inspection_reports') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_inspection_reports' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_sample_id ON public.qa_lab_inspection_reports (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_reagent_alerts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_reagent_alerts' AND column_name='reagent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_alerts_reagent_id ON public.qa_lab_reagent_alerts (reagent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_reagent_history') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_reagent_history' AND column_name='reagent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_history_reagent_id ON public.qa_lab_reagent_history (reagent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_records' AND column_name='task_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_records_task_id ON public.qa_lab_records (task_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_sample_lifecycle') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_sample_lifecycle' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_sample_lifecycle_sample_id ON public.qa_lab_sample_lifecycle (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lab_tasks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lab_tasks' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_sample_id ON public.qa_lab_tasks (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_barcode_scan_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_barcode_scan_records' AND column_name='barcode_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_records_barcode_id ON public.qa_lims_barcode_scan_records (barcode_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_collection_tasks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_collection_tasks' AND column_name='instrument_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_instrument_id ON public.qa_lims_collection_tasks (instrument_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_instrument_data') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_instrument_data' AND column_name='instrument_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_instrument_id ON public.qa_lims_instrument_data (instrument_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_method_categories') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_categories' AND column_name='parent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_method_categories_parent_id ON public.qa_lims_method_categories (parent_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_method_validations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_validations' AND column_name='method_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_method_validations_method_id ON public.qa_lims_method_validations (method_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_method_versions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_method_versions' AND column_name='method_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_method_versions_method_id ON public.qa_lims_method_versions (method_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_corrective_actions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_corrective_actions' AND column_name='evaluation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_actions_evaluation_id ON public.qa_lims_pt_corrective_actions (evaluation_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_corrective_actions') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_corrective_actions' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_actions_plan_id ON public.qa_lims_pt_corrective_actions (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_evaluations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_evaluations' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_plan_id ON public.qa_lims_pt_evaluations (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_evaluations') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_evaluations' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_sample_id ON public.qa_lims_pt_evaluations (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_results' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_plan_id ON public.qa_lims_pt_results (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_results') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_results' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_sample_id ON public.qa_lims_pt_results (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_pt_samples') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_pt_samples' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_samples_plan_id ON public.qa_lims_pt_samples (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_rfid_tags') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_rfid_tags' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_sample_id ON public.qa_lims_rfid_tags (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_sample_barcodes') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_sample_barcodes' AND column_name='sample_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_sample_id ON public.qa_lims_sample_barcodes (sample_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_test_methods') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_test_methods' AND column_name='category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_category_id ON public.qa_lims_test_methods (category_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_uncertainty_components') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_uncertainty_components' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_project_id ON public.qa_lims_uncertainty_components (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_uncertainty_components') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_uncertainty_components' AND column_name='source_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_source_id ON public.qa_lims_uncertainty_components (source_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.qa_lims_uncertainty_sources') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qa_lims_uncertainty_sources' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_sources_project_id ON public.qa_lims_uncertainty_sources (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.shortcuts') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shortcuts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_shortcuts_user_id ON public.shortcuts (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.sync_policies') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sync_policies' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_sync_policies_user_id ON public.sync_policies (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('public.user_settings') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_apqp_approvals') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_apqp_approvals' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_apqp_approvals_project_id ON qms.qa_apqp_approvals (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_apqp_phases') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_apqp_phases' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_apqp_phases_project_id ON qms.qa_apqp_phases (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_apqp_risks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_apqp_risks' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_project_id ON qms.qa_apqp_risks (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_apqp_tasks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_apqp_tasks' AND column_name='phase_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_phase_id ON qms.qa_apqp_tasks (phase_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_apqp_tasks') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_apqp_tasks' AND column_name='project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_project_id ON qms.qa_apqp_tasks (project_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_inspection_plan_items' AND column_name='plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_inspection_plan_items_plan_id ON qms.qa_inspection_plan_items (plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('qms.qa_inspection_plans') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='qms' AND table_name='qa_inspection_plans' AND column_name='sampling_plan_id') THEN
    CREATE INDEX IF NOT EXISTS idx_qa_inspection_plans_sampling_plan_id ON qms.qa_inspection_plans (sampling_plan_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('scm.inspection_records') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='inspection_records' AND column_name='inspection_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inspection_records_inspection_id ON scm.inspection_records (inspection_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('scm.supplier_products') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='supplier_products' AND column_name='supplier_id') THEN
    CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON scm.supplier_products (supplier_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('srm.bidding_suppliers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='srm' AND table_name='bidding_suppliers' AND column_name='bidding_id') THEN
    CREATE INDEX IF NOT EXISTS idx_bidding_suppliers_bidding_id ON srm.bidding_suppliers (bidding_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('srm.bidding_suppliers') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='srm' AND table_name='bidding_suppliers' AND column_name='supplier_id') THEN
    CREATE INDEX IF NOT EXISTS idx_bidding_suppliers_supplier_id ON srm.bidding_suppliers (supplier_id);
  END IF;
END $$;
DO $$ BEGIN
  IF to_regclass('unified_core.inter_module_sync') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='unified_core' AND table_name='inter_module_sync' AND column_name='tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant_id ON unified_core.inter_module_sync (tenant_id);
  END IF;
END $$;

-- 共 246 个索引（去重）