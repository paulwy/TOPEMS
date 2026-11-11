-- ============================================================
-- W7 · B4-mes：19 张补列业务表 RLS 策略（逐表 fail-closed + FORCE）
-- 版本：20261112093000
--
-- 依赖：20261112091000（补列）、20261112092000（回填后 gaps=0）。
-- 目标形态（每表仅 1 条策略）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 约束：
--   * 无 nil UUID 分支 / tenant_id IS NULL 放行 / 列侧 cast；
--   * 未设上下文 = 0 行（fail-closed）；系统通道 = app.rls_system='on'；
--   * work_orders 不在此笔（已有 tenant_id，策略与 FORCE 由 20261112094000 处理）；
--   * 表缺失 / 缺 tenant_id 一律 RAISE EXCEPTION；
--   * 可重复执行：先 DROP 该表全部历史策略再建。
--
-- 回滚（急停）：DROP POLICY rls_tenant_isolation / NO FORCE / 按窗口前快照恢复。
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_mes_rls$
DECLARE
    t text;
    pol record;
    v_missing text := '';
    v_noid text := '';
    v_done int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_categories','material_issue_items','material_issues',
        'material_requirement_items','material_requirements','material_return_items',
        'material_returns','production_lines','quality_records','shifts',
        'team_members','wip_transfers','wips','work_calendars','workshops'
    ] LOOP
        IF to_regclass(format('mes.%I', t)) IS NULL THEN
            v_missing := v_missing || ' ' || t;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'mes' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            v_noid := v_noid || ' ' || t;
            CONTINUE;
        END IF;

        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'mes' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON mes.%I', pol.policyname, t);
        END LOOP;

        EXECUTE format('ALTER TABLE mes.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE mes.%I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format($p$
            CREATE POLICY rls_tenant_isolation ON mes.%I FOR ALL TO PUBLIC
            USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
            WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        $p$, t);
        v_done := v_done + 1;
    END LOOP;

    IF v_missing <> '' THEN
        RAISE EXCEPTION 'W7-B4-MES 策略失败：表不存在 —%', v_missing;
    END IF;
    IF v_noid <> '' THEN
        RAISE EXCEPTION 'W7-B4-MES 策略失败：缺 tenant_id 列 —%', v_noid;
    END IF;
    IF v_done <> 19 THEN
        RAISE EXCEPTION 'W7-B4-MES 策略失败：完成 % 张（期望 19）', v_done;
    END IF;
    RAISE NOTICE 'W7-B4-MES：19 张表策略已下发（fail-closed + FORCE）';
END
$w7b4_mes_rls$;

DO $w7b4_mes_rls_assert$
DECLARE
    t text;
    v_pols int;
    v_ok int;
    v_force boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_categories','material_issue_items','material_issues',
        'material_requirement_items','material_requirements','material_return_items',
        'material_returns','production_lines','quality_records','shifts',
        'team_members','wip_transfers','wips','work_calendars','workshops'
    ] LOOP
        SELECT count(*) INTO v_pols FROM pg_policies WHERE schemaname = 'mes' AND tablename = t;
        IF v_pols <> 1 THEN
            RAISE EXCEPTION 'W7-B4-MES 断言失败：mes.% 策略数=%（期望 1）', t, v_pols;
        END IF;

        SELECT count(*) INTO v_ok FROM pg_policies
        WHERE schemaname = 'mes' AND tablename = t
          AND policyname = 'rls_tenant_isolation' AND cmd = 'ALL' AND permissive = 'PERMISSIVE'
          AND qual LIKE '%app.rls_system%' AND qual LIKE '%tenant_id%'
          AND with_check LIKE '%app.rls_system%' AND with_check LIKE '%tenant_id%'
          AND qual NOT LIKE '%tenant_id IS NULL%'
          AND qual NOT LIKE '%tenant_id)::text%';
        IF v_ok <> 1 THEN
            RAISE EXCEPTION 'W7-B4-MES 断言失败：mes.% 策略表达式不符合 fail-closed 模板', t;
        END IF;

        SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'mes' AND c.relname = t;
        IF NOT coalesce(v_force, false) THEN
            RAISE EXCEPTION 'W7-B4-MES 断言失败：mes.% 未 ENABLE/FORCE', t;
        END IF;
    END LOOP;
    RAISE NOTICE 'W7-B4-MES 断言通过：19 张表策略形状一致';
END
$w7b4_mes_rls_assert$;
