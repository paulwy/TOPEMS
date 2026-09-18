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
  description: i18n.t('mes.nav.mes-dashboard_desc'),
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
      title: i18n.t('mes.nav.mes-dashboard'),
      titleKey: 'mes.nav.mes-dashboard',
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
      title: i18n.t('mes.nav.mes-production-orders'),
      titleKey: 'mes.nav.mes-production-orders',
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
      title: i18n.t('mes.nav.mes-production-order-detail'),
      titleKey: 'mes.nav.mes-production-order-detail',
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
      title: i18n.t('mes.nav.mes-work-orders'),
      titleKey: 'mes.nav.mes-work-orders',
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
      title: i18n.t('mes.nav.mes-equipment'),
      titleKey: 'mes.nav.mes-equipment',
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
      title: i18n.t('mes.nav.mes-equipment-detail'),
      titleKey: 'mes.nav.mes-equipment-detail',
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
      title: i18n.t('mes.nav.mes-work-stations'),
      titleKey: 'mes.nav.mes-work-stations',
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
      title: i18n.t('mes.nav.mes-teams'),
      titleKey: 'mes.nav.mes-teams',
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
      title: i18n.t('mes.nav.mes-material-requirement'),
      titleKey: 'mes.nav.mes-material-requirement',
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
      title: i18n.t('mes.nav.mes-process-routes'),
      titleKey: 'mes.nav.mes-process-routes',
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
      title: i18n.t('mes.nav.mes-process-flow'),
      titleKey: 'mes.nav.mes-process-flow',
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
      title: i18n.t('mes.nav.mes-production-process'),
      titleKey: 'mes.nav.mes-production-process',
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
      title: i18n.t('mes.nav.mes-production-schedule'),
      titleKey: 'mes.nav.mes-production-schedule',
      template: 'list',
      group: 'process',
      requiredPermissions: ['mes:production_schedule:read'],
      action: 'read',
    } as RouteConfigV2<ProductionSchedulePageProps>,
    {
      path: MES_PATHS.wip,
      element: lazyWithRetry(
        () => import('@/pages/mes/WIPPage') as unknown as Promise<{ default: React.ComponentType }>,
        'WIPPage'
      ),
      module: 'mes',
      code: 'mes-wip',
      title: i18n.t('mes.nav.mes-wip'),
      titleKey: 'mes.nav.mes-wip',
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
      title: i18n.t('mes.nav.mes-quality-inspection'),
      titleKey: 'mes.nav.mes-quality-inspection',
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
      title: i18n.t('mes.nav.mes-traceability'),
      titleKey: 'mes.nav.mes-traceability',
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
      title: i18n.t('mes.nav.mes-production-kanban'),
      titleKey: 'mes.nav.mes-production-kanban',
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
      title: i18n.t('mes.nav.mes-production-record'),
      titleKey: 'mes.nav.mes-production-record',
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
      title: i18n.t('mes.nav.mes-work-report'),
      titleKey: 'mes.nav.mes-work-report',
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
      title: i18n.t('mes.nav.mes-equipment-oee'),
      titleKey: 'mes.nav.mes-equipment-oee',
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
      title: i18n.t('mes.nav.mes-material-bom'),
      titleKey: 'mes.nav.mes-material-bom',
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
      title: i18n.t('mes.nav.mes-material-issue'),
      titleKey: 'mes.nav.mes-material-issue',
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
      title: i18n.t('mes.nav.mes-material-return'),
      titleKey: 'mes.nav.mes-material-return',
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
      title: i18n.t('mes.nav.mes-production-dashboard'),
      titleKey: 'mes.nav.mes-production-dashboard',
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
      title: i18n.t('mes.nav.mes-aps-scheduling'),
      titleKey: 'mes.nav.mes-aps-scheduling',
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
      title: i18n.t('mes.nav.mes-production-cost'),
      titleKey: 'mes.nav.mes-production-cost',
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
      title: i18n.t('mes.nav.mes-energy-management'),
      titleKey: 'mes.nav.mes-energy-management',
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
      title: i18n.t('mes.nav.mes-anomaly-detection'),
      titleKey: 'mes.nav.mes-anomaly-detection',
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
      title: i18n.t('mes.nav.mes-work-order'),
      titleKey: 'mes.nav.mes-work-order',
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
      title: i18n.t('mes.nav.mes-quality'),
      titleKey: 'mes.nav.mes-quality',
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
      title: i18n.t('mes.nav.mes-analytics-oee'),
      titleKey: 'mes.nav.mes-analytics-oee',
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
      title: i18n.t('mes.nav.mes-analytics-delivery'),
      titleKey: 'mes.nav.mes-analytics-delivery',
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
      title: i18n.t('mes.nav.mes-analytics-quality-pareto'),
      titleKey: 'mes.nav.mes-analytics-quality-pareto',
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
      title: i18n.t('mes.nav.mes-analytics-mtbf'),
      titleKey: 'mes.nav.mes-analytics-mtbf',
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
      title: i18n.t('mes.nav.mes-analytics-energy'),
      titleKey: 'mes.nav.mes-analytics-energy',
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
      title: i18n.t('mes.nav.mes-analytics-capacity'),
      titleKey: 'mes.nav.mes-analytics-capacity',
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
      title: i18n.t('mes.nav.mes-quality-template'),
      titleKey: 'mes.nav.mes-quality-template',
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
      title: i18n.t('mes.nav.mes-bom-version-policy'),
      titleKey: 'mes.nav.mes-bom-version-policy',
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
      title: i18n.t('mes.nav.mes-aps-config'),
      titleKey: 'mes.nav.mes-aps-config',
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
      title: i18n.t('mes.nav.mes-equipment-threshold'),
      titleKey: 'mes.nav.mes-equipment-threshold',
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
  name: i18n.t('mes.nav.module_name'),
  nameKey: 'mes.nav.module_name',
  icon: 'Factory',
  path: MES_PATHS.root,
  permission: 'mes:module:read',
  source: 'core',
  suite: 'manufacturing',
  status: 'online',
  order: 8,
  description: i18n.t('mes.nav.mes-dashboard_desc'),
  navItems: [
    {
      code: 'mes-dashboard',
      label: i18n.t('mes.nav.mes-dashboard'),
      labelKey: 'mes.nav.mes-dashboard',
      icon: 'LayoutDashboard',
      path: MES_PATHS.dashboard,
      permission: 'mes:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('mes.nav.mes-production-orders_desc'),
    },
    {
      code: 'mes-production-orders',
      label: i18n.t('mes.nav.mes-production-orders'),
      labelKey: 'mes.nav.mes-production-orders',
      icon: 'ClipboardList',
      path: MES_PATHS.productionOrders,
      permission: 'mes:production_order:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('mes.nav.mes-work-orders_desc'),
    },
    {
      code: 'mes-work-orders',
      label: i18n.t('mes.nav.mes-work-orders'),
      labelKey: 'mes.nav.mes-work-orders',
      icon: 'FileText',
      path: MES_PATHS.workOrders,
      permission: 'mes:work_order:read',
      order: 2,
      group: 'business',
      description: i18n.t('mes.nav.mes-equipment_desc'),
    },
    {
      code: 'mes-equipment',
      label: i18n.t('mes.nav.mes-equipment'),
      labelKey: 'mes.nav.mes-equipment',
      icon: 'Wrench',
      path: MES_PATHS.equipment,
      permission: 'mes:equipment:read',
      order: 3,
      group: 'master',
      description: i18n.t('mes.nav.mes-work-stations_desc'),
    },
    {
      code: 'mes-work-stations',
      label: i18n.t('mes.nav.mes-work-stations'),
      labelKey: 'mes.nav.mes-work-stations',
      icon: 'MapPin',
      path: MES_PATHS.workStations,
      permission: 'mes:work_station:read',
      order: 4,
      group: 'master',
      description: i18n.t('mes.nav.mes-teams_desc'),
    },
    {
      code: 'mes-teams',
      label: i18n.t('mes.nav.mes-teams'),
      labelKey: 'mes.nav.mes-teams',
      icon: 'Users',
      path: MES_PATHS.teams,
      permission: 'mes:team:read',
      order: 5,
      group: 'master',
      description: i18n.t('mes.nav.mes-material-requirement_desc'),
    },
    {
      code: 'mes-material-requirement',
      label: i18n.t('mes.nav.mes-material-requirement'),
      labelKey: 'mes.nav.mes-material-requirement',
      icon: 'Package',
      path: MES_PATHS.materialRequirement,
      permission: 'mes:material:read',
      order: 6,
      group: 'business',
      description: i18n.t('mes.nav.mes-process-routes_desc'),
    },
    {
      code: 'mes-process-routes',
      label: i18n.t('mes.nav.mes-process-routes'),
      labelKey: 'mes.nav.mes-process-routes',
      icon: 'Route',
      path: MES_PATHS.processRoutes,
      permission: 'mes:process_route:read',
      order: 1,
      group: 'process',
      description: i18n.t('mes.nav.mes-process-flow_desc'),
    },
    {
      code: 'mes-process-flow',
      label: i18n.t('mes.nav.mes-process-flow'),
      labelKey: 'mes.nav.mes-process-flow',
      icon: 'GitBranch',
      path: MES_PATHS.processFlow,
      permission: 'mes:process_flow:read',
      order: 2,
      group: 'process',
      description: i18n.t('mes.nav.mes-production-process_desc'),
    },
    {
      code: 'mes-production-process',
      label: i18n.t('mes.nav.mes-production-process'),
      labelKey: 'mes.nav.mes-production-process',
      icon: 'Activity',
      path: MES_PATHS.productionProcess,
      permission: 'mes:production_process:read',
      order: 3,
      group: 'process',
      description: i18n.t('mes.nav.mes-production-schedule_desc'),
    },
    {
      code: 'mes-production-schedule',
      label: i18n.t('mes.nav.mes-production-schedule'),
      labelKey: 'mes.nav.mes-production-schedule',
      icon: 'Calendar',
      path: MES_PATHS.productionSchedule,
      permission: 'mes:production_schedule:read',
      order: 4,
      group: 'process',
      description: i18n.t('mes.nav.mes-wip_desc'),
    },
    {
      code: 'mes-wip',
      label: i18n.t('mes.nav.mes-wip'),
      labelKey: 'mes.nav.mes-wip',
      icon: 'Box',
      path: MES_PATHS.wip,
      permission: 'mes:wip:read',
      order: 5,
      group: 'process',
      description: i18n.t('mes.nav.mes-quality-inspection_desc'),
    },
    {
      code: 'mes-quality-inspection',
      label: i18n.t('mes.nav.mes-quality-inspection'),
      labelKey: 'mes.nav.mes-quality-inspection',
      icon: 'CheckCircle',
      path: MES_PATHS.qualityInspection,
      permission: 'mes:quality:read',
      order: 7,
      group: 'process',
      description: i18n.t('mes.nav.mes-traceability_desc'),
    },
    {
      code: 'mes-traceability',
      label: i18n.t('mes.nav.mes-traceability'),
      labelKey: 'mes.nav.mes-traceability',
      icon: 'Search',
      path: MES_PATHS.traceability,
      permission: 'mes:traceability:read',
      order: 8,
      group: 'process',
      description: i18n.t('mes.nav.mes-production-kanban_desc'),
    },
    {
      code: 'mes-production-kanban',
      label: i18n.t('mes.nav.mes-production-kanban'),
      labelKey: 'mes.nav.mes-production-kanban',
      icon: 'LayoutGrid',
      path: MES_PATHS.productionKanban,
      permission: 'mes:kanban:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('mes.nav.mes-production-record_desc'),
    },
    {
      code: 'mes-production-record',
      label: i18n.t('mes.nav.mes-production-record'),
      labelKey: 'mes.nav.mes-production-record',
      icon: 'ScrollText',
      path: MES_PATHS.productionRecord,
      permission: 'mes:production_record:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-work-report_desc'),
    },
    {
      code: 'mes-work-report',
      label: i18n.t('mes.nav.mes-work-report'),
      labelKey: 'mes.nav.mes-work-report',
      icon: 'FileCheck',
      path: MES_PATHS.workReport,
      permission: 'mes:work_report:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-equipment-oee_desc'),
    },
    {
      code: 'mes-equipment-oee',
      label: i18n.t('mes.nav.mes-equipment-oee'),
      labelKey: 'mes.nav.mes-equipment-oee',
      icon: 'Gauge',
      path: MES_PATHS.equipmentOee,
      permission: 'mes:oee:read',
      order: 4,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-production-dashboard_desc'),
    },
    {
      code: 'mes-production-dashboard',
      label: i18n.t('mes.nav.mes-production-dashboard'),
      labelKey: 'mes.nav.mes-production-dashboard',
      icon: 'BarChart3',
      path: MES_PATHS.productionDashboard,
      permission: 'mes:production_dashboard:read',
      order: 5,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-aps-scheduling_desc'),
    },
    {
      code: 'mes-aps-scheduling',
      label: i18n.t('mes.nav.mes-aps-scheduling'),
      labelKey: 'mes.nav.mes-aps-scheduling',
      icon: 'Brain',
      path: MES_PATHS.apsScheduling,
      permission: 'mes:production_schedule:read',
      order: 6,
      group: 'process',
      description: i18n.t('mes.nav.mes-production-cost_desc'),
    },
    {
      code: 'mes-production-cost',
      label: i18n.t('mes.nav.mes-production-cost'),
      labelKey: 'mes.nav.mes-production-cost',
      icon: 'DollarSign',
      path: MES_PATHS.productionCost,
      permission: 'mes:production_cost:read',
      order: 6,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-energy-management_desc'),
    },
    {
      code: 'mes-energy-management',
      label: i18n.t('mes.nav.mes-energy-management'),
      labelKey: 'mes.nav.mes-energy-management',
      icon: 'Zap',
      path: MES_PATHS.energyManagement,
      permission: 'mes:energy_management:read',
      order: 7,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-anomaly-detection_desc'),
    },
    {
      code: 'mes-anomaly-detection',
      label: i18n.t('mes.nav.mes-anomaly-detection'),
      labelKey: 'mes.nav.mes-anomaly-detection',
      icon: 'AlertTriangle',
      path: MES_PATHS.anomalyDetection,
      permission: 'mes:anomaly_detection:read',
      order: 8,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-work-order_desc'),
    },
    {
      code: 'mes-work-order',
      label: i18n.t('mes.nav.mes-work-order'),
      labelKey: 'mes.nav.mes-work-order',
      icon: 'ClipboardList',
      path: MES_PATHS.workOrder,
      permission: 'mes:work_order:read',
      order: 7,
      group: 'business',
      description: i18n.t('mes.nav.mes-material-bom_desc'),
    },
    {
      code: 'mes-material-bom',
      label: i18n.t('mes.nav.mes-material-bom'),
      labelKey: 'mes.nav.mes-material-bom',
      icon: 'GitBranch',
      path: MES_PATHS.materialBom,
      permission: 'mes:material:read',
      order: 8,
      group: 'business',
      description: i18n.t('mes.nav.mes-material-issue_desc'),
    },
    {
      code: 'mes-material-issue',
      label: i18n.t('mes.nav.mes-material-issue'),
      labelKey: 'mes.nav.mes-material-issue',
      icon: 'ArrowUpFromLine',
      path: MES_PATHS.materialIssue,
      permission: 'mes:material:update',
      order: 9,
      group: 'business',
      description: i18n.t('mes.nav.mes-material-return_desc'),
    },
    {
      code: 'mes-material-return',
      label: i18n.t('mes.nav.mes-material-return'),
      labelKey: 'mes.nav.mes-material-return',
      icon: 'ArrowDownToLine',
      path: MES_PATHS.materialReturn,
      permission: 'mes:material:update',
      order: 10,
      group: 'business',
      description: i18n.t('mes.nav.mes-quality_desc'),
    },
    {
      code: 'mes-quality',
      label: i18n.t('mes.nav.mes-quality'),
      labelKey: 'mes.nav.mes-quality',
      icon: 'CheckCircle',
      path: MES_PATHS.quality,
      permission: 'mes:quality:read',
      order: 9,
      group: 'process',
      description: i18n.t('mes.nav.mes-analytics-oee_desc'),
    },
    {
      code: 'mes-analytics-oee',
      label: i18n.t('mes.nav.mes-analytics-oee'),
      labelKey: 'mes.nav.mes-analytics-oee',
      icon: 'Gauge',
      path: MES_PATHS.analyticsOee,
      permission: 'mes:analytics:read',
      order: 9,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-analytics-delivery_desc'),
    },
    {
      code: 'mes-analytics-delivery',
      label: i18n.t('mes.nav.mes-analytics-delivery'),
      labelKey: 'mes.nav.mes-analytics-delivery',
      icon: 'Truck',
      path: MES_PATHS.analyticsDelivery,
      permission: 'mes:analytics:read',
      order: 10,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-analytics-quality-pareto_desc'),
    },
    {
      code: 'mes-analytics-quality-pareto',
      label: i18n.t('mes.nav.mes-analytics-quality-pareto'),
      labelKey: 'mes.nav.mes-analytics-quality-pareto',
      icon: 'BarChart3',
      path: MES_PATHS.analyticsQualityPareto,
      permission: 'mes:analytics:read',
      order: 11,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-analytics-mtbf_desc'),
    },
    {
      code: 'mes-analytics-mtbf',
      label: i18n.t('mes.nav.mes-analytics-mtbf'),
      labelKey: 'mes.nav.mes-analytics-mtbf',
      icon: 'Wrench',
      path: MES_PATHS.analyticsMtbf,
      permission: 'mes:analytics:read',
      order: 12,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-analytics-energy_desc'),
    },
    {
      code: 'mes-analytics-energy',
      label: i18n.t('mes.nav.mes-analytics-energy'),
      labelKey: 'mes.nav.mes-analytics-energy',
      icon: 'Zap',
      path: MES_PATHS.analyticsEnergy,
      permission: 'mes:analytics:read',
      order: 13,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-analytics-capacity_desc'),
    },
    {
      code: 'mes-analytics-capacity',
      label: i18n.t('mes.nav.mes-analytics-capacity'),
      labelKey: 'mes.nav.mes-analytics-capacity',
      icon: 'TrendingUp',
      path: MES_PATHS.analyticsCapacity,
      permission: 'mes:analytics:read',
      order: 14,
      group: 'analytics',
      description: i18n.t('mes.nav.mes-quality-template_desc'),
    },
    {
      code: 'mes-quality-template',
      label: i18n.t('mes.nav.mes-quality-template'),
      labelKey: 'mes.nav.mes-quality-template',
      icon: 'ClipboardCheck',
      path: MES_PATHS.settingQualityTemplate,
      permission: 'mes:quality_template:read',
      order: 1,
      group: 'setting',
      description: i18n.t('mes.nav.mes-bom-version-policy_desc'),
    },
    {
      code: 'mes-bom-version-policy',
      label: i18n.t('mes.nav.mes-bom-version-policy'),
      labelKey: 'mes.nav.mes-bom-version-policy',
      icon: 'GitBranch',
      path: MES_PATHS.settingBomVersionPolicy,
      permission: 'mes:bom_version_policy:read',
      order: 2,
      group: 'setting',
      description: i18n.t('mes.nav.mes-aps-config_desc'),
    },
    {
      code: 'mes-aps-config',
      label: i18n.t('mes.nav.mes-aps-config'),
      labelKey: 'mes.nav.mes-aps-config',
      icon: 'Settings2',
      path: MES_PATHS.settingApsConfig,
      permission: 'mes:aps_config:read',
      order: 3,
      group: 'setting',
      description: i18n.t('mes.nav.mes-equipment-threshold_desc'),
    },
    {
      code: 'mes-equipment-threshold',
      label: i18n.t('mes.nav.mes-equipment-threshold'),
      labelKey: 'mes.nav.mes-equipment-threshold',
      icon: 'Gauge',
      path: MES_PATHS.settingEquipmentThreshold,
      permission: 'mes:equipment_threshold:read',
      order: 4,
      group: 'setting',
      description: i18n.t('mes.nav.mes-equipment-threshold_desc'),
    },
  ],
};
