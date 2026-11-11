-- 回滚：20261112100000_w7_b4_f1_login_path_rls_fail_closed.sql
--
-- 默认执行「兼容回滚（R2）」：恢复变更前的可见性，同时保留系统通道分支，
-- 保证回滚后登录不退化（系统通道仍可读），租户隔离不弱于变更前。
--
-- 精确回滚（R1，审计口径）：仅用于逐字恢复变更前策略（会重新引入
-- 系统通道 0 行的缺陷），把下方 USING 中的第一行
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on' OR
-- 删除即可。
--
-- 使用方式（生产急停）：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/rollback/20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql

SET lock_timeout = '5s';

DO $w7b4_f1_rollback$
DECLARE
    pol record;
BEGIN
    IF to_regclass('public.core_tenant_users') IS NULL THEN
        RAISE EXCEPTION 'F1 回滚失败：public.core_tenant_users 不存在';
    END IF;

    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'core_tenant_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.core_tenant_users', pol.policyname);
    END LOOP;

    -- R2：兼容回滚（旧 fail-open 可见性 ∪ 系统通道）
    CREATE POLICY tenant_isolation_core_tenant_users ON public.core_tenant_users
        FOR ALL TO PUBLIC
        USING (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
            OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
            OR tenant_id IS NULL
        );

    RAISE NOTICE 'F1 回滚完成：core_tenant_users 已恢复为兼容策略（R2）';
END
$w7b4_f1_rollback$;
