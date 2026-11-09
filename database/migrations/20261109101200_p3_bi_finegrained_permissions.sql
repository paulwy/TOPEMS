-- P3 / 2026-11-09：BI 细粒度权限补齐（读写分离）
--
-- 背景：
--   BI 整棵树此前统一由 require_module_write("bi")（即 bi:admin 伞码）拦截，
--   租户域角色（tenant_admin / finance_manager）无 bi:admin → 读也被 403。
--   本次按子域拆分读/写细码，补齐此前完全没有细码的子域。
--
-- 新增码（守卫式，已存在则 no-op）：
--   读：bi:widget:read、bi:sync_record:read、bi:drilldown:read、bi:multidim:read、
--       bi:prediction:read、bi:permission_rule:read
--   写：bi:widget:write、bi:sync_record:write、bi:visualization:write、bi:comparison:write、
--       bi:drilldown:write、bi:multidim:write、bi:prediction:write、bi:permission_rule:write、
--       bi:dataset:write
--
-- 授予（租户域，不授平台码 / 不授 bi:admin 伞码）：
--   tenant_admin   ：全部 BI 读写细码
--   finance_manager：全部 BI 读细码（财务分析只读）
--   admin / superadmin / bi_manager：全部 BI 读写细码（保持既有 BI 管理员能力）
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp
--    USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id=r.id AND rp.permission_id=p.id
--      AND r.name IN ('tenant_admin','finance_manager','admin','superadmin','bi_manager')
--      AND p.code IN (<下文 BI 细码全量列表>);
--   DELETE FROM public.core_permissions p
--    WHERE p.code IN ('bi:widget:read','bi:widget:write','bi:sync_record:read','bi:sync_record:write',
--                     'bi:drilldown:read','bi:drilldown:write','bi:multidim:read','bi:multidim:write',
--                     'bi:prediction:read','bi:prediction:write','bi:permission_rule:read',
--                     'bi:permission_rule:write','bi:dataset:write')
--      AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions rp WHERE rp.permission_id=p.id);

BEGIN;

-- 1) 补建缺失细码
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (VALUES
  ('bi:widget:read',          'BI 组件-只读',   'BI widget 读取',                'bi', 'read'),
  ('bi:widget:write',         'BI 组件-写',     'BI widget 增删改与缓存刷新',    'bi', 'write'),
  ('bi:sync_record:read',     'BI 同步记录-只读', 'BI 同步记录读取',            'bi', 'read'),
  ('bi:sync_record:write',    'BI 同步记录-写', 'BI 同步记录增删改与重试',       'bi', 'write'),
  ('bi:drilldown:read',       'BI 下钻-只读',   'BI 下钻路径读取与计算',         'bi', 'read'),
  ('bi:drilldown:write',      'BI 下钻-写',     'BI 下钻路径增删改',             'bi', 'write'),
  ('bi:multidim:read',        'BI 多维-只读',   'BI 多维分析计算',               'bi', 'read'),
  ('bi:multidim:write',       'BI 多维-写',     'BI 多维分析配置维护',           'bi', 'write'),
  ('bi:prediction:read',      'BI 预测-只读',   'BI 预测分析计算',               'bi', 'read'),
  ('bi:prediction:write',     'BI 预测-写',     'BI 预测分析配置维护',           'bi', 'write'),
  ('bi:permission_rule:read', 'BI 行级权限-只读', 'BI 行级权限规则读取与校验',    'bi', 'read'),
  ('bi:permission_rule:write','BI 行级权限-写', 'BI 行级权限规则增删改',         'bi', 'write'),
  ('bi:dataset:write',        'BI 数据集-写',   'BI 数据集增删改与发布',         'bi', 'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 2) 授予角色（按子域同域授予；全部守卫式）
--    读码清单
CREATE TEMP TABLE _p3_bi_read_codes ON COMMIT DROP AS
SELECT code FROM public.core_permissions WHERE code IN (
  'bi:dashboard:read','bi:widget:read','bi:data_source:read','bi:dataset:read',
  'bi:sync_record:read','bi:visualization:read','bi:comparison:read','bi:report:read',
  'bi:drilldown:read','bi:multidim:read','bi:prediction:read','bi:permission_rule:read',
  'bi:analytics:read'
);
--    写码清单
CREATE TEMP TABLE _p3_bi_write_codes ON COMMIT DROP AS
SELECT code FROM public.core_permissions WHERE code IN (
  'bi:dashboard:write','bi:widget:write','bi:data_source:write','bi:dataset:write',
  'bi:sync_record:write','bi:visualization:write','bi:comparison:write','bi:report:write',
  'bi:drilldown:write','bi:multidim:write','bi:prediction:write','bi:permission_rule:write'
);

-- tenant_admin / admin / superadmin / bi_manager：读 + 写
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN (SELECT code FROM _p3_bi_read_codes UNION SELECT code FROM _p3_bi_write_codes)
WHERE r.name IN ('tenant_admin','admin','superadmin','bi_manager')
  AND NOT EXISTS (
    SELECT 1 FROM public.core_role_permissions x
    WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- finance_manager：只给读
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (SELECT code FROM _p3_bi_read_codes)
WHERE r.name = 'finance_manager'
  AND NOT EXISTS (
    SELECT 1 FROM public.core_role_permissions x
    WHERE x.role_id = r.id AND x.permission_id = p.id
  );

COMMIT;
