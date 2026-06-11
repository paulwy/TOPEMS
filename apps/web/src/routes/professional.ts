import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const Rspage = lazy(() => import('../pages/Rspage'));
const Limspage = lazy(() => import('../pages/Limspage'));
const Qmspage = lazy(() => import('../pages/Qmspage'));
const Ehspage = lazy(() => import('../pages/Ehspage'));
const Srmpage = lazy(() => import('../pages/Srmpage'));
const Pdmpage = lazy(() => import('../pages/Pdmpage'));
const Gispage = lazy(() => import('../pages/Gispage'));
const Impage = lazy(() => import('../pages/Impage'));
const MailPage = lazy(() => import('../pages/MailPage'));
const IntegrationPage = lazy(() => import('../pages/IntegrationPage'));
const MobileWorkstationPage = lazy(() => import('../pages/MobileWorkstationPage'));
const PerformanceMonitorPage = lazy(() => import('../pages/PerformanceMonitorPage'));

export const professionalRoutes: RouteConfig[] = [
  {
    path: '/rs',
    element: React.createElement(Rspage),
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/lims',
    element: React.createElement(Limspage),
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/qms',
    element: React.createElement(Qmspage),
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/ehs',
    element: React.createElement(Ehspage),
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/srm',
    element: React.createElement(Srmpage),
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/pdm',
    element: React.createElement(Pdmpage),
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/gis',
    element: React.createElement(Gispage),
    requiredPermissions: ['gis:read'],
    module: 'gis',
    action: 'read',
  },
  {
    path: '/im',
    element: React.createElement(Impage),
    requiredPermissions: ['im:read'],
    module: 'im',
    action: 'read',
  },
  {
    path: '/mail',
    element: React.createElement(MailPage),
    requiredPermissions: ['mail:read'],
    module: 'mail',
    action: 'read',
  },
  {
    path: '/integration',
    element: React.createElement(IntegrationPage),
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/mobile-workstation',
    element: React.createElement(MobileWorkstationPage),
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/performance',
    element: React.createElement(PerformanceMonitorPage),
    requiredPermissions: [],
    module: 'performance',
    action: 'read',
  },
];
