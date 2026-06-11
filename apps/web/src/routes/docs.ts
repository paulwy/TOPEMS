import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const DocumentCenterPage = lazy(() => import('../pages/DocumentCenterPage'));
const KnowledgeBasePage = lazy(() => import('../pages/KnowledgeBasePage'));
const TemplateManagementPage = lazy(() => import('../pages/TemplateManagementPage'));
const HelpCenterPage = lazy(() => import('../pages/HelpCenterPage'));

export const docsRoutes: RouteConfig[] = [
  {
    path: '/documents',
    element: React.createElement(DocumentsPage),
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/document-center',
    element: React.createElement(DocumentCenterPage),
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/knowledge-base',
    element: React.createElement(KnowledgeBasePage),
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/templates',
    element: React.createElement(TemplateManagementPage),
    requiredPermissions: ['doc:admin'],
    module: 'doc',
    action: 'admin',
  },
  {
    path: '/help',
    element: React.createElement(HelpCenterPage),
    requiredPermissions: [],
    module: 'help',
    action: 'read',
  },
];
