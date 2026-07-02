import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const limsModuleConfig: RouteModuleConfig = {
  code: 'lims',
  name: '实验室管理',
  icon: 'FlaskConical',
  path: '/lims',
  source: 'plugin',
  suite: 'quality',
  status: 'online',
  order: 11,
  description: '样品管理、检验流程、仪器设备、试剂管理',
  permission: 'lims:read',
  routes: [
    {
      path: '/lims/sample',
      element: lazyWithRetry(() => import('../../pages/lims/LimsSamplePage'), 'LimsSamplePage'),
      module: 'lims',
      title: '样品管理',
      code: 'lims-sample',
      requiredPermissions: ['lims:sample:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/sample-detail',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsSampleDetailPage'),
        'LimsSampleDetailPage'
      ),
      module: 'lims',
      title: '样品详情',
      code: 'lims-sample-detail',
      requiredPermissions: ['lims:sample:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/lims/sample-receive',
      element: lazyWithRetry(
        () => import('../../pages/lims/SampleReceivePage'),
        'SampleReceivePage'
      ),
      module: 'lims',
      title: '样品接收',
      code: 'lims-sample-receive',
      requiredPermissions: ['lims:sample:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/lims/task',
      element: lazyWithRetry(() => import('../../pages/lims/LimsTaskPage'), 'LimsTaskPage'),
      module: 'lims',
      title: '检验任务',
      code: 'lims-task',
      requiredPermissions: ['lims:task:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/task-detail',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsTaskDetailPage'),
        'LimsTaskDetailPage'
      ),
      module: 'lims',
      title: '任务详情',
      code: 'lims-task-detail',
      requiredPermissions: ['lims:task:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/lims/inspection-task',
      element: lazyWithRetry(
        () => import('../../pages/lims/InspectionTaskPage'),
        'InspectionTaskPage'
      ),
      module: 'lims',
      title: '检验任务列表',
      code: 'lims-inspection-task',
      requiredPermissions: ['lims:task:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/process',
      element: lazyWithRetry(() => import('../../pages/lims/LimsProcessPage'), 'LimsProcessPage'),
      module: 'lims',
      title: '检验流程',
      code: 'lims-process',
      requiredPermissions: ['lims:process:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/instrument',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsInstrumentPage'),
        'LimsInstrumentPage'
      ),
      module: 'lims',
      title: '仪器设备',
      code: 'lims-instrument',
      requiredPermissions: ['lims:instrument:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/instrument-detail',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsInstrumentDetailPage'),
        'LimsInstrumentDetailPage'
      ),
      module: 'lims',
      title: '仪器详情',
      code: 'lims-instrument-detail',
      requiredPermissions: ['lims:instrument:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/lims/instrument-data',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsInstrumentDataPage'),
        'LimsInstrumentDataPage'
      ),
      module: 'lims',
      title: '仪器数据',
      code: 'lims-instrument-data',
      requiredPermissions: ['lims:instrument:read'],
      template: 'detail',
      group: 'business',
    },
    {
      path: '/lims/instrument-maintenance',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsInstrumentMaintenancePage'),
        'LimsInstrumentMaintenancePage'
      ),
      module: 'lims',
      title: '仪器维护',
      code: 'lims-instrument-maintenance',
      requiredPermissions: ['lims:instrument:write'],
      template: 'form',
      group: 'business',
    },
    {
      path: '/lims/reagent',
      element: lazyWithRetry(() => import('../../pages/lims/ReagentPage'), 'ReagentPage'),
      module: 'lims',
      title: '试剂管理',
      code: 'lims-reagent',
      requiredPermissions: ['lims:reagent:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/lims/test-method',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsTestMethodPage'),
        'LimsTestMethodPage'
      ),
      module: 'lims',
      title: '测试方法',
      code: 'lims-test-method',
      requiredPermissions: ['lims:test-method:read'],
      template: 'list',
      group: 'settings',
    },
    {
      path: '/lims/barcode',
      element: lazyWithRetry(() => import('../../pages/lims/BarcodePage'), 'BarcodePage'),
      module: 'lims',
      title: '条码管理',
      code: 'lims-barcode',
      requiredPermissions: ['lims:barcode:read'],
      template: 'list',
      group: 'settings',
    },
    {
      path: '/lims/uncertainty',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsUncertaintyPage'),
        'LimsUncertaintyPage'
      ),
      module: 'lims',
      title: '不确定度',
      code: 'lims-uncertainty',
      requiredPermissions: ['lims:uncertainty:read'],
      template: 'stats',
      group: 'analytics',
    },
    {
      path: '/lims/inspection-result',
      element: lazyWithRetry(
        () => import('../../pages/lims/InspectionResultPage'),
        'InspectionResultPage'
      ),
      module: 'lims',
      title: '检验结果',
      code: 'lims-inspection-result',
      requiredPermissions: ['lims:result:read'],
      template: 'detail',
      group: 'analytics',
    },
    {
      path: '/lims/proficiency-testing',
      element: lazyWithRetry(
        () => import('../../pages/lims/LimsProficiencyTestingPage'),
        'LimsProficiencyTestingPage'
      ),
      module: 'lims',
      title: '能力验证',
      code: 'lims-proficiency-testing',
      requiredPermissions: ['lims:proficiency:read'],
      template: 'list',
      group: 'analytics',
    },
  ],
};
