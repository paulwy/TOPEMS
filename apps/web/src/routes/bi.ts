import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const BIDashboardPage = lazy(() => import('../pages/bi/BIDashboardPage'));
const BIAnalyticsPage = lazy(() => import('../pages/bi/BIAnalyticsPage'));
const BIComparisonPage = lazy(() => import('../pages/bi/BIComparisonPage'));
const BIReportPage = lazy(() => import('../pages/bi/BIReportPage'));
const BIDataSourcePage = lazy(() => import('../pages/bi/BIDataSourcePage'));
const BIVisualizationPage = lazy(() => import('../pages/bi/BIVisualizationPage'));
const BIModuleDetailPage = lazy(() => import('../pages/bi/BIModuleDetailPage'));
const Gispage = lazy(() => import('../pages/bi/Gispage'));

export const biRoutes: RouteConfig[] = [
  {
    path: '/bi',
    element: React.createElement(Navigate, {
      to: '/bi/dashboard',
      replace: true,
    }),
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/dashboard',
    element: BIDashboardPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/analytics',
    element: BIAnalyticsPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/comparison',
    element: BIComparisonPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/reports',
    element: BIReportPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/datasources',
    element: BIDataSourcePage,
    requiredPermissions: ['bi:admin'],
    module: 'bi',
    action: 'admin',
  },
  {
    path: '/bi/visualizations',
    element: BIVisualizationPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/module/:moduleId',
    element: BIModuleDetailPage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
  {
    path: '/bi/gis',
    element: Gispage,
    requiredPermissions: ['bi:read'],
    module: 'bi',
    action: 'read',
  },
];
