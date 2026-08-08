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
  icon: 'Blocks',
  path: LOWCODE_PATHS.root,
  source: 'plugin',
  suite: 'platform',
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
      group: 'business',
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
      group: 'process',
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
      group: 'process',
      requiredPermissions: ['lowcode:page:read'],
      action: 'read',
    },
    {
      path: LOWCODE_PATHS.workflows,
      element: lazyWithRetry(
        () => import('@/pages/lowcode/WorkflowConfigPage'),
        'WorkflowConfigPage'
      ),
      module: 'lowcode',
      code: 'lowcode-workflows',
      title: '流程配置',
      template: 'form',
      group: 'setting',
      requiredPermissions: ['lowcode:workflow:read'],
      action: 'read',
    },
  ],
};

export const lowcodeNavConfig: ModuleNavConfig = {
  code: 'lowcode',
  name: '低代码平台',
  icon: 'Blocks',
  path: LOWCODE_PATHS.root,
  source: 'plugin' as const,
  suite: 'platform',
  order: 90,
  navItems: [
    { code: 'lowcode-apps', label: '应用管理', path: LOWCODE_PATHS.apps, group: 'business', showInSidebar: true },
    { code: 'lowcode-forms', label: '表单设计', path: LOWCODE_PATHS.forms, group: 'process', showInSidebar: true },
    { code: 'lowcode-pages', label: '页面设计', path: LOWCODE_PATHS.pages, group: 'process', showInSidebar: true },
    {
      code: 'lowcode-workflows',
      label: '流程配置',
      path: LOWCODE_PATHS.workflows,
      group: 'setting',
      showInSidebar: true,
    },
  ],
};
