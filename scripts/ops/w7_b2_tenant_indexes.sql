-- ============================================================
-- W7 · B2 索引补齐：只给「有数据且缺 tenant 前导索引」的表
--
-- ⚠️ 不是迁移链文件，不参与 sqlx / apply-forward.sh。
--    CREATE INDEX CONCURRENTLY 不允许出现在事务块内，窗口内单独执行：
--      psql -v ON_ERROR_STOP=1 -f scripts/ops/w7_b2_tenant_indexes.sql
--    （不要加 --single-transaction / -1）
--
-- 依据：设计 §9.2。B2 的 108 张表里本地有 20 张缺 tenant 前导索引，
--       生产按复核只有 mobile.sync_policies 缺且非空。
--       为避免「本地建了生产建了空的索引」和反过来的漏建，这里改成
--       按窗口内实际数据动态判定：
--         1) 表存在且 count(*) > 0
--         2) 没有第一条键就是 tenant_id 的有效索引
--       两条都满足才建。幂等：IF NOT EXISTS + 前导键判定。
-- 回滚：DROP INDEX CONCURRENTLY IF EXISTS <索引名>;（名字见脚本输出）
-- ============================================================

SET statement_timeout = 0;
SET lock_timeout = '5s';

\echo 'W7-B2 索引补齐开始（CONCURRENTLY，非事务）'

DROP TABLE IF EXISTS pg_temp.w7_b2_idx_plan;
CREATE TEMP TABLE w7_b2_idx_plan (sch text, tbl text, n bigint);

DO $plan$
DECLARE
    r record;
    v_rows bigint;
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
        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO v_rows;
        IF v_rows = 0 THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_index i
            WHERE i.indrelid = to_regclass(format('%I.%I', r.sch, r.tbl))
              AND i.indisvalid
              AND (i.indkey::int2[])[0] = (
                  SELECT a.attnum FROM pg_attribute a
                  WHERE a.attrelid = i.indrelid AND a.attname = 'tenant_id'
              )
        ) THEN
            CONTINUE;
        END IF;
        INSERT INTO pg_temp.w7_b2_idx_plan VALUES (r.sch, r.tbl, v_rows);
    END LOOP;
END
$plan$;

\echo '--- 计划创建的索引（按行数降序）---'
SELECT sch, tbl, n AS rows FROM pg_temp.w7_b2_idx_plan ORDER BY n DESC;

SELECT format('CREATE INDEX CONCURRENTLY IF NOT EXISTS %I ON %I.%I (tenant_id)',
              'idx_' || tbl || '_tenant', sch, tbl)
FROM pg_temp.w7_b2_idx_plan
ORDER BY n DESC
\gexec

\echo '--- 复核：计划内是否仍有缺索引的表（期望 0 行）---'
SELECT p.sch, p.tbl
FROM pg_temp.w7_b2_idx_plan p
WHERE NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = to_regclass(format('%I.%I', p.sch, p.tbl))
      AND i.indisvalid
      AND (i.indkey::int2[])[0] = (
          SELECT a.attnum FROM pg_attribute a
          WHERE a.attrelid = i.indrelid AND a.attname = 'tenant_id'
      )
);

\echo 'W7-B2 索引补齐完成'
