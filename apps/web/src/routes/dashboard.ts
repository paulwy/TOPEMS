import React, { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';

export const DASHBOARD_PATHS = {
  root: '/',
  modules: '/modules',
  dashboard: '/dashboard',
  profile: '/profile',
  favorites: '/favorites',
  comments: '/comments',
  attachments: '/attachments',
  addressbook: '/addressbook',
  help: '/help',
  helpCenter: '/help/center',
  helpFaq: '/help/faq',
  helpGuide: '/help/guide',
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
const FavoritesPage = safeLazy(() => import('../pages/shared/FavoritesPage'));
const CommentsPage = safeLazy(() => import('../pages/shared/CommentsPage'));
const AttachmentsPage = safeLazy(() => import('../pages/shared/AttachmentsPage'));
const HelpCenterPage = safeLazy(() => import('../pages/help/HelpCenterPage'));
const FaqPage = safeLazy(() => import('../pages/help/FaqPage'));
const GuidePage = safeLazy(() => import('../pages/help/GuidePage'));

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
    path: DASHBOARD_PATHS.favorites,
    element: FavoritesPage,
  },
  {
    path: DASHBOARD_PATHS.comments,
    element: CommentsPage,
  },
  {
    path: DASHBOARD_PATHS.attachments,
    element: AttachmentsPage,
  },
  {
    path: DASHBOARD_PATHS.helpCenter,
    element: HelpCenterPage,
  },
  {
    path: DASHBOARD_PATHS.helpFaq,
    element: FaqPage,
  },
  {
    path: DASHBOARD_PATHS.helpGuide,
    element: GuidePage,
  },
];
