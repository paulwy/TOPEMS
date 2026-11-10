-- ============================================================
-- W7 · B2 回滚（两段式，窗口急停用）
--
-- ⚠️ 必须在事务内执行（第一段用 SET LOCAL 进系统通道）：
--      psql -d <db> -v ON_ERROR_STOP=1 -1 -f scripts/ops/w7_b2_rollback.sql
--
-- 第一段：数据还原（只有 pm.project_type_configs 需要还原）
--   - 20261110110500 把该表的 ...0000 归一成了 NULL；还原 = NULL 改回 ...0000
--   - 守卫：仅当该表「所有行都是全局 NULL」时才允许回滚。生产复核 total=1、
--     NULL=1，逐行等价；一旦混入真实租户行就无法区分，脚本拒绝执行并提示用
--     窗口前的行快照恢复，避免把租户业务行误标成 nil。
--   - ai.ai_models / ai.ai_prompt_templates / mobile.sync_policies 迁移前就是
--     NULL，不做任何翻转。
--
-- 第二段：NO FORCE 急停（保留策略，不 DROP）
--   - 恢复 owner 旁路，等价回退到迁移前「RLS 开着但 owner 可绕过」的状态
--   - 这是急停，不是完整还原；完整还原需回放窗口前 pg_policies 快照
-- ============================================================

SET lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';

DO $restore$
DECLARE
    v_total bigint;
    v_null bigint;
    v_updated bigint;
BEGIN
    IF to_regclass('pm.project_type_configs') IS NULL THEN
        RAISE NOTICE '回滚段1 跳过：pm.project_type_configs 不存在';
        RETURN;
    END IF;
    SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL)
      INTO v_total, v_null
      FROM pm.project_type_configs;
    IF v_total = 0 THEN
        RAISE NOTICE '回滚段1 跳过：pm.project_type_configs 为 0 行';
        RETURN;
    END IF;
    IF v_null <> v_total THEN
        RAISE EXCEPTION '拒绝回滚：pm.project_type_configs total=% null=% ，存在真实租户行，NULL 无法区分原始 nil，请用窗口前快照恢复',
            v_total, v_null;
    END IF;
    UPDATE pm.project_type_configs
       SET tenant_id = '00000000-0000-0000-0000-000000000000'
     WHERE tenant_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '回滚段1：pm.project_type_configs 还原 % 行 NULL -> ...0000', v_updated;
END
$restore$;

DO $unforce$
DECLARE
    r record;
    v_n int := 0;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai', 'ai_models'),
            ('ai', 'ai_prompt_templates'),
            ('ai', 'ai_settings'),
            ('ai', 'ai_training_samples'),
            ('ai', 'analysis_results'),
            ('ai', 'document_chunks'),
            ('ai', 'documents'),
            ('ai', 'model_usage_stats'),
            ('ai', 'qa_history'),
            ('ai', 'usage_logs'),
            ('gis', 'business_locations'),
            ('gis', 'device_location_records'),
            ('gis', 'device_locations'),
            ('gis', 'devices'),
            ('gis', 'evidence_records'),
            ('gis', 'factory_maps'),
            ('gis', 'geofences'),
            ('gis', 'gis_map_markers'),
            ('gis', 'location_photos'),
            ('gis', 'locations'),
            ('gis', 'map_markers'),
            ('gis', 'maps'),
            ('gis', 'pipelines'),
            ('gis', 'track_records'),
            ('gis', 'warehouse_locations'),
            ('integration', 'async_tasks'),
            ('integration', 'conversion_executions'),
            ('integration', 'conversion_rules'),
            ('integration', 'core_inter_module_sync'),
            ('integration', 'crm_erp_sync'),
            ('integration', 'crm_scm_sync'),
            ('integration', 'erp_connections'),
            ('integration', 'erp_mappings'),
            ('integration', 'erp_wms_sync'),
            ('integration', 'external_erp_staging'),
            ('integration', 'external_erp_sync_logs'),
            ('integration', 'hrm_finance_sync'),
            ('integration', 'integration_events'),
            ('integration', 'integration_sync_logs'),
            ('integration', 'lims_qms_sync'),
            ('integration', 'mes_erp_sync'),
            ('integration', 'mes_qms_sync'),
            ('integration', 'wms_scm_sync'),
            ('mobile', 'audio_recordings'),
            ('mobile', 'barcode_scans'),
            ('mobile', 'core_mobile_offline_records'),
            ('mobile', 'devices'),
            ('mobile', 'documents'),
            ('mobile', 'media_files'),
            ('mobile', 'mobile_push_notifications'),
            ('mobile', 'mobile_scan_records'),
            ('mobile', 'mobile_tasks'),
            ('mobile', 'mobile_users'),
            ('mobile', 'oa_announcements'),
            ('mobile', 'oa_calendar_events'),
            ('mobile', 'oa_meetings'),
            ('mobile', 'oa_tasks'),
            ('mobile', 'offline_operations'),
            ('mobile', 'offline_sync_records'),
            ('mobile', 'patrol_records'),
            ('mobile', 'photo_evidences'),
            ('mobile', 'photo_uploads'),
            ('mobile', 'push_config'),
            ('mobile', 'push_devices'),
            ('mobile', 'push_notifications'),
            ('mobile', 'push_templates'),
            ('mobile', 'scan_records'),
            ('mobile', 'shortcuts'),
            ('mobile', 'sync_policies'),
            ('mobile', 'video_recordings'),
            ('pm', 'acceptance_items'),
            ('pm', 'acceptance_plans'),
            ('pm', 'acceptance_records'),
            ('pm', 'acceptances'),
            ('pm', 'budget_items'),
            ('pm', 'budgets'),
            ('pm', 'contract_milestones'),
            ('pm', 'contract_payment_schedule'),
            ('pm', 'contract_templates'),
            ('pm', 'contracts'),
            ('pm', 'defects'),
            ('pm', 'document_folders'),
            ('pm', 'document_versions'),
            ('pm', 'documents'),
            ('pm', 'notification_settings'),
            ('pm', 'notifications'),
            ('pm', 'pm_budget_items'),
            ('pm', 'pm_master_data_refs'),
            ('pm', 'pm_tasks'),
            ('pm', 'project_approvals'),
            ('pm', 'project_benefits'),
            ('pm', 'project_documents'),
            ('pm', 'project_expenses'),
            ('pm', 'project_members'),
            ('pm', 'project_milestones'),
            ('pm', 'project_phases'),
            ('pm', 'project_reports'),
            ('pm', 'project_resources'),
            ('pm', 'project_risks'),
            ('pm', 'project_type_configs'),
            ('pm', 'projects'),
            ('pm', 'quality_checks'),
            ('pm', 'report_templates'),
            ('pm', 'risk_events'),
            ('pm', 'risks'),
            ('pm', 'settlement_adjustments'),
            ('pm', 'settlement_items'),
            ('pm', 'settlements')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I.%I NO FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
        v_n := v_n + 1;
    END LOOP;
    RAISE NOTICE '回滚段2：% 张表已 NO FORCE（策略保留）', v_n;
END
$unforce$;
