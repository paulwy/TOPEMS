-- ============================================================
-- W7 · B5 B5-1a 回滚（59 张）
--
-- 急停回滚：删除本批策略并 NO FORCE（保留 ENABLE），恢复 owner 旁路。
-- 迁移前为 NO_RLS 的表：DROP POLICY 后额外 DISABLE ROW LEVEL SECURITY。
-- ⚠️ 必须在单事务内执行：psql -d <db> -v ON_ERROR_STOP=1 -1 -f scripts/ops/w7_b5_1a_rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';

DO $rb$
DECLARE
    r record;
    v_n int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance_alert_configs_v52', false),
            ('finance_alert_history_v52', false),
            ('finance_anomaly_alerts_v52', false),
            ('finance_audit_findings_v52', false),
            ('finance_audit_rules_v52', false),
            ('finance_budget_variances_v53', false),
            ('finance_cash_flow_predictions_v53', false),
            ('finance_detection_configs_v52', false),
            ('finance_prediction_models_v53', false),
            ('finance_v54_fraud_rules', false),
            ('finance_v54_fraud_scores', false),
            ('finance_v54_review_results', false),
            ('finance_v54_review_rules', false),
            ('finance_v54_review_workflows', false),
            ('finance_v54_risk_alerts', false),
            ('finance_v54_risk_indicators', false),
            ('finance_v55_invoice_items', false),
            ('finance_v55_invoices', false),
            ('finance_v55_payment_requests', false),
            ('finance_v55_payment_results', false),
            ('finance_v55_reconciliation_results', false),
            ('finance_v55_reconciliation_rules', false),
            ('finance_v56_tax_brackets', false),
            ('finance_v56_tax_forms', false),
            ('finance_v56_tax_lines', false),
            ('finance_v56_tax_plans', false),
            ('finance_v56_tax_rates', false),
            ('finance_v56_tax_suggestions', false),
            ('finance_v57_analysis_dimensions', false),
            ('finance_v57_analysis_results', false),
            ('finance_v57_forecast_models', false),
            ('finance_v57_generated_reports', false),
            ('finance_v57_insights', false),
            ('finance_v57_report_templates', false),
            ('finance_v58_cash_pools', false),
            ('finance_v58_forecast_results', false),
            ('finance_v58_forecast_scenarios', false),
            ('finance_v58_liquidity_targets', false),
            ('finance_v58_optimization_results', false),
            ('finance_v58_pool_allocations', false),
            ('finance_v58_pool_transfers', false),
            ('finance_v59_credit_profiles', false),
            ('finance_v59_device_profiles', false),
            ('finance_v59_fraud_decisions', false),
            ('finance_v59_fraud_rules', false),
            ('finance_v59_fraud_signals', false),
            ('finance_v59_scoring_models', false),
            ('finance_v59_stress_results', false),
            ('finance_v59_stress_scenarios', false),
            ('finance_v60_alert_channels', false),
            ('finance_v60_alert_rules', false),
            ('finance_v60_alerts', false),
            ('finance_v60_decision_results', false),
            ('finance_v60_decision_scenarios', false),
            ('finance_v60_schedule_dependencies', false),
            ('finance_v60_schedule_executions', false),
            ('finance_v60_schedule_tasks', false),
            ('reconcile_items', true),
            ('sales_invoices', false)
        ) AS v(tbl, was_no_rls)
    LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('DROP POLICY IF EXISTS rls_tenant_isolation ON finance.%I', r.tbl);
        EXECUTE format('DROP POLICY IF EXISTS rls_global_read ON finance.%I', r.tbl);
        EXECUTE format('ALTER TABLE finance.%I NO FORCE ROW LEVEL SECURITY', r.tbl);
        IF r.was_no_rls THEN
            EXECUTE format('ALTER TABLE finance.%I DISABLE ROW LEVEL SECURITY', r.tbl);
        END IF;
        v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE 'B5-1a 回滚（59 张）：回滚 % 张（NO FORCE，策略已删）', v_n;
END
$rb$;
