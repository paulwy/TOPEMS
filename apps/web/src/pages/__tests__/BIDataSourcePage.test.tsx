import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import {
  listDataSources,
  deleteDataSource,
  testDataSource,
  refreshDataSource,
  dataSourceCrudApi,
} from '@/api/bi';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/bi', () => ({
  listDataSources: vi.fn(),
  deleteDataSource: vi.fn(),
  testDataSource: vi.fn(),
  refreshDataSource: vi.fn(),
  dataSourceCrudApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: { items: [], total: 0 },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

const mockAddNotification = vi.fn();

const mockDataSources = [
  { id: 'ds-001', name: 'MySQL数据库', type: 'mysql', status: 'active' },
  { id: 'ds-002', name: 'PostgreSQL数据库', type: 'postgresql', status: 'active' },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('BIDataSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockImplementation((selector?: any) =>
      selector
        ? selector({
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          })
        : {
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          }
    );
    (listDataSources as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        items: mockDataSources,
        total: mockDataSources.length,
      },
    });
    (dataSourceCrudApi.list as vi.Mock).mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: {
        items: mockDataSources,
        total: mockDataSources.length,
      },
    });
    (deleteDataSource as vi.Mock).mockResolvedValue({ success: true });
    (testDataSource as vi.Mock).mockResolvedValue({ success: true });
    (refreshDataSource as vi.Mock).mockResolvedValue({ success: true });
  });
});

describe('BIDataSourcePage', () => {
  it('should render page title', async () => {
    renderWithProviders(<BIDataSourcePage />);
    expect(
      await screen.findByRole('heading', { name: '数据源管理' }, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  it('should render data source list', async () => {
    renderWithProviders(<BIDataSourcePage />);
    await waitFor(() => {
      expect(screen.getByText('MySQL数据库')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (listDataSources as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIDataSourcePage />);

    await waitFor(async () => {
      expect(await screen.findByRole('heading', { name: '数据源管理' })).toBeInTheDocument();
    });
  });
});
