import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 SCM_PATHS.xxx，而非硬编码字符串
/** DashboardPage 路由 Props · 模板=dashboard */
export interface DashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** ScmPurchaseOrderPage 路由 Props · 模板=list */
interface ScmPurchaseOrderPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** PurchaseRequisitionPage 路由 Props · 模板=list */
interface PurchaseRequisitionPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ScmPurchaseItemPage 路由 Props · 模板=list */
interface ScmPurchaseItemPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ScmSupplierPage 路由 Props · 模板=list */
interface ScmSupplierPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SupplierAdmissionPage 路由 Props · 模板=list */
interface SupplierAdmissionPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ScmEvaluationPage 路由 Props · 模板=list */
interface ScmEvaluationPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** PurchaseContractPage 路由 Props · 模板=list */
interface PurchaseContractPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ScmDeliveryAppointmentPage 路由 Props · 模板=list */
interface ScmDeliveryAppointmentPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MrpPlanPage 路由 Props · 模板=list */
interface MrpPlanPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** MrpSuggestionPage 路由 Props · 模板=list */
interface MrpSuggestionPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ScmOverviewPage 路由 Props · 模板=dashboard */
interface ScmOverviewPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** ScmInventoryTurnoverPage 路由 Props · 模板=stats */
interface ScmInventoryTurnoverPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** ScmPriceComparisonPage 路由 Props · 模板=stats */
interface ScmPriceComparisonPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** ScmPurchaseContractPage 路由 Props · 模板=list */
interface ScmPurchaseContractPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SourcingStrategyPage 路由 Props · 模板=settings */
interface SourcingStrategyPageProps {
  /** 当前定位的设置分组 key */
  section?: string;
  /** 设置面板主题（预留） */
  theme?: 'light' | 'dark';
}

/** QuotaTemplatePage 路由 Props · 模板=settings */
interface QuotaTemplatePageProps {
  /** 当前定位的设置分组 key */
  section?: string;
  /** 设置面板主题（预留） */
  theme?: 'light' | 'dark';
}

/** PurchaseThresholdPage 路由 Props · 模板=settings */
interface PurchaseThresholdPageProps {
  /** 当前定位的设置分组 key */
  section?: string;
  /** 设置面板主题（预留） */
  theme?: 'light' | 'dark';
}

