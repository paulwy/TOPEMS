import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

interface CrmDashboardPageProps {}
interface CustomerManagementPageProps {
  page?: number;
  pageSize?: number;
  searchKeyword?: string;
}
interface CustomerDetailProps {
  id?: string;
  customerId?: string;
  tab?: string;
}
interface CustomerCreatePageProps {}
interface CustomerEditPageProps {
  id?: string;
}
interface ContactManagementPageProps {}
interface ContactDetailPageProps {
  id?: string;
}
interface OpportunityManagementPageProps {}
interface OpportunityDetailPageProps {
  id?: string;
}
interface CRMSalesFunnelPageProps {}
interface CRMBillingPageProps {}

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 CRM_PATHS.xxx，而非硬编码字符串
export const CRM_PATHS = {
  root: '/crm',
  dashboard: '/crm/dashboard',
  customers: '/crm/customers',
  customerCreate: '/crm/customers/create',
  customerDetail: '/crm/customers/:id',
  customerEdit: '/crm/customers/:id/edit',
  contacts: '/crm/contacts',
  contactDetail: '/crm/contacts/:id',
  opportunities: '/crm/opportunities',
  opportunityDetail: '/crm/opportunities/:id',
  interactions: '/crm/interactions',
  billing: '/crm/billing',
  salesFunnel: '/crm/sales-funnel',
  customerScoring: '/crm/customer-scoring',
  salesForecast: '/crm/sales-forecast',
  customerSegmentation: '/crm/customer-segmentation',
  rfm: '/crm/rfm',
  forecastAlgorithm: '/crm/forecast-algorithm',
  recommendation: '/crm/recommendation',
  returns: '/crm/returns',
  returnDetail: '/crm/returns/:id',
} as const;

// ---- 路由配置（供路由系统使用） ----
const crmDashboardRoute: RouteConfigV2<CrmDashboardPageProps> = {
  path: CRM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/crm/CrmDashboardPage'), 'CrmDashboardPage'),
  module: 'crm',
  code: 'crm-dashboard',
  title: i18n.t('crm.nav.crm-dashboard'),
  titleKey: 'crm.nav.crm-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['crm:dashboard:read'],
  action: 'read',
};

const customerManagementRoute: RouteConfigV2<CustomerManagementPageProps> = {
  path: CRM_PATHS.customers,
  element: lazyWithRetry(
    () => import('@/pages/crm/CustomerManagementPage'),
    'CustomerManagementPage'
  ),
  module: 'crm',
  code: 'crm-customers',
  title: i18n.t('crm.nav.crm-customers'),
  titleKey: 'crm.nav.crm-customers',
  template: 'list',
  group: 'master',
  requiredPermissions: ['crm:customer:read', 'crm:dashboard:read'],
  action: 'read',
};

const customerDetailRoute: RouteConfigV2<CustomerDetailProps> = {
  path: CRM_PATHS.customerDetail,
  element: lazyWithRetry(() => import('@/pages/crm/CustomerDetailPage'), 'CustomerDetailPage'),
  module: 'crm',
  code: 'crm-customer-detail',
  title: i18n.t('crm.nav.crm-customer-detail'),
  titleKey: 'crm.nav.crm-customer-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['crm:customer:read', 'crm:dashboard:read'],
  action: 'read',
};

const contactManagementRoute: RouteConfigV2<ContactManagementPageProps> = {
  path: CRM_PATHS.contacts,
  element: lazyWithRetry(
    () => import('@/pages/crm/ContactManagementPage'),
    'ContactManagementPage'
  ),
  module: 'crm',
  code: 'crm-contacts',
  title: i18n.t('crm.nav.crm-contacts'),
  titleKey: 'crm.nav.crm-contacts',
  template: 'list',
  group: 'master',
  requiredPermissions: ['crm:contact:read', 'crm:dashboard:read'],
  action: 'read',
};

const contactDetailRoute: RouteConfigV2<ContactDetailPageProps> = {
  path: CRM_PATHS.contactDetail,
  element: lazyWithRetry(() => import('@/pages/crm/ContactDetailPage'), 'ContactDetailPage'),
  module: 'crm',
  code: 'crm-contact-detail',
  title: i18n.t('crm.nav.crm-contact-detail'),
  titleKey: 'crm.nav.crm-contact-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['crm:contact:read', 'crm:dashboard:read'],
  action: 'read',
};

