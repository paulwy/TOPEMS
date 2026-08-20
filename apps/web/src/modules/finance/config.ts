import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import { FINANCE_PATHS } from './paths';
import i18n from '@/i18n';

// ---- 路由配置（供路由系统使用） ----
/** FinanceDashboardPage 路由 Props · 模板=dashboard */
interface FinanceDashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** FinanceLedgerPage 路由 Props · 模板=list */
interface FinanceLedgerPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceVoucherPage 路由 Props · 模板=list */
interface FinanceVoucherPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** VoucherCreatePage 路由 Props · 模板=form */
interface VoucherCreatePageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}

/** VoucherDetailPage 路由 Props · 模板=detail */
interface VoucherDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** FinanceReceivablePayablePage 路由 Props · 模板=list */
interface FinanceReceivablePayablePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceReceiptPage 路由 Props · 模板=list */
interface FinanceReceiptPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinancePaymentPage 路由 Props · 模板=list */
interface FinancePaymentPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceApprovalConfigPage 路由 Props · 模板=list */
interface FinanceApprovalConfigPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceInvoicePage 路由 Props · 模板=list */
interface FinanceInvoicePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceTaxPage 路由 Props · 模板=list */
interface FinanceTaxPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceExpensePage 路由 Props · 模板=list */
interface FinanceExpensePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceExpenseApprovalPage 路由 Props · 模板=wizard */
interface FinanceExpenseApprovalPageProps {
  /** 当前向导步骤序号（1-based） */
  step?: number;
  /** 关联审批/工作流 ID */
  workflowId?: string;
  /** 发起人/申请人 ID */
  applicantId?: string;
}

/** FinanceCostPage 路由 Props · 模板=list */
interface FinanceCostPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceAssetPage 路由 Props · 模板=list */
interface FinanceAssetPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** BudgetManagementPage 路由 Props · 模板=list */
export interface BudgetManagementPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** FinanceBudgetDetailPage 路由 Props · 模板=detail */
interface FinanceBudgetDetailPageProps {
  /** 主实体 ID（如凭证号、合同编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** OpeningBalancePage 路由 Props · 模板=form */
interface OpeningBalancePageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}

