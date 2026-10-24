import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig, ListPageProps } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import type { SupplierCategoryQuery, SupplierProductQuery } from '@/api/srm';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 SRM_PATHS.xxx，而非硬编码字符串

// V259 TypeMap: list 页统一 extends ListPageProps，已对齐后端 DTO 的实体标注查询类型
// dashboard/stats/detail 模板保留自定义 Props（非 list 模式，字段结构不同）
/** SrmDashboardPage 路由 Props · 模板=dashboard */
interface SrmDashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** SrmSupplierPage 路由 Props · 模板=list */
interface SrmSupplierPageProps extends ListPageProps {}

/** SrmSupplierDetailPage 路由 Props · 模板=detail */
interface SrmSupplierDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** SrmCategoryPage 路由 Props · 模板=list · filters 对齐 SupplierCategoryQuery */
interface SrmCategoryPageProps extends ListPageProps<SupplierCategoryQuery> {}

/** SrmSupplierProductPage 路由 Props · 模板=list · filters 对齐 SupplierProductQuery */
interface SrmSupplierProductPageProps extends ListPageProps<SupplierProductQuery> {}

/** SrmContractPage 路由 Props · 模板=list */
interface SrmContractPageProps extends ListPageProps {}

/** SrmContractDetailPage 路由 Props · 模板=detail */
interface SrmContractDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** SrmOrderPage 路由 Props · 模板=list */
interface SrmOrderPageProps extends ListPageProps {}

/** SrmEvaluationPage 路由 Props · 模板=list */
interface SrmEvaluationPageProps extends ListPageProps {}

/** SrmPerformancePage 路由 Props · 模板=stats */
interface SrmPerformancePageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** SrmScoringDimensionPage 路由 Props · 模板=list */
interface SrmScoringDimensionPageProps extends ListPageProps {}

/** InquiryQuotationPage 路由 Props · 模板=list */
interface InquiryQuotationPageProps extends ListPageProps {}

/** BiddingPage 路由 Props · 模板=list */
interface BiddingPageProps extends ListPageProps {}

/** SrmFinancePage 路由 Props · 模板=list */
interface SrmFinancePageProps extends ListPageProps {}

