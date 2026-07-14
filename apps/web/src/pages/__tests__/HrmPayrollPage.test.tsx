import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmPayrollPage from '../hrm/HrmPayrollPage';
import { payrollApi, payrollItemApi, employeeApi, salaryAdjustmentApi } from '@/api/hrm';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    payroll: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      calculate: vi.fn(),
      pay: vi.fn(),
    },
    payrollItems: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    salaryAdjustments: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    },
  },
  payrollApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    calculate: vi.fn(),
    approve: vi.fn(),
    pay: vi.fn(),
  },
  payrollItemApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  employeeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
  },
  salaryAdjustmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmPayrollPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have valid payroll API methods', () => {
    expect(payrollApi.list).toBeDefined();
    expect(payrollApi.get).toBeDefined();
    expect(payrollApi.create).toBeDefined();
    expect(payrollApi.update).toBeDefined();
    expect(payrollApi.delete).toBeDefined();
    expect(payrollApi.calculate).toBeDefined();
    expect(payrollApi.approve).toBeDefined();
    expect(payrollApi.pay).toBeDefined();
  });

  it('should have valid payroll items API methods', () => {
    expect(payrollItemApi.list).toBeDefined();
  });

  it('should have valid salary adjustments API methods', () => {
    expect(salaryAdjustmentApi.list).toBeDefined();
  });

  it('should call payroll list API on mount', async () => {
    render(
      <BrowserRouter>
        <HrmPayrollPage />
      </BrowserRouter>
    );
    expect(payrollApi.list).toHaveBeenCalled();
  });
});
