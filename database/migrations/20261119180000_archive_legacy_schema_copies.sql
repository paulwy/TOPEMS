-- 20261119180000_archive_legacy_schema_copies
-- 批次：legacy-copy-20261119，共 108 张「历史 schema 副本」表（先归档后 DROP）
-- 依据：docs/quality/table-disposition-2026-11-19.md（归档候选 139）与 docs/database/legacy-schema-copies-archive-2026-11-19.md
-- 范围：139 张归档候选中，扣除 16 张已由 20261119160000 处理、12 张已被 20261118160000 改名、
--       3 张因入向外键/函数引用未封闭而拆出（iam.core_tenants / flow.core_tenants / iam.core_users），本批 108 张。
-- 复核：基线/生产实测全部 0 行；无触发器；无依赖视图；入向外键 19 条且源表均在本批内（含 flow.core_menus → flow.core_menu_groups）。
--       代码核查：svc/lib 的未限定 SQL 均解析到 bi/public 等活跃 schema，本批遗留 schema 无运行期命中；
--       动态拼接仅 audit writer 的 `{prefix}.audit_logs`，其前缀不含本批涉及的遗留 schema。
-- 安全闸门：必须显式设置 app.archive_legacy_copies_gate=legacy-copies-20261119，否则整条迁移中止。
-- 归档：archive.drop_20261119_lc__<schema>__<table>（结构 + 数据；>63 字节按前 54 + md5 前 8 截断）。
-- 保留期：180 天；源表/归档表/插入行数三方相等校验失败即 RAISE EXCEPTION，DROP 不执行。
-- 事务：由 scripts/migration/apply-forward.sh 以单事务执行，本文件不含 BEGIN/COMMIT。
SET LOCAL search_path = public;
SET LOCAL statement_timeout = '300s';

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive._drop_manifest (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  archive_table text NOT NULL,
  row_count bigint NOT NULL,
  relrowsecurity boolean NOT NULL,
  relforcerowsecurity boolean NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  PRIMARY KEY (migration_version, schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS archive._rls_policy_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  polname text NOT NULL,
  permissive text NOT NULL,
  cmd text NOT NULL,
  roles text[] NOT NULL,
  qual text,
  with_check text,
  PRIMARY KEY (migration_version, schema_name, table_name, polname)
);

CREATE TABLE IF NOT EXISTS archive._fk_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  conname text NOT NULL,
  src_schema text NOT NULL,
  src_table text NOT NULL,
  tgt_schema text NOT NULL,
  tgt_table text NOT NULL,
  condef text NOT NULL,
  PRIMARY KEY (migration_version, conname, src_schema, src_table)
);

CREATE TABLE IF NOT EXISTS archive._view_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  view_schema text NOT NULL,
  view_name text NOT NULL,
  object_kind char NOT NULL,
  view_def text NOT NULL,
  PRIMARY KEY (migration_version, view_schema, view_name)
);

CREATE TABLE IF NOT EXISTS archive._column_defaults (
  migration_version text NOT NULL,
  batch text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  column_name text NOT NULL,
  default_expr text NOT NULL,
  PRIMARY KEY (migration_version, schema_name, table_name, column_name)
);

CREATE TABLE IF NOT EXISTS archive._sequence_snapshot (
  migration_version text NOT NULL,
  batch text NOT NULL,
  seq_schema text NOT NULL,
  seq_name text NOT NULL,
  owned_schema text NOT NULL,
  owned_table text NOT NULL,
  owned_column text NOT NULL,
  data_type text NOT NULL,
  start_value bigint NOT NULL,
  increment_by bigint NOT NULL,
  min_value bigint NOT NULL,
  max_value bigint NOT NULL,
  cache_size bigint NOT NULL,
  is_cycle boolean NOT NULL,
  last_value bigint,
  PRIMARY KEY (migration_version, seq_schema, seq_name)
);

-- 1) 前置断言 + 归档 + 快照
DO $migration$
DECLARE
  r record;
  arc text; n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
  n_total int := 0;
  n_present int := 0;
