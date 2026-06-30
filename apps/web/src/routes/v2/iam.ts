import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const IamDashboardPage = lazyWithRetry(
  () => import('../../pages/iam/IamDashboardPage'),
  'IamDashboardPage'
);
const IamUsersPage = lazyWithRetry(
  () => import('../../pages/iam/IamUsersPage'),
  'IamUsersPage'
);
const IamRolesPage = lazyWithRetry(
  () => import('../../pages/iam/IamRolesPage'),
  'IamRolesPage'
);
const IamPermissionsPage = lazyWithRetry(
  () => import('../../pages/iam/IamPermissionsPage'),
  'IamPermissionsPage'
);
const RoleManagementPage = lazyWithRetry(
  () => import('../../pages/admin/RoleManagementPage'),
  'RoleManagementPage'
);
const PermissionManagementPage = lazyWithRetry(
  () => import('../../pages/admin/PermissionManagementPage'),
  'PermissionManagementPage'
);
const AuditLogPage = lazyWithRetry(
  () => import('../../pages/admin/AuditLogPage'),
  'AuditLogPage'
);
const SystemManagementPage = lazyWithRetry(
  () => import('../../pages/admin/SystemManagementPage'),
  'SystemManagementPage'
);
const DictionaryManagementPage = lazyWithRetry(
  () => import('../../pages/admin/DictionaryManagementPage'),
  'DictionaryManagementPage'
);
const DatabaseStructurePage = lazyWithRetry(
  () => import('../../pages/admin/DatabaseStructurePage'),
  'DatabaseStructurePage'
);
const MigrationAdminPage = lazyWithRetry(
  () => import('../../pages/admin/MigrationAdminPage'),
  'MigrationAdminPage'
);
const ConfigDebugPage = lazyWithRetry(
  () => import('../../pages/admin/ConfigDebugPage'),
  'ConfigDebugPage'
);
const PluginMarketplacePage = lazyWithRetry(
  () => import('../../pages/shared/PluginMarketplacePage'),
  'PluginMarketplacePage'
);
const IamAuditLogsPage = lazyWithRetry(
  () => import('../../pages/iam/IamAuditLogsPage'),
  'IamAuditLogsPage'
);
const IamSystemSettingsPage = lazyWithRetry(
  () => import('../../pages/iam/IamSystemSettingsPage'),
  'IamSystemSettingsPage'
);
const IamDictionariesPage = lazyWithRetry(
  () => import('../../pages/iam/IamDictionariesPage'),
  'IamDictionariesPage'
);
const IamAccountsPage = lazyWithRetry(
  () => import('../../pages/iam/IamAccountsPage'),
  'IamAccountsPage'
);
const IamBankAccountsPage = lazyWithRetry(
  () => import('../../pages/iam/IamBankAccountsPage'),
  'IamBankAccountsPage'
);

export const iamModuleConfig: RouteModuleConfig = {
  code: 'iam',
  name: '身份权限',
  icon: 'Shield',
  path: '/iam',
  source: 'core',
  status: 'online',
  order: 1,
  description: '用户、角色、权限、组织架构管理',
  permission: 'iam:read',
  routes: [
    {
      path: '/iam/dashboard',
      element: IamDashboardPage,
      module: 'iam',
      code: 'iam-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['iam:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/iam/users',
      element: IamUsersPage,
      module: 'iam',
      code: 'iam-users',
      title: '用户管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['iam:user:read'],
      nav: {
        label: '用户管理',
        icon: 'Users',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/iam/roles',
      element: IamRolesPage,
      module: 'iam',
      code: 'iam-roles',
      title: '角色管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['iam:role:read'],
      nav: {
        label: '角色管理',
        icon: 'UserCheck',
        order: 2,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/iam/permissions',
      element: IamPermissionsPage,
      module: 'iam',
      code: 'iam-permissions',
      title: '权限管理',
      template: 'tree',
      group: 'business',
      requiredPermissions: ['iam:permission:read'],
      nav: {
        label: '权限管理',
        icon: 'Key',
        order: 3,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/iam/accounts',
      element: IamAccountsPage,
      module: 'iam',
      code: 'iam-accounts',
      title: '账号管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['iam:account:read'],
      nav: {
        label: '账号管理',
        icon: 'UserCircle',
        order: 4,
        group: 'business',
      },
    },
    {
      path: '/iam/bank-accounts',
      element: IamBankAccountsPage,
      module: 'iam',
      code: 'iam-bank-accounts',
      title: '银行账号',
      template: 'list',
      group: 'business',
      requiredPermissions: ['iam:bank:read'],
      nav: {
        label: '银行账号',
        icon: 'CreditCard',
        order: 5,
        group: 'business',
      },
    },
    {
      path: '/iam/dictionaries',
      element: IamDictionariesPage,
      module: 'iam',
      code: 'iam-dictionaries',
      title: '数据字典',
      template: 'tree',
      group: 'settings',
      requiredPermissions: ['iam:dictionary:read'],
      nav: {
        label: '数据字典',
        icon: 'BookOpen',
        order: 1,
        group: 'settings',
      },
    },
    {
      path: '/iam/audit-logs',
      element: IamAuditLogsPage,
      module: 'iam',
      code: 'iam-audit-logs',
      title: '审计日志',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['iam:audit:read'],
      nav: {
        label: '审计日志',
        icon: 'ScrollText',
        order: 1,
        group: 'analytics',
      },
    },
    {
      path: '/iam/system',
      element: IamSystemSettingsPage,
      module: 'iam',
      code: 'iam-system',
      title: '系统设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['iam:system:read'],
      nav: {
        label: '系统设置',
        icon: 'Settings',
        order: 2,
        group: 'settings',
      },
    },
    {
      path: '/iam/database',
      element: DatabaseStructurePage,
      module: 'iam',
      code: 'iam-database',
      title: '数据库结构',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['iam:system:read'],
    },
    {
      path: '/iam/migration',
      element: MigrationAdminPage,
      module: 'iam',
      code: 'iam-migration',
      title: '数据迁移',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['iam:system:update'],
    },
    {
      path: '/iam/debug',
      element: ConfigDebugPage,
      module: 'iam',
      code: 'iam-debug',
      title: '配置调试',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['iam:system:update'],
    },
    {
      path: '/iam/plugins',
      element: PluginMarketplacePage,
      module: 'iam',
      code: 'iam-plugins',
      title: '插件市场',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['iam:plugin:read'],
      nav: {
        label: '插件市场',
        icon: 'Puzzle',
        order: 3,
        group: 'settings',
      },
    },
  ],
};
