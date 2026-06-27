import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const DocumentsPage = lazy(() => import('../pages/docs/DocumentsPage'));
const DocumentsDashboardPage = lazy(() => import('../pages/docs/DocsDashboardPage'));
const DocumentCenterPage = lazy(() => import('../pages/docs/DocumentCenterPage'));
const KnowledgeBasePage = lazy(() => import('../pages/docs/KnowledgeBasePage'));
const TemplateManagementPage = lazy(() => import('../pages/report/TemplateManagementPage'));
const HelpCenterPage = lazy(() => import('../pages/shared/HelpCenterPage'));
const DocsFileDetailPage = lazy(() => import('../pages/docs/DocsFileDetailPage'));

export const docsRoutes: RouteConfig[] = [
  {
    path: '/documents',
    element: DocumentsDashboardPage,
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/document-center',
    element: DocumentCenterPage,
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/documents/:id',
    element: DocsFileDetailPage,
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/knowledge-base',
    element: KnowledgeBasePage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/templates',
    element: TemplateManagementPage,
    requiredPermissions: ['doc:admin'],
    module: 'doc',
    action: 'admin',
  },
  {
    path: '/help',
    element: HelpCenterPage,
    requiredPermissions: [],
    module: 'help',
    action: 'read',
  },
];