BEGIN
  IF coalesce(current_setting('app.archive_legacy_copies_gate', true), '') <> 'legacy-copies-20261119' THEN
    RAISE EXCEPTION 'gate closed: set app.archive_legacy_copies_gate=legacy-copies-20261119';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('analytics', 'analytics_comparison_analyses', 'drop_20261119_lc__analytics__analytics_comparison_analyses'),
    ('analytics', 'analytics_comparison_results', 'drop_20261119_lc__analytics__analytics_comparison_results'),
    ('analytics', 'analytics_dashboard_shares', 'drop_20261119_lc__analytics__analytics_dashboard_shares'),
    ('analytics', 'analytics_dashboard_templates', 'drop_20261119_lc__analytics__analytics_dashboard_templates'),
    ('analytics', 'analytics_dashboards', 'drop_20261119_lc__analytics__analytics_dashboards'),
    ('analytics', 'analytics_datasets', 'drop_20261119_lc__analytics__analytics_datasets'),
    ('analytics', 'analytics_datasources', 'drop_20261119_lc__analytics__analytics_datasources'),
    ('analytics', 'analytics_drilldown_history', 'drop_20261119_lc__analytics__analytics_drilldown_history'),
    ('analytics', 'analytics_drilldown_paths', 'drop_20261119_lc__analytics__analytics_drilldown_paths'),
    ('analytics', 'analytics_row_level_permissions', 'drop_20261119_lc__analytics__analytics_row_level_permissions'),
    ('analytics', 'analytics_self_service_reports', 'drop_20261119_lc__analytics__analytics_self_service_reports'),
    ('analytics', 'analytics_sync_records', 'drop_20261119_lc__analytics__analytics_sync_records'),
    ('analytics', 'analytics_widgets', 'drop_20261119_lc__analytics__analytics_widgets'),
    ('analytics', 'report_schedules', 'drop_20261119_lc__analytics__report_schedules'),
    ('analytics', 'report_subscriptions', 'drop_20261119_lc__analytics__report_subscriptions'),
    ('analytics', 'report_templates', 'drop_20261119_lc__analytics__report_templates'),
    ('analytics', 'reports', 'drop_20261119_lc__analytics__reports'),
    ('communication', 'core_email_templates', 'drop_20261119_lc__communication__core_email_templates'),
    ('doc_service', 'core_doc_documents', 'drop_20261119_lc__doc_service__core_doc_documents'),
    ('doc_service', 'core_doc_folders', 'drop_20261119_lc__doc_service__core_doc_folders'),
    ('doc_service', 'core_doc_templates', 'drop_20261119_lc__doc_service__core_doc_templates'),
    ('flow', 'approval_records', 'drop_20261119_lc__flow__approval_records'),
    ('flow', 'approvals', 'drop_20261119_lc__flow__approvals'),
    ('flow', 'audit_logs', 'drop_20261119_lc__flow__audit_logs'),
    ('flow', 'core_file_folders', 'drop_20261119_lc__flow__core_file_folders'),
    ('flow', 'core_file_permissions', 'drop_20261119_lc__flow__core_file_permissions'),
    ('flow', 'core_files', 'drop_20261119_lc__flow__core_files'),
    ('flow', 'core_flow_delegates', 'drop_20261119_lc__flow__core_flow_delegates'),
    ('flow', 'core_flow_rules', 'drop_20261119_lc__flow__core_flow_rules'),
    ('flow', 'core_flow_variable_history', 'drop_20261119_lc__flow__core_flow_variable_history'),
    ('flow', 'core_flow_variables', 'drop_20261119_lc__flow__core_flow_variables'),
    ('flow', 'core_master_data_refs', 'drop_20261119_lc__flow__core_master_data_refs'),
    ('flow', 'core_mdm_reconciliation_log', 'drop_20261119_lc__flow__core_mdm_reconciliation_log'),
    ('flow', 'core_migration_history', 'drop_20261119_lc__flow__core_migration_history'),
    ('flow', 'core_workflow_instances', 'drop_20261119_lc__flow__core_workflow_instances'),
    ('flow', 'core_workflow_tasks', 'drop_20261119_lc__flow__core_workflow_tasks'),
    ('flow', 'core_workflow_versions', 'drop_20261119_lc__flow__core_workflow_versions'),
    ('flow', 'core_workflows', 'drop_20261119_lc__flow__core_workflows'),
    ('iam', 'audit_logs', 'drop_20261119_lc__iam__audit_logs'),
    ('iam', 'auth_sessions', 'drop_20261119_lc__iam__auth_sessions'),
    ('iam', 'core_billing_invoices', 'drop_20261119_lc__iam__core_billing_invoices'),
    ('iam', 'core_billing_plans', 'drop_20261119_lc__iam__core_billing_plans'),
    ('iam', 'core_chat_members', 'drop_20261119_lc__iam__core_chat_members'),
    ('iam', 'core_chat_messages', 'drop_20261119_lc__iam__core_chat_messages'),
    ('iam', 'core_chat_rooms', 'drop_20261119_lc__iam__core_chat_rooms'),
    ('iam', 'core_dashboard_refresh_log', 'drop_20261119_lc__iam__core_dashboard_refresh_log'),
    ('iam', 'core_dict_items', 'drop_20261119_lc__iam__core_dict_items'),
    ('iam', 'core_dict_types', 'drop_20261119_lc__iam__core_dict_types'),
    ('iam', 'core_email_queue', 'drop_20261119_lc__iam__core_email_queue'),
    ('iam', 'core_email_templates', 'drop_20261119_lc__iam__core_email_templates'),
    ('iam', 'core_emails', 'drop_20261119_lc__iam__core_emails'),
    ('iam', 'core_faqs', 'drop_20261119_lc__iam__core_faqs'),
    ('iam', 'core_file_folders', 'drop_20261119_lc__iam__core_file_folders'),
    ('iam', 'core_files', 'drop_20261119_lc__iam__core_files'),
    ('iam', 'core_guide_lessons', 'drop_20261119_lc__iam__core_guide_lessons'),
    ('iam', 'core_guide_progress', 'drop_20261119_lc__iam__core_guide_progress'),
    ('iam', 'core_guides', 'drop_20261119_lc__iam__core_guides'),
    ('iam', 'core_inter_module_sync', 'drop_20261119_lc__iam__core_inter_module_sync'),
    ('iam', 'core_login_logs', 'drop_20261119_lc__iam__core_login_logs'),
    ('iam', 'core_menu_groups', 'drop_20261119_lc__iam__core_menu_groups'),
    ('iam', 'core_menus', 'drop_20261119_lc__iam__core_menus'),
    ('iam', 'core_migration_history', 'drop_20261119_lc__iam__core_migration_history'),
    ('iam', 'core_mobile_offline_records', 'drop_20261119_lc__iam__core_mobile_offline_records'),
    ('iam', 'core_notification_templates', 'drop_20261119_lc__iam__core_notification_templates'),
    ('iam', 'core_notifications', 'drop_20261119_lc__iam__core_notifications'),
    ('iam', 'core_plugin_categories', 'drop_20261119_lc__iam__core_plugin_categories'),
    ('iam', 'core_plugin_instances', 'drop_20261119_lc__iam__core_plugin_instances'),
    ('iam', 'core_plugin_permissions', 'drop_20261119_lc__iam__core_plugin_permissions'),
    ('iam', 'core_plugin_pricing', 'drop_20261119_lc__iam__core_plugin_pricing'),
    ('iam', 'core_plugin_reviews', 'drop_20261119_lc__iam__core_plugin_reviews'),
    ('iam', 'core_plugin_versions', 'drop_20261119_lc__iam__core_plugin_versions'),
    ('iam', 'core_plugins', 'drop_20261119_lc__iam__core_plugins'),
    ('iam', 'core_subscriptions', 'drop_20261119_lc__iam__core_subscriptions'),
    ('iam', 'core_tenant_modules', 'drop_20261119_lc__iam__core_tenant_modules'),
    ('iam', 'core_tenant_settings', 'drop_20261119_lc__iam__core_tenant_settings'),
    ('iam', 'core_tenant_usage', 'drop_20261119_lc__iam__core_tenant_usage'),
    ('iam', 'core_tenant_users', 'drop_20261119_lc__iam__core_tenant_users'),
    ('iam', 'core_usage_records', 'drop_20261119_lc__iam__core_usage_records'),
    ('iam', 'core_workflow_instances', 'drop_20261119_lc__iam__core_workflow_instances'),
    ('iam', 'core_workflow_tasks', 'drop_20261119_lc__iam__core_workflow_tasks'),
    ('iam', 'core_workflows', 'drop_20261119_lc__iam__core_workflows'),
    ('iam', 'crm_dashboard_snapshots', 'drop_20261119_lc__iam__crm_dashboard_snapshots'),
    ('iam', 'data_permissions', 'drop_20261119_lc__iam__data_permissions'),
    ('iam', 'dynamic_data', 'drop_20261119_lc__iam__dynamic_data'),
    ('iam', 'ehs_dashboard_snapshots', 'drop_20261119_lc__iam__ehs_dashboard_snapshots'),
    ('iam', 'hrm_dashboard_snapshots', 'drop_20261119_lc__iam__hrm_dashboard_snapshots'),
    ('iam', 'lims_dashboard_snapshots', 'drop_20261119_lc__iam__lims_dashboard_snapshots'),
    ('iam', 'password_reset_tokens', 'drop_20261119_lc__iam__password_reset_tokens'),
    ('iam', 'pdm_dashboard_snapshots', 'drop_20261119_lc__iam__pdm_dashboard_snapshots'),
    ('iam', 'permission_audit_logs', 'drop_20261119_lc__iam__permission_audit_logs'),
    ('iam', 'permission_templates', 'drop_20261119_lc__iam__permission_templates'),
    ('iam', 'refresh_tokens', 'drop_20261119_lc__iam__refresh_tokens'),
    ('iam', 'schema_registry', 'drop_20261119_lc__iam__schema_registry'),
    ('iam', 'sessions', 'drop_20261119_lc__iam__sessions'),
    ('iam', 'tenant_users', 'drop_20261119_lc__iam__tenant_users'),
    ('iam', 'user_access_logs', 'drop_20261119_lc__iam__user_access_logs'),
    ('iam', 'user_roles', 'drop_20261119_lc__iam__user_roles'),
    ('iam', 'wms_dashboard_snapshots', 'drop_20261119_lc__iam__wms_dashboard_snapshots'),
    ('plugin_erp', 'accounting_subjects', 'drop_20261119_lc__plugin_erp__accounting_subjects'),
    ('plugin_finance', 'difference_adjustments', 'drop_20261119_lc__plugin_finance__difference_adjustments'),
    ('plugin_finance', 'reconciliation_item_snapshots', 'drop_20261119_lc__plugin_finance__reconciliation_item_snapshots'),
    ('plugin_finance', 'reconciliation_settlement_links', 'drop_20261119_lc__plugin_finance__reconciliation_settl2d6c724b'),
    ('plugin_finance', 'reconciliation_snapshots', 'drop_20261119_lc__plugin_finance__reconciliation_snapshots'),
    ('plugin_finance', 'settlement_snapshots', 'drop_20261119_lc__plugin_finance__settlement_snapshots'),
    ('plugin_finance', 'source_amount_snapshots', 'drop_20261119_lc__plugin_finance__source_amount_snapshots'),
    ('plugin_mes', 'audit_logs', 'drop_20261119_lc__plugin_mes__audit_logs'),
    ('plugin_wms', 'purchase_order_snapshots', 'drop_20261119_lc__plugin_wms__purchase_order_snapshots'),
    ('unified_core', 'documents', 'drop_20261119_lc__unified_core__documents')
  ) AS x(sch, tbl, arc)
  LOOP
    n_total := n_total + 1;
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
      CONTINUE;
    END IF;
    n_present := n_present + 1;
    arc := r.arc;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119180000', 'legacy-copy-20261119', r.sch, r.tbl, p.polname,
           CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
           CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
                         WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
           CASE WHEN 0 = ANY(p.polroles) THEN ARRAY['PUBLIC']
                ELSE ARRAY(SELECT pg_get_userbyid(x) FROM unnest(p.polroles) x) END,
           pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._fk_snapshot
      (migration_version, batch, conname, src_schema, src_table, tgt_schema, tgt_table, condef)
    SELECT '20261119180000', 'legacy-copy-20261119', k.conname, sn.nspname, sc.relname, tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119180000', 'legacy-copy-20261119', vn.nspname, v.relname, v.relkind::text, pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119180000', 'legacy-copy-20261119', r.sch, r.tbl, a.attname, pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119180000', 'legacy-copy-20261119', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
           format_type(q.seqtypid, NULL), q.seqstart, q.seqincrement, q.seqmin, q.seqmax, q.seqcache, q.seqcycle,
           (SELECT ps.last_value FROM pg_sequences ps WHERE ps.schemaname = sn.nspname AND ps.sequencename = s.relname)
    FROM pg_class s
    JOIN pg_namespace sn ON sn.oid = s.relnamespace
    JOIN pg_sequence q ON q.seqrelid = s.oid
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S' AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    IF to_regclass(format('archive.%I', arc)) IS NOT NULL THEN
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run', arc;
    END IF;
    EXECUTE format('CREATE TABLE archive.%I (LIKE %I.%I INCLUDING ALL EXCLUDING DEFAULTS)', arc, r.sch, r.tbl);
    EXECUTE format('INSERT INTO archive.%I SELECT * FROM %I.%I', arc, r.sch, r.tbl);
    GET DIAGNOSTICS n_ins = ROW_COUNT;
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO n_src;
    EXECUTE format('SELECT count(*) FROM archive.%I', arc) INTO n_arc;
    IF n_src <> n_arc OR n_ins <> n_src THEN
      RAISE EXCEPTION 'archive verification failed for %.%: src=%, arc=%, inserted=%', r.sch, r.tbl, n_src, n_arc, n_ins;
    END IF;

    INSERT INTO archive._drop_manifest
      (migration_version, batch, schema_name, table_name, archive_table, row_count,
       relrowsecurity, relforcerowsecurity, retention_until)
    VALUES ('20261119180000', 'legacy-copy-20261119', r.sch, r.tbl, arc, n_src, v_rls, v_force, now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF n_present <> 108 OR n_total <> 108 THEN
    RAISE EXCEPTION 'pre-check failed: expected 108 tables present, found %/%', n_present, n_total;
  END IF;

  -- 依赖封闭前置断言：入向外键的源表必须也在本批内
  IF EXISTS (
    SELECT 1 FROM archive._fk_snapshot f
    WHERE f.migration_version = '20261119180000'
      AND NOT EXISTS (SELECT 1 FROM (VALUES
    ('analytics', 'analytics_comparison_analyses'),
    ('analytics', 'analytics_comparison_results'),
    ('analytics', 'analytics_dashboard_shares'),
    ('analytics', 'analytics_dashboard_templates'),
    ('analytics', 'analytics_dashboards'),
    ('analytics', 'analytics_datasets'),
    ('analytics', 'analytics_datasources'),
    ('analytics', 'analytics_drilldown_history'),
    ('analytics', 'analytics_drilldown_paths'),
    ('analytics', 'analytics_row_level_permissions'),
    ('analytics', 'analytics_self_service_reports'),
    ('analytics', 'analytics_sync_records'),
    ('analytics', 'analytics_widgets'),
    ('analytics', 'report_schedules'),
    ('analytics', 'report_subscriptions'),
    ('analytics', 'report_templates'),
    ('analytics', 'reports'),
    ('communication', 'core_email_templates'),
    ('doc_service', 'core_doc_documents'),
    ('doc_service', 'core_doc_folders'),
    ('doc_service', 'core_doc_templates'),
    ('flow', 'approval_records'),
    ('flow', 'approvals'),
    ('flow', 'audit_logs'),
    ('flow', 'core_file_folders'),
    ('flow', 'core_file_permissions'),
    ('flow', 'core_files'),
    ('flow', 'core_flow_delegates'),
    ('flow', 'core_flow_rules'),
    ('flow', 'core_flow_variable_history'),
    ('flow', 'core_flow_variables'),
    ('flow', 'core_master_data_refs'),
    ('flow', 'core_mdm_reconciliation_log'),
    ('flow', 'core_migration_history'),
    ('flow', 'core_workflow_instances'),
    ('flow', 'core_workflow_tasks'),
    ('flow', 'core_workflow_versions'),
    ('flow', 'core_workflows'),
    ('iam', 'audit_logs'),
    ('iam', 'auth_sessions'),
    ('iam', 'core_billing_invoices'),
    ('iam', 'core_billing_plans'),
    ('iam', 'core_chat_members'),
    ('iam', 'core_chat_messages'),
    ('iam', 'core_chat_rooms'),
    ('iam', 'core_dashboard_refresh_log'),
    ('iam', 'core_dict_items'),
    ('iam', 'core_dict_types'),
    ('iam', 'core_email_queue'),
    ('iam', 'core_email_templates'),
    ('iam', 'core_emails'),
    ('iam', 'core_faqs'),
    ('iam', 'core_file_folders'),
    ('iam', 'core_files'),
    ('iam', 'core_guide_lessons'),
    ('iam', 'core_guide_progress'),
    ('iam', 'core_guides'),
    ('iam', 'core_inter_module_sync'),
    ('iam', 'core_login_logs'),
    ('iam', 'core_menu_groups'),
    ('iam', 'core_menus'),
    ('iam', 'core_migration_history'),
    ('iam', 'core_mobile_offline_records'),
    ('iam', 'core_notification_templates'),
    ('iam', 'core_notifications'),
    ('iam', 'core_plugin_categories'),
    ('iam', 'core_plugin_instances'),
    ('iam', 'core_plugin_permissions'),
    ('iam', 'core_plugin_pricing'),
    ('iam', 'core_plugin_reviews'),
    ('iam', 'core_plugin_versions'),
    ('iam', 'core_plugins'),
    ('iam', 'core_subscriptions'),
    ('iam', 'core_tenant_modules'),
    ('iam', 'core_tenant_settings'),
    ('iam', 'core_tenant_usage'),
    ('iam', 'core_tenant_users'),
    ('iam', 'core_usage_records'),
    ('iam', 'core_workflow_instances'),
    ('iam', 'core_workflow_tasks'),
    ('iam', 'core_workflows'),
    ('iam', 'crm_dashboard_snapshots'),
    ('iam', 'data_permissions'),
    ('iam', 'dynamic_data'),
    ('iam', 'ehs_dashboard_snapshots'),
    ('iam', 'hrm_dashboard_snapshots'),
    ('iam', 'lims_dashboard_snapshots'),
    ('iam', 'password_reset_tokens'),
    ('iam', 'pdm_dashboard_snapshots'),
    ('iam', 'permission_audit_logs'),
    ('iam', 'permission_templates'),
    ('iam', 'refresh_tokens'),
    ('iam', 'schema_registry'),
    ('iam', 'sessions'),
    ('iam', 'tenant_users'),
    ('iam', 'user_access_logs'),
    ('iam', 'user_roles'),
    ('iam', 'wms_dashboard_snapshots'),
    ('plugin_erp', 'accounting_subjects'),
    ('plugin_finance', 'difference_adjustments'),
    ('plugin_finance', 'reconciliation_item_snapshots'),
    ('plugin_finance', 'reconciliation_settlement_links'),
    ('plugin_finance', 'reconciliation_snapshots'),
    ('plugin_finance', 'settlement_snapshots'),
    ('plugin_finance', 'source_amount_snapshots'),
    ('plugin_mes', 'audit_logs'),
    ('plugin_wms', 'purchase_order_snapshots'),
    ('unified_core', 'documents')
      ) AS c(sch, tbl) WHERE c.sch = f.src_schema AND c.tbl = f.src_table)
  ) THEN
    RAISE EXCEPTION 'pre-check failed: inbound foreign key from table outside batch; split dependent table out';
  END IF;

  IF EXISTS (
    SELECT 1 FROM archive._view_snapshot
    WHERE migration_version = '20261119180000'
  ) THEN
    RAISE EXCEPTION 'pre-check failed: dependent view found; split dependent view out';
  END IF;

  RAISE NOTICE 'legacy-copy archive complete: tables=%', n_present;
END
$migration$;

-- 2) 归档校验通过后 DROP（schema 字面量，仅表名参数化；不使用 CASCADE）
-- 按 schema 分块；块内顺序为外键拓扑序（依赖方先删）。跨 schema 外键 0 条（基线实测）。

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（analytics）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_analytics$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('analytics_comparison_analyses'),
    ('analytics_comparison_results'),
    ('analytics_dashboard_shares'),
    ('analytics_dashboard_templates'),
    ('analytics_dashboards'),
    ('analytics_datasets'),
    ('analytics_datasources'),
    ('analytics_drilldown_history'),
    ('analytics_drilldown_paths'),
    ('analytics_row_level_permissions'),
    ('analytics_self_service_reports'),
    ('analytics_sync_records'),
    ('analytics_widgets'),
    ('report_schedules'),
    ('report_subscriptions'),
    ('report_templates'),
    ('reports')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('analytics.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing analytics.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS analytics.%I', r.tbl);
  END LOOP;
