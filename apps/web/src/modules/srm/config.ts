import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 SRM_PATHS.xxx，而非硬编码字符串
/** SrmDashboardPage 路由 Props · 模板=dashboard */
export interface SrmDashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** SrmSupplierPage 路由 Props · 模板=list */
export interface SrmSupplierPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmSupplierDetailPage 路由 Props · 模板=detail */
export interface SrmSupplierDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** SrmCategoryPage 路由 Props · 模板=list */
export interface SrmCategoryPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmSupplierProductPage 路由 Props · 模板=list */
export interface SrmSupplierProductPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmContractPage 路由 Props · 模板=list */
export interface SrmContractPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmContractDetailPage 路由 Props · 模板=detail */
export interface SrmContractDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** SrmOrderPage 路由 Props · 模板=list */
export interface SrmOrderPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmEvaluationPage 路由 Props · 模板=list */
export interface SrmEvaluationPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmPerformancePage 路由 Props · 模板=stats */
export interface SrmPerformancePageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** SrmScoringDimensionPage 路由 Props · 模板=list */
export interface SrmScoringDimensionPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** InquiryQuotationPage 路由 Props · 模板=list */
export interface InquiryQuotationPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** BiddingPage 路由 Props · 模板=list */
export interface BiddingPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SrmFinancePage 路由 Props · 模板=list */
export interface SrmFinancePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** SupplierPortalPage 路由 Props · 模板=dashboard */
export interface SupplierPortalPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** SrmQuotationPage 路由 Props · 模板=list */
export interface SrmQuotationPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}
export const SRM_PATHS = {
  root: '/srm',
  dashboard: '/srm/dashboard',
  supplier: '/srm/supplier',
  supplierDetail: '/srm/supplier/:id',
  contract: '/srm/contract',
  contractDetail: '/srm/contract/:id',
  category: '/srm/category',
  product: '/srm/product',
  order: '/srm/order',
  evaluation: '/srm/evaluation',
  performance: '/srm/performance',
  scoringDimension: '/srm/scoring-dimension',
  inquiry: '/srm/inquiry',
  bidding: '/srm/bidding',
  finance: '/srm/finance',
  portal: '/srm/portal',
  quotation: '/srm/quotation',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const srmModuleConfig: RouteModuleConfig = {
  code: 'srm',
  name: i18n.t('shared.config.srm_name'),
  nameKey: 'shared.config.srm_name',
  icon: 'Users',
  path: SRM_PATHS.root,
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 14,
  description: i18n.t('shared.config.k1'),
  permission: 'srm:dashboard:read',
  routes: [
    {
      path: SRM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/srm/SrmDashboardPage'), 'SrmDashboardPage'),
      module: 'srm',
      title: i18n.t('shared.config.srm_0'),
      titleKey: 'shared.config.srm_0',
      code: 'srm-dashboard',
      requiredPermissions: ['srm:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    } satisfies RouteConfigV2<SrmDashboardPageProps>,
    {
      path: SRM_PATHS.supplier,
      element: lazyWithRetry(() => import('@/pages/srm/SrmSupplierPage'), 'SrmSupplierPage'),
      module: 'srm',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      code: 'srm-supplier',
      requiredPermissions: ['srm:supplier:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<SrmSupplierPageProps>,
    {
      path: SRM_PATHS.supplierDetail,
      element: lazyWithRetry(
        () => import('@/pages/srm/SrmSupplierDetailPage'),
        'SrmSupplierDetailPage'
      ),
      module: 'srm',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      code: 'srm-supplier-detail',
      requiredPermissions: ['srm:supplier:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    } satisfies RouteConfigV2<SrmSupplierDetailPageProps>,
    {
      path: SRM_PATHS.category,
      element: lazyWithRetry(() => import('@/pages/srm/SrmCategoryPage'), 'SrmCategoryPage'),
      module: 'srm',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      code: 'srm-category',
      requiredPermissions: ['srm:category:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<SrmCategoryPageProps>,
    {
      path: SRM_PATHS.product,
      element: lazyWithRetry(
        () => import('@/pages/srm/SrmSupplierProductPage'),
        'SrmSupplierProductPage'
      ),
      module: 'srm',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      code: 'srm-product',
      requiredPermissions: ['srm:product:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<SrmSupplierProductPageProps>,
    {
      path: SRM_PATHS.contract,
      element: lazyWithRetry(() => import('@/pages/srm/SrmContractPage'), 'SrmContractPage'),
      module: 'srm',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      code: 'srm-contract',
      requiredPermissions: ['srm:contract:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    } satisfies RouteConfigV2<SrmContractPageProps>,
    {
      path: SRM_PATHS.contractDetail,
      element: lazyWithRetry(
        () => import('@/pages/srm/SrmContractDetailPage'),
        'SrmContractDetailPage'
      ),
      module: 'srm',
      title: i18n.t('shared.config.k7'),
      titleKey: 'shared.config.k7',
      code: 'srm-contract-detail',
      requiredPermissions: ['srm:contract:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    } satisfies RouteConfigV2<SrmContractDetailPageProps>,
    {
      path: SRM_PATHS.order,
      element: lazyWithRetry(() => import('@/pages/srm/SrmOrderPage'), 'SrmOrderPage'),
      module: 'srm',
      title: i18n.t('shared.config.k8'),
      titleKey: 'shared.config.k8',
      code: 'srm-order',
      requiredPermissions: ['srm:order:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    } satisfies RouteConfigV2<SrmOrderPageProps>,
    {
      path: SRM_PATHS.evaluation,
      element: lazyWithRetry(() => import('@/pages/srm/SrmEvaluationPage'), 'SrmEvaluationPage'),
      module: 'srm',
      title: i18n.t('shared.config.k9'),
      titleKey: 'shared.config.k9',
      code: 'srm-evaluation',
      requiredPermissions: ['srm:evaluation:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'analytics',
    } satisfies RouteConfigV2<SrmEvaluationPageProps>,
    {
      path: SRM_PATHS.performance,
      element: lazyWithRetry(() => import('@/pages/srm/SrmPerformancePage'), 'SrmPerformancePage'),
      module: 'srm',
      title: i18n.t('shared.config.k10'),
      titleKey: 'shared.config.k10',
      code: 'srm-performance',
      requiredPermissions: ['srm:performance:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'stats',
      group: 'analytics',
    } satisfies RouteConfigV2<SrmPerformancePageProps>,
    {
      path: SRM_PATHS.scoringDimension,
      element: lazyWithRetry(
        () => import('@/pages/srm/SrmScoringDimensionPage'),
        'SrmScoringDimensionPage'
      ),
      module: 'srm',
      title: i18n.t('shared.config.k11'),
      titleKey: 'shared.config.k11',
      code: 'srm-scoring-dimension',
      requiredPermissions: ['srm:evaluation:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'setting',
    } satisfies RouteConfigV2<SrmScoringDimensionPageProps>,
    {
      path: SRM_PATHS.inquiry,
      element: lazyWithRetry(
        () => import('@/pages/srm/InquiryQuotationPage'),
        'InquiryQuotationPage'
      ),
      module: 'srm',
      title: i18n.t('shared.config.k12'),
      titleKey: 'shared.config.k12',
      code: 'srm-inquiry',
      requiredPermissions: ['srm:inquiry:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<InquiryQuotationPageProps>,
    {
      path: SRM_PATHS.bidding,
      element: lazyWithRetry(() => import('@/pages/srm/BiddingPage'), 'BiddingPage'),
      module: 'srm',
      title: i18n.t('shared.config.k13'),
      titleKey: 'shared.config.k13',
      code: 'srm-bidding',
      requiredPermissions: ['srm:bidding:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<BiddingPageProps>,
    {
      path: SRM_PATHS.finance,
      element: lazyWithRetry(() => import('@/pages/srm/SrmFinancePage'), 'SrmFinancePage'),
      module: 'srm',
      title: i18n.t('shared.config.k14'),
      titleKey: 'shared.config.k14',
      code: 'srm-finance',
      requiredPermissions: ['srm:finance:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    } satisfies RouteConfigV2<SrmFinancePageProps>,
    {
      path: SRM_PATHS.portal,
      element: lazyWithRetry(() => import('@/pages/srm/SupplierPortalPage'), 'SupplierPortalPage'),
      module: 'srm',
      title: i18n.t('shared.config.k15'),
      titleKey: 'shared.config.k15',
      code: 'srm-portal',
      requiredPermissions: ['srm:portal:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'master',
    } satisfies RouteConfigV2<SupplierPortalPageProps>,
    {
      path: SRM_PATHS.quotation,
      element: lazyWithRetry(() => import('@/pages/srm/SrmQuotationPage'), 'SrmQuotationPage'),
      module: 'srm',
      title: i18n.t('shared.config.k16'),
      titleKey: 'shared.config.k16',
      code: 'srm-quotation',
      requiredPermissions: ['srm:quotation:read', 'srm:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<SrmQuotationPageProps>,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const srmNavConfig: ModuleNavConfig = {
  code: 'srm',
  name: i18n.t('shared.config.k17'),
  nameKey: 'shared.config.k17',
  icon: 'Users',
  path: SRM_PATHS.root,
  permission: 'srm:dashboard:read',
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 14,
  description: i18n.t('shared.config.k18'),
  navItems: [
    {
      code: 'srm-dashboard',
      label: i18n.t('shared.config.k19'),
      labelKey: 'shared.config.k19',
      icon: 'LayoutDashboard',
      path: SRM_PATHS.dashboard,
      permission: 'srm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.srm_1'),
    },
    {
      code: 'srm-supplier',
      label: i18n.t('shared.config.k20'),
      labelKey: 'shared.config.k20',
      icon: 'Building2',
      path: SRM_PATHS.supplier,
      permission: 'srm:supplier:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k21'),
    },
    {
      code: 'srm-category',
      label: i18n.t('shared.config.k22'),
      labelKey: 'shared.config.k22',
      icon: 'Tags',
      path: SRM_PATHS.category,
      permission: 'srm:category:read',
      order: 2,
      group: 'master',
      description: i18n.t('shared.config.k23'),
    },
    {
      code: 'srm-product',
      label: i18n.t('shared.config.k24'),
      labelKey: 'shared.config.k24',
      icon: 'Package',
      path: SRM_PATHS.product,
      permission: 'srm:product:read',
      order: 3,
      group: 'master',
      description: i18n.t('shared.config.k25'),
    },
    {
      code: 'srm-contract',
      label: i18n.t('shared.config.k26'),
      labelKey: 'shared.config.k26',
      icon: 'FileCheck',
      path: SRM_PATHS.contract,
      permission: 'srm:contract:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k27'),
    },
    {
      code: 'srm-order',
      label: i18n.t('shared.config.k28'),
      labelKey: 'shared.config.k28',
      icon: 'ShoppingCart',
      path: SRM_PATHS.order,
      permission: 'srm:order:read',
      order: 5,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k29'),
    },
    {
      code: 'srm-evaluation',
      label: i18n.t('shared.config.k30'),
      labelKey: 'shared.config.k30',
      icon: 'Star',
      path: SRM_PATHS.evaluation,
      permission: 'srm:evaluation:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('shared.config.k31'),
    },
    {
      code: 'srm-performance',
      label: i18n.t('shared.config.k32'),
      labelKey: 'shared.config.k32',
      icon: 'TrendingUp',
      path: SRM_PATHS.performance,
      permission: 'srm:performance:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('shared.config.k33'),
    },
    {
      code: 'srm-scoring-dimension',
      label: i18n.t('shared.config.k34'),
      labelKey: 'shared.config.k34',
      icon: 'Target',
      path: SRM_PATHS.scoringDimension,
      permission: 'srm:evaluation:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k35'),
    },
    {
      code: 'srm-inquiry',
      label: i18n.t('shared.config.k36'),
      labelKey: 'shared.config.k36',
      icon: 'MessageSquareQuote',
      path: SRM_PATHS.inquiry,
      permission: 'srm:inquiry:read',
      order: 1,
      group: 'process',
      description: i18n.t('shared.config.k37'),
    },
    {
      code: 'srm-bidding',
      label: i18n.t('shared.config.k38'),
      labelKey: 'shared.config.k38',
      icon: 'Award',
      path: SRM_PATHS.bidding,
      permission: 'srm:bidding:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k39'),
    },
    {
      code: 'srm-quotation',
      label: i18n.t('shared.config.k40'),
      labelKey: 'shared.config.k40',
      icon: 'FileText',
      path: SRM_PATHS.quotation,
      permission: 'srm:quotation:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k41'),
    },
    {
      code: 'srm-finance',
      label: i18n.t('shared.config.k42'),
      labelKey: 'shared.config.k42',
      icon: 'Wallet',
      path: SRM_PATHS.finance,
      permission: 'srm:finance:read',
      order: 6,
      group: 'business',
      description: i18n.t('shared.config.k43'),
    },
    {
      code: 'srm-portal',
      label: i18n.t('shared.config.k44'),
      labelKey: 'shared.config.k44',
      icon: 'ExternalLink',
      path: SRM_PATHS.portal,
      permission: 'srm:portal:read',
      order: 7,
      group: 'master',
      description: i18n.t('shared.config.k45'),
    },
  ],
};
