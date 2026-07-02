import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const MobileHomePage = lazyWithRetry(
  () => import('../../pages/mobile/MobileHomePage'),
  'MobileHomePage'
);
const MobileWorkbenchPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileWorkbenchPage'),
  'MobileWorkbenchPage'
);
const MobileAttendancePage = lazyWithRetry(
  () => import('../../pages/mobile/MobileAttendancePage'),
  'MobileAttendancePage'
);
const MobileTaskListPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileTaskListPage'),
  'MobileTaskListPage'
);
const MobileApprovalPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileApprovalPage'),
  'MobileApprovalPage'
);
const MobileInventoryPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileInventoryPage'),
  'MobileInventoryPage'
);
const MobileQualityPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileQualityPage'),
  'MobileQualityPage'
);
const MobileProductionPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileProductionPage'),
  'MobileProductionPage'
);
const MobileScanPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileScanPage'),
  'MobileScanPage'
);
const MobileProfilePage = lazyWithRetry(
  () => import('../../pages/mobile/MobileProfilePage'),
  'MobileProfilePage'
);
const MobileSettingsPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileSettingsPage'),
  'MobileSettingsPage'
);
const MobileNotificationPage = lazyWithRetry(
  () => import('../../pages/mobile/MobileNotificationPage'),
  'MobileNotificationPage'
);

export const mobileModuleConfig: RouteModuleConfig = {
  code: 'mobile',
  name: '移动端',
  icon: 'Smartphone',
  path: '/mobile',
  source: 'core',
  status: 'online',
  order: 8,
  description: '移动办公、考勤打卡、审批任务、扫码功能',
  permission: 'mobile:read',
  routes: [
    {
      path: '/mobile/home',
      element: MobileHomePage,
      module: 'mobile',
      code: 'mobile-home',
      title: '移动首页',
      template: 'dashboard',
      group: 'home',
      requiredPermissions: ['mobile:read'],
    },
    {
      path: '/mobile/workbench',
      element: MobileWorkbenchPage,
      module: 'mobile',
      code: 'mobile-workbench',
      title: '工作台',
      template: 'dashboard',
      group: 'home',
      requiredPermissions: ['mobile:read'],
    },
    {
      path: '/mobile/attendance',
      element: MobileAttendancePage,
      module: 'mobile',
      code: 'mobile-attendance',
      title: '考勤打卡',
      template: 'form',
      group: 'attendance',
      requiredPermissions: ['mobile:attendance:read'],
    },
    {
      path: '/mobile/tasks',
      element: MobileTaskListPage,
      module: 'mobile',
      code: 'mobile-tasks',
      title: '我的任务',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['mobile:task:read'],
    },
    {
      path: '/mobile/approvals',
      element: MobileApprovalPage,
      module: 'mobile',
      code: 'mobile-approvals',
      title: '审批中心',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['mobile:approval:read'],
    },
    {
      path: '/mobile/inventory',
      element: MobileInventoryPage,
      module: 'mobile',
      code: 'mobile-inventory',
      title: '库存查询',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mobile:inventory:read'],
    },
    {
      path: '/mobile/quality',
      element: MobileQualityPage,
      module: 'mobile',
      code: 'mobile-quality',
      title: '质量巡检',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mobile:quality:read'],
    },
    {
      path: '/mobile/production',
      element: MobileProductionPage,
      module: 'mobile',
      code: 'mobile-production',
      title: '生产报工',
      template: 'form',
      group: 'business',
      requiredPermissions: ['mobile:production:read'],
    },
    {
      path: '/mobile/scan',
      element: MobileScanPage,
      module: 'mobile',
      code: 'mobile-scan',
      title: '扫码功能',
      template: 'form',
      group: 'tools',
      requiredPermissions: ['mobile:scan:read'],
    },
    {
      path: '/mobile/notifications',
      element: MobileNotificationPage,
      module: 'mobile',
      code: 'mobile-notifications',
      title: '消息通知',
      template: 'list',
      group: 'tools',
      requiredPermissions: ['mobile:notification:read'],
    },
    {
      path: '/mobile/profile',
      element: MobileProfilePage,
      module: 'mobile',
      code: 'mobile-profile',
      title: '个人中心',
      template: 'detail',
      group: 'settings',
      requiredPermissions: ['mobile:read'],
    },
    {
      path: '/mobile/settings',
      element: MobileSettingsPage,
      module: 'mobile',
      code: 'mobile-settings',
      title: '应用设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['mobile:admin'],
    },
  ],
};
