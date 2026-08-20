import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 MOBILE_PATHS.xxx，而非硬编码字符串

export const MOBILE_PATHS = {
  root: '/mobile',
  home: '/mobile/home',
  workbench: '/mobile/workbench',
  attendance: '/mobile/attendance',
  tasks: '/mobile/tasks',
  approvals: '/mobile/approvals',
  inventory: '/mobile/inventory',
  quality: '/mobile/quality',
  production: '/mobile/production',
  scan: '/mobile/scan',
  scanPage: '/mobile/scan-page',
  notifications: '/mobile/notifications',
  profile: '/mobile/profile',
  settings: '/mobile/settings',
  settingsApp: '/mobile/settings-app',
  offlineSync: '/mobile/offline-sync',
} as const;
export interface MobileHomePageProps {}

export interface MobileWorkbenchPageProps {}

export interface MobileAttendancePageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

export interface MobileTaskListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface MobileApprovalPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface MobileInventoryPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface MobileQualityPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface MobileProductionPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

export interface MobileScanPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

export interface MobileNotificationPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface MobileProfilePageProps {
  id?: string;
  entityType?: string;
}

export interface MobileSettingsPageProps {}

const mobileHomeRoute: RouteConfigV2<MobileHomePageProps> = {
  path: MOBILE_PATHS.home,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileHomePage'), 'MobileHomePage'),
  module: 'mobile',
  code: 'mobile-home',
  title: i18n.t('shared.config.k2'),
  titleKey: 'shared.config.k2',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['mobile:home:read'],
  action: 'read',
};

const mobileWorkbenchRoute: RouteConfigV2<MobileWorkbenchPageProps> = {
  path: MOBILE_PATHS.workbench,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileWorkbenchPage'), 'MobileWorkbenchPage'),
  module: 'mobile',
  code: 'mobile-workbench',
  title: i18n.t('shared.config.k3'),
  titleKey: 'shared.config.k3',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['mobile:home:read'],
  action: 'read',
};

const mobileAttendanceRoute: RouteConfigV2<MobileAttendancePageProps> = {
  path: MOBILE_PATHS.attendance,
  element: lazyWithRetry(
    () => import('@/pages/mobile/MobileAttendancePage'),
    'MobileAttendancePage'
  ),
  module: 'mobile',
  code: 'mobile-attendance',
  title: i18n.t('shared.config.k4'),
  titleKey: 'shared.config.k4',
  template: 'form',
  group: 'process',
  requiredPermissions: ['mobile:attendance:read', 'mobile:home:read'],
  action: 'read',
};

const mobileTaskListRoute: RouteConfigV2<MobileTaskListPageProps> = {
  path: MOBILE_PATHS.tasks,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileTaskListPage'), 'MobileTaskListPage'),
  module: 'mobile',
  code: 'mobile-tasks',
  title: i18n.t('shared.config.k5'),
  titleKey: 'shared.config.k5',
  template: 'list',
  group: 'process',
  requiredPermissions: ['mobile:task:read', 'mobile:home:read'],
  action: 'read',
};

const mobileApprovalRoute: RouteConfigV2<MobileApprovalPageProps> = {
  path: MOBILE_PATHS.approvals,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileApprovalPage'), 'MobileApprovalPage'),
  module: 'mobile',
  code: 'mobile-approvals',
  title: i18n.t('shared.config.k6'),
  titleKey: 'shared.config.k6',
  template: 'list',
  group: 'process',
  requiredPermissions: ['mobile:approval:read', 'mobile:home:read'],
  action: 'read',
};

const mobileInventoryRoute: RouteConfigV2<MobileInventoryPageProps> = {
  path: MOBILE_PATHS.inventory,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileInventoryPage'), 'MobileInventoryPage'),
  module: 'mobile',
  code: 'mobile-inventory',
  title: i18n.t('shared.config.k7'),
  titleKey: 'shared.config.k7',
  template: 'list',
  group: 'process',
  requiredPermissions: ['mobile:inventory:read', 'mobile:home:read'],
  action: 'read',
};

