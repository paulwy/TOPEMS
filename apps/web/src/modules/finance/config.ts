import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
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
interface BudgetManagementPageProps {
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
  description: i18n.t('finance.nav.module_name_desc'),
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
      title: i18n.t('finance.nav.finance-dashboard'),
      titleKey: 'finance.nav.finance-dashboard',
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
      title: i18n.t('finance.nav.finance-ledger'),
      titleKey: 'finance.nav.finance-ledger',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:ledger:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceLedgerPageProps>,
    {
      path: '/finance/accounts',
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceLedgerPage'),
        'FinanceLedgerPage'
      ),
      module: 'finance',
      code: 'finance-accounts',
      title: i18n.t('finance.nav.finance-ledger'),
      titleKey: 'finance.nav.finance-ledger',
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
      title: i18n.t('finance.nav.finance-vouchers'),
      titleKey: 'finance.nav.finance-vouchers',
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
      title: i18n.t('finance.nav.finance-voucher-create'),
      titleKey: 'finance.nav.finance-voucher-create',
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
      title: i18n.t('finance.nav.finance-voucher-detail'),
      titleKey: 'finance.nav.finance-voucher-detail',
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
      title: i18n.t('finance.nav.finance-receivable-payable'),
      titleKey: 'finance.nav.finance-receivable-payable',
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
      title: i18n.t('finance.nav.finance-receipts'),
      titleKey: 'finance.nav.finance-receipts',
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
      title: i18n.t('finance.nav.finance-payments'),
      titleKey: 'finance.nav.finance-payments',
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
      title: i18n.t('finance.nav.finance-approval-config'),
      titleKey: 'finance.nav.finance-approval-config',
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
      title: i18n.t('finance.nav.finance-invoices'),
      titleKey: 'finance.nav.finance-invoices',
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
      title: i18n.t('finance.nav.finance-tax'),
      titleKey: 'finance.nav.finance-tax',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:tax:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceTaxPageProps>,
    {
      path: FINANCE_PATHS.currency,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceCurrencyPage'),
        'FinanceCurrencyPage'
      ),
      module: 'finance',
      code: 'finance-currency',
      title: i18n.t('finance.nav.finance-currency'),
      titleKey: 'finance.nav.finance-currency',
      template: 'list',
      group: 'master',
      requiredPermissions: ['finance:currency:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2,
    {
      path: FINANCE_PATHS.period,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinancePeriodPage'),
        'FinancePeriodPage'
      ),
      module: 'finance',
      code: 'finance-period',
      title: i18n.t('finance.nav.finance-period'),
      titleKey: 'finance.nav.finance-period',
      template: 'list',
      group: 'master',
      requiredPermissions: ['finance:period:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2,
    {
      path: FINANCE_PATHS.expense,
      element: lazyWithRetry(
        () => import('@/pages/finance/FinanceExpensePage'),
        'FinanceExpensePage'
      ),
      module: 'finance',
      code: 'finance-expense',
      title: i18n.t('finance.nav.finance-expense'),
      titleKey: 'finance.nav.finance-expense',
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
      title: i18n.t('finance.nav.finance-expense-approval'),
      titleKey: 'finance.nav.finance-expense-approval',
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
      title: i18n.t('finance.nav.finance-cost'),
      titleKey: 'finance.nav.finance-cost',
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
      title: i18n.t('finance.nav.finance-assets'),
      titleKey: 'finance.nav.finance-assets',
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
      title: i18n.t('finance.nav.finance-budget'),
      titleKey: 'finance.nav.finance-budget',
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
      title: i18n.t('finance.nav.finance-budget-detail'),
      titleKey: 'finance.nav.finance-budget-detail',
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
      title: i18n.t('finance.nav.finance-opening-balance'),
      titleKey: 'finance.nav.finance-opening-balance',
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
      title: i18n.t('finance.nav.finance-consolidation'),
      titleKey: 'finance.nav.finance-consolidation',
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
      title: i18n.t('finance.nav.finance-consolidation-reports'),
      titleKey: 'finance.nav.finance-consolidation-reports',
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
      title: i18n.t('finance.nav.finance-reports'),
      titleKey: 'finance.nav.finance-reports',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['finance:report:read', 'finance:dashboard:read'],
      action: 'read',
    } satisfies RouteConfigV2<FinanceReportsPageProps>,
  ],
};

export { FINANCE_PATHS } from './paths';
