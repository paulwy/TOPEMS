-- ============================================================
-- W7 · B5-2 财务全域行（3 张：currencies / report_line_map / accounts）
-- 版本：20261110120200
--
-- 依据：docs/quality/w7-b5-finance-freeze-2026-11-10.md §2（全局行白名单）
--       docs/quality/w7-b5-finance-impact-2026-11-10.md §8
--
-- 三张表策略：
--   1) core_finance_currencies（迁移前 NO_RLS，16 行 = 8 全局 NULL + 8 租户）
--      - ENABLE + FORCE
--      - rls_tenant_isolation FOR ALL：系统通道 OR tenant_id = 当前租户
--      - rls_global_read     FOR SELECT：上面谓词 OR tenant_id IS NULL
--        → 全局币种对所有租户只读；租户不能写 NULL 行（WITH CHECK 无 NULL 分支）
--   2) core_finance_report_line_map（48 行，全部 tenant_id IS NULL）
--      - 同上两条策略：全局行只读；租户可写自己的行
--   3) core_finance_accounts（28 行，全部 …0001）
--      - 仅 rls_tenant_isolation，无全局行
--
-- cqrs_projection_progress 不在本批：其 2 行是 nil UUID（…0000），不是 NULL，
-- 按 nil 租户系统通道处理，见 B5-3。
--
-- 回滚（急停）：scripts/ops/w7_b5_2_rollback.sql
--   - currencies 迁移前无 RLS，回滚需 DROP POLICY + DISABLE RLS
--   - report_line_map / accounts 保留 ENABLE，仅 NO FORCE
-- ============================================================

SET lock_timeout = '5s';

DO $w7b5_2_policy$
DECLARE
    v_pred CONSTANT text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'''
        ' OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    r record;
    p record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('core_finance_currencies', true),
            ('core_finance_report_line_map', true),
            ('core_finance_accounts', false)
        ) AS v(tbl, global_read)
    LOOP
        IF to_regclass(format('finance.%I', r.tbl)) IS NULL THEN
            RAISE EXCEPTION 'W7-B5-2 目标表 finance.% 不存在', r.tbl;
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

        IF r.global_read THEN
            EXECUTE format(
                'CREATE POLICY rls_global_read ON finance.%I FOR SELECT TO PUBLIC USING (%s OR tenant_id IS NULL)',
                r.tbl, v_pred);
        END IF;
    END LOOP;

    RAISE NOTICE 'W7-B5-2：3 张表策略收敛完成';
END
$w7b5_2_policy$;

-- 结构断言：currencies/report_line_map = 2 条策略，accounts = 1 条；全部 ENABLE+FORCE
DO $w7b5_2_assert$
DECLARE
    r record;
    v_pols int;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('core_finance_currencies', 2),
            ('core_finance_report_line_map', 2),
            ('core_finance_accounts', 1)
        ) AS v(tbl, exp_pols)
    LOOP
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = 'finance' AND tablename = r.tbl;
        IF v_pols <> r.exp_pols THEN
            v_bad := v_bad || format(' finance.% 策略数=%s(期望%s);', r.tbl, v_pols, r.exp_pols);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('finance.%I', r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' finance.% 未 ENABLE/FORCE;', r.tbl);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'W7-B5-2 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B5-2 结构断言通过（2/2/1 条策略）';
END
$w7b5_2_assert$;
