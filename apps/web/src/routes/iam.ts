import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const UserManagementPage = lazy(() => import('../pages/admin/UserManagementPage'));
const IamDashboardPage = lazy(() => import('../pages/iam/DashboardPage'));
const RoleManagementPage = lazy(() => import('../pages/admin/RoleManagementPage'));
const PermissionManagementPage = lazy(() => import('../pages/admin/PermissionManagementPage'));
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'));
const SystemManagementPage = lazy(() => import('../pages/admin/SystemManagementPage'));
const DictionaryManagementPage = lazy(() => import('../pages/admin/DictionaryManagementPage'));
const DatabaseStructurePage = lazy(() => import('../pages/admin/DatabaseStructurePage'));
const MigrationAdminPage = lazy(() => import('../pages/admin/MigrationAdminPage'));
const ConfigDebugPage = lazy(() => import('../pages/admin/ConfigDebugPage'));
const PluginMarketplacePage = lazy(() => import('../pages/shared/PluginMarketplacePage'));
const AccountManagementPage = lazy(() => import('../pages/admin/AccountManagementPage'));
const BankAccountManagementPage = lazy(() => import('../pages/admin/BankAccountManagementPage'));

export const iamRoutes: RouteConfig[] = [
  {
    path: '/iam',
    element: IamDashboardPage,
    requiredPermissions: ['iam:users_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/users',
    element: UserManagementPage,
    requiredPermissions: ['iam:users_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/roles',
    element: RoleManagementPage,
    requiredPermissions: ['iam:roles_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/permissions',
    element: PermissionManagementPage,
    requiredPermissions: ['iam:permissions_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/audit',
    element: AuditLogPage,
    requiredPermissions: ['iam:audit_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/system',
    element: SystemManagementPage,
    requiredPermissions: ['iam:system_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/dictionaries',
    element: DictionaryManagementPage,
    requiredPermissions: ['iam:dictionaries_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/database',
    element: DatabaseStructurePage,
    requiredPermissions: ['iam:system_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/migration',
    element: MigrationAdminPage,
    requiredPermissions: ['iam:system_update'],
    module: 'iam',
    action: 'update',
  },
  {
    path: '/iam/debug',
    element: ConfigDebugPage,
    requiredPermissions: ['iam:system_update'],
    module: 'iam',
    action: 'update',
  },
  {
    path: '/iam/plugins',
    element: PluginMarketplacePage,
    requiredPermissions: ['iam:plugins_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/accounts',
    element: AccountManagementPage,
    requiredPermissions: ['iam:users_read'],
    module: 'iam',
    action: 'read',
  },
  {
    path: '/iam/bank-accounts',
    element: BankAccountManagementPage,
    requiredPermissions: ['iam:users_read'],
    module: 'iam',
    action: 'read',
  },
];
