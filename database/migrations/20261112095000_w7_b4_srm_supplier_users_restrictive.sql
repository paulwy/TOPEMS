-- ============================================================
-- W7 · B4 SRM：srm.supplier_users 收敛（去 PERMISSIVE SELECT 放行 + 加 RESTRICTIVE）
-- 版本：20261112095000
--
-- 现状：旧策略族里 SELECT 走 PERMISSIVE，且 `app.supplier_id IS NULL` 时放行，
--       等于「未带供应商上下文的会话可读全表」；同时 tenant 判定是 fail-open。
--
-- 目标形态（1 条 PERMISSIVE 租户策略 + 1 条 RESTRICTIVE 供应商域策略）：
--   1) rls_tenant_isolation（ALL / PERMISSIVE）
--        rls_system='on' OR tenant_id = app.tenant_id
--   2) supplier_scope_supplier_users（SELECT / RESTRICTIVE）
--        rls_system='on' OR supplier_id = app.supplier_id
--      —— RESTRICTIVE 与 PERMISSIVE 取交集：租户内还必须落在当前供应商域；
--      —— 删除 `app.supplier_id IS NULL` 放行，未设供应商上下文 = 0 行（fail-closed）。
--
-- 注意：tenant 侧管理端如需读取 supplier_users，必须显式设置 app.supplier_id；
--       平台/系统通道用 app.rls_system='on'。
--
-- 回滚（急停）：DROP 两条策略，恢复窗口前 pg_policies 快照中的旧策略。
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_supplier_users$
DECLARE
    pol record;
BEGIN
    IF to_regclass('srm.supplier_users') IS NULL THEN
        RAISE EXCEPTION 'W7-B4-SRM 失败：srm.supplier_users 不存在';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'srm' AND table_name = 'supplier_users' AND column_name = 'tenant_id'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'srm' AND table_name = 'supplier_users' AND column_name = 'supplier_id'
    ) THEN
        RAISE EXCEPTION 'W7-B4-SRM 失败：srm.supplier_users 缺 tenant_id / supplier_id 列';
    END IF;

    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'srm' AND tablename = 'supplier_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON srm.supplier_users', pol.policyname);
    END LOOP;

    ALTER TABLE srm.supplier_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE srm.supplier_users FORCE ROW LEVEL SECURITY;

    CREATE POLICY rls_tenant_isolation ON srm.supplier_users FOR ALL TO PUBLIC
        USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);

    CREATE POLICY supplier_scope_supplier_users ON srm.supplier_users
        AS RESTRICTIVE FOR SELECT TO PUBLIC
        USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR supplier_id = (NULLIF(current_setting('app.supplier_id', true), ''))::uuid);

    RAISE NOTICE 'W7-B4-SRM：supplier_users 已收敛（租户 PERMISSIVE + 供应商 RESTRICTIVE）';
END
$w7b4_supplier_users$;

DO $w7b4_supplier_users_assert$
DECLARE
    v_pols int;
    v_restrict int;
    v_force boolean;
BEGIN
    SELECT count(*) INTO v_pols FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_users';
    IF v_pols <> 2 THEN
        RAISE EXCEPTION 'W7-B4-SRM 断言失败：supplier_users 策略数=%（期望 2）', v_pols;
    END IF;

    SELECT count(*) INTO v_restrict FROM pg_policies
    WHERE schemaname = 'srm' AND tablename = 'supplier_users'
      AND policyname = 'supplier_scope_supplier_users'
      AND permissive = 'RESTRICTIVE' AND cmd = 'SELECT'
      AND qual LIKE '%app.supplier_id%'
      AND qual NOT LIKE '%supplier_id IS NULL%';
    IF v_restrict <> 1 THEN
        RAISE EXCEPTION 'W7-B4-SRM 断言失败：supplier_users 缺 RESTRICTIVE 供应商域策略';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'srm' AND tablename = 'supplier_users'
          AND policyname = 'rls_tenant_isolation' AND permissive = 'PERMISSIVE'
          AND qual LIKE '%app.rls_system%' AND qual NOT LIKE '%tenant_id IS NULL%'
    ) THEN
        RAISE EXCEPTION 'W7-B4-SRM 断言失败：supplier_users 租户策略不符合 fail-closed 模板';
    END IF;

    SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'srm' AND c.relname = 'supplier_users';
    IF NOT coalesce(v_force, false) THEN
        RAISE EXCEPTION 'W7-B4-SRM 断言失败：supplier_users 未 ENABLE/FORCE';
    END IF;

    RAISE NOTICE 'W7-B4-SRM 断言通过：supplier_users（2 条策略，含 RESTRICTIVE）';
END
$w7b4_supplier_users_assert$;
