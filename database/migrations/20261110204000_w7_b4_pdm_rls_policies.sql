-- ============================================================
-- W7 · B4-PDM 租户表 RLS 收敛（20 张）
-- 版本：20261110204000
--
-- 依据：docs/quality/w7-b4-module-comparison-2026-11-10.md §3.2（逐表策略方案）
--       docs/quality/w7-b4-module-comparison-2026-11-10.md §2.5（系统通道例外清单）
--
-- 收敛前状态（实测 pg_policies，2026-11-10）：
--   20 张表均已 ENABLE + FORCE，但每张有 1~2 条历史 permissive 策略，
--   谓词全部含 fail-open 分支：
--     current_setting('app.tenant_id', true) IS NULL
--     OR current_setting('app.tenant_id', true) = ''
--     OR tenant_id IS NULL
--     OR current_setting('app.tenant_id', true) = '0000…0000'
--   即：未设上下文 = 全量可见，且存在列侧 ::text cast。
--
-- 每张表最终只保留（permissive 是 OR 关系，历史条目一律先清空）：
--   1) rls_tenant_isolation  FOR ALL
--      USING/WITH CHECK:
--        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--      - 无 nil UUID 全量分支；未设上下文 = 0 行（fail-closed）
--      - 不做列侧 cast
--
-- 全部 ENABLE + FORCE。守卫式：表不存在/无 tenant_id → WARNING 跳过；幂等。
-- 不含 pdm_master_data_refs（无 tenant_id，见 20261110204100）
-- 不含 schema_defense_ledger（启动指纹，已决策排除出 RLS，见 §2.5）
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_pdm_policy$
DECLARE
    v_pred CONSTANT text :=
        'COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'''
        ' OR tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid';
    r record;
    p record;
    v_target int := 0;
    v_skipped int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('pdm', 'module_settings'),
            ('pdm', 'pdm_bom_items'),
            ('pdm', 'pdm_boms'),
            ('pdm', 'pdm_change_notices'),
            ('pdm', 'pdm_configurations'),
            ('pdm', 'pdm_document_versions'),
            ('pdm', 'pdm_documents'),
            ('pdm', 'pdm_drawings'),
            ('pdm', 'pdm_materials'),
            ('pdm', 'pdm_production_batches'),
            ('pdm', 'pdm_production_formulas'),
            ('pdm', 'pdm_production_processes'),
            ('pdm', 'pdm_production_steps'),
            ('pdm', 'pdm_products'),
            ('pdm', 'pdm_project_members'),
            ('pdm', 'pdm_project_phases'),
            ('pdm', 'pdm_projects'),
            ('pdm', 'pdm_versions'),
            ('pdm', 'pdm_workflow_instances'),
            ('pdm', 'pdm_workflows')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE WARNING 'W7-B4-PDM 跳过 %.%：表不存在', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND attname = 'tenant_id' AND attnum > 0 AND NOT attisdropped
        ) THEN
            RAISE WARNING 'W7-B4-PDM 跳过 %.%：无 tenant_id 列', r.sch, r.tbl;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.sch AND tablename = r.tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, r.sch, r.tbl);
        END LOOP;

        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
            r.sch, r.tbl, v_pred, v_pred);

        v_target := v_target + 1;
    END LOOP;

    RAISE NOTICE 'W7-B4-PDM：收敛 % 张，跳过 % 张', v_target, v_skipped;
END
$w7b4_pdm_policy$;

-- 结构断言：20 张必须 ENABLE + FORCE，策略数 = 1，且谓词含系统通道、不含 fail-open 分支
DO $w7b4_pdm_assert$
DECLARE
    r record;
    v_pols int;
    v_qual text;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('pdm', 'module_settings'),
            ('pdm', 'pdm_bom_items'),
            ('pdm', 'pdm_boms'),
            ('pdm', 'pdm_change_notices'),
            ('pdm', 'pdm_configurations'),
            ('pdm', 'pdm_document_versions'),
            ('pdm', 'pdm_documents'),
            ('pdm', 'pdm_drawings'),
            ('pdm', 'pdm_materials'),
            ('pdm', 'pdm_production_batches'),
            ('pdm', 'pdm_production_formulas'),
            ('pdm', 'pdm_production_processes'),
            ('pdm', 'pdm_production_steps'),
            ('pdm', 'pdm_products'),
            ('pdm', 'pdm_project_members'),
            ('pdm', 'pdm_project_phases'),
            ('pdm', 'pdm_projects'),
            ('pdm', 'pdm_versions'),
            ('pdm', 'pdm_workflow_instances'),
            ('pdm', 'pdm_workflows')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        SELECT count(*) INTO v_pols
        FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl;
        IF v_pols <> 1 THEN
            v_bad := v_bad || format(' %I.%I 策略数=%s(期望1);', r.sch, r.tbl, v_pols);
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' %I.%I 未 ENABLE/FORCE;', r.sch, r.tbl);
        END IF;
        SELECT coalesce(qual, '') INTO v_qual
        FROM pg_policies WHERE schemaname = r.sch AND tablename = r.tbl
        LIMIT 1;
        IF v_qual NOT LIKE '%app.rls_system%' THEN
            v_bad := v_bad || format(' %I.%I 谓词缺系统通道;', r.sch, r.tbl);
        END IF;
        IF v_qual LIKE '%IS NULL%' OR v_qual LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            v_bad := v_bad || format(' %I.%I 谓词仍含 fail-open 分支;', r.sch, r.tbl);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'W7-B4-PDM 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'W7-B4-PDM 结构断言通过（20 张）';
END
$w7b4_pdm_assert$;
