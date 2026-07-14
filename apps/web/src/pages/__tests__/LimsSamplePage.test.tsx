import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsSamplePage from '../lims/LimsSamplePage';
import { limsApi } from '@/api/lims';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/lims', () => ({
  limsApi: {
    listSamples: vi.fn(),
    getSample: vi.fn(),
    createSample: vi.fn(),
    updateSample: vi.fn(),
    deleteSample: vi.fn(),
    batchCreateSamples: vi.fn(),
    batchDeleteSamples: vi.fn(),
    exportSamples: vi.fn(),
    importSamples: vi.fn(),
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
    useNotificationStore.getState.mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (limsApi.listSamples as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSamples,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '样品管理' })).toBeInTheDocument();
    });
  });

  it('should render sample table', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByText('SMP-2024-001')).toBeInTheDocument();
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });
  });

  it('should render statistics cards', async () => {
    renderWithProviders(<LimsSamplePage />);
    await waitFor(() => {
      expect(screen.getByText('样品总数')).toBeInTheDocument();
    });
  });

  it('should handle create sample', async () => {
    (limsApi.createSample as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<LimsSamplePage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /样品登记/ });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '样品登记' })).toBeInTheDocument();
    });

    await act(async () => {
      const nameInput = screen.getByLabelText(/样品名称/);
      fireEvent.change(nameInput, { target: { value: '测试样品' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(limsApi.createSample).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

  it('should handle API error', async () => {
    (limsApi.listSamples as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsSamplePage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });
});