/** SupplierPortalPage 路由 Props · 模板=dashboard */
interface SupplierPortalPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** SrmQuotationPage 路由 Props · 模板=list */
interface SrmQuotationPageProps extends ListPageProps {}
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
  description: i18n.t('srm.nav.module_name_desc'),
  permission: 'srm:dashboard:read',
  routes: [
    {
      path: SRM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/srm/SrmDashboardPage'), 'SrmDashboardPage'),
      module: 'srm',
      title: i18n.t('srm.nav.srm-dashboard'),
      titleKey: 'srm.nav.srm-dashboard',
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
      title: i18n.t('srm.nav.srm-supplier'),
      titleKey: 'srm.nav.srm-supplier',
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
      title: i18n.t('srm.nav.srm-supplier-detail'),
      titleKey: 'srm.nav.srm-supplier-detail',
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
      title: i18n.t('srm.nav.srm-category'),
      titleKey: 'srm.nav.srm-category',
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
      title: i18n.t('srm.nav.srm-product'),
      titleKey: 'srm.nav.srm-product',
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
      title: i18n.t('srm.nav.srm-contract'),
      titleKey: 'srm.nav.srm-contract',
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
      title: i18n.t('srm.nav.srm-contract-detail'),
      titleKey: 'srm.nav.srm-contract-detail',
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
      title: i18n.t('srm.nav.srm-order'),
      titleKey: 'srm.nav.srm-order',
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
      title: i18n.t('srm.nav.srm-evaluation'),
      titleKey: 'srm.nav.srm-evaluation',
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
      title: i18n.t('srm.nav.srm-performance'),
      titleKey: 'srm.nav.srm-performance',
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
      title: i18n.t('srm.nav.srm-scoring-dimension'),
      titleKey: 'srm.nav.srm-scoring-dimension',
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
      title: i18n.t('srm.nav.srm-inquiry'),
      titleKey: 'srm.nav.srm-inquiry',
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
      title: i18n.t('srm.nav.srm-bidding'),
      titleKey: 'srm.nav.srm-bidding',
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
      title: i18n.t('srm.nav.srm-finance'),
      titleKey: 'srm.nav.srm-finance',
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
      title: i18n.t('srm.nav.srm-portal'),
      titleKey: 'srm.nav.srm-portal',
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
      title: i18n.t('srm.nav.srm-quotation'),
      titleKey: 'srm.nav.srm-quotation',
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
  name: i18n.t('srm.nav.module_name'),
  nameKey: 'srm.nav.module_name',
  icon: 'Users',
  path: SRM_PATHS.root,
  permission: 'srm:dashboard:read',
  source: 'plugin',
  suite: 'supply',
  status: 'online',
  order: 14,
  description: i18n.t('srm.nav.module_name_desc'),
  navItems: [
    {
      code: 'srm-dashboard',
      label: i18n.t('srm.nav.srm-dashboard'),
      labelKey: 'srm.nav.srm-dashboard',
      icon: 'LayoutDashboard',
      path: SRM_PATHS.dashboard,
      permission: 'srm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('srm.nav.srm-dashboard_desc'),
    },
    {
      code: 'srm-supplier',
      label: i18n.t('srm.nav.srm-supplier'),
      labelKey: 'srm.nav.srm-supplier',
      icon: 'Building2',
      path: SRM_PATHS.supplier,
      permission: 'srm:supplier:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('srm.nav.srm-supplier_desc'),
    },
    {
      code: 'srm-category',
      label: i18n.t('srm.nav.srm-category'),
      labelKey: 'srm.nav.srm-category',
      icon: 'Tags',
      path: SRM_PATHS.category,
      permission: 'srm:category:read',
      order: 2,
      group: 'master',
      description: i18n.t('srm.nav.srm-category_desc'),
    },
    {
      code: 'srm-product',
      label: i18n.t('srm.nav.srm-product'),
      labelKey: 'srm.nav.srm-product',
      icon: 'Package',
      path: SRM_PATHS.product,
      permission: 'srm:product:read',
      order: 3,
      group: 'master',
      description: i18n.t('srm.nav.srm-product_desc'),
    },
    {
      code: 'srm-contract',
      label: i18n.t('srm.nav.srm-contract'),
      labelKey: 'srm.nav.srm-contract',
      icon: 'FileCheck',
      path: SRM_PATHS.contract,
      permission: 'srm:contract:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: i18n.t('srm.nav.srm-contract_desc'),
    },
    {
      code: 'srm-order',
      label: i18n.t('srm.nav.srm-order'),
      labelKey: 'srm.nav.srm-order',
      icon: 'ShoppingCart',
      path: SRM_PATHS.order,
      permission: 'srm:order:read',
      order: 5,
      group: 'business',
      showInTabs: true,
      description: i18n.t('srm.nav.srm-order_desc'),
    },
    {
      code: 'srm-evaluation',
      label: i18n.t('srm.nav.srm-evaluation'),
      labelKey: 'srm.nav.srm-evaluation',
      icon: 'Star',
      path: SRM_PATHS.evaluation,
      permission: 'srm:evaluation:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('srm.nav.srm-evaluation_desc'),
    },
    {
      code: 'srm-performance',
      label: i18n.t('srm.nav.srm-performance'),
      labelKey: 'srm.nav.srm-performance',
      icon: 'TrendingUp',
      path: SRM_PATHS.performance,
      permission: 'srm:performance:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('srm.nav.srm-performance_desc'),
    },
    {
      code: 'srm-scoring-dimension',
      label: i18n.t('srm.nav.srm-scoring-dimension'),
      labelKey: 'srm.nav.srm-scoring-dimension',
      icon: 'Target',
      path: SRM_PATHS.scoringDimension,
      permission: 'srm:evaluation:read',
      order: 1,
      group: 'setting',
      description: i18n.t('srm.nav.srm-scoring-dimension_desc'),
    },
    {
      code: 'srm-inquiry',
      label: i18n.t('srm.nav.srm-inquiry'),
      labelKey: 'srm.nav.srm-inquiry',
      icon: 'MessageSquareQuote',
      path: SRM_PATHS.inquiry,
      permission: 'srm:inquiry:read',
      order: 1,
      group: 'process',
      description: i18n.t('srm.nav.srm-inquiry_desc'),
    },
    {
      code: 'srm-bidding',
      label: i18n.t('srm.nav.srm-bidding'),
      labelKey: 'srm.nav.srm-bidding',
      icon: 'Award',
      path: SRM_PATHS.bidding,
      permission: 'srm:bidding:read',
      order: 2,
      group: 'process',
      description: i18n.t('srm.nav.srm-bidding_desc'),
    },
    {
      code: 'srm-quotation',
      label: i18n.t('srm.nav.srm-quotation'),
      labelKey: 'srm.nav.srm-quotation',
      icon: 'FileText',
      path: SRM_PATHS.quotation,
      permission: 'srm:quotation:read',
      order: 3,
      group: 'process',
      description: i18n.t('srm.nav.srm-quotation_desc'),
    },
    {
      code: 'srm-finance',
      label: i18n.t('srm.nav.srm-finance'),
      labelKey: 'srm.nav.srm-finance',
      icon: 'Wallet',
      path: SRM_PATHS.finance,
      permission: 'srm:finance:read',
      order: 6,
      group: 'business',
      description: i18n.t('srm.nav.srm-finance_desc'),
    },
    {
      code: 'srm-portal',
      label: i18n.t('srm.nav.srm-portal'),
      labelKey: 'srm.nav.srm-portal',
      icon: 'ExternalLink',
      path: SRM_PATHS.portal,
      permission: 'srm:portal:read',
      order: 7,
      group: 'master',
      description: i18n.t('srm.nav.srm-portal_desc'),
    },
  ],
};
