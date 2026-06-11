import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const NotificationCenter = lazy(() => import('../pages/NotificationCenter'));
const NotificationTemplatesPage = lazy(() => import('../pages/NotificationTemplatesPage'));
const NotificationArchivePage = lazy(() => import('../pages/NotificationArchivePage'));
const NotificationStatsPage = lazy(() => import('../pages/NotificationStatsPage'));
const NotificationDetailPage = lazy(() => import('../pages/NotificationDetailPage'));

export const notificationRoutes: RouteConfig[] = [
  {
    path: '/notifications',
    element: React.createElement(NotificationCenter),
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/templates',
    element: React.createElement(NotificationTemplatesPage),
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/archive',
    element: React.createElement(NotificationArchivePage),
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/stats',
    element: React.createElement(NotificationStatsPage),
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
  {
    path: '/notifications/:id',
    element: React.createElement(NotificationDetailPage),
    requiredPermissions: [],
    module: 'notification',
    action: 'read',
  },
];
