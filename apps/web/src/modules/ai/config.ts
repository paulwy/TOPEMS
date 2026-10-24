import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 AI_PATHS.xxx，而非硬编码字符串

export const AI_PATHS = {
  root: '/ai',
  dashboard: '/ai/dashboard',
  chat: '/ai/chat',
  code: '/ai/code',
  document: '/ai/document',
  knowledge: '/ai/knowledge',
  prompts: '/ai/prompts',
  settings: '/ai/settings',
  assistant: '/ai/assistant',
  difyChat: '/ai/dify-chat',
  businessCopilot: '/ai/businessCopilot',
  governanceDashboard: '/ai/governanceDashboard',
} as const;
interface AiDashboardPageProps {}

interface AiChatPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface AiCodeAssistantPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface AiDocumentAnalysisPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface AiKnowledgeBasePageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AiPromptLibraryPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface AiModelSettingsPageProps {}

interface AiAssistantPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface DifyChatPageProps {
  mode?: 'create' | 'edit' | 'view';
  initialValues?: Record<string, unknown>;
}

interface BusinessCopilotPageProps {
  module?: string;
}

interface GovernanceDashboardPageProps {
  timeRange?: string;
}

const aiDashboardRoute: RouteConfigV2<AiDashboardPageProps> = {
  path: AI_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/ai/AiDashboardPage'), '@/pages/ai/AiDashboardPage'),
  module: 'ai',
  code: 'ai-dashboard',
  title: i18n.t('ai.nav.ai-dashboard'),
  titleKey: 'ai.nav.ai-dashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['ai:dashboard:read'],
  action: 'read',
};

const aiChatRoute: RouteConfigV2<AiChatPageProps> = {
  path: AI_PATHS.chat,
  element: lazyWithRetry(() => import('@/pages/ai/AiChatPage'), '@/pages/ai/AiChatPage'),
  module: 'ai',
  code: 'ai-chat',
  title: i18n.t('ai.nav.ai-chat'),
  titleKey: 'ai.nav.ai-chat',
  template: 'form',
  group: 'process',
  requiredPermissions: ['ai:chat:read', 'ai:dashboard:read'],
  action: 'read',
};

const aiCodeAssistantRoute: RouteConfigV2<AiCodeAssistantPageProps> = {
  path: AI_PATHS.code,
  element: lazyWithRetry(
    () => import('@/pages/ai/AiCodeAssistantPage'),
    '@/pages/ai/AiCodeAssistantPage'
  ),
  module: 'ai',
  code: 'ai-code',
  title: i18n.t('ai.nav.ai-code'),
  titleKey: 'ai.nav.ai-code',
  template: 'form',
  group: 'process',
  requiredPermissions: ['ai:code:read', 'ai:dashboard:read'],
  action: 'read',
};

const aiDocumentAnalysisRoute: RouteConfigV2<AiDocumentAnalysisPageProps> = {
  path: AI_PATHS.document,
  element: lazyWithRetry(
    () => import('@/pages/ai/AiDocumentAnalysisPage'),
    '@/pages/ai/AiDocumentAnalysisPage'
  ),
  module: 'ai',
  code: 'ai-document',
  title: i18n.t('ai.nav.ai-document'),
  titleKey: 'ai.nav.ai-document',
  template: 'form',
  group: 'business',
  requiredPermissions: ['ai:document:read', 'ai:dashboard:read'],
  action: 'read',
};

const aiKnowledgeBaseRoute: RouteConfigV2<AiKnowledgeBasePageProps> = {
  path: AI_PATHS.knowledge,
  element: lazyWithRetry(
    () => import('@/pages/ai/AiKnowledgeBasePage'),
    '@/pages/ai/AiKnowledgeBasePage'
  ),
  module: 'ai',
  code: 'ai-knowledge',
  title: i18n.t('ai.nav.ai-knowledge'),
  titleKey: 'ai.nav.ai-knowledge',
  template: 'list',
  group: 'business',
  requiredPermissions: ['ai:knowledge:read', 'ai:dashboard:read'],
  action: 'read',
};

