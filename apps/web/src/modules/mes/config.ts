import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 MES_PATHS.xxx，而非硬编码字符串
export const MES_PATHS = {
  root: '/mes',
  dashboard: '/mes/dashboard',
  productionOrders: '/mes/production-orders',
  productionOrderDetail: '/mes/production-orders/:id',
  workOrders: '/mes/work-orders',
  equipment: '/mes/equipment',
  equipmentDetail: '/mes/equipment/:id',
  workStations: '/mes/work-stations',
  teams: '/mes/teams',
  materialRequirement: '/mes/material-requirement',
  processRoutes: '/mes/process-routes',
  processFlow: '/mes/process-flow',
  productionProcess: '/mes/production-process',
  productionSchedule: '/mes/production-schedule',
  wip: '/mes/wip',
  qualityInspection: '/mes/quality-inspection',
  traceability: '/mes/traceability',
  productionKanban: '/mes/production-kanban',
  productionRecord: '/mes/production-record',
  workReport: '/mes/work-report',
  equipmentOee: '/mes/equipment-oee',
  materialBom: '/mes/material-bom',
  materialIssue: '/mes/material-issue',
  materialReturn: '/mes/material-return',
  productionDashboard: '/mes/production-dashboard',
  apsScheduling: '/mes/aps-scheduling',
  productionCost: '/mes/production-cost',
  energyManagement: '/mes/energy-management',
  anomalyDetection: '/mes/anomaly-detection',
  workOrder: '/mes/work-order',
  quality: '/mes/quality',
  analyticsOee: '/mes/analytics/oee',
  analyticsDelivery: '/mes/analytics/delivery',
  analyticsQualityPareto: '/mes/analytics/quality-pareto',
  analyticsMtbf: '/mes/analytics/mtbf',
  analyticsEnergy: '/mes/analytics/energy',
  analyticsCapacity: '/mes/analytics/capacity',
  settingQualityTemplate: '/mes/setting/quality-template',
  settingBomVersionPolicy: '/mes/setting/bom-version-policy',
  settingApsConfig: '/mes/setting/aps-config',
  settingEquipmentThreshold: '/mes/setting/equipment-threshold',
} as const;

// ---- V257 P0-1：页面级 Props interface（Frontend 泛型收紧 · 3/15 核心模块首批）----
// 命名规则：<DisplayName> + 'Props'，严格 1:1 对应 lazyWithRetry 第 2 参数 DisplayName
// 字段策略：template 通用字段（list/pageSize/filters · form/mode/initialValues · detail/id · etc.）+ PATH 动态段参数（:id → id?）
// 深层字段（filters/initialValues）先宽松 Record<string, unknown>，V257 P1-1 tsc 后细化

interface ProductionDashboardPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface ProductionOrderManagementPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface ProductionOrderDetailPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface WorkOrderPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface EquipmentManagementPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface EquipmentDetailPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface WorkStationPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface TeamManagementPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface MaterialRequirementPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface ProcessRoutePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface ProcessFlowPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface ProductionProcessPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface ProductionSchedulePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface WIPPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface QualityInspectionPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface QualityTraceabilityPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface ProductionKanbanPageProps {
  /** 看板列 ID 列表（列顺序）*/

  columns?: string[];

  /** 折叠的列 */

  collapsedColumns?: string[];

  /** 看板过滤条件 */

  filters?: Record<string, unknown>;
}

interface ProductionRecordPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface WorkReportPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface EquipmentOEEPageProps {
  /** 统计维度 */

  dimensions?: string[];

  /** 统计指标 */

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 过滤器 */

  filters?: Record<string, unknown>;
}

interface MaterialBOMPageProps {
  /** 展开的节点 ID 列表 */

  expandedKeys?: string[];

  /** 选中的节点 ID 列表 */

  selectedKeys?: string[];

  /** 勾选的节点 ID 列表（多选场景）*/

  checkedKeys?: string[];

  /** 根节点父 ID（多租户多根树）*/

  rootParentId?: string;
}

interface MaterialIssuePageProps {
  /** 表单模式 */

  mode?: 'create' | 'edit' | 'clone' | 'view';

  /** 初始值（编辑/克隆时注入）*/

  initialValues?: Record<string, unknown>;

  /** 来源 ID（从列表跳转时带的上一条记录 ID）*/

  sourceId?: string;

  /** 预填充字段（从其他页面跳转带过来的）*/

  prefillFrom?: Record<string, unknown>;
}

interface MaterialReturnPageProps {
  /** 表单模式 */

  mode?: 'create' | 'edit' | 'clone' | 'view';

