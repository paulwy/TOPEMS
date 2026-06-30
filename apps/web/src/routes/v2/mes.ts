import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const MesDashboardPage = lazyWithRetry(
  () => import('../../pages/mes/DashboardPage'),
  'DashboardPage'
);
const MesQualityPage = lazyWithRetry(
  () => import('../../pages/mes/MesQualityPage'),
  'MesQualityPage'
);
const ProcessFlowPage = lazyWithRetry(
  () => import('../../pages/mes/ProcessFlowPage'),
  'ProcessFlowPage'
);
const ProcessRoutePage = lazyWithRetry(
  () => import('../../pages/mes/ProcessRoutePage'),
  'ProcessRoutePage'
);
const TeamManagementPage = lazyWithRetry(
  () => import('../../pages/mes/TeamManagementPage'),
  'TeamManagementPage'
);
const WIPPage = lazyWithRetry(
  () => import('../../pages/mes/WIPPage'),
  'WIPPage'
);
const WorkOrderPage = lazyWithRetry(
  () => import('../../pages/mes/WorkOrderPage'),
  'WorkOrderPage'
);
const WorkReportPage = lazyWithRetry(
  () => import('../../pages/mes/WorkReportPage'),
  'WorkReportPage'
);
const WorkStationPage = lazyWithRetry(
  () => import('../../pages/mes/WorkStationPage'),
  'WorkStationPage'
);
const EquipmentDetailPage = lazyWithRetry(
  () => import('../../pages/mes/EquipmentDetailPage'),
  'EquipmentDetailPage'
);
const EquipmentOEEPage = lazyWithRetry(
  () => import('../../pages/mes/EquipmentOEEPage'),
  'EquipmentOEEPage'
);
const MaterialBOMPage = lazyWithRetry(
  () => import('../../pages/mes/MaterialBOMPage'),
  'MaterialBOMPage'
);
const MaterialIssuePage = lazyWithRetry(
  () => import('../../pages/mes/MaterialIssuePage'),
  'MaterialIssuePage'
);
const MaterialReturnPage = lazyWithRetry(
  () => import('../../pages/mes/MaterialReturnPage'),
  'MaterialReturnPage'
);
const ProductionOrderManagementPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionOrderManagementPage'),
  'ProductionOrderManagementPage'
);
const ProductionOrderDetailPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionOrderDetailPage'),
  'ProductionOrderDetailPage'
);
const EquipmentManagementPage = lazyWithRetry(
  () => import('../../pages/mes/EquipmentManagementPage'),
  'EquipmentManagementPage'
);
const ProductionProcessPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionProcessPage'),
  'ProductionProcessPage'
);
const ProductionSchedulePage = lazyWithRetry(
  () => import('../../pages/mes/ProductionSchedulePage'),
  'ProductionSchedulePage'
);
const ProductionKanbanPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionKanbanPage'),
  'ProductionKanbanPage'
);
const ProductionRecordPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionRecordPage'),
  'ProductionRecordPage'
);
const QualityInspectionPage = lazyWithRetry(
  () => import('../../pages/mes/QualityInspectionPage'),
  'QualityInspectionPage'
);
const QualityTraceabilityPage = lazyWithRetry(
  () => import('../../pages/mes/QualityTraceabilityPage'),
  'QualityTraceabilityPage'
);
const MaterialRequirementPage = lazyWithRetry(
  () => import('../../pages/mes/MaterialRequirementPage'),
  'MaterialRequirementPage'
);
const ProductionDashboardPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionDashboardPage'),
  'ProductionDashboardPage'
);

