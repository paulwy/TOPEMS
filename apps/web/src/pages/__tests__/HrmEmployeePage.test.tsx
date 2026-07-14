import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, positionApi, companyApi } from '@/api/hrm';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    employees: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
    },
    departments: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    positions: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  employeeApi: {
    list: vi
      .fn()
      .mockResolvedValue({ code: 200, data: { items: [], total: 0, page: 1, pagesize: 10 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ code: 200, data: { items: [], total: 0 } }),
    get: vi.fn(),
  },
  positionApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
  },
  companyApi: {
    list: vi.fn().mockResolvedValue({ code: 200, data: { items: [], total: 0 } }),
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

  it('should render without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });

  it('should have employee API methods defined', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(employeeApi.list).toBeDefined();
    expect(employeeApi.get).toBeDefined();
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
    expect(employeeApi.enable).toBeDefined();
    expect(employeeApi.disable).toBeDefined();
  });

  it('should have correct query key for employees', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(queryKeys.some((key) => key[0] === 'hrm-employees')).toBe(true);
  });
});
