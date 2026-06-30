import { lazyWithRetry } from '../utils';
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
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
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
      nav: {
        label: '告警中心',
        icon: 'AlertTriangle',
        order: 1,
        group: 'alerts',
        showInTabs: true,
      },
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
      nav: {
        label: '告警历史',
        icon: 'History',
        order: 2,
        group: 'alerts',
      },
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
      nav: {
        label: '告警规则',
        icon: 'Settings',
        order: 3,
        group: 'alerts',
      },
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
      nav: {
        label: '指标监控',
        icon: 'BarChart3',
        order: 1,
        group: 'metrics',
        showInTabs: true,
      },
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
      nav: {
        label: '系统日志',
        icon: 'FileText',
        order: 1,
        group: 'logs',
        showInTabs: true,
      },
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
      nav: {
        label: '监控设置',
        icon: 'Settings',
        order: 1,
        group: 'settings',
      },
    },
  ],
};
