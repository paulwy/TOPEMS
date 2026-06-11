import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const PmDashboardPage = lazy(() => import('../pages/PmDashboardPage'));
const PmProjectListPage = lazy(() => import('../pages/PmProjectListPage'));
const PmProjectDetailPage = lazy(() => import('../pages/PmProjectDetailPage'));
const PmProjectCreatePage = lazy(() => import('../pages/PmProjectCreatePage'));
const PmContractListPage = lazy(() => import('../pages/PmContractListPage'));
const PmContractDetailPage = lazy(() => import('../pages/PmContractDetailPage'));
const PmContractCreatePage = lazy(() => import('../pages/PmContractCreatePage'));
const ProjectDashboardPage = lazy(() => import('../pages/ProjectDashboardPage'));

export const pmRoutes: RouteConfig[] = [
  {
    path: '/pm',
    element: React.createElement(PmDashboardPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects',
    element: React.createElement(PmProjectListPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/create',
    element: React.createElement(PmProjectCreatePage),
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/projects/:id',
    element: React.createElement(PmProjectDetailPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/:id/edit',
    element: React.createElement(PmProjectCreatePage),
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts',
    element: React.createElement(PmContractListPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/contracts/create',
    element: React.createElement(PmContractCreatePage),
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts/:id',
    element: React.createElement(PmContractDetailPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/dashboard',
    element: React.createElement(ProjectDashboardPage),
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
];
