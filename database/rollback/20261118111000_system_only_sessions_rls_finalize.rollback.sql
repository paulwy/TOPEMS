-- 回滚 20261118111000_system_only_sessions_rls_finalize.sql
-- 两表迁移前后策略定义一致（均为 system-only），回滚即按迁移前原样重建并断言，
-- 不触碰任何数据。
SELECT set_config('app.rls_system', 'on', false);

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_sessions', 'public.core_refresh_tokens'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS rls_system_only ON %s', t);
        EXECUTE format($f$
            CREATE POLICY rls_system_only ON %s
                FOR ALL TO public
                USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
                WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
        $f$, t);
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        RAISE NOTICE '已恢复 %（rls_system_only）', t;
    END LOOP;
END $$;

DO $$
DECLARE
    t text;
    n_pol int;
    n_tenant_branch int;
    rls boolean;
    frls boolean;
    n_login_pol int;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_sessions', 'public.core_refresh_tokens'] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;

        SELECT count(*) INTO n_tenant_branch
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2)
           AND (coalesce(p.qual, '') LIKE '%app.tenant_id%'
                OR coalesce(p.with_check, '') LIKE '%app.tenant_id%');
        IF n_tenant_branch <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 出现租户分支', t;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls/force_rls = %/%', t, rls, frls;
        END IF;
    END LOOP;

    SELECT count(*) INTO n_login_pol
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'core_login_logs';
    IF n_login_pol <> 2 THEN
        RAISE EXCEPTION '回滚断言失败：public.core_login_logs 策略数 = %（期望 2）', n_login_pol;
    END IF;

    RAISE NOTICE '回滚完成：两表恢复迁移前 system-only 定义';
END $$;
