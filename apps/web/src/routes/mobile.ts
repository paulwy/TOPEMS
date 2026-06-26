import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const MobileHomePage = lazy(() => import('../pages/mobile/MobileHomePage'));
const MobileTaskListPage = lazy(() => import('../pages/mobile/MobileTaskListPage'));
const MobileScanPage = lazy(() => import('../pages/mobile/MobileScanPage'));
const MobileApprovalPage = lazy(() => import('../pages/mobile/MobileApprovalPage'));
const MobileProfilePage = lazy(() => import('../pages/mobile/MobileProfilePage'));
const MobileSettingsPage = lazy(() => import('../pages/mobile/MobileSettingsPage'));
const OfflineSyncPage = lazy(() => import('../pages/mobile/OfflineSyncPage'));
const ScanSettingsPage = lazy(() => import('../pages/mobile/ScanSettingsPage'));
const NotificationSettingsPage = lazy(() => import('../pages/mobile/NotificationSettingsPage'));

export const mobileRoutes: RouteConfig[] = [
  {
    path: '/mobile',
    element: MobileHomePage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/home',
    element: MobileHomePage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/tasks',
    element: MobileTaskListPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/scan-page',
    element: MobileScanPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/approvals',
    element: MobileApprovalPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/settings',
    element: MobileProfilePage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/settings-app',
    element: MobileSettingsPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/offline-sync',
    element: OfflineSyncPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/scan',
    element: ScanSettingsPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/mobile/notifications',
    element: NotificationSettingsPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
];
