-- 20261020000021_rls_tenant_policy_batch_schema_fix.sql
-- 补偿修复 M2：20261015000075_rls_tenant_policy_batch.sql 的表前缀缺陷。
-- 075 对 public.pdm_* / public.mes_qms_sync / public.erp_* / public.notification_channels
-- 等执行 ENABLE RLS / CREATE POLICY / FORCE RLS，但这些表实际位于 pdm. / integration. /
-- communication. schema，干净库重放时 ALTER TABLE public.<x> 目标不存在，整批失败。
-- 本迁移不修改 075 原文件；逐表核对 migrations 中的真实建表 schema 后，用正确前缀幂等
-- 施加同一套 tenant_isolation_<table> 策略（策略已存在则 ALTER POLICY 对齐，不重复创建）。
-- 确在 public 的 3 表（pdm_materials / pdm_change_notices / pdm_products，由
-- 20261007000006_rebuild_orphan_tables 在 public 重建）保留 public 前缀，与 075 一致。
-- 无数据断言、不检查 NULL tenant_id；表缺失或无 tenant_id 列时跳过，整批可重复执行。

DO $$
DECLARE
  t text;
  sch text;
  tbl text;
  pol text;
  exists_pol boolean;
  ctype text;
  nil_uuid constant text := '00000000-0000-0000-0000-000000000000';
  pol_sql text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
'core.ai_conversations',
'public.search_entity_projections',
'wms.alerts',
'ehs.qa_ehs_investigations',
'ehs.qa_ehs_treatments',
'ehs.qa_ehs_treatment_actions',
'ehs.qa_ehs_reviews',
'ehs.qa_ehs_incident_actions',
'master_data.mdm_ai_suggestions',
'master_data.mdm_ai_models',
'master_data.mdm_match_rules',
'master_data.mdm_match_results',
'master_data.mdm_classification_models',
'master_data.mdm_classification_results',
'master_data.mdm_classifier_rules',
'public.pdm_materials',
'pdm.pdm_bom_items',
'pdm.pdm_boms',
'pdm.pdm_configurations',
'integration.mes_qms_sync',
'integration.erp_connections',
'integration.erp_mappings',
'integration.external_erp_sync_logs',
'communication.notification_channels',
'public.pdm_change_notices',
'pdm.pdm_document_versions',
'pdm.pdm_documents',
'pdm.pdm_production_batches',
'pdm.pdm_production_formulas',
'pdm.pdm_production_processes',
'pdm.pdm_production_steps',
'public.pdm_products',
'pdm.pdm_project_members',
'pdm.pdm_project_phases',
'pdm.pdm_projects',
'pdm.pdm_versions',
'pdm.pdm_workflow_instances',
'pdm.pdm_workflows'
  ] LOOP
    sch := split_part(t, '.', 1);
    tbl := split_part(t, '.', 2);
    -- 表不存在（环境差异/未建骨架）则跳过，不中断整批
    IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', t;
      CONTINUE;
    END IF;
    EXECUTE format('SELECT data_type FROM information_schema.columns WHERE table_schema = %L AND table_name = %L AND column_name = ''tenant_id''', sch, tbl) INTO ctype;
    IF ctype IS NULL THEN
      RAISE NOTICE 'skip (no tenant_id column): %', t;
      CONTINUE;
    END IF;
    pol := 'tenant_isolation_' || tbl;
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', sch, tbl);
    IF ctype = 'uuid' THEN
      pol_sql := format('tenant_id = NULLIF(current_setting(''app.tenant_id''), '''')::UUID OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L', nil_uuid);
    ELSE
      pol_sql := format('tenant_id = NULLIF(current_setting(''app.tenant_id''), '''') OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L', nil_uuid);
    END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = %L AND tablename = %L AND policyname = %L)', sch, tbl, pol) INTO exists_pol;
    IF exists_pol THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pol, sch, tbl, pol_sql);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)', pol, sch, tbl, pol_sql);
    END IF;
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', sch, tbl);
    RAISE NOTICE 'rls enabled: %', t;
  END LOOP;
END $$;
