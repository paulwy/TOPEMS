import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

const AiDashboardPage = lazyWithRetry(
  () => import('../../pages/ai/AiDashboardPage'),
  'AiDashboardPage'
);
const AiChatPage = lazyWithRetry(() => import('../../pages/ai/AiChatPage'), 'AiChatPage');
const AiKnowledgeBasePage = lazyWithRetry(
  () => import('../../pages/ai/AiKnowledgeBasePage'),
  'AiKnowledgeBasePage'
);
const AiDocumentAnalysisPage = lazyWithRetry(
  () => import('../../pages/ai/AiDocumentAnalysisPage'),
  'AiDocumentAnalysisPage'
);
const AiCodeAssistantPage = lazyWithRetry(
  () => import('../../pages/ai/AiCodeAssistantPage'),
  'AiCodeAssistantPage'
);
const AiPromptLibraryPage = lazyWithRetry(
  () => import('../../pages/ai/AiPromptLibraryPage'),
  'AiPromptLibraryPage'
);
const AiModelSettingsPage = lazyWithRetry(
  () => import('../../pages/ai/AiModelSettingsPage'),
  'AiModelSettingsPage'
);

export const aiModuleConfig: RouteModuleConfig = {
  code: 'ai',
  name: '智能助手',
  icon: 'Sparkles',
  path: '/ai',
  source: 'core',
  status: 'online',
  order: 7,
  description: 'AI对话、知识库、文档分析、代码助手',
  permission: 'ai:read',
  routes: [
    {
      path: '/ai/dashboard',
      element: AiDashboardPage,
      module: 'ai',
      code: 'ai-dashboard',
      title: 'AI助手概览',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['ai:read'],
    },
    {
      path: '/ai/chat',
      element: AiChatPage,
      module: 'ai',
      code: 'ai-chat',
      title: '智能对话',
      template: 'form',
      group: 'chat',
      requiredPermissions: ['ai:chat:read'],
    },
    {
      path: '/ai/code',
      element: AiCodeAssistantPage,
      module: 'ai',
      code: 'ai-code',
      title: '代码助手',
      template: 'form',
      group: 'chat',
      requiredPermissions: ['ai:code:read'],
    },
    {
      path: '/ai/document',
      element: AiDocumentAnalysisPage,
      module: 'ai',
      code: 'ai-document',
      title: '文档分析',
      template: 'form',
      group: 'tools',
      requiredPermissions: ['ai:document:read'],
    },
    {
      path: '/ai/knowledge',
      element: AiKnowledgeBasePage,
      module: 'ai',
      code: 'ai-knowledge',
      title: '知识库',
      template: 'list',
      group: 'knowledge',
      requiredPermissions: ['ai:knowledge:read'],
    },
    {
      path: '/ai/prompts',
      element: AiPromptLibraryPage,
      module: 'ai',
      code: 'ai-prompts',
      title: '提示词库',
      template: 'list',
      group: 'templates',
      requiredPermissions: ['ai:prompt:read'],
    },
    {
      path: '/ai/settings',
      element: AiModelSettingsPage,
      module: 'ai',
      code: 'ai-settings',
      title: '模型设置',
      template: 'settings',
      group: 'settings',
      requiredPermissions: ['ai:admin'],
    },
  ],
};
