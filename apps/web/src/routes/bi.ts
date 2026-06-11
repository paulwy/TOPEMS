import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const BIDashboardPage = lazy(() => import('../pages/BIDashboardPage'));
const BIAnalyticsPage = lazy(() => import('../pages/BIAnalyticsPage'));
const BIComparisonPage = lazy(() => import('../pages/BIComparisonPage'));
const BIReportPage = lazy(() => import('../pages/BIReportPage'));
const BIDataSourcePage = lazy(() => import('../pages/BIDataSourcePage'));
const BIVisualizationPage = lazy(() => import('../pages/BIVisualizationPage'));
const BIModuleDetailPage = lazy(() => import('../pages/BIModuleDetailPage'));

export const biRoutes: RouteConfig[] = [
  {
    path: '/bi/dashboard',
    element: React.createElement(BIDashboardPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/analytics',
    element: React.createElement(BIAnalyticsPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/comparison',
    element: React.createElement(BIComparisonPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/reports',
    element: React.createElement(BIReportPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/datasources',
    element: React.createElement(BIDataSourcePage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/visualizations',
    element: React.createElement(BIVisualizationPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/module/:moduleId',
    element: React.createElement(BIModuleDetailPage),
    requiredPermissions: [],
    module: 'bi',
    action: 'read',
  },
];
