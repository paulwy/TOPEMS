import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 EHS_PATHS.xxx，而非硬编码字符串

export const EHS_PATHS = {
  root: '/ehs',
  check: '/ehs/check',
  hazard: '/ehs/hazard',
  hazardDetail: '/ehs/hazard-detail',
  accident: '/ehs/accident',
  plan: '/ehs/plan',
  compliance: '/ehs/compliance',
  environment: '/ehs/environment',
  training: '/ehs/training',
  occupationalDisease: '/ehs/occupational-disease',
  healthManagement: '/ehs/health-management',
  hazardousMaterial: '/ehs/hazardous-material',
  emergency: '/ehs/emergency',
  drill: '/ehs/drill',
  incidentReport: '/ehs/incident-report',
  dashboard: '/ehs/dashboard',
} as const;
interface EhsCheckPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsHazardPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsHazardDetailPageProps {
  id?: string;
  entityType?: string;
}

interface EhsAccidentPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsPlanPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface CompliancePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EnvironmentPageProps {}

interface TrainingPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsOccupationalDiseasePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface HealthManagementPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsHazardousMaterialPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EmergencyPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsDrillPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface EhsIncidentReportPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface EhsDashboardPageProps {}

const ehsCheckRoute: RouteConfigV2<EhsCheckPageProps> = {
  path: EHS_PATHS.check,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsCheckPage'), 'EhsCheckPage'),
  module: 'ehs',
  code: 'ehs-check',
  title: i18n.t('ehs.nav.ehs-check'),
  titleKey: 'ehs.nav.ehs-check',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:check:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsHazardRoute: RouteConfigV2<EhsHazardPageProps> = {
  path: EHS_PATHS.hazard,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsHazardPage'), 'EhsHazardPage'),
  module: 'ehs',
  code: 'ehs-hazard',
  title: i18n.t('ehs.nav.ehs-hazard'),
  titleKey: 'ehs.nav.ehs-hazard',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:hazard:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsHazardDetailRoute: RouteConfigV2<EhsHazardDetailPageProps> = {
  path: EHS_PATHS.hazardDetail,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsHazardDetailPage'), 'EhsHazardDetailPage'),
  module: 'ehs',
  code: 'ehs-hazard-detail',
  title: i18n.t('ehs.nav.ehs-hazard-detail'),
  titleKey: 'ehs.nav.ehs-hazard-detail',
  template: 'detail',
  group: 'business',
  requiredPermissions: ['ehs:hazard:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsAccidentRoute: RouteConfigV2<EhsAccidentPageProps> = {
  path: EHS_PATHS.accident,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsAccidentPage'), 'EhsAccidentPage'),
  module: 'ehs',
  code: 'ehs-accident',
  title: i18n.t('ehs.nav.ehs-accident'),
  titleKey: 'ehs.nav.ehs-accident',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:accident:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsPlanRoute: RouteConfigV2<EhsPlanPageProps> = {
  path: EHS_PATHS.plan,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsPlanPage'), 'EhsPlanPage'),
  module: 'ehs',
  code: 'ehs-plan',
  title: i18n.t('ehs.nav.ehs-plan'),
  titleKey: 'ehs.nav.ehs-plan',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:plan:read', 'ehs:dashboard:read'],
  action: 'read',
};

const complianceRoute: RouteConfigV2<CompliancePageProps> = {
  path: EHS_PATHS.compliance,
  element: lazyWithRetry(() => import('@/pages/ehs/CompliancePage'), 'CompliancePage'),
  module: 'ehs',
  code: 'ehs-compliance',
  title: i18n.t('ehs.nav.ehs-compliance'),
  titleKey: 'ehs.nav.ehs-compliance',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:compliance:read', 'ehs:dashboard:read'],
  action: 'read',
};

const environmentRoute: RouteConfigV2<EnvironmentPageProps> = {
  path: EHS_PATHS.environment,
  element: lazyWithRetry(() => import('@/pages/ehs/EnvironmentPage'), 'EnvironmentPage'),
  module: 'ehs',
  code: 'ehs-environment',
  title: i18n.t('ehs.nav.ehs-environment'),
  titleKey: 'ehs.nav.ehs-environment',
  template: 'stats',
  group: 'analytics',
  requiredPermissions: ['ehs:environment:read', 'ehs:dashboard:read'],
  action: 'read',
};

const trainingRoute: RouteConfigV2<TrainingPageProps> = {
  path: EHS_PATHS.training,
  element: lazyWithRetry(() => import('@/pages/ehs/TrainingPage'), 'TrainingPage'),
  module: 'ehs',
  code: 'ehs-training',
  title: i18n.t('ehs.nav.ehs-training'),
  titleKey: 'ehs.nav.ehs-training',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:training:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsOccupationalDiseaseRoute: RouteConfigV2<EhsOccupationalDiseasePageProps> = {
  path: EHS_PATHS.occupationalDisease,
  element: lazyWithRetry(
    () => import('@/pages/ehs/EhsOccupationalDiseasePage'),
    'EhsOccupationalDiseasePage'
  ),
  module: 'ehs',
  code: 'ehs-occupational-disease',
  title: i18n.t('ehs.nav.ehs-occupational-disease'),
  titleKey: 'ehs.nav.ehs-occupational-disease',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:occupational_disease:read', 'ehs:dashboard:read'],
  action: 'read',
};

const healthManagementRoute: RouteConfigV2<HealthManagementPageProps> = {
  path: EHS_PATHS.healthManagement,
  element: lazyWithRetry(() => import('@/pages/ehs/HealthManagementPage'), 'HealthManagementPage'),
  module: 'ehs',
  code: 'ehs-health-management',
  title: i18n.t('ehs.nav.ehs-health-management'),
  titleKey: 'ehs.nav.ehs-health-management',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:health:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsHazardousMaterialRoute: RouteConfigV2<EhsHazardousMaterialPageProps> = {
  path: EHS_PATHS.hazardousMaterial,
  element: lazyWithRetry(
    () => import('@/pages/ehs/EhsHazardousMaterialPage'),
    'EhsHazardousMaterialPage'
  ),
  module: 'ehs',
  code: 'ehs-hazardous-material',
  title: i18n.t('ehs.nav.ehs-hazardous-material'),
  titleKey: 'ehs.nav.ehs-hazardous-material',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:hazardous_material:read', 'ehs:dashboard:read'],
  action: 'read',
};

const emergencyRoute: RouteConfigV2<EmergencyPageProps> = {
  path: EHS_PATHS.emergency,
  element: lazyWithRetry(() => import('@/pages/ehs/EmergencyPage'), 'EmergencyPage'),
  module: 'ehs',
  code: 'ehs-emergency',
  title: i18n.t('ehs.nav.ehs-emergency'),
  titleKey: 'ehs.nav.ehs-emergency',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:emergency:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsDrillRoute: RouteConfigV2<EhsDrillPageProps> = {
  path: EHS_PATHS.drill,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsDrillPage'), 'EhsDrillPage'),
  module: 'ehs',
  code: 'ehs-drill',
  title: i18n.t('ehs.nav.ehs-drill'),
  titleKey: 'ehs.nav.ehs-drill',
  template: 'list',
  group: 'process',
  requiredPermissions: ['ehs:drill:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsIncidentReportRoute: RouteConfigV2<EhsIncidentReportPageProps> = {
  path: EHS_PATHS.incidentReport,
  element: lazyWithRetry(
    () => import('@/pages/ehs/EhsIncidentReportPage'),
    'EhsIncidentReportPage'
  ),
  module: 'ehs',
  code: 'ehs-incident-report',
  title: i18n.t('ehs.nav.ehs-incident-report'),
  titleKey: 'ehs.nav.ehs-incident-report',
  template: 'form',
  group: 'process',
  requiredPermissions: ['ehs:incident:read', 'ehs:dashboard:read'],
  action: 'read',
};

const ehsDashboardRoute: RouteConfigV2<EhsDashboardPageProps> = {
  path: EHS_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/ehs/EhsDashboardPage'), 'EhsDashboardPage'),
  module: 'ehs',
  code: 'ehs-dashboard',
  title: i18n.t('ehs.nav.ehs-dashboard'),
  titleKey: 'ehs.nav.ehs-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['ehs:dashboard:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const ehsModuleConfig: RouteModuleConfig = {
  code: 'ehs',
  name: i18n.t('shared.config.ehs_name'),
  nameKey: 'shared.config.ehs_name',
  icon: 'ShieldCheck',
  path: EHS_PATHS.root,
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 10,
  description: i18n.t('ehs.nav.module_name_desc'),
  permission: 'ehs:dashboard:read',
  routes: [
    ehsCheckRoute,
    ehsHazardRoute,
    ehsHazardDetailRoute,
    ehsAccidentRoute,
    ehsPlanRoute,
    complianceRoute,
    environmentRoute,
    trainingRoute,
    ehsOccupationalDiseaseRoute,
    healthManagementRoute,
    ehsHazardousMaterialRoute,
    emergencyRoute,
    ehsDrillRoute,
    ehsIncidentReportRoute,
    ehsDashboardRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const ehsNavConfig: ModuleNavConfig = {
  code: 'ehs',
  name: i18n.t('ehs.nav.module_name'),
  nameKey: 'ehs.nav.module_name',
  icon: 'ShieldCheck',
  path: EHS_PATHS.root,
  permission: 'ehs:dashboard:read',
  source: 'plugin',
  suite: 'manufacturing',
  status: 'online',
  order: 10,
  description: i18n.t('ehs.nav.module_name_desc'),
  navItems: [
    {
      code: 'ehs-dashboard',
      label: i18n.t('ehs.nav.ehs-dashboard'),
      labelKey: 'ehs.nav.ehs-dashboard',
      icon: 'LayoutDashboard',
      path: EHS_PATHS.dashboard,
      permission: 'ehs:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('ehs.nav.ehs-dashboard_desc'),
    },
    {
      code: 'ehs-check',
      label: i18n.t('ehs.nav.ehs-check'),
      labelKey: 'ehs.nav.ehs-check',
      icon: 'ClipboardCheck',
      path: EHS_PATHS.check,
      permission: 'ehs:check:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ehs.nav.ehs-check_desc'),
    },
    {
      code: 'ehs-hazard',
      label: i18n.t('ehs.nav.ehs-hazard'),
      labelKey: 'ehs.nav.ehs-hazard',
      icon: 'AlertTriangle',
      path: EHS_PATHS.hazard,
      permission: 'ehs:hazard:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ehs.nav.ehs-hazard_desc'),
    },
    {
      code: 'ehs-accident',
      label: i18n.t('ehs.nav.ehs-accident'),
      labelKey: 'ehs.nav.ehs-accident',
      icon: 'AlertCircle',
      path: EHS_PATHS.accident,
      permission: 'ehs:accident:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ehs.nav.ehs-accident_desc'),
    },
    {
      code: 'ehs-plan',
      label: i18n.t('ehs.nav.ehs-plan'),
      labelKey: 'ehs.nav.ehs-plan',
      icon: 'Calendar',
      path: EHS_PATHS.plan,
      permission: 'ehs:plan:read',
      order: 4,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-plan_desc'),
    },
    {
      code: 'ehs-compliance',
      label: i18n.t('ehs.nav.ehs-compliance'),
      labelKey: 'ehs.nav.ehs-compliance',
      icon: 'FileCheck',
      path: EHS_PATHS.compliance,
      permission: 'ehs:compliance:read',
      order: 5,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-compliance_desc'),
    },
    {
      code: 'ehs-environment',
      label: i18n.t('ehs.nav.ehs-environment'),
      labelKey: 'ehs.nav.ehs-environment',
      icon: 'Leaf',
      path: EHS_PATHS.environment,
      permission: 'ehs:environment:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('ehs.nav.ehs-environment_desc'),
    },
    {
      code: 'ehs-training',
      label: i18n.t('ehs.nav.ehs-training'),
      labelKey: 'ehs.nav.ehs-training',
      icon: 'GraduationCap',
      path: EHS_PATHS.training,
      permission: 'ehs:training:read',
      order: 6,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-training_desc'),
    },
    {
      code: 'ehs-occupational-disease',
      label: i18n.t('ehs.nav.ehs-occupational-disease'),
      labelKey: 'ehs.nav.ehs-occupational-disease',
      icon: 'Heart',
      path: EHS_PATHS.occupationalDisease,
      permission: 'ehs:occupational_disease:read',
      order: 7,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-occupational-disease_desc'),
    },
    {
      code: 'ehs-health-management',
      label: i18n.t('ehs.nav.ehs-health-management'),
      labelKey: 'ehs.nav.ehs-health-management',
      icon: 'Activity',
      path: EHS_PATHS.healthManagement,
      permission: 'ehs:health:read',
      order: 8,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-health-management_desc'),
    },
    {
      code: 'ehs-hazardous-material',
      label: i18n.t('ehs.nav.ehs-hazardous-material'),
      labelKey: 'ehs.nav.ehs-hazardous-material',
      icon: 'FlaskConical',
      path: EHS_PATHS.hazardousMaterial,
      permission: 'ehs:hazardous_material:read',
      order: 9,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-hazardous-material_desc'),
    },
    {
      code: 'ehs-emergency',
      label: i18n.t('ehs.nav.ehs-emergency'),
      labelKey: 'ehs.nav.ehs-emergency',
      icon: 'Zap',
      path: EHS_PATHS.emergency,
      permission: 'ehs:emergency:read',
      order: 10,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-emergency_desc'),
    },
    {
      code: 'ehs-drill',
      label: i18n.t('ehs.nav.ehs-drill'),
      labelKey: 'ehs.nav.ehs-drill',
      icon: 'LifeBuoy',
      path: EHS_PATHS.drill,
      permission: 'ehs:drill:read',
      order: 11,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-drill_desc'),
    },
    {
      code: 'ehs-incident-report',
      label: i18n.t('ehs.nav.ehs-incident-report'),
      labelKey: 'ehs.nav.ehs-incident-report',
      icon: 'FileText',
      path: EHS_PATHS.incidentReport,
      permission: 'ehs:incident:read',
      order: 12,
      group: 'process',
      description: i18n.t('ehs.nav.ehs-incident-report_desc'),
    },
  ],
};
