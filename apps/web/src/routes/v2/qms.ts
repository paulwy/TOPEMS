import { lazyWithRetry } from '../utils';
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
const QmsApqpPage = lazyWithRetry(
  () => import('../../pages/qms/QmsApqpPage'),
  'QmsApqpPage'
);
const QmsFmeaPage = lazyWithRetry(
  () => import('../../pages/qms/QmsFmeaPage'),
  'QmsFmeaPage'
);
const QmsSpcPage = lazyWithRetry(
  () => import('../../pages/qms/QmsSpcPage'),
  'QmsSpcPage'
);
const QmsEightDPage = lazyWithRetry(
  () => import('../../pages/qms/QmsEightDPage'),
  'QmsEightDPage'
);

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
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
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
      nav: {
        label: '质检任务',
        icon: 'CheckSquare',
        order: 1,
        group: 'business',
        showInTabs: true,
      },
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
      nav: {
        label: '质量控制',
        icon: 'ClipboardList',
        order: 2,
        group: 'business',
      },
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
      nav: {
        label: '不合格品',
        icon: 'XCircle',
        order: 3,
        group: 'business',
      },
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
      nav: {
        label: '审核管理',
        icon: 'SearchCheck',
        order: 1,
        group: 'process',
      },
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
      nav: {
        label: '质量标准',
        icon: 'FileText',
        order: 4,
        group: 'business',
      },
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
      nav: {
        label: 'APQP管理',
        icon: 'BookOpen',
        order: 2,
        group: 'process',
      },
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
      nav: {
        label: 'FMEA分析',
        icon: 'AlertTriangle',
        order: 3,
        group: 'process',
      },
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
      nav: {
        label: 'SPC统计',
        icon: 'TrendingUp',
        order: 1,
        group: 'analytics',
      },
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
      nav: {
        label: '8D报告',
        icon: 'FileCheck',
        order: 4,
        group: 'process',
      },
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
      nav: {
        label: '质量成本',
        icon: 'Wallet',
        order: 2,
        group: 'analytics',
        showInTabs: true,
      },
    },
  ],
};
