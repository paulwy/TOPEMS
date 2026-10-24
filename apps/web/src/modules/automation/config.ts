import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 AUTOMATION_PATHS.xxx，而非硬编码字符串

const AUTOMATION_PATHS = {
  root: '/automation',
  dashboard: '/automation/dashboard',
  rules: '/automation/rules',
  runs: '/automation/runs',
  designer: '/automation/designer',
  variables: '/automation/variables',
} as const;
//
// 自动化模块（V64 新增）= 编排层：
// 把 workflow（流程运行时）+ integration（数据桥接）+ lowcode（UI/表单）
// 三大能力串联成统一的「自动化」视图。
// 后端初期落地 unified-core，路径 /api/core/automation；业务量足够再拆独立服务。

interface AutomationDashboardPageProps {}

interface AutomationRulesPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AutomationRunsPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AutomationDesignerPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface AutomationVariablesPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const automationDashboardRoute: RouteConfigV2<AutomationDashboardPageProps> = {
  path: AUTOMATION_PATHS.dashboard,
  element: lazyWithRetry(
    () => import('@/pages/automation/AutomationDashboardPage'),
    'AutomationDashboardPage'
  ),
  module: 'automation',
  code: 'automation-dashboard',
  title: i18n.t('automation.nav.automation-dashboard'),
  titleKey: 'automation.nav.automation-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['automation:dashboard:read'],
  action: 'read',
};

const automationRulesRoute: RouteConfigV2<AutomationRulesPageProps> = {
  path: AUTOMATION_PATHS.rules,
  element: lazyWithRetry(
    () => import('@/pages/automation/AutomationRulesPage'),
    'AutomationRulesPage'
  ),
  module: 'automation',
  code: 'automation-rules',
  title: i18n.t('automation.nav.automation-rules'),
  titleKey: 'automation.nav.automation-rules',
  template: 'list',
  group: 'process',
  requiredPermissions: ['automation:rule:read'],
  action: 'read',
};

const automationRunsRoute: RouteConfigV2<AutomationRunsPageProps> = {
  path: AUTOMATION_PATHS.runs,
  element: lazyWithRetry(
    () => import('@/pages/automation/AutomationRunsPage'),
    'AutomationRunsPage'
  ),
  module: 'automation',
  code: 'automation-runs',
  title: i18n.t('automation.nav.automation-runs'),
  titleKey: 'automation.nav.automation-runs',
  template: 'list',
  group: 'analytics',
  requiredPermissions: ['automation:run:read'],
  action: 'read',
};

const automationDesignerRoute: RouteConfigV2<AutomationDesignerPageProps> = {
  path: AUTOMATION_PATHS.designer,
  element: lazyWithRetry(
    () => import('@/pages/automation/AutomationDesignerPage'),
    'AutomationDesignerPage'
  ),
  module: 'automation',
  code: 'automation-designer',
  title: i18n.t('automation.nav.automation-designer'),
  titleKey: 'automation.nav.automation-designer',
  template: 'form',
  group: 'process',
  requiredPermissions: ['automation:rule:write'],
  action: 'write',
};

const automationVariablesRoute: RouteConfigV2<AutomationVariablesPageProps> = {
  path: AUTOMATION_PATHS.variables,
  element: lazyWithRetry(
    () => import('@/pages/automation/AutomationVariablesPage'),
    'AutomationVariablesPage'
  ),
  module: 'automation',
  code: 'automation-variables',
  title: i18n.t('automation.nav.automation-variables'),
  titleKey: 'automation.nav.automation-variables',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['automation:variable:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const automationModuleConfig: RouteModuleConfig = {
  code: 'automation',
  name: i18n.t('shared.config.automation_name'),
  nameKey: 'shared.config.automation_name',
  icon: 'Zap',
  path: AUTOMATION_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 70,
  description: i18n.t('automation.nav.module_name_desc'),
  permission: 'automation:dashboard:read',
  routes: [
    automationDashboardRoute,
    automationRulesRoute,
    automationRunsRoute,
    automationDesignerRoute,
    automationVariablesRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const automationNavConfig: ModuleNavConfig = {
  code: 'automation',
  name: i18n.t('automation.nav.module_name'),
  nameKey: 'automation.nav.module_name',
  icon: 'Zap',
  path: AUTOMATION_PATHS.root,
  permission: 'automation:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 70,
  description: i18n.t('automation.nav.module_name_desc'),
  navItems: [
    {
      code: 'automation-dashboard',
      label: i18n.t('automation.nav.automation-dashboard'),
      labelKey: 'automation.nav.automation-dashboard',
      icon: 'LayoutDashboard',
      path: AUTOMATION_PATHS.dashboard,
      permission: 'automation:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('automation.nav.automation-dashboard_desc'),
    },
    {
      code: 'automation-rules',
      label: i18n.t('automation.nav.automation-rules'),
      labelKey: 'automation.nav.automation-rules',
      icon: 'Zap',
      path: AUTOMATION_PATHS.rules,
      permission: 'automation:rule:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('automation.nav.automation-rules_desc'),
    },
    {
      code: 'automation-runs',
      label: i18n.t('automation.nav.automation-runs'),
      labelKey: 'automation.nav.automation-runs',
      icon: 'History',
      path: AUTOMATION_PATHS.runs,
      permission: 'automation:run:read',
      order: 2,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('automation.nav.automation-runs_desc'),
    },
    {
      code: 'automation-designer',
      label: i18n.t('automation.nav.automation-designer'),
      labelKey: 'automation.nav.automation-designer',
      icon: 'Workflow',
      path: AUTOMATION_PATHS.designer,
      permission: 'automation:rule:write',
      order: 3,
      group: 'process',
      description: i18n.t('automation.nav.automation-designer_desc'),
    },
    {
      code: 'automation-variables',
      label: i18n.t('automation.nav.automation-variables'),
      labelKey: 'automation.nav.automation-variables',
      icon: 'KeyRound',
      path: AUTOMATION_PATHS.variables,
      permission: 'automation:variable:read',
      order: 4,
      group: 'setting',
      description: i18n.t('automation.nav.automation-variables_desc'),
    },
  ],
};
