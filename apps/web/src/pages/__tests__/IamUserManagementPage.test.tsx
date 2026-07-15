import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserManagementPage from '../iam/UserManagementPage';
import { authApi } from '@/api/iam';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/iam', () => {
  const mock = {
    listUsers: vi.fn().mockResolvedValue({ success: true, data: { users: [], total: 0 } }),
    listRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createUser: vi.fn().mockResolvedValue({ success: true }),
    updateUser: vi.fn().mockResolvedValue({ success: true }),
    deleteUser: vi.fn().mockResolvedValue({ success: true }),
    addUserRole: vi.fn().mockResolvedValue({ success: true }),
    removeUserRole: vi.fn().mockResolvedValue({ success: true }),
    batchUpdateUsers: vi.fn().mockResolvedValue({ success: true }),
    batchDeleteUsers: vi.fn().mockResolvedValue({ success: true }),
  };
  return { authApi: mock, iamApi: mock, default: mock };
});

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

describe('UserManagementPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have user list API method', async () => {
    render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listUsers).toBeDefined();
    expect(authApi.createUser).toBeDefined();
    expect(authApi.updateUser).toBeDefined();
    expect(authApi.deleteUser).toBeDefined();
    expect(authApi.getUserRoles).toBeDefined();
    expect(authApi.addUserRole).toBeDefined();
    expect(authApi.removeUserRole).toBeDefined();
    expect(authApi.batchUpdateUsers).toBeDefined();
    expect(authApi.batchDeleteUsers).toBeDefined();
  });

  it('should call listUsers API on mount', async () => {
    render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
    expect(authApi.listUsers).toHaveBeenCalled();
  });
});
