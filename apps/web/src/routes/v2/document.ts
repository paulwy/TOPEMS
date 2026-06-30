import { lazyWithRetry } from '../utils';
import type { RouteModuleConfig } from './types';

const DocumentDashboardPage = lazyWithRetry(
  () => import('../../pages/document/DocumentDashboardPage'),
  'DocumentDashboardPage'
);
const DocumentListPage = lazyWithRetry(
  () => import('../../pages/document/DocumentListPage'),
  'DocumentListPage'
);
const DocumentRecentPage = lazyWithRetry(
  () => import('../../pages/document/DocumentRecentPage'),
  'DocumentRecentPage'
);
const DocumentFavoritesPage = lazyWithRetry(
  () => import('../../pages/document/DocumentFavoritesPage'),
  'DocumentFavoritesPage'
);
const DocumentDetailPage = lazyWithRetry(
  () => import('../../pages/document/DocumentDetailPage'),
  'DocumentDetailPage'
);
const DocumentKnowledgeBasePage = lazyWithRetry(
  () => import('../../pages/document/DocumentKnowledgeBasePage'),
  'DocumentKnowledgeBasePage'
);
const DocumentTemplatesPage = lazyWithRetry(
  () => import('../../pages/document/DocumentTemplatesPage'),
  'DocumentTemplatesPage'
);
const DocumentSettingsPage = lazyWithRetry(
  () => import('../../pages/document/DocumentSettingsPage'),
  'DocumentSettingsPage'
);

export const documentModuleConfig: RouteModuleConfig = {
  code: 'document',
  name: '文档中心',
  icon: 'FileText',
  path: '/document',
  source: 'core',
  status: 'online',
  order: 4,
  description: '文档管理、知识库、模板管理',
  permission: 'document:read',
  routes: [
    {
      path: '/document/dashboard',
      element: DocumentDashboardPage,
      module: 'document',
      code: 'document-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['document:read'],
      nav: {
        label: '仪表盘',
        icon: 'LayoutDashboard',
        order: 0,
        group: 'overview',
        showInTabs: true,
      },
    },
    {
      path: '/document/list',
      element: DocumentListPage,
      module: 'document',
      code: 'document-list',
      title: '文档列表',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['document:read'],
      nav: {
        label: '文档列表',
        icon: 'FolderOpen',
        order: 1,
        group: 'documents',
        showInTabs: true,
      },
    },
    {
      path: '/document/recent',
      element: DocumentRecentPage,
      module: 'document',
      code: 'document-recent',
      title: '最近访问',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['document:read'],
      nav: {
        label: '最近访问',
        icon: 'Clock',
        order: 2,
        group: 'documents',
      },
    },
    {
      path: '/document/favorites',
      element: DocumentFavoritesPage,
      module: 'document',
      code: 'document-favorites',
      title: '我的收藏',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['document:read'],
      nav: {
        label: '我的收藏',
        icon: 'Star',
        order: 3,
        group: 'documents',
      },
    },
    {
      path: '/document/:id',
      element: DocumentDetailPage,
      module: 'document',
      code: 'document-detail',
      title: '文档详情',
      template: 'detail',
      group: 'documents',
      requiredPermissions: ['document:read'],
    },
    {
      path: '/document/knowledge-base',
      element: DocumentKnowledgeBasePage,
      module: 'document',
      code: 'document-knowledge-base',
      title: '知识库',
      template: 'tree',
      group: 'knowledge',
      requiredPermissions: ['document:read'],
      nav: {
        label: '知识库',
        icon: 'BookOpen',
        order: 1,
        group: 'knowledge',
        showInTabs: true,
      },
    },
    {
      path: '/document/templates',
      element: DocumentTemplatesPage,
      module: 'document',
      code: 'document-templates',
      title: '文档模板',
      template: 'list',
      group: 'templates',
      requiredPermissions: ['document:read'],
      nav: {
        label: '文档模板',
        icon: 'Layers',
        order: 1,
        group: 'templates',
      },
    },
    {
      path: '/document/settings',
      element: DocumentSettingsPage,
      module: 'document',
      code: 'document-settings',
      title: '文档设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['document:read'],
      nav: {
        label: '文档设置',
        icon: 'Settings',
        order: 1,
        group: 'settings',
      },
    },
  ],
};
