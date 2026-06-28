import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const ScmDashboardPage = lazy(() => import('../pages/scm/DashboardPage'));
const ScmSupplierPage = lazy(() => import('../pages/scm/ScmSupplierPage'));
const ScmPurchaseOrderPage = lazy(() => import('../pages/scm/ScmPurchaseOrderPage'));
const ScmPurchaseItemPage = lazy(() => import('../pages/scm/ScmPurchaseItemPage'));
const ScmEvaluationPage = lazy(() => import('../pages/scm/ScmEvaluationPage'));
const ScmDeliveryAppointmentPage = lazy(() => import('../pages/scm/ScmDeliveryAppointmentPage'));
const MrpPlanPage = lazy(() => import('../pages/scm/MrpPlanPage'));
const MrpSuggestionPage = lazy(() => import('../pages/scm/MrpSuggestionPage'));
const PurchaseRequisitionPage = lazy(() => import('../pages/scm/PurchaseRequisitionPage'));
const PurchaseContractPage = lazy(() => import('../pages/scm/PurchaseContractPage'));
const SupplierAdmissionPage = lazy(() => import('../pages/scm/SupplierAdmissionPage'));
const SupplierDetailPage = lazy(() => import('../pages/wms/SupplierDetailPage'));

export const scmRoutes: RouteConfig[] = [
  {
    path: '/scm',
    element: React.createElement(Navigate, {
      to: '/scm/suppliers',
      replace: true,
    }),
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/suppliers',
    element: ScmSupplierPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/suppliers/:id',
    element: SupplierDetailPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/purchase-orders',
    element: ScmPurchaseOrderPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/purchase-items',
    element: ScmPurchaseItemPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/evaluations',
    element: ScmEvaluationPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/delivery-appointments',
    element: ScmDeliveryAppointmentPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/mrp-plan',
    element: MrpPlanPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/mrp-suggestion',
    element: MrpSuggestionPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/purchase-requisitions',
    element: PurchaseRequisitionPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/purchase-contracts',
    element: PurchaseContractPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
  {
    path: '/scm/supplier-admissions',
    element: SupplierAdmissionPage,
    requiredPermissions: ['scm:read'],
    module: 'scm',
    action: 'read',
  },
];
