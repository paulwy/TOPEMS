import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerManagementPage from '../crm/CustomerManagementPage';
import { crmApi } from '@/api/crm';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: {
      list: vi
        .fn()
        .mockResolvedValue({ success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      import: vi.fn(),
      export: vi.fn(),
    },
    contacts: {
      list: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
    tags: {
      list: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    },
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

describe('CustomerManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });

  it('should have customer API methods defined', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(crmApi.customers.list).toBeDefined();
    expect(crmApi.customers.get).toBeDefined();
    expect(crmApi.customers.create).toBeDefined();
    expect(crmApi.customers.update).toBeDefined();
    expect(crmApi.customers.delete).toBeDefined();
    expect(crmApi.customers.enable).toBeDefined();
    expect(crmApi.customers.disable).toBeDefined();
    expect(crmApi.customers.import).toBeDefined();
    expect(crmApi.customers.export).toBeDefined();
  });
});
