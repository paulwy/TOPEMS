import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const CRMDashboardPage = lazy(() => import('../pages/crm/DashboardPage'));
const CustomerManagementPage = lazy(() => import('../pages/crm/CustomerManagementPage'));
const ContactManagementPage = lazy(() => import('../pages/crm/ContactManagementPage'));
const OpportunityManagementPage = lazy(() => import('../pages/crm/OpportunityManagementPage'));
const InteractionManagementPage = lazy(() => import('../pages/crm/InteractionManagementPage'));
const CRMCustomerScoringPage = lazy(() => import('../pages/crm/CRMCustomerScoringPage'));
const CRMSalesForecastPage = lazy(() => import('../pages/crm/CRMSalesForecastPage'));
const CRMSalesFunnelPage = lazy(() => import('../pages/crm/CRMSalesFunnelPage'));
const CRMCustomerSegmentationPage = lazy(() => import('../pages/crm/CRMCustomerSegmentationPage'));
const CRMRecommendationPage = lazy(() => import('../pages/crm/CRMRecommendationPage'));
const CRMBillingPage = lazy(() => import('../pages/crm/CRMBillingPage'));
const CustomerDetailPage = lazy(() => import('../pages/crm/CustomerDetailPage'));
const OpportunityDetailPage = lazy(() => import('../pages/crm/OpportunityDetailPage'));
const ContactDetailPage = lazy(() => import('../pages/crm/ContactDetailPage'));
const CustomerCreatePage = lazy(() => import('../pages/crm/CustomerCreatePage'));
const CustomerEditPage = lazy(() => import('../pages/crm/CustomerEditPage'));

export const crmRoutes: RouteConfig[] = [
  {
    path: '/crm',
    element: React.createElement(Navigate, {
      to: '/crm/dashboard',
      replace: true,
    }),
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/dashboard',
    element: CRMDashboardPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/customers',
    element: CustomerManagementPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/contacts',
    element: ContactManagementPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/opportunities',
    element: OpportunityManagementPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/interactions',
    element: InteractionManagementPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/scoring',
    element: CRMCustomerScoringPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/forecast',
    element: CRMSalesForecastPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/funnel',
    element: CRMSalesFunnelPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/segments',
    element: CRMCustomerSegmentationPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/recommendations',
    element: CRMRecommendationPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/billing',
    element: CRMBillingPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/customers/:id',
    element: CustomerDetailPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/customers/create',
    element: CustomerCreatePage,
    requiredPermissions: ['crm:write'],
    module: 'crm',
    action: 'write',
  },
  {
    path: '/crm/customers/:id/edit',
    element: CustomerEditPage,
    requiredPermissions: ['crm:write'],
    module: 'crm',
    action: 'write',
  },
  {
    path: '/crm/opportunities/:id',
    element: OpportunityDetailPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
  {
    path: '/crm/contacts/:id',
    element: ContactDetailPage,
    requiredPermissions: ['crm:read'],
    module: 'crm',
    action: 'read',
  },
];
