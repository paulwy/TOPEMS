import { lazyWithRetry } from '../utils';
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
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
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
      nav: {
        label: '总账管理',
        icon: 'Wallet',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
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
      nav: {
        label: '客户管理',
        icon: 'Users',
        order: 2,
        group: 'business',
      },
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
      nav: {
        label: '供应商管理',
        icon: 'Building2',
        order: 3,
        group: 'business',
      },
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
      nav: {
        label: '库存管理',
        icon: 'Package',
        order: 4,
        group: 'business',
      },
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
      nav: {
        label: '物料管理',
        icon: 'Layers',
        order: 5,
        group: 'business',
      },
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
      nav: {
        label: '采购订单',
        icon: 'ShoppingCart',
        order: 1,
        group: 'process',
        showInTabs: true,
      },
    },
    {
      path: '/erp/sales-order',
      element: lazyWithRetry(
        () => import('../../pages/erp/SalesOrderPage'),
        'SalesOrderPage'
      ),
      module: 'erp',
      code: 'erp-sales-order',
      title: '销售订单',
      template: 'list',
      group: 'process',
      requiredPermissions: ['erp:sales_order:read'],
      nav: {
        label: '销售订单',
        icon: 'FileText',
        order: 2,
        group: 'process',
      },
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
      nav: {
        label: '财务报表',
        icon: 'FileSpreadsheet',
        order: 1,
        group: 'analytics',
        showInTabs: true,
      },
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
      nav: {
        label: '数据字典',
        icon: 'BookOpen',
        order: 1,
        group: 'settings',
      },
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
      nav: {
        label: '数据库管理',
        icon: 'Database',
        order: 2,
        group: 'settings',
      },
    },
    {
      path: '/erp/audit-log',
      element: lazyWithRetry(
        () => import('../../pages/erp/AuditLogPage'),
        'AuditLogPage'
      ),
      module: 'erp',
      code: 'erp-audit-log',
      title: '审计日志',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['erp:audit:read'],
      nav: {
        label: '审计日志',
        icon: 'FileCheck',
        order: 3,
        group: 'settings',
      },
    },
  ],
};