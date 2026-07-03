import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const DocumentDashboardPage = lazyWithRetry(
  () => import('../../pages/doc/DashboardPage'),
  'DashboardPage'
);
const DocumentListPage = lazyWithRetry(
  () => import('../../pages/doc/DocumentListPage'),
  'DocumentListPage'
);
const DocumentKnowledgeBasePage = lazyWithRetry(
  () => import('../../pages/doc/KnowledgeBasePage'),
  'KnowledgeBasePage'
);
const DocumentsPage = lazyWithRetry(() => import('../../pages/doc/DocumentsPage'), 'DocumentsPage');
const DocumentCenterPage = lazyWithRetry(
  () => import('../../pages/doc/DocumentCenterPage'),
  'DocumentCenterPage'
);
const DocsFileDetailPage = lazyWithRetry(
  () => import('../../pages/doc/FileDetailPage'),
  'FileDetailPage'
);

export const docModuleConfig: RouteModuleConfig = {
  code: 'doc',
  name: '文档中心',
  icon: 'FileText',
  path: '/doc',
  source: 'core',
  status: 'online',
  order: 4,
  description: '文档管理、知识库、文档模板',
  permission: 'doc:read',
  routes: [
    {
      path: '/doc/dashboard',
      element: DocumentDashboardPage,
      module: 'doc',
      code: 'doc-dashboard',
      title: '仪表盘',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['doc:read'],
    },
    {
      path: '/doc/list',
      element: DocumentListPage,
      module: 'doc',
      code: 'doc-list',
      title: '文档列表',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['doc:read'],
    },
    {
      path: '/doc/documents',
      element: DocumentsPage,
      module: 'doc',
      code: 'doc-documents',
      title: '文档管理',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['doc:document:read'],
    },
    {
      path: '/doc/document-center',
      element: DocumentCenterPage,
      module: 'doc',
      code: 'doc-document-center',
      title: '文档中心',
      template: 'list',
      group: 'documents',
      requiredPermissions: ['doc:center:read'],
    },
    {
      path: '/doc/knowledge-base',
      element: DocumentKnowledgeBasePage,
      module: 'doc',
      code: 'doc-knowledge-base',
      title: '知识库',
      template: 'tree',
      group: 'knowledge',
      requiredPermissions: ['doc:read'],
    },
    {
      path: '/doc/documents/:id',
      element: DocsFileDetailPage,
      module: 'doc',
      code: 'doc-file-detail',
      title: '文档详情',
      template: 'detail',
      group: 'documents',
      requiredPermissions: ['doc:document:read'],
    },
  ],
};
