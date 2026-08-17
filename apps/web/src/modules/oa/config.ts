import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

export const OA_PATHS = {
  root: '/oa',
  dashboard: '/oa/dashboard',
  documents: '/oa/documents',
  announcements: '/oa/announcements',
  meetings: '/oa/meetings',
  vehicles: '/oa/vehicles',
} as const;

export const oaModuleConfig: RouteModuleConfig = {
  code: 'oa',
  name: i18n.t('shared.config.k0'),
  nameKey: 'shared.config.k0',
  icon: 'FileText',
  path: OA_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 92,
  description: i18n.t('shared.config.k1'),
  permission: 'oa:documents:read',
  routes: [
    {
      path: OA_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/oa/DashboardPage'), 'DashboardPage'),
      module: 'oa',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      code: 'oa-dashboard',
      requiredPermissions: ['oa:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: OA_PATHS.documents,
      element: lazyWithRetry(
        () => import('@/pages/oa/DocumentManagementPage'),
        'DocumentManagementPage'
      ),
      module: 'oa',
      code: 'oa-documents',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      template: 'list',
      group: 'business',
      requiredPermissions: ['oa:document:read'],
      action: 'read',
    },
    {
      path: OA_PATHS.announcements,
      element: lazyWithRetry(() => import('@/pages/oa/AnnouncementPage'), 'AnnouncementPage'),
      module: 'oa',
      code: 'oa-announcements',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      template: 'list',
      group: 'master',
      requiredPermissions: ['oa:announcement:read'],
      action: 'read',
    },
    {
      path: OA_PATHS.meetings,
      element: lazyWithRetry(
        () => import('@/pages/oa/MeetingManagementPage'),
        'MeetingManagementPage'
      ),
      module: 'oa',
      code: 'oa-meetings',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      template: 'form',
      group: 'process',
      requiredPermissions: ['oa:meeting:read'],
      action: 'read',
    },
    {
      path: OA_PATHS.vehicles,
      element: lazyWithRetry(
        () => import('@/pages/oa/VehicleManagementPage'),
        'VehicleManagementPage'
      ),
      module: 'oa',
      code: 'oa-vehicles',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      template: 'list',
      group: 'business',
      requiredPermissions: ['oa:vehicle:read'],
      action: 'read',
    },
  ],
};

export const oaNavConfig: ModuleNavConfig = {
  code: 'oa',
  name: i18n.t('shared.config.k7'),
  nameKey: 'shared.config.k7',
  icon: 'FileText',
  path: OA_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  order: 92,
  navItems: [
    {
      code: 'oa-dashboard',
      label: i18n.t('shared.config.k8'),
      labelKey: 'shared.config.k8',
      icon: 'LayoutDashboard',
      path: OA_PATHS.dashboard,
      permission: 'oa:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
    {
      code: 'oa-documents',
      label: i18n.t('shared.config.k10'),
      labelKey: 'shared.config.k10',
      path: OA_PATHS.documents,
      permission: 'oa:document:read',
      group: 'business',
      showInSidebar: true,
    },
    {
      code: 'oa-announcements',
      label: i18n.t('shared.config.k11'),
      labelKey: 'shared.config.k11',
      path: OA_PATHS.announcements,
      permission: 'oa:announcement:read',
      group: 'master',
      showInSidebar: true,
    },
    {
      code: 'oa-meetings',
      label: i18n.t('shared.config.k12'),
      labelKey: 'shared.config.k12',
      path: OA_PATHS.meetings,
      permission: 'oa:meeting:read',
      group: 'process',
      showInSidebar: true,
    },
    {
      code: 'oa-vehicles',
      label: i18n.t('shared.config.k13'),
      labelKey: 'shared.config.k13',
      path: OA_PATHS.vehicles,
      permission: 'oa:vehicle:read',
      group: 'business',
      showInSidebar: true,
    },
  ],
};
