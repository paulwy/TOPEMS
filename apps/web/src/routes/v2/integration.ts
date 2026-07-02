import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const IntegrationDashboardPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationDashboardPage'),
  'IntegrationDashboardPage'
);
const IntegrationConnectionsPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationConnectionsPage'),
  'IntegrationConnectionsPage'
);
const IntegrationMappingsPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationMappingsPage'),
  'IntegrationMappingsPage'
);
const IntegrationEventsPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationEventsPage'),
  'IntegrationEventsPage'
);
const IntegrationErpOverviewPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationErpOverviewPage'),
  'IntegrationErpOverviewPage'
);
const IntegrationLimsQmsPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationLimsQmsPage'),
  'IntegrationLimsQmsPage'
);
const IntegrationMesErpPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationMesErpPage'),
  'IntegrationMesErpPage'
);
const IntegrationWmsScmPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationWmsScmPage'),
  'IntegrationWmsScmPage'
);
const IntegrationSettingsPage = lazyWithRetry(
  () => import('../../pages/integration/IntegrationSettingsPage'),
  'IntegrationSettingsPage'
);

export const integrationModuleConfig: RouteModuleConfig = {
  code: 'integration',
  name: '集成平台',
  icon: 'Plug',
  path: '/integration',
  source: 'core',
  status: 'online',
  order: 6,
  description: '系统集成、数据同步、API管理',
  permission: 'integration:read',
  routes: [
    {
      path: '/integration/dashboard',
      element: IntegrationDashboardPage,
      module: 'integration',
      code: 'integration-dashboard',
      title: '集成概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['integration:read'],
    },
    {
      path: '/integration/connections',
      element: IntegrationConnectionsPage,
      module: 'integration',
      code: 'integration-connections',
      title: '连接管理',
      template: 'list',
      group: 'connections',
      requiredPermissions: ['integration:connection:read'],
    },
    {
      path: '/integration/mappings',
      element: IntegrationMappingsPage,
      module: 'integration',
      code: 'integration-mappings',
      title: '数据映射',
      template: 'list',
      group: 'mappings',
      requiredPermissions: ['integration:mapping:read'],
    },
    {
      path: '/integration/events',
      element: IntegrationEventsPage,
      module: 'integration',
      code: 'integration-events',
      title: '事件日志',
      template: 'list',
      group: 'logs',
      requiredPermissions: ['integration:event:read'],
    },
    {
      path: '/integration/erp-overview',
      element: IntegrationErpOverviewPage,
      module: 'integration',
      code: 'integration-erp',
      title: 'ERP集成',
      template: 'detail',
      group: 'scenarios',
      requiredPermissions: ['integration:erp:read'],
    },
    {
      path: '/integration/lims-qms',
      element: IntegrationLimsQmsPage,
      module: 'integration',
      code: 'integration-lims-qms',
      title: 'LIMS-QMS集成',
      template: 'detail',
      group: 'scenarios',
      requiredPermissions: ['integration:lims:read'],
    },
    {
      path: '/integration/mes-erp',
      element: IntegrationMesErpPage,
      module: 'integration',
      code: 'integration-mes-erp',
      title: 'MES-ERP集成',
      template: 'detail',
      group: 'scenarios',
      requiredPermissions: ['integration:mes:read'],
    },
    {
      path: '/integration/wms-scm',
      element: IntegrationWmsScmPage,
      module: 'integration',
      code: 'integration-wms-scm',
      title: 'WMS-SCM集成',
      template: 'detail',
      group: 'scenarios',
      requiredPermissions: ['integration:wms:read'],
    },
    {
      path: '/integration/settings',
      element: IntegrationSettingsPage,
      module: 'integration',
      code: 'integration-settings',
      title: '集成设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['integration:admin'],
    },
  ],
};
