import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

interface AdminDashboardPageProps {}
interface TenantManagementPageProps {
  tenantId?: string;
}
interface TenantDetailPageProps {
  tenantId?: string;
}
interface AccountManagementPageProps {
  userId?: string;
}
interface AdminUserListProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}
interface BankAccountManagementPageProps {}
export interface DictionaryManagementPageProps {}
interface AuditLogPageProps {
  entityType?: string;
  entityId?: string;
}
interface MonitorPageProps {}
export interface PermissionAuditPageProps {}

// ---- 第一部分：路径常量（唯一真相源） ----
// 组件中应引用 ADMIN_PATHS.xxx，而非硬编码字符串
export const ADMIN_PATHS = {
  root: '/admin',
  dashboard: '/admin/dashboard',
  tenant: '/admin/tenant',
  tenantDetail: '/admin/tenant-detail',
  tenantSettings: '/admin/tenant-settings',
  tenantBilling: '/admin/tenant-billing',
  account: '/admin/account',
  bankAccount: '/admin/bank-account',
  dictionary: '/admin/dictionary',
  system: '/admin/system',
  systemSettings: '/admin/system-settings',
  plugin: '/admin/plugin',
  database: '/admin/database',
  migration: '/admin/migration',
  configDebug: '/admin/config-debug',
  auditLog: '/admin/audit-log',
  rateLimit: '/admin/rate-limit',
  monitor: '/admin/monitor',
  performance: '/admin/performance',
  permissionAudit: '/admin/permission-audit',
  monitoringAlert: '/admin/monitoring-alert',
  featureFlag: '/admin/feature-flag',
} as const;

// ---- 第二部分：路由配置（供路由系统使用） ----
const adminDashboardRoute: RouteConfigV2<AdminDashboardPageProps> = {
  path: ADMIN_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/admin/DashboardPage'), 'DashboardPage'),
  module: 'admin',
  code: 'admin-dashboard',
  title: i18n.t('admin.nav.admin-dashboard'),
  titleKey: 'admin.nav.admin-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['admin:dashboard:read'],
  action: 'read',
};

