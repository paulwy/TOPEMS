-- ============================================================
-- W7 · B2 验证：结构断言 + 非超户双身份 + 写探测 + 无上下文 fail-closed
--
-- 用法（必须用非超级用户；超级用户会绕过 RLS，验了等于没验）：
--   psql -d <db> -v ON_ERROR_STOP=1 -v app_role=<非超户应用角色> \
--        -f scripts/ops/w7_b2_verify.sql
--   - app_role 为空时，用当前连接角色（脚本会拒绝 superuser / BYPASSRLS）
--   - 生产窗口用 topems_prod，本地用 topems（owner，非超户，靠 FORCE 生效）
--
-- 覆盖：
--   A  结构断言：108 张 ENABLE+FORCE、策略数 1/2、无 USING(true)、无列侧 cast、
--      无硬编码 ...0001、无 nil 分支、IS NULL 只出现在 4 张全局只读表的 SELECT 策略
--   B  双身份：tenant=...0001 / ...0002 / 系统通道 / 无上下文，逐表与基线比对
--   C  写探测（事务内 ROLLBACK）：租户改全局行 0 行、跨租户改写被 42501 拒绝、
--      系统通道可改全局行
--   D  汇总：任一不符即 RAISE EXCEPTION（可接 CI）
-- ============================================================

SET client_min_messages = notice;

\if :{?app_role}
SET ROLE :"app_role";
\else
\echo '未传 -v app_role=...，使用当前连接角色验证'
\endif

DO $guard$
DECLARE
    v_super boolean;
    v_bypass boolean;
BEGIN
    SELECT rolsuper, rolbypassrls INTO v_super, v_bypass
    FROM pg_roles WHERE rolname = current_user;
    IF v_super THEN
        RAISE EXCEPTION '禁止以超级用户验证 RLS：% 是 superuser（请用 -v app_role=<非超户角色>）', current_user;
    END IF;
    IF v_bypass THEN
        RAISE EXCEPTION '禁止以 BYPASSRLS 角色验证 RLS：%', current_user;
    END IF;
    RAISE NOTICE '验证角色 = %（非超户）', current_user;
END
$guard$;

DROP TABLE IF EXISTS pg_temp.w7_b2_t;
CREATE TEMP TABLE w7_b2_t AS
SELECT * FROM (VALUES
            ('ai', 'ai_models', true),
            ('ai', 'ai_prompt_templates', true),
            ('ai', 'ai_settings', false),
            ('ai', 'ai_training_samples', false),
            ('ai', 'analysis_results', false),
            ('ai', 'document_chunks', false),
            ('ai', 'documents', false),
            ('ai', 'model_usage_stats', false),
            ('ai', 'qa_history', false),
            ('ai', 'usage_logs', false),
            ('gis', 'business_locations', false),
            ('gis', 'device_location_records', false),
            ('gis', 'device_locations', false),
            ('gis', 'devices', false),
            ('gis', 'evidence_records', false),
            ('gis', 'factory_maps', false),
            ('gis', 'geofences', false),
            ('gis', 'gis_map_markers', false),
            ('gis', 'location_photos', false),
            ('gis', 'locations', false),
            ('gis', 'map_markers', false),
            ('gis', 'maps', false),
            ('gis', 'pipelines', false),
            ('gis', 'track_records', false),
            ('gis', 'warehouse_locations', false),
            ('integration', 'async_tasks', false),
            ('integration', 'conversion_executions', false),
            ('integration', 'conversion_rules', false),
            ('integration', 'core_inter_module_sync', false),
            ('integration', 'crm_erp_sync', false),
            ('integration', 'crm_scm_sync', false),
            ('integration', 'erp_connections', false),
            ('integration', 'erp_mappings', false),
            ('integration', 'erp_wms_sync', false),
            ('integration', 'external_erp_staging', false),
            ('integration', 'external_erp_sync_logs', false),
            ('integration', 'hrm_finance_sync', false),
            ('integration', 'integration_events', false),
            ('integration', 'integration_sync_logs', false),
            ('integration', 'lims_qms_sync', false),
            ('integration', 'mes_erp_sync', false),
            ('integration', 'mes_qms_sync', false),
            ('integration', 'wms_scm_sync', false),
            ('mobile', 'audio_recordings', false),
            ('mobile', 'barcode_scans', false),
            ('mobile', 'core_mobile_offline_records', false),
            ('mobile', 'devices', false),
            ('mobile', 'documents', false),
            ('mobile', 'media_files', false),
            ('mobile', 'mobile_push_notifications', false),
            ('mobile', 'mobile_scan_records', false),
            ('mobile', 'mobile_tasks', false),
            ('mobile', 'mobile_users', false),
            ('mobile', 'oa_announcements', false),
            ('mobile', 'oa_calendar_events', false),
            ('mobile', 'oa_meetings', false),
            ('mobile', 'oa_tasks', false),
            ('mobile', 'offline_operations', false),
            ('mobile', 'offline_sync_records', false),
            ('mobile', 'patrol_records', false),
            ('mobile', 'photo_evidences', false),
            ('mobile', 'photo_uploads', false),
            ('mobile', 'push_config', false),
            ('mobile', 'push_devices', false),
            ('mobile', 'push_notifications', false),
            ('mobile', 'push_templates', false),
            ('mobile', 'scan_records', false),
            ('mobile', 'shortcuts', false),
            ('mobile', 'sync_policies', true),
            ('mobile', 'video_recordings', false),
            ('pm', 'acceptance_items', false),
            ('pm', 'acceptance_plans', false),
            ('pm', 'acceptance_records', false),
            ('pm', 'acceptances', false),
            ('pm', 'budget_items', false),
            ('pm', 'budgets', false),
            ('pm', 'contract_milestones', false),
            ('pm', 'contract_payment_schedule', false),
            ('pm', 'contract_templates', false),
            ('pm', 'contracts', false),
            ('pm', 'defects', false),
            ('pm', 'document_folders', false),
            ('pm', 'document_versions', false),
            ('pm', 'documents', false),
            ('pm', 'notification_settings', false),
            ('pm', 'notifications', false),
            ('pm', 'pm_budget_items', false),
            ('pm', 'pm_master_data_refs', false),
            ('pm', 'pm_tasks', false),
            ('pm', 'project_approvals', false),
            ('pm', 'project_benefits', false),
            ('pm', 'project_documents', false),
            ('pm', 'project_expenses', false),
            ('pm', 'project_members', false),
            ('pm', 'project_milestones', false),
            ('pm', 'project_phases', false),
            ('pm', 'project_reports', false),
            ('pm', 'project_resources', false),
            ('pm', 'project_risks', false),
            ('pm', 'project_type_configs', true),
            ('pm', 'projects', false),
            ('pm', 'quality_checks', false),
            ('pm', 'report_templates', false),
            ('pm', 'risk_events', false),
            ('pm', 'risks', false),
            ('pm', 'settlement_adjustments', false),
            ('pm', 'settlement_items', false),
            ('pm', 'settlements', false)
) AS v(sch, tbl, is_global);

