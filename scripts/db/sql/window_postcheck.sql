-- 窗口第四段收尾：发布 + 收紧后的统一核对（只读）
-- 用法：psql "$DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/window_postcheck.sql
-- 断言：字典 77/397、7 张表目标脏行归零、每表唯一严格策略、FORCE RLS 开启。

\set ON_ERROR_STOP on
SET app.rls_system = 'on';

DO $$
DECLARE
  n int;
  legacy_t int;
  legacy_i int;
BEGIN
  SELECT count(*) INTO n FROM public.core_dict_types WHERE deleted_at IS NULL;
  IF n <> 77 THEN
    RAISE EXCEPTION 'POSTCHECK 失败：字典类型数 %（期望 77）', n;
  END IF;

  SELECT count(*) INTO n FROM public.core_dict_items WHERE deleted_at IS NULL;
  IF n <> 397 THEN
    RAISE EXCEPTION 'POSTCHECK 失败：字典项数 %（期望 397）', n;
  END IF;

  SELECT count(*) INTO legacy_t FROM public.core_dict_types
   WHERE deleted_at IS NULL AND code IN ('department_type','education','marital_status','position_level');
  SELECT count(*) INTO legacy_i FROM public.core_dict_items i
   JOIN public.core_dict_types t ON t.id = i.dict_type_id
   WHERE i.deleted_at IS NULL AND t.code IN ('department_type','education','marital_status','position_level');
  IF legacy_t <> 4 OR legacy_i <> 17 THEN
    RAISE EXCEPTION 'POSTCHECK 失败：legacy 类型/项 %/%（期望 4/17）', legacy_t, legacy_i;
  END IF;
END $$;

SELECT 'POSTCHECK|dict_types|' || count(*) FROM public.core_dict_types WHERE deleted_at IS NULL;
SELECT 'POSTCHECK|dict_items|' || count(*) FROM public.core_dict_items WHERE deleted_at IS NULL;
SELECT 'POSTCHECK|dict_legacy_types|' || count(*) FROM public.core_dict_types
 WHERE deleted_at IS NULL AND code IN ('department_type','education','marital_status','position_level');
SELECT 'POSTCHECK|dict_legacy_items|' || count(*) FROM public.core_dict_items i
 JOIN public.core_dict_types t ON t.id = i.dict_type_id
 WHERE i.deleted_at IS NULL AND t.code IN ('department_type','education','marital_status','position_level');

SELECT 'POSTCHECK|refs_target|' || count(*) FROM crm.crm_master_data_refs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND local_entity_id IS NULL;
SELECT 'POSTCHECK|returns_target|' || count(*) FROM crm.returns
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND customer_id IS NULL
   AND created_by = 'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21';
SELECT 'POSTCHECK|risks_target|' || count(*) FROM ehs.qa_ehs_risks
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND title = '未命名风险' AND created_by IS NULL;
SELECT 'POSTCHECK|monitors_target|' || count(*) FROM ehs.qa_ehs_environment_monitors
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
   AND name = '未命名监测点' AND COALESCE(created_by, '') = '';

SELECT 'POSTCHECK|rfm_tenant|' || COALESCE(tenant_id::text, '<null>') || '|' || count(*)
  FROM crm.rfm_results GROUP BY tenant_id ORDER BY tenant_id NULLS FIRST;
SELECT 'POSTCHECK|audit_tenant|' || COALESCE(tenant_id::text, '<null>') || '|' || count(*)
  FROM public.audit_logs GROUP BY tenant_id ORDER BY tenant_id NULLS FIRST;
SELECT 'POSTCHECK|audit_orphan_marked|' || count(*) FROM public.audit_logs
 WHERE request_details ? '_orphan';
SELECT 'POSTCHECK|customers_zero_softdeleted|' || count(*) FROM crm.customers
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND deleted_at IS NOT NULL;
SELECT 'POSTCHECK|customers_total|' || count(*) FROM crm.customers;

-- 策略：每表恰好 1 条，且表达式只认 app.rls_system 或 app.tenant_id
DO $$
DECLARE
  t record;
  n int;
  qual text;
  rel record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('public', 'audit_logs'), ('public', 'core_dict_types'), ('public', 'core_dict_items'),
      ('crm', 'rfm_results'), ('crm', 'crm_master_data_refs'), ('crm', 'returns'),
      ('crm', 'customers'), ('ehs', 'qa_ehs_risks'), ('ehs', 'qa_ehs_environment_monitors')
    ) AS v(schema_name, table_name)
  LOOP
    SELECT count(*) INTO n FROM pg_policies
     WHERE schemaname = t.schema_name AND tablename = t.table_name;
    IF n <> 1 THEN
      RAISE EXCEPTION 'POSTCHECK 失败：%.% 策略数 %（期望 1）',
                      t.schema_name, t.table_name, n;
    END IF;

    SELECT pg_get_expr(polqual, polrelid) INTO qual
      FROM pg_policy
     WHERE polrelid = to_regclass(format('%I.%I', t.schema_name, t.table_name));
    IF qual IS NULL
       OR position('app.rls_system' in qual) = 0
       OR position('app.tenant_id' in qual) = 0
       OR position('00000000-0000-0000-0000-000000000000' in qual) > 0 THEN
      RAISE EXCEPTION 'POSTCHECK 失败：%.% 策略仍含旧放行分支或缺少系统通道: %',
                      t.schema_name, t.table_name, COALESCE(qual, '<null>');
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rel
      FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = t.schema_name AND c.relname = t.table_name;
    IF NOT rel.relrowsecurity OR NOT rel.relforcerowsecurity THEN
      RAISE EXCEPTION 'POSTCHECK 失败：%.% ENABLE/FORCE RLS 未同时开启',
                      t.schema_name, t.table_name;
    END IF;

    RAISE NOTICE 'POSTCHECK|policy_ok|%.%', t.schema_name, t.table_name;
  END LOOP;
END $$;
