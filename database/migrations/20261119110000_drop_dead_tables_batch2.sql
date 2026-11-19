-- 20261119110000_drop_dead_tables_batch2
-- 批次：batch-2，共 187 张表
-- 依据：docs/quality/table-disposition-2026-11-19.md 与 docs/quality/dead-table-disposal-plan-2026-11-19.md
-- 例外：bi.audit_logs 已移出本批（187 而非 188）。原因：svc/analytics 的 schema-defense
--       启动即 CREATE TABLE IF NOT EXISTS bi.audit_logs 并补列，删除会被重建，且重建后由
--       harden_new_tenant_tables 补一条口径不同的 tenant_isolation_audit_logs，与 20261119141000
--       守卫冲突。登记见 database/migration-exemptions.json（B20261119-batch2-bi-audit-logs-keep）。
-- 安全闸门：必须显式设置 app.drop_dead_tables_gate=batch-2，否则整条迁移中止（外审清单未签不执行）。
-- 归档：archive.<archive_table>（结构 + 数据），元数据在 archive._drop_manifest / _rls_policy_snapshot / _fk_snapshot / _view_snapshot
-- 保留期：180 天；归档校验失败即 RAISE EXCEPTION，DROP 不执行。
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

DO $migration$
DECLARE
  r record; fkrec record; viewrec record;
  arc text; n_src bigint; n_arc bigint; n_ins bigint;
  v_rls boolean; v_force boolean;
