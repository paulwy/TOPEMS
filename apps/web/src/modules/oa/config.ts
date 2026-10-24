import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

const OA_PATHS = {
  root: '/oa',
  dashboard: '/oa/dashboard',
  documents: '/oa/documents',
  announcements: '/oa/announcements',
  meetings: '/oa/meetings',
  vehicles: '/oa/vehicles',
} as const;
interface DashboardPageProps {}

interface DocumentManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface AnnouncementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface MeetingManagementPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface VehicleManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: OA_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/oa/DashboardPage'), 'DashboardPage'),
  module: 'oa',
  title: i18n.t('oa.nav.oa-dashboard'),
  titleKey: 'oa.nav.oa-dashboard',
  code: 'oa-dashboard',
  requiredPermissions: ['oa:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const documentManagementRoute: RouteConfigV2<DocumentManagementPageProps> = {
  path: OA_PATHS.documents,
  element: lazyWithRetry(
    () => import('@/pages/oa/DocumentManagementPage'),
    'DocumentManagementPage'
  ),
  module: 'oa',
  code: 'oa-documents',
  title: i18n.t('oa.nav.oa-documents'),
  titleKey: 'oa.nav.oa-documents',
  template: 'list',
  group: 'business',
  requiredPermissions: ['oa:document:read'],
  action: 'read',
};

const announcementRoute: RouteConfigV2<AnnouncementPageProps> = {
  path: OA_PATHS.announcements,
  element: lazyWithRetry(() => import('@/pages/oa/AnnouncementPage'), 'AnnouncementPage'),
  module: 'oa',
  code: 'oa-announcements',
  title: i18n.t('oa.nav.oa-announcements'),
  titleKey: 'oa.nav.oa-announcements',
  template: 'list',
  group: 'master',
  requiredPermissions: ['oa:announcement:read'],
  action: 'read',
};

const meetingManagementRoute: RouteConfigV2<MeetingManagementPageProps> = {
  path: OA_PATHS.meetings,
  element: lazyWithRetry(() => import('@/pages/oa/MeetingManagementPage'), 'MeetingManagementPage'),
  module: 'oa',
  code: 'oa-meetings',
  title: i18n.t('oa.nav.oa-meetings'),
  titleKey: 'oa.nav.oa-meetings',
  template: 'form',
  group: 'process',
  requiredPermissions: ['oa:meeting:read'],
  action: 'read',
};

const vehicleManagementRoute: RouteConfigV2<VehicleManagementPageProps> = {
  path: OA_PATHS.vehicles,
  element: lazyWithRetry(() => import('@/pages/oa/VehicleManagementPage'), 'VehicleManagementPage'),
  module: 'oa',
  code: 'oa-vehicles',
  title: i18n.t('oa.nav.oa-vehicles'),
  titleKey: 'oa.nav.oa-vehicles',
  template: 'list',
  group: 'business',
  requiredPermissions: ['oa:vehicle:read'],
  action: 'read',
};

export const oaModuleConfig: RouteModuleConfig = {
  code: 'oa',
  name: i18n.t('shared.config.oa_name'),
  nameKey: 'shared.config.oa_name',
  icon: 'FileText',
  path: OA_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 92,
  description: i18n.t('oa.nav.module_name_desc'),
  permission: 'oa:documents:read',
  routes: [
    dashboardRoute,
    documentManagementRoute,
    announcementRoute,
    meetingManagementRoute,
    vehicleManagementRoute,
  ],
};
