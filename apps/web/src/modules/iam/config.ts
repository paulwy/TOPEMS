import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
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
export interface DashboardPageProps {}

interface UserManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface RoleManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface PermissionManagementPageProps {}

interface CompanyStructurePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: IAM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/admin/DashboardPage'), 'DashboardPage'),
  module: 'iam',
  code: 'iam-dashboard',
  title: i18n.t('iam.nav.iam-dashboard'),
  titleKey: 'iam.nav.iam-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['iam:dashboard:read'],
  action: 'read',
};

const userManagementRoute: RouteConfigV2<UserManagementPageProps> = {
  path: IAM_PATHS.user,
  element: lazyWithRetry(() => import('@/pages/iam/UserManagementPage'), 'UserManagementPage'),
  module: 'iam',
  title: i18n.t('iam.nav.iam-user'),
  titleKey: 'iam.nav.iam-user',
  code: 'iam-user',
  requiredPermissions: ['iam:user:read', 'iam:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const roleManagementRoute: RouteConfigV2<RoleManagementPageProps> = {
  path: IAM_PATHS.role,
  element: lazyWithRetry(() => import('@/pages/iam/RoleManagementPage'), 'RoleManagementPage'),
  module: 'iam',
  title: i18n.t('iam.nav.iam-role'),
  titleKey: 'iam.nav.iam-role',
  code: 'iam-role',
  requiredPermissions: ['iam:role:read', 'iam:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const permissionManagementRoute: RouteConfigV2<PermissionManagementPageProps> = {
  path: IAM_PATHS.permission,
  element: lazyWithRetry(
    () => import('@/pages/iam/PermissionManagementPage'),
    'PermissionManagementPage'
  ),
  module: 'iam',
  title: i18n.t('iam.nav.iam-permission'),
  titleKey: 'iam.nav.iam-permission',
  code: 'iam-permission',
  requiredPermissions: ['iam:permission:read', 'iam:dashboard:read'],
  action: 'read',
  template: 'tree',
  group: 'master',
};

const companyStructureRoute: RouteConfigV2<CompanyStructurePageProps> = {
  path: IAM_PATHS.companyStructure,
  element: lazyWithRetry(() => import('@/pages/iam/CompanyStructurePage'), 'CompanyStructurePage'),
  module: 'iam',
  title: i18n.t('iam.nav.iam-company-structure'),
  titleKey: 'iam.nav.iam-company-structure',
  code: 'iam-company-structure',
  requiredPermissions: ['iam:structure:read', 'iam:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

// ---- 路由配置（供路由系统使用） ----
export const iamModuleConfig: RouteModuleConfig = {
  code: 'iam',
  name: i18n.t('shared.config.iam_name'),
  nameKey: 'shared.config.iam_name',
  icon: 'Shield',
  path: IAM_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: i18n.t('iam.nav.iam-dashboard_desc'),
  permission: 'iam:dashboard:read',
  preloadNamespaces: ['admin'],
  routes: [
    dashboardRoute,
    userManagementRoute,
    roleManagementRoute,
    permissionManagementRoute,
    companyStructureRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const iamNavConfig: ModuleNavConfig = {
  code: 'iam',
  name: i18n.t('iam.nav.module_name'),
  nameKey: 'iam.nav.module_name',
  icon: 'Shield',
  path: IAM_PATHS.root,
  permission: 'iam:dashboard:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 1,
  description: i18n.t('iam.nav.module_name_desc'),
  navItems: [
    {
      code: 'iam-dashboard',
      label: i18n.t('iam.nav.iam-dashboard'),
      labelKey: 'iam.nav.iam-dashboard',
      icon: 'LayoutDashboard',
      path: IAM_PATHS.dashboard,
      permission: 'iam:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('iam.nav.iam-dashboard_desc'),
    },
    {
      code: 'iam-user',
      label: i18n.t('iam.nav.iam-user'),
      labelKey: 'iam.nav.iam-user',
      icon: 'Users',
      path: IAM_PATHS.user,
      permission: 'iam:user:read',
      order: 10,
      group: 'master',
      showInTabs: true,
      description: i18n.t('iam.nav.iam-user_desc'),
    },
    {
      code: 'iam-role',
      label: i18n.t('iam.nav.iam-role'),
      labelKey: 'iam.nav.iam-role',
      icon: 'UserCheck',
      path: IAM_PATHS.role,
      permission: 'iam:role:read',
      order: 11,
      group: 'master',
      showInTabs: true,
      description: i18n.t('iam.nav.iam-role_desc'),
    },
    {
      code: 'iam-permission',
      label: i18n.t('iam.nav.iam-permission'),
      labelKey: 'iam.nav.iam-permission',
      icon: 'Key',
      path: IAM_PATHS.permission,
      permission: 'iam:permission:read',
      order: 12,
      group: 'master',
      description: i18n.t('iam.nav.iam-permission_desc'),
    },
    {
      code: 'iam-company-structure',
      label: i18n.t('iam.nav.iam-company-structure'),
      labelKey: 'iam.nav.iam-company-structure',
      icon: 'Network',
      path: IAM_PATHS.companyStructure,
      permission: 'iam:structure:read',
      order: 15,
      group: 'master',
      description: i18n.t('iam.nav.iam-company-structure_desc'),
    },
  ],
};
