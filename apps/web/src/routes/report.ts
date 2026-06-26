import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const ReportListPage = lazy(() => import('../pages/report/ReportListPage'));
const ReportDesignPage = lazy(() => import('../pages/report/ReportDesignPage'));
const ReportSchedulePage = lazy(() => import('../pages/report/ReportSchedulePage'));
const ReportSubscriptionPage = lazy(() => import('../pages/report/ReportSubscriptionPage'));
const ReportBuilder = lazy(() => import('../pages/templates/ReportBuilder'));
const ReportPage = lazy(() => import('../pages/templates/ReportPage'));
const ReportViewer = lazy(() => import('../pages/templates/ReportViewer'));

export const reportRoutes: RouteConfig[] = [
  {
    path: '/report/list',
    element: ReportListPage,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/design',
    element: ReportDesignPage,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/schedules',
    element: ReportSchedulePage,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/subscriptions',
    element: ReportSubscriptionPage,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/templates',
    element: ReportPage,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/builder',
    element: ReportBuilder,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
  {
    path: '/report/viewer',
    element: ReportViewer,
    requiredPermissions: [],
    module: 'report',
    action: 'read',
  },
];
