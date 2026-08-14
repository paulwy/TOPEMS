import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 INTEGRATION_PATHS.xxx，而非硬编码字符串
export const INTEGRATION_PATHS = {
  root: '/integration',
  dashboard: '/integration/dashboard',
  connections: '/integration/connections',
  mappings: '/integration/mappings',
  events: '/integration/events',
  erpOverview: '/integration/erp-overview',
  externalErp: '/integration/external-erp',
  limsQms: '/integration/lims-qms',
  mesErp: '/integration/mes-erp',
  wmsScm: '/integration/wms-scm',
  settings: '/integration/settings',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const integrationModuleConfig: RouteModuleConfig = {
  code: 'integration',
  name: i18n.t('shared.config.k0'),
  icon: 'Plug',
  path: INTEGRATION_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.api_1'),
  permission: 'integration:dashboard:read',
  routes: [
    {
      path: INTEGRATION_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationDashboardPage'),
        'IntegrationDashboardPage'
      ),
      module: 'integration',
      code: 'integration-dashboard',
      title: i18n.t('shared.config.k2'),
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.connections,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationConnectionsPage'),
        'IntegrationConnectionsPage'
      ),
      module: 'integration',
      code: 'integration-connections',
      title: i18n.t('shared.config.k3'),
      template: 'list',
      group: 'master',
      requiredPermissions: ['integration:connection:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.mappings,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationMappingsPage'),
        'IntegrationMappingsPage'
      ),
      module: 'integration',
      code: 'integration-mappings',
      title: i18n.t('shared.config.k4'),
      template: 'list',
      group: 'master',
      requiredPermissions: ['integration:mapping:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.events,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationEventsPage'),
        'IntegrationEventsPage'
      ),
      module: 'integration',
      code: 'integration-events',
      title: i18n.t('shared.config.k5'),
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['integration:event:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.erpOverview,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationErpOverviewPage'),
        'IntegrationErpOverviewPage'
      ),
      module: 'integration',
      code: 'integration-erp',
      title: i18n.t('shared.config.erp_0'),
      template: 'detail',
      group: 'process',
      requiredPermissions: ['integration:erp:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.limsQms,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationLimsQmsPage'),
        'IntegrationLimsQmsPage'
      ),
      module: 'integration',
      code: 'integration-lims-qms',
      title: i18n.t('shared.config.limsqms_1'),
      template: 'detail',
      group: 'process',
      requiredPermissions: ['integration:lims:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.mesErp,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationMesErpPage'),
        'IntegrationMesErpPage'
      ),
      module: 'integration',
      code: 'integration-mes-erp',
      title: i18n.t('shared.config.meserp_2'),
      template: 'detail',
      group: 'process',
      requiredPermissions: ['integration:mes:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.wmsScm,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationWmsScmPage'),
        'IntegrationWmsScmPage'
      ),
      module: 'integration',
      code: 'integration-wms-scm',
      title: i18n.t('shared.config.wmsscm_3'),
      template: 'detail',
      group: 'process',
      requiredPermissions: ['integration:wms:read', 'integration:dashboard:read'],
      action: 'read',
    },
    {
      path: INTEGRATION_PATHS.settings,
      element: lazyWithRetry(
        () => import('@/pages/integration/IntegrationSettingsPage'),
        'IntegrationSettingsPage'
      ),
      module: 'integration',
      code: 'integration-settings',
      title: i18n.t('shared.config.k6'),
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['integration:dashboard:admin'],
      action: 'admin',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const integrationNavConfig: ModuleNavConfig = {
  code: 'integration',
  name: i18n.t('shared.config.k7'),
  icon: 'Plug',
  path: INTEGRATION_PATHS.root,
  permission: 'integration:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.api_8'),
  navItems: [
    {
      code: 'integration-dashboard',
      label: i18n.t('shared.config.k9'),
      icon: 'LayoutDashboard',
      path: INTEGRATION_PATHS.dashboard,
      permission: 'integration:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k10'),
    },
    {
      code: 'integration-connections',
      label: i18n.t('shared.config.k11'),
      icon: 'Plug',
      path: INTEGRATION_PATHS.connections,
      permission: 'integration:connection:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k12'),
    },
    {
      code: 'integration-mappings',
      label: i18n.t('shared.config.k13'),
      icon: 'GitMerge',
      path: INTEGRATION_PATHS.mappings,
      permission: 'integration:mapping:read',
      order: 1,
      group: 'master',
      description: i18n.t('shared.config.k14'),
    },
    {
      code: 'integration-events',
      label: i18n.t('shared.config.k15'),
      icon: 'Activity',
      path: INTEGRATION_PATHS.events,
      permission: 'integration:event:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k16'),
    },
    {
      code: 'integration-erp',
      label: i18n.t('shared.config.erp_4'),
      icon: 'Building2',
      path: INTEGRATION_PATHS.erpOverview,
      permission: 'integration:erp:read',
      order: 1,
      group: 'process',
      description: i18n.t('shared.config.erp_5'),
    },
    {
      code: 'integration-lims-qms',
      label: i18n.t('shared.config.k17'),
      icon: 'FlaskConical',
      path: INTEGRATION_PATHS.limsQms,
      permission: 'integration:lims:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.limsqms_6'),
    },
    {
      code: 'integration-mes-erp',
      label: i18n.t('shared.config.k18'),
      icon: 'Factory',
      path: INTEGRATION_PATHS.mesErp,
      permission: 'integration:mes:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.meserp_7'),
    },
    {
      code: 'integration-wms-scm',
      label: i18n.t('shared.config.k19'),
      icon: 'Warehouse',
      path: INTEGRATION_PATHS.wmsScm,
      permission: 'integration:wms:read',
      order: 4,
      group: 'process',
      description: i18n.t('shared.config.wmsscm_8'),
    },
    {
      code: 'integration-settings',
      label: i18n.t('shared.config.k20'),
      icon: 'Settings',
      path: INTEGRATION_PATHS.settings,
      permission: 'integration:dashboard:admin',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k21'),
    },
  ],
};
