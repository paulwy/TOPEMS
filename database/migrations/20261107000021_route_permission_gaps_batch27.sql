-- P3-17 路由权限码缺口修复（批 27 / 2026-11-07）
--
-- 背景：全站 16 处「细码 + <域>:dashboard:write」双条件路由中，实测发现 4 个细码
-- 与 8 个 dashboard:write 均【无人持有】，导致这些页面除 superadmin（走 is_superuser
-- 前置放行）外，admin 与域 manager 实际都进不去。移除 dashboard:write 后仍需保证
-- 细码本身有效，故本迁移补齐以下缺口。
--
-- 本迁移做两件事：
--   1) 新建 finance:account:read
--      依据：apps/web/src/schemas/admin/account.ts:114 的 permissionResource
--      = 'finance:account'，resolveCrudPermissionCodes 会拼出 :read；DB 仅有
--      create/update/delete（admin/finance_manager/superadmin 均已持有），CRUD 不完整。
--      对应 entity 为 finance 域账户（api.module='finance'、api.resource='accounts'），
--      声明在 database/init/03_init_permissions.sql:179，但从未落库。
--
--   2) 补齐 4 个「码存在但无人持有」的路由细码授权（admin + superadmin）
--      admin:tenant:write      —— apps/web/src/modules/admin/config.ts:173 租户相关写路由
--      rd:project:write        —— modules/rd/config.ts:194
--      rd:experiment:write     —— modules/rd/config.ts:236
--      rd:formula:write        —— modules/rd/config.ts:278
--      这 4 个码在 DB 中已存在（count>0）但 core_role_permissions 无任何角色关联。
--
-- 幂等：INSERT 码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id
--      AND p.code IN ('finance:account:read','admin:tenant:write','rd:project:write','rd:experiment:write','rd:formula:write')
--      AND rp.role_id IN (SELECT id FROM public.core_roles WHERE name IN ('admin','superadmin','finance_manager'));
--   DELETE FROM public.core_permissions WHERE code = 'finance:account:read';

-- 1) 新建 finance:account:read（resource 列沿用该模块既有 colon 写法）
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:account:read', '账户管理-只读', 'finance:account', 'read', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions WHERE code = 'finance:account:read'
);

-- 2) 授权 finance:account:read → admin / finance_manager / superadmin
--    （与既有 create/update/delete 的持有者保持一致）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'finance:account:read'
WHERE r.name IN ('admin', 'finance_manager', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- 3) 补齐 4 个无人持有路由细码的授权 → admin / superadmin
--    （rd 域当前无 rd_manager，按角色规划建议维持 admin-only）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code IN (
    'admin:tenant:write',
    'rd:project:write',
    'rd:experiment:write',
    'rd:formula:write'
)
WHERE r.name IN ('admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