const mobileQualityRoute: RouteConfigV2<MobileQualityPageProps> = {
  path: MOBILE_PATHS.quality,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileQualityPage'), 'MobileQualityPage'),
  module: 'mobile',
  code: 'mobile-quality',
  title: i18n.t('shared.config.k8'),
  titleKey: 'shared.config.k8',
  template: 'list',
  group: 'process',
  requiredPermissions: ['mobile:quality:read', 'mobile:home:read'],
  action: 'read',
};

const mobileProductionRoute: RouteConfigV2<MobileProductionPageProps> = {
  path: MOBILE_PATHS.production,
  element: lazyWithRetry(
    () => import('@/pages/mobile/MobileProductionPage'),
    'MobileProductionPage'
  ),
  module: 'mobile',
  code: 'mobile-production',
  title: i18n.t('shared.config.k9'),
  titleKey: 'shared.config.k9',
  template: 'form',
  group: 'process',
  requiredPermissions: ['mobile:production:read', 'mobile:home:read'],
  action: 'read',
};

const mobileScanRoute: RouteConfigV2<MobileScanPageProps> = {
  path: MOBILE_PATHS.scan,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileScanPage'), 'MobileScanPage'),
  module: 'mobile',
  code: 'mobile-scan',
  title: i18n.t('shared.config.k10'),
  titleKey: 'shared.config.k10',
  template: 'form',
  group: 'process',
  requiredPermissions: ['mobile:scan:read', 'mobile:home:read'],
  action: 'read',
};

const mobileNotificationRoute: RouteConfigV2<MobileNotificationPageProps> = {
  path: MOBILE_PATHS.notifications,
  element: lazyWithRetry(
    () => import('@/pages/mobile/MobileNotificationPage'),
    'MobileNotificationPage'
  ),
  module: 'mobile',
  code: 'mobile-notifications',
  title: i18n.t('shared.config.k11'),
  titleKey: 'shared.config.k11',
  template: 'list',
  group: 'process',
  requiredPermissions: ['mobile:notification:read', 'mobile:home:read'],
  action: 'read',
};

const mobileProfileRoute: RouteConfigV2<MobileProfilePageProps> = {
  path: MOBILE_PATHS.profile,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileProfilePage'), 'MobileProfilePage'),
  module: 'mobile',
  code: 'mobile-profile',
  title: i18n.t('shared.config.k12'),
  titleKey: 'shared.config.k12',
  template: 'detail',
  group: 'setting',
  requiredPermissions: ['mobile:home:read'],
  action: 'read',
};

const mobileSettingsRoute: RouteConfigV2<MobileSettingsPageProps> = {
  path: MOBILE_PATHS.settings,
  element: lazyWithRetry(() => import('@/pages/mobile/MobileSettingsPage'), 'MobileSettingsPage'),
  module: 'mobile',
  code: 'mobile-settings',
  title: i18n.t('shared.config.k13'),
  titleKey: 'shared.config.k13',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['mobile:home:admin'],
  action: 'admin',
};

