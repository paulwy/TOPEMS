import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsAuditManagementPage from '../qms/QmsAuditManagementPage';
import { qmsApi } from '@/api/qms';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listAuditPlans: vi.fn(),
    createAuditPlan: vi.fn(),
    getStatistics: vi.fn(),
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
    (useNotificationStore.getState as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (qmsApi.listAuditPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAuditPlans,
    });
  });

describe('QmsAuditManagementPage', () => {
it('should render loading state initially', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
});

it('should render page title', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '审核管理' })).toBeInTheDocument();
  });
});

it('should render audit table', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('AU-2024-001')).toBeInTheDocument();
      expect(screen.getByText('2024年内部审核')).toBeInTheDocument();
  });
});

it('should handle search', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '2024' } });
  });
});

it('should render audit statistics', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('审核总数')).toBeInTheDocument();
  });
});

it('should handle API error', async () => {
    (qmsApi.listAuditPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
});
;
});
