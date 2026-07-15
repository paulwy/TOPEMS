import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDashboardPage from '../bi/BIDashboardPage';
import BIVisualizationPage from '../bi/BIVisualizationPage';
import BIReportPage from '../bi/BIReportPage';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import { biApi } from '@/api/bi';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/bi', () => ({
  biApi: {
    dashboards: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    visualizations: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reports: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      export: vi.fn(),
    },
    dataSources: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      test: vi.fn(),
    },
  },
  fetchDashboards: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
  fetchDashboard: vi.fn(),
  createDashboard: vi.fn(),
  updateDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
  cloneDashboard: vi.fn(),
  fetchDashboardTemplates: vi.fn(),
  createDashboardFromTemplate: vi.fn(),
  fetchWidgets: vi.fn().mockResolvedValue({ data: [] }),
  dataSourceCrudApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  testDataSource: vi.fn(),
  refreshDataSource: vi.fn(),
  reportCrudApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  exportReport: vi.fn(),
  dashboardApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

describe('BiModule', () => {
  describe('BIDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have dashboard API methods defined', () => {
      expect(biApi.dashboards.list).toBeDefined();
      expect(biApi.dashboards.get).toBeDefined();
      expect(biApi.dashboards.create).toBeDefined();
      expect(biApi.dashboards.update).toBeDefined();
      expect(biApi.dashboards.delete).toBeDefined();
    });
  });

  describe('BIVisualizationPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIVisualizationPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have visualization API methods defined', () => {
      expect(biApi.visualizations.list).toBeDefined();
      expect(biApi.visualizations.get).toBeDefined();
      expect(biApi.visualizations.create).toBeDefined();
      expect(biApi.visualizations.update).toBeDefined();
      expect(biApi.visualizations.delete).toBeDefined();
    });
  });

  describe('BIReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIReportPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(biApi.reports.list).toBeDefined();
      expect(biApi.reports.get).toBeDefined();
      expect(biApi.reports.create).toBeDefined();
      expect(biApi.reports.update).toBeDefined();
      expect(biApi.reports.delete).toBeDefined();
      expect(biApi.reports.export).toBeDefined();
    });
  });

  describe('BIDataSourcePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIDataSourcePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have data source API methods defined', () => {
      expect(biApi.dataSources.list).toBeDefined();
      expect(biApi.dataSources.get).toBeDefined();
      expect(biApi.dataSources.create).toBeDefined();
      expect(biApi.dataSources.update).toBeDefined();
      expect(biApi.dataSources.delete).toBeDefined();
      expect(biApi.dataSources.test).toBeDefined();
    });
  });
});
