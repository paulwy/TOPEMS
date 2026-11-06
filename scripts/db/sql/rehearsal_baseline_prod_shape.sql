-- 本地演练专用：把 scratch 库重置为 prod 2026-11-06 只读基线形态。
-- 仅用于演练库（禁止在 prod / 主开发库执行）。
--   core_dict_types 7 行：4 个 legacy + employee_status + gender + zz_b4_probe2
--   core_dict_items 24 行：legacy 4/4/4/5 + employee_status 4（含 regular）+ gender 3
-- 另外补 prod 形态列 ehs.qa_ehs_risks.created_by（本地 schema 缺失，见演练问题清单）。

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL app.rls_system = 'on';

-- 1) 字典裁剪到 7 个 baseline code
DELETE FROM public.core_dict_items
 WHERE dict_type_id NOT IN (
   SELECT id FROM public.core_dict_types
    WHERE code IN ('department_type','education','marital_status','position_level',
                   'employee_status','gender','zz_b4_probe2'));
DELETE FROM public.core_dict_types
 WHERE code NOT IN ('department_type','education','marital_status','position_level',
                    'employee_status','gender','zz_b4_probe2');

-- 2) 6 个 baseline 类型（固定 id，便于重复演练）
INSERT INTO public.core_dict_types (id, code, name, category, tenant_id, status)
VALUES
 ('44444444-4444-4444-4444-444444444001','gender','性别','hrm','00000000-0000-0000-0000-000000000001','active'),
 ('44444444-4444-4444-4444-444444444002','employee_status','员工状态','hrm','00000000-0000-0000-0000-000000000001','active'),
 ('44444444-4444-4444-4444-444444444003','department_type','部门类型','hrm','00000000-0000-0000-0000-000000000001','active'),
 ('44444444-4444-4444-4444-444444444004','position_level','岗位职级','hrm','00000000-0000-0000-0000-000000000001','active'),
 ('44444444-4444-4444-4444-444444444005','marital_status','婚姻状况','hrm','00000000-0000-0000-0000-000000000001','active'),
 ('44444444-4444-4444-4444-444444444006','education','学历','hrm','00000000-0000-0000-0000-000000000001','active')
ON CONFLICT DO NOTHING;

INSERT INTO public.core_dict_types (code, name, category, tenant_id, status)
VALUES ('zz_b4_probe2','probe','general','00000000-0000-0000-0000-000000000001','active')
ON CONFLICT DO NOTHING;

-- 已存在行可能带着本地 category='system'（导致 seed 幂等守卫跳过），统一改回 prod 基线口径
UPDATE public.core_dict_types
   SET category = 'hrm'
 WHERE code IN ('department_type','education','marital_status','position_level',
                'employee_status','gender');
UPDATE public.core_dict_types
   SET category = 'general'
 WHERE code = 'zz_b4_probe2';

-- 3) employee_status 重置为 4 项（3 个标准 + regular；回灌后应为 5）
DELETE FROM public.core_dict_items i
 USING public.core_dict_types t
 WHERE i.dict_type_id = t.id AND t.code = 'employee_status';
INSERT INTO public.core_dict_items (dict_type_id, code, name, value, sort_order, tenant_id, status)
SELECT t.id, v.code, v.name, v.sort_order::text, v.sort_order::int,
       '00000000-0000-0000-0000-000000000001', 'active'
  FROM public.core_dict_types t,
       (VALUES ('active','在职',1),('probation','试用期',2),
               ('resigned','离职',3),('regular','正式',9)) AS v(code,name,sort_order)
 WHERE t.code = 'employee_status'
ON CONFLICT DO NOTHING;

-- 4) 4 个 legacy 类各 4/4/4/5 项（回灌时保留，不在标准种子清单）
INSERT INTO public.core_dict_items (dict_type_id, code, name, value, sort_order, tenant_id, status)
SELECT t.id, v.code, v.name, v.sort_order::text, v.sort_order::int,
       '00000000-0000-0000-0000-000000000001', 'active'
  FROM public.core_dict_types t,
       (VALUES
         ('department_type','dept_sales','销售部',1),
         ('department_type','dept_hr','人力资源部',2),
         ('department_type','dept_finance','财务部',3),
         ('department_type','dept_ops','运营部',4),
         ('education','high_school','高中',1),
         ('education','bachelor','本科',2),
         ('education','master','硕士',3),
         ('education','phd','博士',4),
         ('marital_status','single','未婚',1),
         ('marital_status','married','已婚',2),
         ('marital_status','divorced','离异',3),
         ('marital_status','widowed','丧偶',4),
         ('position_level','p1','P1',1),
         ('position_level','p2','P2',2),
         ('position_level','p3','P3',3),
         ('position_level','p4','P4',4),
         ('position_level','p5','P5',5)
       ) AS v(type_code,code,name,sort_order)
 WHERE t.code = v.type_code
ON CONFLICT DO NOTHING;

-- 5) gender 若被裁剪到少于 3 项则补足（正常本地已有 3 项）
INSERT INTO public.core_dict_items (dict_type_id, code, name, value, sort_order, tenant_id, status)
SELECT t.id, v.code, v.name, v.sort_order::text, v.sort_order::int,
       '00000000-0000-0000-0000-000000000001', 'active'
  FROM public.core_dict_types t,
       (VALUES ('male','男',1),('female','女',2),('unknown','保密',3)) AS v(code,name,sort_order)
 WHERE t.code = 'gender'
ON CONFLICT DO NOTHING;

-- 6) prod 形态 shim：本地 ehs.qa_ehs_risks 缺 created_by（prod 为 uuid）
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS created_by uuid;

COMMIT;

SELECT 'BASELINE|types|' || count(*) FROM public.core_dict_types WHERE deleted_at IS NULL;
SELECT 'BASELINE|items|' || count(*) FROM public.core_dict_items WHERE deleted_at IS NULL;
SELECT 'BASELINE|legacy|' || count(*) FROM public.core_dict_items i
 JOIN public.core_dict_types t ON t.id = i.dict_type_id
 WHERE t.code IN ('department_type','education','marital_status','position_level');