/** SupplierTierPage 路由 Props · 模板=settings */
interface SupplierTierPageProps {
  /** 当前定位的设置分组 key */
  section?: string;
  /** 设置面板主题（预留） */
  theme?: 'light' | 'dark';
}
export const SCM_PATHS = {
  root: '/scm',
  dashboard: '/scm/dashboard',
  purchaseOrders: '/scm/purchase-orders',
  purchaseRequisition: '/scm/purchase-requisition',
  purchaseItems: '/scm/purchase-items',
  suppliers: '/scm/suppliers',
  supplierAdmission: '/scm/supplier-admission',
  supplierEvaluation: '/scm/supplier-evaluation',
  contracts: '/scm/contracts',
  deliveryAppointment: '/scm/delivery-appointment',
  mrpPlan: '/scm/mrp-plan',
  mrpSuggestion: '/scm/mrp-suggestion',
  overview: '/scm/overview',
  inventoryTurnover: '/scm/inventory-turnover',
  priceComparison: '/scm/price-comparison',
  purchaseContract: '/scm/purchase-contract',
  settingSourcingStrategy: '/scm/setting/sourcing-strategy',
  settingQuotaTemplate: '/scm/setting/quota-template',
  settingPurchaseThreshold: '/scm/setting/purchase-threshold',
  settingSupplierTier: '/scm/setting/supplier-tier',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const scmModuleConfig: RouteModuleConfig = {
  code: 'scm',
  name: i18n.t('shared.config.scm_name'),
  nameKey: 'shared.config.scm_name',
  icon: 'Truck',
  path: SCM_PATHS.root,
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 10,
  description: i18n.t('scm.nav.module_name_desc'),
  permission: 'scm:module:read',
  routes: [
    {
      path: SCM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/scm/DashboardPage'), 'DashboardPage'),
      module: 'scm',
      code: 'scm-dashboard',
      title: i18n.t('scm.nav.scm-dashboard'),
      titleKey: 'scm.nav.scm-dashboard',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['scm:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<DashboardPageProps>,
    {
      path: SCM_PATHS.purchaseOrders,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmPurchaseOrderPage'),
        'ScmPurchaseOrderPage'
      ),
      module: 'scm',
      code: 'scm-purchase-orders',
      title: i18n.t('scm.nav.scm-purchase-orders'),
      titleKey: 'scm.nav.scm-purchase-orders',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_order:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmPurchaseOrderPageProps>,
    {
      path: SCM_PATHS.purchaseRequisition,
      element: lazyWithRetry(
        () => import('@/pages/scm/PurchaseRequisitionPage'),
        'PurchaseRequisitionPage'
      ),
      module: 'scm',
      code: 'scm-purchase-requisition',
      title: i18n.t('scm.nav.scm-purchase-requisition'),
      titleKey: 'scm.nav.scm-purchase-requisition',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_requisition:read'],
      action: 'read',
    } satisfies RouteConfigV2<PurchaseRequisitionPageProps>,
    {
      path: SCM_PATHS.purchaseItems,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmPurchaseItemPage'),
        'ScmPurchaseItemPage'
      ),
      module: 'scm',
      code: 'scm-purchase-items',
      title: i18n.t('scm.nav.scm-purchase-items'),
      titleKey: 'scm.nav.scm-purchase-items',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_item:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmPurchaseItemPageProps>,
    {
      path: SCM_PATHS.suppliers,
      element: lazyWithRetry(() => import('@/pages/scm/ScmSupplierPage'), 'ScmSupplierPage'),
      module: 'scm',
      code: 'scm-suppliers',
      title: i18n.t('scm.nav.scm-suppliers'),
      titleKey: 'scm.nav.scm-suppliers',
      template: 'list',
      group: 'master',
      requiredPermissions: ['scm:supplier:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmSupplierPageProps>,
    {
      path: SCM_PATHS.supplierAdmission,
      element: lazyWithRetry(
        () => import('@/pages/scm/SupplierAdmissionPage'),
        'SupplierAdmissionPage'
      ),
      module: 'scm',
      code: 'scm-supplier-admission',
      title: i18n.t('scm.nav.scm-supplier-admission'),
      titleKey: 'scm.nav.scm-supplier-admission',
      template: 'list',
      group: 'master',
      requiredPermissions: ['scm:supplier_admission:read'],
      action: 'read',
    } satisfies RouteConfigV2<SupplierAdmissionPageProps>,
    {
      path: SCM_PATHS.supplierEvaluation,
      element: lazyWithRetry(() => import('@/pages/scm/ScmEvaluationPage'), 'ScmEvaluationPage'),
      module: 'scm',
      code: 'scm-supplier-evaluation',
      title: i18n.t('scm.nav.scm-supplier-evaluation'),
      titleKey: 'scm.nav.scm-supplier-evaluation',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:supplier_evaluation:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmEvaluationPageProps>,
    {
      path: SCM_PATHS.contracts,
      element: lazyWithRetry(
        () => import('@/pages/scm/PurchaseContractPage'),
        'PurchaseContractPage'
      ),
      module: 'scm',
      code: 'scm-contracts',
      title: i18n.t('scm.nav.scm-contracts'),
      titleKey: 'scm.nav.scm-contracts',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:contract:read'],
      action: 'read',
    } satisfies RouteConfigV2<PurchaseContractPageProps>,
    {
      path: SCM_PATHS.deliveryAppointment,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmDeliveryAppointmentPage'),
        'ScmDeliveryAppointmentPage'
      ),
      module: 'scm',
      code: 'scm-delivery-appointment',
      title: i18n.t('scm.nav.scm-delivery-appointment'),
      titleKey: 'scm.nav.scm-delivery-appointment',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:delivery_appointment:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmDeliveryAppointmentPageProps>,
    {
      path: SCM_PATHS.mrpPlan,
      element: lazyWithRetry(() => import('@/pages/scm/MrpPlanPage'), 'MrpPlanPage'),
      module: 'scm',
      code: 'scm-mrp-plan',
      title: i18n.t('scm.nav.scm-mrp-plan'),
      titleKey: 'scm.nav.scm-mrp-plan',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:mrp_plan:read'],
      action: 'read',
    } satisfies RouteConfigV2<MrpPlanPageProps>,
    {
      path: SCM_PATHS.mrpSuggestion,
      element: lazyWithRetry(() => import('@/pages/scm/MrpSuggestionPage'), 'MrpSuggestionPage'),
      module: 'scm',
      code: 'scm-mrp-suggestion',
      title: i18n.t('scm.nav.scm-mrp-suggestion'),
      titleKey: 'scm.nav.scm-mrp-suggestion',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:mrp_suggestion:read'],
      action: 'read',
    } satisfies RouteConfigV2<MrpSuggestionPageProps>,
    {
      path: SCM_PATHS.overview,
      element: lazyWithRetry(() => import('@/pages/scm/ScmOverviewPage'), 'ScmOverviewPage'),
      module: 'scm',
      code: 'scm-overview',
      title: i18n.t('scm.nav.scm-overview'),
      titleKey: 'scm.nav.scm-overview',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['scm:overview:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmOverviewPageProps>,
    {
      path: SCM_PATHS.inventoryTurnover,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmInventoryTurnoverPage'),
        'ScmInventoryTurnoverPage'
      ),
      module: 'scm',
      code: 'scm-inventory-turnover',
      title: i18n.t('scm.nav.scm-inventory-turnover'),
      titleKey: 'scm.nav.scm-inventory-turnover',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['scm:inventory_turnover:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmInventoryTurnoverPageProps>,
    {
      path: SCM_PATHS.priceComparison,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmPriceComparisonPage'),
        'ScmPriceComparisonPage'
      ),
      module: 'scm',
      code: 'scm-price-comparison',
      title: i18n.t('scm.nav.scm-price-comparison'),
      titleKey: 'scm.nav.scm-price-comparison',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['scm:price_comparison:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmPriceComparisonPageProps>,
    {
      path: SCM_PATHS.purchaseContract,
      element: lazyWithRetry(
        () => import('@/pages/scm/ScmPurchaseContractPage'),
        'ScmPurchaseContractPage'
      ),
      module: 'scm',
      code: 'scm-purchase-contract',
      title: i18n.t('scm.nav.scm-purchase-contract'),
      titleKey: 'scm.nav.scm-purchase-contract',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:contract:read'],
      action: 'read',
    } satisfies RouteConfigV2<ScmPurchaseContractPageProps>,
    {
      path: SCM_PATHS.settingSourcingStrategy,
      element: lazyWithRetry(
        () => import('@/pages/scm/setting/SourcingStrategyPage'),
        'SourcingStrategyPage'
      ),
      module: 'scm',
      code: 'scm-sourcing-strategy',
      title: i18n.t('scm.nav.scm-sourcing-strategy'),
      titleKey: 'scm.nav.scm-sourcing-strategy',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['scm:sourcing_strategy:read'],
      action: 'read',
    } satisfies RouteConfigV2<SourcingStrategyPageProps>,
    {
      path: SCM_PATHS.settingQuotaTemplate,
      element: lazyWithRetry(
        () => import('@/pages/scm/setting/QuotaTemplatePage'),
        'QuotaTemplatePage'
      ),
      module: 'scm',
      code: 'scm-quota-template',
      title: i18n.t('scm.nav.scm-quota-template'),
      titleKey: 'scm.nav.scm-quota-template',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['scm:quota_template:read'],
      action: 'read',
    } satisfies RouteConfigV2<QuotaTemplatePageProps>,
    {
      path: SCM_PATHS.settingPurchaseThreshold,
      element: lazyWithRetry(
        () => import('@/pages/scm/setting/PurchaseThresholdPage'),
        'PurchaseThresholdPage'
      ),
      module: 'scm',
      code: 'scm-purchase-threshold',
      title: i18n.t('scm.nav.scm-purchase-threshold'),
      titleKey: 'scm.nav.scm-purchase-threshold',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['scm:purchase_threshold:read'],
      action: 'read',
    } satisfies RouteConfigV2<PurchaseThresholdPageProps>,
    {
      path: SCM_PATHS.settingSupplierTier,
      element: lazyWithRetry(
        () => import('@/pages/scm/setting/SupplierTierPage'),
        'SupplierTierPage'
      ),
      module: 'scm',
      code: 'scm-supplier-tier',
      title: i18n.t('scm.nav.scm-supplier-tier'),
      titleKey: 'scm.nav.scm-supplier-tier',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['scm:supplier_tier:read'],
      action: 'read',
    } satisfies RouteConfigV2<SupplierTierPageProps>,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const scmNavConfig: ModuleNavConfig = {
  code: 'scm',
  name: i18n.t('scm.nav.module_name'),
  nameKey: 'scm.nav.module_name',
  icon: 'Truck',
  path: SCM_PATHS.root,
  permission: 'scm:module:read',
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 10,
  description: i18n.t('scm.nav.module_name_desc'),
  navItems: [
    {
      code: 'scm-dashboard',
      label: i18n.t('scm.nav.scm-dashboard'),
      labelKey: 'scm.nav.scm-dashboard',
      icon: 'LayoutDashboard',
      path: SCM_PATHS.dashboard,
      permission: 'scm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('scm.nav.scm-dashboard_desc'),
    },
    {
      code: 'scm-purchase-orders',
      label: i18n.t('scm.nav.scm-purchase-orders'),
      labelKey: 'scm.nav.scm-purchase-orders',
      icon: 'ClipboardList',
      path: SCM_PATHS.purchaseOrders,
      permission: 'scm:purchase_order:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('scm.nav.scm-purchase-orders_desc'),
    },
    {
      code: 'scm-purchase-requisition',
      label: i18n.t('scm.nav.scm-purchase-requisition'),
      labelKey: 'scm.nav.scm-purchase-requisition',
      icon: 'FileText',
      path: SCM_PATHS.purchaseRequisition,
      permission: 'scm:purchase_requisition:read',
      order: 2,
      group: 'business',
      description: i18n.t('scm.nav.scm-purchase-requisition_desc'),
    },
    {
      code: 'scm-purchase-items',
      label: i18n.t('scm.nav.scm-purchase-items'),
      labelKey: 'scm.nav.scm-purchase-items',
      icon: 'List',
      path: SCM_PATHS.purchaseItems,
      permission: 'scm:purchase_item:read',
      order: 3,
      group: 'business',
      description: i18n.t('scm.nav.scm-purchase-items_desc'),
    },
    {
      code: 'scm-suppliers',
      label: i18n.t('scm.nav.scm-suppliers'),
      labelKey: 'scm.nav.scm-suppliers',
      icon: 'Building',
      path: SCM_PATHS.suppliers,
      permission: 'scm:supplier:read',
      order: 4,
      group: 'master',
      description: i18n.t('scm.nav.scm-suppliers_desc'),
    },
    {
      code: 'scm-supplier-admission',
      label: i18n.t('scm.nav.scm-supplier-admission'),
      labelKey: 'scm.nav.scm-supplier-admission',
      icon: 'UserPlus',
      path: SCM_PATHS.supplierAdmission,
      permission: 'scm:supplier_admission:read',
      order: 5,
      group: 'master',
      description: i18n.t('scm.nav.scm-supplier-admission_desc'),
    },
    {
      code: 'scm-supplier-evaluation',
      label: i18n.t('scm.nav.scm-supplier-evaluation'),
      labelKey: 'scm.nav.scm-supplier-evaluation',
      icon: 'Award',
      path: SCM_PATHS.supplierEvaluation,
      permission: 'scm:supplier_evaluation:read',
      order: 1,
      group: 'process',
      description: i18n.t('scm.nav.scm-supplier-evaluation_desc'),
    },
    {
      code: 'scm-contracts',
      label: i18n.t('scm.nav.scm-contracts'),
      labelKey: 'scm.nav.scm-contracts',
      icon: 'FileText',
      path: SCM_PATHS.contracts,
      permission: 'scm:contract:read',
      order: 2,
      group: 'process',
      description: i18n.t('scm.nav.scm-contracts_desc'),
    },
    {
      code: 'scm-delivery-appointment',
      label: i18n.t('scm.nav.scm-delivery-appointment'),
      labelKey: 'scm.nav.scm-delivery-appointment',
      icon: 'Calendar',
      path: SCM_PATHS.deliveryAppointment,
      permission: 'scm:delivery_appointment:read',
      order: 3,
      group: 'process',
      description: i18n.t('scm.nav.scm-delivery-appointment_desc'),
    },
    {
      code: 'scm-mrp-plan',
      label: i18n.t('scm.nav.scm-mrp-plan'),
      labelKey: 'scm.nav.scm-mrp-plan',
      icon: 'LayoutGrid',
      path: SCM_PATHS.mrpPlan,
      permission: 'scm:mrp_plan:read',
      order: 4,
      group: 'process',
      description: i18n.t('scm.nav.scm-mrp-plan_desc'),
    },
    {
      code: 'scm-mrp-suggestion',
      label: i18n.t('scm.nav.scm-mrp-suggestion'),
      labelKey: 'scm.nav.scm-mrp-suggestion',
      icon: 'Lightbulb',
      path: SCM_PATHS.mrpSuggestion,
      permission: 'scm:mrp_suggestion:read',
      order: 5,
      group: 'process',
      description: i18n.t('scm.nav.scm-mrp-suggestion_desc'),
    },
    {
      code: 'scm-overview',
      label: i18n.t('scm.nav.scm-overview'),
      labelKey: 'scm.nav.scm-overview',
      icon: 'PieChart',
      path: SCM_PATHS.overview,
      permission: 'scm:overview:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('scm.nav.scm-overview_desc'),
    },
    {
      code: 'scm-inventory-turnover',
      label: i18n.t('scm.nav.scm-inventory-turnover'),
      labelKey: 'scm.nav.scm-inventory-turnover',
      icon: 'TrendingUp',
      path: SCM_PATHS.inventoryTurnover,
      permission: 'scm:inventory_turnover:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('scm.nav.scm-inventory-turnover_desc'),
    },
    {
      code: 'scm-price-comparison',
      label: i18n.t('scm.nav.scm-price-comparison'),
      labelKey: 'scm.nav.scm-price-comparison',
      icon: 'BarChart3',
      path: SCM_PATHS.priceComparison,
      permission: 'scm:price_comparison:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('scm.nav.scm-price-comparison_desc'),
    },
    {
      code: 'scm-purchase-contract',
      label: i18n.t('scm.nav.scm-purchase-contract'),
      labelKey: 'scm.nav.scm-purchase-contract',
      icon: 'FileText',
      path: SCM_PATHS.purchaseContract,
      permission: 'scm:contract:read',
      order: 6,
      group: 'process',
      description: i18n.t('scm.nav.scm-purchase-contract_desc'),
    },
    {
      code: 'scm-sourcing-strategy',
      label: i18n.t('scm.nav.scm-sourcing-strategy'),
      labelKey: 'scm.nav.scm-sourcing-strategy',
      icon: 'Search',
      path: SCM_PATHS.settingSourcingStrategy,
      permission: 'scm:sourcing_strategy:read',
      order: 1,
      group: 'setting',
      description: i18n.t('scm.nav.scm-sourcing-strategy_desc'),
    },
    {
      code: 'scm-quota-template',
      label: i18n.t('scm.nav.scm-quota-template'),
      labelKey: 'scm.nav.scm-quota-template',
      icon: 'PieChart',
      path: SCM_PATHS.settingQuotaTemplate,
      permission: 'scm:quota_template:read',
      order: 2,
      group: 'setting',
      description: i18n.t('scm.nav.scm-quota-template_desc'),
    },
    {
      code: 'scm-purchase-threshold',
      label: i18n.t('scm.nav.scm-purchase-threshold'),
      labelKey: 'scm.nav.scm-purchase-threshold',
      icon: 'AlertTriangle',
      path: SCM_PATHS.settingPurchaseThreshold,
      permission: 'scm:purchase_threshold:read',
      order: 3,
      group: 'setting',
      description: i18n.t('scm.nav.scm-purchase-threshold_desc'),
    },
    {
      code: 'scm-supplier-tier',
      label: i18n.t('scm.nav.scm-supplier-tier'),
      labelKey: 'scm.nav.scm-supplier-tier',
      icon: 'Award',
      path: SCM_PATHS.settingSupplierTier,
      permission: 'scm:supplier_tier:read',
      order: 4,
      group: 'setting',
      description: i18n.t('scm.nav.scm-supplier-tier_desc'),
    },
  ],
};
