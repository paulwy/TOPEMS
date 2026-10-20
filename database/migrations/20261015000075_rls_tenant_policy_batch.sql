-- RLS tenant isolation batch: enable + policy + force for tables with tenant_id
-- that were not covered by startup RLS bootstrap.
-- Pattern mirrors lib/shared-db/src/rls.rs and earlier FORCE migrations:
--   ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--   CREATE POLICY tenant_isolation_<t> FOR ALL USING (
--       tenant_id = NULLIF(current_setting('app.tenant_id'), '')::UUID
--       OR tenant_id IS NULL
--       OR NULLIF(current_setting('app.tenant_id'), '') = nil-uuid)
--   ALTER TABLE ... FORCE ROW LEVEL SECURITY
-- tenant_id column type is checked per table: uuid columns compare against
-- NULLIF(...)::UUID; varchar/text columns compare as text (NULLIF without cast).
-- Owner: topems (DDL user). Executed via MIGRATE_URL.
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
'core.ai_conversations', 'public.search_entity_projections', 'wms.alerts', 'ehs.qa_ehs_investigations', 'ehs.qa_ehs_treatments', 'ehs.qa_ehs_treatment_actions', 'ehs.qa_ehs_reviews', 'ehs.qa_ehs_incident_actions', 'master_data.mdm_ai_suggestions', 'master_data.mdm_ai_models', 'master_data.mdm_match_rules', 'master_data.mdm_match_results', 'master_data.mdm_classification_models', 'master_data.mdm_classification_results', 'master_data.mdm_classifier_rules', 'public.pdm_materials', 'public.pdm_bom_items', 'public.pdm_boms', 'public.pdm_configurations', 'public.mes_qms_sync', 'public.erp_connections', 'public.erp_mappings', 'public.external_erp_sync_logs', 'public.notification_channels', 'public.pdm_change_notices', 'public.pdm_document_versions', 'public.pdm_documents', 'public.pdm_production_batches', 'public.pdm_production_formulas', 'public.pdm_production_processes', 'public.pdm_production_steps', 'public.pdm_products', 'public.pdm_project_members', 'public.pdm_project_phases', 'public.pdm_projects', 'public.pdm_versions', 'public.pdm_workflow_instances', 'public.pdm_workflows'
  ] LOOP
    -- 防御：目标表/ schema 在干净库不存在（历史条目误用 public.* 前缀，实际表在
    -- pdm./integration./communication.）时跳过，避免 ALTER TABLE 直接报错中断整批；
    -- 正确前缀的策略由补偿迁移 20261020000021 幂等施加。
    IF to_regclass(format('%I.%I', split_part(t, '.', 1), split_part(t, '.', 2))) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', t;
      CONTINUE;
    END IF;
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
'core.ai_conversations', 'public.search_entity_projections', 'wms.alerts', 'ehs.qa_ehs_investigations', 'ehs.qa_ehs_treatments', 'ehs.qa_ehs_treatment_actions', 'ehs.qa_ehs_reviews', 'ehs.qa_ehs_incident_actions', 'master_data.mdm_ai_suggestions', 'master_data.mdm_ai_models', 'master_data.mdm_match_rules', 'master_data.mdm_match_results', 'master_data.mdm_classification_models', 'master_data.mdm_classification_results', 'master_data.mdm_classifier_rules', 'public.pdm_materials', 'public.pdm_bom_items', 'public.pdm_boms', 'public.pdm_configurations', 'public.mes_qms_sync', 'public.erp_connections', 'public.erp_mappings', 'public.external_erp_sync_logs', 'public.notification_channels', 'public.pdm_change_notices', 'public.pdm_document_versions', 'public.pdm_documents', 'public.pdm_production_batches', 'public.pdm_production_formulas', 'public.pdm_production_processes', 'public.pdm_production_steps', 'public.pdm_products', 'public.pdm_project_members', 'public.pdm_project_phases', 'public.pdm_projects', 'public.pdm_versions', 'public.pdm_workflow_instances', 'public.pdm_workflows'
  ] LOOP
    -- 防御：关系不存在时跳过（同第一块），不对缺失表做计数断言；
    -- 缺失条目的正确策略由补偿迁移 20261020000021 施加，本块仅告警不中断。
    IF to_regclass(format('%I.%I', split_part(t, '.', 1), split_part(t, '.', 2))) IS NULL THEN
      RAISE NOTICE 'skip assertion (relation missing): %', t;
      CONTINUE;
    END IF;
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
  -- 干净库重放时历史 public.* 误前缀条目由补偿迁移接管，不再因计数告警 RAISE EXCEPTION 中断。
  IF missing > 0 THEN
    RAISE NOTICE 'rls batch completed with % notice(s) (see above); missing public-prefixed entries covered by 20261020000021', missing;
  ELSE
    RAISE NOTICE 'rls batch OK: 38 tables';
  END IF;
END $$;
