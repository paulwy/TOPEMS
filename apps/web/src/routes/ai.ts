import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const AiDashboardPage = lazy(() => import('../pages/ai/AiDashboardPage'));
const AiChatPage = lazy(() => import('../pages/ai/AiChatPage'));
const AiKnowledgeBasePage = lazy(() => import('../pages/ai/AiKnowledgeBasePage'));
const AiDocumentAnalysisPage = lazy(() => import('../pages/ai/AiDocumentAnalysisPage'));
const AiCodeAssistantPage = lazy(() => import('../pages/ai/AiCodeAssistantPage'));
const AiPromptLibraryPage = lazy(() => import('../pages/ai/AiPromptLibraryPage'));
const AiModelSettingsPage = lazy(() => import('../pages/ai/AiModelSettingsPage'));

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
    path: '/ai/knowledge',
    element: AiKnowledgeBasePage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/document',
    element: AiDocumentAnalysisPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/code',
    element: AiCodeAssistantPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/prompts',
    element: AiPromptLibraryPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
  {
    path: '/ai/settings',
    element: AiModelSettingsPage,
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
];
