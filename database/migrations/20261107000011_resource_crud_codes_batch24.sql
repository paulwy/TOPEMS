-- P3-14 资源级 CRUD 三码补齐（批 24 / 2026-11-06）
--
-- 依据（逐个资源的实体取证）：
--   aps:material_plan           表 mes.material_plans（已有 read 码）
--   aps:production_plan         表 mes.production_plans（已有 read 码）
--   workflow:template           表 master_data.mdm_workflow_templates（已有 read 码）
--   notification:template       表 public.notification_templates（新建 4 码）
--   srm:scoring_dimension       表 srm.scoring_dimensions（新建 4 码）
--   srm:supplier_product        表 srm.supplier_products（新建 4 码）
--
-- 未补码说明（不造无依据的码）：
--   rd:review / rd:release / rd:code —— rd schema 仅有 bugs/builds/deploys/test_cases 四表，
--   无 reviews/releases/code_repos 实体。对应前端 schema 的 api.resource 实际指向真实资源
--   （review.ts→builds、release.ts→deploys、code.ts→projects），故复用既有 rd:build /
--   rd:deploy / rd:project 三码接入，不为其造码。三个历史 read 码登记为待清理。
--
-- resource 列写法遵循各自模块既有惯例：aps/workflow/notification 用 colon，srm 用 underscore。
--
-- 幂等：NOT EXISTS(code) 判重。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code IN ('aps:material_plan:create','aps:material_plan:update','aps:material_plan:delete','aps:production_plan:create','aps:production_plan:update','aps:production_plan:delete','workflow:template:create','workflow:template:update','workflow:template:delete','notification:template:read','notification:template:create','notification:template:update','notification:template:delete','srm:scoring_dimension:read','srm:scoring_dimension:create','srm:scoring_dimension:update','srm:scoring_dimension:delete','srm:supplier_product:read','srm:supplier_product:create','srm:supplier_product:update','srm:supplier_product:delete');
--   DELETE FROM public.core_permissions WHERE code IN ('aps:material_plan:create','aps:material_plan:update','aps:material_plan:delete','aps:production_plan:create','aps:production_plan:update','aps:production_plan:delete','workflow:template:create','workflow:template:update','workflow:template:delete','notification:template:read','notification:template:create','notification:template:update','notification:template:delete','srm:scoring_dimension:read','srm:scoring_dimension:create','srm:scoring_dimension:update','srm:scoring_dimension:delete','srm:supplier_product:read','srm:supplier_product:create','srm:supplier_product:update','srm:supplier_product:delete');

-- 列序注意：VALUES 每行实际顺序为 (code, resource, action, name, level)，
-- 派生表别名必须与之一致；否则 name/resource/action 会整体错位
-- （2026-11-06 修复，本迁移在 local/test/prod 均未记账，属未应用迁移，可改字节）。
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT v.code, v.name, v.resource, v.action, v.level
FROM (VALUES
  ('aps:material_plan:create','aps:material_plan','create','material_plancreate',1),
  ('aps:material_plan:update','aps:material_plan','update','material_planupdate',1),
  ('aps:material_plan:delete','aps:material_plan','delete','material_plandelete',1),
  ('aps:production_plan:create','aps:production_plan','create','production_plancreate',1),
  ('aps:production_plan:update','aps:production_plan','update','production_planupdate',1),
  ('aps:production_plan:delete','aps:production_plan','delete','production_plandelete',1),
  ('workflow:template:create','workflow:template','create','templatecreate',1),
  ('workflow:template:update','workflow:template','update','templateupdate',1),
  ('workflow:template:delete','workflow:template','delete','templatedelete',1),
  ('notification:template:read','notification:template','read','templateread',1),
  ('notification:template:create','notification:template','create','templatecreate',1),
  ('notification:template:update','notification:template','update','templateupdate',1),
  ('notification:template:delete','notification:template','delete','templatedelete',1),
  ('srm:scoring_dimension:read','srm_scoring_dimension','read','scoring_dimensionread',1),
  ('srm:scoring_dimension:create','srm_scoring_dimension','create','scoring_dimensioncreate',1),
  ('srm:scoring_dimension:update','srm_scoring_dimension','update','scoring_dimensionupdate',1),
  ('srm:scoring_dimension:delete','srm_scoring_dimension','delete','scoring_dimensiondelete',1),
  ('srm:supplier_product:read','srm_supplier_product','read','supplier_productread',1),
  ('srm:supplier_product:create','srm_supplier_product','create','supplier_productcreate',1),
  ('srm:supplier_product:update','srm_supplier_product','update','supplier_productupdate',1),
  ('srm:supplier_product:delete','srm_supplier_product','delete','supplier_productdelete',1)
) AS v(code, resource, action, name, level)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 授权：admin / superadmin 全量
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN ('aps:material_plan:create','aps:material_plan:update','aps:material_plan:delete','aps:production_plan:create','aps:production_plan:update','aps:production_plan:delete','workflow:template:create','workflow:template:update','workflow:template:delete','notification:template:read','notification:template:create','notification:template:update','notification:template:delete','srm:scoring_dimension:read','srm:scoring_dimension:create','srm:scoring_dimension:update','srm:scoring_dimension:delete','srm:supplier_product:read','srm:supplier_product:create','srm:supplier_product:update','srm:supplier_product:delete')
WHERE r.name IN ('admin','superadmin')
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x
                  WHERE x.role_id = r.id AND x.permission_id = p.id);

-- 授权：srm_manager 按域（scoring_dimension / supplier_product）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN ('srm:scoring_dimension:read','srm:scoring_dimension:create','srm:scoring_dimension:update','srm:scoring_dimension:delete','srm:supplier_product:read','srm:supplier_product:create','srm:supplier_product:update','srm:supplier_product:delete')
WHERE r.name = 'srm_manager'
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x
                  WHERE x.role_id = r.id AND x.permission_id = p.id);
