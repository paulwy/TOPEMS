-- ============================================================
-- W7 · B5 B5-1b 回滚（39 张）
--
-- 急停回滚：删除本批策略并 NO FORCE（保留 ENABLE），恢复 owner 旁路。
-- ⚠️ 必须在单事务内执行：psql -d <db> -v ON_ERROR_STOP=1 -1 -f scripts/ops/w7_b5_1b_rollback.sql
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
            ('finance_audit_log', false),
            ('finance_compliance_issues', false),
            ('finance_compliance_reports', false),
            ('finance_control_matrices', false),
            ('finance_control_points', false),
            ('finance_risk_assessments', false),
            ('finance_voucher_generation_rules', false),
            ('finance_voucher_template_lines', false),
            ('finance_voucher_templates', false),
            ('payables', false),
            ('receivables', false),
            ('reconcile_orders', false),
            ('reconciliation_item_snapshots', false),
            ('reconciliation_orders', false),
            ('reconciliation_settlement_links', false),
            ('reconciliation_snapshots', false),
            ('settlement_center_dashboards', false),
            ('settlement_snapshots', false),
            ('source_amount_snapshots', false),
            ('vouchers', false)
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
    RAISE NOTICE 'B5-1b 回滚（39 张）：回滚 % 张（NO FORCE，策略已删）', v_n;
END
$rb$;
