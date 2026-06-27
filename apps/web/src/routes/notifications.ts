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
    requiredPermissions: ['notification:read'],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/templates',
    element: NotificationTemplatesPage,
    requiredPermissions: ['notification:admin'],
    module: 'notification',
    action: 'admin',
  },
  {
    path: '/notifications/archive',
    element: NotificationArchivePage,
    requiredPermissions: ['notification:read'],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/stats',
    element: NotificationStatsPage,
    requiredPermissions: ['notification:read'],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/:id',
    element: NotificationDetailPage,
    requiredPermissions: ['notification:read'],
    module: 'notification',
    action: 'read',
  },
];
