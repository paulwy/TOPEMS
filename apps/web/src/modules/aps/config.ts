import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 APS_PATHS.xxx，而非硬编码字符串

export const APS_PATHS = {
  root: '/aps',
  dashboard: '/aps/dashboard',
  productionPlans: '/aps/production-plans',
  productionPlanDetail: '/aps/production-plans/:id',
  schedules: '/aps/schedules',
  scheduleDetail: '/aps/schedules/:id',
  capacities: '/aps/capacities',
  capacityDetail: '/aps/capacities/:id',
  materialPlans: '/aps/material-plans',
  materialPlanDetail: '/aps/material-plans/:id',
  forecasts: '/aps/forecasts',
  forecastDetail: '/aps/forecasts/:id',
  planComparison: '/aps/plan-comparison/:id',
  analytics: {
    planAdherence: '/aps/analytics/plan-adherence',
    scheduleGantt: '/aps/analytics/schedule-gantt',
    capacityUtilization: '/aps/analytics/capacity-utilization',
    materialShortage: '/aps/analytics/material-shortage',
    forecastAccuracy: '/aps/analytics/forecast-accuracy',
    oeeDashboard: '/aps/analytics/oee-dashboard',
  },
} as const;
interface ApsDashboardPageProps {}

interface ProductionPlanPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ScheduleManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface CapacityManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface MaterialPlanPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ForecastManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface ProductionPlanDetailPageProps {
  id?: string;
  entityType?: string;
}

interface ScheduleDetailPageProps {
  id?: string;
  entityType?: string;
}

interface CapacityDetailPageProps {
  id?: string;
  entityType?: string;
}

interface MaterialPlanDetailPageProps {
  id?: string;
  entityType?: string;
}

interface ForecastDetailPageProps {
  id?: string;
  entityType?: string;
}

interface PlanComparisonDetailPageProps {
  id?: string;
  entityType?: string;
}

interface PlanAdherencePageProps {}

interface ScheduleGanttPageProps {}

interface CapacityUtilizationPageProps {}

interface MaterialShortagePageProps {}

interface ForecastAccuracyPageProps {}

interface OeeDashboardPageProps {}

const apsDashboardRoute: RouteConfigV2<ApsDashboardPageProps> = {
  path: APS_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/aps/ApsDashboardPage'), 'ApsDashboardPage'),
  module: 'aps',
  code: 'aps-dashboard',
  title: i18n.t('aps.nav.aps-dashboard'),
  titleKey: 'aps.nav.aps-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['aps:dashboard:read'],
  action: 'read',
};

const productionPlanRoute: RouteConfigV2<ProductionPlanPageProps> = {
  path: APS_PATHS.productionPlans,
  element: lazyWithRetry(() => import('@/pages/aps/ProductionPlanPage'), 'ProductionPlanPage'),
  module: 'aps',
  code: 'aps-production-plans',
  title: i18n.t('aps.nav.aps-production-plans'),
  titleKey: 'aps.nav.aps-production-plans',
  template: 'list',
  group: 'business',
  requiredPermissions: ['aps:production_plan:read'],
  action: 'read',
};

const scheduleManagementRoute: RouteConfigV2<ScheduleManagementPageProps> = {
  path: APS_PATHS.schedules,
  element: lazyWithRetry(
    () => import('@/pages/aps/ScheduleManagementPage'),
    'ScheduleManagementPage'
  ),
  module: 'aps',
  code: 'aps-schedules',
  title: i18n.t('aps.nav.aps-schedules'),
  titleKey: 'aps.nav.aps-schedules',
  template: 'list',
  group: 'business',
  requiredPermissions: ['aps:schedule:read'],
  action: 'read',
};

const capacityManagementRoute: RouteConfigV2<CapacityManagementPageProps> = {
  path: APS_PATHS.capacities,
  element: lazyWithRetry(
    () => import('@/pages/aps/CapacityManagementPage'),
    'CapacityManagementPage'
  ),
  module: 'aps',
  code: 'aps-capacities',
  title: i18n.t('aps.nav.aps-capacities'),
  titleKey: 'aps.nav.aps-capacities',
  template: 'list',
  group: 'business',
  requiredPermissions: ['aps:capacity:read'],
  action: 'read',
};

