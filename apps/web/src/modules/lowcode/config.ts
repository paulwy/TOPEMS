import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

export const LOWCODE_PATHS = {
  root: '/lowcode',
  apps: '/lowcode/apps',
  forms: '/lowcode/forms',
  pages: '/lowcode/pages',
  workflows: '/lowcode/workflows',
} as const;

export const lowcodeModuleConfig: RouteModuleConfig = {
  code: 'lowcode',
  name: '低代码平台',
  icon: 'Code',
  path: LOWCODE_PATHS.root,
  source: 'plugin',
  status: 'online',
  order: 90,
  description: '低代码应用构建平台',
  permission: 'lowcode:read',
  routes: [
    {
      path: LOWCODE_PATHS.apps,
      element: lazyWithRetry(() => import('@/pages/lowcode/AppListPage'), 'AppListPage'),
      module: 'lowcode',
      code: 'lowcode-apps',
      title: '应用管理',
      template: 'list',
      group: 'apps',
      requiredPermissions: ['lowcode:read'],
      action: 'read',
    },
    {
      path: LOWCODE_PATHS.forms,
      element: lazyWithRetry(() => import('@/pages/lowcode/FormDesignPage'), 'FormDesignPage'),
      module: 'lowcode',
      code: 'lowcode-forms',
      title: '表单设计',
      template: 'form',
      group: 'design',
      requiredPermissions: ['lowcode:form:read'],
      action: 'read',
    },
    {
      path: LOWCODE_PATHS.pages,
      element: lazyWithRetry(() => import('@/pages/lowcode/PageDesignPage'), 'PageDesignPage'),
      module: 'lowcode',
      code: 'lowcode-pages',
      title: '页面设计',
      template: 'form',
      group: 'design',
      requiredPermissions: ['lowcode:page:read'],
      action: 'read',
    },
    {
      path: LOWCODE_PATHS.workflows,
      element: lazyWithRetry(() => import('@/pages/lowcode/WorkflowConfigPage'), 'WorkflowConfigPage'),
      module: 'lowcode',
      code: 'lowcode-workflows',
      title: '流程配置',
      template: 'form',
      group: 'config',
      requiredPermissions: ['lowcode:workflow:read'],
      action: 'read',
    },
  ],
};

export const lowcodeNavConfig: ModuleNavConfig = {
  code: 'lowcode',
  name: '低代码平台',
  icon: 'Code',
  path: LOWCODE_PATHS.root,
  source: 'plugin' as const,
  order: 90,
  navItems: [
    { code: 'lowcode-apps', label: '应用管理', path: LOWCODE_PATHS.apps, showInSidebar: true },
    { code: 'lowcode-forms', label: '表单设计', path: LOWCODE_PATHS.forms, showInSidebar: true },
    { code: 'lowcode-pages', label: '页面设计', path: LOWCODE_PATHS.pages, showInSidebar: true },
    { code: 'lowcode-workflows', label: '流程配置', path: LOWCODE_PATHS.workflows, showInSidebar: true },
  ],
};