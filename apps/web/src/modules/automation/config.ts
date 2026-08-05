import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 AUTOMATION_PATHS.xxx，而非硬编码字符串
//
// 自动化模块（V64 新增）= 编排层：
// 把 workflow（流程运行时）+ integration（数据桥接）+ lowcode（UI/表单）
// 三大能力串联成统一的「自动化」视图。
// 后端初期落地 unified-core，路径 /api/core/automation；业务量足够再拆独立服务。
export const AUTOMATION_PATHS = {
  root: '/automation',
  dashboard: '/automation/dashboard',
  rules: '/automation/rules',
  runs: '/automation/runs',
  designer: '/automation/designer',
  variables: '/automation/variables',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const automationModuleConfig: RouteModuleConfig = {
  code: 'automation',
  name: '自动化',
  icon: 'Zap',
  path: AUTOMATION_PATHS.root,
  source: 'core',
  status: 'online',
  order: 70,
  description: '自动化编排：触发器 → 工作流 / 集成 / 低代码 动作的统一编排中心',
  permission: 'automation:read',
  routes: [
    {
      path: AUTOMATION_PATHS.dashboard,
      element: lazyWithRetry(
        () => import('@/pages/automation/AutomationDashboardPage'),
        'AutomationDashboardPage'
      ),
      module: 'automation',
      code: 'automation-dashboard',
      title: '自动化总览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['automation:read'],
      action: 'read',
    },
    {
      path: AUTOMATION_PATHS.rules,
      element: lazyWithRetry(
        () => import('@/pages/automation/AutomationRulesPage'),
        'AutomationRulesPage'
      ),
      module: 'automation',
      code: 'automation-rules',
      title: '自动化规则',
      template: 'list',
      group: 'rules',
      requiredPermissions: ['automation:rule:read'],
      action: 'read',
    },
    {
      path: AUTOMATION_PATHS.runs,
      element: lazyWithRetry(
        () => import('@/pages/automation/AutomationRunsPage'),
        'AutomationRunsPage'
      ),
      module: 'automation',
      code: 'automation-runs',
      title: '执行历史',
      template: 'list',
      group: 'logs',
      requiredPermissions: ['automation:run:read'],
      action: 'read',
    },
    {
      path: AUTOMATION_PATHS.designer,
      element: lazyWithRetry(
        () => import('@/pages/automation/AutomationDesignerPage'),
        'AutomationDesignerPage'
      ),
      module: 'automation',
      code: 'automation-designer',
      title: '可视化编排',
      template: 'form',
      group: 'design',
      requiredPermissions: ['automation:rule:write'],
      action: 'write',
    },
    {
      path: AUTOMATION_PATHS.variables,
      element: lazyWithRetry(
        () => import('@/pages/automation/AutomationVariablesPage'),
        'AutomationVariablesPage'
      ),
      module: 'automation',
      code: 'automation-variables',
      title: '环境变量',
      template: 'list',
      group: 'settings',
      requiredPermissions: ['automation:variable:read'],
      action: 'read',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const automationNavConfig: ModuleNavConfig = {
  code: 'automation',
  name: '自动化',
  icon: 'Zap',
  path: AUTOMATION_PATHS.root,
  permission: 'automation:read',
  source: 'core',
  status: 'online',
  order: 70,
  description: '自动化编排：触发器 → 工作流 / 集成 / 低代码 动作的统一编排中心',
  navItems: [
    {
      code: 'automation-dashboard',
      label: '自动化总览',
      icon: 'LayoutDashboard',
      path: AUTOMATION_PATHS.dashboard,
      permission: 'automation:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '自动化任务总览、成功率、最近执行',
    },
    {
      code: 'automation-rules',
      label: '自动化规则',
      icon: 'Zap',
      path: AUTOMATION_PATHS.rules,
      permission: 'automation:rule:read',
      order: 1,
      group: 'rules',
      showInTabs: true,
      description: '触发器规则 CRUD：定时/Cron/事件/Webhook',
    },
    {
      code: 'automation-runs',
      label: '执行历史',
      icon: 'History',
      path: AUTOMATION_PATHS.runs,
      permission: 'automation:run:read',
      order: 2,
      group: 'logs',
      showInTabs: true,
      description: '执行历史列表、重试、日志查看',
    },
    {
      code: 'automation-designer',
      label: '可视化编排',
      icon: 'Workflow',
      path: AUTOMATION_PATHS.designer,
      permission: 'automation:rule:write',
      order: 3,
      group: 'design',
      description: '可视化画布：lowcode page → workflow → integration endpoint 的串联编排',
    },
    {
      code: 'automation-variables',
      label: '环境变量',
      icon: 'KeyRound',
      path: AUTOMATION_PATHS.variables,
      permission: 'automation:variable:read',
      order: 4,
      group: 'settings',
      description: '环境变量 / 密钥管理',
    },
  ],
};
