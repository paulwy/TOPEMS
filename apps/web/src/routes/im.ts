import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const Impage = lazy(() => import('../pages/shared/Impage'));
const MailPage = lazy(() => import('../pages/common/MailPage'));
const AIPage = lazy(() => import('../pages/ai/DashboardPage'));
const DocumentsPage = lazy(() => import('../pages/common/DocumentsPage'));
const KnowledgeBasePage = lazy(() => import('../pages/common/KnowledgeBasePage'));

export const imRoutes: RouteConfig[] = [
  {
    path: '/im',
    element: Impage,
    requiredPermissions: ['im:read'],
    module: 'im',
    action: 'read',
  },
  {
    path: '/mail',
    element: MailPage,
    requiredPermissions: ['mail:read'],
    module: 'im',
    action: 'read',
  },
  {
    path: '/ai',
    element: AIPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/knowledge-base',
    element: KnowledgeBasePage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
];
