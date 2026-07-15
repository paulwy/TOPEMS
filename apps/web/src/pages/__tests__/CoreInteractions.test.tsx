import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkStationPage from '../mes/WorkStationPage';
import { mesApi } from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';

const mockAddNotification = vi.fn();

const mockWorkStations = [
  { id: '1', name: '焊接工作站', code: 'WS-WELD-001', status: 'active' },
  { id: '2', name: '装配工作站', code: 'WS-ASSY-001', status: 'active' },
];

vi.mock('@/api/mes', () => ({
  mesApi: {
    workstations: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

const queryClient = new QueryClient();

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CoreInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (mesApi.workstations.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        workstations: mockWorkStations,
        total: mockWorkStations.length,
        page: 0,
        pagesize: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<WorkStationPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render workstation data after loading', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
      expect(screen.getByText('WS-WELD-001')).toBeInTheDocument();
      expect(screen.getByText('装配工作站')).toBeInTheDocument();
    });
  });

  it('should filter workstations by search term', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/搜索/);
    fireEvent.change(searchInput, { target: { value: '焊接' } });

    await waitFor(() => {
      expect(mesApi.workstations.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: '焊接' })
      );
    });
  });

  it('should handle API error gracefully', async () => {
    (mesApi.workstations.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  it('should open create dialog when clicking add button', async () => {
    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /新增工作站/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should create workstation successfully', async () => {
    (mesApi.workstations.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<WorkStationPage />);
    await waitFor(() => {
      expect(screen.getByText('焊接工作站')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /新增工作站/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/工作站名称/i);
    fireEvent.change(nameInput, { target: { value: '测试工作站' } });

    const codeInput = screen.getByLabelText(/编码/i);
    fireEvent.change(codeInput, { target: { value: 'WS-TEST' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mesApi.workstations.create).toHaveBeenCalled();
    });
  });
});

describe('SrmOrderPage Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have srmApi purchase order methods defined', async () => {
    const { srmApi } = await import('@/api/srm');
    expect(srmApi.listPurchaseOrders).toBeDefined();
    expect(srmApi.createPurchaseOrder).toBeDefined();
    expect(srmApi.updatePurchaseOrder).toBeDefined();
    expect(srmApi.deletePurchaseOrder).toBeDefined();
  });
});
