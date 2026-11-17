-- 回滚：20261118103000_residual_loose_tables_rls_strict.sql
-- 恢复 3 张表迁移前的宽松策略（allow_all）与「无 tenant_id 索引」状态，供非生产库与应急使用。
-- 注意：本回滚会把 hrm.initialization_logs / qms 两张遗留表重新置于无租户隔离的旧状态，
-- 仅用于回退验证，不得作为长期方案。

-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 删除严格策略
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE (p.schemaname = 'hrm' AND p.tablename = 'initialization_logs')
            OR (p.schemaname = 'qms' AND p.tablename IN ('quality_inspections', 'quality_standards'))
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '回滚：已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 2. 关闭 RLS
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'hrm.initialization_logs',
        'qms.quality_inspections',
        'qms.quality_standards'
    ] LOOP
        EXECUTE format('ALTER TABLE %s NO FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 3. 删除新索引（qms 两张表沿用迁移前既有的 tenant_id 索引，不动）
DROP INDEX IF EXISTS hrm.idx_initialization_logs_tenant_id;

-- 4. 重建原 allow_all 策略
DO $$
BEGIN
    CREATE POLICY hrm_allow_all_initialization_logs ON hrm.initialization_logs
        FOR ALL TO public USING (true) WITH CHECK (true);
    CREATE POLICY qms_allow_all_quality_inspections ON qms.quality_inspections
        FOR ALL TO public USING (true) WITH CHECK (true);
    CREATE POLICY qms_allow_all_quality_standards ON qms.quality_standards
        FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

-- 5. 回滚后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    rls boolean;
    frls boolean;
    has_idx boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'hrm.initialization_logs',
        'qms.quality_inspections',
        'qms.quality_standards'
    ] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚后置断言失败：% 策略数 = %（期望 1 条 allow_all）', t, n_pol;
        END IF;
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '回滚后置断言失败：% 的 rls/force_rls = %/%（期望 false/false）', t, rls, frls;
        END IF;
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes i
             WHERE i.schemaname = split_part(t, '.', 1)
               AND i.indexname = 'idx_' || split_part(t, '.', 2) || '_tenant_id'
        ) INTO has_idx;
        IF has_idx THEN
            RAISE EXCEPTION '回滚后置断言失败：% 的新建 tenant_id 索引未删除', t;
        END IF;
        RAISE NOTICE '回滚完成：% 已恢复 allow_all / 无 RLS / 无 tenant_id 索引', t;
    END LOOP;
END $$;
