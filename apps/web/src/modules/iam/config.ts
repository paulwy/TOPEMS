import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 IAM_PATHS.xxx，而非硬编码字符串
export const IAM_PATHS = {
  root: '/iam',
  dashboard: '/iam/dashboard',
  user: '/iam/user',
  role: '/iam/role',
  permission: '/iam/permission',
  companyStructure: '/iam/company-structure',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const iamModuleConfig: RouteModuleConfig = {
  code: 'iam',
  name: '身份与权限',
  icon: 'Shield',
  path: IAM_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: '用户管理、角色管理、权限管理、组织架构',
  permission: 'iam:read',
  routes: [
    {
      path: IAM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/admin/DashboardPage'), 'DashboardPage'),
      module: 'iam',
      code: 'iam-dashboard',
      title: '身份权限概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['iam:read'],
      action: 'read',
    },
    {
      path: IAM_PATHS.user,
      element: lazyWithRetry(() => import('@/pages/iam/UserManagementPage'), 'UserManagementPage'),
      module: 'iam',
      title: '用户管理',
      code: 'iam-user',
      requiredPermissions: ['iam:user:read', 'iam:read'],
      action: 'read',
      template: 'list',
      group: 'user',
    },
    {
      path: IAM_PATHS.role,
      element: lazyWithRetry(() => import('@/pages/iam/RoleManagementPage'), 'RoleManagementPage'),
      module: 'iam',
      title: '角色管理',
      code: 'iam-role',
      requiredPermissions: ['iam:role:read', 'iam:read'],
      action: 'read',
      template: 'list',
      group: 'permission',
    },
    {
      path: IAM_PATHS.permission,
      element: lazyWithRetry(
        () => import('@/pages/iam/PermissionManagementPage'),
        'PermissionManagementPage'
      ),
      module: 'iam',
      title: '权限管理',
      code: 'iam-permission',
      requiredPermissions: ['iam:permission:read', 'iam:read'],
      action: 'read',
      template: 'tree',
      group: 'permission',
    },
    {
      path: IAM_PATHS.companyStructure,
      element: lazyWithRetry(
        () => import('@/pages/iam/CompanyStructurePage'),
        'CompanyStructurePage'
      ),
      module: 'iam',
      title: '组织架构',
      code: 'iam-company-structure',
      requiredPermissions: ['iam:structure:read', 'iam:read'],
      action: 'read',
      template: 'list',
      group: 'organization',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const iamNavConfig: ModuleNavConfig = {
  code: 'iam',
  name: '身份与权限',
  icon: 'Shield',
  path: IAM_PATHS.root,
  permission: 'iam:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: '用户管理、角色管理、权限管理、组织架构',
  navItems: [
    {
      code: 'iam-user',
      label: '用户管理',
      icon: 'Users',
      path: IAM_PATHS.user,
      permission: 'iam:user:read',
      order: 10,
      group: 'business',
      showInTabs: true,
      description: '系统用户管理',
    },
    {
      code: 'iam-role',
      label: '角色管理',
      icon: 'UserCheck',
      path: IAM_PATHS.role,
      permission: 'iam:role:read',
      order: 11,
      group: 'business',
      showInTabs: true,
      description: '角色权限管理',
    },
    {
      code: 'iam-permission',
      label: '权限管理',
      icon: 'Key',
      path: IAM_PATHS.permission,
      permission: 'iam:permission:read',
      order: 12,
      group: 'business',
      description: '权限点管理',
    },
    {
      code: 'iam-company-structure',
      label: '公司结构',
      icon: 'Network',
      path: IAM_PATHS.companyStructure,
      permission: 'iam:structure:read',
      order: 15,
      group: 'business',
      description: '公司组织结构',
    },
  ],
};
