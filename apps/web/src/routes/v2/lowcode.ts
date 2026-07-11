import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const lowcodeModuleConfig: RouteModuleConfig = {
  code: 'lowcode',
  name: '低代码平台',
  icon: 'Blocks',
  path: '/lowcode',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  frontendOnly: true,
  order: 17,
  description: '应用管理、页面设计、表单设计、数据模型',
  permission: 'lowcode:read',
  routes: [
    {
      path: '/lowcode/home',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/LowCodeHomePage'),
        'LowCodeHomePage'
      ),
      module: 'lowcode',
      title: '低代码首页',
      code: 'lowcode-home',
      requiredPermissions: ['lowcode:read'],
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: '/lowcode/app',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/AppManagementPage'),
        'AppManagementPage'
      ),
      module: 'lowcode',
      title: '应用管理',
      code: 'lowcode-app',
      requiredPermissions: ['lowcode:app:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lowcode/app-detail',
      element: lazyWithRetry(() => import('../../pages/lowcode/AppDetailPage'), 'AppDetailPage'),
      module: 'lowcode',
      title: '应用详情',
      code: 'lowcode-app-detail',
      requiredPermissions: ['lowcode:app:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/lowcode/app-overview',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/AppOverviewPage'),
        'AppOverviewPage'
      ),
      module: 'lowcode',
      title: '应用概览',
      code: 'lowcode-app-overview',
      requiredPermissions: ['lowcode:app:read'],
      template: 'dashboard',
      group: 'business',
    },
    {
      path: '/lowcode/page',
      element: lazyWithRetry(() => import('../../pages/lowcode/PageListPage'), 'PageListPage'),
      module: 'lowcode',
      title: '页面管理',
      code: 'lowcode-page',
      requiredPermissions: ['lowcode:page:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lowcode/page-designer',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/PageDesignerPage'),
        'PageDesignerPage'
      ),
      module: 'lowcode',
      title: '页面设计器',
      code: 'lowcode-page-designer',
      requiredPermissions: ['lowcode:page:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/lowcode/form',
      element: lazyWithRetry(() => import('../../pages/lowcode/FormListPage'), 'FormListPage'),
      module: 'lowcode',
      title: '表单管理',
      code: 'lowcode-form',
      requiredPermissions: ['lowcode:form:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lowcode/form-designer',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/FormDesignerPage'),
        'FormDesignerPage'
      ),
      module: 'lowcode',
      title: '表单设计器',
      code: 'lowcode-form-designer',
      requiredPermissions: ['lowcode:form:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/lowcode/data-model',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/DataModelListPage'),
        'DataModelListPage'
      ),
      module: 'lowcode',
      title: '数据模型',
      code: 'lowcode-data-model',
      requiredPermissions: ['lowcode:data-model:read'],
      template: 'list',
      group: 'settings',
    },
    {
      path: '/lowcode/data-model-designer',
      element: lazyWithRetry(
        () => import('../../pages/lowcode/DataModelDesignerPage'),
        'DataModelDesignerPage'
      ),
      module: 'lowcode',
      title: '数据模型设计器',
      code: 'lowcode-data-model-designer',
      requiredPermissions: ['lowcode:data-model:write'],
      template: 'form',
      group: 'settings',
    },
    {
      path: '/lowcode/data-source',
      element: lazyWithRetry(() => import('../../pages/lowcode/DataSourcePage'), 'DataSourcePage'),
      module: 'lowcode',
      title: '数据源',
      code: 'lowcode-data-source',
      requiredPermissions: ['lowcode:data-source:read'],
      template: 'list',
      group: 'settings',
    },
  ],
};
