import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const CrmDashboardPage = lazyWithRetry(
  () => import('../../pages/crm/DashboardPage'),
  'DashboardPage'
);
const CrmSalesFunnelPage = lazyWithRetry(
  () => import('../../pages/crm/CRMSalesFunnelPage'),
  'CRMSalesFunnelPage'
);
const CustomerDetailPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerDetailPage'),
  'CustomerDetailPage'
);
const CustomerCreatePage = lazyWithRetry(
  () => import('../../pages/crm/CustomerCreatePage'),
  'CustomerCreatePage'
);
const CustomerEditPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerEditPage'),
  'CustomerEditPage'
);
const ContactDetailPage = lazyWithRetry(
  () => import('../../pages/crm/ContactDetailPage'),
  'ContactDetailPage'
);
const CustomerManagementPage = lazyWithRetry(
  () => import('../../pages/crm/CustomerManagementPage'),
  'CustomerManagementPage'
);
const ContactManagementPage = lazyWithRetry(
  () => import('../../pages/crm/ContactManagementPage'),
  'ContactManagementPage'
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
const CRMCustomerSegmentationPage = lazyWithRetry(
  () => import('../../pages/crm/CRMCustomerSegmentationPage'),
  'CRMCustomerSegmentationPage'
);
const CRMCustomerScoringPage = lazyWithRetry(
  () => import('../../pages/crm/CRMCustomerScoringPage'),
  'CRMCustomerScoringPage'
);
const CRMSalesForecastPage = lazyWithRetry(
  () => import('../../pages/crm/CRMSalesForecastPage'),
  'CRMSalesForecastPage'
);
const CRMBillingPage = lazyWithRetry(
  () => import('../../pages/crm/CRMBillingPage'),
  'CRMBillingPage'
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
  source: 'core',
  suite: 'crm',
  status: 'online',
  order: 7,
  description: '客户管理、销售漏斗、商机、联系人、互动管理',
  permission: 'crm:read',
  routes: [
    {
      path: '/crm/dashboard',
      element: CrmDashboardPage,
      module: 'crm',
      code: 'crm-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['crm:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
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
      nav: {
        label: '客户管理',
        icon: 'UserCircle',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
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
      title: '联系人',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:contact:read'],
      nav: {
        label: '联系人',
        icon: 'User',
        order: 2,
        group: 'business',
      },
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
      nav: {
        label: '商机管理',
        icon: 'Target',
        order: 3,
        group: 'business',
      },
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
      title: '互动记录',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:interaction:read'],
      nav: {
        label: '互动记录',
        icon: 'MessageSquare',
        order: 4,
        group: 'business',
      },
    },
    {
      path: '/crm/segmentation',
      element: CRMCustomerSegmentationPage,
      module: 'crm',
      code: 'crm-segmentation',
      title: '客户分群',
      template: 'list',
      group: 'business',
      requiredPermissions: ['crm:segmentation:read'],
      nav: {
        label: '客户分群',
        icon: 'Layers',
        order: 5,
        group: 'business',
      },
    },
    {
      path: '/crm/scoring',
      element: CRMCustomerScoringPage,
      module: 'crm',
      code: 'crm-scoring',
      title: '客户评分',
      template: 'stats',
      group: 'business',
      requiredPermissions: ['crm:scoring:read'],
      nav: {
        label: '客户评分',
        icon: 'Award',
        order: 6,
        group: 'business',
      },
    },
    {
      path: '/crm/sales-funnel',
      element: CrmSalesFunnelPage,
      module: 'crm',
      code: 'crm-sales-funnel',
      title: '销售漏斗',
      template: 'stats',
      group: 'process',
      requiredPermissions: ['crm:funnel:read'],
      nav: {
        label: '销售漏斗',
        icon: 'TrendingUp',
        order: 1,
        group: 'process',
        showInTabs: true,
      },
    },
    {
      path: '/crm/forecast',
      element: CRMSalesForecastPage,
      module: 'crm',
      code: 'crm-forecast',
      title: '销售预测',
      template: 'stats',
      group: 'process',
      requiredPermissions: ['crm:forecast:read'],
      nav: {
        label: '销售预测',
        icon: 'BarChart3',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/crm/billing',
      element: CRMBillingPage,
      module: 'crm',
      code: 'crm-billing',
      title: '计费管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['crm:billing:read'],
      nav: {
        label: '计费管理',
        icon: 'CreditCard',
        order: 3,
        group: 'process',
      },
    },
    {
      path: '/crm/recommendation',
      element: CRMRecommendationPage,
      module: 'crm',
      code: 'crm-recommendation',
      title: '智能推荐',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['crm:recommendation:read'],
      nav: {
        label: '智能推荐',
        icon: 'Sparkles',
        order: 1,
        group: 'analytics',
      },
    },
  ],
};
