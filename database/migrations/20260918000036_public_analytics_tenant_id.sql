-- TOPEMS database migration 20260918000036
-- public.analytics_* 旧表批量补 tenant_id（000021 只覆盖 bi schema；mes 查询解析到 public 表）。
-- 5433 重建库无 public.analytics_* 表（analytics 在 bi schema）→ 用 DO 块动态判断表存在再 ALTER，
-- 幂等且双库安全。

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'analytics_comparison_analyses',
        'analytics_comparison_results',
        'analytics_dashboard_shares',
        'analytics_dashboard_templates',
        'analytics_dashboards',
        'analytics_datasets',
        'analytics_datasources',
        'analytics_drilldown_history',
        'analytics_drilldown_paths',
        'analytics_report_schedules',
        'analytics_report_templates',
        'analytics_reports',
        'analytics_row_level_permissions',
        'analytics_self_service_reports',
        'analytics_sync_records',
        'analytics_widgets'
    ] LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
        END IF;
    END LOOP;
END $$;
