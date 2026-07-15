import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsInspectionPage from '../qms/QmsInspectionPage';
import { qmsApi } from '@/api/qms';
import { useNotificationStore, useAuthStore } from '@/store';

const { mockAddNotification } = vi.hoisted(() => ({
  mockAddNotification: vi.fn(),
}));

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listChecks: vi.fn(),
    getCheck: vi.fn(),
    createCheck: vi.fn(),
    updateCheck: vi.fn(),
    deleteCheck: vi.fn(),
    assignCheck: vi.fn(),
    submitCheckResult: vi.fn(),
    auditCheck: vi.fn(),
    reworkCheck: vi.fn(),
    getCheckResults: vi.fn(),
    getCheckAudits: vi.fn(),
  },
}));
vi.mock('@/store', () => {
  const notificationState = {
    notifications: [],
    addNotification: mockAddNotification,
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  };
  return {
    useNotificationStore: vi.fn((selector?: (state: typeof notificationState) => unknown) =>
      selector ? selector(notificationState) : notificationState
    ),
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
  };
});

const mockInspections = [
  {
    id: '1',
    inspection_no: 'QC-2024-001',
    inspection_type: 'incoming',
    product_name: '零部件A',
    quantity: 100,
    status: 'pending',
    created_at: '2024-01-15',
  },
];

const renderWithProviders = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('QmsInspectionPage', () => {
  beforeEach(() => {
    mockAddNotification.mockClear();
    (qmsApi.listChecks as vi.Mock).mockResolvedValue({
      success: true,
      data: mockInspections,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsInspectionPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should render inspection statistics after loading', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(screen.getByText('检验总数')).toBeInTheDocument();
    });
  });

  it('should render inspection table', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(screen.getByText('QC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('零部件A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '零部件A' } });
    });
    await waitFor(() => {
      expect(screen.getByText('QC-2024-001')).toBeInTheDocument();
    });
  });

  it('should handle create inspection', async () => {
    (qmsApi.createCheck as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新建/ });
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createCheck).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('should handle API error', async () => {
    (qmsApi.listChecks as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
