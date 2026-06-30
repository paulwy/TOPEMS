import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const FinanceDashboardPage = lazyWithRetry(
  () => import('../../pages/finance/DashboardPage'),
  'DashboardPage'
);
const FinanceCostPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceCostPage'),
  'FinanceCostPage'
);
const FinanceTaxPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceTaxPage'),
  'FinanceTaxPage'
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
const FinanceReportsPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceReportsPage'),
  'FinanceReportsPage'
);
const FinanceBudgetPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceBudgetPage'),
  'FinanceBudgetPage'
);
const FinanceAssetPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceAssetPage'),
  'FinanceAssetPage'
);
const FinanceLedgerPage = lazyWithRetry(
  () => import('../../pages/finance/FinanceLedgerPage'),
  'FinanceLedgerPage'
);
const FinanceReceivablePayablePage = lazyWithRetry(
  () => import('../../pages/finance/FinanceReceivablePayablePage'),
  'FinanceReceivablePayablePage'
);

export const financeModuleConfig: RouteModuleConfig = {
  code: 'finance',
  name: '财务管理',
  icon: 'Wallet',
  path: '/finance',
  source: 'core',
  suite: 'finance',
  status: 'online',
  order: 6,
  description: '凭证、报表、应收应付、预算、税务管理',
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
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
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
      nav: {
        label: '凭证管理',
        icon: 'FileText',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
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
      path: '/finance/ledger',
      element: FinanceLedgerPage,
      module: 'finance',
      code: 'finance-ledger',
      title: '总账管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:ledger:read'],
      nav: {
        label: '总账管理',
        icon: 'FileSpreadsheet',
        order: 2,
        group: 'business',
      },
    },
    {
      path: '/finance/receivable-payable',
      element: FinanceReceivablePayablePage,
      module: 'finance',
      code: 'finance-receivable-payable',
      title: '应收应付',
      template: 'list',
      group: 'business',
      requiredPermissions: ['finance:receivable:read', 'finance:payable:read'],
      nav: {
        label: '应收应付',
        icon: 'TrendingUp',
        order: 3,
        group: 'business',
      },
    },
    {
      path: '/finance/budget',
      element: FinanceBudgetPage,
      module: 'finance',
      code: 'finance-budget',
      title: '预算管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['finance:budget:read'],
      nav: {
        label: '预算管理',
        icon: 'PieChart',
        order: 1,
        group: 'process',
      },
    },
    {
      path: '/finance/asset',
      element: FinanceAssetPage,
      module: 'finance',
      code: 'finance-asset',
      title: '资产管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['finance:asset:read'],
      nav: {
        label: '资产管理',
        icon: 'Briefcase',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/finance/tax',
      element: FinanceTaxPage,
      module: 'finance',
      code: 'finance-tax',
      title: '税务管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['finance:tax:read'],
      nav: {
        label: '税务管理',
        icon: 'FileCheck',
        order: 3,
        group: 'process',
      },
    },
    {
      path: '/finance/cost',
      element: FinanceCostPage,
      module: 'finance',
      code: 'finance-cost',
      title: '成本管理',
      template: 'stats',
      group: 'process',
      requiredPermissions: ['finance:cost:read'],
      nav: {
        label: '成本管理',
        icon: 'BarChart3',
        order: 4,
        group: 'process',
      },
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
      nav: {
        label: '财务报表',
        icon: 'FileSpreadsheet',
        order: 1,
        group: 'analytics',
        showInTabs: true,
      },
    },
  ],
};