BEGIN
  IF coalesce(current_setting('app.drop_dead_tables_gate', true), '') <> 'batch-2' THEN
    RAISE EXCEPTION 'gate closed: set app.drop_dead_tables_gate=batch-2';
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('bi', 'report_execution_records'),
    ('ehs', 'audit_logs'),
    ('ehs', 'drill_records'),
    ('ehs', 'emergency_plans'),
    ('ehs', 'environmental_alerts'),
    ('ehs', 'environmental_data'),
    ('ehs', 'health_checkups'),
    ('ehs', 'monitoring_points'),
    ('ehs', 'qa_ehs_accident_investigations'),
    ('ehs', 'qa_ehs_accident_reviews'),
    ('ehs', 'qa_ehs_accident_treatments'),
    ('ehs', 'qa_ehs_compliance_items'),
    ('ehs', 'qa_ehs_detection_records'),
    ('ehs', 'qa_ehs_environment'),
    ('ehs', 'qa_ehs_health_abnormalities'),
    ('ehs', 'qa_ehs_health_trainings'),
    ('ehs', 'qa_ehs_material_stocks'),
    ('ehs', 'qa_ehs_protection_measures'),
    ('ehs', 'risk_assessments'),
    ('ehs', 'risk_controls'),
    ('ehs', 'safety_incidents'),
    ('ehs', 'vaccination_records'),
    ('erp', 'expenses'),
    ('erp', 'voucher_items'),
    ('erp', 'vouchers'),
    ('finance', 'core_finance_approval_workflows'),
    ('finance', 'reconciliation_orders'),
    ('finance', 'settlement_center_dashboards'),
    ('gis', 'audit_log'),
    ('gis', 'audit_logs'),
    ('gis', 'geofence_alerts'),
    ('hrm', 'hrm_master_data_refs'),
    ('hrm', 'payroll_records'),
    ('hrm', 'performance_records'),
    ('hrm', 'recruitment_applications'),
    ('hrm', 'recruitment_records'),
    ('hrm', 'training_participants'),
    ('lims', 'ai_analyses'),
    ('lims', 'audit_logs'),
    ('lims', 'document_relations'),
    ('lims', 'lab_ledger'),
    ('lims', 'qa_lab_inspection_reports'),
    ('lims', 'qa_lab_reagent_alerts'),
    ('lims', 'qa_lab_reagent_history'),
    ('lims', 'qa_lab_sample_lifecycle'),
    ('lims', 'reagent_usages'),
    ('lims', 'reagents'),
    ('master_data', 'core_master_data_change_log'),
    ('master_data', 'core_master_data_event_outbox'),
    ('master_data', 'core_master_data_refs'),
    ('master_data', 'core_mdm_approvals'),
    ('master_data', 'core_mdm_reconciliation_log'),
    ('master_data', 'dynamic_data'),
    ('master_data', 'schema_registry'),
    ('public', 'alert_rules'),
    ('public', 'alerts'),
    ('public', 'analytics_sync_records'),
    ('public', 'conversion_executions'),
    ('public', 'conversion_rules'),
    ('public', 'core_faqs'),
    ('public', 'core_file_folders'),
    ('public', 'core_finance_account_opening_balances'),
    ('public', 'core_finance_approval_workflows'),
    ('public', 'core_finance_aux_accounts'),
    ('public', 'core_finance_aux_balances'),
    ('public', 'core_finance_ledger'),
    ('public', 'core_finance_reconciliation_items'),
    ('public', 'core_finance_reconciliation_sessions'),
    ('public', 'core_finance_voucher_entries'),
    ('public', 'core_finance_voucher_lines'),
    ('public', 'core_finance_voucher_templates'),
    ('public', 'core_finance_vouchers'),
    ('public', 'core_guide_lessons'),
    ('public', 'core_guide_progress'),
    ('public', 'core_guides'),
    ('public', 'core_inter_module_sync'),
    ('public', 'core_master_data_event_outbox'),
    ('public', 'core_mdm_reconciliation_log'),
    ('public', 'core_plugin_categories'),
    ('public', 'core_plugin_instances'),
    ('public', 'core_plugin_navigation'),
    ('public', 'core_plugin_permissions'),
    ('public', 'core_plugin_reviews'),
    ('public', 'core_plugin_versions'),
    ('public', 'core_plugins'),
    ('public', 'core_ticket_sla_escalations'),
    ('public', 'core_ticket_sla_policies'),
    ('public', 'cqrs_events'),
    ('public', 'crm_dashboard_snapshots'),
    ('public', 'ehs_dashboard_snapshots'),
    ('public', 'equipment'),
    ('public', 'equipment_inspections'),
    ('public', 'equipment_maintenance_records'),
    ('public', 'finance_voucher_templates'),
    ('public', 'financial_reports'),
    ('public', 'hrm_dashboard_snapshots'),
    ('public', 'lims_dashboard_snapshots'),
    ('public', 'material_boms'),
    ('public', 'material_categories'),
    ('public', 'material_issue_items'),
    ('public', 'material_issues'),
    ('public', 'material_requirement_items'),
    ('public', 'material_requirements'),
    ('public', 'material_return_items'),
    ('public', 'material_returns'),
    ('public', 'meeting_bookings'),
    ('public', 'meeting_rooms'),
    ('public', 'navigation_menu'),
    ('public', 'pdm_change_notices'),
    ('public', 'pdm_dashboard_snapshots'),
    ('public', 'pdm_materials'),
    ('public', 'pdm_products'),
    ('public', 'pinned_apps'),
    ('public', 'pm_master_data_refs'),
    ('public', 'process_flow_steps'),
    ('public', 'process_flows'),
    ('public', 'qa_ehs_accident_investigations'),
    ('public', 'qa_ehs_accident_reviews'),
    ('public', 'qa_ehs_accident_treatments'),
    ('public', 'qa_ehs_accidents'),
    ('public', 'qa_ehs_compliance_items'),
    ('public', 'qa_ehs_contraindications'),
    ('public', 'qa_ehs_detection_records'),
    ('public', 'qa_ehs_emergency_plans'),
    ('public', 'qa_ehs_environment'),
    ('public', 'qa_ehs_hazard_rectifications'),
    ('public', 'qa_ehs_hazard_verifications'),
    ('public', 'qa_ehs_hazardous_materials'),
    ('public', 'qa_ehs_health_abnormalities'),
    ('public', 'qa_ehs_health_exam_plans'),
    ('public', 'qa_ehs_health_exam_records'),
    ('public', 'qa_ehs_health_trainings'),
    ('public', 'qa_ehs_inspection_items'),
    ('public', 'qa_ehs_inspection_plans'),
    ('public', 'qa_ehs_material_stocks'),
    ('public', 'qa_ehs_protection_measures'),
    ('public', 'qa_ehs_risks'),
    ('public', 'qa_ehs_stock_records'),
    ('public', 'qa_ehs_sync_records'),
    ('public', 'qa_ehs_trainings'),
    ('public', 'qa_lab_calibration_records'),
    ('public', 'qa_lab_reagent_alerts'),
    ('public', 'qa_lab_reagent_history'),
    ('public', 'qa_lab_reagents'),
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
    ('public', 'qa_lims_uncertainty_sources'),
    ('public', 'quality_inspections'),
    ('public', 'quality_patrol_items'),
    ('public', 'quality_patrols'),
    ('public', 'quality_standard_values'),
    ('public', 'quality_standards'),
    ('public', 'refresh_tokens'),
    ('public', 'tenant_permissions'),
    ('public', 'tenants'),
    ('public', 'ticket_automation_rules'),
    ('public', 'ticket_knowledge_articles'),
    ('public', 'todos'),
    ('public', 'user_settings'),
    ('public', 'vehicle_requests'),
    ('public', 'vehicles'),
    ('public', 'wms_dashboard_snapshots'),
    ('qms', 'audit_logs'),
    ('qms', 'corrective_actions'),
    ('qms', 'dashboard_metrics'),
    ('qms', 'inspection_items'),
    ('qms', 'quality_inspections'),
    ('qms', 'quality_issues'),
    ('scm', 'materials'),
    ('scm', 'scm_master_data_refs')
  ) AS x(sch, tbl)
  LOOP
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing %.%', r.sch, r.tbl;
      CONTINUE;
    END IF;
    arc := 'drop_20261119_b2__' || r.sch || '__' || r.tbl;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO v_rls, v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = r.sch AND c.relname = r.tbl;

    INSERT INTO archive._rls_policy_snapshot
      (migration_version, batch, schema_name, table_name, polname, permissive, cmd, roles, qual, with_check)
    SELECT '20261119110000', 'batch-2', r.sch, r.tbl, p.polname,
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
    SELECT '20261119110000', 'batch-2', k.conname, sn.nspname, sc.relname, tn.nspname, tc.relname, pg_get_constraintdef(k.oid)
    FROM pg_constraint k
    JOIN pg_class sc ON sc.oid = k.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = k.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    WHERE k.contype = 'f' AND tn.nspname = r.sch AND tc.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._view_snapshot
      (migration_version, batch, view_schema, view_name, object_kind, view_def)
    SELECT DISTINCT '20261119110000', 'batch-2', vn.nspname, v.relname, v.relkind::text, pg_get_viewdef(v.oid, true)
    FROM pg_depend d
    JOIN pg_rewrite rw ON rw.oid = d.objid
    JOIN pg_class v ON v.oid = rw.ev_class JOIN pg_namespace vn ON vn.oid = v.relnamespace
    JOIN pg_class t ON t.oid = d.refobjid JOIN pg_namespace tn ON tn.oid = t.relnamespace
    WHERE v.relkind IN ('v','m') AND v.oid <> t.oid AND tn.nspname = r.sch AND t.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._column_defaults
      (migration_version, batch, schema_name, table_name, column_name, default_expr)
    SELECT '20261119110000', 'batch-2', r.sch, r.tbl, a.attname, pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE n.nspname = r.sch AND c.relname = r.tbl
    ON CONFLICT DO NOTHING;

    INSERT INTO archive._sequence_snapshot
      (migration_version, batch, seq_schema, seq_name, owned_schema, owned_table, owned_column,
       data_type, start_value, increment_by, min_value, max_value, cache_size, is_cycle, last_value)
    SELECT '20261119110000', 'batch-2', sn.nspname, s.relname, tn.nspname, t.relname, a.attname,
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
      RAISE EXCEPTION 'archive table archive.% already exists: refusing to re-run (clean up manually or use a new batch)', arc;
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
    VALUES ('20261119110000', 'batch-2', r.sch, r.tbl, arc, n_src, v_rls, v_force, now() + interval '180 days')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 先删依赖视图，再删入向外键，最后删表
  FOR viewrec IN SELECT DISTINCT view_schema, view_name, object_kind FROM archive._view_snapshot WHERE batch = 'batch-2'
  LOOP
    IF viewrec.object_kind = 'm' THEN
      EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I', viewrec.view_schema, viewrec.view_name);
    ELSE
      EXECUTE format('DROP VIEW IF EXISTS %I.%I', viewrec.view_schema, viewrec.view_name);
    END IF;
  END LOOP;

  FOR fkrec IN SELECT * FROM archive._fk_snapshot WHERE batch = 'batch-2'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I.%I DROP CONSTRAINT IF EXISTS %I', fkrec.src_schema, fkrec.src_table, fkrec.conname);
  END LOOP;
