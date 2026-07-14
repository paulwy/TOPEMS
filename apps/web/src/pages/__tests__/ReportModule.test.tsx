import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportBuilder from '../report/ReportBuilder';
import ReportDesignPage from '../report/ReportDesignPage';
import ReportPage from '../report/ReportPage';
import ReportViewer from '../report/ReportViewer';
import TemplateManagementPage from '../report/TemplateManagementPage';
import { reportApi } from '@/api/report';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/report', () => ({
  reportApi: {
    listReports: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getReport: vi.fn(),
    createReport: vi.fn(),
    createReportFromTemplate: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
    exportReport: vi.fn(),
    runReport: vi.fn(),
    listTemplates: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    listReportTypes: vi.fn().mockResolvedValue({ data: [] }),
    listSchedules: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    executeSchedule: vi.fn(),
    getExecutionHistory: vi.fn(),
    listSubscriptions: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    toggleSubscription: vi.fn(),
    getUserSubscriptions: vi.fn(),
    health: vi.fn(),
    getReportsCenterStats: vi.fn().mockResolvedValue({ data: {} }),
    exportStatsReport: vi.fn(),
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

describe('ReportBuilder', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportBuilder
            onClose={vi.fn()}
            reportTypes={[]}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.createReport).toBeDefined();
      expect(reportApi.createReportFromTemplate).toBeDefined();
      expect(reportApi.listReportTypes).toBeDefined();
    });
  });

describe('ReportDesignPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportDesignPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have template API methods defined', () => {
      expect(reportApi.listTemplates).toBeDefined();
      expect(reportApi.getTemplate).toBeDefined();
      expect(reportApi.createTemplate).toBeDefined();
      expect(reportApi.updateTemplate).toBeDefined();
      expect(reportApi.deleteTemplate).toBeDefined();
    });
  });

describe('ReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.listReports).toBeDefined();
      expect(reportApi.getReport).toBeDefined();
      expect(reportApi.deleteReport).toBeDefined();
      expect(reportApi.exportReport).toBeDefined();
      expect(reportApi.runReport).toBeDefined();
    });
  });

describe('ReportViewer', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportViewer
            report={{
              id: '1',
              config: {
                report_type: 'rs_project_progress',
                format: 'excel',
                title: '测试报表',
                columns: ['项目名称', '负责人'],
              },
              data: [],
              row_count: 0,
              created_at: '2024-01-01',
            }}
            onClose={vi.fn()}
          />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.getReport).toBeDefined();
      expect(reportApi.exportReport).toBeDefined();
    });
  });

describe('TemplateManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <TemplateManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have template management API methods defined', () => {
      expect(reportApi.listTemplates).toBeDefined();
      expect(reportApi.getTemplate).toBeDefined();
      expect(reportApi.createTemplate).toBeDefined();
      expect(reportApi.updateTemplate).toBeDefined();
      expect(reportApi.deleteTemplate).toBeDefined();
    });
  });
});
