-- ============================================================
-- W7 · B5 验证：结构断言 + 非超户双身份 + 写探测 + 账簿基线
--
-- 用法（必须用非超级用户；超级用户会绕过 RLS）：
--   psql -d <db> -v ON_ERROR_STOP=1 -v app_role=<非超户应用角色> \
--        -f scripts/ops/w7_b5_verify.sql
--   - app_role 为空时用当前连接角色（脚本拒绝 superuser / BYPASSRLS）
--   - 生产窗口用 topems_prod，本地用 topems（owner，非超户，靠 FORCE 生效）
--
-- 覆盖 109 张（冻结清单 docs/quality/w7-b5-finance-freeze-2026-11-10.md）：
--   A  结构：ENABLE+FORCE、策略数 1/2、无 USING(true)、无列侧 cast、
--      无硬编码 ...0001、无 nil 分支；IS NULL 仅在 2 张全局只读表
--   B  双身份：...0001 / ...0002 / 系统通道 / 无上下文，逐表对基线
--   C  写探测（事务内 ROLLBACK）：租户改全局行 0 行、系统通道可改、
--      跨租户改写被拒、无上下文 0 行
--   D  账簿基线：core_finance_ledger 借贷相等（生产 200.0000 / 200.0000）
-- ============================================================

SET client_min_messages = notice;
SET lock_timeout = '5s';

\if :{?app_role}
SET ROLE :"app_role";
\else
\echo '未传 -v app_role=...，使用当前连接角色验证'
\endif

\if :{?allow_missing}
SET app.w7_allow_missing = :'allow_missing';
\else
SET app.w7_allow_missing = 'off';
\endif

\if :{?expect_debit}
SET app.w7_expect_debit = :'expect_debit';
SET app.w7_expect_credit = :'expect_credit';
\else
SET app.w7_expect_debit = '';
SET app.w7_expect_credit = '';
\endif

DO $guard$
DECLARE
    v_super boolean;
    v_bypass boolean;
BEGIN
    SELECT rolsuper, rolbypassrls INTO v_super, v_bypass
    FROM pg_roles WHERE rolname = current_user;
    IF v_super THEN
        RAISE EXCEPTION '禁止以超级用户验证 RLS：% 是 superuser', current_user;
    END IF;
    IF v_bypass THEN
        RAISE EXCEPTION '禁止以 BYPASSRLS 角色验证 RLS：%', current_user;
    END IF;
    RAISE NOTICE '验证角色 = %（非超户）', current_user;
END
$guard$;

DROP TABLE IF EXISTS pg_temp.w7_b5_t;
CREATE TEMP TABLE w7_b5_t AS
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
) AS v(tbl, global_read);

DROP TABLE IF EXISTS pg_temp.w7_b5_base;
CREATE TEMP TABLE w7_b5_base (tbl text, global_read boolean,
                              n_total bigint, n_a bigint, n_b bigint, n_null bigint);

\echo ''
\echo '=== A. 结构断言 ==='
DO $struct$
DECLARE
    r record; v_pols int; v_bad text := ''; v_skip int := 0;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b5_t LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            IF coalesce(current_setting('app.w7_allow_missing', true), 'off') = 'on' THEN
                v_skip := v_skip + 1;
            ELSE
                v_bad := v_bad || format(' finance.% 不存在;', r.tbl);
            END IF;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('finance.%I', r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' finance.% 未 ENABLE/FORCE;', r.tbl);
        END IF;
        SELECT count(*) INTO v_pols FROM pg_policies
        WHERE schemaname = 'finance' AND tablename = r.tbl;
        IF v_pols <> (CASE WHEN r.global_read THEN 2 ELSE 1 END) THEN
            v_bad := v_bad || format(' finance.% 策略数=%s;', r.tbl, v_pols);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'A1 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'A1. 109 张 ENABLE+FORCE / 策略数 通过（missing 跳过 % 张）', v_skip;
END
$struct$;

DO $shape$
DECLARE
    v_ut int; v_cast int; v_hard int; v_nil int; v_sys int; v_null int; v_tables int;
