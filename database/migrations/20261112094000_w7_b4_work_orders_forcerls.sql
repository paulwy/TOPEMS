-- ============================================================
-- W7 · B4-mes：work_orders 策略收紧 + FORCE
-- 版本：20261112094000
--
-- 现状（本机/现网一致）：
--   * tenant_id 列已存在；
--   * RLS ENABLE 但未 FORCE（owner 可绕过）；
--   * 唯一策略 rls_tenant_isolation，fail-open 形态：
--       current_setting('app.tenant_id') IS NULL OR = '' OR = '000…000'
--       OR tenant_id IS NULL OR tenant_id = ...
--     → nil 会话可见 54/54，等于全表放行。
--
-- 目标形态：
--   DROP 旧 rls_tenant_isolation → ENABLE + FORCE →
--   CREATE POLICY rls_tenant_isolation FOR ALL TO PUBLIC
--   USING/WITH CHECK (
--       COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--       OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
--
-- 数据口径（保持现状，不清理、不回填、不删除）：
--   * 47 行 tenant_id = '000…000'（nil UUID，非 SQL NULL）→ 新策略下属不可见历史行；
--   * 7 行 tenant_id IS NULL 且 order_id IS NULL → 已在 quarantine 登记。
--   本笔不触碰任何行，只改策略与 FORCE。
--
-- 回滚（急停）：
--   ALTER TABLE mes.work_orders NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY rls_tenant_isolation ON mes.work_orders;
--   CREATE POLICY rls_tenant_isolation ON mes.work_orders FOR ALL TO PUBLIC
--     USING (current_setting('app.tenant_id', true) IS NULL
--            OR current_setting('app.tenant_id', true) = ''
--            OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
--            OR tenant_id IS NULL
--            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_work_orders$
DECLARE
    pol record;
BEGIN
    IF to_regclass('mes.work_orders') IS NULL THEN
        RAISE EXCEPTION 'W7-B4-MES 失败：mes.work_orders 不存在';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mes' AND table_name = 'work_orders' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'W7-B4-MES 失败：mes.work_orders 缺 tenant_id 列';
    END IF;

    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'mes' AND tablename = 'work_orders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON mes.work_orders', pol.policyname);
    END LOOP;

    ALTER TABLE mes.work_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE mes.work_orders FORCE ROW LEVEL SECURITY;

    CREATE POLICY rls_tenant_isolation ON mes.work_orders FOR ALL TO PUBLIC
        USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);

    RAISE NOTICE 'W7-B4-MES：work_orders 策略已收紧并 FORCE';
END
$w7b4_work_orders$;

DO $w7b4_work_orders_assert$
DECLARE
    v_pols int;
    v_ok int;
    v_force boolean;
BEGIN
    SELECT count(*) INTO v_pols FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'work_orders';
    IF v_pols <> 1 THEN
        RAISE EXCEPTION 'W7-B4-MES 断言失败：work_orders 策略数=%（期望 1）', v_pols;
    END IF;

    SELECT count(*) INTO v_ok FROM pg_policies
    WHERE schemaname = 'mes' AND tablename = 'work_orders'
      AND policyname = 'rls_tenant_isolation' AND cmd = 'ALL'
      AND qual LIKE '%app.rls_system%' AND qual LIKE '%tenant_id%'
      AND with_check LIKE '%app.rls_system%' AND with_check LIKE '%tenant_id%'
      AND qual NOT LIKE '%tenant_id IS NULL%'
      AND qual NOT LIKE '%tenant_id)::text%';
    IF v_ok <> 1 THEN
        RAISE EXCEPTION 'W7-B4-MES 断言失败：work_orders 策略表达式不符合 fail-closed 模板';
    END IF;

    SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'mes' AND c.relname = 'work_orders';
    IF NOT coalesce(v_force, false) THEN
        RAISE EXCEPTION 'W7-B4-MES 断言失败：work_orders 未 ENABLE/FORCE';
    END IF;

    RAISE NOTICE 'W7-B4-MES 断言通过：work_orders（1 条策略，ENABLE+FORCE）';
END
$w7b4_work_orders_assert$;