END
$migration$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__bi__*（迁移内先归档，保留 180 天）
DO $drop_bi$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('report_execution_records')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'bi', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing bi.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS bi.%I', r.tbl);
  END LOOP;
END
$drop_bi$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__ehs__*（迁移内先归档，保留 180 天）
DO $drop_ehs$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_logs'),
    ('drill_records'),
    ('emergency_plans'),
    ('environmental_alerts'),
    ('environmental_data'),
    ('health_checkups'),
    ('monitoring_points'),
    ('qa_ehs_accident_investigations'),
    ('qa_ehs_accident_reviews'),
    ('qa_ehs_accident_treatments'),
    ('qa_ehs_compliance_items'),
    ('qa_ehs_detection_records'),
    ('qa_ehs_environment'),
    ('qa_ehs_health_abnormalities'),
    ('qa_ehs_health_trainings'),
    ('qa_ehs_material_stocks'),
    ('qa_ehs_protection_measures'),
    ('risk_assessments'),
    ('risk_controls'),
    ('safety_incidents'),
    ('vaccination_records')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'ehs', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing ehs.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS ehs.%I', r.tbl);
  END LOOP;
END
$drop_ehs$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__erp__*（迁移内先归档，保留 180 天）
DO $drop_erp$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('expenses'),
    ('voucher_items'),
    ('vouchers')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'erp', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing erp.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS erp.%I', r.tbl);
  END LOOP;
