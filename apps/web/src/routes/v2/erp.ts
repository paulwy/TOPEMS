import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const ErpDashboardPage = lazyWithRetry(
  () => import('../../pages/erp/DashboardPage'),
  'DashboardPage'
);

export const erpModuleConfig: RouteModuleConfig = {
  code: 'erp',
  name: '企业资源计划',
  icon: 'Grid3X3',
  path: '/erp',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 11,
  description: '财务会计、成本控制、资金管理、资产运营',
  permission: 'erp:read',
  routes: [
    {
      path: '/erp/dashboard',
      element: ErpDashboardPage,
      module: 'erp',
      code: 'erp-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['erp:read'],
    },
    {
      path: '/erp/voucher-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/VoucherManagementPage'),
        'VoucherManagementPage'
      ),
      module: 'erp',
      code: 'erp-general-ledger',
      title: '总账管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['erp:general_ledger:read'],
    },
    {
      path: '/erp/customer-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/CustomerManagementPage'),
        'CustomerManagementPage'
      ),
      module: 'erp',
      code: 'erp-customer-management',
      title: '客户管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['erp:customer:read'],
    },
    {
      path: '/erp/supplier-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/SupplierManagementPage'),
        'SupplierManagementPage'
      ),
      module: 'erp',
      code: 'erp-supplier-management',
      title: '供应商管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['erp:supplier:read'],
    },
    {
      path: '/erp/inventory-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/InventoryManagementPage'),
        'InventoryManagementPage'
      ),
      module: 'erp',
      code: 'erp-inventory-management',
      title: '库存管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['erp:inventory:read'],
    },
    {
      path: '/erp/material-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/MaterialManagementPage'),
        'MaterialManagementPage'
      ),
      module: 'erp',
      code: 'erp-material-management',
      title: '物料管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['erp:material:read'],
    },
    {
      path: '/erp/purchase-order',
      element: lazyWithRetry(
        () => import('../../pages/erp/PurchaseOrderPage'),
        'PurchaseOrderPage'
      ),
      module: 'erp',
      code: 'erp-purchase-order',
      title: '采购订单',
      template: 'list',
      group: 'process',
      requiredPermissions: ['erp:purchase_order:read'],
    },
    {
      path: '/erp/sales-order',
      element: lazyWithRetry(() => import('../../pages/erp/SalesOrderPage'), 'SalesOrderPage'),
      module: 'erp',
      code: 'erp-sales-order',
      title: '销售订单',
      template: 'list',
      group: 'process',
      requiredPermissions: ['erp:sales_order:read'],
    },
    {
      path: '/erp/financial-report',
      element: lazyWithRetry(
        () => import('../../pages/erp/FinancialReportPage'),
        'FinancialReportPage'
      ),
      module: 'erp',
      code: 'erp-financial-statements',
      title: '财务报表',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['erp:financial_statement:read'],
    },
    {
      path: '/erp/dict-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/DictManagementPage'),
        'DictManagementPage'
      ),
      module: 'erp',
      code: 'erp-dictionaries',
      title: '数据字典',
      template: 'tree',
      group: 'settings',
      requiredPermissions: ['erp:dictionary:read'],
    },
    {
      path: '/erp/database-management',
      element: lazyWithRetry(
        () => import('../../pages/erp/DatabaseManagementPage'),
        'DatabaseManagementPage'
      ),
      module: 'erp',
      code: 'erp-database-management',
      title: '数据库管理',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['erp:database:read'],
    },
    {
      path: '/erp/audit-log',
      element: lazyWithRetry(() => import('../../pages/erp/AuditLogPage'), 'AuditLogPage'),
      module: 'erp',
      code: 'erp-audit-log',
      title: '审计日志',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['erp:audit:read'],
    },
  ],
};
