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
  description: i18n.t('shared.config.k1'),
  permission: 'lims:dashboard:read',
  routes: [
    {
      path: LIMS_PATHS.sample,
      element: lazyWithRetry(() => import('@/pages/lims/LimsSamplePage'), 'LimsSamplePage'),
      module: 'lims',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
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
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
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
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
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
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
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
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
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
      title: i18n.t('shared.config.k7'),
      titleKey: 'shared.config.k7',
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
      title: i18n.t('shared.config.k8'),
      titleKey: 'shared.config.k8',
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
      title: i18n.t('shared.config.k9'),
      titleKey: 'shared.config.k9',
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
      title: i18n.t('shared.config.k10'),
      titleKey: 'shared.config.k10',
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
      title: i18n.t('shared.config.k11'),
      titleKey: 'shared.config.k11',
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
      title: i18n.t('shared.config.k12'),
      titleKey: 'shared.config.k12',
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
      title: i18n.t('shared.config.k13'),
      titleKey: 'shared.config.k13',
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
      title: i18n.t('shared.config.k14'),
      titleKey: 'shared.config.k14',
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
      title: i18n.t('shared.config.k15'),
      titleKey: 'shared.config.k15',
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
      title: i18n.t('shared.config.k16'),
      titleKey: 'shared.config.k16',
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
      title: i18n.t('shared.config.k17'),
      titleKey: 'shared.config.k17',
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
      title: i18n.t('shared.config.k18'),
      titleKey: 'shared.config.k18',
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
      title: i18n.t('shared.config.k19'),
      titleKey: 'shared.config.k19',
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
  name: i18n.t('shared.config.k20'),
  nameKey: 'shared.config.k20',
  icon: 'FlaskConical',
  path: LIMS_PATHS.root,
  permission: 'lims:dashboard:read',
  source: 'plugin',
  suite: 'quality',
  status: 'online',
  order: 11,
  description: i18n.t('shared.config.k21'),
  navItems: [
    {
      code: 'lims-dashboard',
      label: i18n.t('shared.config.k22'),
      labelKey: 'shared.config.k22',
      icon: 'LayoutDashboard',
      path: LIMS_PATHS.dashboard,
      permission: 'lims:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.lims_0'),
    },
    {
      code: 'lims-sample',
      label: i18n.t('shared.config.k23'),
      labelKey: 'shared.config.k23',
      icon: 'Package',
      path: LIMS_PATHS.sample,
      permission: 'lims:sample:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k24'),
    },
    {
      code: 'lims-sample-receive',
      label: i18n.t('shared.config.k25'),
      labelKey: 'shared.config.k25',
      icon: 'FilePlus',
      path: LIMS_PATHS.sampleReceive,
      permission: 'lims:sample:write',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k26'),
    },
    {
      code: 'lims-task',
      label: i18n.t('shared.config.k27'),
      labelKey: 'shared.config.k27',
      icon: 'ClipboardList',
      path: LIMS_PATHS.task,
      permission: 'lims:task:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k28'),
    },
    {
      code: 'lims-inspection-task',
      label: i18n.t('shared.config.k29'),
      labelKey: 'shared.config.k29',
      icon: 'CheckSquare',
      path: LIMS_PATHS.inspectionTask,
      permission: 'lims:task:read',
      order: 4,
      group: 'process',
      description: i18n.t('shared.config.k30'),
    },
    {
      code: 'lims-process',
      label: i18n.t('shared.config.k31'),
      labelKey: 'shared.config.k31',
      icon: 'GitBranch',
      path: LIMS_PATHS.process,
      permission: 'lims:process:read',
      order: 5,
      group: 'process',
      description: i18n.t('shared.config.k32'),
    },
    {
      code: 'lims-instrument',
      label: i18n.t('shared.config.k33'),
      labelKey: 'shared.config.k33',
      icon: 'Microscope',
      path: LIMS_PATHS.instrument,
      permission: 'lims:instrument:read',
      order: 6,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k34'),
    },
    {
      code: 'lims-instrument-maintenance',
      label: i18n.t('shared.config.k35'),
      labelKey: 'shared.config.k35',
      icon: 'Wrench',
      path: LIMS_PATHS.instrumentMaintenance,
      permission: 'lims:instrument:write',
      order: 7,
      group: 'master',
      description: i18n.t('shared.config.k36'),
    },
    {
      code: 'lims-reagent',
      label: i18n.t('shared.config.k37'),
      labelKey: 'shared.config.k37',
      icon: 'FlaskRound',
      path: LIMS_PATHS.reagent,
      permission: 'lims:reagent:read',
      order: 8,
      group: 'master',
      description: i18n.t('shared.config.k38'),
    },
    {
      code: 'lims-instrument-data',
      label: i18n.t('shared.config.lims_r4_1'),
      labelKey: 'shared.config.lims_r4_1',
      icon: 'Database',
      path: LIMS_PATHS.instrumentData,
      permission: 'lims:instrument:read',
      order: 9,
      group: 'master',
      description: i18n.t('shared.config.lims_r4_2'),
    },
    {
      code: 'lims-test-method',
      label: i18n.t('shared.config.k39'),
      labelKey: 'shared.config.k39',
      icon: 'FileText',
      path: LIMS_PATHS.testMethod,
      permission: 'lims:test_method:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k40'),
    },
    {
      code: 'lims-barcode',
      label: i18n.t('shared.config.k41'),
      labelKey: 'shared.config.k41',
      icon: 'Barcode',
      path: LIMS_PATHS.barcode,
      permission: 'lims:barcode:read',
      order: 2,
      group: 'setting',
      description: i18n.t('shared.config.k42'),
    },
    {
      code: 'lims-uncertainty',
      label: i18n.t('shared.config.k43'),
      labelKey: 'shared.config.k43',
      icon: 'Activity',
      path: LIMS_PATHS.uncertainty,
      permission: 'lims:uncertainty:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('shared.config.k44'),
    },
    {
      code: 'lims-inspection-result',
      label: i18n.t('shared.config.k45'),
      labelKey: 'shared.config.k45',
      icon: 'FileCheck',
      path: LIMS_PATHS.inspectionResult,
      permission: 'lims:result:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('shared.config.k46'),
    },
    {
      code: 'lims-proficiency-testing',
      label: i18n.t('shared.config.k47'),
      labelKey: 'shared.config.k47',
      icon: 'Award',
      path: LIMS_PATHS.proficiencyTesting,
      permission: 'lims:proficiency:read',
      order: 3,
      group: 'analytics',
      description: i18n.t('shared.config.k48'),
    },
  ],
};
