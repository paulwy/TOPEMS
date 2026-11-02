-- 审计整改批 5（P1 菜单对账）：MENU_ORPHAN_FE iam/ai/integration/rd/notification/oa 补种
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE

-- iam 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('身份概览', 'iam_overview', 'FileText', 100),
    ('身份主数据', 'iam_master', 'FileText', 101)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- iam 菜单种子（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('身份仪表盘', 'iam-dashboard', 'LayoutDashboard', 1, '/iam/dashboard', 'iam:dashboard:read', 'iam_overview'),
    ('用户管理', 'iam-user', 'Users', 2, '/iam/user', 'iam:user:read', 'iam_master'),
    ('角色管理', 'iam-role', 'UserCheck', 3, '/iam/role', 'iam:role:read', 'iam_master'),
    ('权限管理', 'iam-permission', 'Key', 4, '/iam/permission', 'iam:permission:read', 'iam_master'),
    ('组织架构', 'iam-company-structure', 'Network', 5, '/iam/company-structure', 'iam:structure:read', 'iam_master')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- ai 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('AI 概览', 'ai_overview', 'FileText', 110),
    ('AI 流程', 'ai_process', 'FileText', 111),
    ('AI 业务', 'ai_business', 'FileText', 112),
    ('AI 设置', 'ai_setting', 'FileText', 113)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- ai 菜单种子（13 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('AI 仪表盘', 'ai-dashboard', 'LayoutDashboard', 1, '/ai/dashboard', 'ai:dashboard:read', 'ai_overview'),
    ('AI 对话', 'ai-chat', 'MessageSquare', 2, '/ai/chat', 'ai:chat:read', 'ai_process'),
    ('AI 代码', 'ai-code', 'Code', 3, '/ai/code', 'ai:code:read', 'ai_process'),
    ('AI 文档', 'ai-document', 'FileText', 4, '/ai/document', 'ai:document:read', 'ai_business'),
    ('知识库', 'ai-knowledge', 'BookOpen', 5, '/ai/knowledge', 'ai:knowledge:read', 'ai_business'),
    ('提示词管理', 'ai-prompts', 'Library', 6, '/ai/prompts', 'ai:prompt:read', 'ai_setting'),
    ('AI 设置', 'ai-settings', 'Settings', 7, '/ai/settings', 'ai:dashboard:admin', 'ai_setting'),
    ('智能助手', 'ai-assistant', 'Sparkles', 8, '/ai/assistant', 'ai:dashboard:read', 'ai_process'),
    ('Dify 对话', 'ai-dify-chat', 'Bot', 9, '/ai/dify-chat', 'ai:chat:read', 'ai_process'),
    ('业务 Copilot', 'ai-businessCopilot', 'Briefcase', 10, '/ai/businessCopilot', 'ai:dashboard:read', 'ai_business'),
    ('AI 治理看板', 'ai-governanceDashboard', 'Shield', 11, '/ai/governanceDashboard', 'ai:governance:read', 'ai_overview'),
    ('知识库检索', 'ai-dsh-knowledge', 'Network', 12, '/ai/dsh-knowledge', 'ai:knowledge:read', 'ai_business'),
    ('RAG 问答', 'ai-dsh-rag', 'Search', 13, '/ai/dsh-rag', 'ai:knowledge:read', 'ai_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- integration 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('集成概览', 'integration_overview', 'FileText', 120),
    ('集成主数据', 'integration_master', 'FileText', 121),
    ('集成分析', 'integration_analytics', 'FileText', 122),
    ('集成流程', 'integration_process', 'FileText', 123),
    ('集成设置', 'integration_setting', 'FileText', 124)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- integration 菜单种子（9 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('集成仪表盘', 'integration-dashboard', 'LayoutDashboard', 1, '/integration/dashboard', 'integration:dashboard:read', 'integration_overview'),
    ('连接管理', 'integration-connections', 'Plug', 2, '/integration/connections', 'integration:connection:read', 'integration_master'),
    ('映射配置', 'integration-mappings', 'GitMerge', 3, '/integration/mappings', 'integration:mapping:read', 'integration_master'),
    ('事件中心', 'integration-events', 'Activity', 4, '/integration/events', 'integration:event:read', 'integration_analytics'),
    ('ERP 集成', 'integration-erp', 'Building2', 5, '/integration/erp-overview', 'integration:erp:read', 'integration_process'),
    ('LIMS/QMS 集成', 'integration-lims-qms', 'FlaskConical', 6, '/integration/lims-qms', 'integration:lims:read', 'integration_process'),
    ('MES-ERP 集成', 'integration-mes-erp', 'Factory', 7, '/integration/mes-erp', 'integration:mes:read', 'integration_process'),
    ('WMS-SCM 集成', 'integration-wms-scm', 'Warehouse', 8, '/integration/wms-scm', 'integration:wms:read', 'integration_process'),
    ('集成设置', 'integration-settings', 'Settings', 9, '/integration/settings', 'integration:dashboard:admin', 'integration_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- rd 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('研发概览', 'rd_overview', 'FileText', 130),
    ('研发业务', 'rd_business', 'FileText', 131),
    ('研发主数据', 'rd_master', 'FileText', 132),
    ('研发流程', 'rd_process', 'FileText', 133),
    ('研发分析', 'rd_analytics', 'FileText', 134),
    ('研发设置', 'rd_setting', 'FileText', 135)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- rd 菜单种子（17 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('研发仪表盘', 'rd-dashboard', 'LayoutDashboard', 1, '/rd/dashboard', 'rd:dashboard:read', 'rd_overview'),
    ('研发总览', 'rd-overview', 'Grid3X3', 2, '/rd/overview', 'rd:overview:read', 'rd_overview'),
    ('项目管理', 'rd-project', 'FolderKanban', 3, '/rd/project', 'rd:project:read', 'rd_business'),
    ('实验管理', 'rd-experiment', 'FlaskRound', 4, '/rd/experiment', 'rd:experiment:read', 'rd_business'),
    ('配方管理', 'rd-formula', 'Beaker', 5, '/rd/formula', 'rd:formula:read', 'rd_master'),
    ('物料管理', 'rd-material', 'Layers', 6, '/rd/material', 'rd:material:read', 'rd_master'),
    ('代码管理', 'rd-code', 'Code2', 7, '/rd/code', 'rd:code:read', 'rd_business'),
    ('构建管理', 'rd-build', 'Hammer', 8, '/rd/build', 'rd:build:read', 'rd_process'),
    ('测试管理', 'rd-test', 'Bug', 9, '/rd/test', 'rd:test:read', 'rd_process'),
    ('缺陷管理', 'rd-bug', 'AlertTriangle', 10, '/rd/bug', 'rd:bug:read', 'rd_process'),
    ('代码评审', 'rd-review', 'GitBranch', 11, '/rd/review', 'rd:review:read', 'rd_process'),
    ('部署管理', 'rd-deploy', 'CloudUpload', 12, '/rd/deploy', 'rd:deploy:read', 'rd_process'),
    ('发布管理', 'rd-release', 'Rocket', 13, '/rd/release', 'rd:release:read', 'rd_process'),
    ('里程碑', 'rd-milestone', 'Flag', 14, '/rd/milestone', 'rd:milestone:read', 'rd_process'),
    ('研发文档', 'rd-doc', 'FileText', 15, '/rd/doc', 'rd:doc:read', 'rd_business'),
    ('研发报表', 'rd-report', 'BarChart3', 16, '/rd/report', 'rd:report:read', 'rd_analytics'),
    ('研发设置', 'rd-settings', 'Settings', 17, '/rd/settings', 'rd:settings:read', 'rd_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- notification 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('通知概览', 'notification_overview', 'FileText', 140),
    ('通知设置', 'notification_setting', 'FileText', 141),
    ('通知分析', 'notification_analytics', 'FileText', 142)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- notification 菜单种子（7 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('通知仪表盘', 'notification-dashboard', 'LayoutDashboard', 1, '/notification/dashboard', 'notification:dashboard:read', 'notification_overview'),
    ('通知列表', 'notification-list', 'ScrollText', 2, '/notification/list', 'notification:dashboard:read', 'notification_setting'),
    ('通知归档', 'notification-archive', 'Archive', 3, '/notification/archive', 'notification:dashboard:read', 'notification_setting'),
    ('通知中心', 'notification-center', 'Bell', 4, '/notification/center', 'notification:dashboard:read', 'notification_setting'),
    ('通知模板', 'notification-templates', 'FileText', 5, '/notification/templates', 'notification:dashboard:read', 'notification_setting'),
    ('通知统计', 'notification-statistics', 'BarChart3', 6, '/notification/statistics', 'notification:dashboard:read', 'notification_analytics'),
    ('通知设置', 'notification-settings', 'Settings', 7, '/notification/settings', 'notification:dashboard:read', 'notification_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- oa 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('OA 概览', 'oa_overview', 'FileText', 150),
    ('OA 业务', 'oa_business', 'FileText', 151),
    ('OA 主数据', 'oa_master', 'FileText', 152),
    ('OA 流程', 'oa_process', 'FileText', 153)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- oa 菜单种子（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('OA 仪表盘', 'oa-dashboard', 'LayoutDashboard', 1, '/oa/dashboard', 'oa:dashboard:read', 'oa_overview'),
    ('公文管理', 'oa-documents', 'FileText', 2, '/oa/documents', 'oa:document:read', 'oa_business'),
    ('公告管理', 'oa-announcements', 'FileText', 3, '/oa/announcements', 'oa:announcement:read', 'oa_master'),
    ('会议管理', 'oa-meetings', 'FileText', 4, '/oa/meetings', 'oa:meeting:read', 'oa_process'),
    ('车辆管理', 'oa-vehicles', 'FileText', 5, '/oa/vehicles', 'oa:vehicle:read', 'oa_business')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
