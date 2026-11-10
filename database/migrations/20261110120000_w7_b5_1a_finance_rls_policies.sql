-- ============================================================
-- W7 · B5-1a 财务域 RLS 收敛（59 张：v5x 57 + reconcile_items + sales_invoices）
-- 版本：20261110120000
--
-- 依据：docs/quality/w7-b5-finance-freeze-2026-11-10.md §1（109 张冻结名单）
--       docs/quality/w7-b5-finance-impact-2026-11-10.md §8（分批）
--
-- 本批共性：全部为 0 行空表 / 新功能表，无全局行、无跨租户口径，可最先上窗口。
--
-- 每张表最终只保留（permissive 是 OR 关系，历史条目一律先清空）：
--   1) rls_tenant_isolation  FOR ALL
--      USING/WITH CHECK:
--        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--      - 无 nil UUID 全量分支；未设上下文 = 0 行（fail-closed）
--      - 不做列侧 cast；WITH CHECK 不含 tenant_id IS NULL
--
-- 全部 ENABLE + FORCE。守卫式：表不存在/无 tenant_id → WARNING 跳过；
-- 幂等：重复执行结果一致。
--
-- 回滚（急停）：scripts/ops/w7_b5_1a_rollback.sql
-- ============================================================

SET lock_timeout = '5s';

