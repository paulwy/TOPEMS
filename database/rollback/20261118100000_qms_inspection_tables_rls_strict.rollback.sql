-- 回滚：20261118100000_qms_inspection_tables_rls_strict.sql
-- 恢复 qms 3 张表迁移前的「无 RLS、无策略、无 tenant_id 索引」状态，供非生产库与应急使用。
-- 注意：本回滚会把检验标准读写重新置于无租户隔离兜底的旧状态，仅用于回退验证。

-- destructive-gate: allow
-- ticket: QMS-RLS-20261118

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'qms'
           AND p.tablename IN ('qa_inspection_plans', 'qa_inspection_items', 'qa_sampling_plans')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '回滚：已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qms.qa_inspection_plans',
        'qms.qa_inspection_items',
        'qms.qa_sampling_plans'
    ] LOOP
        EXECUTE format('ALTER TABLE %s NO FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

DROP INDEX IF EXISTS qms.idx_qa_inspection_plans_tenant_id;
DROP INDEX IF EXISTS qms.idx_qa_inspection_items_tenant_id;
DROP INDEX IF EXISTS qms.idx_qa_sampling_plans_tenant_id;

DO $$
DECLARE
    t text;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qms.qa_inspection_plans',
        'qms.qa_inspection_items',
        'qms.qa_sampling_plans'
    ] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = 'qms' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '回滚后置断言失败：% 策略数 = %（期望 0）', t, n_pol;
        END IF;
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '回滚后置断言失败：% 的 rls/force_rls = %/%（期望 false/false）', t, rls, frls;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_indexes i
                    WHERE i.schemaname = 'qms' AND i.tablename = split_part(t, '.', 2)
                      AND i.indexname = 'idx_' || split_part(t, '.', 2) || '_tenant_id') THEN
            RAISE EXCEPTION '回滚后置断言失败：% 的 tenant_id 索引未删除', t;
        END IF;
        RAISE NOTICE '回滚完成：% 已恢复无 RLS/无策略/无索引', t;
    END LOOP;
END $$;
