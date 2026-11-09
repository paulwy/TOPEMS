-- P3 A 级止血 / 2026-11-09：补 18 个缺失权限子码 + 授予既有租户域角色
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A-2）：
--   路由层 require_permission 用到的细码在生产字典缺失，导致 tenant_admin /
--   域管理员调用写路由一律 403（平台端点不受影响）。
--
-- 范围（严格 18 个，不含 C 级 12 个财务父码，不新建角色、不授任何平台码）：
--   财务 15：budget:write / currency:write / currency:delete / period:write /
--            reconcile_orders:read / reconcile_orders:write / sales_invoice:read /
--            sales_invoice:write / audit:read / compliance:read / event:read /
--            reconciliation:read / risk:read / treasury:read / account:read
--   其它 3：mes:work_order:write / bi:data_source:write / wms:stocktake:write
--
-- 授予对象（按生产 core_role_permissions 同域既有映射对齐，只租户域角色）：
--   finance:*              → admin, finance_manager, tenant_admin
--   mes:work_order:write   → admin, mes_manager, tenant_admin
--   bi:data_source:write   → admin, tenant_admin
--   wms:stocktake:write    → admin, tenant_admin, wms_manager
--
-- Idempotency：建码 NOT EXISTS(code)；授权 NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN (<上面 18 个码>);
--   DELETE FROM public.core_permissions WHERE code IN (<上面 18 个码>);

BEGIN;

-- 1) 补建 18 个权限码
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (VALUES
    ('finance:budget:write',              '预算管理-写（创建/更新/删除）',      'finance 预算写权限',              'finance:budget',              'write'),
    ('finance:currency:write',            '币种-写（创建/更新）',              'finance 币种写权限',              'finance:currency',            'write'),
    ('finance:currency:delete',           '币种-删除',                        'finance 币种删除权限',            'finance:currency',            'delete'),
    ('finance:period:write',              '会计期间-写（开账/关账/年结）',     'finance 会计期间写权限',          'finance:period',              'write'),
    ('finance:reconcile_orders:read',     '对账单-只读',                      'finance 对账单只读',              'finance:reconcile_orders',    'read'),
    ('finance:reconcile_orders:write',    '对账单-写（确认/争议/取消/明细）',  'finance 对账单写权限',            'finance:reconcile_orders',    'write'),
    ('finance:sales_invoice:read',        '销售发票-只读',                    'finance 销售发票只读',            'finance:sales_invoice',       'read'),
    ('finance:sales_invoice:write',       '销售发票-写（开具/红冲/核销）',     'finance 销售发票写权限',          'finance:sales_invoice',       'write'),
    ('finance:audit:read',                '审计/异常检测-只读',               'finance 审计只读',                'finance:audit',               'read'),
    ('finance:compliance:read',           '内控合规-只读',                    'finance 内控合规只读',            'finance:compliance',          'read'),
    ('finance:event:read',                '事件溯源/CQRS 观测-只读',          'finance 事件观测只读',            'finance:event',               'read'),
    ('finance:reconciliation:read',       '对账会话-只读',                    'finance 对账会话只读',            'finance:reconciliation',      'read'),
    ('finance:risk:read',                 '风险管理/反欺诈/信用评分-只读',     'finance 风险只读',                'finance:risk',                'read'),
    ('finance:treasury:read',             '资金池/流动性管理-只读',           'finance 资金管理只读',            'finance:treasury',            'read'),
    ('finance:account:read',              '账户管理-只读',                    'finance 账户只读',                'finance:account',             'read'),
    ('mes:work_order:write',              'MES 工单写入',                     '创建/修改/删除 MES 工单',          'mes:work_order',              'write'),
    ('bi:data_source:write',              'BI 数据源写入',                    '创建/修改/删除 BI 数据源',         'bi:data_source',              'write'),
    ('wms:stocktake:write',               'WMS 盘点写入',                     '录入/完成盘点',                   'wms:stocktake',               'write')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

-- 2) 财务 15 码 → admin / finance_manager / tenant_admin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'finance:budget:write',
    'finance:currency:write',
    'finance:currency:delete',
    'finance:period:write',
    'finance:reconcile_orders:read',
    'finance:reconcile_orders:write',
    'finance:sales_invoice:read',
    'finance:sales_invoice:write',
    'finance:audit:read',
    'finance:compliance:read',
    'finance:event:read',
    'finance:reconciliation:read',
    'finance:risk:read',
    'finance:treasury:read',
    'finance:account:read'
)
WHERE r.name IN ('admin', 'finance_manager', 'tenant_admin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- 3) mes:work_order:write → admin / mes_manager / tenant_admin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'mes:work_order:write'
WHERE r.name IN ('admin', 'mes_manager', 'tenant_admin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- 4) bi:data_source:write → admin / tenant_admin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'bi:data_source:write'
WHERE r.name IN ('admin', 'tenant_admin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- 5) wms:stocktake:write → admin / tenant_admin / wms_manager
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'wms:stocktake:write'
WHERE r.name IN ('admin', 'tenant_admin', 'wms_manager')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

COMMIT;
