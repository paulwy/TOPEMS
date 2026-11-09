-- P3 A 级止血（续）/ 2026-11-09：tenant_admin 模块级只读码对齐
--
-- 背景：
--   各业务域受保护路由入口普遍使用 require_module_access("<module>") 模块门
--   （命中任一 "<module>:*" 码即放行）。生产 tenant_admin 已持有全量租户域模块码，
--   本地/部分环境角色-权限映射存在缺口，真实 tenant_admin 进入对应模块先被 403。
--   本次按生产现状对齐：只补租户域模块只读码，不授平台码（iam:read / system:read）
--   与订阅域（subscription:read），不授任何模块伞码 admin。
--
-- 范围（22 个模块只读码 → 授予 tenant_admin）：
--   ai, crm, doc, ehs, erp, file, gis, hrm, im, integration, lims, mes,
--   notification, pdm, pm, qms, report, rs, scm, srm, wms, workflow
--
-- 幂等：建码 NOT EXISTS(code)；授权 NOT EXISTS(role_id, permission_id)。
-- 若 core_roles 中不存在 tenant_admin，授权段 0 行受影响（安全跳过）。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_roles r, public.core_permissions p
--    WHERE rp.role_id = r.id AND rp.permission_id = p.id
--      AND r.name = 'tenant_admin'
--      AND p.code IN ('ai:read','crm:read','doc:read','ehs:read','erp:read','file:read',
--                     'gis:read','hrm:read','im:read','integration:read','lims:read',
--                     'mes:read','notification:read','pdm:read','pm:read','qms:read',
--                     'report:read','rs:read','scm:read','srm:read','wms:read','workflow:read');
--   （若确认这些码无其他持有者且需删码）：
--   DELETE FROM public.core_permissions WHERE code IN (同上列表);

BEGIN;

-- 1) 确保模块只读码存在（生产已在，守卫后 no-op；本地缺的按需补建）
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (VALUES
    ('ai:read',           'AI-只读',       'ai 模块只读入口',           'ai',           'read'),
    ('crm:read',          '客户关系-只读', 'crm 模块只读入口',          'crm',          'read'),
    ('doc:read',          '文档-只读',     'doc 模块只读入口',          'doc',          'read'),
    ('ehs:read',          '安全环保-只读', 'ehs 模块只读入口',          'ehs',          'read'),
    ('erp:read',          'ERP-只读',      'erp 模块只读入口',          'erp',          'read'),
    ('file:read',         '文件-只读',     'file 模块只读入口',         'file',         'read'),
    ('gis:read',          '空间地图-只读', 'gis 模块只读入口',          'gis',          'read'),
    ('hrm:read',          '人力资源-只读', 'hrm 模块只读入口',          'hrm',          'read'),
    ('im:read',           '即时通讯-只读', 'im 模块只读入口',           'im',           'read'),
    ('integration:read',  '集成-只读',     'integration 模块只读入口',  'integration',  'read'),
    ('lims:read',         '实验室-只读',   'lims 模块只读入口',         'lims',         'read'),
    ('mes:read',          '制造执行-只读', 'mes 模块只读入口',          'mes',          'read'),
    ('notification:read', '通知-只读',     'notification 模块只读入口', 'notification', 'read'),
    ('pdm:read',          '产品数据-只读', 'pdm 模块只读入口',          'pdm',          'read'),
    ('pm:read',           '项目管理-只读', 'pm 模块只读入口',           'pm',           'read'),
    ('qms:read',          '质量管理-只读', 'qms 模块只读入口',          'qms',          'read'),
    ('report:read',       '报表-只读',     'report 模块只读入口',       'report',       'read'),
    ('rs:read',           '研发(RS)-只读', 'rs 模块只读入口',           'rs',           'read'),
    ('scm:read',          '供应链-只读',   'scm 模块只读入口',          'scm',          'read'),
    ('srm:read',          '供应商关系-只读', 'srm 模块只读入口',        'srm',          'read'),
    ('wms:read',          '仓储-只读',     'wms 模块只读入口',          'wms',          'read'),
    ('workflow:read',     '工作流-只读',   'workflow 模块只读入口',     'workflow',     'read')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

-- 2) 授予 tenant_admin（租户域角色；平台码不在列表内）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'ai:read','crm:read','doc:read','ehs:read','erp:read','file:read',
    'gis:read','hrm:read','im:read','integration:read','lims:read',
    'mes:read','notification:read','pdm:read','pm:read','qms:read',
    'report:read','rs:read','scm:read','srm:read','wms:read','workflow:read'
)
WHERE r.name = 'tenant_admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

COMMIT;