export const mesModuleConfig: RouteModuleConfig = {
  code: 'mes',
  name: '生产执行',
  icon: 'Factory',
  path: '/mes',
  source: 'core',
  suite: 'manufacturing',
  status: 'online',
  order: 8,
  description: '生产订单、工艺路线、设备管理、质量追溯',
  permission: 'mes:read',
  routes: [
    {
      path: '/mes/dashboard',
      element: MesDashboardPage,
      module: 'mes',
      code: 'mes-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['mes:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/mes/production-orders',
      element: ProductionOrderManagementPage,
      module: 'mes',
      code: 'mes-production-orders',
      title: '生产订单',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:production_order:read'],
      nav: {
        label: '生产订单',
        icon: 'ClipboardList',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/mes/production-orders/:id',
      element: ProductionOrderDetailPage,
      module: 'mes',
      code: 'mes-production-order-detail',
      title: '生产订单详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['mes:production_order:read'],
    },
    {
      path: '/mes/work-orders',
      element: WorkOrderPage,
      module: 'mes',
      code: 'mes-work-orders',
      title: '工单管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:work_order:read'],
      nav: {
        label: '工单管理',
        icon: 'FileText',
        order: 2,
        group: 'business',
      },
    },
    {
      path: '/mes/equipment',
      element: EquipmentManagementPage,
      module: 'mes',
      code: 'mes-equipment',
      title: '设备管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:equipment:read'],
      nav: {
        label: '设备管理',
        icon: 'Wrench',
        order: 3,
        group: 'business',
      },
    },
    {
      path: '/mes/equipment/:id',
      element: EquipmentDetailPage,
      module: 'mes',
      code: 'mes-equipment-detail',
      title: '设备详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['mes:equipment:read'],
    },
    {
      path: '/mes/work-stations',
      element: WorkStationPage,
      module: 'mes',
      code: 'mes-work-stations',
      title: '工位管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:work_station:read'],
      nav: {
        label: '工位管理',
        icon: 'MapPin',
        order: 4,
        group: 'business',
      },
    },
    {
      path: '/mes/teams',
      element: TeamManagementPage,
      module: 'mes',
      code: 'mes-teams',
      title: '班组管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:team:read'],
      nav: {
        label: '班组管理',
        icon: 'Users',
        order: 5,
        group: 'business',
      },
    },
    {
      path: '/mes/material-requirement',
      element: MaterialRequirementPage,
      module: 'mes',
      code: 'mes-material-requirement',
      title: '物料需求',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:material:read'],
      nav: {
        label: '物料需求',
        icon: 'Package',
        order: 6,
        group: 'business',
      },
    },
    {
      path: '/mes/process-routes',
      element: ProcessRoutePage,
      module: 'mes',
      code: 'mes-process-routes',
      title: '工艺路线',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:process_route:read'],
      nav: {
        label: '工艺路线',
        icon: 'Route',
        order: 1,
        group: 'process',
      },
    },
    {
      path: '/mes/process-flow',
      element: ProcessFlowPage,
      module: 'mes',
      code: 'mes-process-flow',
      title: '工艺流程',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:process_flow:read'],
      nav: {
        label: '工艺流程',
        icon: 'GitBranch',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/mes/production-process',
      element: ProductionProcessPage,
      module: 'mes',
      code: 'mes-production-process',
      title: '生产过程',
      template: 'detail',
      group: 'process',
      requiredPermissions: ['mes:production_process:read'],
      nav: {
        label: '生产过程',
        icon: 'Activity',
        order: 3,
        group: 'process',
      },
    },
    {
      path: '/mes/production-schedule',
      element: ProductionSchedulePage,
      module: 'mes',
      code: 'mes-production-schedule',
      title: '生产计划',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:production_schedule:read'],
      nav: {
        label: '生产计划',
        icon: 'Calendar',
        order: 4,
        group: 'process',
      },
    },
    {
      path: '/mes/wip',
      element: WIPPage,
      module: 'mes',
      code: 'mes-wip',
      title: '在制品',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:wip:read'],
      nav: {
        label: '在制品',
        icon: 'Box',
        order: 5,
        group: 'process',
      },
    },
    {
      path: '/mes/quality-inspection',
      element: QualityInspectionPage,
      module: 'mes',
      code: 'mes-quality-inspection',
      title: '过程质检',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:quality:read'],
      nav: {
        label: '过程质检',
        icon: 'CheckCircle',
        order: 6,
        group: 'process',
      },
    },
    {
      path: '/mes/traceability',
      element: QualityTraceabilityPage,
      module: 'mes',
      code: 'mes-traceability',
      title: '质量追溯',
      template: 'detail',
      group: 'process',
      requiredPermissions: ['mes:traceability:read'],
      nav: {
        label: '质量追溯',
        icon: 'Search',
        order: 7,
        group: 'process',
      },
    },
    {
      path: '/mes/production-kanban',
      element: ProductionKanbanPage,
      module: 'mes',
      code: 'mes-production-kanban',
      title: '生产看板',
      template: 'kanban',
      group: 'analytics',
      requiredPermissions: ['mes:kanban:read'],
      nav: {
        label: '生产看板',
        icon: 'LayoutGrid',
        order: 1,
        group: 'analytics',
        showInTabs: true,
      },
    },
    {
      path: '/mes/production-record',
      element: ProductionRecordPage,
      module: 'mes',
      code: 'mes-production-record',
      title: '生产记录',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['mes:production_record:read'],
      nav: {
        label: '生产记录',
        icon: 'ScrollText',
        order: 2,
        group: 'analytics',
      },
    },
    {
      path: '/mes/work-report',
      element: WorkReportPage,
      module: 'mes',
      code: 'mes-work-report',
      title: '工作报告',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['mes:work_report:read'],
      nav: {
        label: '工作报告',
        icon: 'FileCheck',
        order: 3,
        group: 'analytics',
      },
    },
    {
      path: '/mes/equipment-oee',
      element: EquipmentOEEPage,
      module: 'mes',
      code: 'mes-equipment-oee',
      title: '设备OEE',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['mes:oee:read'],
      nav: {
        label: '设备OEE',
        icon: 'Gauge',
        order: 4,
        group: 'analytics',
      },
    },
    {
      path: '/mes/material-bom',
      element: MaterialBOMPage,
      module: 'mes',
      code: 'mes-material-bom',
      title: '物料BOM',
      template: 'tree',
      group: 'business',
      requiredPermissions: ['mes:material:read'],
    },
    {
      path: '/mes/material-issue',
      element: MaterialIssuePage,
      module: 'mes',
      code: 'mes-material-issue',
      title: '物料出库',
      template: 'form',
      group: 'business',
      requiredPermissions: ['mes:material:update'],
    },
    {
      path: '/mes/material-return',
      element: MaterialReturnPage,
      module: 'mes',
      code: 'mes-material-return',
      title: '物料退回',
      template: 'form',
      group: 'business',
      requiredPermissions: ['mes:material:update'],
    },
    {
      path: '/mes/production-dashboard',
      element: ProductionDashboardPage,
      module: 'mes',
      code: 'mes-production-dashboard',
      title: '生产总览',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:read'],
      nav: {
        label: '生产总览',
        icon: 'BarChart3',
        order: 5,
        group: 'analytics',
      },
    },
  ],
};