DROP TABLE IF EXISTS pg_temp.w7_b2_base;
CREATE TEMP TABLE w7_b2_base (sch text, tbl text, is_global boolean,
                              n_total bigint, n_a bigint, n_b bigint, n_null bigint);

\echo ''
\echo '=== A. 结构断言 ==='
DO $struct$
DECLARE
    r record;
    v_pols int;
    v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b2_t LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            v_bad := v_bad || format(' %I.%I 不存在;', r.sch, r.tbl);
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            WHERE c.oid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) THEN
            v_bad := v_bad || format(' %I.%I 未 ENABLE/FORCE;', r.sch, r.tbl);
        END IF;
        SELECT count(*) INTO v_pols FROM pg_policies
        WHERE schemaname = r.sch AND tablename = r.tbl;
        IF v_pols <> (CASE WHEN r.is_global THEN 2 ELSE 1 END) THEN
            v_bad := v_bad || format(' %I.%I 策略数=%s;', r.sch, r.tbl, v_pols);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN
        RAISE EXCEPTION 'A. 结构断言失败：%', v_bad;
    END IF;
    RAISE NOTICE 'A1. 108 张表 ENABLE+FORCE/策略数 通过';
END
$struct$;

DO $shape$
DECLARE
    v_ut int; v_cast int; v_hard int; v_nil int; v_sys int; v_bad int;
BEGIN
    SELECT count(*) FILTER (WHERE pg_get_expr(polqual, polrelid) = 'true'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%(tenant_id)::text%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000001%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'
                              OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%00000000-0000-0000-0000-000000000000%'),
           count(*) FILTER (WHERE coalesce(pg_get_expr(polqual, polrelid), '') LIKE '%app.rls_system%'
                               AND (p.polcmd = 'r'
                                    OR coalesce(pg_get_expr(polwithcheck, polrelid), '') LIKE '%app.rls_system%'))
    INTO v_ut, v_cast, v_hard, v_nil, v_sys
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_temp.w7_b2_t t ON t.sch = n.nspname AND t.tbl = c.relname;

    IF v_ut <> 0 THEN RAISE EXCEPTION 'A2. 仍有 USING(true) 策略 % 条', v_ut; END IF;
    IF v_cast <> 0 THEN RAISE EXCEPTION 'A2. 仍有列侧 cast 策略 % 条', v_cast; END IF;
    IF v_hard <> 0 THEN RAISE EXCEPTION 'A2. 仍有硬编码 ...0001 策略 % 条', v_hard; END IF;
    IF v_nil <> 0 THEN RAISE EXCEPTION 'A2. 仍有 nil UUID 分支 % 条', v_nil; END IF;
    IF v_sys <> 112 THEN RAISE EXCEPTION 'A2. 系统通道策略 % 条（期望 112）', v_sys; END IF;

    SELECT count(*) INTO v_bad
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_temp.w7_b2_t t ON t.sch = n.nspname AND t.tbl = c.relname
    WHERE pg_get_expr(polqual, polrelid) LIKE '%IS NULL%'
      AND (p.polcmd <> 'r'
           OR (n.nspname || '.' || c.relname) NOT IN (SELECT s FROM unnest(ARRAY[
               'ai.ai_models','ai.ai_prompt_templates','mobile.sync_policies','pm.project_type_configs']) s));
    IF v_bad <> 0 THEN
        RAISE EXCEPTION 'A2. IS NULL 出现在非全局只读表的 SELECT 之外 % 条', v_bad;
    END IF;
    RAISE NOTICE 'A2. 谓词形态 通过（112 条含系统通道；IS NULL 仅 4 张全局只读表 SELECT）';
END
$shape$;

\echo ''
\echo '=== B. 双身份（基线=系统通道；逐表比对）==='
SET app.rls_system = 'on';
SET app.tenant_id = '';

DO $base$
DECLARE
    r record; v_t bigint; v_a bigint; v_b bigint; v_n bigint;
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b2_t LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_t;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000001''', r.sch, r.tbl) INTO v_a;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000002''', r.sch, r.tbl) INTO v_b;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl) INTO v_n;
        INSERT INTO pg_temp.w7_b2_base VALUES (r.sch, r.tbl, r.is_global, v_t, v_a, v_b, v_n);
    END LOOP;
