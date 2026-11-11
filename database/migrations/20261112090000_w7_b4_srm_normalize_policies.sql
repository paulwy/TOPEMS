-- ============================================================
-- W7 · B4 SRM：20 张表策略归一（逐表 fail-closed + FORCE）
-- 版本：20261112090000
--
-- 现状：20 张表策略全部 fail-open（nil 分支 / 列侧 cast / USING(true) / 重复 permissive），
--       其中 srm.inquiries 有 2 条同名语义重复策略，supplier_products 等为 USING(true)。
-- 目标形态（与 PDM/LIMS 完全一致，每表仅 1 条策略）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 约束：
--   * 无 tenant_id IS NULL 分支、无 nil UUID 分支、无空串放行、无列侧 cast；
--   * 未设上下文 = 0 行（fail-closed）；
--   * 系统通道 = app.rls_system='on' + app.tenant_id='000…000'；
--   * 表缺失 / 缺 tenant_id 一律 RAISE EXCEPTION，不静默跳过；
--   * 可重复执行：先 DROP 该表全部历史策略再建；
--   * 不写 BEGIN/COMMIT：由执行器包在单事务内。
--
-- 回滚（急停）：见文件末尾注释。
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_srm_normalize$
DECLARE
    t text;
    pol record;
    v_missing text := '';
    v_noid text := '';
    v_done int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'audit_logs','bid_requests','bidding_suppliers','biddings','bids','contract_terms',
        'inquiries','purchase_orders','quotations','scm_supplier_snapshots','scoring_dimensions',
        'supplier_categories','supplier_contracts','supplier_evaluations','supplier_performance',
        'supplier_products','suppliers','tender_awards','tender_bids','tenders'
    ] LOOP
        IF to_regclass(format('srm.%I', t)) IS NULL THEN
            v_missing := v_missing || ' ' || t;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'srm' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            v_noid := v_noid || ' ' || t;
            CONTINUE;
        END IF;

        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'srm' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON srm.%I', pol.policyname, t);
        END LOOP;

        EXECUTE format('ALTER TABLE srm.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE srm.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format($p$
            CREATE POLICY rls_tenant_isolation ON srm.%I FOR ALL TO PUBLIC
            USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
            WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        $p$, t);
        v_done := v_done + 1;
    END LOOP;

    IF v_missing <> '' THEN
        RAISE EXCEPTION 'W7-B4-SRM 归一失败：表不存在 —%', v_missing;
    END IF;
    IF v_noid <> '' THEN
        RAISE EXCEPTION 'W7-B4-SRM 归一失败：缺 tenant_id 列 —%', v_noid;
    END IF;
    IF v_done <> 20 THEN
        RAISE EXCEPTION 'W7-B4-SRM 归一失败：完成 % 张（期望 20）', v_done;
    END IF;
    RAISE NOTICE 'W7-B4-SRM：20 张表策略已归一（fail-closed + FORCE）';
END
$w7b4_srm_normalize$;

-- 结构断言：每表 1 条策略、表达式正确、ENABLE+FORCE
DO $w7b4_srm_assert$
DECLARE
    t text;
    v_pols int;
    v_ok int;
    v_force boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'audit_logs','bid_requests','bidding_suppliers','biddings','bids','contract_terms',
        'inquiries','purchase_orders','quotations','scm_supplier_snapshots','scoring_dimensions',
        'supplier_categories','supplier_contracts','supplier_evaluations','supplier_performance',
        'supplier_products','suppliers','tender_awards','tender_bids','tenders'
    ] LOOP
        SELECT count(*) INTO v_pols FROM pg_policies WHERE schemaname = 'srm' AND tablename = t;
        IF v_pols <> 1 THEN
            RAISE EXCEPTION 'W7-B4-SRM 断言失败：srm.% 策略数=%（期望 1）', t, v_pols;
        END IF;

        SELECT count(*) INTO v_ok FROM pg_policies
        WHERE schemaname = 'srm' AND tablename = t
          AND policyname = 'rls_tenant_isolation' AND cmd = 'ALL' AND permissive = 'PERMISSIVE'
          AND qual LIKE '%app.rls_system%' AND qual LIKE '%tenant_id%'
          AND with_check LIKE '%app.rls_system%' AND with_check LIKE '%tenant_id%'
          AND qual NOT LIKE '%tenant_id IS NULL%'
          AND qual NOT LIKE '%tenant_id)::text%';
        IF v_ok <> 1 THEN
            RAISE EXCEPTION 'W7-B4-SRM 断言失败：srm.% 策略表达式不符合 fail-closed 模板', t;
        END IF;

        SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'srm' AND c.relname = t;
        IF NOT coalesce(v_force, false) THEN
            RAISE EXCEPTION 'W7-B4-SRM 断言失败：srm.% 未 ENABLE/FORCE', t;
        END IF;
    END LOOP;
    RAISE NOTICE 'W7-B4-SRM 断言通过：20 张表策略形状一致';
END
$w7b4_srm_assert$;

-- srm.supplier_users 不在本笔范围（其 PERMISSIVE SELECT 放行由 20261112095000 收敛）。
--
-- 回滚（急停，恢复旧策略需按 pg_policies 快照逐表重建；本笔只做收紧，不删数据）：
--   DO $$ ... 对 20 张表 DROP POLICY rls_tenant_isolation;
--   ALTER TABLE srm.<t> NO FORCE ROW LEVEL SECURITY;   -- 可选
--   按窗口前 srm_policy_snapshot 恢复原策略。
