-- 审计整改批 5（P1 菜单对账）：MENU_ORPHAN_FE admin/master/automation/monitor 补种
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE

-- admin 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('系统概览', 'admin_overview', 'FileText', 60),
    ('系统主数据', 'admin_master', 'FileText', 61),
    ('系统设置', 'admin_setting', 'FileText', 62),
    ('系统分析', 'admin_analytics', 'FileText', 63)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- admin 菜单种子（20 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('系统仪表盘', 'admin-dashboard', 'LayoutDashboard', 1, '/admin/dashboard', 'admin:dashboard:read', 'admin_overview'),
    ('租户管理', 'admin-tenant', 'Building2', 2, '/admin/tenant', 'admin:tenant:read', 'admin_master'),
    ('租户计费', 'admin-tenant-billing', 'Wallet', 3, '/admin/tenant-billing', 'admin:tenant:read', 'admin_master'),
    ('账号管理', 'admin-account', 'UserCircle', 4, '/admin/account', 'admin:account:read', 'admin_master'),
    ('平台银行账户', 'admin-bank-account', 'CreditCard', 5, '/admin/bank-account', 'admin:bank:read', 'admin_master'),
    ('平台字典', 'admin-dictionary', 'BookOpen', 6, '/admin/dictionary', 'admin:dictionary:read', 'admin_setting'),
    ('系统信息', 'admin-system', 'Server', 7, '/admin/system', 'admin:system:read', 'admin_setting'),
    ('系统设置', 'admin-system-settings', 'Settings2', 8, '/admin/system-settings', 'admin:system:write', 'admin_setting'),
    ('插件管理', 'admin-plugin', 'Puzzle', 9, '/admin/plugin', 'admin:plugin:read', 'admin_setting'),
    ('数据库管理', 'admin-database', 'Database', 10, '/admin/database', 'admin:database:read', 'admin_master'),
    ('迁移管理', 'admin-migration', 'RefreshCw', 11, '/admin/migration', 'admin:migration:read', 'admin_setting'),
    ('配置调试', 'admin-config-debug', 'Bug', 12, '/admin/config-debug', 'admin:debug:read', 'admin_setting'),
    ('审计日志', 'admin-audit-log', 'ScrollText', 13, '/admin/audit-log', 'admin:audit:read', 'admin_analytics'),
    ('限流策略', 'admin-rate-limit', 'ShieldCheck', 14, '/admin/rate-limit', 'admin:system:write', 'admin_setting'),
    ('功能开关', 'admin-feature-flag', 'ToggleLeft', 15, '/admin/feature-flag', 'system:read', 'admin_setting'),
    ('菜单管理', 'admin-menu', 'Menu', 16, '/admin/menu', 'system:read', 'admin_setting'),
    ('系统监控', 'admin-monitor', 'Activity', 17, '/admin/monitor', 'admin:monitor:read', 'admin_analytics'),
    ('性能监控', 'admin-performance', 'Gauge', 18, '/admin/performance', 'admin:monitor:read', 'admin_analytics'),
    ('权限审计', 'admin-permission-audit', 'Shield', 19, '/admin/permission-audit', 'admin:audit:read', 'admin_analytics'),
    ('监控告警', 'admin-monitoring-alert', 'AlertTriangle', 20, '/admin/monitoring-alert', 'admin:monitor:read', 'admin_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- master 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('主数据管理', 'master_data_master', 'FileText', 70)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- master 菜单种子（12 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('数据资产目录', 'master-data-asset-catalog', 'Database', 1, '/master/data-asset-catalog', 'master-data:data-asset:read', 'master_data_master'),
    ('元数据注册', 'master-schema-registry', 'Database', 2, '/master/schema-registry', 'master-data:schema:read', 'master_data_master'),
    ('血缘分析', 'master-lineage-analytics', 'AccountTree', 3, '/master/lineage-analytics', 'master-data:lineage:read', 'master_data_master'),
    ('AI 治理', 'master-ai-governance', 'AutoAwesome', 4, '/master/ai-governance', 'master-data:ai_governance:read', 'master_data_master'),
    ('商业主数据', 'master-commercial', 'Storefront', 5, '/master/commercial', 'master-data:commercial:read', 'master_data_master'),
    ('公共主数据', 'master-public-master-data', 'Boxes', 6, '/master/public-master-data', 'master-data:data-asset:read', 'master_data_master'),
    ('版本管理', 'master-versioning', 'History', 7, '/master/versioning', 'master-data:versioning:read', 'master_data_master'),
    ('主数据治理', 'master-governance', 'Gauge', 8, '/master/governance', 'master-data:governance:read', 'master_data_master'),
    ('数据质量', 'master-quality', 'ShieldCheck', 9, '/master/quality', 'master-data:quality:read', 'master_data_master'),
    ('知识图谱', 'master-knowledge-graph', 'Network', 10, '/master/knowledge-graph', 'master-data:knowledge:read', 'master_data_master'),
    ('语义检索', 'master-semantic-search', 'Search', 11, '/master/semantic-search', 'master-data:semantic:read', 'master_data_master'),
    ('灾备管理', 'master-disaster-recovery', 'LifeBuoy', 12, '/master/disaster-recovery', 'master-data:disaster:read', 'master_data_master')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- automation 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('自动化概览', 'automation_overview', 'FileText', 80),
    ('自动化流程', 'automation_process', 'FileText', 81),
    ('自动化分析', 'automation_analytics', 'FileText', 82),
    ('自动化设置', 'automation_setting', 'FileText', 83)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- automation 菜单种子（5 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('自动化仪表盘', 'automation-dashboard', 'LayoutDashboard', 1, '/automation/dashboard', 'automation:dashboard:read', 'automation_overview'),
    ('规则管理', 'automation-rules', 'Zap', 2, '/automation/rules', 'automation:rule:read', 'automation_process'),
    ('运行记录', 'automation-runs', 'History', 3, '/automation/runs', 'automation:run:read', 'automation_analytics'),
    ('流程设计器', 'automation-designer', 'Workflow', 4, '/automation/designer', 'automation:rule:write', 'automation_process'),
    ('变量管理', 'automation-variables', 'KeyRound', 5, '/automation/variables', 'automation:variable:read', 'automation_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;

-- monitor 菜单组
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('监控概览', 'monitor_overview', 'FileText', 90),
    ('监控流程', 'monitor_process', 'FileText', 91),
    ('监控业务', 'monitor_business', 'FileText', 92),
    ('监控设置', 'monitor_setting', 'FileText', 93),
    ('监控分析', 'monitor_analytics', 'FileText', 94)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- monitor 菜单种子（7 项）
INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('监控仪表盘', 'monitor-dashboard', 'LayoutDashboard', 1, '/monitor/dashboard', 'monitor:dashboard:read', 'monitor_overview'),
    ('告警管理', 'monitor-alerts', 'AlertTriangle', 2, '/monitor/alerts', 'monitor:alert:read', 'monitor_process'),
    ('告警历史', 'monitor-alert-history', 'History', 3, '/monitor/alerts/history', 'monitor:alert:read', 'monitor_business'),
    ('告警规则', 'monitor-rules', 'Settings', 4, '/monitor/rules', 'monitor:rule:read', 'monitor_setting'),
    ('指标监控', 'monitor-metrics', 'BarChart3', 5, '/monitor/metrics', 'monitor:metric:read', 'monitor_analytics'),
    ('日志查询', 'monitor-logs', 'FileText', 6, '/monitor/logs', 'monitor:log:read', 'monitor_analytics'),
    ('监控设置', 'monitor-settings', 'Settings', 7, '/monitor/settings', 'monitor:dashboard:admin', 'monitor_setting')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
