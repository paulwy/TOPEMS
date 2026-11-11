-- ============================================================
-- W7 · B4 LIMS RLS：逐表 fail-closed + FORCE
--
-- 范围（76 张，v2 口径 schema.relname）：
--   lims.*            45 张（qa_lab_* / qa_lims_* 历史副本）
--   public.qa_lab_*   11 张（代码主路径：qa_lab_samples / qa_lab_tasks 只存在于 public）
--   public.qa_lims_*  20 张
--
-- 目标形态（与 PDM 完全一致，每表仅 1 条策略）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 关键约束：
--   * 无 tenant_id IS NULL 分支、无 nil UUID 分支、无空串放行、无列侧 cast；
--   * 未设上下文 = 0 行（fail-closed）；
--   * 系统通道 = app.rls_system='on' + app.tenant_id='000…000'；
--   * 表缺失 / 无 tenant_id 一律 RAISE EXCEPTION（事务整体回滚），不静默跳过；
--   * 可重复执行：先 DROP 该表全部历史策略再建；
--   * 不写 BEGIN/COMMIT：由执行器包在单事务内
--     （prod 入口 scripts/migration/apply-forward.sh 用 psql --single-transaction，
--       SQL 与账本写入同事务；sqlx migrator 同样自带事务）。
--
-- 全局只读表：0 张（LIMS 无 pdm_master_data_refs 类表）。
-- ============================================================

SET LOCAL lock_timeout = '5s';

