import React, { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';

export const DASHBOARD_PATHS = {
  root: '/',
  modules: '/modules',
  dashboard: '/dashboard',
  profile: '/profile',
  addressbook: '/addressbook',
  help: '/help',
} as const;

export const MOBILE_TAB_PATHS = {
  tasks: '/tasks',
  scan: '/scan',
  approval: '/approval',
  approvals: '/approvals',
} as const;

const safeLazy = createSafeLazy();

const DashboardPage = safeLazy(() => import('../pages/shared/DashboardPage'));
const HybridHomePage = safeLazy(() => import('../pages/shared/HybridHomePage'));
const ModulesOverviewPage = safeLazy(() => import('../pages/shared/ModulesOverviewPage'));
const ProfilePage = safeLazy(() => import('../pages/shared/ProfilePage'));
const AddressbookPage = safeLazy(() => import('../pages/oa/AddressbookPage'));

export const dashboardRoutes: RouteConfig[] = [
  {
    path: DASHBOARD_PATHS.root,
    element: HybridHomePage,
  },
  {
    path: DASHBOARD_PATHS.modules,
    element: ModulesOverviewPage,
  },
  {
    path: DASHBOARD_PATHS.dashboard,
    element: DashboardPage,
  },
  {
    path: DASHBOARD_PATHS.profile,
    element: ProfilePage,
  },
  {
    path: DASHBOARD_PATHS.addressbook,
    element: AddressbookPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
];
