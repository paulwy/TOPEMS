import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const AssetManagementPage = lazy(() => import('../pages/fixed/AssetManagementPage'));
const EquipmentManagementPage = lazy(() => import('../pages/fixed/EquipmentManagementPage'));
const EquipmentInspectionPage = lazy(() => import('../pages/fixed/EquipmentInspectionPage'));
const EquipmentMaintenancePage = lazy(() => import('../pages/fixed/EquipmentMaintenancePage'));
const EquipmentDetailPage = lazy(() => import('../pages/equipment/EquipmentDetailPage'));
const AdministrationPage = lazy(() => import('../pages/admin/AdministrationPage'));
const BudgetManagementPage = lazy(() => import('../pages/finance/BudgetManagementPage'));
const OfficeSuppliesManagementPage = lazy(
  () => import('../pages/fixed/OfficeSuppliesManagementPage')
);
const MeetingRoomManagementPage = lazy(() => import('../pages/common/MeetingRoomManagementPage'));
const VehicleManagementPage = lazy(() => import('../pages/fixed/VehicleManagementPage'));
const AnnouncementManagementPage = lazy(() => import('../pages/common/AnnouncementManagementPage'));
const VoucherTemplatePage = lazy(() => import('../pages/fixed/VoucherTemplatePage'));
const AccountManagementPage = lazy(() => import('../pages/admin/AccountManagementPage'));
const BankAccountManagementPage = lazy(() => import('../pages/admin/BankAccountManagementPage'));
const ConsolidationScopePage = lazy(() => import('../pages/finance/ConsolidationScopePage'));
const ConsolidationReportsPage = lazy(() => import('../pages/finance/ConsolidationReportsPage'));
const CompanyStructurePage = lazy(() => import('../pages/admin/CompanyStructurePage'));
const OpeningBalancePage = lazy(() => import('../pages/finance/OpeningBalancePage'));
const ERPHomePage = lazy(() => import('../pages/erp/DashboardPage'));

const SrmOrderPage = lazy(() => import('../pages/srm/SrmOrderPage'));
const CrmOpportunityPage = lazy(() => import('../pages/crm/OpportunityManagementPage'));
const CrmCustomerPage = lazy(() => import('../pages/crm/CustomerManagementPage'));
export const erpRoutes: RouteConfig[] = [
  {
    path: '/erp',
    element: ERPHomePage,
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/erp/dashboard',
    element: ERPHomePage,
    requiredPermissions: ['erp:read'],
    module: 'erp',
    action: 'read',
  },
  {
    path: '/assets',
    element: AssetManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/equipment',
    element: EquipmentManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/equipment/inspections',
    element: EquipmentInspectionPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/equipment/maintenances',
    element: EquipmentMaintenancePage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/equipment/:id',
    element: EquipmentDetailPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/administration',
    element: AdministrationPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/budget',
    element: BudgetManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/office-supplies',
    element: OfficeSuppliesManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/meeting-rooms',
    element: MeetingRoomManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/vehicles',
    element: VehicleManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/announcements',
    element: AnnouncementManagementPage,
    requiredPermissions: ['erp:admin'],
    module: 'erp',
    action: 'admin',
  },
  {
    path: '/erp/purchase/order',
    element: SrmOrderPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/erp/purchase/receipt',
    element: SrmOrderPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/erp/sales/order',
    element: CrmOpportunityPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/erp/sales/delivery',
    element: CrmOpportunityPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/erp/customer',
    element: CrmCustomerPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
];
