import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LimsSampleDetailPage from '../lims/LimsSampleDetailPage';
import { limsApi } from '@/api/lims';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/lims');
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
const mockAddNotification = vi.fn();

const mockSampleDetail = {
  id: 'SMP-2024-001',
  sample_no: 'SMP-2024-001',
  name: '土壤样本A',
  status: 'pending',
  type: 'soil',
  source: 'A区',
  collected_at: '2024-01-10T10:00:00Z',
  created_at: '2024-01-10T10:00:00Z',
};

function renderWithProviders() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/lims/samples/SMP-2024-001']}>
        <Routes>
          <Route
            path='/lims/samples/:id'
            element={<LimsSampleDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LimsSampleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (limsApi.getSample as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSampleDetail,
    });
    (limsApi.listTasksBySample as vi.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  it('should render page title', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should render sample details', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('SMP-2024-001')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (limsApi.getSample as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('样品不存在或已被删除')).toBeInTheDocument();
    });
  });
});