END
$drop_analytics$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（communication）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_communication$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_email_templates')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('communication.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing communication.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS communication.%I', r.tbl);
  END LOOP;
END
$drop_communication$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（doc_service）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_doc_service$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_doc_documents'),
    ('core_doc_folders'),
    ('core_doc_templates')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('doc_service.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing doc_service.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS doc_service.%I', r.tbl);
  END LOOP;
END
$drop_doc_service$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（flow）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_flow$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('approval_records'),
    ('approvals'),
    ('audit_logs'),
    ('core_file_folders'),
    ('core_file_permissions'),
    ('core_files'),
    ('core_flow_delegates'),
    ('core_flow_rules'),
    ('core_flow_variable_history'),
    ('core_flow_variables'),
    ('core_master_data_refs'),
    ('core_mdm_reconciliation_log'),
    ('core_migration_history'),
    ('core_workflow_tasks'),
    ('core_workflow_instances'),
    ('core_workflow_versions'),
    ('core_workflows')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('flow.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing flow.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS flow.%I', r.tbl);
  END LOOP;
END
$drop_flow$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（iam）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_iam$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_logs'),
    ('auth_sessions'),
    ('core_billing_invoices'),
    ('core_subscriptions'),
    ('core_billing_plans'),
    ('core_chat_members'),
    ('core_chat_messages'),
    ('core_chat_rooms'),
    ('core_dashboard_refresh_log'),
    ('core_dict_items'),
    ('core_dict_types'),
    ('core_email_queue'),
    ('core_email_templates'),
    ('core_emails'),
    ('core_faqs'),
    ('core_file_folders'),
    ('core_files'),
    ('core_guide_lessons'),
    ('core_guide_progress'),
    ('core_guides'),
    ('core_inter_module_sync'),
    ('core_login_logs'),
    ('core_menus'),
    ('core_menu_groups'),
    ('core_migration_history'),
    ('core_mobile_offline_records'),
    ('core_notification_templates'),
    ('core_notifications'),
    ('core_plugin_categories'),
    ('core_plugin_instances'),
    ('core_plugin_permissions'),
    ('core_plugin_pricing'),
    ('core_plugin_reviews'),
    ('core_plugin_versions'),
    ('core_plugins'),
    ('core_tenant_modules'),
    ('core_tenant_settings'),
    ('core_tenant_usage'),
    ('core_tenant_users'),
    ('core_usage_records'),
    ('core_workflow_tasks'),
    ('core_workflow_instances'),
    ('core_workflows'),
    ('crm_dashboard_snapshots'),
    ('data_permissions'),
    ('dynamic_data'),
    ('ehs_dashboard_snapshots'),
    ('hrm_dashboard_snapshots'),
    ('lims_dashboard_snapshots'),
    ('password_reset_tokens'),
    ('pdm_dashboard_snapshots'),
    ('permission_audit_logs'),
    ('permission_templates'),
    ('refresh_tokens'),
    ('schema_registry'),
    ('sessions'),
    ('tenant_users'),
    ('user_access_logs'),
    ('user_roles'),
    ('wms_dashboard_snapshots')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('iam.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing iam.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS iam.%I', r.tbl);
  END LOOP;
