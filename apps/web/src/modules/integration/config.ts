import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
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
interface IntegrationDashboardPageProps {}

interface IntegrationConnectionsPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface IntegrationMappingsPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface IntegrationEventsPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface IntegrationErpOverviewPageProps {
  id?: string;
  entityType?: string;
}

interface IntegrationLimsQmsPageProps {
  id?: string;
  entityType?: string;
}

interface IntegrationMesErpPageProps {
  id?: string;
  entityType?: string;
}

interface IntegrationWmsScmPageProps {
  id?: string;
  entityType?: string;
}

interface IntegrationSettingsPageProps {}

const integrationDashboardRoute: RouteConfigV2<IntegrationDashboardPageProps> = {
  path: INTEGRATION_PATHS.dashboard,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationDashboardPage'),
    'IntegrationDashboardPage'
  ),
  module: 'integration',
  code: 'integration-dashboard',
  title: i18n.t('integration.nav.integration-dashboard'),
  titleKey: 'integration.nav.integration-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['integration:dashboard:read'],
  action: 'read',
};

const integrationConnectionsRoute: RouteConfigV2<IntegrationConnectionsPageProps> = {
  path: INTEGRATION_PATHS.connections,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationConnectionsPage'),
    'IntegrationConnectionsPage'
  ),
  module: 'integration',
  code: 'integration-connections',
  title: i18n.t('integration.nav.integration-connections'),
  titleKey: 'integration.nav.integration-connections',
  template: 'list',
  group: 'master',
  requiredPermissions: ['integration:connection:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationMappingsRoute: RouteConfigV2<IntegrationMappingsPageProps> = {
  path: INTEGRATION_PATHS.mappings,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationMappingsPage'),
    'IntegrationMappingsPage'
  ),
  module: 'integration',
  code: 'integration-mappings',
  title: i18n.t('integration.nav.integration-mappings'),
  titleKey: 'integration.nav.integration-mappings',
  template: 'list',
  group: 'master',
  requiredPermissions: ['integration:mapping:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationEventsRoute: RouteConfigV2<IntegrationEventsPageProps> = {
  path: INTEGRATION_PATHS.events,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationEventsPage'),
    'IntegrationEventsPage'
  ),
  module: 'integration',
  code: 'integration-events',
  title: i18n.t('integration.nav.integration-events'),
  titleKey: 'integration.nav.integration-events',
  template: 'list',
  group: 'analytics',
  requiredPermissions: ['integration:event:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationErpOverviewRoute: RouteConfigV2<IntegrationErpOverviewPageProps> = {
  path: INTEGRATION_PATHS.erpOverview,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationErpOverviewPage'),
    'IntegrationErpOverviewPage'
  ),
  module: 'integration',
  code: 'integration-erp',
  title: i18n.t('integration.nav.integration-erp'),
  titleKey: 'integration.nav.integration-erp',
  template: 'detail',
  group: 'process',
  requiredPermissions: ['integration:erp:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationLimsQmsRoute: RouteConfigV2<IntegrationLimsQmsPageProps> = {
  path: INTEGRATION_PATHS.limsQms,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationLimsQmsPage'),
    'IntegrationLimsQmsPage'
  ),
  module: 'integration',
  code: 'integration-lims-qms',
  title: i18n.t('integration.nav.integration-lims-qms'),
  titleKey: 'integration.nav.integration-lims-qms',
  template: 'detail',
  group: 'process',
  requiredPermissions: ['integration:lims:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationMesErpRoute: RouteConfigV2<IntegrationMesErpPageProps> = {
  path: INTEGRATION_PATHS.mesErp,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationMesErpPage'),
    'IntegrationMesErpPage'
  ),
  module: 'integration',
  code: 'integration-mes-erp',
  title: i18n.t('integration.nav.integration-mes-erp'),
  titleKey: 'integration.nav.integration-mes-erp',
  template: 'detail',
  group: 'process',
  requiredPermissions: ['integration:mes:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationWmsScmRoute: RouteConfigV2<IntegrationWmsScmPageProps> = {
  path: INTEGRATION_PATHS.wmsScm,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationWmsScmPage'),
    'IntegrationWmsScmPage'
  ),
  module: 'integration',
  code: 'integration-wms-scm',
  title: i18n.t('integration.nav.integration-wms-scm'),
  titleKey: 'integration.nav.integration-wms-scm',
  template: 'detail',
  group: 'process',
  requiredPermissions: ['integration:wms:read', 'integration:dashboard:read'],
  action: 'read',
};