const materialPlanRoute: RouteConfigV2<MaterialPlanPageProps> = {
  path: APS_PATHS.materialPlans,
  element: lazyWithRetry(() => import('@/pages/aps/MaterialPlanPage'), 'MaterialPlanPage'),
  module: 'aps',
  code: 'aps-material-plans',
  title: i18n.t('aps.nav.aps-material-plans'),
  titleKey: 'aps.nav.aps-material-plans',
  template: 'list',
  group: 'business',
  requiredPermissions: ['aps:material_plan:read'],
  action: 'read',
};

const forecastManagementRoute: RouteConfigV2<ForecastManagementPageProps> = {
  path: APS_PATHS.forecasts,
  element: lazyWithRetry(
    () => import('@/pages/aps/ForecastManagementPage'),
    'ForecastManagementPage'
  ),
  module: 'aps',
  code: 'aps-forecasts',
  title: i18n.t('aps.nav.aps-forecasts'),
  titleKey: 'aps.nav.aps-forecasts',
  template: 'list',
  group: 'analytics',
  requiredPermissions: ['aps:forecast:read'],
  action: 'read',
};

const productionPlanDetailRoute: RouteConfigV2<ProductionPlanDetailPageProps> = {
  path: APS_PATHS.productionPlanDetail,
  element: lazyWithRetry(
    () => import('@/pages/aps/ProductionPlanDetailPage'),
    'ProductionPlanDetailPage'
  ),
  module: 'aps',
  code: 'aps-production-plan-detail',
  title: i18n.t('aps.nav.aps-production-plan-detail'),
  titleKey: 'aps.nav.aps-production-plan-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['aps:production_plan:read'],
  action: 'read',
};

const scheduleDetailRoute: RouteConfigV2<ScheduleDetailPageProps> = {
  path: APS_PATHS.scheduleDetail,
  element: lazyWithRetry(() => import('@/pages/aps/ScheduleDetailPage'), 'ScheduleDetailPage'),
  module: 'aps',
  code: 'aps-schedule-detail',
  title: i18n.t('aps.nav.aps-schedule-detail'),
  titleKey: 'aps.nav.aps-schedule-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['aps:schedule:read'],
  action: 'read',
};

const capacityDetailRoute: RouteConfigV2<CapacityDetailPageProps> = {
  path: APS_PATHS.capacityDetail,
  element: lazyWithRetry(() => import('@/pages/aps/CapacityDetailPage'), 'CapacityDetailPage'),
  module: 'aps',
  code: 'aps-capacity-detail',
  title: i18n.t('aps.nav.aps-capacity-detail'),
  titleKey: 'aps.nav.aps-capacity-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['aps:capacity:read'],
  action: 'read',
};

const materialPlanDetailRoute: RouteConfigV2<MaterialPlanDetailPageProps> = {
  path: APS_PATHS.materialPlanDetail,
  element: lazyWithRetry(
    () => import('@/pages/aps/MaterialPlanDetailPage'),
    'MaterialPlanDetailPage'
  ),
  module: 'aps',
  code: 'aps-material-plan-detail',
  title: i18n.t('aps.nav.aps-material-plan-detail'),
  titleKey: 'aps.nav.aps-material-plan-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['aps:material_plan:read'],
  action: 'read',
};

const forecastDetailRoute: RouteConfigV2<ForecastDetailPageProps> = {
  path: APS_PATHS.forecastDetail,
  element: lazyWithRetry(() => import('@/pages/aps/ForecastDetailPage'), 'ForecastDetailPage'),
  module: 'aps',
  code: 'aps-forecast-detail',
  title: i18n.t('aps.nav.aps-forecast-detail'),
  titleKey: 'aps.nav.aps-forecast-detail',
  template: 'detail',
  group: 'analytics',
  requiredPermissions: ['aps:forecast:read'],
  action: 'read',
};

const planComparisonDetailRoute: RouteConfigV2<PlanComparisonDetailPageProps> = {
  path: APS_PATHS.planComparison,
  element: lazyWithRetry(
    () => import('@/pages/aps/PlanComparisonDetailPage'),
    'PlanComparisonDetailPage'
  ),
  module: 'aps',
  code: 'aps-plan-comparison',
  title: i18n.t('aps.nav.aps-plan-comparison'),
  titleKey: 'aps.nav.aps-plan-comparison',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['aps:production_plan:read'],
  action: 'read',
};

