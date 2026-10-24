import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 ERP_PATHS.xxx，而非硬编码字符串

export const ERP_PATHS = {
  root: '/erp',
  dashboard: '/erp/dashboard',
  voucherManagement: '/erp/voucher-management',
  customerManagement: '/erp/customer-management',
  supplierManagement: '/erp/supplier-management',
  inventoryManagement: '/erp/inventory-management',
  materialManagement: '/erp/material-management',
  purchaseOrder: '/erp/purchase-order',
  salesOrder: '/erp/sales-orders',
  financialReport: '/erp/financial-report',
  dictManagement: '/erp/dict-management',
  dictionaries: '/erp/data-dictionaries',
  databaseManagement: '/erp/database-management',
  auditLog: '/erp/audit-log',
  officeSupplies: '/erp/office-supplies',
  vehicleManagement: '/erp/vehicle-management',
  receivablePayable: '/erp/receivable-payable',
  assetManagement: '/erp/asset-management',
  budgetManagement: '/erp/budget-management',
  bankAccount: '/erp/bank-account',
  accountingManagement: '/erp/accounting-management',
  meetingRoom: '/erp/meeting-room',
  announcement: '/erp/announcement',
  vehicleRequest: '/erp/vehicle-request',
  financialAnalysis: '/erp/financial-analysis',
  salesOrders: '/erp/sales-orders',
  inventory: '/erp/inventory',
} as const;
export interface DashboardPageProps {}

interface VoucherPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface CustomerManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface SupplierManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface InventoryManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface MaterialManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface PurchaseOrderPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface FinancialReportPageProps {}

interface DictManagementPageProps {}