  /** 初始值（编辑/克隆时注入）*/

  initialValues?: Record<string, unknown>;

  /** 来源 ID（从列表跳转时带的上一条记录 ID）*/

  sourceId?: string;

  /** 预填充字段（从其他页面跳转带过来的）*/

  prefillFrom?: Record<string, unknown>;
}

interface ApsSchedulingPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface ProductionCostPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface EnergyManagementPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface AnomalyDetectionPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesWorkOrderPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface MesQualityPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface MesOeeDashboardPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesDeliveryAnalyticsPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesQualityParetoPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesEquipmentMtbfPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesEnergyCostPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface MesCapacityUtilizationPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface QualityTemplatePageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface BomVersionPolicyPageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface ApsConfigPageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface EquipmentThresholdPageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}
// ---- 路由配置（供路由系统使用） ----
export const mesModuleConfig: RouteModuleConfig = {
  code: 'mes',
  name: i18n.t('shared.config.mes_name'),
  nameKey: 'shared.config.mes_name',
  icon: 'Factory',
  path: MES_PATHS.root,
  source: 'core',
  suite: 'manufacturing',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k1'),
  permission: 'mes:module:read',
  routes: [
    {
      path: MES_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionDashboardPage'),
        'ProductionDashboardPage'
      ),
      module: 'mes',
      code: 'mes-dashboard',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['mes:dashboard:read'],
      action: 'read',
    } as RouteConfigV2<ProductionDashboardPageProps>,
    {
      path: MES_PATHS.productionOrders,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionOrderManagementPage'),
        'ProductionOrderManagementPage'
      ),
      module: 'mes',
      code: 'mes-production-orders',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:production_order:read'],
      action: 'read',
    } as RouteConfigV2<ProductionOrderManagementPageProps>,
    {
      path: MES_PATHS.productionOrderDetail,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionOrderDetailPage'),
        'ProductionOrderDetailPage'
      ),
      module: 'mes',
      code: 'mes-production-order-detail',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['mes:production_order:read'],
      action: 'read',
    } as RouteConfigV2<ProductionOrderDetailPageProps>,
    {
      path: MES_PATHS.workOrders,
      element: lazyWithRetry(() => import('@/pages/mes/WorkOrderPage'), 'WorkOrderPage'),
      module: 'mes',
      code: 'mes-work-orders',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:work_order:read'],
      action: 'read',
    } as RouteConfigV2<WorkOrderPageProps>,
    {
      path: MES_PATHS.equipment,
      element: lazyWithRetry(
        () => import('@/pages/mes/EquipmentManagementPage'),
        'EquipmentManagementPage'
      ),
      module: 'mes',
      code: 'mes-equipment',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      template: 'list',
      group: 'master',
      requiredPermissions: ['mes:equipment:read'],
      action: 'read',
    } as RouteConfigV2<EquipmentManagementPageProps>,
    {
      path: MES_PATHS.equipmentDetail,
      element: lazyWithRetry(
        () => import('@/pages/mes/EquipmentDetailPage'),
        'EquipmentDetailPage'
      ),
      module: 'mes',
      code: 'mes-equipment-detail',
      title: i18n.t('shared.config.k7'),
      titleKey: 'shared.config.k7',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['mes:equipment:read'],
      action: 'read',
    } as RouteConfigV2<EquipmentDetailPageProps>,
    {
      path: MES_PATHS.workStations,
      element: lazyWithRetry(() => import('@/pages/mes/WorkStationPage'), 'WorkStationPage'),
      module: 'mes',
      code: 'mes-work-stations',
      title: i18n.t('shared.config.k8'),
      titleKey: 'shared.config.k8',
      template: 'list',
      group: 'master',
      requiredPermissions: ['mes:work_station:read'],
      action: 'read',
    } as RouteConfigV2<WorkStationPageProps>,
    {
      path: MES_PATHS.teams,
      element: lazyWithRetry(() => import('@/pages/mes/TeamManagementPage'), 'TeamManagementPage'),
      module: 'mes',
      code: 'mes-teams',
      title: i18n.t('shared.config.k9'),
      titleKey: 'shared.config.k9',
      template: 'list',
      group: 'master',
      requiredPermissions: ['mes:team:read'],
      action: 'read',
    } as RouteConfigV2<TeamManagementPageProps>,
    {
      path: MES_PATHS.materialRequirement,
      element: lazyWithRetry(
        () => import('@/pages/mes/MaterialRequirementPage'),
        'MaterialRequirementPage'
      ),
      module: 'mes',
      code: 'mes-material-requirement',
      title: i18n.t('shared.config.k10'),
      titleKey: 'shared.config.k10',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:material:read'],
      action: 'read',
    } as RouteConfigV2<MaterialRequirementPageProps>,
    {
      path: MES_PATHS.processRoutes,
      element: lazyWithRetry(() => import('@/pages/mes/ProcessRoutePage'), 'ProcessRoutePage'),
      module: 'mes',
      code: 'mes-process-routes',
      title: i18n.t('shared.config.k11'),
      titleKey: 'shared.config.k11',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:process_route:read'],
      action: 'read',
    } as RouteConfigV2<ProcessRoutePageProps>,
    {
      path: MES_PATHS.processFlow,
      element: lazyWithRetry(() => import('@/pages/mes/ProcessFlowPage'), 'ProcessFlowPage'),
      module: 'mes',
      code: 'mes-process-flow',
      title: i18n.t('shared.config.k12'),
      titleKey: 'shared.config.k12',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:process_flow:read'],
      action: 'read',
    } as RouteConfigV2<ProcessFlowPageProps>,
    {
      path: MES_PATHS.productionProcess,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionProcessPage'),
        'ProductionProcessPage'
      ),
      module: 'mes',
      code: 'mes-production-process',
      title: i18n.t('shared.config.k13'),
      titleKey: 'shared.config.k13',
      template: 'detail',
      group: 'process',
      requiredPermissions: ['mes:production_process:read'],
      action: 'read',
    } as RouteConfigV2<ProductionProcessPageProps>,
    {
      path: MES_PATHS.productionSchedule,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionSchedulePage'),
        'ProductionSchedulePage'
      ),
      module: 'mes',
      code: 'mes-production-schedule',
      title: i18n.t('shared.config.k14'),
      titleKey: 'shared.config.k14',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:production_schedule:read'],
      action: 'read',
    } as RouteConfigV2<ProductionSchedulePageProps>,
    {
      path: MES_PATHS.wip,
      element: lazyWithRetry(
        () => import('@/pages/mes/WIPPage') as Promise<{ default: any }>,
        'WIPPage'
      ),
      module: 'mes',
      code: 'mes-wip',
      title: i18n.t('shared.config.k15'),
      titleKey: 'shared.config.k15',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:wip:read'],
      action: 'read',
    } as unknown as RouteConfigV2<WIPPageProps>,
    {
      path: MES_PATHS.qualityInspection,
      element: lazyWithRetry(
        () => import('@/pages/mes/QualityInspectionPage'),
        'QualityInspectionPage'
      ),
      module: 'mes',
      code: 'mes-quality-inspection',
      title: i18n.t('shared.config.k16'),
      titleKey: 'shared.config.k16',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:quality:read'],
      action: 'read',
    } as RouteConfigV2<QualityInspectionPageProps>,
    {
      path: MES_PATHS.traceability,
      element: lazyWithRetry(
        () => import('@/pages/mes/QualityTraceabilityPage'),
        'QualityTraceabilityPage'
      ),
      module: 'mes',
      code: 'mes-traceability',
      title: i18n.t('shared.config.k17'),
      titleKey: 'shared.config.k17',
      template: 'detail',
      group: 'process',
      requiredPermissions: ['mes:traceability:read'],
      action: 'read',
    } as RouteConfigV2<QualityTraceabilityPageProps>,
    {
      path: MES_PATHS.productionKanban,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionKanbanPage'),
        'ProductionKanbanPage'
      ),
      module: 'mes',
      code: 'mes-production-kanban',
      title: i18n.t('shared.config.k18'),
      titleKey: 'shared.config.k18',
      template: 'kanban',
      group: 'analytics',
      requiredPermissions: ['mes:kanban:read'],
      action: 'read',
    } as RouteConfigV2<ProductionKanbanPageProps>,
    {
      path: MES_PATHS.productionRecord,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionRecordPage'),
        'ProductionRecordPage'
      ),
      module: 'mes',
      code: 'mes-production-record',
      title: i18n.t('shared.config.k19'),
      titleKey: 'shared.config.k19',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['mes:production_record:read'],
      action: 'read',
    } as RouteConfigV2<ProductionRecordPageProps>,
    {
      path: MES_PATHS.workReport,
      element: lazyWithRetry(() => import('@/pages/mes/WorkReportPage'), 'WorkReportPage'),
      module: 'mes',
      code: 'mes-work-report',
      title: i18n.t('shared.config.k20'),
      titleKey: 'shared.config.k20',
      template: 'list',
      group: 'analytics',
      requiredPermissions: ['mes:work_report:read'],
      action: 'read',
    } as RouteConfigV2<WorkReportPageProps>,
    {
      path: MES_PATHS.equipmentOee,
      element: lazyWithRetry(() => import('@/pages/mes/EquipmentOEEPage'), 'EquipmentOEEPage'),
      module: 'mes',
      code: 'mes-equipment-oee',
      title: i18n.t('shared.config.oee_21'),
      titleKey: 'shared.config.oee_21',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['mes:oee:read'],
      action: 'read',
    } as RouteConfigV2<EquipmentOEEPageProps>,
    {
      path: MES_PATHS.materialBom,
      element: lazyWithRetry(() => import('@/pages/mes/MaterialBOMPage'), 'MaterialBOMPage'),
      module: 'mes',
      code: 'mes-material-bom',
      title: i18n.t('shared.config.bom_22'),
      titleKey: 'shared.config.bom_22',
      template: 'tree',
      group: 'business',
      requiredPermissions: ['mes:material:read'],
      action: 'read',
    } as RouteConfigV2<MaterialBOMPageProps>,
    {
      path: MES_PATHS.materialIssue,
      element: lazyWithRetry(() => import('@/pages/mes/MaterialIssuePage'), 'MaterialIssuePage'),
      module: 'mes',
      code: 'mes-material-issue',
      title: i18n.t('shared.config.k23'),
      titleKey: 'shared.config.k23',
      template: 'form',
      group: 'business',
      requiredPermissions: ['mes:material:update'],
      action: 'update',
    } as RouteConfigV2<MaterialIssuePageProps>,
    {
      path: MES_PATHS.materialReturn,
      element: lazyWithRetry(() => import('@/pages/mes/MaterialReturnPage'), 'MaterialReturnPage'),
      module: 'mes',
      code: 'mes-material-return',
      title: i18n.t('shared.config.k24'),
      titleKey: 'shared.config.k24',
      template: 'form',
      group: 'business',
      requiredPermissions: ['mes:material:update'],
      action: 'update',
    } as RouteConfigV2<MaterialReturnPageProps>,
    {
      path: MES_PATHS.productionDashboard,
      element: lazyWithRetry(
        () => import('@/pages/mes/ProductionDashboardPage'),
        'ProductionDashboardPage'
      ),
      module: 'mes',
      code: 'mes-production-dashboard',
      title: i18n.t('shared.config.k25'),
      titleKey: 'shared.config.k25',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:production_dashboard:read'],
      action: 'read',
    } as RouteConfigV2<ProductionDashboardPageProps>,
    {
      path: MES_PATHS.apsScheduling,
      element: lazyWithRetry(() => import('@/pages/mes/ApsSchedulingPage'), 'ApsSchedulingPage'),
      module: 'mes',
      code: 'mes-aps-scheduling',
      title: i18n.t('shared.config.aps_0'),
      titleKey: 'shared.config.aps_0',
      template: 'dashboard',
      group: 'process',
      requiredPermissions: ['mes:production_schedule:read'],
      action: 'read',
    } as RouteConfigV2<ApsSchedulingPageProps>,
    {
      path: MES_PATHS.productionCost,
      element: lazyWithRetry(() => import('@/pages/mes/ProductionCostPage'), 'ProductionCostPage'),
      module: 'mes',
      code: 'mes-production-cost',
      title: i18n.t('shared.config.k26'),
      titleKey: 'shared.config.k26',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:production_cost:read'],
      action: 'read',
    } as RouteConfigV2<ProductionCostPageProps>,
    {
      path: MES_PATHS.energyManagement,
      element: lazyWithRetry(
        () => import('@/pages/mes/EnergyManagementPage'),
        'EnergyManagementPage'
      ),
      module: 'mes',
      code: 'mes-energy-management',
      title: i18n.t('shared.config.k27'),
      titleKey: 'shared.config.k27',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:energy_management:read'],
      action: 'read',
    } as RouteConfigV2<EnergyManagementPageProps>,
    {
      path: MES_PATHS.anomalyDetection,
      element: lazyWithRetry(
        () => import('@/pages/mes/AnomalyDetectionPage'),
        'AnomalyDetectionPage'
      ),
      module: 'mes',
      code: 'mes-anomaly-detection',
      title: i18n.t('shared.config.k28'),
      titleKey: 'shared.config.k28',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:anomaly_detection:read'],
      action: 'read',
    } as RouteConfigV2<AnomalyDetectionPageProps>,
    {
      path: MES_PATHS.workOrder,
      element: lazyWithRetry(() => import('@/pages/mes/MesWorkOrderPage'), 'MesWorkOrderPage'),
      module: 'mes',
      code: 'mes-work-order',
      title: i18n.t('shared.config.k29'),
      titleKey: 'shared.config.k29',
      template: 'list',
      group: 'business',
      requiredPermissions: ['mes:work_order:read'],
      action: 'read',
    } as RouteConfigV2<MesWorkOrderPageProps>,
    {
      path: MES_PATHS.quality,
      element: lazyWithRetry(() => import('@/pages/mes/MesQualityPage'), 'MesQualityPage'),
      module: 'mes',
      code: 'mes-quality',
      title: i18n.t('shared.config.k30'),
      titleKey: 'shared.config.k30',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:quality:read'],
      action: 'read',
    } as RouteConfigV2<MesQualityPageProps>,
    {
      path: MES_PATHS.analyticsOee,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesOeeDashboardPage'),
        'MesOeeDashboardPage'
      ),
      module: 'mes',
      code: 'mes-analytics-oee',
      title: i18n.t('shared.config.oee_1'),
      titleKey: 'shared.config.oee_1',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesOeeDashboardPageProps>,
    {
      path: MES_PATHS.analyticsDelivery,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesDeliveryAnalyticsPage'),
        'MesDeliveryAnalyticsPage'
      ),
      module: 'mes',
      code: 'mes-analytics-delivery',
      title: i18n.t('shared.config.k31'),
      titleKey: 'shared.config.k31',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesDeliveryAnalyticsPageProps>,
    {
      path: MES_PATHS.analyticsQualityPareto,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesQualityParetoPage'),
        'MesQualityParetoPage'
      ),
      module: 'mes',
      code: 'mes-analytics-quality-pareto',
      title: i18n.t('shared.config.pareto_32'),
      titleKey: 'shared.config.pareto_32',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesQualityParetoPageProps>,
    {
      path: MES_PATHS.analyticsMtbf,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesEquipmentMtbfPage'),
        'MesEquipmentMtbfPage'
      ),
      module: 'mes',
      code: 'mes-analytics-mtbf',
      title: i18n.t('shared.config.mtbfmttr_33'),
      titleKey: 'shared.config.mtbfmttr_33',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesEquipmentMtbfPageProps>,
    {
      path: MES_PATHS.analyticsEnergy,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesEnergyCostPage'),
        'MesEnergyCostPage'
      ),
      module: 'mes',
      code: 'mes-analytics-energy',
      title: i18n.t('shared.config.k34'),
      titleKey: 'shared.config.k34',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesEnergyCostPageProps>,
    {
      path: MES_PATHS.analyticsCapacity,
      element: lazyWithRetry(
        () => import('@/pages/mes/analytics/MesCapacityUtilizationPage'),
        'MesCapacityUtilizationPage'
      ),
      module: 'mes',
      code: 'mes-analytics-capacity',
      title: i18n.t('shared.config.k35'),
      titleKey: 'shared.config.k35',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['mes:analytics:read'],
      action: 'read',
    } as RouteConfigV2<MesCapacityUtilizationPageProps>,
    {
      path: MES_PATHS.settingQualityTemplate,
      element: lazyWithRetry(
        () => import('@/pages/mes/setting/QualityTemplatePage'),
        'QualityTemplatePage'
      ),
      module: 'mes',
      code: 'mes-quality-template',
      title: i18n.t('shared.config.k36'),
      titleKey: 'shared.config.k36',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['mes:quality_template:read'],
      action: 'read',
    } as RouteConfigV2<QualityTemplatePageProps>,
    {
      path: MES_PATHS.settingBomVersionPolicy,
      element: lazyWithRetry(
        () => import('@/pages/mes/setting/BomVersionPolicyPage'),
        'BomVersionPolicyPage'
      ),
      module: 'mes',
      code: 'mes-bom-version-policy',
      title: i18n.t('shared.config.bom_2'),
      titleKey: 'shared.config.bom_2',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['mes:bom_version_policy:read'],
      action: 'read',
    } as RouteConfigV2<BomVersionPolicyPageProps>,
    {
      path: MES_PATHS.settingApsConfig,
      element: lazyWithRetry(() => import('@/pages/mes/setting/ApsConfigPage'), 'ApsConfigPage'),
      module: 'mes',
      code: 'mes-aps-config',
      title: i18n.t('shared.config.aps_3'),
      titleKey: 'shared.config.aps_3',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['mes:aps_config:read'],
      action: 'read',
    } as RouteConfigV2<ApsConfigPageProps>,
    {
      path: MES_PATHS.settingEquipmentThreshold,
      element: lazyWithRetry(
        () => import('@/pages/mes/setting/EquipmentThresholdPage'),
        'EquipmentThresholdPage'
      ),
      module: 'mes',
      code: 'mes-equipment-threshold',
      title: i18n.t('shared.config.k37'),
      titleKey: 'shared.config.k37',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['mes:equipment_threshold:read'],
      action: 'read',
    } as RouteConfigV2<EquipmentThresholdPageProps>,
  ] as RouteConfigV2<Record<string, unknown>>[],
};

