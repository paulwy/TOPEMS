import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 MONITOR_PATHS.xxx，而非硬编码字符串
export const MONITOR_PATHS = {
  root: '/monitor',
  dashboard: '/monitor/dashboard',
  alerts: '/monitor/alerts',
  alertHistory: '/monitor/alerts/history',
  rules: '/monitor/rules',
  metrics: '/monitor/metrics',
  logs: '/monitor/logs',
  settings: '/monitor/settings',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const monitorModuleConfig: RouteModuleConfig = {
  code: 'monitor',
  name: '系统监控',
  icon: 'Activity',
  path: MONITOR_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 5,
  description: '告警管理、指标监控、系统日志、健康检查',
  permission: 'monitor:dashboard:read',
  routes: [
    {
      path: MONITOR_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorDashboardPage'),
        'MonitorDashboardPage'
      ),
      module: 'monitor',
      code: 'monitor-dashboard',
      title: '监控仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.alerts,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertsPage'),
        'MonitorAlertsPage'
      ),
      module: 'monitor',
      code: 'monitor-alerts',
      title: '告警中心',
      template: 'list',
      group: 'process',
      requiredPermissions: ['monitor:alert:read', 'monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.alertHistory,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertHistoryPage'),
        'MonitorAlertHistoryPage'
      ),
      module: 'monitor',
      code: 'monitor-alert-history',
      title: '告警历史',
      template: 'list',
      group: 'business',
      requiredPermissions: ['monitor:alert:read', 'monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.rules,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertRulesPage'),
        'MonitorAlertRulesPage'
      ),
      module: 'monitor',
      code: 'monitor-rules',
      title: '告警规则',
      template: 'list',
      group: 'setting',
      requiredPermissions: ['monitor:rule:read', 'monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.metrics,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorMetricsPage'),
        'MonitorMetricsPage'
      ),
      module: 'monitor',
      code: 'monitor-metrics',
      title: '指标监控',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['monitor:metric:read', 'monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.logs,
      element: lazyWithRetry(() => import('@/pages/monitor/MonitorLogsPage'), 'MonitorLogsPage'),
      module: 'monitor',
      code: 'monitor-logs',
      title: '系统日志',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['monitor:log:read', 'monitor:dashboard:read'],
      action: 'read',
    },
    {
      path: MONITOR_PATHS.settings,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorSettingsPage'),
        'MonitorSettingsPage'
      ),
      module: 'monitor',
      code: 'monitor-settings',
      title: '监控设置',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['monitor:dashboard:admin'],
      action: 'admin',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const monitorNavConfig: ModuleNavConfig = {
  code: 'monitor',
  name: '系统监控',
  icon: 'Activity',
  path: MONITOR_PATHS.root,
  permission: 'monitor:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 5,
  description: '告警管理、指标监控、系统日志、健康检查',
  navItems: [
    {
      code: 'monitor-dashboard',
      label: '系统监控概览',
      icon: 'LayoutDashboard',
      path: MONITOR_PATHS.dashboard,
      permission: 'monitor:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '监控仪表盘',
    },
    {
      code: 'monitor-alerts',
      label: '告警中心',
      icon: 'AlertTriangle',
      path: MONITOR_PATHS.alerts,
      permission: 'monitor:alert:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: '告警中心',
    },
    {
      code: 'monitor-alert-history',
      label: '告警历史',
      icon: 'History',
      path: MONITOR_PATHS.alertHistory,
      permission: 'monitor:alert:read',
      order: 2,
      group: 'business',
      description: '告警历史记录',
    },
    {
      code: 'monitor-rules',
      label: '告警规则',
      icon: 'Settings',
      path: MONITOR_PATHS.rules,
      permission: 'monitor:rule:read',
      order: 3,
      group: 'setting',
      description: '告警规则管理',
    },
    {
      code: 'monitor-metrics',
      label: '指标监控',
      icon: 'BarChart3',
      path: MONITOR_PATHS.metrics,
      permission: 'monitor:metric:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: '指标监控',
    },
    {
      code: 'monitor-logs',
      label: '系统日志',
      icon: 'FileText',
      path: MONITOR_PATHS.logs,
      permission: 'monitor:log:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: '系统日志',
    },
    {
      code: 'monitor-settings',
      label: '监控设置',
      icon: 'Settings',
      path: MONITOR_PATHS.settings,
      permission: 'monitor:dashboard:admin',
      order: 1,
      group: 'setting',
      description: '监控设置',
    },
  ],
};