/** ConsolidationScopePage 路由 Props · 模板=list */
interface ConsolidationScopePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** ConsolidationReportsPage 路由 Props · 模板=stats */
interface ConsolidationReportsPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** FinanceReportsPage 路由 Props · 模板=stats */
interface FinanceReportsPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}
export const financeModuleConfig: RouteModuleConfig = {
  code: 'finance',
  name: i18n.t('shared.config.finance_name'),
  nameKey: 'shared.config.finance_name',
  icon: 'Wallet',
  path: FINANCE_PATHS.root,
  source: 'plugin',
  suite: 'finance',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k1'),
  permission: 'finance:dashboard:read',
  routes: [
    {
      path: FINANCE_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceDashboardPage'),
        'FinanceDashboardPage'
      ),
      module: 'finance',
      code: 'finance-dashboard',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceDashboardPageProps>,
    {
      path: FINANCE_PATHS.ledger,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceLedgerPage'),
        'FinanceLedgerPage'
      ),
      module: 'finance',
      code: 'finance-ledger',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:ledger:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceLedgerPageProps>,
    {
      path: FINANCE_PATHS.vouchers,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceVoucherPage'),
        'FinanceVoucherPage'
      ),
      module: 'finance',
      code: 'finance-vouchers',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:voucher:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceVoucherPageProps>,
    {
      path: FINANCE_PATHS.voucherCreate,
      element: lazyWithRetry(
        () => import('@/pages/finance/VoucherCreatePage'),
        'VoucherCreatePage'
      ),
      module: 'finance',
      code: 'finance-voucher-create',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      template: 'form',
      group: 'business',
      requiredPermissions: ['finance:voucher:create', 'finance:dashboard:write'],
      action: 'write',
    } satisfies RouteConfigV2<VoucherCreatePageProps>,
    {
      path: FINANCE_PATHS.voucherDetail,
      element: lazyWithRetry(
        () => import('@/pages/finance/VoucherDetailPage'),
        'VoucherDetailPage'
      ),
      module: 'finance',
      code: 'finance-voucher-detail',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['finance:voucher:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<VoucherDetailPageProps>,
    {
      path: FINANCE_PATHS.receivablePayable,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceReceivablePayablePage'),
        'FinanceReceivablePayablePage'
      ),
      module: 'finance',
      code: 'finance-receivable-payable',
      title: i18n.t('shared.config.k7'),
      titleKey: 'shared.config.k7',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:receivable_payable:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceReceivablePayablePageProps>,
    {
      path: FINANCE_PATHS.receipts,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceReceiptPage'),
        'FinanceReceiptPage'
      ),
      module: 'finance',
      code: 'finance-receipts',
      title: i18n.t('shared.config.k8'),
      titleKey: 'shared.config.k8',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:receipt:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceReceiptPageProps>,
    {
      path: FINANCE_PATHS.payments,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinancePaymentPage'),
        'FinancePaymentPage'
      ),
      module: 'finance',
      code: 'finance-payments',
      title: i18n.t('shared.config.k9'),
      titleKey: 'shared.config.k9',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:payment:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinancePaymentPageProps>,
    {
      path: FINANCE_PATHS.approvalConfig,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceApprovalConfigPage'),
        'FinanceApprovalConfigPage'
      ),
      module: 'finance',
      code: 'finance-approval-config',
      title: i18n.t('shared.config.k10'),
      titleKey: 'shared.config.k10',
      template: 'list',
      group: 'setting',
      requiredPermissions: ['finance:dashboard:admin'],
      action: 'admin',
    } satisfies RouteConfigV2<FinanceApprovalConfigPageProps>,
    {
      path: FINANCE_PATHS.invoices,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceInvoicePage'),
        'FinanceInvoicePage'
      ),
      module: 'finance',
      code: 'finance-invoices',
      title: i18n.t('shared.config.k11'),
      titleKey: 'shared.config.k11',
      template: 'list',
      group: 'master',
      requiredPermissions: ['finance:invoice:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceInvoicePageProps>,
    {
      path: FINANCE_PATHS.tax,
      element: lazyWithRetry(() => import('@/pages/finance/FinanceTaxPage'), 'FinanceTaxPage'),
      module: 'finance',
      code: 'finance-tax',
      title: i18n.t('shared.config.k12'),
      titleKey: 'shared.config.k12',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:tax:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceTaxPageProps>,
    {
      path: FINANCE_PATHS.expense,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceExpensePage'),
        'FinanceExpensePage'
      ),
      module: 'finance',
      code: 'finance-expense',
      title: i18n.t('shared.config.k13'),
      titleKey: 'shared.config.k13',
      template: 'list',
      group: 'master',
      requiredPermissions: ['finance:expense:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceExpensePageProps>,
    {
      path: FINANCE_PATHS.expenseApproval,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceExpenseApprovalPage'),
        'FinanceExpenseApprovalPage'
      ),
      module: 'finance',
      code: 'finance-expense-approval',
      title: i18n.t('shared.config.k14'),
      titleKey: 'shared.config.k14',
      template: 'wizard',
      group: 'setting',
      requiredPermissions: [
        'finance:expense_approval:read',
        'finance:dashboard:read',
        'finance:settlement:approve',
      ],
      action: 'read',
    } satisfies RouteConfigV2<FinanceExpenseApprovalPageProps>,
    {
      path: FINANCE_PATHS.cost,
      element: lazyWithRetry(() => import('@/pages/finance/FinanceCostPage'), 'FinanceCostPage'),
      module: 'finance',
      code: 'finance-cost',
      title: i18n.t('shared.config.k15'),
      titleKey: 'shared.config.k15',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:cost:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceCostPageProps>,
    {
      path: FINANCE_PATHS.assets,
      element: lazyWithRetry(() => import('@/pages/finance/FinanceAssetPage'), 'FinanceAssetPage'),
      module: 'finance',
      code: 'finance-assets',
      title: i18n.t('shared.config.k16'),
      titleKey: 'shared.config.k16',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:asset:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceAssetPageProps>,
    {
      path: FINANCE_PATHS.budget,
      element: lazyWithRetry(
        () => import('@/pages/finance/BudgetManagementPage'),
        'BudgetManagementPage'
      ),
      module: 'finance',
      code: 'finance-budget',
      title: i18n.t('shared.config.k17'),
      titleKey: 'shared.config.k17',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:budget:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<BudgetManagementPageProps>,
    {
      path: FINANCE_PATHS.budgetDetail,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceBudgetDetailPage'),
        'FinanceBudgetDetailPage'
      ),
      module: 'finance',
      code: 'finance-budget-detail',
      title: i18n.t('shared.config.k18'),
      titleKey: 'shared.config.k18',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['finance:budget:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceBudgetDetailPageProps>,
    {
      path: FINANCE_PATHS.openingBalance,
      element: lazyWithRetry(
        () => import('@/pages/finance/OpeningBalancePage'),
        'OpeningBalancePage'
      ),
      module: 'finance',
      code: 'finance-opening-balance',
      title: i18n.t('shared.config.k19'),
      titleKey: 'shared.config.k19',
      template: 'form',
      group: 'business',
      requiredPermissions: ['finance:opening_balance:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<OpeningBalancePageProps>,
    {
      path: FINANCE_PATHS.consolidation,
      element: lazyWithRetry(
        () => import('@/pages/finance/ConsolidationScopePage'),
        'ConsolidationScopePage'
      ),
      module: 'finance',
      code: 'finance-consolidation',
      title: i18n.t('shared.config.k20'),
      titleKey: 'shared.config.k20',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['finance:consolidation:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<ConsolidationScopePageProps>,
    {
      path: FINANCE_PATHS.consolidationReports,
      element: lazyWithRetry(
        () => import('@/pages/finance/ConsolidationReportsPage'),
        'ConsolidationReportsPage'
      ),
      module: 'finance',
      code: 'finance-consolidation-reports',
      title: i18n.t('shared.config.k21'),
      titleKey: 'shared.config.k21',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['finance:consolidation:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<ConsolidationReportsPageProps>,
    {
      path: FINANCE_PATHS.reports,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceReportsPage'),
        'FinanceReportsPage'
      ),
      module: 'finance',
      code: 'finance-reports',
      title: i18n.t('shared.config.k22'),
      titleKey: 'shared.config.k22',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['finance:report:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceReportsPageProps>,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const financeNavConfig: ModuleNavConfig = {
  code: 'finance',
  name: i18n.t('shared.config.k23'),
  nameKey: 'shared.config.k23',
  icon: 'Wallet',
  path: FINANCE_PATHS.root,
  permission: 'finance:dashboard:read',
  source: 'plugin',
  suite: 'finance',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k24'),
  navItems: [
    {
      code: 'finance-dashboard',
      label: i18n.t('shared.config.k25'),
      labelKey: 'shared.config.k25',
      icon: 'LayoutDashboard',
      path: FINANCE_PATHS.dashboard,
      permission: 'finance:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k26'),
    },
    {
      code: 'finance-vouchers',
      label: i18n.t('shared.config.k27'),
      labelKey: 'shared.config.k27',
      icon: 'FileText',
      path: FINANCE_PATHS.vouchers,
      permission: 'finance:voucher:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k28'),
    },
    {
      code: 'finance-ledger',
      label: i18n.t('shared.config.k29'),
      labelKey: 'shared.config.k29',
      icon: 'FileSpreadsheet',
      path: FINANCE_PATHS.ledger,
      permission: 'finance:ledger:read',
      order: 2,
      group: 'business',
      description: i18n.t('shared.config.k30'),
    },
    {
      code: 'finance-receivable-payable',
      label: i18n.t('shared.config.k31'),
      labelKey: 'shared.config.k31',
      icon: 'TrendingUp',
      path: FINANCE_PATHS.receivablePayable,
      permission: 'finance:receivable_payable:read',
      order: 3,
      group: 'business',
      description: i18n.t('shared.config.k32'),
    },
    {
      code: 'finance-receipts',
      label: i18n.t('shared.config.k33'),
      labelKey: 'shared.config.k33',
      icon: 'ArrowDownCircle',
      path: FINANCE_PATHS.receipts,
      permission: 'finance:receipt:read',
      order: 4,
      group: 'business',
      description: i18n.t('shared.config.k34'),
    },
    {
      code: 'finance-payments',
      label: i18n.t('shared.config.k35'),
      labelKey: 'shared.config.k35',
      icon: 'ArrowUpCircle',
      path: FINANCE_PATHS.payments,
      permission: 'finance:payment:read',
      order: 5,
      group: 'business',
      description: i18n.t('shared.config.k36'),
    },
    {
      code: 'finance-approval-config',
      label: i18n.t('shared.config.k37'),
      labelKey: 'shared.config.k37',
      icon: 'Settings',
      path: FINANCE_PATHS.approvalConfig,
      permission: 'finance:dashboard:admin',
      order: 6,
      group: 'setting',
      description: i18n.t('shared.config.k38'),
    },
    {
      code: 'finance-invoices',
      label: i18n.t('shared.config.k39'),
      labelKey: 'shared.config.k39',
      icon: 'FileText',
      path: FINANCE_PATHS.invoices,
      permission: 'finance:invoice:read',
      order: 6,
      group: 'master',
      description: i18n.t('shared.config.k40'),
    },
    {
      code: 'finance-expense',
      label: i18n.t('shared.config.k41'),
      labelKey: 'shared.config.k41',
      icon: 'CreditCard',
      path: FINANCE_PATHS.expense,
      permission: 'finance:expense:read',
      order: 7,
      group: 'master',
      description: i18n.t('shared.config.k42'),
    },
    {
      code: 'finance-expense-approval',
      label: i18n.t('shared.config.k43'),
      labelKey: 'shared.config.k43',
      icon: 'ClipboardList',
      path: FINANCE_PATHS.expenseApproval,
      permission: 'finance:expense_approval:read',
      order: 8,
      group: 'setting',
      description: i18n.t('shared.config.k44'),
    },
    {
      code: 'finance-budget',
      label: i18n.t('shared.config.k45'),
      labelKey: 'shared.config.k45',
      icon: 'PieChart',
      path: FINANCE_PATHS.budget,
      permission: 'finance:budget:read',
      order: 6,
      group: 'business',
      description: i18n.t('shared.config.k46'),
    },
    {
      code: 'finance-assets',
      label: i18n.t('shared.config.k47'),
      labelKey: 'shared.config.k47',
      icon: 'Briefcase',
      path: FINANCE_PATHS.assets,
      permission: 'finance:asset:read',
      order: 7,
      group: 'business',
      description: i18n.t('shared.config.k48'),
    },
    {
      code: 'finance-tax',
      label: i18n.t('shared.config.k49'),
      labelKey: 'shared.config.k49',
      icon: 'FileCheck',
      path: FINANCE_PATHS.tax,
      permission: 'finance:tax:read',
      order: 8,
      group: 'business',
      description: i18n.t('shared.config.k50'),
    },
    {
      code: 'finance-cost',
      label: i18n.t('shared.config.k51'),
      labelKey: 'shared.config.k51',
      icon: 'BarChart3',
      path: FINANCE_PATHS.cost,
      permission: 'finance:cost:read',
      order: 9,
      group: 'business',
      description: i18n.t('shared.config.k52'),
    },
    {
      code: 'finance-reports',
      label: i18n.t('shared.config.k53'),
      labelKey: 'shared.config.k53',
      icon: 'FileSpreadsheet',
      path: FINANCE_PATHS.reports,
      permission: 'finance:report:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k54'),
    },
    {
      code: 'finance-opening-balance',
      label: i18n.t('shared.config.k55'),
      labelKey: 'shared.config.k55',
      icon: 'CircleDot',
      path: FINANCE_PATHS.openingBalance,
      permission: 'finance:opening_balance:read',
      order: 10,
      group: 'business',
      description: i18n.t('shared.config.k56'),
    },
    {
      code: 'finance-consolidation',
      label: i18n.t('shared.config.k57'),
      labelKey: 'shared.config.k57',
      icon: 'Layers',
      path: FINANCE_PATHS.consolidation,
      permission: 'finance:consolidation:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('shared.config.k58'),
    },
    {
      code: 'finance-consolidation-reports',
      label: i18n.t('shared.config.fin_r4_1'),
      labelKey: 'shared.config.fin_r4_1',
      icon: 'FileSpreadsheet',
      path: FINANCE_PATHS.consolidationReports,
      permission: 'finance:consolidation:read',
      order: 4,
      group: 'analytics',
      description: i18n.t('shared.config.fin_r4_2'),
    },
    {
      code: 'finance-budget-detail',
      label: i18n.t('shared.config.fin_r4_3'),
      labelKey: 'shared.config.fin_r4_3',
      icon: 'PieChart',
      path: FINANCE_PATHS.budgetDetail,
      permission: 'finance:budget:read',
      order: 11,
      group: 'business',
      description: i18n.t('shared.config.fin_r4_4'),
    },
  ],
};

export { FINANCE_PATHS } from './paths';
