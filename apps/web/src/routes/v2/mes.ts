import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const MesDashboardPage = lazyWithRetry(
  () => import('../../pages/mes/ProductionDashboardPage'),
  'ProductionDashboardPage'
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
const WIPPage = lazyWithRetry(() => import('../../pages/mes/WIPPage'), 'WIPPage');
const WorkOrderPage = lazyWithRetry(() => import('../../pages/mes/WorkOrderPage'), 'WorkOrderPage');
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
    },
  ],
};
