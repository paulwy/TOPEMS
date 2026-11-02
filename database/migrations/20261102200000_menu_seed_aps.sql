-- 审计整改批 5：MODULE_ORPHAN aps 补种（aps 前端独立模块，后端由 svc/mes 承载，DB 缺菜单种子）
-- 幂等：ON CONFLICT (tenant_id, code) DO UPDATE
INSERT INTO core_menu_groups (tenant_id, name, code, icon, sort_order, status)
SELECT '00000000-0000-0000-0000-000000000001', v.name, v.code, v.icon, v.sort_order, 'active'
FROM (VALUES
    ('排产概览', 'aps_overview', 'LayoutDashboard', 210),
    ('排产业务', 'aps_business', 'CalendarCheck', 211),
    ('排产分析', 'aps_analytics', 'BarChart3', 212)
) AS v(name, code, icon, sort_order)
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

INSERT INTO core_menus (id, tenant_id, group_id, name, code, path, icon, sort_order, status, permissions)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000001', g.id, v.name, v.code, v.path, v.icon, v.sort_order, 'active',
       json_build_object('permission', v.permission)
FROM (VALUES
    ('排产仪表盘', 'aps-dashboard', 'LayoutDashboard', 1, '/aps/dashboard', 'aps:dashboard:read', 'aps_overview'),
    ('生产计划', 'aps-production-plans', 'ClipboardList', 2, '/aps/production-plans', 'aps:production_plan:read', 'aps_business'),
    ('排程管理', 'aps-schedules', 'CalendarCheck', 3, '/aps/schedules', 'aps:schedule:read', 'aps_business'),
    ('产能管理', 'aps-capacities', 'Gauge', 4, '/aps/capacities', 'aps:capacity:read', 'aps_business'),
    ('物料计划', 'aps-material-plans', 'Package', 5, '/aps/material-plans', 'aps:material_plan:read', 'aps_business'),
    ('需求预测', 'aps-forecasts', 'TrendingUp', 6, '/aps/forecasts', 'aps:forecast:read', 'aps_analytics'),
    ('计划达成率', 'aps-analytics-plan-adherence', 'BarChart3', 7, '/aps/analytics/plan-adherence', 'aps:dashboard:read', 'aps_analytics'),
    ('排程甘特图', 'aps-analytics-schedule-gantt', 'GanttChart', 8, '/aps/analytics/schedule-gantt', 'aps:schedule:read', 'aps_analytics'),
    ('产能利用率', 'aps-analytics-capacity-utilization', 'Gauge', 9, '/aps/analytics/capacity-utilization', 'aps:capacity:read', 'aps_analytics'),
    ('物料短缺', 'aps-analytics-material-shortage', 'AlertTriangle', 10, '/aps/analytics/material-shortage', 'aps:material_plan:read', 'aps_analytics'),
    ('预测准确度', 'aps-analytics-forecast-accuracy', 'Target', 11, '/aps/analytics/forecast-accuracy', 'aps:forecast:read', 'aps_analytics'),
    ('OEE 看板', 'aps-analytics-oee-dashboard', 'Activity', 12, '/aps/analytics/oee-dashboard', 'aps:dashboard:read', 'aps_analytics')
) AS v(name, code, icon, sort_order, path, permission, group_code)
JOIN core_menu_groups g ON g.code = v.group_code AND g.tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, code) DO UPDATE
  SET path = EXCLUDED.path, permissions = EXCLUDED.permissions, group_id = EXCLUDED.group_id;