// ---- 导航配置（供导航注册表使用） ----
export const mesNavConfig: ModuleNavConfig = {
  code: 'mes',
  name: i18n.t('shared.config.k38'),
  nameKey: 'shared.config.k38',
  icon: 'Factory',
  path: MES_PATHS.root,
  permission: 'mes:module:read',
  source: 'core',
  suite: 'manufacturing',
  status: 'online',
  order: 8,
  description: i18n.t('shared.config.k39'),
  navItems: [
    {
      code: 'mes-dashboard',
      label: i18n.t('shared.config.k40'),
      labelKey: 'shared.config.k40',
      icon: 'LayoutDashboard',
      path: MES_PATHS.dashboard,
      permission: 'mes:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k41'),
    },
    {
      code: 'mes-production-orders',
      label: i18n.t('shared.config.k42'),
      labelKey: 'shared.config.k42',
      icon: 'ClipboardList',
      path: MES_PATHS.productionOrders,
      permission: 'mes:production_order:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k43'),
    },
    {
      code: 'mes-work-orders',
      label: i18n.t('shared.config.k44'),
      labelKey: 'shared.config.k44',
      icon: 'FileText',
      path: MES_PATHS.workOrders,
      permission: 'mes:work_order:read',
      order: 2,
      group: 'business',
      description: i18n.t('shared.config.k45'),
    },
    {
      code: 'mes-equipment',
      label: i18n.t('shared.config.k46'),
      labelKey: 'shared.config.k46',
      icon: 'Wrench',
      path: MES_PATHS.equipment,
      permission: 'mes:equipment:read',
      order: 3,
      group: 'master',
      description: i18n.t('shared.config.k47'),
    },
    {
      code: 'mes-work-stations',
      label: i18n.t('shared.config.k48'),
      labelKey: 'shared.config.k48',
      icon: 'MapPin',
      path: MES_PATHS.workStations,
      permission: 'mes:work_station:read',
      order: 4,
      group: 'master',
      description: i18n.t('shared.config.k49'),
    },
    {
      code: 'mes-teams',
      label: i18n.t('shared.config.k50'),
      labelKey: 'shared.config.k50',
      icon: 'Users',
      path: MES_PATHS.teams,
      permission: 'mes:team:read',
      order: 5,
      group: 'master',
      description: i18n.t('shared.config.k51'),
    },
    {
      code: 'mes-material-requirement',
      label: i18n.t('shared.config.k52'),
      labelKey: 'shared.config.k52',
      icon: 'Package',
      path: MES_PATHS.materialRequirement,
      permission: 'mes:material:read',
      order: 6,
      group: 'business',
      description: i18n.t('shared.config.k53'),
    },
    {
      code: 'mes-process-routes',
      label: i18n.t('shared.config.k54'),
      labelKey: 'shared.config.k54',
      icon: 'Route',
      path: MES_PATHS.processRoutes,
      permission: 'mes:process_route:read',
      order: 1,
      group: 'process',
      description: i18n.t('shared.config.k55'),
    },
    {
      code: 'mes-process-flow',
      label: i18n.t('shared.config.k56'),
      labelKey: 'shared.config.k56',
      icon: 'GitBranch',
      path: MES_PATHS.processFlow,
      permission: 'mes:process_flow:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k57'),
    },
    {
      code: 'mes-production-process',
      label: i18n.t('shared.config.k58'),
      labelKey: 'shared.config.k58',
      icon: 'Activity',
      path: MES_PATHS.productionProcess,
      permission: 'mes:production_process:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k59'),
    },
    {
      code: 'mes-production-schedule',
      label: i18n.t('shared.config.k60'),
      labelKey: 'shared.config.k60',
      icon: 'Calendar',
      path: MES_PATHS.productionSchedule,
      permission: 'mes:production_schedule:read',
      order: 4,
      group: 'process',
      description: i18n.t('shared.config.k61'),
    },
    {
      code: 'mes-wip',
      label: i18n.t('shared.config.k62'),
      labelKey: 'shared.config.k62',
      icon: 'Box',
      path: MES_PATHS.wip,
      permission: 'mes:wip:read',
      order: 5,
      group: 'process',
      description: i18n.t('shared.config.k63'),
    },
    {
      code: 'mes-quality-inspection',
      label: i18n.t('shared.config.k64'),
      labelKey: 'shared.config.k64',
      icon: 'CheckCircle',
      path: MES_PATHS.qualityInspection,
      permission: 'mes:quality:read',
      order: 7,
      group: 'process',
      description: i18n.t('shared.config.k65'),
    },
    {
      code: 'mes-traceability',
      label: i18n.t('shared.config.k66'),
      labelKey: 'shared.config.k66',
      icon: 'Search',
      path: MES_PATHS.traceability,
      permission: 'mes:traceability:read',
      order: 8,
      group: 'process',
      description: i18n.t('shared.config.k67'),
    },
    {
      code: 'mes-production-kanban',
      label: i18n.t('shared.config.k68'),
      labelKey: 'shared.config.k68',
      icon: 'LayoutGrid',
      path: MES_PATHS.productionKanban,
      permission: 'mes:kanban:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.k69'),
    },
    {
      code: 'mes-production-record',
      label: i18n.t('shared.config.k70'),
      labelKey: 'shared.config.k70',
      icon: 'ScrollText',
      path: MES_PATHS.productionRecord,
      permission: 'mes:production_record:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('shared.config.k71'),
    },
    {
      code: 'mes-work-report',
      label: i18n.t('shared.config.k72'),
      labelKey: 'shared.config.k72',
      icon: 'FileCheck',
      path: MES_PATHS.workReport,
      permission: 'mes:work_report:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('shared.config.k73'),
    },
    {
      code: 'mes-equipment-oee',
      label: i18n.t('shared.config.oee_74'),
      labelKey: 'shared.config.oee_74',
      icon: 'Gauge',
      path: MES_PATHS.equipmentOee,
      permission: 'mes:oee:read',
      order: 4,
      group: 'analytics',
      description: i18n.t('shared.config.k75'),
    },
    {
      code: 'mes-production-dashboard',
      label: i18n.t('shared.config.k76'),
      labelKey: 'shared.config.k76',
      icon: 'BarChart3',
      path: MES_PATHS.productionDashboard,
      permission: 'mes:production_dashboard:read',
      order: 5,
      group: 'analytics',
      description: i18n.t('shared.config.k77'),
    },
    {
      code: 'mes-aps-scheduling',
      label: i18n.t('shared.config.k78'),
      labelKey: 'shared.config.k78',
      icon: 'Brain',
      path: MES_PATHS.apsScheduling,
      permission: 'mes:production_schedule:read',
      order: 6,
      group: 'process',
      description: i18n.t('shared.config.k79'),
    },
    {
      code: 'mes-production-cost',
      label: i18n.t('shared.config.k80'),
      labelKey: 'shared.config.k80',
      icon: 'DollarSign',
      path: MES_PATHS.productionCost,
      permission: 'mes:production_cost:read',
      order: 6,
      group: 'analytics',
      description: i18n.t('shared.config.k81'),
    },
    {
      code: 'mes-energy-management',
      label: i18n.t('shared.config.k82'),
      labelKey: 'shared.config.k82',
      icon: 'Zap',
      path: MES_PATHS.energyManagement,
      permission: 'mes:energy_management:read',
      order: 7,
      group: 'analytics',
      description: i18n.t('shared.config.k83'),
    },
    {
      code: 'mes-anomaly-detection',
      label: i18n.t('shared.config.k84'),
      labelKey: 'shared.config.k84',
      icon: 'AlertTriangle',
      path: MES_PATHS.anomalyDetection,
      permission: 'mes:anomaly_detection:read',
      order: 8,
      group: 'analytics',
      description: i18n.t('shared.config.k85'),
    },
    {
      code: 'mes-work-order',
      label: i18n.t('shared.config.k86'),
      labelKey: 'shared.config.k86',
      icon: 'ClipboardList',
      path: MES_PATHS.workOrder,
      permission: 'mes:work_order:read',
      order: 7,
      group: 'business',
      description: i18n.t('shared.config.k87'),
    },
    {
      code: 'mes-material-bom',
      label: i18n.t('shared.config.mes_r4_1'),
      labelKey: 'shared.config.mes_r4_1',
      icon: 'GitBranch',
      path: MES_PATHS.materialBom,
      permission: 'mes:material:read',
      order: 8,
      group: 'business',
      description: i18n.t('shared.config.mes_r4_2'),
    },
    {
      code: 'mes-material-issue',
      label: i18n.t('shared.config.mes_r4_3'),
      labelKey: 'shared.config.mes_r4_3',
      icon: 'ArrowUpFromLine',
      path: MES_PATHS.materialIssue,
      permission: 'mes:material:update',
      order: 9,
      group: 'business',
      description: i18n.t('shared.config.mes_r4_4'),
    },
    {
      code: 'mes-material-return',
      label: i18n.t('shared.config.mes_r4_5'),
      labelKey: 'shared.config.mes_r4_5',
      icon: 'ArrowDownToLine',
      path: MES_PATHS.materialReturn,
      permission: 'mes:material:update',
      order: 10,
      group: 'business',
      description: i18n.t('shared.config.mes_r4_6'),
    },
    {
      code: 'mes-quality',
      label: i18n.t('shared.config.k88'),
      labelKey: 'shared.config.k88',
      icon: 'CheckCircle',
      path: MES_PATHS.quality,
      permission: 'mes:quality:read',
      order: 9,
      group: 'process',
      description: i18n.t('shared.config.k89'),
    },
    {
      code: 'mes-analytics-oee',
      label: i18n.t('shared.config.oee_4'),
      labelKey: 'shared.config.oee_4',
      icon: 'Gauge',
      path: MES_PATHS.analyticsOee,
      permission: 'mes:analytics:read',
      order: 9,
      group: 'analytics',
      description: i18n.t('shared.config.oee_5'),
    },
    {
      code: 'mes-analytics-delivery',
      label: i18n.t('shared.config.k90'),
      labelKey: 'shared.config.k90',
      icon: 'Truck',
      path: MES_PATHS.analyticsDelivery,
      permission: 'mes:analytics:read',
      order: 10,
      group: 'analytics',
      description: i18n.t('shared.config.k91'),
    },
    {
      code: 'mes-analytics-quality-pareto',
      label: i18n.t('shared.config.pareto_92'),
      labelKey: 'shared.config.pareto_92',
      icon: 'BarChart3',
      path: MES_PATHS.analyticsQualityPareto,
      permission: 'mes:analytics:read',
      order: 11,
      group: 'analytics',
      description: i18n.t('shared.config.k93'),
    },
    {
      code: 'mes-analytics-mtbf',
      label: i18n.t('shared.config.mtbfmttr_33'),
      labelKey: 'shared.config.mtbfmttr_33',
      icon: 'Wrench',
      path: MES_PATHS.analyticsMtbf,
      permission: 'mes:analytics:read',
      order: 12,
      group: 'analytics',
      description: i18n.t('shared.config.k94'),
    },
    {
      code: 'mes-analytics-energy',
      label: i18n.t('shared.config.k95'),
      labelKey: 'shared.config.k95',
      icon: 'Zap',
      path: MES_PATHS.analyticsEnergy,
      permission: 'mes:analytics:read',
      order: 13,
      group: 'analytics',
      description: i18n.t('shared.config.k96'),
    },
    {
      code: 'mes-analytics-capacity',
      label: i18n.t('shared.config.k97'),
      labelKey: 'shared.config.k97',
      icon: 'TrendingUp',
      path: MES_PATHS.analyticsCapacity,
      permission: 'mes:analytics:read',
      order: 14,
      group: 'analytics',
      description: i18n.t('shared.config.k98'),
    },
    {
      code: 'mes-quality-template',
      label: i18n.t('shared.config.k99'),
      labelKey: 'shared.config.k99',
      icon: 'ClipboardCheck',
      path: MES_PATHS.settingQualityTemplate,
      permission: 'mes:quality_template:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k100'),
    },
    {
      code: 'mes-bom-version-policy',
      label: i18n.t('shared.config.k101'),
      labelKey: 'shared.config.k101',
      icon: 'GitBranch',
      path: MES_PATHS.settingBomVersionPolicy,
      permission: 'mes:bom_version_policy:read',
      order: 2,
      group: 'setting',
      description: i18n.t('shared.config.bom_6'),
    },
    {
      code: 'mes-aps-config',
      label: i18n.t('shared.config.aps_7'),
      labelKey: 'shared.config.aps_7',
      icon: 'Settings2',
      path: MES_PATHS.settingApsConfig,
      permission: 'mes:aps_config:read',
      order: 3,
      group: 'setting',
      description: i18n.t('shared.config.aps_8'),
    },
    {
      code: 'mes-equipment-threshold',
      label: i18n.t('shared.config.k102'),
      labelKey: 'shared.config.k102',
      icon: 'Gauge',
      path: MES_PATHS.settingEquipmentThreshold,
      permission: 'mes:equipment_threshold:read',
      order: 4,
      group: 'setting',
      description: i18n.t('shared.config.k103'),
    },
  ],
};
