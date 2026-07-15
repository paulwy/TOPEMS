import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIComparisonPage from '../bi/BIComparisonPage';
import { getComparisonResult, runComparison, listComparisons } from '@/api/bi';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/bi');
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

const mockComparisonResult = {
  success: true,
  data: {
    id: 'cmp-001',
    comparison_id: 'cmp-001',
    status: 'success' as const,
    data: [{ indicator: '销售额', value_a: 1000, value_b: 800, difference: 200, change_rate: 25 }],
    generated_at: '2024-01-01T00:00:00Z',
  },
};

const mockComparisonsResult = {
  success: true,
  data: {
    items: [{ id: 'cmp-001', name: '销售额', metric: '销售额' }],
  },
};

function renderWithProviders(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('BIComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (getComparisonResult as vi.Mock).mockResolvedValue(mockComparisonResult);
    (runComparison as vi.Mock).mockResolvedValue(mockComparisonResult);
    (listComparisons as vi.Mock).mockResolvedValue(mockComparisonsResult);
  });

  it('should render page title', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getByText('数据对比分析')).toBeInTheDocument();
    });
  });

  it('should render comparison list', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getAllByText('销售额').length).toBeGreaterThan(0);
    });
  });

  it('should handle API error', async () => {
    (getComparisonResult as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIComparisonPage />);

    await waitFor(() => {
      expect(screen.getByText('数据对比分析')).toBeInTheDocument();
    });
  });
});
