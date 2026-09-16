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
const WmsInboundOrderPage = safeLazy(() => import('../pages/wms/WmsInboundOrderPage'));
const WmsOutboundOrderPage = safeLazy(() => import('../pages/wms/WmsOutboundOrderPage'));
const WmsInventoryPage = safeLazy(() => import('../pages/wms/WmsInventoryPage'));
const WmsStocktakePage = safeLazy(() => import('../pages/wms/WmsStocktakePage'));
const WmsLocationPage = safeLazy(() => import('../pages/wms/WmsLocationPage'));
const QmsInspectionRedesignPage = safeLazy(() => import('../pages/qms/QmsInspectionRedesignPage'));
const QmsNonconformanceRedesignPage = safeLazy(
  () => import('../pages/qms/QmsNonconformanceRedesignPage')
);
const QmsEightDRedesignPage = safeLazy(() => import('../pages/qms/QmsEightDRedesignPage'));
const QmsAuditRedesignPage = safeLazy(() => import('../pages/qms/QmsAuditRedesignPage'));
const CrmCustomerRedesignPage = safeLazy(() => import('../pages/crm/CrmCustomerRedesignPage'));
const CrmOpportunityRedesignPage = safeLazy(
  () => import('../pages/crm/CrmOpportunityRedesignPage')
);
const CrmContractRedesignPage = safeLazy(() => import('../pages/crm/CrmContractRedesignPage'));
const HrmEmployeeRedesignPage = safeLazy(() => import('../pages/hrm/HrmEmployeeRedesignPage'));
const HrmAttendanceRedesignPage = safeLazy(() => import('../pages/hrm/HrmAttendanceRedesignPage'));
const HrmPerformanceRedesignPage = safeLazy(
  () => import('../pages/hrm/HrmPerformanceRedesignPage')
);
const ErpSalesOrderRedesignPage = safeLazy(() => import('../pages/erp/ErpSalesOrderRedesignPage'));
const ErpInventoryRedesignPage = safeLazy(() => import('../pages/erp/ErpInventoryRedesignPage'));

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
  {
    path: '/wms/inbound-orders',
    element: WmsInboundOrderPage,
    requiredPermissions: [],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/outbound-orders',
    element: WmsOutboundOrderPage,
    requiredPermissions: [],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/inventory',
    element: WmsInventoryPage,
    requiredPermissions: [],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/stocktake',
    element: WmsStocktakePage,
    requiredPermissions: [],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/wms/locations',
    element: WmsLocationPage,
    requiredPermissions: [],
    module: 'wms',
    action: 'read',
  },
  {
    path: '/qms/inspection',
    element: QmsInspectionRedesignPage,
    requiredPermissions: [],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/nonconformance',
    element: QmsNonconformanceRedesignPage,
    requiredPermissions: [],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/eight-d',
    element: QmsEightDRedesignPage,
    requiredPermissions: [],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/audit',
    element: QmsAuditRedesignPage,
    requiredPermissions: [],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/crm/customers',
    element: CrmCustomerRedesignPage,
    requiredPermissions: [],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/opportunities',
    element: CrmOpportunityRedesignPage,
    requiredPermissions: [],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/contracts',
    element: CrmContractRedesignPage,
    requiredPermissions: [],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/hrm/employees',
    element: HrmEmployeeRedesignPage,
    requiredPermissions: [],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/attendance',
    element: HrmAttendanceRedesignPage,
    requiredPermissions: [],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/hrm/performance',
    element: HrmPerformanceRedesignPage,
    requiredPermissions: [],
    module: 'hrm',
    action: 'read',
  },
  {
    path: '/erp/sales-orders',
    element: ErpSalesOrderRedesignPage,
    requiredPermissions: [],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/erp/inventory',
    element: ErpInventoryRedesignPage,
    requiredPermissions: [],
    module: 'erp',
    action: 'read',
  },
];
