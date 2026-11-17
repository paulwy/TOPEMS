-- 回滚 20261118113000_portal_quick_actions_platform_read_strict
-- 恢复生产迁移前原状：删除严格策略/平台读策略，重建 portal_allow_all_portal_quick_actions
-- （ALL，USING true / WITH CHECK true）；RLS / FORCE 保持开启，索引与列不动。
-- 说明：dev 环境迁移前的 fail-open 旧策略 tenant_isolation_portal_quick_actions 不回灌，
--       那是本批要收的口子；回滚只还原生产基线。

BEGIN;

DO $$
DECLARE
    r record;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
BEGIN
    -- 1. 清空目标表全部策略
    FOR r IN
        SELECT p.policyname FROM pg_policies p
         WHERE p.schemaname = 'portal' AND p.tablename = 'portal_quick_actions'
    LOOP
        EXECUTE format('DROP POLICY %I ON portal.portal_quick_actions', r.policyname);
        RAISE NOTICE '已删除策略 portal.portal_quick_actions.%', r.policyname;
    END LOOP;

    -- 2. 重建生产原 allow_all 策略
    CREATE POLICY portal_allow_all_portal_quick_actions ON portal.portal_quick_actions
        FOR ALL TO public
        USING (true)
        WITH CHECK (true);

    -- 3. 恢复后断言
    SELECT count(*), max(p.qual::text), max(p.with_check::text)
      INTO n_pol, v_qual, v_wcheck
      FROM pg_policies p
     WHERE p.schemaname = 'portal' AND p.tablename = 'portal_quick_actions';
    IF n_pol <> 1 OR v_qual <> 'true' OR v_wcheck <> 'true' THEN
        RAISE EXCEPTION '回滚断言失败：策略数 = %、USING = %、WITH CHECK = %（期望 1/true/true）',
            n_pol, v_qual, v_wcheck;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'portal' AND c.relname = 'portal_quick_actions';
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '回滚断言失败：rls/force = %/%（期望 true/true）', rls, frls;
    END IF;

    RAISE NOTICE '回滚完成：portal_quick_actions 已恢复 allow_all，RLS/FORCE 保持开启';
END $$;

COMMIT;
