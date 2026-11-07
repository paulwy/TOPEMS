-- 财务模块管理员伞码补齐（方案 C / 2026-11-07）
--
-- 背景：`finance:admin` 是财务敏感动作（审批配置 CRUD 等 5 个 handler）的独立权限点，
-- 但它从未进入迁移链，只存在于装机脚本 database/init/03_init_permissions.sql:174，
-- 导致 fresh / prod 库缺失该码、且 0 角色授权。方案 C 下模块门已改为
-- `require_module_access("finance")`（持有任一 finance: 前缀码即可进入），
-- 本码只负责「模块管理员语义」的敏感动作，不再承担门禁。
--
-- 本迁移做两件事（只增不减）：
--   1) 补建 finance:admin 权限行（若不存在）；
--   2) 授予 finance_manager / admin / superadmin（若角色存在且尚未绑定）。
--
-- 幂等：建码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
-- 可重复执行；对已有该码与已有绑定的环境为 no-op。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code = 'finance:admin'
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('finance_manager','admin','superadmin'));
--   DELETE FROM public.core_permissions WHERE code = 'finance:admin';

-- 1) 补建 finance:admin（resource/action 与既有 finance:read 保持一致）
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:admin', '财务管理-管理员', 'finance', 'admin', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions WHERE code = 'finance:admin'
);

-- 2) 授权 finance:admin → finance_manager / admin / superadmin
--    finance_user 为只读角色，不授予。
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'finance:admin'
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
