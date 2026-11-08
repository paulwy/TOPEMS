-- 租户管理员本租户用户/角色管理（tenant:iam:*）(2026-11-08)
--
-- 背景：
--   上一轮收回 tenant_admin 的 11 个 iam:* 平台权限后，tenant_admin 无法通过
--   /iam/users、/iam/roles 管理本租户用户与角色。本轮不是把 iam:* 塞回去，而是
--   新增一套租户域权限码，配合 handler 显式 tenant_id 过滤与提权拦截实现能力。
--
-- 命名与颗粒度（6 个，独立命名空间 tenant:iam:<resource>:<action>）：
--   tenant:iam:user:read    本租户用户-查询
--   tenant:iam:user:write   本租户用户-创建/编辑/停用启用/分配角色
--   tenant:iam:user:delete  本租户用户-删除
--   tenant:iam:role:read    本租户角色-查询
--   tenant:iam:role:write   本租户角色-创建/编辑/授权
--   tenant:iam:role:delete  本租户角色-删除
--
-- 与既有 1109 个码的关系：
--   只新增、不恢复任何 iam:*。admin 角色按“全量权限”既有不变量同步授予；
--   tenant_admin 只授予上述 6 个。tenant:iam:* 是租户域管理码，不是平台租户
--   管理码（平台侧 tenant:member:* / tenant:admin:* 不在此列）。
--
-- 本迁移只做三件事（只增不减，幂等）：
--   1) 补建 6 个权限码；
--   2) 默认租户缺失 tenant_admin 角色时补齐（prod 已有则为 no-op）；
--   3) 授予 tenant_admin / admin / superadmin。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code LIKE 'tenant:iam:%'
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('tenant_admin','admin','superadmin'));
--   DELETE FROM public.core_permissions WHERE code LIKE 'tenant:iam:%';
--   -- 若该 tenant_admin 角色由本迁移创建且无其他绑定，可按需删除；prod 已有请勿删。

-- 1) 补建 6 个租户域权限码（resource/action 与码位一致）
INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        ('tenant:iam:user:read',   '租户用户-查看',               '查询本租户用户与用户角色',             'tenant:iam:user', 'read'),
        ('tenant:iam:user:write',  '租户用户-创建/编辑/停用启用', '创建本租户用户、编辑、停用/启用、分配角色', 'tenant:iam:user', 'write'),
        ('tenant:iam:user:delete', '租户用户-删除',               '删除本租户用户',                       'tenant:iam:user', 'delete'),
        ('tenant:iam:role:read',   '租户角色-查看',               '查询本租户角色及其权限',               'tenant:iam:role', 'read'),
        ('tenant:iam:role:write',  '租户角色-创建/编辑/授权',     '创建/编辑本租户角色并为其授权',         'tenant:iam:role', 'write'),
        ('tenant:iam:role:delete', '租户角色-删除',               '删除本租户角色',                       'tenant:iam:role', 'delete')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

-- 2) 默认租户补齐 tenant_admin 角色（prod 已存在时 no-op；供本地/新环境复现）
INSERT INTO public.core_roles (name, description, tenant_id)
SELECT 'tenant_admin', '租户管理员（本租户用户/角色管理）',
       '00000000-0000-0000-0000-000000000001'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_roles WHERE name = 'tenant_admin'
);

-- 3) 授予 tenant_admin / admin / superadmin（admin 维持“全量权限”不变量）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p
  ON p.code IN (
      'tenant:iam:user:read',
      'tenant:iam:user:write',
      'tenant:iam:user:delete',
      'tenant:iam:role:read',
      'tenant:iam:role:write',
      'tenant:iam:role:delete'
  )
WHERE r.name IN ('tenant_admin', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
