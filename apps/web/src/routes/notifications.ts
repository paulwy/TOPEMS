import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const NotificationCenter = lazy(() => import('../pages/notification/NotificationCenter'));
const NotificationTemplatesPage = lazy(
  () => import('../pages/notification/NotificationTemplatesPage')
);
const NotificationArchivePage = lazy(() => import('../pages/notification/NotificationArchivePage'));
const NotificationStatsPage = lazy(() => import('../pages/notification/NotificationStatsPage'));
const NotificationDetailPage = lazy(() => import('../pages/notification/NotificationDetailPage'));

export const notificationRoutes: RouteConfig[] = [
  {
    path: '/notifications',
    element: NotificationCenter,
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/templates',
    element: NotificationTemplatesPage,
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/archive',
    element: NotificationArchivePage,
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/stats',
    element: NotificationStatsPage,
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/:id',
    element: NotificationDetailPage,
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
];
