import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const MonitorDashboardPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorDashboardPage'),
  'MonitorDashboardPage'
);
const MonitorAlertsPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorAlertsPage'),
  'MonitorAlertsPage'
);
const MonitorAlertRulesPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorAlertRulesPage'),
  'MonitorAlertRulesPage'
);
const MonitorAlertHistoryPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorAlertHistoryPage'),
  'MonitorAlertHistoryPage'
);
const MonitorMetricsPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorMetricsPage'),
  'MonitorMetricsPage'
);
const MonitorLogsPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorLogsPage'),
  'MonitorLogsPage'
);
const MonitorSettingsPage = lazyWithRetry(
  () => import('../../pages/monitor/MonitorSettingsPage'),
  'MonitorSettingsPage'
);

export const monitorModuleConfig: RouteModuleConfig = {
  code: 'monitor',
  name: '系统监控',
  icon: 'Activity',
  path: '/monitor',
  source: 'core',
  status: 'online',
  order: 5,
  description: '告警管理、指标监控、系统日志、健康检查',
  permission: 'monitor:read',
  routes: [
    {
      path: '/monitor/dashboard',
      element: MonitorDashboardPage,
      module: 'monitor',
      code: 'monitor-dashboard',
      title: '监控仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['monitor:read'],
    },
    {
      path: '/monitor/alerts',
      element: MonitorAlertsPage,
      module: 'monitor',
      code: 'monitor-alerts',
      title: '告警中心',
      template: 'list',
      group: 'alerts',
      requiredPermissions: ['monitor:alert:read'],
    },
    {
      path: '/monitor/alerts/history',
      element: MonitorAlertHistoryPage,
      module: 'monitor',
      code: 'monitor-alert-history',
      title: '告警历史',
      template: 'list',
      group: 'alerts',
      requiredPermissions: ['monitor:alert:read'],
    },
    {
      path: '/monitor/rules',
      element: MonitorAlertRulesPage,
      module: 'monitor',
      code: 'monitor-rules',
      title: '告警规则',
      template: 'list',
      group: 'alerts',
      requiredPermissions: ['monitor:rule:read'],
    },
    {
      path: '/monitor/metrics',
      element: MonitorMetricsPage,
      module: 'monitor',
      code: 'monitor-metrics',
      title: '指标监控',
      template: 'stats',
      group: 'metrics',
      requiredPermissions: ['monitor:metric:read'],
    },
    {
      path: '/monitor/logs',
      element: MonitorLogsPage,
      module: 'monitor',
      code: 'monitor-logs',
      title: '系统日志',
      template: 'list',
      group: 'logs',
      requiredPermissions: ['monitor:log:read'],
    },
    {
      path: '/monitor/settings',
      element: MonitorSettingsPage,
      module: 'monitor',
      code: 'monitor-settings',
      title: '监控设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['monitor:admin'],
    },
  ],
};
