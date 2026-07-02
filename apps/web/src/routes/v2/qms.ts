import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const QmsDashboardPage = lazyWithRetry(
  () => import('../../pages/qms/QmsDashboardPage'),
  'QmsDashboardPage'
);
const QmsQualityControlPage = lazyWithRetry(
  () => import('../../pages/qms/QmsQualityControlPage'),
  'QmsQualityControlPage'
);
const QmsNonconformancePage = lazyWithRetry(
  () => import('../../pages/qms/QmsNonconformancePage'),
  'QmsNonconformancePage'
);
const QmsAuditManagementPage = lazyWithRetry(
  () => import('../../pages/qms/QmsAuditManagementPage'),
  'QmsAuditManagementPage'
);
const QmsInspectionPage = lazyWithRetry(
  () => import('../../pages/qms/QmsInspectionPage'),
  'QmsInspectionPage'
);
const QmsQualityCostPage = lazyWithRetry(
  () => import('../../pages/qms/QmsQualityCostPage'),
  'QmsQualityCostPage'
);
const QmsStandardListPage = lazyWithRetry(
  () => import('../../pages/qms/QmsStandardListPage'),
  'QmsStandardListPage'
);
const QmsStandardDetailPage = lazyWithRetry(
  () => import('../../pages/qms/QmsStandardDetailPage'),
  'QmsStandardDetailPage'
);
const QmsApqpPage = lazyWithRetry(() => import('../../pages/qms/QmsApqpPage'), 'QmsApqpPage');
const QmsFmeaPage = lazyWithRetry(() => import('../../pages/qms/QmsFmeaPage'), 'QmsFmeaPage');
const QmsSpcPage = lazyWithRetry(() => import('../../pages/qms/QmsSpcPage'), 'QmsSpcPage');
const QmsEightDPage = lazyWithRetry(() => import('../../pages/qms/QmsEightDPage'), 'QmsEightDPage');

export const qmsModuleConfig: RouteModuleConfig = {
  code: 'qms',
  name: '质量管理',
  icon: 'Shield',
  path: '/qms',
  source: 'core',
  suite: 'quality',
  status: 'online',
  order: 9,
  description: '检验计划、质检任务、不合格品、质量改进',
  permission: 'qms:read',
  routes: [
    {
      path: '/qms/dashboard',
      element: QmsDashboardPage,
      module: 'qms',
      code: 'qms-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['qms:read'],
    },
    {
      path: '/qms/inspection',
      element: QmsInspectionPage,
      module: 'qms',
      code: 'qms-inspection',
      title: '质检任务',
      template: 'list',
      group: 'business',
      requiredPermissions: ['qms:inspection:read'],
    },
    {
      path: '/qms/quality-control',
      element: QmsQualityControlPage,
      module: 'qms',
      code: 'qms-quality-control',
      title: '质量控制',
      template: 'list',
      group: 'business',
      requiredPermissions: ['qms:quality_control:read'],
    },
    {
      path: '/qms/nonconformance',
      element: QmsNonconformancePage,
      module: 'qms',
      code: 'qms-nonconformance',
      title: '不合格品',
      template: 'list',
      group: 'business',
      requiredPermissions: ['qms:nonconformance:read'],
    },
    {
      path: '/qms/audit-management',
      element: QmsAuditManagementPage,
      module: 'qms',
      code: 'qms-audit-management',
      title: '审核管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['qms:audit:read'],
    },
    {
      path: '/qms/standards',
      element: QmsStandardListPage,
      module: 'qms',
      code: 'qms-standards',
      title: '质量标准',
      template: 'list',
      group: 'business',
      requiredPermissions: ['qms:standard:read'],
    },
    {
      path: '/qms/standards/:id',
      element: QmsStandardDetailPage,
      module: 'qms',
      code: 'qms-standard-detail',
      title: '标准详情',
      template: 'detail',
      group: 'business',
      requiredPermissions: ['qms:standard:read'],
    },
    {
      path: '/qms/apqp',
      element: QmsApqpPage,
      module: 'qms',
      code: 'qms-apqp',
      title: 'APQP管理',
      template: 'list',
      group: 'process',
      requiredPermissions: ['qms:apqp:read'],
    },
    {
      path: '/qms/fmea',
      element: QmsFmeaPage,
      module: 'qms',
      code: 'qms-fmea',
      title: 'FMEA分析',
      template: 'list',
      group: 'process',
      requiredPermissions: ['qms:fmea:read'],
    },
    {
      path: '/qms/spc',
      element: QmsSpcPage,
      module: 'qms',
      code: 'qms-spc',
      title: 'SPC统计',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['qms:spc:read'],
    },
    {
      path: '/qms/eightd',
      element: QmsEightDPage,
      module: 'qms',
      code: 'qms-eightd',
      title: '8D报告',
      template: 'list',
      group: 'process',
      requiredPermissions: ['qms:eightd:read'],
    },
    {
      path: '/qms/quality-cost',
      element: QmsQualityCostPage,
      module: 'qms',
      code: 'qms-quality-cost',
      title: '质量成本',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['qms:quality_cost:read'],
    },
  ],
};