DO $w7b5_1a_policy$
DECLARE
    v_pred CONSTANT text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'''
        ' OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    r record;
    p record;
    v_target int := 0;
    v_skipped int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance', 'finance_alert_configs_v52'),
            ('finance', 'finance_alert_history_v52'),
            ('finance', 'finance_anomaly_alerts_v52'),
            ('finance', 'finance_audit_findings_v52'),
            ('finance', 'finance_audit_rules_v52'),
            ('finance', 'finance_budget_variances_v53'),
            ('finance', 'finance_cash_flow_predictions_v53'),
            ('finance', 'finance_detection_configs_v52'),
            ('finance', 'finance_prediction_models_v53'),
            ('finance', 'finance_v54_fraud_rules'),
            ('finance', 'finance_v54_fraud_scores'),
            ('finance', 'finance_v54_review_results'),
            ('finance', 'finance_v54_review_rules'),
            ('finance', 'finance_v54_review_workflows'),
            ('finance', 'finance_v54_risk_alerts'),
            ('finance', 'finance_v54_risk_indicators'),
            ('finance', 'finance_v55_invoice_items'),
            ('finance', 'finance_v55_invoices'),
            ('finance', 'finance_v55_payment_requests'),
            ('finance', 'finance_v55_payment_results'),
            ('finance', 'finance_v55_reconciliation_results'),
            ('finance', 'finance_v55_reconciliation_rules'),
            ('finance', 'finance_v56_tax_brackets'),
            ('finance', 'finance_v56_tax_forms'),
            ('finance', 'finance_v56_tax_lines'),
            ('finance', 'finance_v56_tax_plans'),
            ('finance', 'finance_v56_tax_rates'),
            ('finance', 'finance_v56_tax_suggestions'),
            ('finance', 'finance_v57_analysis_dimensions'),
            ('finance', 'finance_v57_analysis_results'),
            ('finance', 'finance_v57_forecast_models'),
            ('finance', 'finance_v57_generated_reports'),
            ('finance', 'finance_v57_insights'),
            ('finance', 'finance_v57_report_templates'),
            ('finance', 'finance_v58_cash_pools'),
            ('finance', 'finance_v58_forecast_results'),
            ('finance', 'finance_v58_forecast_scenarios'),
            ('finance', 'finance_v58_liquidity_targets'),
            ('finance', 'finance_v58_optimization_results'),
            ('finance', 'finance_v58_pool_allocations'),
            ('finance', 'finance_v58_pool_transfers'),
            ('finance', 'finance_v59_credit_profiles'),
            ('finance', 'finance_v59_device_profiles'),
            ('finance', 'finance_v59_fraud_decisions'),
            ('finance', 'finance_v59_fraud_rules'),
            ('finance', 'finance_v59_fraud_signals'),
            ('finance', 'finance_v59_scoring_models'),
            ('finance', 'finance_v59_stress_results'),
            ('finance', 'finance_v59_stress_scenarios'),
            ('finance', 'finance_v60_alert_channels'),
            ('finance', 'finance_v60_alert_rules'),
            ('finance', 'finance_v60_alerts'),
            ('finance', 'finance_v60_decision_results'),
            ('finance', 'finance_v60_decision_scenarios'),
            ('finance', 'finance_v60_schedule_dependencies'),
            ('finance', 'finance_v60_schedule_executions'),
            ('finance', 'finance_v60_schedule_tasks'),
            ('finance', 'reconcile_items'),
            ('finance', 'sales_invoices')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE WARNING 'W7-B5-1a 跳过 %.%：表不存在', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND attname = 'tenant_id' AND attnum > 0 AND NOT attisdropped
        ) THEN
            RAISE WARNING 'W7-B5-1a 跳过 %.%：无 tenant_id 列', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, r.sch, r.tbl);
        END LOOP;

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
            r.sch, r.tbl, v_pred, v_pred);

        v_target := v_target + 1;
    END LOOP;

    RAISE NOTICE 'W7-B5-1a：收敛 % 张，跳过 % 张', v_target, v_skipped;
END
$w7b5_1a_policy$;

-- 结构断言：59 张必须 ENABLE + FORCE，且策略数 = 1
DO $w7b5_1a_assert$
DECLARE
    r record;
    v_pols int;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance', 'finance_alert_configs_v52'),
            ('finance', 'finance_alert_history_v52'),
            ('finance', 'finance_anomaly_alerts_v52'),
            ('finance', 'finance_audit_findings_v52'),
            ('finance', 'finance_audit_rules_v52'),
            ('finance', 'finance_budget_variances_v53'),
            ('finance', 'finance_cash_flow_predictions_v53'),
            ('finance', 'finance_detection_configs_v52'),
            ('finance', 'finance_prediction_models_v53'),
            ('finance', 'finance_v54_fraud_rules'),
            ('finance', 'finance_v54_fraud_scores'),
            ('finance', 'finance_v54_review_results'),
            ('finance', 'finance_v54_review_rules'),
            ('finance', 'finance_v54_review_workflows'),
            ('finance', 'finance_v54_risk_alerts'),
            ('finance', 'finance_v54_risk_indicators'),
            ('finance', 'finance_v55_invoice_items'),
            ('finance', 'finance_v55_invoices'),
            ('finance', 'finance_v55_payment_requests'),
            ('finance', 'finance_v55_payment_results'),
            ('finance', 'finance_v55_reconciliation_results'),
            ('finance', 'finance_v55_reconciliation_rules'),
            ('finance', 'finance_v56_tax_brackets'),
            ('finance', 'finance_v56_tax_forms'),
            ('finance', 'finance_v56_tax_lines'),
            ('finance', 'finance_v56_tax_plans'),
            ('finance', 'finance_v56_tax_rates'),
            ('finance', 'finance_v56_tax_suggestions'),
            ('finance', 'finance_v57_analysis_dimensions'),
            ('finance', 'finance_v57_analysis_results'),
            ('finance', 'finance_v57_forecast_models'),
            ('finance', 'finance_v57_generated_reports'),
            ('finance', 'finance_v57_insights'),
            ('finance', 'finance_v57_report_templates'),
            ('finance', 'finance_v58_cash_pools'),
            ('finance', 'finance_v58_forecast_results'),
            ('finance', 'finance_v58_forecast_scenarios'),
            ('finance', 'finance_v58_liquidity_targets'),
            ('finance', 'finance_v58_optimization_results'),
            ('finance', 'finance_v58_pool_allocations'),
            ('finance', 'finance_v58_pool_transfers'),
            ('finance', 'finance_v59_credit_profiles'),
            ('finance', 'finance_v59_device_profiles'),
            ('finance', 'finance_v59_fraud_decisions'),
            ('finance', 'finance_v59_fraud_rules'),
            ('finance', 'finance_v59_fraud_signals'),
            ('finance', 'finance_v59_scoring_models'),
            ('finance', 'finance_v59_stress_results'),
            ('finance', 'finance_v59_stress_scenarios'),
            ('finance', 'finance_v60_alert_channels'),
            ('finance', 'finance_v60_alert_rules'),
            ('finance', 'finance_v60_alerts'),
            ('finance', 'finance_v60_decision_results'),
            ('finance', 'finance_v60_decision_scenarios'),
            ('finance', 'finance_v60_schedule_dependencies'),
            ('finance', 'finance_v60_schedule_executions'),
            ('finance', 'finance_v60_schedule_tasks'),
            ('finance', 'reconcile_items'),
            ('finance', 'sales_invoices')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl;
        IF v_pols <> 1 THEN
            v_bad := v_bad || format(' %I.%I 策略数=%s(期望1);', r.sch, r.tbl, v_pols);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' %I.%I 未 ENABLE/FORCE;', r.sch, r.tbl);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'W7-B5-1a 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B5-1a 结构断言通过（59 张）';
END
$w7b5_1a_assert$;