const aiPromptLibraryRoute: RouteConfigV2<AiPromptLibraryPageProps> = {
  path: AI_PATHS.prompts,
  element: lazyWithRetry(
    () => import('@/pages/ai/AiPromptLibraryPage'),
    '@/pages/ai/AiPromptLibraryPage'
  ),
  module: 'ai',
  code: 'ai-prompts',
  title: i18n.t('ai.nav.ai-prompts'),
  titleKey: 'ai.nav.ai-prompts',
  template: 'list',
  group: 'setting',
  requiredPermissions: ['ai:prompt:read', 'ai:dashboard:read'],
  action: 'read',
};

const aiModelSettingsRoute: RouteConfigV2<AiModelSettingsPageProps> = {
  path: AI_PATHS.settings,
  element: lazyWithRetry(
    () => import('@/pages/ai/AiModelSettingsPage'),
    '@/pages/ai/AiModelSettingsPage'
  ),
  module: 'ai',
  code: 'ai-settings',
  title: i18n.t('ai.nav.ai-settings'),
  titleKey: 'ai.nav.ai-settings',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['ai:dashboard:admin', 'ai:dashboard:write'],
  action: 'admin',
};

const aiAssistantRoute: RouteConfigV2<AiAssistantPageProps> = {
  path: AI_PATHS.assistant,
  element: lazyWithRetry(() => import('@/pages/ai/AiAssistantPage'), '@/pages/ai/AiAssistantPage'),
  module: 'ai',
  code: 'ai-assistant',
  title: i18n.t('ai.nav.ai-assistant'),
  titleKey: 'ai.nav.ai-assistant',
  template: 'form',
  group: 'process',
  requiredPermissions: ['ai:dashboard:read'],
  action: 'read',
};

const difyChatRoute: RouteConfigV2<DifyChatPageProps> = {
  path: AI_PATHS.difyChat,
  element: lazyWithRetry(() => import('@/pages/ai/DifyChatPage'), '@/pages/ai/DifyChatPage'),
  module: 'ai',
  code: 'ai-dify-chat',
  title: i18n.t('ai.nav.ai-dify-chat'),
  titleKey: 'ai.nav.ai-dify-chat',
  template: 'form',
  group: 'process',
  requiredPermissions: ['ai:chat:read', 'ai:dashboard:read'],
  action: 'read',
};

const businessCopilotRoute: RouteConfigV2<BusinessCopilotPageProps> = {
  path: AI_PATHS.businessCopilot,
  element: lazyWithRetry(
    () => import('@/pages/ai/BusinessCopilotPage'),
    '@/pages/ai/BusinessCopilotPage'
  ),
  module: 'ai',
  code: 'ai-businessCopilot',
  title: i18n.t('ai.nav.ai-businessCopilot'),
  titleKey: 'ai.nav.ai-businessCopilot',
  template: 'form',
  group: 'business',
  requiredPermissions: ['ai:dashboard:read'],
  action: 'read',
};