DO $lims_rls$
DECLARE
    r record;
    pol record;
    v_missing text := '';
    v_noid text := '';
    v_done int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('lims', 'ai_analyses'),
            ('lims', 'audit_logs'),
            ('lims', 'document_relations'),
            ('lims', 'inspection_processes'),
            ('lims', 'inspection_records'),
            ('lims', 'inspection_tasks'),
            ('lims', 'instrument_calibrations'),
            ('lims', 'instruments'),
            ('lims', 'lab_ledger'),
            ('lims', 'lims_inspection_records'),
            ('lims', 'lims_safety_tasks'),
            ('lims', 'maintenance_records'),
            ('lims', 'qa_lab_calibration_records'),
            ('lims', 'qa_lab_inspection_reports'),
            ('lims', 'qa_lab_instruments'),
            ('lims', 'qa_lab_processes'),
            ('lims', 'qa_lab_reagent_alerts'),
            ('lims', 'qa_lab_reagent_history'),
            ('lims', 'qa_lab_reagents'),
            ('lims', 'qa_lab_records'),
            ('lims', 'qa_lab_sample_lifecycle'),
            ('lims', 'qa_lims_analytes'),
            ('lims', 'qa_lims_audit_logs'),
            ('lims', 'qa_lims_barcode_scan_records'),
            ('lims', 'qa_lims_collection_tasks'),
            ('lims', 'qa_lims_instrument_data'),
            ('lims', 'qa_lims_method_categories'),
            ('lims', 'qa_lims_method_validations'),
            ('lims', 'qa_lims_method_versions'),
            ('lims', 'qa_lims_parse_rules'),
            ('lims', 'qa_lims_pt_corrective_actions'),
            ('lims', 'qa_lims_pt_evaluations'),
            ('lims', 'qa_lims_pt_plans'),
            ('lims', 'qa_lims_pt_results'),
            ('lims', 'qa_lims_pt_samples'),
            ('lims', 'qa_lims_rfid_tags'),
            ('lims', 'qa_lims_sample_barcodes'),
            ('lims', 'qa_lims_sync_records'),
            ('lims', 'qa_lims_test_methods'),
            ('lims', 'qa_lims_uncertainty_components'),
            ('lims', 'qa_lims_uncertainty_projects'),
            ('lims', 'qa_lims_uncertainty_sources'),
            ('lims', 'reagent_usages'),
            ('lims', 'reagents'),
            ('lims', 'samples'),
            ('public', 'qa_lab_calibration_records'),
            ('public', 'qa_lab_inspection_reports'),
            ('public', 'qa_lab_instruments'),
            ('public', 'qa_lab_processes'),
            ('public', 'qa_lab_reagent_alerts'),
            ('public', 'qa_lab_reagent_history'),
            ('public', 'qa_lab_reagents'),
            ('public', 'qa_lab_records'),
            ('public', 'qa_lab_sample_lifecycle'),
            ('public', 'qa_lab_samples'),
            ('public', 'qa_lab_tasks'),
            ('public', 'qa_lims_audit_logs'),
            ('public', 'qa_lims_barcode_scan_records'),
            ('public', 'qa_lims_collection_tasks'),
            ('public', 'qa_lims_instrument_data'),
            ('public', 'qa_lims_method_categories'),
            ('public', 'qa_lims_method_validations'),
            ('public', 'qa_lims_method_versions'),
            ('public', 'qa_lims_parse_rules'),
            ('public', 'qa_lims_pt_corrective_actions'),
            ('public', 'qa_lims_pt_evaluations'),
            ('public', 'qa_lims_pt_plans'),
            ('public', 'qa_lims_pt_results'),
            ('public', 'qa_lims_pt_samples'),
            ('public', 'qa_lims_rfid_tags'),
            ('public', 'qa_lims_sample_barcodes'),
            ('public', 'qa_lims_sync_records'),
            ('public', 'qa_lims_test_methods'),
            ('public', 'qa_lims_uncertainty_components'),
            ('public', 'qa_lims_uncertainty_projects'),
            ('public', 'qa_lims_uncertainty_sources')
        ) AS v(schema_name, table_name)
    LOOP
        IF to_regclass(format('%I.%I', r.schema_name, r.table_name)) IS NULL THEN
            v_missing := v_missing || format(' %I.%I;', r.schema_name, r.table_name);
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = r.schema_name
              AND table_name = r.table_name
              AND column_name = 'tenant_id'
        ) THEN
            v_noid := v_noid || format(' %I.%I;', r.schema_name, r.table_name);
            CONTINUE;
        END IF;

        -- 1) 删除该表全部历史策略（USING(true) / tenant_isolation / rls_tenant_isolation …）
        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.schema_name AND tablename = r.table_name
        LOOP
            EXECUTE format('DROP POLICY %I ON %I.%I',
                           pol.policyname, r.schema_name, r.table_name);
        END LOOP;

        -- 2) ENABLE + FORCE
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                       r.schema_name, r.table_name);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
                       r.schema_name, r.table_name);

        -- 3) 唯一 fail-closed 策略
        EXECUTE format($pol$
            CREATE POLICY rls_tenant_isolation ON %I.%I
            FOR ALL TO PUBLIC
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
        $pol$, r.schema_name, r.table_name);

        v_done := v_done + 1;
    END LOOP;

    IF v_missing <> '' THEN
        RAISE EXCEPTION 'LIMS RLS：以下表不存在，迁移中止：%', v_missing;
    END IF;
    IF v_noid <> '' THEN
        RAISE EXCEPTION 'LIMS RLS：以下表缺少 tenant_id，迁移中止：%', v_noid;
    END IF;
    IF v_done <> 76 THEN
        RAISE EXCEPTION 'LIMS RLS：只处理了 % 张表，期望 76', v_done;
    END IF;

    RAISE NOTICE 'LIMS RLS：76/76 张表已收敛为 fail-closed + FORCE';
END
$lims_rls$;

-- 事件幂等键纳入 tenant_id：
-- 现有唯一约束只有 (source_type, source_*)，跨租户同一业务 ID 会误判重复。
-- 两表当前均无数据，重建无去重风险。
-- 注：这两个唯一索引由 UNIQUE 约束背书，必须改约束而不是 DROP INDEX。
ALTER TABLE lims.lims_inspection_records
    DROP CONSTRAINT IF EXISTS lims_inspection_records_source_uniq;
ALTER TABLE lims.lims_inspection_records
    ADD CONSTRAINT lims_inspection_records_source_uniq
    UNIQUE (tenant_id, source_type, source_inspection_id);

ALTER TABLE lims.lims_safety_tasks
    DROP CONSTRAINT IF EXISTS lims_safety_tasks_source_uniq;
ALTER TABLE lims.lims_safety_tasks
    ADD CONSTRAINT lims_safety_tasks_source_uniq
    UNIQUE (tenant_id, source_type, source_hazard_id);

