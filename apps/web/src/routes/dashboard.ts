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
  systemSettings: '/system/settings',
} as const;

const safeLazy = createSafeLazy();

const DashboardPage = safeLazy(() => import('../pages/shared/DashboardPage'));
const HybridHomePage = safeLazy(() => import('../pages/shared/HybridHomePage'));
const ModulesOverviewPage = safeLazy(() => import('../pages/shared/ModulesOverviewPage'));
const ProfilePage = safeLazy(() => import('../pages/shared/ProfilePage'));
const FavoritesPage = safeLazy(() => import('../pages/shared/FavoritesPage'));
const CommentsPage = safeLazy(() => import('../pages/shared/CommentsPage'));
const AttachmentsPage = safeLazy(() => import('../pages/shared/AttachmentsPage'));
const HelpCenterPage = safeLazy(() => import('../components/help/HelpCenterPage'));
const FaqPage = safeLazy(() => import('../components/help/FaqPage'));
const GuidePage = safeLazy(() => import('../components/help/GuidePage'));
const SystemParamsPage = safeLazy(() => import('../pages/system/SystemParamsPage'));

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
  {
    path: DASHBOARD_PATHS.systemSettings,
    element: SystemParamsPage,
  },
];