END
$drop_erp$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__finance__*（迁移内先归档，保留 180 天）
DO $drop_finance$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_finance_approval_workflows'),
    ('reconciliation_orders'),
    ('settlement_center_dashboards')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'finance', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing finance.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS finance.%I', r.tbl);
  END LOOP;
END
$drop_finance$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__gis__*（迁移内先归档，保留 180 天）
DO $drop_gis$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_log'),
    ('audit_logs'),
    ('geofence_alerts')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'gis', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing gis.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS gis.%I', r.tbl);
  END LOOP;
END
$drop_gis$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__hrm__*（迁移内先归档，保留 180 天）
DO $drop_hrm$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('hrm_master_data_refs'),
    ('payroll_records'),
    ('performance_records'),
    ('recruitment_applications'),
    ('recruitment_records'),
    ('training_participants')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'hrm', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing hrm.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS hrm.%I', r.tbl);
  END LOOP;
END
$drop_hrm$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__lims__*（迁移内先归档，保留 180 天）
DO $drop_lims$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('ai_analyses'),
    ('audit_logs'),
    ('document_relations'),
    ('lab_ledger'),
    ('qa_lab_inspection_reports'),
    ('qa_lab_reagent_alerts'),
    ('qa_lab_reagent_history'),
    ('qa_lab_sample_lifecycle'),
    ('reagent_usages'),
    ('reagents')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'lims', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing lims.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS lims.%I', r.tbl);
  END LOOP;
END
$drop_lims$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__master_data__*（迁移内先归档，保留 180 天）
DO $drop_master_data$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('core_master_data_change_log'),
    ('core_master_data_event_outbox'),
    ('core_master_data_refs'),
    ('core_mdm_approvals'),
    ('core_mdm_reconciliation_log'),
    ('dynamic_data'),
    ('schema_registry')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'master_data', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing master_data.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS master_data.%I', r.tbl);
  END LOOP;
