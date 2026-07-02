import React, { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';

const safeLazy = createSafeLazy();

const DashboardPage = safeLazy(() => import('../pages/shared/DashboardPage'));
const HybridHomePage = safeLazy(() => import('../pages/shared/HybridHomePage'));
const ModulesOverviewPage = safeLazy(() => import('../pages/shared/ModulesOverviewPage'));
const ProfilePage = safeLazy(() => import('../pages/shared/ProfilePage'));
const AddressbookPage = safeLazy(() => import('../pages/oa/AddressbookPage'));

export const dashboardRoutes: RouteConfig[] = [
  {
    path: '/',
    element: HybridHomePage,
  },
  {
    path: '/modules',
    element: ModulesOverviewPage,
  },
  {
    path: '/dashboard',
    element: DashboardPage,
  },
  {
    path: '/profile',
    element: ProfilePage,
  },
  {
    path: '/addressbook',
    element: AddressbookPage,
    requiredPermissions: ['hrm:read'],
    module: 'hrm',
    action: 'read',
  },
];
