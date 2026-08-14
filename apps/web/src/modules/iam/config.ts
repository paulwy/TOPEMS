import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

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
  name: i18n.t('shared.config.k0'),
  icon: 'Shield',
  path: IAM_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: i18n.t('shared.config.k1'),
  permission: 'iam:dashboard:read',
  routes: [
    {
      path: IAM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/admin/DashboardPage'), 'DashboardPage'),
      module: 'iam',
      code: 'iam-dashboard',
      title: i18n.t('shared.config.k2'),
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['iam:dashboard:read'],
      action: 'read',
    },
    {
      path: IAM_PATHS.user,
      element: lazyWithRetry(() => import('@/pages/iam/UserManagementPage'), 'UserManagementPage'),
      module: 'iam',
      title: i18n.t('shared.config.k3'),
      code: 'iam-user',
      requiredPermissions: ['iam:user:read', 'iam:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    },
    {
      path: IAM_PATHS.role,
      element: lazyWithRetry(() => import('@/pages/iam/RoleManagementPage'), 'RoleManagementPage'),
      module: 'iam',
      title: i18n.t('shared.config.k4'),
      code: 'iam-role',
      requiredPermissions: ['iam:role:read', 'iam:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    },
    {
      path: IAM_PATHS.permission,
      element: lazyWithRetry(
        () => import('@/pages/iam/PermissionManagementPage'),
        'PermissionManagementPage'
      ),
      module: 'iam',
      title: i18n.t('shared.config.k5'),
      code: 'iam-permission',
      requiredPermissions: ['iam:permission:read', 'iam:dashboard:read'],
      action: 'read',
      template: 'tree',
      group: 'master',
    },
    {
      path: IAM_PATHS.companyStructure,
      element: lazyWithRetry(
        () => import('@/pages/iam/CompanyStructurePage'),
        'CompanyStructurePage'
      ),
      module: 'iam',
      title: i18n.t('shared.config.k6'),
      code: 'iam-company-structure',
      requiredPermissions: ['iam:structure:read', 'iam:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const iamNavConfig: ModuleNavConfig = {
  code: 'iam',
  name: i18n.t('shared.config.k7'),
  icon: 'Shield',
  path: IAM_PATHS.root,
  permission: 'iam:dashboard:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: i18n.t('shared.config.k8'),
  navItems: [
    {
      code: 'iam-user',
      label: i18n.t('shared.config.k9'),
      icon: 'Users',
      path: IAM_PATHS.user,
      permission: 'iam:user:read',
      order: 10,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k10'),
    },
    {
      code: 'iam-role',
      label: i18n.t('shared.config.k11'),
      icon: 'UserCheck',
      path: IAM_PATHS.role,
      permission: 'iam:role:read',
      order: 11,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k12'),
    },
    {
      code: 'iam-permission',
      label: i18n.t('shared.config.k13'),
      icon: 'Key',
      path: IAM_PATHS.permission,
      permission: 'iam:permission:read',
      order: 12,
      group: 'master',
      description: i18n.t('shared.config.k14'),
    },
    {
      code: 'iam-company-structure',
      label: i18n.t('shared.config.k15'),
      icon: 'Network',
      path: IAM_PATHS.companyStructure,
      permission: 'iam:structure:read',
      order: 15,
      group: 'master',
      description: i18n.t('shared.config.k16'),
    },
  ],
};
