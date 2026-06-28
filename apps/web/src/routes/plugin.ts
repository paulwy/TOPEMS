import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const PluginManagementPage = lazy(() => import('../pages/admin/PluginManagementPage'));

const PluginMarketplacePage = lazy(() => import('../pages/shared/PluginMarketplacePage'));
const PluginDetailPage = lazy(() => import('../pages/plugin/PluginDetailPage'));
const PluginUploadPage = lazy(() => import('../pages/plugin/PluginUploadPage'));

export const pluginRoutes: RouteConfig[] = [
  {
    path: '/admin/plugins',
    element: PluginManagementPage,
    requiredPermissions: ['iam:system_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/plugin/marketplace',
    element: PluginMarketplacePage,
    requiredPermissions: ['plugin:read'],
    module: 'plugin',
    action: 'read',
  },
  {
    path: '/plugin/upload',
    element: PluginUploadPage,
    requiredPermissions: ['plugin:write'],
    module: 'plugin',
    action: 'write',
  },
  {
    path: '/plugin/:pluginCode',
    element: PluginDetailPage,
    requiredPermissions: ['plugin:read'],
    module: 'plugin',
    action: 'read',
  },
];