END
$drop_master_data$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__public__*（迁移内先归档，保留 180 天）
DO $drop_public$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('alert_rules'),
    ('alerts'),
    ('analytics_sync_records'),
    ('conversion_executions'),
    ('conversion_rules'),
    ('core_faqs'),
    ('core_file_folders'),
    ('core_finance_account_opening_balances'),
    ('core_finance_approval_workflows'),
    ('core_finance_aux_accounts'),
    ('core_finance_aux_balances'),
    ('core_finance_ledger'),
    ('core_finance_reconciliation_items'),
    ('core_finance_reconciliation_sessions'),
    ('core_finance_voucher_entries'),
    ('core_finance_voucher_lines'),
    ('core_finance_voucher_templates'),
    ('core_finance_vouchers'),
    ('core_guide_lessons'),
    ('core_guide_progress'),
    ('core_guides'),
    ('core_inter_module_sync'),
    ('core_master_data_event_outbox'),
    ('core_mdm_reconciliation_log'),
    ('core_plugin_categories'),
    ('core_plugin_instances'),
    ('core_plugin_navigation'),
    ('core_plugin_permissions'),
    ('core_plugin_reviews'),
    ('core_plugin_versions'),
    ('core_plugins'),
    ('core_ticket_sla_escalations'),
    ('core_ticket_sla_policies'),
    ('cqrs_events'),
    ('crm_dashboard_snapshots'),
    ('ehs_dashboard_snapshots'),
    ('equipment'),
    ('equipment_inspections'),
    ('equipment_maintenance_records'),
    ('finance_voucher_templates'),
    ('financial_reports'),
    ('hrm_dashboard_snapshots'),
    ('lims_dashboard_snapshots'),
    ('material_boms'),
    ('material_categories'),
    ('material_issue_items'),
    ('material_issues'),
    ('material_requirement_items'),
    ('material_requirements'),
    ('material_return_items'),
    ('material_returns'),
    ('meeting_bookings'),
    ('meeting_rooms'),
    ('navigation_menu'),
    ('pdm_change_notices'),
    ('pdm_dashboard_snapshots'),
    ('pdm_materials'),
    ('pdm_products'),
    ('pinned_apps'),
    ('pm_master_data_refs'),
    ('process_flow_steps'),
    ('process_flows'),
    ('qa_ehs_accident_investigations'),
    ('qa_ehs_accident_reviews'),
    ('qa_ehs_accident_treatments'),
    ('qa_ehs_accidents'),
    ('qa_ehs_compliance_items'),
    ('qa_ehs_contraindications'),
    ('qa_ehs_detection_records'),
    ('qa_ehs_emergency_plans'),
    ('qa_ehs_environment'),
    ('qa_ehs_hazard_rectifications'),
    ('qa_ehs_hazard_verifications'),
    ('qa_ehs_hazardous_materials'),
    ('qa_ehs_health_abnormalities'),
    ('qa_ehs_health_exam_plans'),
    ('qa_ehs_health_exam_records'),
    ('qa_ehs_health_trainings'),
    ('qa_ehs_inspection_items'),
    ('qa_ehs_inspection_plans'),
    ('qa_ehs_material_stocks'),
    ('qa_ehs_protection_measures'),
    ('qa_ehs_risks'),
    ('qa_ehs_stock_records'),
    ('qa_ehs_sync_records'),
    ('qa_ehs_trainings'),
    ('qa_lab_calibration_records'),
    ('qa_lab_reagent_alerts'),
    ('qa_lab_reagent_history'),
    ('qa_lab_reagents'),
    ('qa_lims_audit_logs'),
    ('qa_lims_barcode_scan_records'),
    ('qa_lims_collection_tasks'),
    ('qa_lims_instrument_data'),
    ('qa_lims_method_categories'),
    ('qa_lims_method_validations'),
    ('qa_lims_method_versions'),
    ('qa_lims_parse_rules'),
    ('qa_lims_pt_corrective_actions'),
    ('qa_lims_pt_evaluations'),
    ('qa_lims_pt_plans'),
    ('qa_lims_pt_results'),
    ('qa_lims_pt_samples'),
    ('qa_lims_rfid_tags'),
    ('qa_lims_sample_barcodes'),
    ('qa_lims_sync_records'),
    ('qa_lims_test_methods'),
    ('qa_lims_uncertainty_components'),
    ('qa_lims_uncertainty_projects'),
    ('qa_lims_uncertainty_sources'),
    ('quality_inspections'),
    ('quality_patrol_items'),
    ('quality_patrols'),
    ('quality_standard_values'),
    ('quality_standards'),
    ('refresh_tokens'),
    ('tenant_permissions'),
    ('tenants'),
    ('ticket_automation_rules'),
    ('ticket_knowledge_articles'),
    ('todos'),
    ('user_settings'),
    ('vehicle_requests'),
    ('vehicles'),
    ('wms_dashboard_snapshots')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'public', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing public.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS public.%I', r.tbl);
  END LOOP;
END
$drop_public$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__qms__*（迁移内先归档，保留 180 天）
DO $drop_qms$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('audit_logs'),
    ('corrective_actions'),
    ('dashboard_metrics'),
    ('inspection_items'),
    ('quality_inspections'),
    ('quality_issues')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'qms', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing qms.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS qms.%I', r.tbl);
  END LOOP;
END
$drop_qms$;

-- 以下 DROP 按 schema 分组，schema 名在语句里是字面量、仅表名参数化，便于静态审计确认落点。
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: batch-2 死表清理：生产 0 行、仓库零引用、已在本迁移内先归档到 archive（见 docs/quality/dead-table-disposal-plan-2026-11-19.md）
-- destructive-owner: 平台组/DBA
-- destructive-ticket: DEAD-TABLE-20261119
-- destructive-expires: 2027-05-10
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__scm__*（迁移内先归档，保留 180 天）
DO $drop_scm$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('materials'),
    ('scm_master_data_refs')
  ) AS x(tbl)
  LOOP
    IF to_regclass(format('%I.%I', 'scm', r.tbl)) IS NULL THEN
      RAISE NOTICE 'skip missing scm.%', r.tbl;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TABLE IF EXISTS scm.%I', r.tbl);
  END LOOP;
END
$drop_scm$;