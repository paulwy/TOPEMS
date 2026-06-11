import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const UserManagementPage = lazy(() => import('../pages/UserManagementPage'));
const RoleManagementPage = lazy(() => import('../pages/RoleManagementPage'));
const PermissionManagementPage = lazy(() => import('../pages/PermissionManagementPage'));
const AuditLogPage = lazy(() => import('../pages/AuditLogPage'));
const SystemManagementPage = lazy(() => import('../pages/SystemManagementPage'));
const DictionaryManagementPage = lazy(() => import('../pages/DictionaryManagementPage'));
const DatabaseStructurePage = lazy(() => import('../pages/DatabaseStructurePage'));
const MigrationAdminPage = lazy(() => import('../pages/MigrationAdminPage'));
const ConfigDebugPage = lazy(() => import('../pages/ConfigDebugPage'));

export const iamRoutes: RouteConfig[] = [
  {
    path: '/users',
    element: React.createElement(UserManagementPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/roles',
    element: React.createElement(RoleManagementPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/permissions',
    element: React.createElement(PermissionManagementPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/audit',
    element: React.createElement(AuditLogPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/system',
    element: React.createElement(SystemManagementPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/dictionaries',
    element: React.createElement(DictionaryManagementPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/database',
    element: React.createElement(DatabaseStructurePage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/migration',
    element: React.createElement(MigrationAdminPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
  {
    path: '/debug',
    element: React.createElement(ConfigDebugPage),
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
];
