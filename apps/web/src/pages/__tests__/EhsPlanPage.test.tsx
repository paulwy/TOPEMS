import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/__tests__/test-utils';
import EhsPlanPage from '../ehs/EhsPlanPage';
import { ehsApi } from '@/api/ehs';
import { useNotificationStore } from '@/store';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listPlans: vi.fn(),
    getPlan: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    listDrills: vi.fn(),
    emergency: {
      listPlans: vi.fn(),
      getPlan: vi.fn(),
      createPlan: vi.fn(),
      updatePlan: vi.fn(),
      deletePlan: vi.fn(),
      listDrills: vi.fn(),
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

const mockPlans = [
  { id: '1', plan_no: 'PL-2024-001', name: '年度安全培训计划', status: 'active' },
  { id: '2', plan_no: 'PL-2024-002', name: '应急预案演练计划', status: 'draft' },
];

describe('EhsPlanPage', () => {
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockImplementation((selector?: any) => {
      const state = {
        addNotification: mockAddNotification,
        notifications: [],
        removeNotification: vi.fn(),
        clearNotifications: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
    (ehsApi.listPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: { data: mockPlans },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('应急预案列表')).toBeInTheDocument();
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('应急预案列表')).toBeInTheDocument();
    });
  });

  it('should render plan table', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('PL-2024-001')).toBeInTheDocument();
      expect(screen.getByText('年度安全培训计划')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '培训' } });
    });
  });

  it('should handle create plan', async () => {
    (ehsApi.createPlan as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增预案/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const planNoInput = screen.getByLabelText(/预案编号/i);
      const planNameInput = screen.getByLabelText(/预案名称/i);
      fireEvent.change(planNoInput, { target: { value: 'PL-TEST-001' } });
      fireEvent.change(planNameInput, { target: { value: '测试预案' } });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createPlan).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (ehsApi.listPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EhsPlanPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