const opportunityManagementRoute: RouteConfigV2<OpportunityManagementPageProps> = {
  path: CRM_PATHS.opportunities,
  element: lazyWithRetry(
    () => import('@/pages/crm/OpportunityManagementPage'),
    'OpportunityManagementPage'
  ),
  module: 'crm',
  code: 'crm-opportunities',
  title: i18n.t('crm.nav.crm-opportunities'),
  titleKey: 'crm.nav.crm-opportunities',
  template: 'list',
  group: 'business',
  requiredPermissions: ['crm:opportunity:read', 'crm:dashboard:read'],
  action: 'read',
};

const opportunityDetailRoute: RouteConfigV2<OpportunityDetailPageProps> = {
  path: CRM_PATHS.opportunityDetail,
  element: lazyWithRetry(
    () => import('@/pages/crm/OpportunityDetailPage'),
    'OpportunityDetailPage'
  ),
  module: 'crm',
  code: 'crm-opportunity-detail',
  title: i18n.t('crm.nav.crm-opportunity-detail'),
  titleKey: 'crm.nav.crm-opportunity-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['crm:opportunity:read', 'crm:dashboard:read'],
  action: 'read',
};

const salesFunnelRoute: RouteConfigV2<CRMSalesFunnelPageProps> = {
  path: CRM_PATHS.salesFunnel,
  element: lazyWithRetry(() => import('@/pages/crm/CRMSalesFunnelPage'), 'CRMSalesFunnelPage'),
  module: 'crm',
  code: 'crm-sales-funnel',
  title: i18n.t('crm.nav.crm-sales-funnel'),
  titleKey: 'crm.nav.crm-sales-funnel',
  template: 'kanban',
  group: 'analytics',
  requiredPermissions: ['crm:sales_funnel:read', 'crm:dashboard:read'],
  action: 'read',
};

const billingRoute: RouteConfigV2<CRMBillingPageProps> = {
  path: CRM_PATHS.billing,
  element: lazyWithRetry(() => import('@/pages/crm/CRMBillingPage'), 'CRMBillingPage'),
  module: 'crm',
  code: 'crm-billing',
  title: i18n.t('crm.nav.crm-billing'),
  titleKey: 'crm.nav.crm-billing',
  template: 'list',
  group: 'business',
  requiredPermissions: ['crm:billing:read', 'crm:dashboard:read'],
  action: 'read',
};

