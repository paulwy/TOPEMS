-- ============================================================
-- W7 · B5 B5-3 回滚（8 张核心账簿）
--
-- 急停回滚：删除本批策略并 NO FORCE（保留 ENABLE），恢复 owner 旁路。
-- ⚠️ 必须在单事务内执行：psql -d <db> -v ON_ERROR_STOP=1 -1 -f scripts/ops/w7_b5_3_rollback.sql
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
            ('core_finance_ledger', false),
            ('core_finance_vouchers', false),
            ('core_finance_voucher_lines', false),
            ('core_finance_periods', false),
            ('cqrs_projection_progress', false),
            ('financial_reports', false),
            ('mv_receivable_aging', false),
            ('mv_voucher_summary', false)
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
    RAISE NOTICE 'B5-3 回滚（8 张核心账簿）：回滚 % 张（NO FORCE，策略已删）', v_n;
END
$rb$;
