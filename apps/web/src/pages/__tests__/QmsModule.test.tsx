import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsDashboardPage from '../qms/QmsDashboardPage';
import QmsQualityControlPage from '../qms/QmsQualityControlPage';
import QmsInspectionPage from '../qms/QmsInspectionPage';
import QmsNonconformancePage from '../qms/QmsNonconformancePage';
import { qmsApi } from '@/api/qms';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/qms', () => ({
  useQmsMock: () => ({ data: {}, mockEnabled: false, refresh: () => {} }),
  qmsApi: {
    dashboard: {
      getStatistics: vi.fn().mockResolvedValue({ data: {} }),
    },
    getQualityOverview: vi.fn().mockResolvedValue({ data: {} }),
    listChecks: vi.fn().mockResolvedValue({ data: [] }),
    qualityControl: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      implement: vi.fn(),
    },
    inspections: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
      approve: vi.fn(),
    },
    nonconformances: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      close: vi.fn(),
    },
    standards: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    audits: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  inspectionApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  nonconformanceApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/store', () => {
  const notificationState = {
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  };

  const authState = {
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
  };

  return {
    useNotificationStore: vi.fn((selector?: any) =>
      selector ? selector(notificationState) : notificationState
    ),
    useAuthStore: vi.fn((selector?: any) => (selector ? selector(authState) : authState)),
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
  };
});

describe('QmsDashboardPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsDashboardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('QmsQualityControlPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsQualityControlPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('QmsInspectionPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsInspectionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('QmsNonconformancePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsNonconformancePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});