END
$drop_iam$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（plugin_erp）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_plugin_erp$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('accounting_subjects')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('plugin_erp.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing plugin_erp.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS plugin_erp.%I', r.tbl);
  END LOOP;
END
$drop_plugin_erp$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（plugin_finance）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_plugin_finance$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('difference_adjustments'),
    ('reconciliation_item_snapshots'),
    ('reconciliation_settlement_links'),
    ('reconciliation_snapshots'),
    ('settlement_snapshots'),
    ('source_amount_snapshots')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('plugin_finance.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing plugin_finance.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS plugin_finance.%I', r.tbl);
  END LOOP;
END
$drop_plugin_finance$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（plugin_mes）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_plugin_mes$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_logs')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('plugin_mes.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing plugin_mes.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS plugin_mes.%I', r.tbl);
  END LOOP;
END
$drop_plugin_mes$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（plugin_wms）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_plugin_wms$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('purchase_order_snapshots')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('plugin_wms.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing plugin_wms.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS plugin_wms.%I', r.tbl);
  END LOOP;
END
$drop_plugin_wms$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: legacy schema 副本清理（unified_core）：生产 0 行、运行期零读写、无外部入向外键，已在本迁移内先归档到 archive
-- destructive-owner: 平台组/DBA
-- destructive-ticket: LEGACY-COPY-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_lc__*（迁移内先归档，保留 180 天）
DO $drop_unified_core$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('documents')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('unified_core.%I', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing unified_core.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS unified_core.%I', r.tbl);
  END LOOP;
END
$drop_unified_core$;


-- 3) 后置断言：108 张全部消失；归档与 manifest 齐全
DO $post$
DECLARE
  n_left int;
  n_arc int;
  n_manifest int;
