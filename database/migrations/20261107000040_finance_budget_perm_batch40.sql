-- 批 40：finance operational 模块四组资源补挂权限中间件配套迁移（2026-11-07）
--
-- 背景：svc/finance/src/modules/operational.rs 中 expenses / budgets / receivables /
-- payables 四组资源原先仅在 `#[utoipa::path]` 文档注解里声明 security，路由层
-- 未挂任何 require_permission 中间件，任意持有效 JWT 的同租户用户均可调用。
-- 本次照 settlement_center 惯例逐端点补挂细码。
--
-- 码位核对（public.core_permissions）：
--   已存在且已授权给 admin/finance_manager/superadmin：
--     finance:expense:read|create|update|delete
--     finance:receivable:read|create|update|delete
--     finance:receivable_payable:read|create|update|delete
--     finance:budget:read
--   缺失：finance:budget:write
--     （operational.rs 行 640 原 utoipa::path 注解即声明为 finance:budget:write，
--       但 DB 字典从未落库；本次迁移补建并授权，与同组 finance:budget:read 对齐）
--
-- 本迁移只做两件事（只增不减）：
--   1) 补建 finance:budget:write 权限行；
--   2) 授予 finance_manager / admin / superadmin（与 finance:budget:read 既有持有者一致）。
--
-- 幂等：建码用 NOT EXISTS(code)；授权用 NOT EXISTS(role_id, permission_id)。
-- 可重复执行；对已有该码与已有绑定的环境为 no-op。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code = 'finance:budget:write'
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('finance_manager','admin','superadmin'));
--   DELETE FROM public.core_permissions WHERE code = 'finance:budget:write';

-- 1) 补建 finance:budget:write（resource/action 与既有 finance:budget:read 保持一致）
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT 'finance:budget:write', '预算管理-写（创建/更新/删除）', 'finance:budget', 'write', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions WHERE code = 'finance:budget:write'
);

-- 2) 授权 finance:budget:write → finance_manager / admin / superadmin
--    finance_user 为只读角色，不授予；employee 为普通员工，不授予。
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'finance:budget:write'
WHERE r.name IN ('finance_manager', 'admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
