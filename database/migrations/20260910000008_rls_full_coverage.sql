-- RLS 全覆盖：99 张表补 ENABLE/FORCE + 租户隔离策略（幂等）
-- 2026-09-18 防御化（空库重建链卡点）：重构为按变体 FOREACH 循环；
-- 表不存在或无 tenant_id 列（骨架/未建表）时跳过，幂等安全。

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bi.report_templates',
    'erp.assets',
    'erp.inventory',
    'erp.materials',
    'finance.core_finance_accounts',
    'finance.core_finance_approval_workflows',
    'finance.core_finance_aux_accounts',
    'finance.core_finance_aux_balances',
    'finance.core_finance_ledger',
    'finance.core_finance_periods',
    'finance.core_finance_reconciliation_items',
    'finance.core_finance_reconciliation_sessions',
    'finance.core_finance_voucher_lines',
    'finance.core_finance_vouchers',
    'finance.finance_v54_fraud_rules',
    'finance.finance_v54_fraud_scores',
    'finance.finance_v54_review_results',
    'finance.finance_v54_review_rules',
    'finance.finance_v54_review_workflows',
    'finance.finance_v54_risk_alerts',
    'finance.finance_v54_risk_indicators',
    'finance.finance_v55_invoice_items',
    'finance.finance_v55_invoices',
    'finance.finance_v55_payment_requests',
    'finance.finance_v55_payment_results',
    'finance.finance_v55_reconciliation_results',
    'finance.finance_v55_reconciliation_rules',
    'finance.finance_v56_tax_brackets',
    'finance.finance_v56_tax_forms',
    'finance.finance_v56_tax_lines',
    'finance.finance_v56_tax_plans',
    'finance.finance_v56_tax_rates',
    'finance.finance_v56_tax_suggestions',
    'finance.finance_v57_analysis_dimensions',
    'finance.finance_v57_analysis_results',
    'finance.finance_v57_forecast_models',
    'finance.finance_v57_generated_reports',
    'finance.finance_v57_insights',
    'finance.finance_v57_report_templates',
    'finance.finance_v58_cash_pools',
    'finance.finance_v58_forecast_results',
    'finance.finance_v58_forecast_scenarios',
    'finance.finance_v58_liquidity_targets',
    'finance.finance_v58_optimization_results',
    'finance.finance_v58_pool_allocations',
    'finance.finance_v58_pool_transfers',
    'finance.finance_v59_credit_profiles',
    'finance.finance_v59_device_profiles',
    'finance.finance_v59_fraud_decisions',
    'finance.finance_v59_fraud_rules',
    'finance.finance_v59_fraud_signals',
    'finance.finance_v59_scoring_models',
    'finance.finance_v59_stress_results',
    'finance.finance_v59_stress_scenarios',
    'finance.finance_v60_alert_channels',
    'finance.finance_v60_alert_rules',
    'finance.finance_v60_alerts',
    'finance.finance_v60_decision_results',
    'finance.finance_v60_decision_scenarios',
    'finance.finance_v60_schedule_dependencies',
    'finance.finance_v60_schedule_executions',
    'finance.finance_v60_schedule_tasks',
    'flow.approval_records',
    'flow.approvals',
    'flow.core_workflow_instances',
    'flow.core_workflow_tasks',
    'hrm.employees',
    'hrm.employees',
    'lims.ai_analyses',
    'lims.document_relations',
    'pm.project_members',
    'pm.project_milestones',
    'pm.project_phases',
    'pm.projects',
    'pm.report_templates',
    'public.automation_rules',
    'public.automation_runs',
    'public.automation_variables',
    'public.core_faqs',
    'public.core_faqs',
    'public.core_guide_lessons',
    'public.core_guide_lessons',
    'public.core_guide_progress',
    'public.core_guide_progress',
    'public.core_guides',
    'public.core_guides',
    'public.monitor_settings',
    'public.search_logs',
    'public.system_settings',
    'qms.qa_ehs_hazards',
    'wms.inventory',
    'wms.inventory'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2))
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)
                 AND column_name = 'tenant_id') THEN
      EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
      EXECUTE 'ALTER TABLE ' || t || ' FORCE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS rls_tenant_isolation ON ' || t;
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$
        FOR ALL
        USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$policy$;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'integration.erp_connections',
    'integration.erp_mappings',
    'integration.external_erp_sync_logs',
    'mobile.oa_announcements',
    'mobile.oa_calendar_events',
    'mobile.oa_meetings',
    'mobile.oa_tasks'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2))
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)
                 AND column_name = 'tenant_id') THEN
      EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
      EXECUTE 'ALTER TABLE ' || t || ' FORCE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS rls_tenant_isolation ON ' || t;
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$
        FOR ALL
        USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
        WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))$policy$;
    END IF;
  END LOOP;
END $$;
