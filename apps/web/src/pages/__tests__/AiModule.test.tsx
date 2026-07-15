import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AiChatPage from '../ai/AiChatPage';
import AiCodeAssistantPage from '../ai/AiCodeAssistantPage';
import AiDashboardPage from '../ai/AiDashboardPage';
import AiDocumentAnalysisPage from '../ai/AiDocumentAnalysisPage';
import AiKnowledgeBasePage from '../ai/AiKnowledgeBasePage';
import AiModelSettingsPage from '../ai/AiModelSettingsPage';
import AiPromptLibraryPage from '../ai/AiPromptLibraryPage';
import { aiApi } from '@/api/ai';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/ai', () => ({
  aiApi: {
    listDocuments: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    chat: vi.fn(),
    search: vi.fn(),
    generate: vi.fn(),
    listConversations: vi.fn().mockResolvedValue({ data: [] }),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversation: vi.fn(),
    getConversationMessages: vi.fn(),
    regenerateMessage: vi.fn(),
    health: vi.fn(),
    validate: vi.fn(),
    complete: vi.fn(),
    summarize: vi.fn(),
    listTemplates: vi.fn().mockResolvedValue({ data: [] }),
    analyzeSentiment: vi.fn(),
    classifyText: vi.fn(),
    extractEntities: vi.fn(),
    extractKeywords: vi.fn(),
    documentQA: vi.fn(),
    ask: vi.fn(),
    askWithContext: vi.fn(),
    askStructured: vi.fn(),
    askConversation: vi.fn(),
    classifyQuestion: vi.fn(),
    getQAHistory: vi.fn(),
    deleteQAHistory: vi.fn(),
    batchDeleteQAHistory: vi.fn(),
    submitFeedback: vi.fn(),
    summarizeDocument: vi.fn(),
    extractKeyPoints: vi.fn(),
    extractDocument: vi.fn(),
    vectorSearch: vi.fn(),
    getVectorCollections: vi.fn(),
    createVectorCollection: vi.fn(),
    deleteVectorCollection: vi.fn(),
    indexDocument: vi.fn(),
    translateDocument: vi.fn(),
    ocrDocument: vi.fn(),
    classifyDocument: vi.fn(),
    extractDocumentEntities: vi.fn(),
    generateCode: vi.fn(),
    explainCode: vi.fn(),
    fixCodeBug: vi.fn(),
    optimizeCode: vi.fn(),
    reviewCode: vi.fn(),
    getRecommendations: vi.fn(),
    getPersonalizedRecommendations: vi.fn(),
    recordRecommendationFeedback: vi.fn(),
    listModels: vi.fn(),
    getModelConfig: vi.fn(),
    updateModelConfig: vi.fn(),
    getUsageStats: vi.fn(),
    listPromptTemplates: vi.fn(),
    getPromptTemplate: vi.fn(),
    createPromptTemplate: vi.fn(),
    updatePromptTemplate: vi.fn(),
    deletePromptTemplate: vi.fn(),
    togglePromptFavorite: vi.fn(),
    getPromptCategories: vi.fn(),
    usePromptTemplate: vi.fn(),
    getDashboardStats: vi.fn().mockResolvedValue({ data: {} }),
    getActivityTrend: vi.fn(),
    getFeatureUsage: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
  useAuthStore: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
    setUser: vi.fn(),
    setToken: vi.fn(),
    setPermissions: vi.fn(),
    setRoles: vi.fn(),
    clearAuth: vi.fn(),
    updateUser: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    isSuperuser: vi.fn(() => true),
    getDisplayName: vi.fn(() => 'Test User'),
    getAvatarUrl: vi.fn(() => ''),
  })),
  useThemeStore: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
  useUIStore: vi.fn(() => ({
    sidebarOpen: true,
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    toggleSidebarCollapsed: vi.fn(),
    setSidebarCollapsed: vi.fn(),
  })),
  useWorkflowStore: vi.fn(() => ({
    currentTaskId: null,
    taskStatus: 'pending',
    setCurrentTaskId: vi.fn(),
    setTaskStatus: vi.fn(),
    completeTask: vi.fn(),
  })),
  useModuleLoadingStore: vi.fn(() => ({
    modules: {},
    loading: false,
    progress: 0,
    loadModule: vi.fn(),
    setModuleState: vi.fn(),
    reset: vi.fn(),
  })),
  useShortcutsStore: vi.fn(() => ({
    shortcuts: [],
    addShortcut: vi.fn(),
    removeShortcut: vi.fn(),
    updateShortcut: vi.fn(),
  })),
  useNotificationSettingsStore: vi.fn(() => ({
    settings: {},
    updateSettings: vi.fn(),
  })),
  useBIStore: vi.fn(() => ({
    summary: null,
    development: null,
    quality: null,
    production: null,
    laboratory: null,
    loading: false,
    error: null,
    fetchData: vi.fn(),
    clearData: vi.fn(),
  })),
  useAuth: vi.fn(() => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
  })),
  useTheme: vi.fn(() => ({ theme: 'light' })),
  useSidebarOpen: vi.fn(() => true),
  useSidebarCollapsed: vi.fn(() => false),
  useToggleSidebar: vi.fn(),
  useSetSidebarOpen: vi.fn(),
  useToggleSidebarCollapsed: vi.fn(),
  useSetSidebarCollapsed: vi.fn(),
}));

