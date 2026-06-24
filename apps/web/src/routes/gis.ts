import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const GisDashboardPage = lazy(() => import('../pages/gis/DashboardPage'));
const GisFencePage = lazy(() => import('../pages/gis/GisFencePage'));
const GisTrackingPage = lazy(() => import('../pages/gis/GisTrackingPage'));

export const gisRoutes: RouteConfig[] = [
  {
    path: '/gis',
    element: GisDashboardPage,
  },
  {
    path: '/gis/map',
    element: GisDashboardPage,
  },
  {
    path: '/gis/fence',
    element: GisFencePage,
  },
  {
    path: '/gis/tracking',
    element: GisTrackingPage,
  },
];
