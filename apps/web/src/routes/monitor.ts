import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const MonitorDashboardPage = lazy(() => import('../pages/monitor/MonitorDashboardPage'));
const MonitorMetricsPage = lazy(() => import('../pages/monitor/MonitorMetricsPage'));
const MonitorAlertsPage = lazy(() => import('../pages/monitor/MonitorAlertsPage'));

export const monitorRoutes: RouteConfig[] = [
  {
    path: '/monitor',
    element: React.createElement(Navigate, {
      to: '/monitor/dashboard',
      replace: true,
    }),
    requiredPermissions: ['monitor:read'],
    module: 'monitor',
    action: 'read',
  },
  {
    path: '/monitor/dashboard',
    element: MonitorDashboardPage,
    requiredPermissions: ['monitor:read'],
    module: 'monitor',
    action: 'read',
  },
  {
    path: '/monitor/metrics',
    element: MonitorMetricsPage,
    requiredPermissions: ['monitor:read'],
    module: 'monitor',
    action: 'read',
  },
  {
    path: '/monitor/alerts',
    element: MonitorAlertsPage,
    requiredPermissions: ['monitor:read'],
    module: 'monitor',
    action: 'read',
  },
];