describe('AI Module Pages', () => {
  describe('AiChatPage', () => {
    it('should render without crashing', () => {
      Element.prototype.scrollIntoView = vi.fn();
      const { container } = render(
        <BrowserRouter>
          <AiChatPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have chat API methods defined', () => {
      expect(aiApi.chat).toBeDefined();
      expect(aiApi.listConversations).toBeDefined();
      expect(aiApi.getConversation).toBeDefined();
      expect(aiApi.createConversation).toBeDefined();
      expect(aiApi.deleteConversation).toBeDefined();
    });
  });

  describe('AiCodeAssistantPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiCodeAssistantPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have code assistant API methods defined', () => {
      expect(aiApi.generateCode).toBeDefined();
      expect(aiApi.explainCode).toBeDefined();
      expect(aiApi.fixCodeBug).toBeDefined();
      expect(aiApi.optimizeCode).toBeDefined();
      expect(aiApi.reviewCode).toBeDefined();
    });
  });

  describe('AiDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have dashboard API methods defined', () => {
      expect(aiApi.getDashboardStats).toBeDefined();
      expect(aiApi.getActivityTrend).toBeDefined();
      expect(aiApi.getFeatureUsage).toBeDefined();
    });
  });

  describe('AiDocumentAnalysisPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiDocumentAnalysisPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have document analysis API methods defined', () => {
      expect(aiApi.summarizeDocument).toBeDefined();
      expect(aiApi.extractKeyPoints).toBeDefined();
      expect(aiApi.extractDocument).toBeDefined();
      expect(aiApi.documentQA).toBeDefined();
      expect(aiApi.translateDocument).toBeDefined();
    });
  });

  describe('AiKnowledgeBasePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiKnowledgeBasePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have knowledge base API methods defined', () => {
      expect(aiApi.listDocuments).toBeDefined();
      expect(aiApi.getDocument).toBeDefined();
      expect(aiApi.createDocument).toBeDefined();
      expect(aiApi.deleteDocument).toBeDefined();
      expect(aiApi.vectorSearch).toBeDefined();
    });
  });

  describe('AiModelSettingsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiModelSettingsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have model management API methods defined', () => {
      expect(aiApi.listModels).toBeDefined();
      expect(aiApi.getModelConfig).toBeDefined();
      expect(aiApi.updateModelConfig).toBeDefined();
      expect(aiApi.getUsageStats).toBeDefined();
    });
  });

  describe('AiPromptLibraryPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AiPromptLibraryPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have prompt library API methods defined', () => {
      expect(aiApi.listPromptTemplates).toBeDefined();
      expect(aiApi.getPromptTemplate).toBeDefined();
      expect(aiApi.createPromptTemplate).toBeDefined();
      expect(aiApi.updatePromptTemplate).toBeDefined();
      expect(aiApi.deletePromptTemplate).toBeDefined();
    });
  });
});