const planAdherenceRoute: RouteConfigV2<PlanAdherencePageProps> = {
  path: APS_PATHS.analytics.planAdherence,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/PlanAdherencePage'),
    'PlanAdherencePage'
  ),
  module: 'aps',
  code: 'aps-analytics-plan-adherence',
  title: i18n.t('aps.nav.aps-analytics-plan-adherence'),
  titleKey: 'aps.nav.aps-analytics-plan-adherence',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:dashboard:read'],
  action: 'read',
};

const scheduleGanttRoute: RouteConfigV2<ScheduleGanttPageProps> = {
  path: APS_PATHS.analytics.scheduleGantt,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/ScheduleGanttPage'),
    'ScheduleGanttPage'
  ),
  module: 'aps',
  code: 'aps-analytics-schedule-gantt',
  title: i18n.t('aps.nav.aps-analytics-schedule-gantt'),
  titleKey: 'aps.nav.aps-analytics-schedule-gantt',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:schedule:read'],
  action: 'read',
};

const capacityUtilizationRoute: RouteConfigV2<CapacityUtilizationPageProps> = {
  path: APS_PATHS.analytics.capacityUtilization,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/CapacityUtilizationPage'),
    'CapacityUtilizationPage'
  ),
  module: 'aps',
  code: 'aps-analytics-capacity-utilization',
  title: i18n.t('aps.nav.aps-analytics-capacity-utilization'),
  titleKey: 'aps.nav.aps-analytics-capacity-utilization',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:capacity:read'],
  action: 'read',
};

const materialShortageRoute: RouteConfigV2<MaterialShortagePageProps> = {
  path: APS_PATHS.analytics.materialShortage,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/MaterialShortagePage'),
    'MaterialShortagePage'
  ),
  module: 'aps',
  code: 'aps-analytics-material-shortage',
  title: i18n.t('aps.nav.aps-analytics-material-shortage'),
  titleKey: 'aps.nav.aps-analytics-material-shortage',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:material_plan:read'],
  action: 'read',
};

const forecastAccuracyRoute: RouteConfigV2<ForecastAccuracyPageProps> = {
  path: APS_PATHS.analytics.forecastAccuracy,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/ForecastAccuracyPage'),
    'ForecastAccuracyPage'
  ),
  module: 'aps',
  code: 'aps-analytics-forecast-accuracy',
  title: i18n.t('aps.nav.aps-analytics-forecast-accuracy'),
  titleKey: 'aps.nav.aps-analytics-forecast-accuracy',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:forecast:read'],
  action: 'read',
};

