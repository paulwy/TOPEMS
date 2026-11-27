-- 回滚 20261127230000：从 archive.rls_policy_before_20261127 还原原表达式
SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
DECLARE
    r record;
    n int := 0;
BEGIN
    FOR r IN SELECT * FROM archive.rls_policy_before_20261127 WHERE batch = 'RLS-NULL-BYPASS-20261127'
    LOOP
        IF r.with_check_before IS NULL THEN
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, r.qual_before);
        ELSE
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, r.qual_before, r.with_check_before);
        END IF;
        n := n + 1;
    END LOOP;
    RAISE NOTICE '回滚完成：还原 % 条策略', n;
END $$;
