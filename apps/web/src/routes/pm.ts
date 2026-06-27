import React from 'react';
import { Navigate } from 'react-router-dom';
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
const PmResourcePage = lazy(() => import('../pages/pm/PmResourcePage'));
const ProjectDashboardPage = lazy(() => import('../pages/shared/ProjectDashboardPage'));

export const pmRoutes: RouteConfig[] = [
  {
    path: '/pm',
    element: React.createElement(Navigate, {
      to: '/pm/projects',
      replace: true,
    }),
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects',
    element: PmProjectListPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/create',
    element: PmProjectCreatePage,
    requiredPermissions: ['pm:write'],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/projects/:id',
    element: PmProjectDetailPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/projects/:id/edit',
    element: PmProjectCreatePage,
    requiredPermissions: ['pm:write'],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts',
    element: PmContractListPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/contracts/create',
    element: PmContractCreatePage,
    requiredPermissions: ['pm:write'],
    module: 'pm',
    action: 'write',
  },
  {
    path: '/pm/contracts/:id',
    element: PmContractDetailPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/dashboard',
    element: ProjectDashboardPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/templates',
    element: PmTemplatePage,
    requiredPermissions: ['pm:admin'],
    module: 'pm',
    action: 'admin',
  },
  {
    path: '/pm/reports',
    element: PmReportPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/reports/:projectId',
    element: PmReportPage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
  {
    path: '/pm/resources',
    element: PmResourcePage,
    requiredPermissions: ['pm:read'],
    module: 'pm',
    action: 'read',
  },
];
