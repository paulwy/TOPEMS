import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsHazardPage from '../ehs/EhsHazardPage';
import { ehsApi } from '@/api/ehs';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listSafetyIssues: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    getSafetyIssue: vi.fn(),
    createSafetyIssue: vi.fn(),
    updateSafetyIssue: vi.fn(),
    deleteSafetyIssue: vi.fn(),
    startRectification: vi.fn(),
    submitRectification: vi.fn(),
    verifySafetyIssue: vi.fn(),
    closeSafetyIssue: vi.fn(),
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

describe('EhsHazardPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});
describe('EhsHazardPage', () => {
  it('should have safety issue API methods defined', () => {
    render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(ehsApi.listSafetyIssues).toBeDefined();
    expect(ehsApi.createSafetyIssue).toBeDefined();
    expect(ehsApi.getSafetyIssue).toBeDefined();
    expect(ehsApi.updateSafetyIssue).toBeDefined();
  });

  it('should call listSafetyIssues API on mount', () => {
    render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(ehsApi.listSafetyIssues).toHaveBeenCalled();
  });
});
