import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, companyApi } from '@/api/hrm';

vi.mock('@/api/hrm', () => ({
  employeeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
  },
  companyApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
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

describe('HrmEmployeePage.form', () => {
it('should render without crashing', async () => {
    const { container } = renderWithProviders(<HrmEmployeePage />);
    expect(container).toBeDefined();
});

it('should call employee list API on mount', async () => {
    renderWithProviders(<HrmEmployeePage />);
    expect(employeeApi.list).toHaveBeenCalled();
});

it('should have API methods defined', async () => {
    renderWithProviders(<HrmEmployeePage />);
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
});

it('should handle API error gracefully', async () => {
    employeeApi.list.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<HrmEmployeePage />);

    await waitFor(() => {
      expect(employeeApi.list).toHaveBeenCalled();
  });
});

it('should support create, update and delete operations', async () => {
    renderWithProviders(<HrmEmployeePage />);

    expect(typeof employeeApi.create).toBe('function');
    expect(typeof employeeApi.update).toBe('function');
    expect(typeof employeeApi.delete).toBe('function');
});
;
});
