import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsAccidentPage from '../ehs/EhsAccidentPage';
import { ehsApi } from '@/api/ehs';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/ehs');
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
    (ehsApi.listAccidents as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAccidents,
    });
  });

describe('EhsAccidentPage', () => {
it('should render loading state initially', async () => {
    const { container } = await act(async () => {
      return renderWithProviders(<EhsAccidentPage />);
  });
    expect(container.querySelector('.css-1plowji-MuiPaper-root')).toBeInTheDocument();
});

it('should render page title', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
  });
    await waitFor(() => {
      expect(screen.getByText('事故记录')).toBeInTheDocument();
  });
});

it('should render accident table', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
  });
    await waitFor(() => {
      expect(screen.getByText('AC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('车间设备故障事故')).toBeInTheDocument();
  });
});

it('should handle search', async () => {
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
  });
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索事故编号、标题或地点/);
      fireEvent.change(searchInput, { target: { value: 'B区' } });
  });
});

it('should handle create accident', async () => {
    (ehsApi.createAccident as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
  });

    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
  });

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /事故上报/ });
      fireEvent.click(addButton);
  });

    await act(async () => {
      const titleInput = screen.getByLabelText(/事故标题/);
      fireEvent.change(titleInput, { target: { value: '测试事故' } });
  });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /上报/i });
      fireEvent.click(saveButton);
  });

    await waitFor(() => {
      expect(ehsApi.createAccident).toHaveBeenCalled();
  });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

it('should handle API error', async () => {
    (ehsApi.listAccidents as vi.Mock).mockRejectedValue(new Error('Network error'));
    await act(async () => {
      renderWithProviders(<EhsAccidentPage />);
  });

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
});
;
});
