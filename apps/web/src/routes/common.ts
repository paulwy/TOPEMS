import { createSafeLazy, type RouteConfig } from './utils';

// ============================================================
// P2-5 路由清理：本文件只保留 common 模块特有路由
// （v4-demo 演示页 / desktop 监控页），其余业务路由已统一收敛到
// 各模块 config（wms/qms/crm/hrm/erp/ehs/doc）为准。
// 删除的 10 处重复注册 + 9 处孤儿路由见 v1.19 变更日志。
// ============================================================

const COMMON_PATHS = {
  v4Demo: '/v4-demo',
  desktopMonitor: '/desktop/monitor',
  desktopAuditLogs: '/desktop/audit-logs',
} as const;

const safeLazy = createSafeLazy();

const V4DemoPage = safeLazy(() => import('../components/shared/V4DemoPage'));
const DesktopMonitorPage = safeLazy(() => import('../components/desktop/DesktopMonitorPage'));
const AuditLogPage = safeLazy(() => import('../components/desktop/AuditLogPage'));

export const commonRoutes: RouteConfig[] = [
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
