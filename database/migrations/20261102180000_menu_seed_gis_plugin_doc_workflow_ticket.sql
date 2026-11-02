-- 审计整改批 5（P1 菜单对账）：MENU_ORPHAN_FE gis/plugin/doc/workflow/ticket 补种
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE

-- gis 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('GIS 概览', 'gis_overview', 'FileText', 160),
    ('GIS 业务', 'gis_process', 'FileText', 161),
    ('GIS 主数据', 'gis_master', 'FileText', 162)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- gis 菜单种子（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('GIS 仪表盘', 'gis-dashboard', 'LayoutDashboard', 1, '/gis/dashboard', 'gis:dashboard:read', 'gis_overview'),
    ('地图管理', 'gis-map', 'MapPin', 2, '/gis/map', 'gis:map:read', 'gis_process'),
    ('轨迹追踪', 'gis-tracking', 'Navigation', 3, '/gis/tracking', 'gis:tracking:read', 'gis_process'),
    ('电子围栏', 'gis-fence', 'MapPin', 4, '/gis/fence', 'gis:fence:read', 'gis_process'),
    ('设备定位', 'gis-devices', 'MapPin', 5, '/gis/devices', 'gis:dashboard:read', 'gis_master')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- plugin 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('插件概览', 'plugin_overview', 'FileText', 170),
    ('插件设置', 'plugin_setting', 'FileText', 171)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- plugin 菜单种子（3 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('插件仪表盘', 'plugin-dashboard', 'LayoutDashboard', 1, '/plugin/dashboard', 'plugin:dashboard:read', 'plugin_overview'),
    ('插件市场', 'plugin-marketplace', 'ShoppingCart', 2, '/plugin/marketplace', 'plugin:marketplace:read', 'plugin_setting'),
    ('插件上传', 'plugin-upload', 'Upload', 3, '/plugin/upload', 'admin:plugin:write', 'plugin_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- doc 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('文档概览', 'doc_overview', 'FileText', 180),
    ('文档管理', 'doc_master', 'FileText', 181)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- doc 菜单种子（6 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('文档仪表盘', 'doc-dashboard', 'LayoutDashboard', 1, '/doc/dashboard', 'doc:dashboard:read', 'doc_overview'),
    ('文档列表', 'doc-list', 'FolderOpen', 2, '/doc/list', 'doc:dashboard:read', 'doc_master'),
    ('文档管理', 'doc-documents', 'FileText', 3, '/doc/documents', 'doc:document:read', 'doc_master'),
    ('文档中心', 'doc-document-center', 'FolderOpen', 4, '/doc/document-center', 'doc:center:read', 'doc_master'),
    ('知识库', 'doc-knowledge-base', 'BookOpen', 5, '/doc/knowledge-base', 'doc:dashboard:read', 'doc_master'),
    ('文件详情', 'doc-file-detail', 'FileText', 6, '/doc/documents/:id', 'doc:document:read', 'doc_master')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- workflow 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('流程概览', 'workflow_overview', 'FileText', 190),
    ('流程定义', 'workflow_process', 'FileText', 191),
    ('流程分析', 'workflow_analytics', 'FileText', 192),
    ('流程设置', 'workflow_setting', 'FileText', 193)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- workflow 菜单种子（11 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('流程仪表盘', 'workflow-dashboard', 'LayoutDashboard', 1, '/workflow/dashboard', 'workflow:dashboard:read', 'workflow_overview'),
    ('流程定义', 'workflow-definitions', 'FileCode', 2, '/workflow/definitions', 'workflow:definition:read', 'workflow_process'),
    ('流程设计器', 'workflow-designer', 'Pencil', 3, '/workflow/designer', 'workflow:definition:write', 'workflow_process'),
    ('版本历史', 'workflow-version-history', 'History', 4, '/workflow/version-history/:id?', 'workflow:definition:read', 'workflow_process'),
    ('流程实例', 'workflow-instances', 'PlaySquare', 5, '/workflow/instances', 'workflow:instance:read', 'workflow_process'),
    ('审批任务', 'workflow-approvals', 'CheckSquare', 6, '/workflow/approvals', 'workflow:approval:read', 'workflow_process'),
    ('流程通知', 'workflow-notification-center', 'Bell', 7, '/workflow/notification-center', 'workflow:notification:read', 'workflow_process'),
    ('流程监控', 'workflow-monitor', 'Activity', 8, '/workflow/monitor', 'workflow:monitor:read', 'workflow_analytics'),
    ('流程统计', 'workflow-statistics', 'BarChart3', 9, '/workflow/statistics', 'workflow:statistics:read', 'workflow_analytics'),
    ('流程模板', 'workflow-templates', 'Layers', 10, '/workflow/templates', 'workflow:template:read', 'workflow_setting'),
    ('流程设置', 'workflow-settings', 'Settings', 11, '/workflow/settings', 'workflow:dashboard:admin', 'workflow_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- ticket 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('工单概览', 'ticket_overview', 'FileText', 200),
    ('工单业务', 'ticket_business', 'FileText', 201)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- ticket 菜单种子（2 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('工单仪表盘', 'ticket-dashboard', 'LayoutDashboard', 1, '/ticket/dashboard', 'ticket:dashboard:read', 'ticket_overview'),
    ('工单中心', 'ticket-center', 'Ticket', 2, '/ticket/center', 'ticket:dashboard:read', 'ticket_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
