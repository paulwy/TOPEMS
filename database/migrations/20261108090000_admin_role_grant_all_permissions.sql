-- 初始设置修复：admin 角色补齐全部权限点（2026-11-08）
--
-- 背景：
--   实测发现 admin 角色只绑定了 242 条权限，缺少路由门实际使用的
--   iam:read / iam:tenant:read / workflow:read 等基础权限；
--   非 superuser 的 admin 角色用户登录后访问 /iam/users、/iam/roles 仍会 403。
--   首个 admin 之所以可用，完全依赖 is_superuser=true。
--
-- 修复口径：
--   admin 是系统管理员角色，应持有全部权限点；is_superuser 仍是独立兜底路径。
--   本迁移只增不减，幂等；对已全部绑定的环境为 no-op。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp
--    USING public.core_roles r
--    WHERE rp.role_id = r.id AND r.name = 'admin'
--      AND rp.permission_id NOT IN (
--        SELECT permission_id FROM public.core_role_permissions
--         WHERE role_id <> r.id
--      );

INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON TRUE
WHERE r.name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
