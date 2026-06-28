import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const LowCodeHomePage = lazy(() => import('../pages/lowcode/LowCodeHomePage'));
const FormListPage = lazy(() => import('../pages/lowcode/FormListPage'));
const FormDesignerPage = lazy(() => import('../pages/lowcode/FormDesignerPage'));
const PageListPage = lazy(() => import('../pages/lowcode/PageListPage'));
const PageDesignerPage = lazy(() => import('../pages/lowcode/PageDesignerPage'));
const AppOverviewPage = lazy(() => import('../pages/lowcode/AppOverviewPage'));
const AppManagementPage = lazy(() => import('../pages/lowcode/AppManagementPage'));
const AppDetailPage = lazy(() => import('../pages/lowcode/AppDetailPage'));
const DataModelListPage = lazy(() => import('../pages/lowcode/DataModelListPage'));
const DataModelDesignerPage = lazy(() => import('../pages/lowcode/DataModelDesignerPage'));
const DataSourcePage = lazy(() => import('../pages/lowcode/DataSourcePage'));

export const lowcodeRoutes: RouteConfig[] = [
  {
    path: '/lowcode',
    element: AppOverviewPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/overview',
    element: AppOverviewPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/apps',
    element: AppManagementPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/apps/:appId',
    element: AppDetailPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/models',
    element: DataModelListPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/models/:modelId',
    element: DataModelDesignerPage,
    requiredPermissions: ['lowcode:write'],
    module: 'lowcode',
    action: 'write',
  },
  {
    path: '/lowcode/datasources',
    element: DataSourcePage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/forms',
    element: FormListPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/forms/new',
    element: FormDesignerPage,
    requiredPermissions: ['lowcode:write'],
    module: 'lowcode',
    action: 'write',
  },
  {
    path: '/lowcode/forms/:formId',
    element: FormDesignerPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/pages',
    element: PageListPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
  {
    path: '/lowcode/pages/new',
    element: PageDesignerPage,
    requiredPermissions: ['lowcode:write'],
    module: 'lowcode',
    action: 'write',
  },
  {
    path: '/lowcode/pages/:pageId',
    element: PageDesignerPage,
    requiredPermissions: ['lowcode:read'],
    module: 'lowcode',
    action: 'read',
  },
];
