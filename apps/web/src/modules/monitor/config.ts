import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 MONITOR_PATHS.xxx，而非硬编码字符串
/** MonitorDashboardPage 路由 Props · 模板=dashboard */
interface MonitorDashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** MonitorAlertsPage 路由 Props · 模板=list */
interface MonitorAlertsPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MonitorAlertHistoryPage 路由 Props · 模板=list */
interface MonitorAlertHistoryPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MonitorAlertRulesPage 路由 Props · 模板=list */
interface MonitorAlertRulesPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MonitorMetricsPage 路由 Props · 模板=stats */
interface MonitorMetricsPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** MonitorLogsPage 路由 Props · 模板=list */
interface MonitorLogsPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MonitorSettingsPage 路由 Props · 模板=settings */
interface MonitorSettingsPageProps {
  /** 当前定位的设置分组 key */
  section?: string;
  /** 设置面板主题（预留） */
  theme?: 'light' | 'dark';
}
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
  name: i18n.t('shared.config.monitor_name'),
  nameKey: 'shared.config.monitor_name',
  icon: 'Activity',
  path: MONITOR_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 5,
  description: i18n.t('monitor.nav.module_name_desc'),
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
      title: i18n.t('monitor.nav.monitor-dashboard'),
      titleKey: 'monitor.nav.monitor-dashboard',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorDashboardPageProps>,
    {
      path: MONITOR_PATHS.alerts,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertsPage'),
        'MonitorAlertsPage'
      ),
      module: 'monitor',
      code: 'monitor-alerts',
      title: i18n.t('monitor.nav.monitor-alerts'),
      titleKey: 'monitor.nav.monitor-alerts',
      template: 'list',
      group: 'process',
      requiredPermissions: ['monitor:alert:read', 'monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorAlertsPageProps>,
    {
      path: MONITOR_PATHS.alertHistory,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertHistoryPage'),
        'MonitorAlertHistoryPage'
      ),
      module: 'monitor',
      code: 'monitor-alert-history',
      title: i18n.t('monitor.nav.monitor-alert-history'),
      titleKey: 'monitor.nav.monitor-alert-history',
      template: 'list',
      group: 'business',
      requiredPermissions: ['monitor:alert:read', 'monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorAlertHistoryPageProps>,
    {
      path: MONITOR_PATHS.rules,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorAlertRulesPage'),
        'MonitorAlertRulesPage'
      ),
      module: 'monitor',
      code: 'monitor-rules',
      title: i18n.t('monitor.nav.monitor-rules'),
      titleKey: 'monitor.nav.monitor-rules',
      template: 'list',
      group: 'setting',
      requiredPermissions: ['monitor:rule:read', 'monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorAlertRulesPageProps>,
    {
      path: MONITOR_PATHS.metrics,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorMetricsPage'),
        'MonitorMetricsPage'
      ),
      module: 'monitor',
      code: 'monitor-metrics',
      title: i18n.t('monitor.nav.monitor-metrics'),
      titleKey: 'monitor.nav.monitor-metrics',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['monitor:metric:read', 'monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorMetricsPageProps>,
    {
      path: MONITOR_PATHS.logs,
      element: lazyWithRetry(() => import('@/pages/monitor/MonitorLogsPage'), 'MonitorLogsPage'),
      module: 'monitor',
      code: 'monitor-logs',
      title: i18n.t('monitor.nav.monitor-logs'),
      titleKey: 'monitor.nav.monitor-logs',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['monitor:log:read', 'monitor:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<MonitorLogsPageProps>,
    {
      path: MONITOR_PATHS.settings,
      element: lazyWithRetry(
        () => import('@/pages/monitor/MonitorSettingsPage'),
        'MonitorSettingsPage'
      ),
      module: 'monitor',
      code: 'monitor-settings',
      title: i18n.t('monitor.nav.monitor-settings'),
      titleKey: 'monitor.nav.monitor-settings',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['monitor:dashboard:admin'],
      action: 'admin',
    } satisfies RouteConfigV2<MonitorSettingsPageProps>,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const monitorNavConfig: ModuleNavConfig = {
  code: 'monitor',
  name: i18n.t('monitor.nav.module_name'),
  nameKey: 'monitor.nav.module_name',
  icon: 'Activity',
  path: MONITOR_PATHS.root,
  permission: 'monitor:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 5,
  description: i18n.t('monitor.nav.module_name_desc'),
  navItems: [
    {
      code: 'monitor-dashboard',
      label: i18n.t('monitor.nav.monitor-dashboard'),
      labelKey: 'monitor.nav.monitor-dashboard',
      icon: 'LayoutDashboard',
      path: MONITOR_PATHS.dashboard,
      permission: 'monitor:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('monitor.nav.monitor-dashboard_desc'),
    },
    {
      code: 'monitor-alerts',
      label: i18n.t('monitor.nav.monitor-alerts'),
      labelKey: 'monitor.nav.monitor-alerts',
      icon: 'AlertTriangle',
      path: MONITOR_PATHS.alerts,
      permission: 'monitor:alert:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('monitor.nav.monitor-alerts_desc'),
    },
    {
      code: 'monitor-alert-history',
      label: i18n.t('monitor.nav.monitor-alert-history'),
      labelKey: 'monitor.nav.monitor-alert-history',
      icon: 'History',
      path: MONITOR_PATHS.alertHistory,
      permission: 'monitor:alert:read',
      order: 2,
      group: 'business',
      description: i18n.t('monitor.nav.monitor-alert-history_desc'),
    },
    {
      code: 'monitor-rules',
      label: i18n.t('monitor.nav.monitor-rules'),
      labelKey: 'monitor.nav.monitor-rules',
      icon: 'Settings',
      path: MONITOR_PATHS.rules,
      permission: 'monitor:rule:read',
      order: 3,
      group: 'setting',
      description: i18n.t('monitor.nav.monitor-rules_desc'),
    },
    {
      code: 'monitor-metrics',
      label: i18n.t('monitor.nav.monitor-metrics'),
      labelKey: 'monitor.nav.monitor-metrics',
      icon: 'BarChart3',
      path: MONITOR_PATHS.metrics,
      permission: 'monitor:metric:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('monitor.nav.monitor-metrics_desc'),
    },
    {
      code: 'monitor-logs',
      label: i18n.t('monitor.nav.monitor-logs'),
      labelKey: 'monitor.nav.monitor-logs',
      icon: 'FileText',
      path: MONITOR_PATHS.logs,
      permission: 'monitor:log:read',
      order: 2,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('monitor.nav.monitor-logs_desc'),
    },
    {
      code: 'monitor-settings',
      label: i18n.t('monitor.nav.monitor-settings'),
      labelKey: 'monitor.nav.monitor-settings',
      icon: 'Settings',
      path: MONITOR_PATHS.settings,
      permission: 'monitor:dashboard:admin',
      order: 1,
      group: 'setting',
      description: i18n.t('monitor.nav.monitor-settings_desc'),
    },
  ],
};
