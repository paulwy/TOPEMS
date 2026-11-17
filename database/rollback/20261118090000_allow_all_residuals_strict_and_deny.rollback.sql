-- 回滚：20261118090000_allow_all_residuals_strict_and_deny.sql
-- 恢复 5 张表迁移前的 public_allow_all_* 策略（ALL / true / true），供非生产库与应急使用。
-- 注意：本回滚会把业务流程重新置于「RLS 开启但全放行」的旧状态，仅用于回退验证。

-- destructive-gate: allow
-- ticket: PLATFORM-CORPUS-20261117

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN ('core_operation_logs', 'subscriptions',
                             'navigation_menu', 'pinned_apps', 'todos')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '回滚：已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

CREATE POLICY public_allow_all_core_operation_logs ON public.core_operation_logs
    FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY public_allow_all_subscriptions ON public.subscriptions
    FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY public_allow_all_navigation_menu ON public.navigation_menu
    FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY public_allow_all_pinned_apps ON public.pinned_apps
    FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY public_allow_all_todos ON public.todos
    FOR ALL TO public USING (true) WITH CHECK (true);

DO $$
DECLARE
    t text;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_operation_logs', 'public.subscriptions',
                             'public.navigation_menu', 'public.pinned_apps', 'public.todos'] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls THEN
            RAISE EXCEPTION '回滚后置断言失败：% 的 RLS 未保持开启', t;
        END IF;
        RAISE NOTICE '回滚完成：% 已恢复 allow_all（rls=% force=%）', t, rls, frls;
    END LOOP;
END $$;