const governanceDashboardRoute: RouteConfigV2<GovernanceDashboardPageProps> = {
  path: AI_PATHS.governanceDashboard,
  element: lazyWithRetry(
    () => import('@/pages/ai/GovernanceDashboardPage'),
    '@/pages/ai/GovernanceDashboardPage'
  ),
  module: 'ai',
  code: 'ai-governanceDashboard',
  title: i18n.t('ai.nav.ai-governanceDashboard'),
  titleKey: 'ai.nav.ai-governanceDashboard',
  template: 'dashboard',
  group: 'overview',
  requiredPermissions: ['ai:dashboard:read', 'ai:governance:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const aiModuleConfig: RouteModuleConfig = {
  code: 'ai',
  name: i18n.t('shared.config.ai_name'),
  nameKey: 'shared.config.ai_name',
  icon: 'Sparkles',
  path: AI_PATHS.root,
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 7,
  description: i18n.t('ai.nav.module_name_desc'),
  permission: 'ai:dashboard:read',
  routes: [
    aiDashboardRoute,
    aiChatRoute,
    aiCodeAssistantRoute,
    aiDocumentAnalysisRoute,
    aiKnowledgeBaseRoute,
    aiPromptLibraryRoute,
    aiModelSettingsRoute,
    aiAssistantRoute,
    difyChatRoute,
    businessCopilotRoute,
    governanceDashboardRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const aiNavConfig: ModuleNavConfig = {
  code: 'ai',
  name: i18n.t('ai.nav.module_name'),
  nameKey: 'ai.nav.module_name',
  icon: 'Sparkles',
  path: AI_PATHS.root,
  permission: 'ai:dashboard:read',
  source: 'core',
  suite: 'platform',
  status: 'online',
  order: 7,
  description: i18n.t('ai.nav.module_name_desc'),
  navItems: [
    {
      code: 'ai-dashboard',
      label: i18n.t('ai.nav.ai-dashboard'),
      labelKey: 'ai.nav.ai-dashboard',
      icon: 'LayoutDashboard',
      path: AI_PATHS.dashboard,
      permission: 'ai:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-dashboard_desc'),
    },
    {
      code: 'ai-chat',
      label: i18n.t('ai.nav.ai-chat'),
      labelKey: 'ai.nav.ai-chat',
      icon: 'MessageSquare',
      path: AI_PATHS.chat,
      permission: 'ai:chat:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-chat_desc'),
    },
    {
      code: 'ai-code',
      label: i18n.t('ai.nav.ai-code'),
      labelKey: 'ai.nav.ai-code',
      icon: 'Code',
      path: AI_PATHS.code,
      permission: 'ai:code:read',
      order: 2,
      group: 'process',
      description: i18n.t('ai.nav.ai-code_desc'),
    },
    {
      code: 'ai-document',
      label: i18n.t('ai.nav.ai-document'),
      labelKey: 'ai.nav.ai-document',
      icon: 'FileText',
      path: AI_PATHS.document,
      permission: 'ai:document:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-document_desc'),
    },
    {
      code: 'ai-knowledge',
      label: i18n.t('ai.nav.ai-knowledge'),
      labelKey: 'ai.nav.ai-knowledge',
      icon: 'BookOpen',
      path: AI_PATHS.knowledge,
      permission: 'ai:knowledge:read',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-knowledge_desc'),
    },
    {
      code: 'ai-prompts',
      label: i18n.t('ai.nav.ai-prompts'),
      labelKey: 'ai.nav.ai-prompts',
      icon: 'Library',
      path: AI_PATHS.prompts,
      permission: 'ai:prompt:read',
      order: 1,
      group: 'setting',
      description: i18n.t('ai.nav.ai-prompts_desc'),
    },
    {
      code: 'ai-settings',
      label: i18n.t('ai.nav.ai-settings'),
      labelKey: 'ai.nav.ai-settings',
      icon: 'Settings',
      path: AI_PATHS.settings,
      permission: 'ai:dashboard:admin',
      order: 2,
      group: 'setting',
      description: i18n.t('ai.nav.ai-settings_desc'),
    },
    {
      code: 'ai-assistant',
      label: i18n.t('ai.nav.ai-assistant'),
      labelKey: 'ai.nav.ai-assistant',
      icon: 'Sparkles',
      path: AI_PATHS.assistant,
      permission: 'ai:dashboard:read',
      order: 3,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-assistant_desc'),
    },
    {
      code: 'ai-dify-chat',
      label: i18n.t('ai.nav.ai-dify-chat'),
      labelKey: 'ai.nav.ai-dify-chat',
      icon: 'Bot',
      path: AI_PATHS.difyChat,
      permission: 'ai:chat:read',
      order: 4,
      group: 'process',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-dify-chat_desc'),
    },
    {
      code: 'ai-businessCopilot',
      label: i18n.t('ai.nav.ai-businessCopilot'),
      labelKey: 'ai.nav.ai-businessCopilot',
      icon: 'Briefcase',
      path: AI_PATHS.businessCopilot,
      permission: 'ai:dashboard:read',
      order: 3,
      group: 'business',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-businessCopilot_desc'),
    },
    {
      code: 'ai-governanceDashboard',
      label: i18n.t('ai.nav.ai-governanceDashboard'),
      labelKey: 'ai.nav.ai-governanceDashboard',
      icon: 'Shield',
      path: AI_PATHS.governanceDashboard,
      permission: 'ai:governance:read',
      order: 1,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('ai.nav.ai-governanceDashboard_desc'),
    },
  ],
};
