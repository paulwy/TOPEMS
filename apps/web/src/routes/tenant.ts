import React from 'react';
import { lazy } from 'react';
import type { RouteConfig } from './utils';

const TenantManagementPage = lazy(() => import('../pages/admin/TenantManagementPage'));
const TenantDetailPage = lazy(() => import('../pages/admin/TenantDetailPage'));
const TenantSettingsPage = lazy(() => import('../pages/admin/TenantSettingsPage'));
const TenantBillingPage = lazy(() => import('../pages/admin/TenantBillingPage'));

export const tenantRoutes: RouteConfig[] = [
  {
    path: '/admin/tenants',
    element: TenantManagementPage,
    requiredPermissions: ['tenant:manage'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/admin/tenants/:tenantId',
    element: TenantDetailPage,
    requiredPermissions: ['tenant:manage'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/tenant/settings',
    element: TenantSettingsPage,
    requiredPermissions: ['tenant:settings'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/tenant/billing',
    element: TenantBillingPage,
    requiredPermissions: ['tenant:billing'],
    module: 'iam',
    action: 'read',
  },
];

export default tenantRoutes;
