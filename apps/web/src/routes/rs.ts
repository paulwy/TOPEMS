import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

// RS 研发管理页面组件
const RsDashboardPage = lazy(() => import('../pages/rs/DashboardPage'));
const RsProjectListPage = lazy(() => import('../pages/rs/RsProjectListPage'));
const RsProjectDetailPage = lazy(() => import('../pages/rs/RsProjectDetailPage'));
const RsProjectCreatePage = lazy(() => import('../pages/rs/RsProjectCreatePage'));
const RsExperimentListPage = lazy(() => import('../pages/rs/RsExperimentListPage'));
const RsExperimentDetailPage = lazy(() => import('../pages/rs/RsExperimentDetailPage'));
const RsExperimentCreatePage = lazy(() => import('../pages/rs/RsExperimentCreatePage'));
const RsFormulaListPage = lazy(() => import('../pages/rs/RsFormulaListPage'));
const RsFormulaDetailPage = lazy(() => import('../pages/rs/RsFormulaDetailPage'));
const RsFormulaCreatePage = lazy(() => import('../pages/rs/RsFormulaCreatePage'));
const RsMaterialListPage = lazy(() => import('../pages/rs/RsMaterialListPage'));
const RsReportPage = lazy(() => import('../pages/rs/RsReportPage'));
const RsBugPage = lazy(() => import('../pages/rs/RsBugPage'));
const RsBuildPage = lazy(() => import('../pages/rs/RsBuildPage'));
const RsCodePage = lazy(() => import('../pages/rs/RsCodePage'));
const RsDeployPage = lazy(() => import('../pages/rs/RsDeployPage'));
const RsDocPage = lazy(() => import('../pages/rs/RsDocPage'));
const RsMilestonePage = lazy(() => import('../pages/rs/RsMilestonePage'));
const RsReleasePage = lazy(() => import('../pages/rs/RsReleasePage'));
const RsReviewPage = lazy(() => import('../pages/rs/RsReviewPage'));
const RsSettingsPage = lazy(() => import('../pages/rs/RsSettingsPage'));
const RsTestPage = lazy(() => import('../pages/rs/RsTestPage'));

export const rsRoutes: RouteConfig[] = [
  // RS 仪表盘
  {
    path: '/rs',
    element: RsDashboardPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 项目管理
  {
    path: '/rs/projects',
    element: RsProjectListPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/projects/create',
    element: RsProjectCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  {
    path: '/rs/projects/:id',
    element: RsProjectDetailPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/projects/:id/edit',
    element: RsProjectCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  // 试验管理
  {
    path: '/rs/experiments',
    element: RsExperimentListPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/experiments/create',
    element: RsExperimentCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  {
    path: '/rs/experiments/:id',
    element: RsExperimentDetailPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/experiments/:id/edit',
    element: RsExperimentCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  // 配方管理
  {
    path: '/rs/formulas',
    element: RsFormulaListPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/formulas/create',
    element: RsFormulaCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  {
    path: '/rs/formulas/:id',
    element: RsFormulaDetailPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  {
    path: '/rs/formulas/:id/edit',
    element: RsFormulaCreatePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'write',
  },
  // 物料管理
  {
    path: '/rs/materials',
    element: RsMaterialListPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 报表分析
  {
    path: '/rs/reports',
    element: RsReportPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 缺陷管理
  {
    path: '/rs/bugs',
    element: RsBugPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 构建管理
  {
    path: '/rs/builds',
    element: RsBuildPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 代码管理
  {
    path: '/rs/code',
    element: RsCodePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 部署管理
  {
    path: '/rs/deploy',
    element: RsDeployPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 文档管理
  {
    path: '/rs/docs',
    element: RsDocPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 里程碑管理
  {
    path: '/rs/milestones',
    element: RsMilestonePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 版本发布
  {
    path: '/rs/releases',
    element: RsReleasePage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 评审管理
  {
    path: '/rs/reviews',
    element: RsReviewPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 研发设置
  {
    path: '/rs/settings',
    element: RsSettingsPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
  // 测试管理
  {
    path: '/rs/tests',
    element: RsTestPage,
    requiredPermissions: [],
    module: 'rs',
    action: 'read',
  },
];
