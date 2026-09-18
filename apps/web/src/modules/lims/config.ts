import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 LIMS_PATHS.xxx，而非硬编码字符串
/** LimsSamplePage 路由 Props · 模板=list */
interface LimsSamplePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsSampleDetailPage 路由 Props · 模板=detail */
interface LimsSampleDetailPageProps {
  /** 主实体 ID（如订单号、设备编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** SampleReceivePage 路由 Props · 模板=form */
interface SampleReceivePageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}

/** LimsTaskPage 路由 Props · 模板=list */
interface LimsTaskPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsTaskDetailPage 路由 Props · 模板=detail */
interface LimsTaskDetailPageProps {
  /** 主实体 ID（如订单号、设备编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** InspectionTaskPage 路由 Props · 模板=list */
interface InspectionTaskPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsProcessPage 路由 Props · 模板=list */
interface LimsProcessPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsInstrumentPage 路由 Props · 模板=list */
interface LimsInstrumentPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsInstrumentDetailPage 路由 Props · 模板=detail */
interface LimsInstrumentDetailPageProps {
  /** 主实体 ID（如订单号、设备编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** LimsInstrumentDataPage 路由 Props · 模板=detail */
interface LimsInstrumentDataPageProps {
  /** 主实体 ID（如订单号、设备编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** LimsInstrumentMaintenancePage 路由 Props · 模板=form */
interface LimsInstrumentMaintenancePageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}

/** ReagentPage 路由 Props · 模板=list */
interface ReagentPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsTestMethodPage 路由 Props · 模板=list */
interface LimsTestMethodPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** BarcodePage 路由 Props · 模板=list */
interface BarcodePageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsUncertaintyPage 路由 Props · 模板=stats */
interface LimsUncertaintyPageProps {
  /** 统计面板展示的指标列表 */
  metrics?: string[];
  /** 统计起止时间 ISO 字符串 */
  timeRange?: [string, string];
}

/** InspectionResultPage 路由 Props · 模板=detail */
interface InspectionResultPageProps {
  /** 主实体 ID（如订单号、设备编码） */
  id?: string;
  /** 实体类型标记（用于 detail 模板多态渲染） */
  entityType?: string;
}

/** LimsProficiencyTestingPage 路由 Props · 模板=list */
interface LimsProficiencyTestingPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** LimsDashboardPage 路由 Props · 模板=dashboard */
interface LimsDashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}
export const LIMS_PATHS = {
  root: '/lims',
  sample: '/lims/sample',
  sampleDetail: '/lims/sample-detail',
  sampleReceive: '/lims/sample-receive',
  task: '/lims/task',
  taskDetail: '/lims/task-detail',
  inspectionTask: '/lims/inspection-task',
  process: '/lims/process',
  instrument: '/lims/instrument',
  instrumentDetail: '/lims/instrument-detail',
  instrumentData: '/lims/instrument-data',
  instrumentMaintenance: '/lims/instrument-maintenance',
  reagent: '/lims/reagent',
  testMethod: '/lims/test-method',
  barcode: '/lims/barcode',
  uncertainty: '/lims/uncertainty',
  inspectionResult: '/lims/inspection-result',
  proficiencyTesting: '/lims/proficiency-testing',
  dashboard: '/lims/dashboard',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const limsModuleConfig: RouteModuleConfig = {
  code: 'lims',
  name: i18n.t('shared.config.lims_name'),
  nameKey: 'shared.config.lims_name',
  icon: 'FlaskConical',
  path: LIMS_PATHS.root,
  source: 'plugin',
  suite: 'quality',
  status: 'online',
  order: 11,
  description: i18n.t('lims.nav.module_name_desc'),
  permission: 'lims:dashboard:read',
  routes: [
    {
      path: LIMS_PATHS.sample,
      element: lazyWithRetry(() => import('@/pages/lims/LimsSamplePage'), 'LimsSamplePage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-sample'),
      titleKey: 'lims.nav.lims-sample',
      code: 'lims-sample',
      requiredPermissions: ['lims:sample:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<LimsSamplePageProps>,
    {
      path: LIMS_PATHS.sampleDetail,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsSampleDetailPage'),
        'LimsSampleDetailPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-sample-detail'),
      titleKey: 'lims.nav.lims-sample-detail',
      code: 'lims-sample-detail',
      requiredPermissions: ['lims:sample:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    } satisfies RouteConfigV2<LimsSampleDetailPageProps>,
    {
      path: LIMS_PATHS.sampleReceive,
      element: lazyWithRetry(() => import('@/pages/lims/SampleReceivePage'), 'SampleReceivePage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-sample-receive'),
      titleKey: 'lims.nav.lims-sample-receive',
      code: 'lims-sample-receive',
      requiredPermissions: ['lims:sample:write', 'lims:dashboard:write'],
      action: 'write',
      template: 'form',
      group: 'process',
    } satisfies RouteConfigV2<SampleReceivePageProps>,
    {
      path: LIMS_PATHS.task,
      element: lazyWithRetry(() => import('@/pages/lims/LimsTaskPage'), 'LimsTaskPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-task'),
      titleKey: 'lims.nav.lims-task',
      code: 'lims-task',
      requiredPermissions: ['lims:task:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<LimsTaskPageProps>,
    {
      path: LIMS_PATHS.taskDetail,
      element: lazyWithRetry(() => import('@/pages/lims/LimsTaskDetailPage'), 'LimsTaskDetailPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-task-detail'),
      titleKey: 'lims.nav.lims-task-detail',
      code: 'lims-task-detail',
      requiredPermissions: ['lims:task:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'business',
    } satisfies RouteConfigV2<LimsTaskDetailPageProps>,
    {
      path: LIMS_PATHS.inspectionTask,
      element: lazyWithRetry(() => import('@/pages/lims/InspectionTaskPage'), 'InspectionTaskPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-inspection-task'),
      titleKey: 'lims.nav.lims-inspection-task',
      code: 'lims-inspection-task',
      requiredPermissions: ['lims:task:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<InspectionTaskPageProps>,
    {
      path: LIMS_PATHS.process,
      element: lazyWithRetry(() => import('@/pages/lims/LimsProcessPage'), 'LimsProcessPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-process'),
      titleKey: 'lims.nav.lims-process',
      code: 'lims-process',
      requiredPermissions: ['lims:process:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    } satisfies RouteConfigV2<LimsProcessPageProps>,
    {
      path: LIMS_PATHS.instrument,
      element: lazyWithRetry(() => import('@/pages/lims/LimsInstrumentPage'), 'LimsInstrumentPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-instrument'),
      titleKey: 'lims.nav.lims-instrument',
      code: 'lims-instrument',
      requiredPermissions: ['lims:instrument:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<LimsInstrumentPageProps>,
    {
      path: LIMS_PATHS.instrumentDetail,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsInstrumentDetailPage'),
        'LimsInstrumentDetailPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-instrument-detail'),
      titleKey: 'lims.nav.lims-instrument-detail',
      code: 'lims-instrument-detail',
      requiredPermissions: ['lims:instrument:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'master',
    } satisfies RouteConfigV2<LimsInstrumentDetailPageProps>,
    {
      path: LIMS_PATHS.instrumentData,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsInstrumentDataPage'),
        'LimsInstrumentDataPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-instrument-data'),
      titleKey: 'lims.nav.lims-instrument-data',
      code: 'lims-instrument-data',
      requiredPermissions: ['lims:instrument:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'master',
    } satisfies RouteConfigV2<LimsInstrumentDataPageProps>,
    {
      path: LIMS_PATHS.instrumentMaintenance,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsInstrumentMaintenancePage'),
        'LimsInstrumentMaintenancePage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-instrument-maintenance'),
      titleKey: 'lims.nav.lims-instrument-maintenance',
      code: 'lims-instrument-maintenance',
      requiredPermissions: ['lims:instrument:write', 'lims:dashboard:write'],
      action: 'write',
      template: 'form',
      group: 'master',
    } satisfies RouteConfigV2<LimsInstrumentMaintenancePageProps>,
    {
      path: LIMS_PATHS.reagent,
      element: lazyWithRetry(() => import('@/pages/lims/ReagentPage'), 'ReagentPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-reagent'),
      titleKey: 'lims.nav.lims-reagent',
      code: 'lims-reagent',
      requiredPermissions: ['lims:reagent:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'master',
    } satisfies RouteConfigV2<ReagentPageProps>,
    {
      path: LIMS_PATHS.testMethod,
      element: lazyWithRetry(() => import('@/pages/lims/LimsTestMethodPage'), 'LimsTestMethodPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-test-method'),
      titleKey: 'lims.nav.lims-test-method',
      code: 'lims-test-method',
      requiredPermissions: ['lims:test_method:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'setting',
    } satisfies RouteConfigV2<LimsTestMethodPageProps>,
    {
      path: LIMS_PATHS.barcode,
      element: lazyWithRetry(() => import('@/pages/lims/BarcodePage'), 'BarcodePage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-barcode'),
      titleKey: 'lims.nav.lims-barcode',
      code: 'lims-barcode',
      requiredPermissions: ['lims:barcode:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'setting',
    } satisfies RouteConfigV2<BarcodePageProps>,
    {
      path: LIMS_PATHS.uncertainty,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsUncertaintyPage'),
        'LimsUncertaintyPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-uncertainty'),
      titleKey: 'lims.nav.lims-uncertainty',
      code: 'lims-uncertainty',
      requiredPermissions: ['lims:uncertainty:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'stats',
      group: 'analytics',
    } satisfies RouteConfigV2<LimsUncertaintyPageProps>,
    {
      path: LIMS_PATHS.inspectionResult,
      element: lazyWithRetry(
        () => import('@/pages/lims/InspectionResultPage'),
        'InspectionResultPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-inspection-result'),
      titleKey: 'lims.nav.lims-inspection-result',
      code: 'lims-inspection-result',
      requiredPermissions: ['lims:result:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'detail',
      group: 'analytics',
    } satisfies RouteConfigV2<InspectionResultPageProps>,
    {
      path: LIMS_PATHS.proficiencyTesting,
      element: lazyWithRetry(
        () => import('@/pages/lims/LimsProficiencyTestingPage'),
        'LimsProficiencyTestingPage'
      ),
      module: 'lims',
      title: i18n.t('lims.nav.lims-proficiency-testing'),
      titleKey: 'lims.nav.lims-proficiency-testing',
      code: 'lims-proficiency-testing',
      requiredPermissions: ['lims:proficiency:read', 'lims:dashboard:read'],
      action: 'read',
      template: 'list',
      group: 'analytics',
    } satisfies RouteConfigV2<LimsProficiencyTestingPageProps>,
    {
      path: LIMS_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/lims/LimsDashboardPage'), 'LimsDashboardPage'),
      module: 'lims',
      title: i18n.t('lims.nav.lims-dashboard'),
      titleKey: 'lims.nav.lims-dashboard',
      code: 'lims-dashboard',
      requiredPermissions: ['lims:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    } satisfies RouteConfigV2<LimsDashboardPageProps>,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const limsNavConfig: ModuleNavConfig = {
  code: 'lims',
  name: i18n.t('lims.nav.module_name'),
  nameKey: 'lims.nav.module_name',
  icon: 'FlaskConical',
  path: LIMS_PATHS.root,
  permission: 'lims:dashboard:read',
  source: 'plugin',
  suite: 'quality',
  status: 'online',
  order: 11,
  description: i18n.t('lims.nav.module_name_desc'),
  navItems: [
    {
      code: 'lims-dashboard',
      label: i18n.t('lims.nav.lims-dashboard'),
      labelKey: 'lims.nav.lims-dashboard',
      icon: 'LayoutDashboard',
      path: LIMS_PATHS.dashboard,
      permission: 'lims:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('lims.nav.lims-dashboard_desc'),
    },
    {
      code: 'lims-sample',
      label: i18n.t('lims.nav.lims-sample'),
      labelKey: 'lims.nav.lims-sample',
      icon: 'Package',
      path: LIMS_PATHS.sample,
      permission: 'lims:sample:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('lims.nav.lims-sample_desc'),
    },
    {
      code: 'lims-sample-receive',
      label: i18n.t('lims.nav.lims-sample-receive'),
      labelKey: 'lims.nav.lims-sample-receive',
      icon: 'FilePlus',
      path: LIMS_PATHS.sampleReceive,
      permission: 'lims:sample:write',
      order: 2,
      group: 'process',
      description: i18n.t('lims.nav.lims-sample-receive_desc'),
    },
    {
      code: 'lims-task',
      label: i18n.t('lims.nav.lims-task'),
      labelKey: 'lims.nav.lims-task',
      icon: 'ClipboardList',
      path: LIMS_PATHS.task,
      permission: 'lims:task:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('lims.nav.lims-task_desc'),
    },
    {
      code: 'lims-inspection-task',
      label: i18n.t('lims.nav.lims-inspection-task'),
      labelKey: 'lims.nav.lims-inspection-task',
      icon: 'CheckSquare',
      path: LIMS_PATHS.inspectionTask,
      permission: 'lims:task:read',
      order: 4,
      group: 'process',
      description: i18n.t('lims.nav.lims-inspection-task_desc'),
    },
    {
      code: 'lims-process',
      label: i18n.t('lims.nav.lims-process'),
      labelKey: 'lims.nav.lims-process',
      icon: 'GitBranch',
      path: LIMS_PATHS.process,
      permission: 'lims:process:read',
      order: 5,
      group: 'process',
      description: i18n.t('lims.nav.lims-process_desc'),
    },
    {
      code: 'lims-instrument',
      label: i18n.t('lims.nav.lims-instrument'),
      labelKey: 'lims.nav.lims-instrument',
      icon: 'Microscope',
      path: LIMS_PATHS.instrument,
      permission: 'lims:instrument:read',
      order: 6,
      group: 'master',
      showInTabs: true,
      description: i18n.t('lims.nav.lims-instrument_desc'),
    },
    {
      code: 'lims-instrument-maintenance',
      label: i18n.t('lims.nav.lims-instrument-maintenance'),
      labelKey: 'lims.nav.lims-instrument-maintenance',
      icon: 'Wrench',
      path: LIMS_PATHS.instrumentMaintenance,
      permission: 'lims:instrument:write',
      order: 7,
      group: 'master',
      description: i18n.t('lims.nav.lims-instrument-maintenance_desc'),
    },
    {
      code: 'lims-reagent',
      label: i18n.t('lims.nav.lims-reagent'),
      labelKey: 'lims.nav.lims-reagent',
      icon: 'FlaskRound',
      path: LIMS_PATHS.reagent,
      permission: 'lims:reagent:read',
      order: 8,
      group: 'master',
      description: i18n.t('lims.nav.lims-reagent_desc'),
    },
    {
      code: 'lims-instrument-data',
      label: i18n.t('lims.nav.lims-instrument-data'),
      labelKey: 'lims.nav.lims-instrument-data',
      icon: 'Database',
      path: LIMS_PATHS.instrumentData,
      permission: 'lims:instrument:read',
      order: 9,
      group: 'master',
      description: i18n.t('lims.nav.lims-instrument-data_desc'),
    },
    {
      code: 'lims-test-method',
      label: i18n.t('lims.nav.lims-test-method'),
      labelKey: 'lims.nav.lims-test-method',
      icon: 'FileText',
      path: LIMS_PATHS.testMethod,
      permission: 'lims:test_method:read',
      order: 1,
      group: 'setting',
      description: i18n.t('lims.nav.lims-test-method_desc'),
    },
    {
      code: 'lims-barcode',
      label: i18n.t('lims.nav.lims-barcode'),
      labelKey: 'lims.nav.lims-barcode',
      icon: 'Barcode',
      path: LIMS_PATHS.barcode,
      permission: 'lims:barcode:read',
      order: 2,
      group: 'setting',
      description: i18n.t('lims.nav.lims-barcode_desc'),
    },
    {
      code: 'lims-uncertainty',
      label: i18n.t('lims.nav.lims-uncertainty'),
      labelKey: 'lims.nav.lims-uncertainty',
      icon: 'Activity',
      path: LIMS_PATHS.uncertainty,
      permission: 'lims:uncertainty:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('lims.nav.lims-uncertainty_desc'),
    },
    {
      code: 'lims-inspection-result',
      label: i18n.t('lims.nav.lims-inspection-result'),
      labelKey: 'lims.nav.lims-inspection-result',
      icon: 'FileCheck',
      path: LIMS_PATHS.inspectionResult,
      permission: 'lims:result:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('lims.nav.lims-inspection-result_desc'),
    },
    {
      code: 'lims-proficiency-testing',
      label: i18n.t('lims.nav.lims-proficiency-testing'),
      labelKey: 'lims.nav.lims-proficiency-testing',
      icon: 'Award',
      path: LIMS_PATHS.proficiencyTesting,
      permission: 'lims:proficiency:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('lims.nav.lims-proficiency-testing_desc'),
    },
  ],
};
