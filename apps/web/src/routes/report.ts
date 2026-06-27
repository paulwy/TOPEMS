import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const ReportListPage = lazy(() => import('../pages/report/ReportListPage'));
const ReportDesignPage = lazy(() => import('../pages/report/ReportDesignPage'));
const ReportSchedulePage = lazy(() => import('../pages/report/ReportSchedulePage'));
const ReportSubscriptionPage = lazy(() => import('../pages/report/ReportSubscriptionPage'));
const ReportBuilder = lazy(() => import('../pages/report/ReportBuilder'));
const ReportPage = lazy(() => import('../pages/report/ReportPage'));
const ReportViewer = lazy(() => import('../pages/report/ReportViewer'));

export const reportRoutes: RouteConfig[] = [
  {
    path: '/report/list',
    element: ReportListPage,
    requiredPermissions: ['report:read'],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/design',
    element: ReportDesignPage,
    requiredPermissions: ['report:write'],
    module: 'report',
    action: 'write',
  },
  {
    path: '/report/schedules',
    element: ReportSchedulePage,
    requiredPermissions: ['report:admin'],
    module: 'report',
    action: 'admin',
  },
  {
    path: '/report/subscriptions',
    element: ReportSubscriptionPage,
    requiredPermissions: ['report:read'],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/templates',
    element: ReportPage,
    requiredPermissions: ['report:admin'],
    module: 'report',
    action: 'admin',
  },
  {
    path: '/report/builder',
    element: ReportBuilder,
    requiredPermissions: ['report:write'],
    module: 'report',
    action: 'write',
  },
  {
    path: '/report/viewer',
    element: ReportViewer,
    requiredPermissions: ['report:read'],
    module: 'report',
    action: 'read',
  },
];
