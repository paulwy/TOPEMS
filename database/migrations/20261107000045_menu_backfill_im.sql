-- W1-1b：补齐 im 模块 2 条前端已定义、生产库缺失的菜单
-- 依据：docs/quality/menu-correspondence-audit-2026-11-07.md §5.3
--       apps/web/src/modules/im/config.ts navItems
-- 幂等：组 / 菜单均按 (tenant_id, code) ON CONFLICT DO UPDATE，重复执行 0 新增
-- 租户：默认租户 00000000-0000-0000-0000-000000000001（与生产 public.core_menus 一致）
--
-- 回滚（按唯一键 tenant_id + code，仅删除本迁移写入的行）：
--   DELETE FROM core_menus
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('im-dashboard','im-mail');
--   DELETE FROM core_menu_groups
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('im_overview','im_business');

-- im 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('IM 概览', 'im_overview', 'FileText', 173),
    ('IM 业务', 'im_business', 'FileText', 174)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- im 菜单种子（2 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id,
       v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('消息概览', 'im-dashboard', 'LayoutDashboard', 0, '/im/dashboard', 'im:dashboard:read', 'im_overview'),
    ('邮件管理', 'im-mail',      'Mail',            1, '/im/mail',      'im:mail:read',      'im_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g
  ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      group_id = EXCLUDED.group_id,
      path = EXCLUDED.path,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      status = EXCLUDED.status,
      permissions = EXCLUDED.permissions,
      updated_at = now();
