import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportSchedulePage from '../report/ReportSchedulePage';
import { reportApi } from '@/api/report';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/report', () => ({
  reportApi: {
    listSchedules: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    executeSchedule: vi.fn(),
    getExecutionHistory: vi.fn(),
    listTemplates: vi.fn(),
    listSubscriptions: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
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

const mockSchedules = [
  { id: 'sch-001', name: '销售月报', cron: '0 0 1 * *', status: 'active', template_id: 'tpl-001' },
];

const renderWithProviders = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('ReportSchedulePage', () => {
  beforeEach(() => {
    (useNotificationStore as any).getState = vi.fn().mockReturnValue({
      addNotification: mockAddNotification,
      notifications: [],
      removeNotification: vi.fn(),
      clearNotifications: vi.fn(),
    });
    (reportApi.listSchedules as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSchedules,
    });
    (reportApi.createSchedule as vi.Mock).mockResolvedValue({
      success: true,
      data: { id: 'sch-002' },
    });
    (reportApi.deleteSchedule as vi.Mock).mockResolvedValue({
      success: true,
    });
    (reportApi.listTemplates as vi.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
    (reportApi.executeSchedule as vi.Mock).mockResolvedValue({
      success: true,
    });
    (reportApi.getExecutionHistory as vi.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<ReportSchedulePage />);
    expect(
      await screen.findByRole('heading', { name: '定时任务管理' }, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  it('should render schedule list', async () => {
    renderWithProviders(<ReportSchedulePage />);
    await waitFor(() => {
      expect(screen.getByText('销售月报')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (reportApi.listSchedules as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ReportSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
