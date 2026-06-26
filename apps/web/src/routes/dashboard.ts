import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const DashboardPage = lazy(() => import('../pages/shared/DashboardPage'));
const HybridHomePage = lazy(() => import('../pages/shared/HybridHomePage'));
const ModulesOverviewPage = lazy(() => import('../pages/modules/ModulesOverviewPage'));
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'));
const AddressbookPage = lazy(() => import('../pages/common/AddressbookPage'));

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
  },
];
