-- P3-9 tenant 域成员管理 资源级权限码（批 19 / 2026-11-06）
--
-- 背景：tenant 模块此前**零权限码**（连模块级都没有）。批 18 遗留的 3 项中：
--   - admin:tenantUsers（schema admin/tenantUser.ts，页面 TenantMembersTab）→ 有**真实写操作**：
--       update → tenantApi.updateMemberRole(tenantId, id, {role})
--       delete → tenantApi.removeMember(tenantId, id)
--     后端证据：svc/unified-core/src/modules/tenant/handlers.rs:1030 remove_member、
--               :1057 update_member_role；前端路由前缀 apiClient.core + /tenant
--     → 建 tenant:member:update / tenant:member:delete（2 码）
--   - admin:invoices（schema admin/tenantInvoice.ts，页面 TenantBillingTab）→ CrudPage 的
--       create/update/delete 适配器**全是空实现**（返回 {} ），无真实写操作 → 不接入（同 auditLogs 口径）
--   - tenant:invoices（schema admin/tenantInvoice.tsx）→ **未被任何页面引用**（孤儿文件）→ 不接入
--
-- 为何不建 tenant:member:create：UI 的 create 适配器为空实现（新建成员走页面自有 Button + 另一接口），
-- 无真实 CrudPage 写路径 → 不造无依据的码。CrudPage 因此不会显示"新建"按钮，正好消除僵尸入口。
--
-- 幂等：NOT EXISTS(code) 判重；授权按 '[batch19]' 标记判重。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.description LIKE '[batch19]%';
--   DELETE FROM public.core_permissions WHERE description LIKE '[batch19]%';

INSERT INTO public.core_permissions (id, code, name, description, resource, action, level, created_at)
SELECT gen_random_uuid(), v.code, v.name, v.description, v.resource, v.action, 1, now()
FROM (
    VALUES
        ('tenant:member:update', '租户成员改角色', '[batch19] 租户成员 - 租户成员改角色', 'tenant:member', 'update'),
        ('tenant:member:delete', '移除租户成员', '[batch19] 租户成员 - 移除租户成员', 'tenant:member', 'delete')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permissions p WHERE p.code = v.code);

-- 授权：管理员全量（tenant 域无 manager 角色，租户成员管理属平台运营操作）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.description LIKE '[batch19]%'
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (SELECT 1 FROM public.core_role_permissions x WHERE x.role_id = r.id AND x.permission_id = p.id);