BEGIN
  SELECT count(*) INTO n_left
  FROM (VALUES
    ('analytics', 'analytics_comparison_analyses'),
    ('analytics', 'analytics_comparison_results'),
    ('analytics', 'analytics_dashboard_shares'),
    ('analytics', 'analytics_dashboard_templates'),
    ('analytics', 'analytics_dashboards'),
    ('analytics', 'analytics_datasets'),
    ('analytics', 'analytics_datasources'),
    ('analytics', 'analytics_drilldown_history'),
    ('analytics', 'analytics_drilldown_paths'),
    ('analytics', 'analytics_row_level_permissions'),
    ('analytics', 'analytics_self_service_reports'),
    ('analytics', 'analytics_sync_records'),
    ('analytics', 'analytics_widgets'),
    ('analytics', 'report_schedules'),
    ('analytics', 'report_subscriptions'),
    ('analytics', 'report_templates'),
    ('analytics', 'reports'),
    ('communication', 'core_email_templates'),
    ('doc_service', 'core_doc_documents'),
    ('doc_service', 'core_doc_folders'),
    ('doc_service', 'core_doc_templates'),
    ('flow', 'approval_records'),
    ('flow', 'approvals'),
    ('flow', 'audit_logs'),
    ('flow', 'core_file_folders'),
    ('flow', 'core_file_permissions'),
    ('flow', 'core_files'),
    ('flow', 'core_flow_delegates'),
    ('flow', 'core_flow_rules'),
    ('flow', 'core_flow_variable_history'),
    ('flow', 'core_flow_variables'),
    ('flow', 'core_master_data_refs'),
    ('flow', 'core_mdm_reconciliation_log'),
    ('flow', 'core_migration_history'),
    ('flow', 'core_workflow_instances'),
    ('flow', 'core_workflow_tasks'),
    ('flow', 'core_workflow_versions'),
    ('flow', 'core_workflows'),
    ('iam', 'audit_logs'),
    ('iam', 'auth_sessions'),
    ('iam', 'core_billing_invoices'),
    ('iam', 'core_billing_plans'),
    ('iam', 'core_chat_members'),
    ('iam', 'core_chat_messages'),
    ('iam', 'core_chat_rooms'),
    ('iam', 'core_dashboard_refresh_log'),
    ('iam', 'core_dict_items'),
    ('iam', 'core_dict_types'),
    ('iam', 'core_email_queue'),
    ('iam', 'core_email_templates'),
    ('iam', 'core_emails'),
    ('iam', 'core_faqs'),
    ('iam', 'core_file_folders'),
    ('iam', 'core_files'),
    ('iam', 'core_guide_lessons'),
    ('iam', 'core_guide_progress'),
    ('iam', 'core_guides'),
    ('iam', 'core_inter_module_sync'),
    ('iam', 'core_login_logs'),
    ('iam', 'core_menu_groups'),
    ('iam', 'core_menus'),
    ('iam', 'core_migration_history'),
    ('iam', 'core_mobile_offline_records'),
    ('iam', 'core_notification_templates'),
    ('iam', 'core_notifications'),
    ('iam', 'core_plugin_categories'),
    ('iam', 'core_plugin_instances'),
    ('iam', 'core_plugin_permissions'),
    ('iam', 'core_plugin_pricing'),
    ('iam', 'core_plugin_reviews'),
    ('iam', 'core_plugin_versions'),
    ('iam', 'core_plugins'),
    ('iam', 'core_subscriptions'),
    ('iam', 'core_tenant_modules'),
    ('iam', 'core_tenant_settings'),
    ('iam', 'core_tenant_usage'),
    ('iam', 'core_tenant_users'),
    ('iam', 'core_usage_records'),
    ('iam', 'core_workflow_instances'),
    ('iam', 'core_workflow_tasks'),
    ('iam', 'core_workflows'),
    ('iam', 'crm_dashboard_snapshots'),
    ('iam', 'data_permissions'),
    ('iam', 'dynamic_data'),
    ('iam', 'ehs_dashboard_snapshots'),
    ('iam', 'hrm_dashboard_snapshots'),
    ('iam', 'lims_dashboard_snapshots'),
    ('iam', 'password_reset_tokens'),
    ('iam', 'pdm_dashboard_snapshots'),
    ('iam', 'permission_audit_logs'),
    ('iam', 'permission_templates'),
    ('iam', 'refresh_tokens'),
    ('iam', 'schema_registry'),
    ('iam', 'sessions'),
    ('iam', 'tenant_users'),
    ('iam', 'user_access_logs'),
    ('iam', 'user_roles'),
    ('iam', 'wms_dashboard_snapshots'),
    ('plugin_erp', 'accounting_subjects'),
    ('plugin_finance', 'difference_adjustments'),
    ('plugin_finance', 'reconciliation_item_snapshots'),
    ('plugin_finance', 'reconciliation_settlement_links'),
    ('plugin_finance', 'reconciliation_snapshots'),
    ('plugin_finance', 'settlement_snapshots'),
    ('plugin_finance', 'source_amount_snapshots'),
    ('plugin_mes', 'audit_logs'),
    ('plugin_wms', 'purchase_order_snapshots'),
    ('unified_core', 'documents')
  ) AS x(sch, tbl)
  WHERE to_regclass(format('%I.%I', x.sch, x.tbl)) IS NOT NULL;
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'post-check failed: % legacy-copy tables still exist', n_left;
  END IF;

  SELECT count(*) INTO n_arc
  FROM (VALUES
    ('drop_20261119_lc__analytics__analytics_comparison_analyses'),
    ('drop_20261119_lc__analytics__analytics_comparison_results'),
    ('drop_20261119_lc__analytics__analytics_dashboard_shares'),
    ('drop_20261119_lc__analytics__analytics_dashboard_templates'),
    ('drop_20261119_lc__analytics__analytics_dashboards'),
    ('drop_20261119_lc__analytics__analytics_datasets'),
    ('drop_20261119_lc__analytics__analytics_datasources'),
    ('drop_20261119_lc__analytics__analytics_drilldown_history'),
    ('drop_20261119_lc__analytics__analytics_drilldown_paths'),
    ('drop_20261119_lc__analytics__analytics_row_level_permissions'),
    ('drop_20261119_lc__analytics__analytics_self_service_reports'),
    ('drop_20261119_lc__analytics__analytics_sync_records'),
    ('drop_20261119_lc__analytics__analytics_widgets'),
    ('drop_20261119_lc__analytics__report_schedules'),
    ('drop_20261119_lc__analytics__report_subscriptions'),
    ('drop_20261119_lc__analytics__report_templates'),
    ('drop_20261119_lc__analytics__reports'),
    ('drop_20261119_lc__communication__core_email_templates'),
    ('drop_20261119_lc__doc_service__core_doc_documents'),
    ('drop_20261119_lc__doc_service__core_doc_folders'),
    ('drop_20261119_lc__doc_service__core_doc_templates'),
    ('drop_20261119_lc__flow__approval_records'),
    ('drop_20261119_lc__flow__approvals'),
    ('drop_20261119_lc__flow__audit_logs'),
    ('drop_20261119_lc__flow__core_file_folders'),
    ('drop_20261119_lc__flow__core_file_permissions'),
    ('drop_20261119_lc__flow__core_files'),
    ('drop_20261119_lc__flow__core_flow_delegates'),
    ('drop_20261119_lc__flow__core_flow_rules'),
    ('drop_20261119_lc__flow__core_flow_variable_history'),
    ('drop_20261119_lc__flow__core_flow_variables'),
    ('drop_20261119_lc__flow__core_master_data_refs'),
    ('drop_20261119_lc__flow__core_mdm_reconciliation_log'),
    ('drop_20261119_lc__flow__core_migration_history'),
    ('drop_20261119_lc__flow__core_workflow_instances'),
    ('drop_20261119_lc__flow__core_workflow_tasks'),
    ('drop_20261119_lc__flow__core_workflow_versions'),
    ('drop_20261119_lc__flow__core_workflows'),
    ('drop_20261119_lc__iam__audit_logs'),
    ('drop_20261119_lc__iam__auth_sessions'),
    ('drop_20261119_lc__iam__core_billing_invoices'),
    ('drop_20261119_lc__iam__core_billing_plans'),
    ('drop_20261119_lc__iam__core_chat_members'),
    ('drop_20261119_lc__iam__core_chat_messages'),
    ('drop_20261119_lc__iam__core_chat_rooms'),
    ('drop_20261119_lc__iam__core_dashboard_refresh_log'),
    ('drop_20261119_lc__iam__core_dict_items'),
    ('drop_20261119_lc__iam__core_dict_types'),
    ('drop_20261119_lc__iam__core_email_queue'),
    ('drop_20261119_lc__iam__core_email_templates'),
    ('drop_20261119_lc__iam__core_emails'),
    ('drop_20261119_lc__iam__core_faqs'),
    ('drop_20261119_lc__iam__core_file_folders'),
    ('drop_20261119_lc__iam__core_files'),
    ('drop_20261119_lc__iam__core_guide_lessons'),
    ('drop_20261119_lc__iam__core_guide_progress'),
    ('drop_20261119_lc__iam__core_guides'),
    ('drop_20261119_lc__iam__core_inter_module_sync'),
    ('drop_20261119_lc__iam__core_login_logs'),
    ('drop_20261119_lc__iam__core_menu_groups'),
    ('drop_20261119_lc__iam__core_menus'),
    ('drop_20261119_lc__iam__core_migration_history'),
    ('drop_20261119_lc__iam__core_mobile_offline_records'),
    ('drop_20261119_lc__iam__core_notification_templates'),
    ('drop_20261119_lc__iam__core_notifications'),
    ('drop_20261119_lc__iam__core_plugin_categories'),
    ('drop_20261119_lc__iam__core_plugin_instances'),
    ('drop_20261119_lc__iam__core_plugin_permissions'),
    ('drop_20261119_lc__iam__core_plugin_pricing'),
    ('drop_20261119_lc__iam__core_plugin_reviews'),
    ('drop_20261119_lc__iam__core_plugin_versions'),
    ('drop_20261119_lc__iam__core_plugins'),
    ('drop_20261119_lc__iam__core_subscriptions'),
    ('drop_20261119_lc__iam__core_tenant_modules'),
    ('drop_20261119_lc__iam__core_tenant_settings'),
    ('drop_20261119_lc__iam__core_tenant_usage'),
    ('drop_20261119_lc__iam__core_tenant_users'),
    ('drop_20261119_lc__iam__core_usage_records'),
    ('drop_20261119_lc__iam__core_workflow_instances'),
    ('drop_20261119_lc__iam__core_workflow_tasks'),
    ('drop_20261119_lc__iam__core_workflows'),
    ('drop_20261119_lc__iam__crm_dashboard_snapshots'),
    ('drop_20261119_lc__iam__data_permissions'),
    ('drop_20261119_lc__iam__dynamic_data'),
    ('drop_20261119_lc__iam__ehs_dashboard_snapshots'),
    ('drop_20261119_lc__iam__hrm_dashboard_snapshots'),
    ('drop_20261119_lc__iam__lims_dashboard_snapshots'),
    ('drop_20261119_lc__iam__password_reset_tokens'),
    ('drop_20261119_lc__iam__pdm_dashboard_snapshots'),
    ('drop_20261119_lc__iam__permission_audit_logs'),
    ('drop_20261119_lc__iam__permission_templates'),
    ('drop_20261119_lc__iam__refresh_tokens'),
    ('drop_20261119_lc__iam__schema_registry'),
    ('drop_20261119_lc__iam__sessions'),
    ('drop_20261119_lc__iam__tenant_users'),
    ('drop_20261119_lc__iam__user_access_logs'),
    ('drop_20261119_lc__iam__user_roles'),
    ('drop_20261119_lc__iam__wms_dashboard_snapshots'),
    ('drop_20261119_lc__plugin_erp__accounting_subjects'),
    ('drop_20261119_lc__plugin_finance__difference_adjustments'),
    ('drop_20261119_lc__plugin_finance__reconciliation_item_snapshots'),
    ('drop_20261119_lc__plugin_finance__reconciliation_settl2d6c724b'),
    ('drop_20261119_lc__plugin_finance__reconciliation_snapshots'),
    ('drop_20261119_lc__plugin_finance__settlement_snapshots'),
    ('drop_20261119_lc__plugin_finance__source_amount_snapshots'),
    ('drop_20261119_lc__plugin_mes__audit_logs'),
    ('drop_20261119_lc__plugin_wms__purchase_order_snapshots'),
    ('drop_20261119_lc__unified_core__documents')
  ) AS x(tbl)
  WHERE to_regclass(format('archive.%I', x.tbl)) IS NOT NULL;
  IF n_arc <> 108 THEN
    RAISE EXCEPTION 'post-check failed: expected 108 archive tables, found %', n_arc;
  END IF;

  SELECT count(*) INTO n_manifest FROM archive._drop_manifest
  WHERE migration_version = '20261119180000' AND batch = 'legacy-copy-20261119';
  IF n_manifest <> 108 THEN
    RAISE EXCEPTION 'post-check failed: expected 108 manifest rows, found %', n_manifest;
  END IF;

  RAISE NOTICE 'legacy-copy drop complete: 108 tables dropped, 108 archived';
END
$post$;
