import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
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
  salesOrder: '/erp/sales-order',
  financialReport: '/erp/financial-report',
  dictManagement: '/erp/dict-management',
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

interface SalesOrderPageProps {
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

const salesOrderRoute: RouteConfigV2<SalesOrderPageProps> = {
  path: ERP_PATHS.salesOrder,
  element: lazyWithRetry(() => import('@/pages/erp/SalesOrderPage'), 'SalesOrderPage'),
  module: 'erp',
  code: 'erp-sales-order',
  title: i18n.t('erp.nav.erp-sales-order'),
  titleKey: 'erp.nav.erp-sales-order',
  template: 'list',
  group: 'process',
  requiredPermissions: ['erp:sales_order:read', 'erp:dashboard:read'],
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
    salesOrderRoute,
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
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const erpNavConfig: ModuleNavConfig = {
  code: 'erp',
  name: i18n.t('erp.nav.module_name'),
  nameKey: 'erp.nav.module_name',
  icon: 'Grid3X3',
  path: ERP_PATHS.root,
  permission: 'erp:dashboard:read',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 11,
  description: i18n.t('erp.nav.module_name_desc'),
  navItems: [
    {
      code: 'erp-dashboard',
      label: i18n.t('erp.nav.erp-dashboard'),
      labelKey: 'erp.nav.erp-dashboard',
      icon: 'LayoutDashboard',
      path: ERP_PATHS.dashboard,
      permission: 'erp:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('erp.nav.erp-dashboard_desc'),
    },
    {
      code: 'erp-general-ledger',
      label: i18n.t('erp.nav.erp-general-ledger'),
      labelKey: 'erp.nav.erp-general-ledger',
      icon: 'Wallet',
      path: ERP_PATHS.voucherManagement,
      permission: 'erp:general_ledger:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('erp.nav.erp-general-ledger_desc'),
    },
    {
      code: 'erp-customer-management',
      label: i18n.t('erp.nav.erp-customer-management'),
      labelKey: 'erp.nav.erp-customer-management',
      icon: 'Users',
      path: ERP_PATHS.customerManagement,
      permission: 'erp:customer:read',
      order: 2,
      group: 'master',
      description: i18n.t('erp.nav.erp-customer-management_desc'),
    },
    {
      code: 'erp-supplier-management',
      label: i18n.t('erp.nav.erp-supplier-management'),
      labelKey: 'erp.nav.erp-supplier-management',
      icon: 'Building2',
      path: ERP_PATHS.supplierManagement,
      permission: 'erp:supplier:read',
      order: 3,
      group: 'master',
      description: i18n.t('erp.nav.erp-supplier-management_desc'),
      crossModuleRef: true, // overlaps with SCM(scm-suppliers), SRM(srm-supplier) -- supplier domain
    },
    {
      code: 'erp-inventory-management',
      label: i18n.t('erp.nav.erp-inventory-management'),
      labelKey: 'erp.nav.erp-inventory-management',
      icon: 'Package',
      path: ERP_PATHS.inventoryManagement,
      permission: 'erp:inventory:read',
      order: 4,
      group: 'master',
      description: i18n.t('erp.nav.erp-inventory-management_desc'),
      crossModuleRef: true, // overlaps with WMS(wms-items) -- inventory domain
    },
    {
      code: 'erp-material-management',
      label: i18n.t('erp.nav.erp-material-management'),
      labelKey: 'erp.nav.erp-material-management',
      icon: 'Layers',
      path: ERP_PATHS.materialManagement,
      permission: 'erp:material:read',
      order: 5,
      group: 'master',
      description: i18n.t('erp.nav.erp-material-management_desc'),
    },
    {
      code: 'erp-purchase-order',
      label: i18n.t('erp.nav.erp-purchase-order'),
      labelKey: 'erp.nav.erp-purchase-order',
      icon: 'ShoppingCart',
      path: ERP_PATHS.purchaseOrder,
      permission: 'erp:purchase_order:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('erp.nav.erp-purchase-order_desc'),
      crossModuleRef: true, // overlaps with SCM(scm-purchase-orders), SRM(srm-order) -- purchase order domain
    },
    {
      code: 'erp-sales-order',
      label: i18n.t('erp.nav.erp-sales-order'),
      labelKey: 'erp.nav.erp-sales-order',
      icon: 'FileText',
      path: ERP_PATHS.salesOrder,
      permission: 'erp:sales_order:read',
      order: 2,
      group: 'process',
      description: i18n.t('erp.nav.erp-sales-order_desc'),
      crossModuleRef: true, // overlaps with CRM(crm-sales-funnel) -- sales domain
    },
    {
      code: 'erp-financial-statements',
      label: i18n.t('erp.nav.erp-financial-statements'),
      labelKey: 'erp.nav.erp-financial-statements',
      icon: 'FileSpreadsheet',
      path: ERP_PATHS.financialReport,
      permission: 'erp:financial_statement:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('erp.nav.erp-financial-statements_desc'),
    },
    {
      code: 'erp-dictionaries',
      label: i18n.t('erp.nav.erp-dictionaries'),
      labelKey: 'erp.nav.erp-dictionaries',
      icon: 'BookOpen',
      path: ERP_PATHS.dictManagement,
      permission: 'erp:dictionary:read',
      order: 1,
      group: 'setting',
      description: i18n.t('erp.nav.erp-dictionaries_desc'),
    },
    {
      code: 'erp-database-management',
      label: i18n.t('erp.nav.erp-database-management'),
      labelKey: 'erp.nav.erp-database-management',
      icon: 'Database',
      path: ERP_PATHS.databaseManagement,
      permission: 'erp:database:read',
      order: 2,
      group: 'setting',
      description: i18n.t('erp.nav.erp-database-management_desc'),
    },
    {
      code: 'erp-audit-log',
      label: i18n.t('erp.nav.erp-audit-log'),
      labelKey: 'erp.nav.erp-audit-log',
      icon: 'FileCheck',
      path: ERP_PATHS.auditLog,
      permission: 'erp:audit:read',
      order: 3,
      group: 'setting',
      description: i18n.t('erp.nav.erp-audit-log_desc'),
    },
    {
      code: 'erp-office-supplies',
      label: i18n.t('erp.nav.erp-office-supplies'),
      labelKey: 'erp.nav.erp-office-supplies',
      icon: 'Package',
      path: ERP_PATHS.officeSupplies,
      permission: 'erp:office_supply:read',
      order: 6,
      group: 'master',
      description: i18n.t('erp.nav.erp-office-supplies_desc'),
    },
    {
      code: 'erp-vehicle-management',
      label: i18n.t('erp.nav.erp-vehicle-management'),
      labelKey: 'erp.nav.erp-vehicle-management',
      icon: 'Car',
      path: ERP_PATHS.vehicleManagement,
      permission: 'erp:vehicle:read',
      order: 7,
      group: 'master',
      description: i18n.t('erp.nav.erp-vehicle-management_desc'),
    },
    {
      code: 'erp-receivable-payable',
      label: i18n.t('erp.nav.erp-receivable-payable'),
      labelKey: 'erp.nav.erp-receivable-payable',
      icon: 'CreditCard',
      path: ERP_PATHS.receivablePayable,
      permission: 'erp:receivable_payable:read',
      order: 8,
      group: 'business',
      description: i18n.t('erp.nav.erp-receivable-payable_desc'),
    },
    {
      code: 'erp-asset-management',
      label: i18n.t('erp.nav.erp-asset-management'),
      labelKey: 'erp.nav.erp-asset-management',
      icon: 'Landmark',
      path: ERP_PATHS.assetManagement,
      permission: 'erp:asset:read',
      order: 9,
      group: 'master',
      description: i18n.t('erp.nav.erp-asset-management_desc'),
    },
    {
      code: 'erp-budget-management',
      label: i18n.t('erp.nav.erp-budget-management'),
      labelKey: 'erp.nav.erp-budget-management',
      icon: 'Target',
      path: ERP_PATHS.budgetManagement,
      permission: 'erp:budget:read',
      order: 10,
      group: 'business',
      description: i18n.t('erp.nav.erp-budget-management_desc'),
    },
    {
      code: 'erp-bank-account',
      label: i18n.t('erp.nav.erp-bank-account'),
      labelKey: 'erp.nav.erp-bank-account',
      icon: 'Building',
      path: ERP_PATHS.bankAccount,
      permission: 'erp:bank_account:read',
      order: 11,
      group: 'master',
      description: i18n.t('erp.nav.erp-bank-account_desc'),
    },
    {
      code: 'erp-accounting-management',
      label: i18n.t('erp.nav.erp-accounting-management'),
      labelKey: 'erp.nav.erp-accounting-management',
      icon: 'FileSpreadsheet',
      path: ERP_PATHS.accountingManagement,
      permission: 'erp:accounting_subject:read',
      order: 12,
      group: 'master',
      description: i18n.t('erp.nav.erp-accounting-management_desc'),
    },
    {
      code: 'erp-meeting-room',
      label: i18n.t('erp.nav.erp-meeting-room'),
      labelKey: 'erp.nav.erp-meeting-room',
      icon: 'Calendar',
      path: ERP_PATHS.meetingRoom,
      permission: 'erp:meeting_room:read',
      order: 13,
      group: 'master',
      description: i18n.t('erp.nav.erp-meeting-room_desc'),
    },
    {
      code: 'erp-announcement',
      label: i18n.t('erp.nav.erp-announcement'),
      labelKey: 'erp.nav.erp-announcement',
      icon: 'Bell',
      path: ERP_PATHS.announcement,
      permission: 'erp:announcement:read',
      order: 14,
      group: 'master',
      description: i18n.t('erp.nav.erp-announcement_desc'),
    },
    {
      code: 'erp-vehicle-request',
      label: i18n.t('erp.nav.erp-vehicle-request'),
      labelKey: 'erp.nav.erp-vehicle-request',
      icon: 'ClipboardCheck',
      path: ERP_PATHS.vehicleRequest,
      permission: 'erp:vehicle_request:read',
      order: 15,
      group: 'business',
      description: i18n.t('erp.nav.erp-vehicle-request_desc'),
    },
    {
      code: 'erp-financial-analysis',
      label: i18n.t('erp.nav.erp-financial-analysis'),
      labelKey: 'erp.nav.erp-financial-analysis',
      icon: 'BarChart3',
      path: ERP_PATHS.financialAnalysis,
      permission: 'erp:financial_analysis:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('erp.nav.erp-financial-analysis_desc'),
    },
  ],
};
