import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const FinanceDashboardPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceDashboardPage'),
  'FinanceDashboardPage'
);
const FinanceLedgerPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceLedgerPage'),
  'FinanceLedgerPage'
);
const FinanceVoucherPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceVoucherPage'),
  'FinanceVoucherPage'
);
const VoucherCreatePage = lazyWithRetry(
  () => import('../../pages/finance/VoucherCreatePage'),
  'VoucherCreatePage'
);
const VoucherDetailPage = lazyWithRetry(
  () => import('../../pages/finance/VoucherDetailPage'),
  'VoucherDetailPage'
);
const FinanceReceivablePayablePage = lazyWithRetry(
  () => import('../../pages/finance/FinanceReceivablePayablePage'),
  'FinanceReceivablePayablePage'
);
const FinanceInvoicePage = lazyWithRetry(
  () => import('../../pages/finance/FinanceInvoicePage'),
  'FinanceInvoicePage'
);
const FinanceTaxPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceTaxPage'),
  'FinanceTaxPage'
);
const FinanceExpensePage = lazyWithRetry(
  () => import('../../pages/finance/FinanceExpensePage'),
  'FinanceExpensePage'
);
const FinanceCostPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceCostPage'),
  'FinanceCostPage'
);
const FinanceReceiptPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceReceiptPage'),
  'FinanceReceiptPage'
);
const FinancePaymentPage = lazyWithRetry(
  () => import('../../pages/finance/FinancePaymentPage'),
  'FinancePaymentPage'
);
const FinanceAssetPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceAssetPage'),
  'FinanceAssetPage'
);
const BudgetManagementPage = lazyWithRetry(
  () => import('../../pages/finance/BudgetManagementPage'),
  'BudgetManagementPage'
);
const FinanceBudgetPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceBudgetPage'),
  'FinanceBudgetPage'
);
const FinanceBudgetDetailPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceBudgetDetailPage'),
  'FinanceBudgetDetailPage'
);
const OpeningBalancePage = lazyWithRetry(
  () => import('../../pages/finance/OpeningBalancePage'),
  'OpeningBalancePage'
);
const ConsolidationScopePage = lazyWithRetry(
  () => import('../../pages/finance/ConsolidationScopePage'),
  'ConsolidationScopePage'
);
const ConsolidationReportsPage = lazyWithRetry(
  () => import('../../pages/finance/ConsolidationReportsPage'),
  'ConsolidationReportsPage'
);
const FinanceReportsPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceReportsPage'),
  'FinanceReportsPage'
);

export const financeModuleConfig: RouteModuleConfig = {
  code: 'finance',
  name: '财务管理',
  icon: 'Wallet',
  path: '/finance',
  source: 'plugin',
  suite: 'finance',
  status: 'online',
  order: 8,
  description: '总账、应收应付、税务、费用、成本、报表管理',
  permission: 'finance:read',
  routes: [
    {
      path: '/finance/dashboard',
      element: FinanceDashboardPage,
      module: 'finance',
      code: 'finance-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['finance:read'],
    },
    {
      path: '/finance/ledger',
      element: FinanceLedgerPage,
      module: 'finance',
      code: 'finance-ledger',
      title: '总账管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:ledger:read'],
    },
    {
      path: '/finance/vouchers',
      element: FinanceVoucherPage,
      module: 'finance',
      code: 'finance-vouchers',
      title: '凭证管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:voucher:read'],
    },
    {
      path: '/finance/vouchers/create',
      element: VoucherCreatePage,
      module: 'finance',
      code: 'finance-voucher-create',
      title: '创建凭证',
      template: 'form',
      group: 'business',
      requiredPermissions: ['finance:voucher:create'],
    },
    {
      path: '/finance/vouchers/:id',
      element: VoucherDetailPage,
      module: 'finance',
      code: 'finance-voucher-detail',
      title: '凭证详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['finance:voucher:read'],
    },
    {
      path: '/finance/receivable-payable',
      element: FinanceReceivablePayablePage,
      module: 'finance',
      code: 'finance-receivable-payable',
      title: '应收应付',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:receivable_payable:read'],
    },
    {
      path: '/finance/receipts',
      element: FinanceReceiptPage,
      module: 'finance',
      code: 'finance-receipts',
      title: '收款管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:receipt:read'],
    },
    {
      path: '/finance/payments',
      element: FinancePaymentPage,
      module: 'finance',
      code: 'finance-payments',
      title: '付款管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:payment:read'],
    },
    {
      path: '/finance/invoices',
      element: FinanceInvoicePage,
      module: 'finance',
      code: 'finance-invoices',
      title: '发票管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:invoice:read'],
    },
    {
      path: '/finance/tax',
      element: FinanceTaxPage,
      module: 'finance',
      code: 'finance-tax',
      title: '税务管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:tax:read'],
    },
    {
      path: '/finance/expense',
      element: FinanceExpensePage,
      module: 'finance',
      code: 'finance-expense',
      title: '费用管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:expense:read'],
    },
    {
      path: '/finance/cost',
      element: FinanceCostPage,
      module: 'finance',
      code: 'finance-cost',
      title: '成本管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:cost:read'],
    },
    {
      path: '/finance/assets',
      element: FinanceAssetPage,
      module: 'finance',
      code: 'finance-assets',
      title: '资产管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:asset:read'],
    },
    {
      path: '/finance/budget',
      element: BudgetManagementPage,
      module: 'finance',
      code: 'finance-budget',
      title: '预算管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:budget:read'],
    },
    {
      path: '/finance/budget-detail',
      element: FinanceBudgetDetailPage,
      module: 'finance',
      code: 'finance-budget-detail',
      title: '预算详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['finance:budget:read'],
    },
    {
      path: '/finance/opening-balance',
      element: OpeningBalancePage,
      module: 'finance',
      code: 'finance-opening-balance',
      title: '期初余额',
      template: 'form',
      group: 'business',
      requiredPermissions: ['finance:opening_balance:read'],
    },
    {
      path: '/finance/consolidation',
      element: ConsolidationScopePage,
      module: 'finance',
      code: 'finance-consolidation',
      title: '合并报表',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['finance:consolidation:read'],
    },
    {
      path: '/finance/consolidation-reports',
      element: ConsolidationReportsPage,
      module: 'finance',
      code: 'finance-consolidation-reports',
      title: '合并报表详情',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['finance:consolidation:read'],
    },
    {
      path: '/finance/reports',
      element: FinanceReportsPage,
      module: 'finance',
      code: 'finance-reports',
      title: '财务报表',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['finance:report:read'],
    },
  ],
};
