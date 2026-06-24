import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const PmDashboardPage = lazy(() => import('../pages/pm/DashboardPage'));
const PmProjectListPage = lazy(() => import('../pages/pm/PmProjectListPage'));
const PmProjectDetailPage = lazy(() => import('../pages/pm/PmProjectDetailPage'));
const PmProjectCreatePage = lazy(() => import('../pages/pm/PmProjectCreatePage'));
const PmContractListPage = lazy(() => import('../pages/pm/PmContractListPage'));
const PmContractDetailPage = lazy(() => import('../pages/pm/PmContractDetailPage'));
const PmContractCreatePage = lazy(() => import('../pages/pm/PmContractCreatePage'));
const PmTemplatePage = lazy(() => import('../pages/pm/PmTemplatePage'));
const PmReportPage = lazy(() => import('../pages/pm/PmReportPage'));
const ProjectDashboardPage = lazy(() => import('../pages/shared/ProjectDashboardPage'));

export const pmRoutes: RouteConfig[] = [
  {
    path: '/pm',
    element: PmDashboardPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects',
    element: PmProjectListPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/create',
    element: PmProjectCreatePage,
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/projects/:id',
    element: PmProjectDetailPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/:id/edit',
    element: PmProjectCreatePage,
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts',
    element: PmContractListPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/contracts/create',
    element: PmContractCreatePage,
    requiredPermissions: [],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts/:id',
    element: PmContractDetailPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/dashboard',
    element: ProjectDashboardPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/templates',
    element: PmTemplatePage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/reports',
    element: PmReportPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/reports/:projectId',
    element: PmReportPage,
    requiredPermissions: [],
    module: 'pm',
    action: 'read',
  },
];
