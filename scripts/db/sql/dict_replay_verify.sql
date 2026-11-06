-- 字典回灌 6 组核对（prod 窗口 / 本地演练通用）
--
-- 用法：
--   psql "$DSN" -X -v ON_ERROR_STOP=1 \
--     -v expected_types=77 -v expected_items=397 \
--     -v expected_standard_types=73 -v expected_standard_items=380 \
--     -v expected_legacy_types=4 -v expected_legacy_items=17 \
--     -f scripts/db/sql/dict_replay_verify.sql
--
-- 断言失败即 exit 非 0（ON_ERROR_STOP + RAISE EXCEPTION）。
-- 所有读写都在系统通道（app.rls_system='on'）下进行；组 5 会临时关闭系统通道
-- 以验证普通租户视角。

\set ON_ERROR_STOP on

\if :{?expected_types}
\else
  \set expected_types 77
\endif
\if :{?expected_items}
\else
  \set expected_items 397
\endif
\if :{?expected_standard_types}
\else
  \set expected_standard_types 73
\endif
\if :{?expected_standard_items}
\else
  \set expected_standard_items 380
\endif
\if :{?expected_legacy_types}
\else
  \set expected_legacy_types 4
\endif
\if :{?expected_legacy_items}
\else
  \set expected_legacy_items 17
\endif

SET app.rls_system = 'on';

CREATE TEMP TABLE _verify_expected (
  expected_types          int,
  expected_items          int,
  expected_standard_types int,
  expected_standard_items int,
  expected_legacy_types   int,
  expected_legacy_items   int
);
INSERT INTO _verify_expected
VALUES (
  :expected_types,
  :expected_items,
  :expected_standard_types,
  :expected_standard_items,
  :expected_legacy_types,
  :expected_legacy_items
);

-- 标准种子 73 类（与 seed.rs 的 get_system_dict_definitions 对齐）
CREATE TEMP TABLE _verify_standard_codes (code text PRIMARY KEY);
INSERT INTO _verify_standard_codes (code) VALUES
  ('common_status'),('boolean'),('gender'),('user_type'),('approval_status'),('priority'),
  ('currency'),('unit_of_measure'),('purchase_order_status'),('sales_order_status'),
  ('inventory_operation'),('customer_level'),('opportunity_stage'),('employee_status'),
  ('contract_type'),('notification_type'),('plugin_status'),('plugin_type'),('data_scope'),
  ('permission_type'),('log_level'),('language'),('timezone'),('date_format'),('time_format'),
  ('number_format'),('file_type'),('operation_type'),('order_type'),('payment_method'),
  ('invoice_type'),('asset_type'),('cost_type'),('fiscal_period'),('report_type'),
  ('project_status'),('task_status'),('document_type'),('qc_type'),('equipment_type'),
  ('material_category'),('process_type'),('order_status'),('purchase_type'),('sales_channel'),
  ('supplier_level'),('product_category'),('warehouse_type'),('location_type'),('unit'),
  ('tax_rate'),('industry_type'),('company_size'),('customer_source'),('payment_terms'),
  ('shipping_method'),('packaging_type'),('qc_result'),('equipment_status'),('work_shift'),
  ('attendance_type'),('leave_type'),('training_type'),('performance_level'),('expense_type'),
  ('budget_type'),('approval_flow_type'),('message_channel'),('sync_status'),('storage_type'),
  ('api_type'),('auth_method'),('encryption_algorithm');

-- 组 1：总量与标准类覆盖（73 类都存在）
DO $$
DECLARE
  e record;
  actual_types int;
  actual_items int;
  actual_standard int;
BEGIN
  SELECT * INTO e FROM _verify_expected;
  SELECT count(*) INTO actual_types FROM public.core_dict_types WHERE deleted_at IS NULL;
  SELECT count(*) INTO actual_items FROM public.core_dict_items WHERE deleted_at IS NULL;
  SELECT count(*) INTO actual_standard
    FROM public.core_dict_types t
    JOIN _verify_standard_codes c ON c.code = t.code
   WHERE t.deleted_at IS NULL;

  IF actual_types <> e.expected_types THEN
    RAISE EXCEPTION 'G1 失败: 类型总数 % <> 期望 %', actual_types, e.expected_types;
  END IF;
  IF actual_items <> e.expected_items THEN
    RAISE EXCEPTION 'G1 失败: 字典项总数 % <> 期望 %', actual_items, e.expected_items;
  END IF;
  IF actual_standard <> e.expected_standard_types THEN
    RAISE EXCEPTION 'G1 失败: 标准类覆盖 % <> 期望 %', actual_standard, e.expected_standard_types;
  END IF;
  RAISE NOTICE 'G1 OK: types=%, standard_codes=%, items=%', actual_types, actual_standard, actual_items;
END $$;

-- 组 2：legacy 4 类及其 items 必须保留（4/4/4/5，合计 17）
DO $$
DECLARE
  e record;
  n int;
  legacy_total int;
  legacy_items int;
