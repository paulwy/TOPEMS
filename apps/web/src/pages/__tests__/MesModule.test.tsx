import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionDashboardPage from '../mes/ProductionDashboardPage';
import {
  mesApi,
  productionOrderApi,
  workStationApi,
  qualityApi,
  equipmentApi,
  mesEquipmentApi,
} from '@/api/mes';
import { useNotificationStore, useAuthStore } from '@/store';
import { AuthProvider } from '@/hooks/useAuth';

vi.mock('@/api/mes', () => ({
  mesApi: {
    orders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      start: vi.fn(),
      complete: vi.fn(),
      cancel: vi.fn(),
    },
    productionOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      start: vi.fn(),
      complete: vi.fn(),
      cancel: vi.fn(),
    },
    products: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workstations: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      updateStatus: vi.fn(),
    },
    quality: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
    },
    equipment: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      maintenance: vi.fn(),
    },
    kanban: {
      getDashboardData: vi.fn().mockResolvedValue({ data: {} }),
    },
  },
  productionOrderApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  },
  productionRecordApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
  },
  workStationApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    updateStatus: vi.fn(),
  },
  qualityApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
  },
  equipmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    maintenance: vi.fn(),
  },
  mesEquipmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ data: [] }),
    getOee: vi.fn().mockResolvedValue({ data: {} }),
  },
  productionScheduleApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  equipmentOeeApi: {
    getSummary: vi.fn().mockResolvedValue({ data: {} }),
    getTrend: vi.fn().mockResolvedValue({ data: [] }),
  },
  productionKanbanApi: {
    getDashboardData: vi.fn().mockResolvedValue({ data: {} }),
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
  it('should render without crashing', () => {
    const { container } = renderWithProviders(<ProductionDashboardPage />);
    expect(container).toBeDefined();
  });

  it('should have MES API methods defined', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    expect(productionOrderApi.list).toBeDefined();
    expect(workStationApi.list).toBeDefined();
    expect(qualityApi.list).toBeDefined();
    expect(equipmentApi.list).toBeDefined();
    expect(mesEquipmentApi.list).toBeDefined();
  });

  it('should call production orders list API on mount', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    expect(productionOrderApi.list).toHaveBeenCalled();
  });
});
