-- RLS tenant isolation batch (air-owner legacy tables, 63): enable + policy + force.
-- These tables were created by the local dev user `air` (superuser) and were
-- unreachable for RLS ops; owner was first migrated to topems_app via peer-auth
-- air connection (ALTER TABLE ... OWNER TO topems_app), now topems_app can run
-- this migration via DATABASE_URL. Pattern mirrors 75/76.
DO $$
DECLARE
  t text;
  pol text;
  exists_pol boolean;
  ctype text;
  nil_uuid constant text := '00000000-0000-0000-0000-000000000000';
  pol_sql text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
'qms.qa_approval_events', 'analytics.analytics_comparison_analyses', 'analytics.analytics_comparison_results', 'analytics.analytics_dashboard_shares', 'analytics.analytics_dashboard_templates', 'analytics.analytics_dashboards', 'analytics.analytics_datasources', 'analytics.analytics_drilldown_history', 'analytics.analytics_drilldown_paths', 'analytics.analytics_row_level_permissions', 'analytics.analytics_self_service_reports', 'analytics.analytics_widgets', 'iam.core_chat_members', 'iam.core_chat_messages', 'iam.core_chat_rooms', 'iam.core_dict_items', 'iam.core_dict_types', 'iam.core_email_templates', 'iam.core_emails', 'iam.core_faqs', 'iam.core_file_folders', 'iam.core_files', 'iam.core_guide_lessons', 'iam.core_guide_progress', 'iam.core_guides', 'iam.core_inter_module_sync', 'iam.core_login_logs', 'iam.core_menu_groups', 'iam.core_menus', 'iam.core_migration_history', 'iam.core_mobile_offline_records', 'iam.core_notification_templates', 'iam.core_notifications', 'iam.core_plugin_categories', 'iam.core_plugin_permissions', 'iam.core_plugin_instances', 'iam.core_plugins', 'iam.core_plugin_reviews', 'iam.core_roles', 'iam.core_tenant_modules', 'iam.core_tenant_plugins', 'iam.core_tenant_settings', 'iam.core_tenant_usage', 'iam.core_users', 'iam.core_workflow_instances', 'iam.core_workflow_tasks', 'iam.core_workflows', 'iam.core_tenant_users', 'mes.financial_records', 'mes.inspection_records', 'mes.permission_audit_logs', 'mes.tenant_permissions', 'portal.portal_notifications', 'portal.portal_dashboard_stats', 'erp.inventory_items', 'tms.drivers', 'tms.carriers', 'rs.rs_projects', 'rs.rs_formulas', 'rs.rs_experiments', 'lims.qa_lab_samples', 'lims.qa_lab_tasks', 'iam.tenant_users'
  ] LOOP
    pol := 'tenant_isolation_' || split_part(t, '.', 2);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', split_part(t, '.', 1), split_part(t, '.', 2));
    EXECUTE format('SELECT data_type FROM information_schema.columns WHERE table_schema = %L AND table_name = %L AND column_name = ''tenant_id''', split_part(t, '.', 1), split_part(t, '.', 2)) INTO ctype;
    IF ctype = 'uuid' THEN
      pol_sql := format('tenant_id = NULLIF(current_setting(''app.tenant_id''), '''')::UUID OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L', nil_uuid);
    ELSE
      pol_sql := format('tenant_id = NULLIF(current_setting(''app.tenant_id''), '''') OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L', nil_uuid);
    END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = %L AND tablename = %L AND policyname = %L)', split_part(t, '.', 1), split_part(t, '.', 2), pol) INTO exists_pol;
    IF exists_pol THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pol, split_part(t, '.', 1), split_part(t, '.', 2), pol_sql);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)', pol, split_part(t, '.', 1), split_part(t, '.', 2), pol_sql);
    END IF;
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', split_part(t, '.', 1), split_part(t, '.', 2));
    RAISE NOTICE 'rls enabled: %', t;
  END LOOP;
END $$;

-- Assertions
DO $$
DECLARE
  t text;
  missing int := 0;
  n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
'qms.qa_approval_events', 'analytics.analytics_comparison_analyses', 'analytics.analytics_comparison_results', 'analytics.analytics_dashboard_shares', 'analytics.analytics_dashboard_templates', 'analytics.analytics_dashboards', 'analytics.analytics_datasources', 'analytics.analytics_drilldown_history', 'analytics.analytics_drilldown_paths', 'analytics.analytics_row_level_permissions', 'analytics.analytics_self_service_reports', 'analytics.analytics_widgets', 'iam.core_chat_members', 'iam.core_chat_messages', 'iam.core_chat_rooms', 'iam.core_dict_items', 'iam.core_dict_types', 'iam.core_email_templates', 'iam.core_emails', 'iam.core_faqs', 'iam.core_file_folders', 'iam.core_files', 'iam.core_guide_lessons', 'iam.core_guide_progress', 'iam.core_guides', 'iam.core_inter_module_sync', 'iam.core_login_logs', 'iam.core_menu_groups', 'iam.core_menus', 'iam.core_migration_history', 'iam.core_mobile_offline_records', 'iam.core_notification_templates', 'iam.core_notifications', 'iam.core_plugin_categories', 'iam.core_plugin_permissions', 'iam.core_plugin_instances', 'iam.core_plugins', 'iam.core_plugin_reviews', 'iam.core_roles', 'iam.core_tenant_modules', 'iam.core_tenant_plugins', 'iam.core_tenant_settings', 'iam.core_tenant_usage', 'iam.core_users', 'iam.core_workflow_instances', 'iam.core_workflow_tasks', 'iam.core_workflows', 'iam.core_tenant_users', 'mes.financial_records', 'mes.inspection_records', 'mes.permission_audit_logs', 'mes.tenant_permissions', 'portal.portal_notifications', 'portal.portal_dashboard_stats', 'erp.inventory_items', 'tms.drivers', 'tms.carriers', 'rs.rs_projects', 'rs.rs_formulas', 'rs.rs_experiments', 'lims.qa_lab_samples', 'lims.qa_lab_tasks', 'iam.tenant_users'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM pg_policies WHERE schemaname = %L AND tablename = %L AND policyname = %L', split_part(t, '.', 1), split_part(t, '.', 2), 'tenant_isolation_' || split_part(t, '.', 2)) INTO n;
    IF n < 1 THEN
      RAISE NOTICE 'MISSING POLICY: %', t;
      missing := missing + 1;
    END IF;
    EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', split_part(t, '.', 1), split_part(t, '.', 2)) INTO n;
    IF n > 0 THEN
      RAISE NOTICE 'REMAINING NULL: % (% rows)', t, n;
      missing := missing + 1;
    END IF;
  END LOOP;
  IF missing > 0 THEN
    RAISE EXCEPTION 'rls batch incomplete: % issue(s)', missing;
  END IF;
  RAISE NOTICE 'rls batch OK: 63 tables';
END $$;
