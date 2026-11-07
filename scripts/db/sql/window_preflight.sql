-- 窗口前置检查（只读）
-- 用法：psql "$DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/window_preflight.sql
-- 输出：PREFLIGHT|key|value 行；任一断言失败立即退出（psql ON_ERROR_STOP=1）。

\set ON_ERROR_STOP on
SET app.rls_system = 'on';

DO $$
DECLARE
  t text;
  c text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.audit_logs', 'crm.rfm_results', 'crm.crm_master_data_refs',
    'crm.returns', 'crm.customers', 'ehs.qa_ehs_risks',
    'ehs.qa_ehs_environment_monitors', 'public.core_dict_types',
    'public.core_dict_items'
  ] LOOP
    IF to_regclass(t) IS NULL THEN
      RAISE EXCEPTION '前置检查失败：表不存在 %', t;
    END IF;
  END LOOP;

  -- 窗口 SQL 依赖的列必须存在；急停而不是“静默按 0 行处理”。
  FOREACH t IN ARRAY ARRAY['public.audit_logs', 'crm.rfm_results', 'crm.crm_master_data_refs',
                           'crm.returns', 'crm.customers', 'ehs.qa_ehs_risks',
                           'ehs.qa_ehs_environment_monitors'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = split_part(t, '.', 1)
         AND table_name = split_part(t, '.', 2)
         AND column_name = 'tenant_id'
    ) THEN
      RAISE EXCEPTION '前置检查失败：% 缺少 tenant_id 列', t;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'ehs' AND table_name = 'qa_ehs_risks' AND column_name = 'created_by'
  ) THEN
    RAISE EXCEPTION '前置检查失败：ehs.qa_ehs_risks 缺少 created_by 列（prod 应为 uuid；本地演练需先加 prod 形态 shim）';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'crm' AND table_name = 'returns' AND column_name = 'created_by'
  ) THEN
    RAISE EXCEPTION '前置检查失败：crm.returns 缺少 created_by 列';
  END IF;

  RAISE NOTICE 'PREFLIGHT|schema|OK';
END $$;

-- 现场重测（数量不写死；窗口执行记录表填写这些值）
SELECT 'PREFLIGHT|dict_types|' || count(*) FROM public.core_dict_types WHERE deleted_at IS NULL;
SELECT 'PREFLIGHT|dict_items|' || count(*) FROM public.core_dict_items WHERE deleted_at IS NULL;
SELECT 'PREFLIGHT|dict_legacy_types|' || count(*) FROM public.core_dict_types
 WHERE deleted_at IS NULL AND code IN ('department_type','education','marital_status','position_level');
SELECT 'PREFLIGHT|dict_legacy_items|' || count(*) FROM public.core_dict_items i
 JOIN public.core_dict_types t ON t.id = i.dict_type_id
 WHERE i.deleted_at IS NULL AND t.code IN ('department_type','education','marital_status','position_level');

SELECT 'PREFLIGHT|refs_target|' || count(*) FROM crm.crm_master_data_refs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL;
SELECT 'PREFLIGHT|refs_total|' || count(*) FROM crm.crm_master_data_refs;

SELECT 'PREFLIGHT|returns_target|' || count(*) FROM crm.returns
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND customer_id IS NULL
   AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';
SELECT 'PREFLIGHT|returns_total|' || count(*) FROM crm.returns;

SELECT 'PREFLIGHT|risks_target|' || count(*) FROM ehs.qa_ehs_risks
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND title = '未命名风险' AND created_by IS NULL;
SELECT 'PREFLIGHT|risks_total|' || count(*) FROM ehs.qa_ehs_risks;

SELECT 'PREFLIGHT|monitors_target|' || count(*) FROM ehs.qa_ehs_environment_monitors
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND name = '未命名监测点' AND COALESCE(created_by, '') = '';
SELECT 'PREFLIGHT|monitors_total|' || count(*) FROM ehs.qa_ehs_environment_monitors;

SELECT 'PREFLIGHT|customers_softdeleted_zero|' || count(*) FROM crm.customers
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND deleted_at IS NOT NULL;
SELECT 'PREFLIGHT|customers_total|' || count(*) FROM crm.customers;

SELECT 'PREFLIGHT|rfm_attributable|' || count(*) FROM crm.rfm_results r
 JOIN crm.customers c ON c.id = r.customer_id
 WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
   AND c.tenant_id IS NOT NULL
   AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';
SELECT 'PREFLIGHT|rfm_dirty|' || count(*) FROM crm.rfm_results
 WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';

SELECT 'PREFLIGHT|audit_attributable|' || count(*) FROM public.audit_logs a
 JOIN pm.projects p ON p.id = a.entity_id
 WHERE a.entity_type = 'project'
   AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
   AND p.tenant_id IS NOT NULL
   AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';
SELECT 'PREFLIGHT|audit_dirty|' || count(*) FROM public.audit_logs
 WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000';
SELECT 'PREFLIGHT|audit_total|' || count(*) FROM public.audit_logs;

-- B 组 orphan（与 §7 predicate 同口径；NULL 陷阱已避开）
SELECT 'PREFLIGHT|audit_b_orphan|' || count(*) FROM public.audit_logs a
 WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
   AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
   AND NOT (a.entity_type = 'project' AND a.entity_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM pm.projects p
                        WHERE p.id = a.entity_id
                          AND p.tenant_id IS NOT NULL
                          AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'));

SELECT 'PREFLIGHT|audit_synthetic_0099|' || count(*) FROM public.audit_logs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND entity_id = '00000000-0000-0000-0000-000000000099';

SELECT 'PREFLIGHT|active_tx|' || count(*) FROM pg_stat_activity
 WHERE datname = current_database() AND state <> 'idle' AND pid <> pg_backend_pid();