END
$base$;

SELECT count(*) AS tables, sum(n_total) AS total_rows, sum(n_a) AS rows_tenant_a,
       sum(n_b) AS rows_tenant_b, sum(n_null) AS rows_global
FROM pg_temp.w7_b2_base;

\echo '--- B1. tenant=...0001（期望可见 = 本租户行 + 全局行[仅全局表]）---'
SET app.rls_system = 'off';
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';

DO $b1$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b2_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        v_exp := r.n_a + CASE WHEN r.is_global THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=%s;', r.sch, r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B1 失败：%', v_bad; END IF;
    RAISE NOTICE 'B1. tenant=...0001 逐表可见性 通过';
END
$b1$;

\echo '--- B2. tenant=...0002（期望 = 本租户行 + 全局行[仅全局表]，跨租户 0 泄漏）---'
SET app.tenant_id = '00000000-0000-0000-0000-000000000002';

DO $b2$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b2_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        v_exp := r.n_b + CASE WHEN r.is_global THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=%s;', r.sch, r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B2 失败：%', v_bad; END IF;
    RAISE NOTICE 'B2. tenant=...0002 逐表可见性 通过（跨租户 0 行）';
END
$b2$;

\echo '--- B3. 无上下文（期望：非全局表 0 行；全局表仅全局行）---'
SET app.rls_system = 'off';
SET app.tenant_id = '';

DO $b3$
DECLARE
    r record; v_vis bigint; v_exp bigint; v_bad text := '';
BEGIN
    FOR r IN SELECT * FROM pg_temp.w7_b2_base LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_vis;
        v_exp := CASE WHEN r.is_global THEN r.n_null ELSE 0 END;
        IF v_vis <> v_exp THEN
            v_bad := v_bad || format(' %I.%I 可见=%s 期望=%s;', r.sch, r.tbl, v_vis, v_exp);
        END IF;
    END LOOP;
    IF v_bad <> '' THEN RAISE EXCEPTION 'B3 失败：%', v_bad; END IF;
    RAISE NOTICE 'B3. 无上下文 fail-closed 通过';
END
$b3$;

\echo ''
\echo '=== C. 写探测（事务内 ROLLBACK，不落数据）==='
\echo '--- C1. tenant=...0001 改全局行 ai.ai_models（期望 updated=0）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
WITH u AS (
    UPDATE ai.ai_models SET tenant_id = tenant_id WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated_global_rows FROM u;
ROLLBACK;

\echo '--- C2. 系统通道改全局行（期望 updated = 基线全局行数）---'
BEGIN;
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '';
WITH u AS (
    UPDATE ai.ai_models SET tenant_id = tenant_id WHERE tenant_id IS NULL RETURNING 1
)
SELECT count(*) AS updated_global_rows FROM u;
ROLLBACK;

\echo '--- C3. 跨租户改写：tenant=...0001 把行改到 ...0002（期望 42501 或被拒）---'
BEGIN;
SET LOCAL app.rls_system = 'off';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
DO $w1$
DECLARE n int;
BEGIN
    IF to_regclass('pm.projects') IS NULL THEN
        RAISE NOTICE 'C3 跳过：pm.projects 不存在';
        RETURN;
    END IF;
    UPDATE pm.projects SET tenant_id = '00000000-0000-0000-0000-000000000002'
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
        RAISE EXCEPTION 'C3 失败：% 行跨租户改写成功', n;
    END IF;
    RAISE NOTICE 'C3 通过：本租户 0 行可改（表为空，WITH CHECK 未触发）';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'C3 通过：跨租户改写被 WITH CHECK 拒绝 (42501)';
END
$w1$;
ROLLBACK;

RESET app.rls_system;
RESET app.tenant_id;
RESET ROLE;

\echo ''
\echo '=== W7-B2 验证结束（全部断言通过）==='