const crmRoutes: RouteConfigV2[] = [
  crmDashboardRoute,
  customerManagementRoute,
  {
    path: CRM_PATHS.customerCreate,
    element: lazyWithRetry(() => import('@/pages/crm/CustomerCreatePage'), 'CustomerCreatePage'),
    module: 'crm',
    code: 'crm-customer-create',
    title: i18n.t('crm.nav.crm-customer-create'),
    titleKey: 'crm.nav.crm-customer-create',
    template: 'form',
    group: 'business',
    requiredPermissions: ['crm:customer:create', 'crm:dashboard:write'],
    action: 'write',
  } as RouteConfigV2<CustomerCreatePageProps>,
  customerDetailRoute,
  {
    path: CRM_PATHS.customerEdit,
    element: lazyWithRetry(() => import('@/pages/crm/CustomerEditPage'), 'CustomerEditPage'),
    module: 'crm',
    code: 'crm-customer-edit',
    title: i18n.t('crm.nav.crm-customer-edit'),
    titleKey: 'crm.nav.crm-customer-edit',
    template: 'form',
    group: 'business',
    requiredPermissions: ['crm:customer:update', 'crm:dashboard:update'],
    action: 'update',
  } as RouteConfigV2<CustomerEditPageProps>,
  contactManagementRoute,
  contactDetailRoute,
  opportunityManagementRoute,
  opportunityDetailRoute,
  {
    path: CRM_PATHS.interactions,
    element: lazyWithRetry(
      () => import('@/pages/crm/InteractionManagementPage'),
      'InteractionManagementPage'
    ),
    module: 'crm',
    code: 'crm-interactions',
    title: i18n.t('crm.nav.crm-interactions'),
    titleKey: 'crm.nav.crm-interactions',
    template: 'list',
    group: 'business',
    requiredPermissions: ['crm:interaction:read', 'crm:dashboard:read'],
  },
  billingRoute,
  salesFunnelRoute,
  {
    path: CRM_PATHS.customerScoring,
    element: lazyWithRetry(
      () => import('@/pages/crm/CRMCustomerScoringPage'),
      'CRMCustomerScoringPage'
    ),
    module: 'crm',
    code: 'crm-customer-scoring',
    title: i18n.t('crm.nav.crm-customer-scoring'),
    titleKey: 'crm.nav.crm-customer-scoring',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['crm:customer_scoring:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.salesForecast,
    element: lazyWithRetry(
      () => import('@/pages/crm/CRMSalesForecastPage'),
      'CRMSalesForecastPage'
    ),
    module: 'crm',
    code: 'crm-sales-forecast',
    title: i18n.t('crm.nav.crm-sales-forecast'),
    titleKey: 'crm.nav.crm-sales-forecast',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['crm:sales_forecast:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.customerSegmentation,
    element: lazyWithRetry(
      () => import('@/pages/crm/CRMCustomerSegmentationPage'),
      'CRMCustomerSegmentationPage'
    ),
    module: 'crm',
    code: 'crm-customer-segmentation',
    title: i18n.t('crm.nav.crm-customer-segmentation'),
    titleKey: 'crm.nav.crm-customer-segmentation',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['crm:customer_segmentation:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.rfm,
    element: lazyWithRetry(() => import('@/pages/crm/CrmRfmPage'), 'CrmRfmPage'),
    module: 'crm',
    code: 'crm-rfm',
    title: i18n.t('crm.nav.crm-rfm'),
    titleKey: 'crm.nav.crm-rfm',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['crm:rfm:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.forecastAlgorithm,
    element: lazyWithRetry(
      () => import('@/pages/crm/CrmForecastAlgorithmPage'),
      'CrmForecastAlgorithmPage'
    ),
    module: 'crm',
    code: 'crm-forecast-algorithm',
    title: i18n.t('crm.nav.crm-forecast-algorithm'),
    titleKey: 'crm.nav.crm-forecast-algorithm',
    template: 'stats',
    group: 'analytics',
    requiredPermissions: ['crm:forecast:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.recommendation,
    element: lazyWithRetry(
      () => import('@/pages/crm/CRMRecommendationPage'),
      'CRMRecommendationPage'
    ),
    module: 'crm',
    code: 'crm-recommendation',
    title: i18n.t('crm.nav.crm-recommendation'),
    titleKey: 'crm.nav.crm-recommendation',
    template: 'dashboard',
    group: 'analytics',
    requiredPermissions: ['crm:recommendation:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.returns,
    element: lazyWithRetry(() => import('@/pages/crm/ReturnListPage'), 'ReturnListPage'),
    module: 'crm',
    code: 'crm-returns',
    title: i18n.t('crm.nav.crm-returns'),
    titleKey: 'crm.nav.crm-returns',
    template: 'list',
    group: 'business',
    requiredPermissions: ['crm:return:read', 'crm:dashboard:read'],
    action: 'read',
  },
  {
    path: CRM_PATHS.returnDetail,
    element: lazyWithRetry(() => import('@/pages/crm/ReturnDetailPage'), 'ReturnDetailPage'),
    module: 'crm',
    code: 'crm-return-detail',
    title: i18n.t('crm.nav.crm-return-detail'),
    titleKey: 'crm.nav.crm-return-detail',
    template: 'detail',
    group: 'business',
    requiredPermissions: ['crm:return:read', 'crm:dashboard:read'],
    action: 'read',
  },
];

export const crmModuleConfig: RouteModuleConfig = {
  code: 'crm',
  name: i18n.t('shared.config.crm_name'),
  nameKey: 'shared.config.crm_name',
  icon: 'Users',
  path: CRM_PATHS.root,
  source: 'plugin',
  suite: 'crm',
  status: 'online',
  order: 6,
  description: i18n.t('crm.nav.module_name_desc'),
  permission: 'crm:dashboard:read',
  routes: crmRoutes,
};

// ---- 导航配置（供导航注册表使用） ----
export const crmNavConfig: ModuleNavConfig = {
  code: 'crm',
  name: i18n.t('crm.nav.module_name'),
  nameKey: 'crm.nav.module_name',
  icon: 'Users',
  path: CRM_PATHS.root,
  permission: 'crm:dashboard:read',
  source: 'plugin',
  suite: 'crm',
  status: 'online',
  order: 6,
  description: i18n.t('crm.nav.module_name_desc'),
  navItems: [
    {
      code: 'crm-dashboard',
      label: i18n.t('crm.nav.crm-dashboard'),
      labelKey: 'crm.nav.crm-dashboard',
      icon: 'LayoutDashboard',
      path: CRM_PATHS.dashboard,
      permission: 'crm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('crm.nav.crm-dashboard_desc'),
    },
    {
      code: 'crm-customers',
      label: i18n.t('crm.nav.crm-customers'),
      labelKey: 'crm.nav.crm-customers',
      icon: 'UserCircle',
      path: CRM_PATHS.customers,
      permission: 'crm:customer:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('crm.nav.crm-customers_desc'),
    },
    {
      code: 'crm-contacts',
      label: i18n.t('crm.nav.crm-contacts'),
      labelKey: 'crm.nav.crm-contacts',
      icon: 'User',
      path: CRM_PATHS.contacts,
      permission: 'crm:contact:read',
      order: 2,
      group: 'master',
      description: i18n.t('crm.nav.crm-contacts_desc'),
    },
    {
      code: 'crm-opportunities',
      label: i18n.t('crm.nav.crm-opportunities'),
      labelKey: 'crm.nav.crm-opportunities',
      icon: 'Target',
      path: CRM_PATHS.opportunities,
      permission: 'crm:opportunity:read',
      order: 3,
      group: 'business',
      description: i18n.t('crm.nav.crm-opportunities_desc'),
    },
    {
      code: 'crm-interactions',
      label: i18n.t('crm.nav.crm-interactions'),
      labelKey: 'crm.nav.crm-interactions',
      icon: 'MessageSquare',
      path: CRM_PATHS.interactions,
      permission: 'crm:interaction:read',
      order: 4,
      group: 'business',
      description: i18n.t('crm.nav.crm-interactions_desc'),
    },
    {
      code: 'crm-returns',
      label: i18n.t('crm.nav.crm-returns'),
      labelKey: 'crm.nav.crm-returns',
      icon: 'RotateCcw',
      path: CRM_PATHS.returns,
      permission: 'crm:return:read',
      order: 5,
      group: 'business',
      description: i18n.t('crm.nav.crm-returns_desc'),
    },
    {
      code: 'crm-customer-segmentation',
      label: i18n.t('crm.nav.crm-customer-segmentation'),
      labelKey: 'crm.nav.crm-customer-segmentation',
      icon: 'Layers',
      path: CRM_PATHS.customerSegmentation,
      permission: 'crm:customer_segmentation:read',
      order: 5,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-customer-segmentation_desc'),
    },
    {
      code: 'crm-rfm',
      label: i18n.t('crm.nav.crm-rfm'),
      labelKey: 'crm.nav.crm-rfm',
      icon: 'Activity',
      path: CRM_PATHS.rfm,
      permission: 'crm:rfm:read',
      order: 6,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-rfm_desc'),
    },
    {
      code: 'crm-forecast-algorithm',
      label: i18n.t('crm.nav.crm-forecast-algorithm'),
      labelKey: 'crm.nav.crm-forecast-algorithm',
      icon: 'Calculator',
      path: CRM_PATHS.forecastAlgorithm,
      permission: 'crm:forecast:read',
      order: 7,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-forecast-algorithm_desc'),
    },
    {
      code: 'crm-customer-scoring',
      label: i18n.t('crm.nav.crm-customer-scoring'),
      labelKey: 'crm.nav.crm-customer-scoring',
      icon: 'Award',
      path: CRM_PATHS.customerScoring,
      permission: 'crm:customer_scoring:read',
      order: 8,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-customer-scoring_desc'),
    },
    {
      code: 'crm-sales-funnel',
      label: i18n.t('crm.nav.crm-sales-funnel'),
      labelKey: 'crm.nav.crm-sales-funnel',
      icon: 'TrendingUp',
      path: CRM_PATHS.salesFunnel,
      permission: 'crm:sales_funnel:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('crm.nav.crm-sales-funnel_desc'),
    },
    {
      code: 'crm-sales-forecast',
      label: i18n.t('crm.nav.crm-sales-forecast'),
      labelKey: 'crm.nav.crm-sales-forecast',
      icon: 'BarChart3',
      path: CRM_PATHS.salesForecast,
      permission: 'crm:sales_forecast:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-sales-forecast_desc'),
    },
    {
      code: 'crm-billing',
      label: i18n.t('crm.nav.crm-billing'),
      labelKey: 'crm.nav.crm-billing',
      icon: 'CreditCard',
      path: CRM_PATHS.billing,
      permission: 'crm:billing:read',
      order: 6,
      group: 'business',
      description: i18n.t('crm.nav.crm-billing_desc'),
    },
    {
      code: 'crm-recommendation',
      label: i18n.t('crm.nav.crm-recommendation'),
      labelKey: 'crm.nav.crm-recommendation',
      icon: 'Sparkles',
      path: CRM_PATHS.recommendation,
      permission: 'crm:recommendation:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('crm.nav.crm-recommendation_desc'),
    },
  ],
};
