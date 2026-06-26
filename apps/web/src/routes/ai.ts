import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const AiDashboardPage = lazy(() => import('../pages/ai/DashboardPage'));
const AiChatPage = lazy(() => import('../pages/ai/AiChatPage'));
const AIPage = lazy(() => import('../pages/shared/AIPage'));

export const aiRoutes: RouteConfig[] = [
  {
    path: '/ai',
    element: AiDashboardPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/chat',
    element: AiChatPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/assistant',
    element: AIPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
];
