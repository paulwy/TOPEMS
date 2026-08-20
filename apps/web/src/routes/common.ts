import { createSafeLazy, type RouteConfig } from './utils';
import { EHS_PATHS } from '@/modules/ehs/config';
import { DOC_PATHS } from '@/modules/doc/config';

const COMMON_PATHS = {
  v4Demo: '/v4-demo',
  desktopMonitor: '/desktop/monitor',
  desktopAuditLogs: '/desktop/audit-logs',
} as const;

const safeLazy = createSafeLazy();

const EhsAccidentPage = safeLazy(() => import('../pages/ehs/EhsAccidentPage'));
const DocumentsPage = safeLazy(() => import('../pages/doc/DocumentsPage'));
const V4DemoPage = safeLazy(() => import('../pages/shared/V4DemoPage'));
const DesktopMonitorPage = safeLazy(() => import('../pages/desktop/DesktopMonitorPage'));
const AuditLogPage = safeLazy(() => import('../pages/desktop/AuditLogPage'));

export const commonRoutes: RouteConfig[] = [
  {
    path: EHS_PATHS.accident,
    element: EhsAccidentPage,
    requiredPermissions: ['ehs:dashboard:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: DOC_PATHS.documents,
    element: DocumentsPage,
    requiredPermissions: ['doc:dashboard:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: COMMON_PATHS.v4Demo,
    element: V4DemoPage,
    requiredPermissions: [],
    module: 'common',
    action: 'read',
  },
  {
    path: COMMON_PATHS.desktopMonitor,
    element: DesktopMonitorPage,
    requiredPermissions: [],
    module: 'desktop',
    action: 'read',
  },
  {
    path: COMMON_PATHS.desktopAuditLogs,
    element: AuditLogPage,
    requiredPermissions: [],
    module: 'desktop',
    action: 'read',
  },
];