const tenantManagementRoute: RouteConfigV2<TenantManagementPageProps> = {
  path: ADMIN_PATHS.tenant,
  element: lazyWithRetry(
    () => import('@/pages/admin/TenantManagementPage'),
    'TenantManagementPage'
  ),
  module: 'admin',
  title: i18n.t('admin.nav.admin-tenant'),
  titleKey: 'admin.nav.admin-tenant',
  code: 'admin-tenant',
  requiredPermissions: ['admin:tenant:read', 'admin:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const tenantDetailRoute: RouteConfigV2<TenantDetailPageProps> = {
  path: ADMIN_PATHS.tenantDetail,
  element: lazyWithRetry(() => import('@/pages/admin/TenantDetailPage'), 'TenantDetailPage'),
  module: 'admin',
  title: i18n.t('admin.nav.admin-tenant-detail'),
  titleKey: 'admin.nav.admin-tenant-detail',
  code: 'admin-tenant-detail',
  requiredPermissions: ['admin:tenant:read', 'admin:dashboard:read'],
  action: 'read',
  template: 'detail',
  group: 'setting',
};

const accountManagementRoute: RouteConfigV2<AccountManagementPageProps> = {
  path: ADMIN_PATHS.account,
  element: lazyWithRetry(
    () => import('@/pages/admin/AccountManagementPage'),
    'AccountManagementPage'
  ),
  module: 'admin',
  title: i18n.t('admin.nav.admin-account'),
  titleKey: 'admin.nav.admin-account',
  code: 'admin-account',
  requiredPermissions: ['admin:account:read', 'admin:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const adminUserListRoute: RouteConfigV2<AdminUserListProps> =
  accountManagementRoute as RouteConfigV2<AdminUserListProps>;

const auditLogRoute: RouteConfigV2<AuditLogPageProps> = {
  path: ADMIN_PATHS.auditLog,
  element: lazyWithRetry(() => import('@/pages/admin/AuditLogPage'), 'AuditLogPage'),
  module: 'admin',
  title: i18n.t('admin.nav.admin-audit-log'),
  titleKey: 'admin.nav.admin-audit-log',
  code: 'admin-audit-log',
  requiredPermissions: ['admin:audit:read', 'admin:dashboard:read', 'admin:iam:delete'],
  action: 'read',
  template: 'list',
  group: 'analytics',
};

const monitorRoute: RouteConfigV2<MonitorPageProps> = {
  path: ADMIN_PATHS.monitor,
  element: lazyWithRetry(() => import('@/pages/admin/MonitorPage'), 'MonitorPage'),
  module: 'admin',
  title: i18n.t('admin.nav.admin-monitor'),
  titleKey: 'admin.nav.admin-monitor',
  code: 'admin-monitor',
  requiredPermissions: ['admin:monitor:read', 'admin:dashboard:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const permissionAuditRoute: RouteConfigV2<PermissionAuditPageProps> = {
  path: ADMIN_PATHS.permissionAudit,
  element: lazyWithRetry(() => import('@/pages/admin/PermissionAuditPage'), 'PermissionAuditPage'),
  module: 'admin',
  title: i18n.t('admin.nav.admin-permission-audit'),
  titleKey: 'admin.nav.admin-permission-audit',
  code: 'admin-permission-audit',
  requiredPermissions: ['admin:audit:read', 'admin:dashboard:read'],
  action: 'read',
  template: 'list',
  group: 'analytics',
};

const adminRoutes: RouteConfigV2[] = [
  // ========== 概览 ==========
  adminDashboardRoute,

  // ========== 租户管理 ==========
  tenantManagementRoute,
  tenantDetailRoute,
  {
    path: ADMIN_PATHS.tenantSettings,
    element: lazyWithRetry(() => import('@/pages/admin/TenantSettingsPage'), 'TenantSettingsPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-tenant-settings'),
    titleKey: 'admin.nav.admin-tenant-settings',
    code: 'admin-tenant-settings',
    requiredPermissions: ['admin:tenant:write', 'admin:dashboard:write'],
    action: 'write',
    template: 'form',
    group: 'setting',
  },
  {
    path: ADMIN_PATHS.tenantBilling,
    element: lazyWithRetry(() => import('@/pages/admin/TenantBillingPage'), 'TenantBillingPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-tenant-billing'),
    titleKey: 'admin.nav.admin-tenant-billing',
    code: 'admin-tenant-billing',
    requiredPermissions: ['admin:tenant:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'master',
  },

  // ========== 账号管理 ==========
  adminUserListRoute,
  {
    path: ADMIN_PATHS.bankAccount,
    element: lazyWithRetry(
      () => import('@/pages/admin/BankAccountManagementPage'),
      'BankAccountManagementPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-bank-account'),
    titleKey: 'admin.nav.admin-bank-account',
    code: 'admin-bank-account',
    requiredPermissions: ['admin:bank:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'master',
  } as RouteConfigV2<BankAccountManagementPageProps>,

  // ========== 系统配置 ==========
  {
    path: ADMIN_PATHS.dictionary,
    element: lazyWithRetry(
      () => import('@/pages/admin/DictionaryManagementPage'),
      'DictionaryManagementPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-dictionary'),
    titleKey: 'admin.nav.admin-dictionary',
    code: 'admin-dictionary',
    requiredPermissions: ['admin:dictionary:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'tree',
    group: 'setting',
  } as RouteConfigV2<DictionaryManagementPageProps>,
  {
    path: ADMIN_PATHS.system,
    element: lazyWithRetry(
      () => import('@/pages/admin/SystemManagementPage'),
      'SystemManagementPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-system'),
    titleKey: 'admin.nav.admin-system',
    code: 'admin-system',
    requiredPermissions: ['admin:system:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'settings',
    group: 'setting',
  },
  {
    path: ADMIN_PATHS.systemSettings,
    element: lazyWithRetry(() => import('@/pages/admin/SystemSettingsPage'), 'SystemSettingsPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-system-settings'),
    titleKey: 'admin.nav.admin-system-settings',
    code: 'admin-system-settings',
    requiredPermissions: ['admin:system:write', 'admin:dashboard:write'],
    action: 'write',
    template: 'settings',
    group: 'setting',
  },
  {
    path: ADMIN_PATHS.plugin,
    element: lazyWithRetry(
      () => import('@/pages/admin/PluginManagementPage'),
      'PluginManagementPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-plugin'),
    titleKey: 'admin.nav.admin-plugin',
    code: 'admin-plugin',
    requiredPermissions: [
      'admin:plugin:read',
      'admin:dashboard:read',
      'admin:iam:dashboard:approve',
    ],
    action: 'read',
    template: 'list',
    group: 'setting',
  },

  // ========== 运维工具 ==========
  {
    path: ADMIN_PATHS.database,
    element: lazyWithRetry(
      () => import('@/pages/admin/DatabaseStructurePage'),
      'DatabaseStructurePage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-database'),
    titleKey: 'admin.nav.admin-database',
    code: 'admin-database',
    requiredPermissions: ['admin:database:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'master',
  },
  {
    path: ADMIN_PATHS.migration,
    element: lazyWithRetry(() => import('@/pages/admin/MigrationAdminPage'), 'MigrationAdminPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-migration'),
    titleKey: 'admin.nav.admin-migration',
    code: 'admin-migration',
    requiredPermissions: ['admin:migration:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'list',
    group: 'setting',
  },
  {
    path: ADMIN_PATHS.configDebug,
    element: lazyWithRetry(() => import('@/pages/admin/ConfigDebugPage'), 'ConfigDebugPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-config-debug'),
    titleKey: 'admin.nav.admin-config-debug',
    code: 'admin-config-debug',
    requiredPermissions: ['admin:debug:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'settings',
    group: 'setting',
  },

  // ========== 监控审计 ==========
  auditLogRoute,
  {
    path: ADMIN_PATHS.rateLimit,
    element: lazyWithRetry(
      () => import('@/pages/admin/RateLimitConfigPage'),
      'RateLimitConfigPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-rate-limit'),
    titleKey: 'admin.nav.admin-rate-limit',
    code: 'admin-rate-limit',
    requiredPermissions: ['admin:system:write', 'admin:dashboard:write'],
    action: 'write',
    template: 'settings',
    group: 'setting',
  },
  {
    path: ADMIN_PATHS.featureFlag,
    element: lazyWithRetry(() => import('@/pages/system/FeatureFlagPage'), 'FeatureFlagPage'),
    module: 'admin',
    title: i18n.t('admin.nav.admin-feature-flag'),
    titleKey: 'admin.nav.admin-feature-flag',
    code: 'admin-feature-flag',
    requiredPermissions: ['system:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'settings',
    group: 'setting',
  },
  monitorRoute,
  {
    path: ADMIN_PATHS.performance,
    element: lazyWithRetry(
      () => import('@/pages/admin/PerformanceMonitorPage'),
      'PerformanceMonitorPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-performance'),
    titleKey: 'admin.nav.admin-performance',
    code: 'admin-performance',
    requiredPermissions: ['admin:monitor:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'stats',
    group: 'analytics',
  },
  permissionAuditRoute,
  {
    path: ADMIN_PATHS.monitoringAlert,
    element: lazyWithRetry(
      () => import('@/pages/admin/MonitoringAlertPage'),
      'MonitoringAlertPage'
    ),
    module: 'admin',
    title: i18n.t('admin.nav.admin-monitoring-alert'),
    titleKey: 'admin.nav.admin-monitoring-alert',
    code: 'admin-monitoring-alert',
    requiredPermissions: ['admin:monitor:read', 'admin:dashboard:read'],
    action: 'read',
    template: 'stats',
    group: 'analytics',
  },
];

export const adminModuleConfig: RouteModuleConfig = {
  code: 'admin',
  name: i18n.t('shared.config.admin_name'),
  nameKey: 'shared.config.admin_name',
  icon: 'Settings',
  path: ADMIN_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 2,
  description: i18n.t('admin.nav.module_name_desc'),
  permission: 'admin:dashboard:read',
  routes: adminRoutes,
};

// ---- 第三部分：导航配置（供导航注册表使用） ----
export const adminNavConfig: ModuleNavConfig = {
  code: 'admin',
  name: i18n.t('admin.nav.module_name'),
  nameKey: 'admin.nav.module_name',
  icon: 'Settings',
  path: ADMIN_PATHS.root,
  permission: 'admin:dashboard:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 2,
  description: i18n.t('admin.nav.module_name_desc'),
  navItems: [
    {
      code: 'admin-dashboard',
      label: i18n.t('admin.nav.admin-dashboard'),
      labelKey: 'admin.nav.admin-dashboard',
      icon: 'LayoutDashboard',
      path: ADMIN_PATHS.dashboard,
      permission: 'admin:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('admin.nav.admin-dashboard_desc'),
    },
    {
      code: 'admin-tenant',
      label: i18n.t('admin.nav.admin-tenant'),
      labelKey: 'admin.nav.admin-tenant',
      icon: 'Building2',
      path: ADMIN_PATHS.tenant,
      permission: 'admin:tenant:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('admin.nav.admin-tenant_desc'),
    },
    {
      code: 'admin-tenant-billing',
      label: i18n.t('admin.nav.admin-tenant-billing'),
      labelKey: 'admin.nav.admin-tenant-billing',
      icon: 'Wallet',
      path: ADMIN_PATHS.tenantBilling,
      permission: 'admin:tenant:read',
      order: 2,
      group: 'master',
      description: i18n.t('admin.nav.admin-tenant-billing_desc'),
    },
    {
      code: 'admin-account',
      label: i18n.t('admin.nav.admin-account'),
      labelKey: 'admin.nav.admin-account',
      icon: 'UserCircle',
      path: ADMIN_PATHS.account,
      permission: 'admin:account:read',
      order: 13,
      group: 'master',
      description: i18n.t('admin.nav.admin-account_desc'),
    },
    {
      code: 'admin-bank-account',
      label: i18n.t('admin.nav.admin-bank-account'),
      labelKey: 'admin.nav.admin-bank-account',
      icon: 'CreditCard',
      path: ADMIN_PATHS.bankAccount,
      permission: 'admin:bank:read',
      order: 14,
      group: 'master',
      description: i18n.t('admin.nav.admin-bank-account_desc'),
    },
    {
      code: 'admin-dictionary',
      label: i18n.t('admin.nav.admin-dictionary'),
      labelKey: 'admin.nav.admin-dictionary',
      icon: 'BookOpen',
      path: ADMIN_PATHS.dictionary,
      permission: 'admin:dictionary:read',
      order: 20,
      group: 'setting',
      description: i18n.t('admin.nav.admin-dictionary_desc'),
    },
    {
      code: 'admin-system',
      label: i18n.t('admin.nav.admin-system'),
      labelKey: 'admin.nav.admin-system',
      icon: 'Server',
      path: ADMIN_PATHS.system,
      permission: 'admin:system:read',
      order: 21,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('admin.nav.admin-system_desc'),
    },
    {
      code: 'admin-system-settings',
      label: i18n.t('admin.nav.admin-system-settings'),
      labelKey: 'admin.nav.admin-system-settings',
      icon: 'Settings2',
      path: ADMIN_PATHS.systemSettings,
      permission: 'admin:system:write',
      order: 22,
      group: 'setting',
      description: i18n.t('admin.nav.admin-system-settings_desc'),
    },
    {
      code: 'admin-plugin',
      label: i18n.t('admin.nav.admin-plugin'),
      labelKey: 'admin.nav.admin-plugin',
      icon: 'Puzzle',
      path: ADMIN_PATHS.plugin,
      permission: 'admin:plugin:read',
      order: 23,
      group: 'setting',
      description: i18n.t('admin.nav.admin-plugin_desc'),
    },
    {
      code: 'admin-database',
      label: i18n.t('admin.nav.admin-database'),
      labelKey: 'admin.nav.admin-database',
      icon: 'Database',
      path: ADMIN_PATHS.database,
      permission: 'admin:database:read',
      order: 24,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('admin.nav.admin-database_desc'),
    },
    {
      code: 'admin-migration',
      label: i18n.t('admin.nav.admin-migration'),
      labelKey: 'admin.nav.admin-migration',
      icon: 'RefreshCw',
      path: ADMIN_PATHS.migration,
      permission: 'admin:migration:read',
      order: 25,
      group: 'setting',
      showInSidebar: false,
      description: i18n.t('admin.nav.admin-migration_desc'),
    },
    {
      code: 'admin-config-debug',
      label: i18n.t('admin.nav.admin-config-debug'),
      labelKey: 'admin.nav.admin-config-debug',
      icon: 'Bug',
      path: ADMIN_PATHS.configDebug,
      permission: 'admin:debug:read',
      order: 26,
      group: 'setting',
      showInSidebar: false,
      description: i18n.t('admin.nav.admin-config-debug_desc'),
    },
    {
      code: 'admin-audit-log',
      label: i18n.t('admin.nav.admin-audit-log'),
      labelKey: 'admin.nav.admin-audit-log',
      icon: 'ScrollText',
      path: ADMIN_PATHS.auditLog,
      permission: 'admin:audit:read',
      order: 30,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('admin.nav.admin-audit-log_desc'),
    },
    {
      code: 'admin-rate-limit',
      label: i18n.t('admin.nav.admin-rate-limit'),
      labelKey: 'admin.nav.admin-rate-limit',
      icon: 'ShieldCheck',
      path: ADMIN_PATHS.rateLimit,
      permission: 'admin:system:write',
      order: 27,
      group: 'setting',
      description: i18n.t('admin.nav.admin-rate-limit_desc'),
    },
    {
      code: 'admin-feature-flag',
      label: i18n.t('admin.nav.admin-feature-flag'),
      labelKey: 'admin.nav.admin-feature-flag',
      icon: 'ToggleLeft',
      path: ADMIN_PATHS.featureFlag,
      permission: 'system:read',
      order: 24,
      group: 'setting',
      description: i18n.t('admin.nav.admin-feature-flag_desc'),
    },
    {
      code: 'admin-monitor',
      label: i18n.t('admin.nav.admin-monitor'),
      labelKey: 'admin.nav.admin-monitor',
      icon: 'Activity',
      path: ADMIN_PATHS.monitor,
      permission: 'admin:monitor:read',
      order: 31,
      group: 'analytics',
      description: i18n.t('admin.nav.admin-monitor_desc'),
    },
    {
      code: 'admin-performance',
      label: i18n.t('admin.nav.admin-performance'),
      labelKey: 'admin.nav.admin-performance',
      icon: 'Gauge',
      path: ADMIN_PATHS.performance,
      permission: 'admin:monitor:read',
      order: 32,
      group: 'analytics',
      description: i18n.t('admin.nav.admin-performance_desc'),
    },
    {
      code: 'admin-permission-audit',
      label: i18n.t('admin.nav.admin-permission-audit'),
      labelKey: 'admin.nav.admin-permission-audit',
      icon: 'Shield',
      path: ADMIN_PATHS.permissionAudit,
      permission: 'admin:audit:read',
      order: 33,
      group: 'analytics',
      description: i18n.t('admin.nav.admin-permission-audit_desc'),
    },
    {
      code: 'admin-monitoring-alert',
      label: i18n.t('admin.nav.admin-monitoring-alert'),
      labelKey: 'admin.nav.admin-monitoring-alert',
      icon: 'AlertTriangle',
      path: ADMIN_PATHS.monitoringAlert,
      permission: 'admin:monitor:read',
      order: 34,
      group: 'analytics',
      description: i18n.t('admin.nav.admin-monitoring-alert_desc'),
    },
  ],
};
