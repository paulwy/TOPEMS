-- 批 40 任务 D：ai + communication 反向鉴权缺口修复配套迁移（2026-11-07）
--
-- 背景：
--   ai 服务 129 个裸奔 handler 已在 svc/ai/src/routes.rs 集中三分法挂码：
--     C1 运维/管理面 → ai:admin（admin + superadmin 已有授权，无需补授）
--     C2 业务数据面   → ai:read（employee + admin + superadmin 已有授权，无需补授）
--     C3 个人自服务   → 仅登录（不挂权限码）
--
--   communication 服务 85 个裸奔 handler 经核实：
--     main.rs 已有 admin_only() 包装管理类路由（挂 communication:admin），
--     个人类路由（通知读取/标记/IM/邮件）仅需登录，属设计如此。
--     缺口：communication:admin 此前仅 superadmin 持有，
--     admin 角色和 notification_manager 角色均未持有，
--     导致管理类路由（模板/频道/广播/重发邮件）对 admin 和 notification_manager 403。
--
-- 本迁移只做两件事（只增不减）：
--   1) 授权 communication:admin → admin（系统管理员，可管理通信配置）
--   2) 授权 communication:admin → notification_manager（通知域管理员，与 notification:admin 对齐）
--
-- 幂等：授权用 NOT EXISTS(role_id, permission_id)。
-- 可重复执行；对已有绑定的环境为 no-op。
--
-- ROLLBACK：
--   DELETE FROM public.core_role_permissions rp USING public.core_permissions p
--    WHERE rp.permission_id = p.id AND p.code = 'communication:admin'
--      AND rp.role_id IN (SELECT id FROM public.core_roles
--                          WHERE name IN ('admin','notification_manager'));

-- 1) 授权 communication:admin → admin
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'communication:admin'
WHERE r.name IN ('admin')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );

-- 2) 授权 communication:admin → notification_manager
--    （该角色已有 notification:admin 等 15 个通知域权限，补 communication:admin
--      使其能访问 communication 服务 main.rs 中 admin_only() 包装的管理路由）
INSERT INTO public.core_role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM public.core_roles r
JOIN public.core_permissions p ON p.code = 'communication:admin'
WHERE r.name IN ('notification_manager')
  AND NOT EXISTS (
      SELECT 1 FROM public.core_role_permissions x
      WHERE x.role_id = r.id AND x.permission_id = p.id
  );
