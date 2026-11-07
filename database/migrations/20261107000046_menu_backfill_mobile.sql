-- W1-1c：补齐 mobile 模块 12 条前端已定义、生产库缺失的菜单
-- 依据：docs/quality/menu-correspondence-audit-2026-11-07.md §5.3
--       apps/web/src/modules/mobile/config.ts navItems
-- 幂等：组 / 菜单均按 (tenant_id, code) ON CONFLICT DO UPDATE，重复执行 0 新增
-- 租户：默认租户 00000000-0000-0000-0000-000000000001（与生产 public.core_menus 一致）
-- 说明：Web 侧按 navItems.showInSidebar 既有规则隐藏，DB 作为移动端菜单权威。
--
-- 回滚（按唯一键 tenant_id + code，仅删除本迁移写入的行）：
--   DELETE FROM core_menus
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('mobile-home','mobile-workbench','mobile-attendance','mobile-tasks',
--                   'mobile-approvals','mobile-inventory','mobile-quality','mobile-production',
--                   'mobile-scan','mobile-notifications','mobile-profile','mobile-settings');
--   DELETE FROM core_menu_groups
--    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
--      AND code IN ('mobile_overview','mobile_process','mobile_business');

-- mobile 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('移动端概览', 'mobile_overview', 'FileText', 175),
    ('移动端流程', 'mobile_process',  'FileText', 176),
    ('移动端设置', 'mobile_business', 'FileText', 177)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- mobile 菜单种子（12 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id,
       v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('移动首页', 'mobile-home',          'Home',          0, '/mobile/home',          'mobile:home:read',         'mobile_overview'),
    ('工作台',   'mobile-workbench',     'LayoutDashboard',1, '/mobile/workbench',     'mobile:home:read',         'mobile_overview'),
    ('移动考勤', 'mobile-attendance',    'Clock',         1, '/mobile/attendance',    'mobile:attendance:read',   'mobile_process'),
    ('移动任务', 'mobile-tasks',         'CheckSquare',   2, '/mobile/tasks',         'mobile:task:read',         'mobile_process'),
    ('移动审批', 'mobile-approvals',     'FileCheck',     3, '/mobile/approvals',     'mobile:approval:read',     'mobile_process'),
    ('移动库存', 'mobile-inventory',     'Package',       4, '/mobile/inventory',     'mobile:inventory:read',    'mobile_process'),
    ('移动质检', 'mobile-quality',       'ClipboardCheck',5, '/mobile/quality',       'mobile:quality:read',      'mobile_process'),
    ('移动生产', 'mobile-production',    'Factory',       6, '/mobile/production',    'mobile:production:read',   'mobile_process'),
    ('扫码',     'mobile-scan',          'Scan',          7, '/mobile/scan',          'mobile:scan:read',         'mobile_process'),
    ('消息通知', 'mobile-notifications', 'Bell',          8, '/mobile/notifications', 'mobile:notification:read', 'mobile_process'),
    ('个人中心', 'mobile-profile',       'User',          1, '/mobile/profile',       'mobile:home:read',         'mobile_business'),
    ('移动设置', 'mobile-settings',      'Settings',      2, '/mobile/settings',      'mobile:home:admin',        'mobile_business')
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
