import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const PmDashboardPage = lazyWithRetry(
  () => import('../../pages/pm/DashboardPage'),
  'DashboardPage'
);

export const pmModuleConfig: RouteModuleConfig = {
  code: 'pm',
  name: '项目管理',
  icon: 'FolderKanban',
  path: '/pm',
  source: 'core',
  suite: 'project',
  status: 'online',
  order: 13,
  description: '项目计划、任务分配、进度跟踪、资源管理',
  permission: 'pm:read',
  routes: [
    {
      path: '/pm/dashboard',
      element: PmDashboardPage,
      module: 'pm',
      code: 'pm-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['pm:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/pm/projects',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmProjectListPage'),
        'PmProjectListPage'
      ),
      module: 'pm',
      code: 'pm-projects',
      title: '项目列表',
      template: 'list',
      group: 'business',
      requiredPermissions: ['pm:project:read'],
      nav: {
        label: '项目列表',
        icon: 'FolderKanban',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
    },
    {
      path: '/pm/projects/create',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmProjectCreatePage'),
        'PmProjectCreatePage'
      ),
      module: 'pm',
      code: 'pm-project-create',
      title: '创建项目',
      template: 'form',
      group: 'business',
      requiredPermissions: ['pm:project:create'],
    },
    {
      path: '/pm/projects/:id',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmProjectDetailPage'),
        'PmProjectDetailPage'
      ),
      module: 'pm',
      code: 'pm-project-detail',
      title: '项目详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['pm:project:read'],
    },
    {
      path: '/pm/contracts',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmContractListPage'),
        'PmContractListPage'
      ),
      module: 'pm',
      code: 'pm-contracts',
      title: '合同管理',
      template: 'list',
      group: 'business',
      requiredPermissions: ['pm:contract:read'],
      nav: {
        label: '合同管理',
        icon: 'FileText',
        order: 2,
        group: 'business',
      },
    },
    {
      path: '/pm/contracts/create',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmContractCreatePage'),
        'PmContractCreatePage'
      ),
      module: 'pm',
      code: 'pm-contract-create',
      title: '创建合同',
      template: 'form',
      group: 'business',
      requiredPermissions: ['pm:contract:create'],
    },
    {
      path: '/pm/contracts/:id',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmContractDetailPage'),
        'PmContractDetailPage'
      ),
      module: 'pm',
      code: 'pm-contract-detail',
      title: '合同详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['pm:contract:read'],
    },
    {
      path: '/pm/resources',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmResourcePage'),
        'PmResourcePage'
      ),
      module: 'pm',
      code: 'pm-resources',
      title: '资源管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['pm:resource:read'],
      nav: {
        label: '资源管理',
        icon: 'Users',
        order: 1,
        group: 'process',
        showInTabs: true,
      },
    },
    {
      path: '/pm/templates',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmTemplatePage'),
        'PmTemplatePage'
      ),
      module: 'pm',
      code: 'pm-templates',
      title: '模板管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['pm:template:read'],
      nav: {
        label: '模板管理',
        icon: 'LayoutTemplate',
        order: 2,
        group: 'process',
      },
    },
    {
      path: '/pm/reports',
      element: lazyWithRetry(
        () => import('../../pages/pm/PmReportPage'),
        'PmReportPage'
      ),
      module: 'pm',
      code: 'pm-reports',
      title: '项目报表',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['pm:report:read'],
      nav: {
        label: '项目报表',
        icon: 'BarChart3',
        order: 1,
        group: 'analytics',
        showInTabs: true,
      },
    },
  ],
};