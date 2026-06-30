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
const DocumentKnowledgeBasePage = lazyWithRetry(
  () => import('../../pages/document/DocumentKnowledgeBasePage'),
  'DocumentKnowledgeBasePage'
);

export const documentModuleConfig: RouteModuleConfig = {
  code: 'document',
  name: '文档中心',
  icon: 'FileText',
  path: '/document',
  source: 'core',
  status: 'online',
  order: 4,
  description: '文档管理、知识库',
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
  ],
};
