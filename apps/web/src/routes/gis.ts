import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';

const GisDashboardPage = lazy(() => import('../pages/gis/DashboardPage'));
const GisFencePage = lazy(() => import('../pages/gis/GisFencePage'));
const GisTrackingPage = lazy(() => import('../pages/gis/GisTrackingPage'));

export const gisRoutes: RouteConfig[] = [
  {
    path: '/gis',
    element: React.createElement(Navigate, {
      to: '/gis/map',
      replace: true,
    }),
    requiredPermissions: ['gis:read'],
    module: 'gis',
    action: 'read',
  },
  {
    path: '/gis/map',
    element: GisDashboardPage,
    requiredPermissions: ['gis:read'],
    module: 'gis',
    action: 'read',
  },
  {
    path: '/gis/fence',
    element: GisFencePage,
    requiredPermissions: ['gis:admin'],
    module: 'gis',
    action: 'admin',
  },
  {
    path: '/gis/tracking',
    element: GisTrackingPage,
    requiredPermissions: ['gis:read'],
    module: 'gis',
    action: 'read',
  },
];