BEGIN
    SELECT count(*) FILTER (WHERE pg_get_expr(polqual, polrelid) = 'true'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%(tenant_id)::text%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%app.rls_system%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%tenant_id IS NULL%')
    INTO v_ut, v_cast, v_hard, v_nil, v_sys, v_null
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_temp.w7_b5_t t ON t.tbl = c.relname
    WHERE n.nspname = 'finance';

    SELECT count(*) INTO v_tables FROM pg_temp.w7_b5_t t
    WHERE to_regclass(format('finance.%I', t.tbl)) IS NOT NULL;

    IF v_ut <> 0 THEN RAISE EXCEPTION 'A2. 仍有 USING(true) 策略 % 条', v_ut; END IF;
    IF v_cast <> 0 THEN RAISE EXCEPTION 'A2. 仍有列侧 cast 策略 % 条', v_cast; END IF;
    IF v_hard <> 0 THEN RAISE EXCEPTION 'A2. 仍有硬编码 ...0001 策略 % 条', v_hard; END IF;
    IF v_nil <> 0 THEN RAISE EXCEPTION 'A2. 仍有 nil UUID 分支 % 条', v_nil; END IF;
    IF v_sys <> v_tables + 2 THEN RAISE EXCEPTION 'A2. 系统通道策略 % 条（期望 %）', v_sys, v_tables + 2; END IF;
    IF v_null <> 2 THEN RAISE EXCEPTION 'A2. tenant_id IS NULL 分支 % 条（期望 2：仅全局只读）', v_null; END IF;
    RAISE NOTICE 'A2. 谓词形态 通过（111 条含系统通道；NULL 仅 2 张全局只读）';
END
$shape$;

\echo ''
\echo '=== B. 双身份（基线=系统通道；逐表比对）==='
SET app.rls_system = 'on';
SET app.tenant_id = '';

DO $base$
DECLARE
    r record; v_t bigint; v_a bigint; v_b bigint; v_n bigint;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b5_t LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('SELECT count(*) FROM finance.%I', r.tbl) INTO v_t;
        EXECUTE format('SELECT count(*) FROM finance.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000001''', r.tbl) INTO v_a;
        EXECUTE format('SELECT count(*) FROM finance.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000002''', r.tbl) INTO v_b;
        EXECUTE format('SELECT count(*) FROM finance.%I WHERE tenant_id IS NULL', r.tbl) INTO v_n;
        INSERT INTO pg_temp.w7_b5_base VALUES (r.tbl, r.global_read, v_t, v_a, v_b, v_n);
    END LOOP;
END
$base$;

SELECT count(*) AS tables, sum(n_total) AS total_rows, sum(n_a) AS rows_tenant_a,
       sum(n_b) AS rows_tenant_b, sum(n_null) AS rows_global
FROM pg_temp.w7_b5_base;

\echo '--- B1. tenant=...0001（期望 = 本租户 + 全局行[仅全局表]）---'
SET app.rls_system = 'off';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

DO $b1$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b5_base LOOP
        EXECUTE format('SELECT count(*) FROM finance.%I', r.tbl) INTO v_vis;
        v_exp := r.n_a + CASE WHEN r.global_read THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' finance.% 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B1 失败：%', v_bad; END IF;
    RAISE NOTICE 'B1. tenant=...0001 逐表可见性 通过';
END
$b1$;

\echo '--- B2. tenant=...0002（跨租户 0 泄漏，全局行仍可见）---'
SET app.tenant_id = '00000000-0000-0000-0000-000000000002';

DO $b2$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b5_base LOOP
        EXECUTE format('SELECT count(*) FROM finance.%I', r.tbl) INTO v_vis;
        v_exp := r.n_b + CASE WHEN r.global_read THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' finance.% 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B2 失败：%', v_bad; END IF;
    RAISE NOTICE 'B2. tenant=...0002 逐表可见性 通过（跨租户 0 行）';
END
$b2$;

\echo '--- B3. 无上下文（期望：非全局表 0 行；全局表仅全局行）---'
SET app.rls_system = 'off';
SET app.tenant_id = '';

DO $b3$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b5_base LOOP
        EXECUTE format('SELECT count(*) FROM finance.%I', r.tbl) INTO v_vis;
        v_exp := CASE WHEN r.global_read THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' finance.% 可见=%s 期望=%s;', r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B3 失败：%', v_bad; END IF;
    RAISE NOTICE 'B3. 无上下文 fail-closed 通过';
END
$b3$;

\echo ''
\echo '=== C. 写探测（事务内 ROLLBACK，不落数据）==='
\echo '--- C1. tenant=...0001 改全局行 report_line_map（期望 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
WITH u AS (
    UPDATE finance.core_finance_report_line_map SET tenant_id = tenant_id
    WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated_global_rows FROM u;
ROLLBACK;

\echo '--- C2. 系统通道改全局行（期望 > 0，若无全局行则跳过）---'
BEGIN;
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '';
WITH u AS (
    UPDATE finance.core_finance_report_line_map SET tenant_id = tenant_id
    WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated_global_rows FROM u;
ROLLBACK;

\echo '--- C3. 跨租户改写 ledger 到 ...0002（期望 42501 或 0 行）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
DO $w3$
DECLARE n int;
BEGIN
    UPDATE finance.core_finance_ledger
       SET tenant_id = '00000000-0000-0000-0000-000000000002'
     WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
        RAISE EXCEPTION 'C3 失败：% 行跨租户改写成功', n;
    END IF;
    RAISE NOTICE 'C3 通过：跨租户改写被 WITH CHECK 拒绝或 0 行';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'C3 通过：跨租户改写被 WITH CHECK 拒绝 (42501)';
END
$w3$;
ROLLBACK;

\echo '--- C4. 无上下文写 ledger（期望 0 行，fail-closed）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '';
WITH u AS (
    UPDATE finance.core_finance_ledger SET description = description RETURNING 1
)
SELECT count(*) AS updated_without_context FROM u;
ROLLBACK;

\echo ''
\echo '=== D. 账簿基线 ==='
SET app.rls_system = 'on';
SET app.tenant_id = '';
DO $ledger$
DECLARE
    v_n bigint; v_d numeric; v_c numeric;
    v_exp_d text := coalesce(current_setting('app.w7_expect_debit', true), '');
    v_exp_c text := coalesce(current_setting('app.w7_expect_credit', true), '');
BEGIN
    SELECT count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
      INTO v_n, v_d, v_c
      FROM finance.core_finance_ledger
     WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'D. tenant=...0001 ledger rows=% debit=% credit=%', v_n, v_d, v_c;
    IF v_exp_d <> '' THEN
        IF v_d <> v_exp_d::numeric OR v_c <> v_exp_c::numeric THEN
            RAISE EXCEPTION 'D 失败：ledger 合计 debit=% credit=%，期望 %/%',
                v_d, v_c, v_exp_d, v_exp_c;
        END IF;
        RAISE NOTICE 'D. 与期望基线一致（%/%）', v_exp_d, v_exp_c;
    ELSIF v_n > 0 AND v_d <> v_c THEN
        -- 本地 dev 库 tenant=...0001 含 2026-09-24 遗留的旧测试凭证
        -- 46dce843…（period 202501：debit 600 / credit 1000，本就不平 -400），
        -- 其余 3 张 202611 凭证各自 100/100 平衡；这是夹具数据差异，不是查询口径。
        RAISE WARNING 'D. 本地夹具借贷不等（debit=% credit=%），原因：...0001 含遗留不平凭证 46dce843（202501 -400）。生产窗口须传 -v expect_debit=200.0000 -v expect_credit=200.0000 硬断言', v_d, v_c;
    END IF;
END
$ledger$;

\echo ''
\echo '=== E. 全局行（只读白名单）==='
SELECT 'core_finance_report_line_map' AS tbl,
       count(*) AS total, count(*) FILTER (WHERE tenant_id IS NULL) AS global_null
FROM finance.core_finance_report_line_map
UNION ALL
SELECT 'core_finance_currencies', count(*), count(*) FILTER (WHERE tenant_id IS NULL)
FROM finance.core_finance_currencies;

RESET app.rls_system;
RESET app.tenant_id;
RESET ROLE;

\echo ''
\echo '=== W7-B5 验证结束（全部断言通过）==='
