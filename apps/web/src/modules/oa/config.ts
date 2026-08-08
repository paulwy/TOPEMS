import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

export const OA_PATHS = {
  root: '/oa',
  documents: '/oa/documents',
  announcements: '/oa/announcements',
  meetings: '/oa/meetings',
  vehicles: '/oa/vehicles',
} as const;

export const oaModuleConfig: RouteModuleConfig = {
  code: 'oa',
  name: '办公自动化',
  icon: 'FileText',
  path: OA_PATHS.root,
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  order: 92,
  description: '企业办公自动化系统',
  permission: 'oa:read',
  routes: [
    {
      path: OA_PATHS.documents,
      element: lazyWithRetry(
        () => import('@/pages/oa/DocumentManagementPage'),
        'DocumentManagementPage'
      ),
      module: 'oa',
      code: 'oa-documents',
      title: '公文管理',
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
      title: '公告通知',
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
      title: '会议管理',
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
      title: '车辆管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['oa:vehicle:read'],
      action: 'read',
    },
  ],
};

export const oaNavConfig: ModuleNavConfig = {
  code: 'oa',
  name: '办公自动化',
  icon: 'FileText',
  path: OA_PATHS.root,
  source: 'plugin' as const,
  suite: 'collaboration',
  order: 92,
  navItems: [
    {
      code: 'oa-documents',
      label: '公文管理',
      path: OA_PATHS.documents,
      group: 'business',
      showInSidebar: true,
    },
    {
      code: 'oa-announcements',
      label: '公告通知',
      path: OA_PATHS.announcements,
      group: 'master',
      showInSidebar: true,
    },
    {
      code: 'oa-meetings',
      label: '会议管理',
      path: OA_PATHS.meetings,
      group: 'process',
      showInSidebar: true,
    },
    {
      code: 'oa-vehicles',
      label: '车辆管理',
      path: OA_PATHS.vehicles,
      group: 'business',
      showInSidebar: true,
    },
  ],
};
