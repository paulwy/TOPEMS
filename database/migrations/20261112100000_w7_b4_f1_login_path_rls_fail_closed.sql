-- F1：登录链路 tenant-scoped 表的 RLS 策略统一为 fail-closed 形状
--
-- 背景：public.core_tenant_users 的旧策略没有 app.rls_system 分支，
-- 系统通道（app.tenant_id=nil + app.rls_system='on'）读到 0 行，
-- 导致 resolve_membership_tenant 回落默认租户，非默认租户用户被签到默认租户。
--
-- 目标形状（fail-closed）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 依赖：应用侧已把 IAM 内 5 处裸池访问改为显式作用域（同批代码提交），
-- 否则 list_users / check_user_target / company_scope / create_user 会失效。
-- 回滚脚本：database/rollback/20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql

SET lock_timeout = '5s';

DO $w7b4_f1$
DECLARE
    pol record;
BEGIN
    IF to_regclass('public.core_tenant_users') IS NULL THEN
        RAISE EXCEPTION 'F1: public.core_tenant_users 不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'core_tenant_users'
          AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'F1: public.core_tenant_users 缺 tenant_id 列';
    END IF;

    -- 删除该表全部历史策略（生产 1 条 / 本地 2 条旧形状），统一为唯一 fail-closed 策略
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'core_tenant_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.core_tenant_users', pol.policyname);
    END LOOP;

    ALTER TABLE public.core_tenant_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.core_tenant_users FORCE ROW LEVEL SECURITY;

    CREATE POLICY rls_tenant_isolation ON public.core_tenant_users
        FOR ALL TO PUBLIC
        USING (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        )
        WITH CHECK (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        );

    RAISE NOTICE 'F1: core_tenant_users 策略已重建为 fail-closed（含 app.rls_system 分支）';
END
$w7b4_f1$;

-- 守卫：登录链路 5 张 tenant-scoped 表，每张必须至少有一条含 app.rls_system 的策略
DO $w7b4_f1_guard$
DECLARE
    t text;
    v_policies int;
    v_with_system int;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_tenant_users', 'core_roles', 'core_tenants', 'core_sessions', 'core_refresh_tokens'
    ] LOOP
        SELECT count(*) INTO v_policies
        FROM pg_policies WHERE schemaname = 'public' AND tablename = t;
        IF v_policies = 0 THEN
            RAISE EXCEPTION 'F1 守卫失败：public.% 无任何策略', t;
        END IF;

        SELECT count(*) INTO v_with_system
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
          AND (COALESCE(qual, '') LIKE '%app.rls_system%'
               OR COALESCE(with_check, '') LIKE '%app.rls_system%');
        IF v_with_system = 0 THEN
            RAISE EXCEPTION 'F1 守卫失败：public.% 无含 app.rls_system 的策略', t;
        END IF;
    END LOOP;

    RAISE NOTICE 'F1 守卫通过：5 张登录链路 tenant-scoped 表均含系统通道分支';
END
$w7b4_f1_guard$;

-- 断言：新策略不得保留任何 IS NULL 放行分支
DO $w7b4_f1_assert$
DECLARE
    v_qual text;
BEGIN
    SELECT COALESCE(qual, '') INTO v_qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'core_tenant_users'
      AND policyname = 'rls_tenant_isolation';

    IF v_qual IS NULL OR v_qual = '' THEN
        RAISE EXCEPTION 'F1 断言失败：rls_tenant_isolation 未创建';
    END IF;
    IF v_qual ILIKE '%IS NULL%' THEN
        RAISE EXCEPTION 'F1 断言失败：新策略仍含 IS NULL 放行分支: %', v_qual;
    END IF;

    RAISE NOTICE 'F1 断言通过：策略无 IS NULL 放行分支';
END
$w7b4_f1_assert$;
