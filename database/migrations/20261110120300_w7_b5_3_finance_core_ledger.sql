-- ============================================================
-- W7 · B5-3 财务核心账簿 RLS 收敛（8 张）
-- 版本：20261110120300
--
-- 依据：docs/quality/w7-b5-finance-freeze-2026-11-10.md §1/§4
--       docs/quality/w7-b5-finance-impact-2026-11-10.md §8
--
-- 表集（生产行数）：
--   core_finance_ledger            4 行（基线 debit=credit=200.0000）
--   core_finance_vouchers          1 行
--   core_finance_voucher_lines     2 行
--   core_finance_periods           1 行
--   cqrs_projection_progress       2 行（tenant_id = …0000，nil 租户，非 NULL）
--   financial_reports              0 行
--   mv_receivable_aging            0 行
--   mv_voucher_summary             0 行
--
-- 策略：每表仅 1 条 rls_tenant_isolation FOR ALL（系统通道 OR 租户相等）。
--   - 本批不含 rls_global_read：账簿/凭证/期间/报表均无全局行语义。
--   - cqrs_projection_progress 的 nil 行只能由系统通道（app.rls_system='on'）
--     读写；**不得**给它加 tenant_id IS NULL 分支（那是 0 行语义，会误放行）。
--   - mv_* 重建必须走系统通道（B5 代码改造后仍以 Db::scope_system 执行）。
--
-- 回滚（急停）：scripts/ops/w7_b5_3_rollback.sql
-- ============================================================

SET lock_timeout = '5s';

DO $w7b5_3_policy$
DECLARE
    v_pred CONSTANT text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'''
        ' OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    r record;
    p record;
    v_target int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('core_finance_ledger'),
            ('core_finance_vouchers'),
            ('core_finance_voucher_lines'),
            ('core_finance_periods'),
            ('cqrs_projection_progress'),
            ('financial_reports'),
            ('mv_receivable_aging'),
            ('mv_voucher_summary')
        ) AS v(tbl)
    LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            RAISE EXCEPTION 'W7-B5-3 目标表 finance.% 不存在', r.tbl;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass(format('finance.%I', r.tbl))
              AND attname = 'tenant_id' AND attnum > 0 AND NOT attisdropped
        ) THEN
            RAISE EXCEPTION 'W7-B5-3 finance.% 无 tenant_id 列', r.tbl;
        END IF;

        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'finance' AND tablename = r.tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON finance.%I', p.policyname, r.tbl);
        END LOOP;

        EXECUTE format('ALTER TABLE finance.%I ENABLE ROW LEVEL SECURITY', r.tbl);
        EXECUTE format('ALTER TABLE finance.%I FORCE ROW LEVEL SECURITY', r.tbl);

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON finance.%I FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
            r.tbl, v_pred, v_pred);

        v_target := v_target + 1;
    END LOOP;

    RAISE NOTICE 'W7-B5-3：收敛 % 张核心账簿表', v_target;
END
$w7b5_3_policy$;

-- 结构断言：8 张 ENABLE+FORCE、策略数 = 1、无 tenant_id IS NULL 分支
DO $w7b5_3_assert$
DECLARE
    r record;
    v_pols int;
    v_nil int;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('core_finance_ledger'),
            ('core_finance_vouchers'),
            ('core_finance_voucher_lines'),
            ('core_finance_periods'),
            ('cqrs_projection_progress'),
            ('financial_reports'),
            ('mv_receivable_aging'),
            ('mv_voucher_summary')
        ) AS v(tbl)
    LOOP
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = 'finance' AND tablename = r.tbl;
        IF v_pols <> 1 THEN
            v_bad := v_bad || format(' finance.% 策略数=%s(期望1);', r.tbl, v_pols);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('finance.%I', r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' finance.% 未 ENABLE/FORCE;', r.tbl);
        END IF;
        SELECT count(*) INTO v_nil
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'finance' AND c.relname = r.tbl
          AND coalesce(pg_get_expr(p.polqual, p.polrelid), '') LIKE '%tenant_id IS NULL%';
        IF v_nil <> 0 THEN
            v_bad := v_bad || format(' finance.% 出现 tenant_id IS NULL 分支;', r.tbl);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'W7-B5-3 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B5-3 结构断言通过（8 张；无 NULL 全局分支）';
END
$w7b5_3_assert$;