const oeeDashboardRoute: RouteConfigV2<OeeDashboardPageProps> = {
  path: APS_PATHS.analytics.oeeDashboard,
  element: lazyWithRetry(
    () => import('@/pages/aps/analytics/OeeDashboardPage'),
    'OeeDashboardPage'
  ),
  module: 'aps',
  code: 'aps-analytics-oee-dashboard',
  title: i18n.t('aps.nav.aps-analytics-oee-dashboard'),
  titleKey: 'aps.nav.aps-analytics-oee-dashboard',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['aps:dashboard:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const apsModuleConfig: RouteModuleConfig = {
  code: 'aps',
  name: i18n.t('shared.config.aps_name'),
  nameKey: 'shared.config.aps_name',
  icon: 'CalendarCheck',
  path: APS_PATHS.root,
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 12,
  description: i18n.t('aps.nav.module_name_desc'),
  permission: 'aps:module:read',
  routes: [
    apsDashboardRoute,
    productionPlanRoute,
    scheduleManagementRoute,
    capacityManagementRoute,
    materialPlanRoute,
    forecastManagementRoute,
    productionPlanDetailRoute,
    scheduleDetailRoute,
    capacityDetailRoute,
    materialPlanDetailRoute,
    forecastDetailRoute,
    planComparisonDetailRoute,
    planAdherenceRoute,
    scheduleGanttRoute,
    capacityUtilizationRoute,
    materialShortageRoute,
    forecastAccuracyRoute,
    oeeDashboardRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const apsNavConfig: ModuleNavConfig = {
  code: 'aps',
  name: i18n.t('aps.nav.module_name'),
  nameKey: 'aps.nav.module_name',
  icon: 'CalendarCheck',
  path: APS_PATHS.root,
  permission: 'aps:module:read',
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 12,
  description: i18n.t('aps.nav.module_name_desc'),
  navItems: [
    {
      code: 'aps-dashboard',
      label: i18n.t('aps.nav.aps-dashboard'),
      labelKey: 'aps.nav.aps-dashboard',
      icon: 'LayoutDashboard',
      path: APS_PATHS.dashboard,
      permission: 'aps:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-dashboard_desc'),
    },
    {
      code: 'aps-production-plans',
      label: i18n.t('aps.nav.aps-production-plans'),
      labelKey: 'aps.nav.aps-production-plans',
      icon: 'ClipboardList',
      path: APS_PATHS.productionPlans,
      permission: 'aps:production_plan:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-production-plans_desc'),
    },
    {
      code: 'aps-schedules',
      label: i18n.t('aps.nav.aps-schedules'),
      labelKey: 'aps.nav.aps-schedules',
      icon: 'CalendarCheck',
      path: APS_PATHS.schedules,
      permission: 'aps:schedule:read',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-schedules_desc'),
    },
    {
      code: 'aps-capacities',
      label: i18n.t('aps.nav.aps-capacities'),
      labelKey: 'aps.nav.aps-capacities',
      icon: 'Gauge',
      path: APS_PATHS.capacities,
      permission: 'aps:capacity:read',
      order: 3,
      group: 'business',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-capacities_desc'),
    },
    {
      code: 'aps-material-plans',
      label: i18n.t('aps.nav.aps-material-plans'),
      labelKey: 'aps.nav.aps-material-plans',
      icon: 'Package',
      path: APS_PATHS.materialPlans,
      permission: 'aps:material_plan:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-material-plans_desc'),
    },
    {
      code: 'aps-forecasts',
      label: i18n.t('aps.nav.aps-forecasts'),
      labelKey: 'aps.nav.aps-forecasts',
      icon: 'TrendingUp',
      path: APS_PATHS.forecasts,
      permission: 'aps:forecast:read',
      order: 5,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('aps.nav.aps-forecasts_desc'),
    },
    {
      code: 'aps-analytics-plan-adherence',
      label: i18n.t('aps.nav.aps-analytics-plan-adherence'),
      labelKey: 'aps.nav.aps-analytics-plan-adherence',
      icon: 'BarChart3',
      path: APS_PATHS.analytics.planAdherence,
      permission: 'aps:dashboard:read',
      order: 10,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-plan-adherence_desc'),
    },
    {
      code: 'aps-analytics-schedule-gantt',
      label: i18n.t('aps.nav.aps-analytics-schedule-gantt'),
      labelKey: 'aps.nav.aps-analytics-schedule-gantt',
      icon: 'GanttChart',
      path: APS_PATHS.analytics.scheduleGantt,
      permission: 'aps:schedule:read',
      order: 11,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-schedule-gantt_desc'),
    },
    {
      code: 'aps-analytics-capacity-utilization',
      label: i18n.t('aps.nav.aps-analytics-capacity-utilization'),
      labelKey: 'aps.nav.aps-analytics-capacity-utilization',
      icon: 'Gauge',
      path: APS_PATHS.analytics.capacityUtilization,
      permission: 'aps:capacity:read',
      order: 12,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-capacity-utilization_desc'),
    },
    {
      code: 'aps-analytics-material-shortage',
      label: i18n.t('aps.nav.aps-analytics-material-shortage'),
      labelKey: 'aps.nav.aps-analytics-material-shortage',
      icon: 'AlertTriangle',
      path: APS_PATHS.analytics.materialShortage,
      permission: 'aps:material_plan:read',
      order: 13,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-material-shortage_desc'),
    },
    {
      code: 'aps-analytics-forecast-accuracy',
      label: i18n.t('aps.nav.aps-analytics-forecast-accuracy'),
      labelKey: 'aps.nav.aps-analytics-forecast-accuracy',
      icon: 'Target',
      path: APS_PATHS.analytics.forecastAccuracy,
      permission: 'aps:forecast:read',
      order: 14,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-forecast-accuracy_desc'),
    },
    {
      code: 'aps-analytics-oee-dashboard',
      label: i18n.t('aps.nav.aps-analytics-oee-dashboard'),
      labelKey: 'aps.nav.aps-analytics-oee-dashboard',
      icon: 'Activity',
      path: APS_PATHS.analytics.oeeDashboard,
      permission: 'aps:dashboard:read',
      order: 15,
      group: 'analytics',
      showInTabs: false,
      description: i18n.t('aps.nav.aps-analytics-oee-dashboard_desc'),
    },
  ],
};