// ---- 路由配置（供路由系统使用） ----
export const mobileModuleConfig: RouteModuleConfig = {
  code: 'mobile',
  name: i18n.t('shared.config.mobile_name'),
  nameKey: 'shared.config.mobile_name',
  icon: 'Smartphone',
  path: MOBILE_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k1'),
  permission: 'mobile:home:read',
  routes: [
    mobileHomeRoute,
    mobileWorkbenchRoute,
    mobileAttendanceRoute,
    mobileTaskListRoute,
    mobileApprovalRoute,
    mobileInventoryRoute,
    mobileQualityRoute,
    mobileProductionRoute,
    mobileScanRoute,
    mobileNotificationRoute,
    mobileProfileRoute,
    mobileSettingsRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const mobileNavConfig: ModuleNavConfig = {
  code: 'mobile',
  name: i18n.t('shared.config.k14'),
  nameKey: 'shared.config.k14',
  icon: 'Smartphone',
  path: MOBILE_PATHS.root,
  permission: 'mobile:home:read',
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k15'),
  navItems: [
    {
      code: 'mobile-home',
      label: i18n.t('shared.config.k16'),
      labelKey: 'shared.config.k16',
      icon: 'Home',
      path: MOBILE_PATHS.home,
      permission: 'mobile:home:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k17'),
    },
    {
      code: 'mobile-workbench',
      label: i18n.t('shared.config.k18'),
      labelKey: 'shared.config.k18',
      icon: 'LayoutDashboard',
      path: MOBILE_PATHS.workbench,
      permission: 'mobile:home:read',
      order: 1,
      group: 'overview',
      description: i18n.t('shared.config.k19'),
    },
    {
      code: 'mobile-attendance',
      label: i18n.t('shared.config.k20'),
      labelKey: 'shared.config.k20',
      icon: 'Clock',
      path: MOBILE_PATHS.attendance,
      permission: 'mobile:attendance:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k21'),
    },
    {
      code: 'mobile-tasks',
      label: i18n.t('shared.config.k22'),
      labelKey: 'shared.config.k22',
      icon: 'CheckSquare',
      path: MOBILE_PATHS.tasks,
      permission: 'mobile:task:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k23'),
    },
    {
      code: 'mobile-approvals',
      label: i18n.t('shared.config.k24'),
      labelKey: 'shared.config.k24',
      icon: 'FileCheck',
      path: MOBILE_PATHS.approvals,
      permission: 'mobile:approval:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k25'),
    },
    {
      code: 'mobile-inventory',
      label: i18n.t('shared.config.k26'),
      labelKey: 'shared.config.k26',
      icon: 'Package',
      path: MOBILE_PATHS.inventory,
      permission: 'mobile:inventory:read',
      order: 4,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k27'),
    },
    {
      code: 'mobile-quality',
      label: i18n.t('shared.config.k28'),
      labelKey: 'shared.config.k28',
      icon: 'ClipboardCheck',
      path: MOBILE_PATHS.quality,
      permission: 'mobile:quality:read',
      order: 5,
      group: 'process',
      description: i18n.t('shared.config.k29'),
    },
    {
      code: 'mobile-production',
      label: i18n.t('shared.config.k30'),
      labelKey: 'shared.config.k30',
      icon: 'Factory',
      path: MOBILE_PATHS.production,
      permission: 'mobile:production:read',
      order: 6,
      group: 'process',
      description: i18n.t('shared.config.k31'),
    },
    {
      code: 'mobile-scan',
      label: i18n.t('shared.config.k32'),
      labelKey: 'shared.config.k32',
      icon: 'Scan',
      path: MOBILE_PATHS.scan,
      permission: 'mobile:scan:read',
      order: 7,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k33'),
    },
    {
      code: 'mobile-notifications',
      label: i18n.t('shared.config.k34'),
      labelKey: 'shared.config.k34',
      icon: 'Bell',
      path: MOBILE_PATHS.notifications,
      permission: 'mobile:notification:read',
      order: 8,
      group: 'process',
      description: i18n.t('shared.config.k35'),
    },
    {
      code: 'mobile-profile',
      label: i18n.t('shared.config.k36'),
      labelKey: 'shared.config.k36',
      icon: 'User',
      path: MOBILE_PATHS.profile,
      permission: 'mobile:home:read',
      order: 1,
      group: 'setting',
      showInTabs: true,
      description: i18n.t('shared.config.k37'),
    },
    {
      code: 'mobile-settings',
      label: i18n.t('shared.config.k38'),
      labelKey: 'shared.config.k38',
      icon: 'Settings',
      path: MOBILE_PATHS.settings,
      permission: 'mobile:home:admin',
      order: 2,
      group: 'setting',
      description: i18n.t('shared.config.k39'),
    },
  ],
};
