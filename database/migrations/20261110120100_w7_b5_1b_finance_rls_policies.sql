-- ============================================================
-- W7 · B5-1b 财务域 RLS 收敛（39 张空表）
-- 版本：20261110120100
--
-- 依据：docs/quality/w7-b5-finance-freeze-2026-11-10.md §1
--
-- 本批共性：生产全部 0 行。无全局行、无跨租户口径；依赖 B5-1a 先行的代码
-- 作用域改造（services/finance 已无裸池）。
--
-- 策略形态与 B5-1a 完全一致：每表仅 1 条 rls_tenant_isolation FOR ALL，
-- 系统通道 OR 租户相等，未设上下文 = 0 行；ENABLE + FORCE；幂等。
--
-- 回滚（急停）：scripts/ops/w7_b5_1b_rollback.sql
-- ============================================================

SET lock_timeout = '5s';

DO $w7b5_1b_policy$
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
            ('finance', 'accounting_subjects'),
            ('finance', 'budgets'),
            ('finance', 'core_finance_approval_nodes'),
            ('finance', 'core_finance_approval_workflows'),
            ('finance', 'core_finance_aux_accounts'),
            ('finance', 'core_finance_aux_balances'),
            ('finance', 'core_finance_payment_approval_config'),
            ('finance', 'core_finance_payment_items'),
            ('finance', 'core_finance_payment_workflow'),
            ('finance', 'core_finance_payments'),
            ('finance', 'core_finance_reconciliation_items'),
            ('finance', 'core_finance_reconciliation_sessions'),
            ('finance', 'difference_adjustments'),
            ('finance', 'erp_collection_records'),
            ('finance', 'erp_payables'),
            ('finance', 'erp_payment_records'),
            ('finance', 'erp_receivables'),
            ('finance', 'expense_approvals'),
            ('finance', 'expenses'),
            ('finance', 'finance_audit_log'),
            ('finance', 'finance_compliance_issues'),
            ('finance', 'finance_compliance_reports'),
            ('finance', 'finance_control_matrices'),
            ('finance', 'finance_control_points'),
            ('finance', 'finance_risk_assessments'),
            ('finance', 'finance_voucher_generation_rules'),
            ('finance', 'finance_voucher_template_lines'),
            ('finance', 'finance_voucher_templates'),
            ('finance', 'payables'),
            ('finance', 'receivables'),
            ('finance', 'reconcile_orders'),
            ('finance', 'reconciliation_item_snapshots'),
            ('finance', 'reconciliation_orders'),
            ('finance', 'reconciliation_settlement_links'),
            ('finance', 'reconciliation_snapshots'),
            ('finance', 'settlement_center_dashboards'),
            ('finance', 'settlement_snapshots'),
            ('finance', 'source_amount_snapshots'),
            ('finance', 'vouchers')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE WARNING 'W7-B5-1b 跳过 %.%：表不存在', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND attname = 'tenant_id' AND attnum > 0 AND NOT attisdropped
        ) THEN
            RAISE WARNING 'W7-B5-1b 跳过 %.%：无 tenant_id 列', r.sch, r.tbl;
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

    RAISE NOTICE 'W7-B5-1b：收敛 % 张，跳过 % 张', v_target, v_skipped;
END
$w7b5_1b_policy$;

-- 结构断言：39 张必须 ENABLE + FORCE，策略数 = 1
DO $w7b5_1b_assert$
DECLARE
    r record;
    v_pols int;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance', 'accounting_subjects'),
            ('finance', 'budgets'),
            ('finance', 'core_finance_approval_nodes'),
            ('finance', 'core_finance_approval_workflows'),
            ('finance', 'core_finance_aux_accounts'),
            ('finance', 'core_finance_aux_balances'),
            ('finance', 'core_finance_payment_approval_config'),
            ('finance', 'core_finance_payment_items'),
            ('finance', 'core_finance_payment_workflow'),
            ('finance', 'core_finance_payments'),
            ('finance', 'core_finance_reconciliation_items'),
            ('finance', 'core_finance_reconciliation_sessions'),
            ('finance', 'difference_adjustments'),
            ('finance', 'erp_collection_records'),
            ('finance', 'erp_payables'),
            ('finance', 'erp_payment_records'),
            ('finance', 'erp_receivables'),
            ('finance', 'expense_approvals'),
            ('finance', 'expenses'),
            ('finance', 'finance_audit_log'),
            ('finance', 'finance_compliance_issues'),
            ('finance', 'finance_compliance_reports'),
            ('finance', 'finance_control_matrices'),
            ('finance', 'finance_control_points'),
            ('finance', 'finance_risk_assessments'),
            ('finance', 'finance_voucher_generation_rules'),
            ('finance', 'finance_voucher_template_lines'),
            ('finance', 'finance_voucher_templates'),
            ('finance', 'payables'),
            ('finance', 'receivables'),
            ('finance', 'reconcile_orders'),
            ('finance', 'reconciliation_item_snapshots'),
            ('finance', 'reconciliation_orders'),
            ('finance', 'reconciliation_settlement_links'),
            ('finance', 'reconciliation_snapshots'),
            ('finance', 'settlement_center_dashboards'),
            ('finance', 'settlement_snapshots'),
            ('finance', 'source_amount_snapshots'),
            ('finance', 'vouchers')
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
        RAISE EXCEPTION 'W7-B5-1b 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B5-1b 结构断言通过（39 张）';
END
$w7b5_1b_assert$;
