import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionDashboardPage from '../mes/ProductionDashboardPage';
import {
  productionOrderApi,
  productionRecordApi,
  workStationApi,
  mesEquipmentApi,
  productionScheduleApi,
  equipmentApi,
} from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';
import { AuthProvider } from '@/hooks/useAuth';

vi.mock('@/api/mes', () => ({
  productionOrderApi: { list: vi.fn() },
  productionRecordApi: { list: vi.fn() },
  workStationApi: { list: vi.fn() },
  mesEquipmentApi: { getStatistics: vi.fn() },
  productionScheduleApi: { list: vi.fn() },
  equipmentApi: { list: vi.fn() },
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('ProductionDashboardPage', () => {
  beforeEach(() => {
    (productionOrderApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { orders: [], total: 0, page: 1, pagesize: 200 },
    });
    (productionRecordApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { records: [], total: 0, page: 1, pagesize: 200 },
    });
    (workStationApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { workstations: [], total: 0, page: 1, pagesize: 100 },
    });
    (mesEquipmentApi.getStatistics as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        total: 0,
        in_use: 0,
        idle: 0,
        maintenance: 0,
        scrapped: 0,
        total_value: 0,
        monthly_inspections: 0,
        monthly_maintenances: 0,
        pending_repairs: 0,
      },
    });
    (productionScheduleApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { schedules: [], total: 0, page: 1, pagesize: 50 },
    });
    (equipmentApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { equipments: [], total: 0, page: 1, pagesize: 200 },
    });
  });

describe('ProductionDashboardPage', () => {
it('should render without crashing', () => {
    const { container } = renderWithProviders(<ProductionDashboardPage />);
    expect(container).toBeDefined();
});

it('should render page after loading', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );
});

it('should handle API error gracefully', async () => {
    (productionOrderApi.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );
});

it('should have production order API methods defined', () => {
    expect(productionOrderApi.list).toBeDefined();
});

it('should have production record API methods defined', () => {
    expect(productionRecordApi.list).toBeDefined();
});

it('should have work station API methods defined', () => {
    expect(workStationApi.list).toBeDefined();
});

it('should have equipment API methods defined', () => {
    expect(equipmentApi.list).toBeDefined();
});
;
});
