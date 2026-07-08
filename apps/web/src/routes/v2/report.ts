import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const reportModuleConfig: RouteModuleConfig = {
  code: 'report',
  name: '报表中心',
  icon: 'FileSpreadsheet',
  path: '/report',
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 6,
  description: '报表管理、订阅、定时任务、模板设计',
  permission: 'report:read',
  routes: [
    {
      path: '/report/dashboard',
      element: lazyWithRetry(() => import('../../pages/report/ReportPage'), 'ReportPage'),
      module: 'report',
      title: '报表中心',
      code: 'report-dashboard',
      requiredPermissions: ['report:read'],
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: '/report/list',
      element: lazyWithRetry(() => import('../../pages/report/ReportListPage'), 'ReportListPage'),
      module: 'report',
      title: '报表列表',
      code: 'report-list',
      requiredPermissions: ['report:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/report/viewer',
      element: lazyWithRetry(() => import('../../pages/report/ReportViewer'), 'ReportViewer'),
      module: 'report',
      title: '报表查看',
      code: 'report-viewer',
      requiredPermissions: ['report:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/report/design',
      element: lazyWithRetry(
        () => import('../../pages/report/ReportDesignPage'),
        'ReportDesignPage'
      ),
      module: 'report',
      title: '报表设计',
      code: 'report-design',
      requiredPermissions: ['report:design:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/report/builder',
      element: lazyWithRetry(() => import('../../pages/report/ReportBuilderPage'), 'ReportBuilderPage'),
      module: 'report',
      title: '报表构建',
      code: 'report-builder',
      requiredPermissions: ['report:builder:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/report/schedule',
      element: lazyWithRetry(
        () => import('../../pages/report/ReportSchedulePage'),
        'ReportSchedulePage'
      ),
      module: 'report',
      title: '定时任务',
      code: 'report-schedule',
      requiredPermissions: ['report:schedule:read'],
      template: 'list',
      group: 'process',
    },
    {
      path: '/report/subscription',
      element: lazyWithRetry(
        () => import('../../pages/report/ReportSubscriptionPage'),
        'ReportSubscriptionPage'
      ),
      module: 'report',
      title: '报表订阅',
      code: 'report-subscription',
      requiredPermissions: ['report:subscription:read'],
      template: 'list',
      group: 'process',
    },
    {
      path: '/report/template',
      element: lazyWithRetry(
        () => import('../../pages/report/TemplateManagementPage'),
        'TemplateManagementPage'
      ),
      module: 'report',
      title: '模板管理',
      code: 'report-template',
      requiredPermissions: ['report:template:read'],
      template: 'list',
      group: 'settings',
    },
  ],
};
