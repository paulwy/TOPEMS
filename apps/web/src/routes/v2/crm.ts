import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const CRMDashboardPage = lazyWithRetry(
  () => import('../../pages/crm/DashboardPage'),
  'CRMDashboardPage'
);
const CustomerManagementPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerManagementPage'),
  'CustomerManagementPage'
);
const CustomerCreatePage = lazyWithRetry(
  () => import('../../pages/crm/CustomerCreatePage'),
  'CustomerCreatePage'
);
const CustomerEditPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerEditPage'),
  'CustomerEditPage'
);
const CustomerDetailPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerDetailPage'),
  'CustomerDetailPage'
);
const ContactManagementPage = lazyWithRetry(
  () => import('../../pages/crm/ContactManagementPage'),
  'ContactManagementPage'
);
const ContactDetailPage = lazyWithRetry(
  () => import('../../pages/crm/ContactDetailPage'),
  'ContactDetailPage'
);
const OpportunityManagementPage = lazyWithRetry(
  () => import('../../pages/crm/OpportunityManagementPage'),
  'OpportunityManagementPage'
);
const OpportunityDetailPage = lazyWithRetry(
  () => import('../../pages/crm/OpportunityDetailPage'),
  'OpportunityDetailPage'
);
const InteractionManagementPage = lazyWithRetry(
  () => import('../../pages/crm/InteractionManagementPage'),
  'InteractionManagementPage'
);
const CRMBillingPage = lazyWithRetry(
  () => import('../../pages/crm/CRMBillingPage'),
  'CRMBillingPage'
);
const CRMCustomerScoringPage = lazyWithRetry(
  () => import('../../pages/crm/CRMCustomerScoringPage'),
  'CRMCustomerScoringPage'
);
const CRMSalesForecastPage = lazyWithRetry(
  () => import('../../pages/crm/CRMSalesForecastPage'),
  'CRMSalesForecastPage'
);
const CRMCustomerSegmentationPage = lazyWithRetry(
  () => import('../../pages/crm/CRMCustomerSegmentationPage'),
  'CRMCustomerSegmentationPage'
);
const CRMSalesFunnelPage = lazyWithRetry(
  () => import('../../pages/crm/CRMSalesFunnelPage'),
  'CRMSalesFunnelPage'
);
const CRMRecommendationPage = lazyWithRetry(
  () => import('../../pages/crm/CRMRecommendationPage'),
  'CRMRecommendationPage'
);

export const crmModuleConfig: RouteModuleConfig = {
  code: 'crm',
  name: '客户关系',
  icon: 'Users',
  path: '/crm',
  source: 'plugin',
  suite: 'crm',
  status: 'online',
  order: 6,
  description: '客户管理、商机管理、销售漏斗、客户评分、销售预测',
  permission: 'crm:read',
  routes: [
    {
      path: '/crm/dashboard',
      element: CRMDashboardPage,
      module: 'crm',
      code: 'crm-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['crm:read'],
    },
    {
      path: '/crm/customers',
      element: CustomerManagementPage,
      module: 'crm',
      code: 'crm-customers',
      title: '客户管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:customer:read'],
    },
    {
      path: '/crm/customers/create',
      element: CustomerCreatePage,
      module: 'crm',
      code: 'crm-customer-create',
      title: '创建客户',
      template: 'form',
      group: 'business',
      requiredPermissions: ['crm:customer:create'],
    },
    {
      path: '/crm/customers/:id',
      element: CustomerDetailPage,
      module: 'crm',
      code: 'crm-customer-detail',
      title: '客户详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['crm:customer:read'],
    },
    {
      path: '/crm/customers/:id/edit',
      element: CustomerEditPage,
      module: 'crm',
      code: 'crm-customer-edit',
      title: '编辑客户',
      template: 'form',
      group: 'business',
      requiredPermissions: ['crm:customer:update'],
    },
    {
      path: '/crm/contacts',
      element: ContactManagementPage,
      module: 'crm',
      code: 'crm-contacts',
      title: '联系人管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:contact:read'],
    },
    {
      path: '/crm/contacts/:id',
      element: ContactDetailPage,
      module: 'crm',
      code: 'crm-contact-detail',
      title: '联系人详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['crm:contact:read'],
    },
    {
      path: '/crm/opportunities',
      element: OpportunityManagementPage,
      module: 'crm',
      code: 'crm-opportunities',
      title: '商机管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:opportunity:read'],
    },
    {
      path: '/crm/opportunities/:id',
      element: OpportunityDetailPage,
      module: 'crm',
      code: 'crm-opportunity-detail',
      title: '商机详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['crm:opportunity:read'],
    },
    {
      path: '/crm/interactions',
      element: InteractionManagementPage,
      module: 'crm',
      code: 'crm-interactions',
      title: '互动管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:interaction:read'],
    },
    {
      path: '/crm/billing',
      element: CRMBillingPage,
      module: 'crm',
      code: 'crm-billing',
      title: '账单管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:billing:read'],
    },
    {
      path: '/crm/sales-funnel',
      element: CRMSalesFunnelPage,
      module: 'crm',
      code: 'crm-sales-funnel',
      title: '销售漏斗',
      template: 'kanban',
      group: 'analytics',
      requiredPermissions: ['crm:sales_funnel:read'],
    },
    {
      path: '/crm/customer-scoring',
      element: CRMCustomerScoringPage,
      module: 'crm',
      code: 'crm-customer-scoring',
      title: '客户评分',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['crm:customer_scoring:read'],
    },
    {
      path: '/crm/sales-forecast',
      element: CRMSalesForecastPage,
      module: 'crm',
      code: 'crm-sales-forecast',
      title: '销售预测',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['crm:sales_forecast:read'],
    },
    {
      path: '/crm/customer-segmentation',
      element: CRMCustomerSegmentationPage,
      module: 'crm',
      code: 'crm-customer-segmentation',
      title: '客户细分',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['crm:customer_segmentation:read'],
    },
    {
      path: '/crm/recommendation',
      element: CRMRecommendationPage,
      module: 'crm',
      code: 'crm-recommendation',
      title: '智能推荐',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['crm:recommendation:read'],
    },
  ],
};
