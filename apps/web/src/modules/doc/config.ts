import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 DOC_PATHS.xxx，而非硬编码字符串

export const DOC_PATHS = {
  root: '/doc',
  dashboard: '/doc/dashboard',
  list: '/doc/list',
  documents: '/doc/documents',
  documentCenter: '/doc/document-center',
  knowledgeBase: '/doc/knowledge-base',
  documentDetail: '/doc/documents/:id',
} as const;
export interface DashboardPageProps {}

interface DocumentListPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface DocumentsPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface DocumentCenterPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface KnowledgeBasePageProps {}

interface FileDetailPageProps {
  id?: string;
  entityType?: string;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: DOC_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/doc/DashboardPage'), 'DashboardPage'),
  module: 'doc',
  code: 'doc-dashboard',
  title: i18n.t('doc.nav.doc-dashboard'),
  titleKey: 'doc.nav.doc-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['doc:dashboard:read'],
  action: 'read',
};

const documentListRoute: RouteConfigV2<DocumentListPageProps> = {
  path: DOC_PATHS.list,
  element: lazyWithRetry(() => import('@/pages/doc/DocumentListPage'), 'DocumentListPage'),
  module: 'doc',
  code: 'doc-list',
  title: i18n.t('doc.nav.doc-list'),
  titleKey: 'doc.nav.doc-list',
  template: 'list',
  group: 'master',
  requiredPermissions: ['doc:dashboard:read'],
  action: 'read',
};

const documentsRoute: RouteConfigV2<DocumentsPageProps> = {
  path: DOC_PATHS.documents,
  element: lazyWithRetry(() => import('@/pages/doc/DocumentsPage'), 'DocumentsPage'),
  module: 'doc',
  code: 'doc-documents',
  title: i18n.t('doc.nav.doc-documents'),
  titleKey: 'doc.nav.doc-documents',
  template: 'list',
  group: 'master',
  requiredPermissions: ['doc:document:read', 'doc:dashboard:read'],
  action: 'read',
};

const documentCenterRoute: RouteConfigV2<DocumentCenterPageProps> = {
  path: DOC_PATHS.documentCenter,
  element: lazyWithRetry(() => import('@/pages/doc/DocumentCenterPage'), 'DocumentCenterPage'),
  module: 'doc',
  code: 'doc-document-center',
  title: i18n.t('doc.nav.doc-document-center'),
  titleKey: 'doc.nav.doc-document-center',
  template: 'list',
  group: 'master',
  requiredPermissions: ['doc:center:read', 'doc:dashboard:read'],
  action: 'read',
};

const knowledgeBaseRoute: RouteConfigV2<KnowledgeBasePageProps> = {
  path: DOC_PATHS.knowledgeBase,
  element: lazyWithRetry(() => import('@/pages/doc/KnowledgeBasePage'), 'KnowledgeBasePage'),
  module: 'doc',
  code: 'doc-knowledge-base',
  title: i18n.t('doc.nav.doc-knowledge-base'),
  titleKey: 'doc.nav.doc-knowledge-base',
  template: 'tree',
  group: 'master',
  requiredPermissions: ['doc:dashboard:read'],
  action: 'read',
};

const fileDetailRoute: RouteConfigV2<FileDetailPageProps> = {
  path: DOC_PATHS.documentDetail,
  element: lazyWithRetry(() => import('@/pages/doc/FileDetailPage'), 'FileDetailPage'),
  module: 'doc',
  code: 'doc-file-detail',
  title: i18n.t('doc.nav.doc-file-detail'),
  titleKey: 'doc.nav.doc-file-detail',
  template: 'detail',
  group: 'master',
  requiredPermissions: ['doc:document:read', 'doc:dashboard:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const docModuleConfig: RouteModuleConfig = {
  code: 'doc',
  name: i18n.t('shared.config.doc_name'),
  nameKey: 'shared.config.doc_name',
  icon: 'FileText',
  path: DOC_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 4,
  description: i18n.t('doc.nav.module_name_desc'),
  permission: 'doc:dashboard:read',
  routes: [
    dashboardRoute,
    documentListRoute,
    documentsRoute,
    documentCenterRoute,
    knowledgeBaseRoute,
    fileDetailRoute,
  ],
};