const integrationSettingsRoute: RouteConfigV2<IntegrationSettingsPageProps> = {
  path: INTEGRATION_PATHS.settings,
  element: lazyWithRetry(
    () => import('@/pages/integration/IntegrationSettingsPage'),
    'IntegrationSettingsPage'
  ),
  module: 'integration',
  code: 'integration-settings',
  title: i18n.t('integration.nav.integration-settings'),
  titleKey: 'integration.nav.integration-settings',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['integration:dashboard:admin'],
  action: 'admin',
};

// ---- 路由配置（供路由系统使用） ----
export const integrationModuleConfig: RouteModuleConfig = {
  code: 'integration',
  name: i18n.t('shared.config.integration_name'),
  nameKey: 'shared.config.integration_name',
  icon: 'Plug',
  path: INTEGRATION_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 6,
  description: i18n.t('integration.nav.module_name_desc'),
  permission: 'integration:dashboard:read',
  routes: [
    integrationDashboardRoute,
    integrationConnectionsRoute,
    integrationMappingsRoute,
    integrationEventsRoute,
    integrationErpOverviewRoute,
    integrationLimsQmsRoute,
    integrationMesErpRoute,
    integrationWmsScmRoute,
    integrationSettingsRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const integrationNavConfig: ModuleNavConfig = {
  code: 'integration',
  name: i18n.t('integration.nav.module_name'),
  nameKey: 'integration.nav.module_name',
  icon: 'Plug',
  path: INTEGRATION_PATHS.root,
  permission: 'integration:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 6,
  description: i18n.t('integration.nav.module_name_desc'),
  navItems: [
    {
      code: 'integration-dashboard',
      label: i18n.t('integration.nav.integration-dashboard'),
      labelKey: 'integration.nav.integration-dashboard',
      icon: 'LayoutDashboard',
      path: INTEGRATION_PATHS.dashboard,
      permission: 'integration:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('integration.nav.integration-dashboard_desc'),
    },
    {
      code: 'integration-connections',
      label: i18n.t('integration.nav.integration-connections'),
      labelKey: 'integration.nav.integration-connections',
      icon: 'Plug',
      path: INTEGRATION_PATHS.connections,
      permission: 'integration:connection:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('integration.nav.integration-connections_desc'),
    },
    {
      code: 'integration-mappings',
      label: i18n.t('integration.nav.integration-mappings'),
      labelKey: 'integration.nav.integration-mappings',
      icon: 'GitMerge',
      path: INTEGRATION_PATHS.mappings,
      permission: 'integration:mapping:read',
      order: 2,
      group: 'master',
      description: i18n.t('integration.nav.integration-mappings_desc'),
    },
    {
      code: 'integration-events',
      label: i18n.t('integration.nav.integration-events'),
      labelKey: 'integration.nav.integration-events',
      icon: 'Activity',
      path: INTEGRATION_PATHS.events,
      permission: 'integration:event:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('integration.nav.integration-events_desc'),
    },
    {
      code: 'integration-erp',
      label: i18n.t('integration.nav.integration-erp'),
      labelKey: 'integration.nav.integration-erp',
      icon: 'Building2',
      path: INTEGRATION_PATHS.erpOverview,
      permission: 'integration:erp:read',
      order: 1,
      group: 'process',
      description: i18n.t('integration.nav.integration-erp_desc'),
    },
    {
      code: 'integration-lims-qms',
      label: i18n.t('integration.nav.integration-lims-qms'),
      labelKey: 'integration.nav.integration-lims-qms',
      icon: 'FlaskConical',
      path: INTEGRATION_PATHS.limsQms,
      permission: 'integration:lims:read',
      order: 2,
      group: 'process',
      description: i18n.t('integration.nav.integration-lims-qms_desc'),
    },
    {
      code: 'integration-mes-erp',
      label: i18n.t('integration.nav.integration-mes-erp'),
      labelKey: 'integration.nav.integration-mes-erp',
      icon: 'Factory',
      path: INTEGRATION_PATHS.mesErp,
      permission: 'integration:mes:read',
      order: 3,
      group: 'process',
      description: i18n.t('integration.nav.integration-mes-erp_desc'),
    },
    {
      code: 'integration-wms-scm',
      label: i18n.t('integration.nav.integration-wms-scm'),
      labelKey: 'integration.nav.integration-wms-scm',
      icon: 'Warehouse',
      path: INTEGRATION_PATHS.wmsScm,
      permission: 'integration:wms:read',
      order: 4,
      group: 'process',
      description: i18n.t('integration.nav.integration-wms-scm_desc'),
    },
    {
      code: 'integration-settings',
      label: i18n.t('integration.nav.integration-settings'),
      labelKey: 'integration.nav.integration-settings',
      icon: 'Settings',
      path: INTEGRATION_PATHS.settings,
      permission: 'integration:dashboard:admin',
      order: 1,
      group: 'setting',
      description: i18n.t('integration.nav.integration-settings_desc'),
    },
  ],
};
