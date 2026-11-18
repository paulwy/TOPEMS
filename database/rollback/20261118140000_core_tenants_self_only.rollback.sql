-- 回滚 20261118140000_core_tenants_self_only.sql
-- 恢复：rls_global_read(SELECT: system OR tenant_id IS NULL) + rls_system_only(ALL: system)；
-- tenant_id 自指行回退为 NULL（仅在 tenant_id = id 时回退，不覆盖外部写入的其他值）。

-- 1. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 2. 清空策略
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'core_tenants'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.core_tenants', r.policyname);
        RAISE NOTICE '已删除策略 core_tenants.%', r.policyname;
    END LOOP;
END $$;

-- 3. 恢复旧策略
CREATE POLICY rls_global_read ON public.core_tenants
    FOR SELECT TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id IS NULL
    );

CREATE POLICY rls_system_only ON public.core_tenants
    FOR ALL TO public
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

-- 4. 回退回填
UPDATE public.core_tenants
   SET tenant_id = NULL
 WHERE tenant_id = id;

-- 5. 后置断言
DO $$
DECLARE
    n_null bigint;
    n_total bigint;
    n_pol int;
    has_global boolean;
    has_system boolean;
    rls boolean;
    frls boolean;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL)
      INTO n_total, n_null
      FROM public.core_tenants;
    IF n_null <> n_total THEN
        RAISE EXCEPTION '回滚断言失败：仍有 % 行 tenant_id 非空（期望全部 NULL）', n_total - n_null;
    END IF;

    SELECT count(*),
           bool_or(p.policyname = 'rls_global_read'),
           bool_or(p.policyname = 'rls_system_only')
      INTO n_pol, has_global, has_system
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'core_tenants';
    IF n_pol <> 2 OR NOT coalesce(has_global, false) OR NOT coalesce(has_system, false) THEN
        RAISE EXCEPTION '回滚断言失败：core_tenants 策略数 = %（期望 rls_global_read + rls_system_only）', n_pol;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = 'public.core_tenants'::regclass;
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '回滚断言失败：core_tenants 的 rls/force_rls = %/%', rls, frls;
    END IF;

    RAISE NOTICE '回滚完成：core_tenants 恢复 rls_global_read + rls_system_only，tenant_id 全部 NULL';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118140000;
