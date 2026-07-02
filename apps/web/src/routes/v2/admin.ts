import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

// ============================================
// 页面组件导入（系统管理相关）
// ============================================

// 概览
const DashboardPage = lazyWithRetry(
  () => import('../../pages/admin/DashboardPage'),
  'DashboardPage'
);

// 租户管理
const TenantManagementPage = lazyWithRetry(
  () => import('../../pages/admin/TenantManagementPage'),
  'TenantManagementPage'
);
const TenantDetailPage = lazyWithRetry(
  () => import('../../pages/admin/TenantDetailPage'),
  'TenantDetailPage'
);
const TenantSettingsPage = lazyWithRetry(
  () => import('../../pages/admin/TenantSettingsPage'),
  'TenantSettingsPage'
);
const TenantBillingPage = lazyWithRetry(
  () => import('../../pages/admin/TenantBillingPage'),
  'TenantBillingPage'
);

// 账号管理
const AccountManagementPage = lazyWithRetry(
  () => import('../../pages/admin/AccountManagementPage'),
  'AccountManagementPage'
);
const BankAccountManagementPage = lazyWithRetry(
  () => import('../../pages/admin/BankAccountManagementPage'),
  'BankAccountManagementPage'
);

// 系统配置
const DictionaryManagementPage = lazyWithRetry(
  () => import('../../pages/admin/DictionaryManagementPage'),
  'DictionaryManagementPage'
);
const SystemManagementPage = lazyWithRetry(
  () => import('../../pages/admin/SystemManagementPage'),
  'SystemManagementPage'
);
const SystemSettingsPage = lazyWithRetry(
  () => import('../../pages/admin/SystemSettingsPage'),
  'SystemSettingsPage'
);
const PluginManagementPage = lazyWithRetry(
  () => import('../../pages/admin/PluginManagementPage'),
  'PluginManagementPage'
);

// 运维工具
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

// 监控审计
const AuditLogPage = lazyWithRetry(() => import('../../pages/admin/AuditLogPage'), 'AuditLogPage');
const MonitorPage = lazyWithRetry(() => import('../../pages/admin/MonitorPage'), 'MonitorPage');
const PerformanceMonitorPage = lazyWithRetry(
  () => import('../../pages/admin/PerformanceMonitorPage'),
  'PerformanceMonitorPage'
);

// ============================================
// 路由模块配置
// ============================================

export const adminModuleConfig: RouteModuleConfig = {
  code: 'admin',
  name: '系统管理',
  icon: 'Settings',
  path: '/admin',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 2,
  description: '租户管理、系统配置、监控运维',
  permission: 'admin:read',
  routes: [
    // ========== 概览 ==========
    {
      path: '/admin/dashboard',
      element: DashboardPage,
      module: 'admin',
      code: 'admin-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['admin:read'],
    },

    // ========== 租户管理 ==========
    {
      path: '/admin/tenant',
      element: TenantManagementPage,
      module: 'admin',
      title: '租户管理',
      code: 'admin-tenant',
      requiredPermissions: ['admin:tenant:read'],
      template: 'list',
      group: 'tenant',
    },
    {
      path: '/admin/tenant-detail',
      element: TenantDetailPage,
      module: 'admin',
      title: '租户详情',
      code: 'admin-tenant-detail',
      requiredPermissions: ['admin:tenant:read'],
      template: 'detail',
      group: 'tenant',
    },
    {
      path: '/admin/tenant-settings',
      element: TenantSettingsPage,
      module: 'admin',
      title: '租户设置',
      code: 'admin-tenant-settings',
      requiredPermissions: ['admin:tenant:write'],
      template: 'form',
      group: 'tenant',
    },
    {
      path: '/admin/tenant-billing',
      element: TenantBillingPage,
      module: 'admin',
      title: '租户计费',
      code: 'admin-tenant-billing',
      requiredPermissions: ['admin:tenant:read'],
      template: 'list',
      group: 'tenant',
    },

    // ========== 账号管理 ==========
    {
      path: '/admin/account',
      element: AccountManagementPage,
      module: 'admin',
      title: '账号管理',
      code: 'admin-account',
      requiredPermissions: ['admin:account:read'],
      template: 'list',
      group: 'account',
    },
    {
      path: '/admin/bank-account',
      element: BankAccountManagementPage,
      module: 'admin',
      title: '银行账号',
      code: 'admin-bank-account',
      requiredPermissions: ['admin:bank:read'],
      template: 'list',
      group: 'account',
    },

    // ========== 系统配置 ==========
    {
      path: '/admin/dictionary',
      element: DictionaryManagementPage,
      module: 'admin',
      title: '数据字典',
      code: 'admin-dictionary',
      requiredPermissions: ['admin:dictionary:read'],
      template: 'tree',
      group: 'settings',
    },
    {
      path: '/admin/system',
      element: SystemManagementPage,
      module: 'admin',
      title: '系统管理',
      code: 'admin-system',
      requiredPermissions: ['admin:system:read'],
      template: 'settings',
      group: 'settings',
    },
    {
      path: '/admin/system-settings',
      element: SystemSettingsPage,
      module: 'admin',
      title: '系统设置',
      code: 'admin-system-settings',
      requiredPermissions: ['admin:system:write'],
      template: 'settings',
      group: 'settings',
    },
    {
      path: '/admin/plugin',
      element: PluginManagementPage,
      module: 'admin',
      title: '插件管理',
      code: 'admin-plugin',
      requiredPermissions: ['admin:plugin:read'],
      template: 'list',
      group: 'settings',
    },

    // ========== 运维工具 ==========
    {
      path: '/admin/database',
      element: DatabaseStructurePage,
      module: 'admin',
      title: '数据库结构',
      code: 'admin-database',
      requiredPermissions: ['admin:database:read'],
      template: 'list',
      group: 'tools',
    },
    {
      path: '/admin/migration',
      element: MigrationAdminPage,
      module: 'admin',
      title: '数据迁移',
      code: 'admin-migration',
      requiredPermissions: ['system:migration'],
      template: 'list',
      group: 'tools',
    },
    {
      path: '/admin/config-debug',
      element: ConfigDebugPage,
      module: 'admin',
      title: '配置调试',
      code: 'admin-config-debug',
      requiredPermissions: ['admin:debug:read'],
      template: 'settings',
      group: 'tools',
    },

    // ========== 监控审计 ==========
    {
      path: '/admin/audit-log',
      element: AuditLogPage,
      module: 'admin',
      title: '审计日志',
      code: 'admin-audit-log',
      requiredPermissions: ['admin:audit:read'],
      template: 'list',
      group: 'analytics',
    },
    {
      path: '/admin/monitor',
      element: MonitorPage,
      module: 'admin',
      title: '系统监控',
      code: 'admin-monitor',
      requiredPermissions: ['admin:monitor:read'],
      template: 'stats',
      group: 'analytics',
    },
    {
      path: '/admin/performance',
      element: PerformanceMonitorPage,
      module: 'admin',
      title: '性能监控',
      code: 'admin-performance',
      requiredPermissions: ['admin:monitor:read'],
      template: 'stats',
      group: 'analytics',
    },
  ],
};
