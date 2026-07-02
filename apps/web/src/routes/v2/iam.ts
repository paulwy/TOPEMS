import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const IamDashboardPage = lazyWithRetry(
  () => import('../../pages/admin/DashboardPage'),
  'DashboardPage'
);
const UserManagementPage = lazyWithRetry(
  () => import('../../pages/iam/UserManagementPage'),
  'UserManagementPage'
);
const RoleManagementPage = lazyWithRetry(
  () => import('../../pages/iam/RoleManagementPage'),
  'RoleManagementPage'
);
const PermissionManagementPage = lazyWithRetry(
  () => import('../../pages/iam/PermissionManagementPage'),
  'PermissionManagementPage'
);
const CompanyStructurePage = lazyWithRetry(
  () => import('../../pages/iam/CompanyStructurePage'),
  'CompanyStructurePage'
);

export const iamModuleConfig: RouteModuleConfig = {
  code: 'iam',
  name: '身份与权限',
  icon: 'Shield',
  path: '/iam',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: '用户管理、角色管理、权限管理、组织架构',
  permission: 'iam:read',
  routes: [
    {
      path: '/iam/dashboard',
      element: IamDashboardPage,
      module: 'iam',
      code: 'iam-dashboard',
      title: '身份权限概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['iam:read'],
    },
    {
      path: '/iam/user',
      element: UserManagementPage,
      module: 'iam',
      title: '用户管理',
      code: 'iam-user',
      requiredPermissions: ['iam:user:read'],
      template: 'list',
      group: 'user',
    },
    {
      path: '/iam/role',
      element: RoleManagementPage,
      module: 'iam',
      title: '角色管理',
      code: 'iam-role',
      requiredPermissions: ['iam:role:read'],
      template: 'list',
      group: 'permission',
    },
    {
      path: '/iam/permission',
      element: PermissionManagementPage,
      module: 'iam',
      title: '权限管理',
      code: 'iam-permission',
      requiredPermissions: ['iam:permission:read'],
      template: 'tree',
      group: 'permission',
    },
    {
      path: '/iam/company-structure',
      element: CompanyStructurePage,
      module: 'iam',
      title: '组织架构',
      code: 'iam-company-structure',
      requiredPermissions: ['iam:structure:read'],
      template: 'list',
      group: 'organization',
    },
  ],
};
