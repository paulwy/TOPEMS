import { lazy } from 'react';
import type { RouteConfig } from './utils';

const MeetingRoomManagementPage = lazy(() => import('../pages/oa/MeetingRoomManagementPage'));
const EhsAccidentPage = lazy(() => import('../pages/ehs/EhsAccidentPage'));

const SystemSettingsPage = lazy(() => import('../pages/admin/SystemSettingsPage'));
const SystemManagementPage = lazy(() => import('../pages/admin/SystemManagementPage'));
const DatabaseStructurePage = lazy(() => import('../pages/admin/DatabaseStructurePage'));
const ConfigDebugPage = lazy(() => import('../pages/admin/ConfigDebugPage'));
const CompanyStructurePage = lazy(() => import('../pages/admin/CompanyStructurePage'));
const MonitorPage = lazy(() => import('../pages/admin/MonitorPage'));
const DocumentsPage = lazy(() => import('../pages/docs/DocumentsPage'));

export const commonRoutes: RouteConfig[] = [
  {
    path: '/meeting-room',
    element: MeetingRoomManagementPage,
    requiredPermissions: ['erp:admin'],
  },

  {
    path: '/system/settings',
    element: SystemSettingsPage,
    requiredPermissions: ['iam:system_update'],
  },
  {
    path: '/system/management',
    element: SystemManagementPage,
    requiredPermissions: ['iam:system_update'],
  },
  {
    path: '/system/database',
    element: DatabaseStructurePage,
    requiredPermissions: ['iam:system_update'],
  },
  {
    path: '/system/config-debug',
    element: ConfigDebugPage,
    requiredPermissions: ['iam:system_update'],
  },
  {
    path: '/system/company-structure',
    element: CompanyStructurePage,
    requiredPermissions: ['iam:system_update'],
  },
  {
    path: '/system/monitor',
    element: MonitorPage,
    requiredPermissions: ['iam:system_read'],
  },

  {
    path: '/ehs/accidents',
    element: EhsAccidentPage,
    requiredPermissions: ['ehs:read'],
  },
  {
    path: '/common/documents',
    element: DocumentsPage,
    requiredPermissions: ['doc:read'],
  },
];