BEGIN
  SELECT * INTO e FROM _verify_expected;
  SELECT count(*) INTO legacy_total
    FROM public.core_dict_types
   WHERE deleted_at IS NULL
     AND code IN ('department_type','education','marital_status','position_level');
  SELECT count(*) INTO legacy_items
    FROM public.core_dict_items i
    JOIN public.core_dict_types t ON t.id = i.dict_type_id
   WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL
     AND t.code IN ('department_type','education','marital_status','position_level');

  IF legacy_total <> e.expected_legacy_types THEN
    RAISE EXCEPTION 'G2 失败: legacy 类型 % <> 期望 %', legacy_total, e.expected_legacy_types;
  END IF;
  IF legacy_items <> e.expected_legacy_items THEN
    RAISE EXCEPTION 'G2 失败: legacy 项 % <> 期望 %', legacy_items, e.expected_legacy_items;
  END IF;

  SELECT count(*) INTO n FROM public.core_dict_types
   WHERE deleted_at IS NULL AND code = 'department_type';
  IF n <> 1 THEN RAISE EXCEPTION 'G2 失败: department_type 缺失'; END IF;
  SELECT count(*) INTO n FROM public.core_dict_types
   WHERE deleted_at IS NULL AND code = 'education';
  IF n <> 1 THEN RAISE EXCEPTION 'G2 失败: education 缺失'; END IF;
  SELECT count(*) INTO n FROM public.core_dict_types
   WHERE deleted_at IS NULL AND code = 'marital_status';
  IF n <> 1 THEN RAISE EXCEPTION 'G2 失败: marital_status 缺失'; END IF;
  SELECT count(*) INTO n FROM public.core_dict_types
   WHERE deleted_at IS NULL AND code = 'position_level';
  IF n <> 1 THEN RAISE EXCEPTION 'G2 失败: position_level 缺失'; END IF;

  RAISE NOTICE 'G2 OK: legacy_types=% legacy_items=%', legacy_total, legacy_items;
END $$;

-- 组 3：租户落点（全部 …0001，无 NULL / 全零）
DO $$
DECLARE
  bad_types int;
  bad_items int;
BEGIN
  SELECT count(*) INTO bad_types
    FROM public.core_dict_types
   WHERE deleted_at IS NULL
     AND (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
          OR tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid);
  SELECT count(*) INTO bad_items
    FROM public.core_dict_items
   WHERE deleted_at IS NULL
     AND (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
          OR tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid);
  IF bad_types <> 0 THEN
    RAISE EXCEPTION 'G3 失败: % 个类型的 tenant_id 非 …0001', bad_types;
  END IF;
  IF bad_items <> 0 THEN
    RAISE EXCEPTION 'G3 失败: % 个字典项的 tenant_id 非 …0001', bad_items;
  END IF;
  RAISE NOTICE 'G3 OK: 所有字典行 tenant_id=…0001（无 NULL/全零）';
END $$;

-- 组 4：标准类不应有空项（并核对标准类项数 = 379 + 存量非种子项）
DO $$
DECLARE
  e record;
  empty_types int;
  standard_items int;
BEGIN
  SELECT * INTO e FROM _verify_expected;
  SELECT count(*) INTO empty_types
    FROM (
      SELECT t.code
        FROM public.core_dict_types t
        JOIN _verify_standard_codes c ON c.code = t.code
        LEFT JOIN public.core_dict_items i
               ON i.dict_type_id = t.id AND i.deleted_at IS NULL
       WHERE t.deleted_at IS NULL
       GROUP BY t.code
      HAVING count(i.id) = 0
    ) x;
  SELECT count(*) INTO standard_items
    FROM public.core_dict_items i
    JOIN public.core_dict_types t ON t.id = i.dict_type_id
    JOIN _verify_standard_codes c ON c.code = t.code
   WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL;

  IF empty_types <> 0 THEN
    RAISE EXCEPTION 'G4 失败: % 个标准类没有字典项', empty_types;
  END IF;
  IF standard_items <> e.expected_standard_items THEN
    RAISE EXCEPTION 'G4 失败: 标准类项数 % <> 期望 %', standard_items, e.expected_standard_items;
  END IF;
  RAISE NOTICE 'G4 OK: 标准类无空项，标准类项数=%', standard_items;
END $$;

-- 组 5：隔离视角（系统租户 …0001 可见全部；任意普通租户 0 行）
DO $$
DECLARE
  n int;
BEGIN
  PERFORM set_config('app.rls_system', 'off', true);
  PERFORM set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);
  SELECT count(*) INTO n FROM public.core_dict_types WHERE deleted_at IS NULL;
  IF n <> (SELECT expected_types FROM _verify_expected) THEN
    RAISE EXCEPTION 'G5 失败: 系统租户可见 % 类，期望 %', n, (SELECT expected_types FROM _verify_expected);
  END IF;

  PERFORM set_config('app.tenant_id', '11111111-1111-1111-1111-111111111111', true);
  SELECT count(*) INTO n FROM public.core_dict_types WHERE deleted_at IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G5 失败: 普通租户可见 % 类（应为 0）', n;
  END IF;
  SELECT count(*) INTO n FROM public.core_dict_items WHERE deleted_at IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G5 失败: 普通租户可见 % 个字典项（应为 0）', n;
  END IF;

  PERFORM set_config('app.rls_system', 'on', true);
  RAISE NOTICE 'G5 OK: …0001 可见全部，普通租户 0 行';
END $$;

-- 组 6：残留清理（zz_* / B4-* 必须为 0）
DO $$
DECLARE
  residual int;
BEGIN
  SELECT count(*) INTO residual
    FROM public.core_dict_types
   WHERE deleted_at IS NULL
     AND (code LIKE 'zz_%' OR code LIKE 'B4-%' OR code = 'zz_b4_probe2');
  IF residual <> 0 THEN
    RAISE EXCEPTION 'G6 失败: 仍有 % 个 zz_/B4- 残留字典类', residual;
  END IF;
  RAISE NOTICE 'G6 OK: 无 zz_/B4- 残留';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL 6 GROUPS OK'; END $$;
