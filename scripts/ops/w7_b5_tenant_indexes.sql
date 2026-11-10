-- ============================================================
-- W7 · B5 租户索引补齐（109 张，幂等）
--
--   psql -d <db> -v ON_ERROR_STOP=1 -f scripts/ops/w7_b5_tenant_indexes.sql
--
-- 仅当表存在「以 tenant_id 为前导列」的索引时跳过；否则创建
-- idx_<table>_tenant_id。RLS 谓词 tenant_id = ... 需要该索引避免全表扫。
-- 只建索引，不改策略、不写数据。
-- ============================================================

SET lock_timeout = '5s';

DO $idx$
DECLARE
    r record;
    v_has boolean;
    v_n int := 0;
    v_name text;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('core_finance_report_line_map', true),
            ('core_finance_accounts', false),
            ('core_finance_currencies', true),
            ('core_finance_ledger', false),
            ('core_finance_voucher_lines', false),
            ('cqrs_projection_progress', false),
            ('core_finance_periods', false),
            ('core_finance_vouchers', false),
            ('accounting_subjects', false),
            ('budgets', false),
            ('core_finance_approval_nodes', false),
            ('core_finance_approval_workflows', false),
            ('core_finance_aux_accounts', false),
            ('core_finance_aux_balances', false),
            ('core_finance_payment_approval_config', false),
            ('core_finance_payment_items', false),
            ('core_finance_payment_workflow', false),
            ('core_finance_payments', false),
            ('core_finance_reconciliation_items', false),
            ('core_finance_reconciliation_sessions', false),
            ('difference_adjustments', false),
            ('erp_collection_records', false),
            ('erp_payables', false),
            ('erp_payment_records', false),
            ('erp_receivables', false),
            ('expense_approvals', false),
            ('expenses', false),
            ('finance_alert_configs_v52', false),
            ('finance_alert_history_v52', false),
            ('finance_anomaly_alerts_v52', false),
            ('finance_audit_findings_v52', false),
            ('finance_audit_log', false),
            ('finance_audit_rules_v52', false),
            ('finance_budget_variances_v53', false),
            ('finance_cash_flow_predictions_v53', false),
            ('finance_compliance_issues', false),
            ('finance_compliance_reports', false),
            ('finance_control_matrices', false),
            ('finance_control_points', false),
            ('finance_detection_configs_v52', false),
            ('finance_prediction_models_v53', false),
            ('finance_risk_assessments', false),
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
            ('finance_voucher_generation_rules', false),
            ('finance_voucher_template_lines', false),
            ('finance_voucher_templates', false),
            ('financial_reports', false),
            ('mv_receivable_aging', false),
            ('mv_voucher_summary', false),
            ('payables', false),
            ('receivables', false),
            ('reconcile_items', false),
            ('reconcile_orders', false),
            ('reconciliation_item_snapshots', false),
            ('reconciliation_orders', false),
            ('reconciliation_settlement_links', false),
            ('reconciliation_snapshots', false),
            ('sales_invoices', false),
            ('settlement_center_dashboards', false),
            ('settlement_snapshots', false),
            ('source_amount_snapshots', false),
            ('vouchers', false)
        ) AS v(tbl, global_read)
    LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        SELECT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute a
              ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
            WHERE i.indrelid = to_regclass(format('finance.%I', r.tbl))
              AND a.attname = 'tenant_id'
        ) INTO v_has;
        IF v_has THEN
            CONTINUE;
        END IF;
        v_name := 'idx_' || r.tbl || '_tenant_id';
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON finance.%I (tenant_id)', v_name, r.tbl);
        v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE 'W7-B5 租户索引：新建 % 条', v_n;
END
$idx$;
