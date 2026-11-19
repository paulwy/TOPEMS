-- 回滚 20261119140000_iam_core_tenant_plugins_rls_strict_forward
-- 恢复迁移前原状：删除 rls_tenant_isolation，关闭 RLS（DISABLE + NO FORCE），0 策略。
-- 说明：生产迁移前 RLS 关闭且无策略（fail-open），本回滚按该原状恢复；
--       database/init 里的宽松旧策略 tenant_isolation_core_tenant_plugins 不回灌。

DO $$
DECLARE r record;
BEGIN
    IF to_regclass('iam.core_tenant_plugins') IS NULL THEN
        RAISE NOTICE '回滚跳过：iam.core_tenant_plugins 不存在';
        RETURN;
    END IF;

    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins'
    LOOP
        EXECUTE format('DROP POLICY %I ON iam.core_tenant_plugins', r.policyname);
        RAISE NOTICE '已删除策略 iam.core_tenant_plugins.%', r.policyname;
    END LOOP;
END $$;

ALTER TABLE iam.core_tenant_plugins NO FORCE ROW LEVEL SECURITY;
ALTER TABLE iam.core_tenant_plugins DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    n_pol int;
    v_rls boolean;
BEGIN
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins';
    IF n_pol <> 0 THEN
        RAISE EXCEPTION '回滚断言失败：策略数应为 0，实际 %', n_pol;
    END IF;
    SELECT relrowsecurity INTO v_rls
    FROM pg_class WHERE oid = 'iam.core_tenant_plugins'::regclass;
    IF v_rls THEN
        RAISE EXCEPTION '回滚断言失败：RLS 仍处于开启状态';
    END IF;
    RAISE NOTICE '回滚完成：iam.core_tenant_plugins 已恢复 RLS 关闭、0 策略原状';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261119140000;