interface DatabaseManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export interface AuditLogPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface OfficeSuppliesPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface VehiclePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ReceivablePayablePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AssetManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface BudgetManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface BankAccountPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AccountingManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface MeetingRoomPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AnnouncementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface VehicleRequestPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface FinancialAnalysisPageProps {}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: ERP_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/erp/DashboardPage'), 'DashboardPage'),
  module: 'erp',
  code: 'erp-dashboard',
  title: i18n.t('erp.nav.erp-dashboard'),
  titleKey: 'erp.nav.erp-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const voucherRoute: RouteConfigV2<VoucherPageProps> = {
  path: ERP_PATHS.voucherManagement,
  element: lazyWithRetry(() => import('@/pages/erp/VoucherPage'), 'VoucherPage'),
  module: 'erp',
  code: 'erp-general-ledger',
  title: i18n.t('erp.nav.erp-general-ledger'),
  titleKey: 'erp.nav.erp-general-ledger',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:general_ledger:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const customerManagementRoute: RouteConfigV2<CustomerManagementPageProps> = {
  path: ERP_PATHS.customerManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/CustomerManagementPage'),
    'CustomerManagementPage'
  ),
  module: 'erp',
  code: 'erp-customer-management',
  title: i18n.t('erp.nav.erp-customer-management'),
  titleKey: 'erp.nav.erp-customer-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:customer:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const supplierManagementRoute: RouteConfigV2<SupplierManagementPageProps> = {
  path: ERP_PATHS.supplierManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/SupplierManagementPage'),
    'SupplierManagementPage'
  ),
  module: 'erp',
  code: 'erp-supplier-management',
  title: i18n.t('erp.nav.erp-supplier-management'),
  titleKey: 'erp.nav.erp-supplier-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:supplier:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const inventoryManagementRoute: RouteConfigV2<InventoryManagementPageProps> = {
  path: ERP_PATHS.inventoryManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/InventoryManagementPage'),
    'InventoryManagementPage'
  ),
  module: 'erp',
  code: 'erp-inventory-management',
  title: i18n.t('erp.nav.erp-inventory-management'),
  titleKey: 'erp.nav.erp-inventory-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:inventory:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const materialManagementRoute: RouteConfigV2<MaterialManagementPageProps> = {
  path: ERP_PATHS.materialManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/MaterialManagementPage'),
    'MaterialManagementPage'
  ),
  module: 'erp',
  code: 'erp-material-management',
  title: i18n.t('erp.nav.erp-material-management'),
  titleKey: 'erp.nav.erp-material-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:material:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const purchaseOrderRoute: RouteConfigV2<PurchaseOrderPageProps> = {
  path: ERP_PATHS.purchaseOrder,
  element: lazyWithRetry(() => import('@/pages/erp/PurchaseOrderPage'), 'PurchaseOrderPage'),
  module: 'erp',
  code: 'erp-purchase-order',
  title: i18n.t('erp.nav.erp-purchase-order'),
  titleKey: 'erp.nav.erp-purchase-order',
  template: 'list',
  group: 'process',
  requiredPermissions: ['erp:purchase_order:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const financialReportRoute: RouteConfigV2<FinancialReportPageProps> = {
  path: ERP_PATHS.financialReport,
  element: lazyWithRetry(() => import('@/pages/erp/FinancialReportPage'), 'FinancialReportPage'),
  module: 'erp',
  code: 'erp-financial-statements',
  title: i18n.t('erp.nav.erp-financial-statements'),
  titleKey: 'erp.nav.erp-financial-statements',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['erp:financial_statement:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const dictManagementRoute: RouteConfigV2<DictManagementPageProps> = {
  path: ERP_PATHS.dictManagement,
  element: lazyWithRetry(() => import('@/pages/erp/DictManagementPage'), 'DictManagementPage'),
  module: 'erp',
  code: 'erp-dictionaries',
  title: i18n.t('erp.nav.erp-dictionaries'),
  titleKey: 'erp.nav.erp-dictionaries',
  template: 'tree',
  group: 'setting',
  requiredPermissions: ['erp:dictionary:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const databaseManagementRoute: RouteConfigV2<DatabaseManagementPageProps> = {
  path: ERP_PATHS.databaseManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/DatabaseManagementPage'),
    'DatabaseManagementPage'
  ),
  module: 'erp',
  code: 'erp-database-management',
  title: i18n.t('erp.nav.erp-database-management'),
  titleKey: 'erp.nav.erp-database-management',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['erp:database:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const auditLogRoute: RouteConfigV2<AuditLogPageProps> = {
  path: ERP_PATHS.auditLog,
  element: lazyWithRetry(() => import('@/pages/erp/AuditLogPage'), 'AuditLogPage'),
  module: 'erp',
  code: 'erp-audit-log',
  title: i18n.t('erp.nav.erp-audit-log'),
  titleKey: 'erp.nav.erp-audit-log',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['erp:audit:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const officeSuppliesRoute: RouteConfigV2<OfficeSuppliesPageProps> = {
  path: ERP_PATHS.officeSupplies,
  element: lazyWithRetry(() => import('@/pages/erp/OfficeSuppliesPage'), 'OfficeSuppliesPage'),
  module: 'erp',
  code: 'erp-office-supplies',
  title: i18n.t('erp.nav.erp-office-supplies'),
  titleKey: 'erp.nav.erp-office-supplies',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:office_supply:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const vehicleRoute: RouteConfigV2<VehiclePageProps> = {
  path: ERP_PATHS.vehicleManagement,
  element: lazyWithRetry(() => import('@/pages/erp/VehiclePage'), 'VehiclePage'),
  module: 'erp',
  code: 'erp-vehicle-management',
  title: i18n.t('erp.nav.erp-vehicle-management'),
  titleKey: 'erp.nav.erp-vehicle-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:vehicle:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const receivablePayableRoute: RouteConfigV2<ReceivablePayablePageProps> = {
  path: ERP_PATHS.receivablePayable,
  element: lazyWithRetry(
    () => import('@/pages/erp/ReceivablePayablePage'),
    'ReceivablePayablePage'
  ),
  module: 'erp',
  code: 'erp-receivable-payable',
  title: i18n.t('erp.nav.erp-receivable-payable'),
  titleKey: 'erp.nav.erp-receivable-payable',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:receivable_payable:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const assetManagementRoute: RouteConfigV2<AssetManagementPageProps> = {
  path: ERP_PATHS.assetManagement,
  element: lazyWithRetry(() => import('@/pages/erp/AssetManagementPage'), 'AssetManagementPage'),
  module: 'erp',
  code: 'erp-asset-management',
  title: i18n.t('erp.nav.erp-asset-management'),
  titleKey: 'erp.nav.erp-asset-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:asset:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const budgetManagementRoute: RouteConfigV2<BudgetManagementPageProps> = {
  path: ERP_PATHS.budgetManagement,
  element: lazyWithRetry(() => import('@/pages/erp/BudgetManagementPage'), 'BudgetManagementPage'),
  module: 'erp',
  code: 'erp-budget-management',
  title: i18n.t('erp.nav.erp-budget-management'),
  titleKey: 'erp.nav.erp-budget-management',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:budget:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const bankAccountRoute: RouteConfigV2<BankAccountPageProps> = {
  path: ERP_PATHS.bankAccount,
  element: lazyWithRetry(() => import('@/pages/erp/BankAccountPage'), 'BankAccountPage'),
  module: 'erp',
  code: 'erp-bank-account',
  title: i18n.t('erp.nav.erp-bank-account'),
  titleKey: 'erp.nav.erp-bank-account',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:bank_account:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const accountingManagementRoute: RouteConfigV2<AccountingManagementPageProps> = {
  path: ERP_PATHS.accountingManagement,
  element: lazyWithRetry(
    () => import('@/pages/erp/AccountingManagementPage'),
    'AccountingManagementPage'
  ),
  module: 'erp',
  code: 'erp-accounting-management',
  title: i18n.t('erp.nav.erp-accounting-management'),
  titleKey: 'erp.nav.erp-accounting-management',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:accounting_subject:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const meetingRoomRoute: RouteConfigV2<MeetingRoomPageProps> = {
  path: ERP_PATHS.meetingRoom,
  element: lazyWithRetry(() => import('@/pages/erp/MeetingRoomPage'), 'MeetingRoomPage'),
  module: 'erp',
  code: 'erp-meeting-room',
  title: i18n.t('erp.nav.erp-meeting-room'),
  titleKey: 'erp.nav.erp-meeting-room',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:meeting_room:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const announcementRoute: RouteConfigV2<AnnouncementPageProps> = {
  path: ERP_PATHS.announcement,
  element: lazyWithRetry(() => import('@/pages/erp/AnnouncementPage'), 'AnnouncementPage'),
  module: 'erp',
  code: 'erp-announcement',
  title: i18n.t('erp.nav.erp-announcement'),
  titleKey: 'erp.nav.erp-announcement',
  template: 'list',
  group: 'master',
  requiredPermissions: ['erp:announcement:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const vehicleRequestRoute: RouteConfigV2<VehicleRequestPageProps> = {
  path: ERP_PATHS.vehicleRequest,
  element: lazyWithRetry(() => import('@/pages/erp/VehicleRequestPage'), 'VehicleRequestPage'),
  module: 'erp',
  code: 'erp-vehicle-request',
  title: i18n.t('erp.nav.erp-vehicle-request'),
  titleKey: 'erp.nav.erp-vehicle-request',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:vehicle_request:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const financialAnalysisRoute: RouteConfigV2<FinancialAnalysisPageProps> = {
  path: ERP_PATHS.financialAnalysis,
  element: lazyWithRetry(
    () => import('@/pages/erp/FinancialAnalysisPage'),
    'FinancialAnalysisPage'
  ),
  module: 'erp',
  code: 'erp-financial-analysis',
  title: i18n.t('erp.nav.erp-financial-analysis'),
  titleKey: 'erp.nav.erp-financial-analysis',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['erp:financial_analysis:read', 'erp:dashboard:read'],
  action: 'read',
  tier: 'basic',
};

const erpSalesOrdersRoute: RouteConfigV2<Record<string, never>> = {
  path: ERP_PATHS.salesOrders,
  element: lazyWithRetry(
    () => import('@/pages/erp/ErpSalesOrderRedesignPage'),
    'ErpSalesOrderRedesignPage'
  ),
  module: 'erp',
  code: 'erp-sales-orders',
  title: i18n.t('erp.nav.erp-sales-orders'),
  titleKey: 'erp.nav.erp-sales-orders',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:sales:read'],
  action: 'read',
};

const erpInventoryRoute: RouteConfigV2<Record<string, never>> = {
  path: ERP_PATHS.inventory,
  element: lazyWithRetry(
    () => import('@/pages/erp/ErpInventoryRedesignPage'),
    'ErpInventoryRedesignPage'
  ),
  module: 'erp',
  code: 'erp-inventory',
  title: i18n.t('erp.nav.erp-inventory'),
  titleKey: 'erp.nav.erp-inventory',
  template: 'list',
  group: 'business',
  requiredPermissions: ['erp:inventory:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
// P34-4: ERP 默认所有路由为 basic 层级；advanced 模块（consolidation/mdm_v49/...）
// 在前端未提供独立页面，故不在此配置。
export const erpModuleConfig: RouteModuleConfig = {
  code: 'erp',
  name: i18n.t('shared.config.erp_name'),
  nameKey: 'shared.config.erp_name',
  icon: 'Grid3X3',
  path: ERP_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 11,
  description: i18n.t('erp.nav.module_name_desc'),
  permission: 'erp:dashboard:read',
  tier: 'basic',
  routes: [
    dashboardRoute,
    voucherRoute,
    customerManagementRoute,
    supplierManagementRoute,
    inventoryManagementRoute,
    materialManagementRoute,
    purchaseOrderRoute,
    financialReportRoute,
    dictManagementRoute,
    databaseManagementRoute,
    auditLogRoute,
    officeSuppliesRoute,
    vehicleRoute,
    receivablePayableRoute,
    assetManagementRoute,
    budgetManagementRoute,
    bankAccountRoute,
    accountingManagementRoute,
    meetingRoomRoute,
    announcementRoute,
    vehicleRequestRoute,
    financialAnalysisRoute,
    erpSalesOrdersRoute,
    erpInventoryRoute,
    {
      path: ERP_PATHS.dictionaries,
      element: lazyWithRetry(() => import('@/pages/erp/DictionaryPage'), 'DictionaryPage'),
      module: 'erp',
      code: 'erp-dictionaries',
      title: i18n.t('erp.nav.erp-dictionaries'),
      titleKey: 'erp.nav.erp-dictionaries',
      template: 'list',
      group: 'master',
      requiredPermissions: ['erp:dashboard:read'],
      action: 'read',
    } as unknown as RouteConfigV2<Record<string, unknown>>,
  ],
};
