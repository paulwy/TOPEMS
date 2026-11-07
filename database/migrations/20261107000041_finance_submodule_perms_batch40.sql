-- 批 40 续：finance 子模块路由补挂权限中间件配套迁移（2026-11-07）
--
-- 背景：operational.rs 四组资源已在迁移 0040 中补挂细码。本迁移补建其余子模块
-- 路由层需要的细码（sales_invoice / currency / reconcile_orders / period:write），
-- 并授权给 finance_manager + admin + superadmin。
--
-- 已存在无需补建：finance:report:read、finance:currency:read、finance:voucher:read、
-- finance:voucher:create/update/delete、finance:ledger:read/create/update/delete、
-- finance:accounting_subject:read/create/update/delete、finance:payment:read/create/update/delete、
-- finance:account:read/create/update/delete。
--
-- 幂等：建码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
-- 可重复执行。

-- 1) 补建缺失码
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:sales_invoice:read', '销售发票-只读', 'finance:sales_invoice', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:sales_invoice:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:sales_invoice:write', '销售发票-写（开具/红冲/核销）', 'finance:sales_invoice', 'write', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:sales_invoice:write');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:currency:write', '币种-写（创建/更新）', 'finance:currency', 'write', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:currency:write');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:currency:delete', '币种-删除', 'finance:currency', 'delete', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:currency:delete');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:reconcile_orders:read', '对账单-只读', 'finance:reconcile_orders', 'read', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:reconcile_orders:read');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:reconcile_orders:write', '对账单-写（确认/争议/取消/更新明细）', 'finance:reconcile_orders', 'write', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:reconcile_orders:write');

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:period:write', '会计期间-写（开账/关账/年结）', 'finance:period', 'write', 1
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions WHERE code = 'finance:period:write');

-- 2) 授权上述新码 → finance_manager / admin / superadmin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'finance:sales_invoice:read',
    'finance:sales_invoice:write',
    'finance:currency:write',
    'finance:currency:delete',
    'finance:reconcile_orders:read',
    'finance:reconcile_orders:write',
    'finance:period:write'
)
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
