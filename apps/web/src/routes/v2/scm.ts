import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const ScmDashboardPage = lazyWithRetry(
  () => import('../../pages/scm/DashboardPage'),
  'DashboardPage'
);
const ScmPurchaseOrderPage = lazyWithRetry(
  () => import('../../pages/scm/ScmPurchaseOrderPage'),
  'ScmPurchaseOrderPage'
);
const ScmSupplierPage = lazyWithRetry(
  () => import('../../pages/scm/ScmSupplierPage'),
  'ScmSupplierPage'
);
const ScmOverviewPage = lazyWithRetry(
  () => import('../../pages/scm/ScmOverviewPage'),
  'ScmOverviewPage'
);
const ScmInventoryTurnoverPage = lazyWithRetry(
  () => import('../../pages/scm/ScmInventoryTurnoverPage'),
  'ScmInventoryTurnoverPage'
);
const ScmPriceComparisonPage = lazyWithRetry(
  () => import('../../pages/scm/ScmPriceComparisonPage'),
  'ScmPriceComparisonPage'
);
const SupplierAdmissionPage = lazyWithRetry(
  () => import('../../pages/scm/SupplierAdmissionPage'),
  'SupplierAdmissionPage'
);
const PurchaseContractPage = lazyWithRetry(
  () => import('../../pages/scm/PurchaseContractPage'),
  'PurchaseContractPage'
);
const PurchaseRequisitionPage = lazyWithRetry(
  () => import('../../pages/scm/PurchaseRequisitionPage'),
  'PurchaseRequisitionPage'
);
const MrpPlanPage = lazyWithRetry(
  () => import('../../pages/scm/MrpPlanPage'),
  'MrpPlanPage'
);
const MrpSuggestionPage = lazyWithRetry(
  () => import('../../pages/scm/MrpSuggestionPage'),
  'MrpSuggestionPage'
);
const ScmPurchaseItemPage = lazyWithRetry(
  () => import('../../pages/scm/ScmPurchaseItemPage'),
  'ScmPurchaseItemPage'
);
const ScmEvaluationPage = lazyWithRetry(
  () => import('../../pages/scm/ScmEvaluationPage'),
  'ScmEvaluationPage'
);
const ScmDeliveryAppointmentPage = lazyWithRetry(
  () => import('../../pages/scm/ScmDeliveryAppointmentPage'),
  'ScmDeliveryAppointmentPage'
);

export const scmModuleConfig: RouteModuleConfig = {
  code: 'scm',
  name: '供应链管理',
  icon: 'Truck',
  path: '/scm',
  source: 'core',
  suite: 'supply',
  status: 'online',
  order: 10,
  description: '采购管理、供应商管理、库存管理、物流跟踪',
  permission: 'scm:read',
  routes: [
    {
      path: '/scm/dashboard',
      element: ScmDashboardPage,
      module: 'scm',
      code: 'scm-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['scm:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/scm/purchase-orders',
      element: ScmPurchaseOrderPage,
      module: 'scm',
      code: 'scm-purchase-orders',
      title: '采购订单',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_order:read'],
      nav: {
        label: '采购订单',
        icon: 'ClipboardList',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/scm/purchase-requisition',
      element: PurchaseRequisitionPage,
      module: 'scm',
      code: 'scm-purchase-requisition',
      title: '采购申请',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_requisition:read'],
      nav: {
        label: '采购申请',
        icon: 'FileText',
        order: 2,
        group: 'business',
      },
    },
    {
      path: '/scm/purchase-items',
      element: ScmPurchaseItemPage,
      module: 'scm',
      code: 'scm-purchase-items',
      title: '采购明细',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:purchase_item:read'],
      nav: {
        label: '采购明细',
        icon: 'List',
        order: 3,
        group: 'business',
      },
    },
    {
      path: '/scm/suppliers',
      element: ScmSupplierPage,
      module: 'scm',
      code: 'scm-suppliers',
      title: '供应商管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:supplier:read'],
      nav: {
        label: '供应商管理',
        icon: 'Building',
        order: 4,
        group: 'business',
      },
    },
    {
      path: '/scm/supplier-admission',
      element: SupplierAdmissionPage,
      module: 'scm',
      code: 'scm-supplier-admission',
      title: '供应商准入',
      template: 'list',
      group: 'business',
      requiredPermissions: ['scm:supplier_admission:read'],
      nav: {
        label: '供应商准入',
        icon: 'UserPlus',
        order: 5,
        group: 'business',
      },
    },
    {
      path: '/scm/supplier-evaluation',
      element: ScmEvaluationPage,
      module: 'scm',
      code: 'scm-supplier-evaluation',
      title: '供应商评估',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:supplier_evaluation:read'],
      nav: {
        label: '供应商评估',
        icon: 'Award',
        order: 1,
        group: 'process',
      },
    },
    {
      path: '/scm/contracts',
      element: PurchaseContractPage,
      module: 'scm',
      code: 'scm-contracts',
      title: '合同管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:contract:read'],
      nav: {
        label: '合同管理',
        icon: 'FileText',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/scm/delivery-appointment',
      element: ScmDeliveryAppointmentPage,
      module: 'scm',
      code: 'scm-delivery-appointment',
      title: '交期预约',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:delivery_appointment:read'],
      nav: {
        label: '交期预约',
        icon: 'Calendar',
        order: 3,
        group: 'process',
      },
    },
    {
      path: '/scm/mrp-plan',
      element: MrpPlanPage,
      module: 'scm',
      code: 'scm-mrp-plan',
      title: 'MRP计划',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:mrp_plan:read'],
      nav: {
        label: 'MRP计划',
        icon: 'LayoutGrid',
        order: 4,
        group: 'process',
      },
    },
    {
      path: '/scm/mrp-suggestion',
      element: MrpSuggestionPage,
      module: 'scm',
      code: 'scm-mrp-suggestion',
      title: 'MRP建议',
      template: 'list',
      group: 'process',
      requiredPermissions: ['scm:mrp_suggestion:read'],
      nav: {
        label: 'MRP建议',
        icon: 'Lightbulb',
        order: 5,
        group: 'process',
      },
    },
    {
      path: '/scm/overview',
      element: ScmOverviewPage,
      module: 'scm',
      code: 'scm-overview',
      title: '供应链概览',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['scm:read'],
      nav: {
        label: '供应链概览',
        icon: 'PieChart',
        order: 1,
        group: 'analytics',
        showInTabs: true,
      },
    },
    {
      path: '/scm/inventory-turnover',
      element: ScmInventoryTurnoverPage,
      module: 'scm',
      code: 'scm-inventory-turnover',
      title: '库存周转',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['scm:inventory_turnover:read'],
      nav: {
        label: '库存周转',
        icon: 'TrendingUp',
        order: 2,
        group: 'analytics',
      },
    },
    {
      path: '/scm/price-comparison',
      element: ScmPriceComparisonPage,
      module: 'scm',
      code: 'scm-price-comparison',
      title: '价格对比',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['scm:price_comparison:read'],
      nav: {
        label: '价格对比',
        icon: 'BarChart3',
        order: 3,
        group: 'analytics',
      },
    },
  ],
};
