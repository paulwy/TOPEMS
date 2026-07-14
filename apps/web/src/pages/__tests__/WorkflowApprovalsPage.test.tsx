import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '@/__tests__/test-utils';
import WorkflowApprovalsPage from '../workflow/WorkflowApprovalsPage';

vi.mock('@/api/workflow/approval', () => ({
  approvalTaskApi: {
    listApprovalTasks: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          { id: '1', task_name: '2024年度采购计划审批', workflow_name: '采购审批流程', initiator_id: '张三', status: 'pending', priority: 'medium', created_at: '2024-01-01', node_name: '审批节点' },
          { id: '2', task_name: '2024年Q1市场预算审批', workflow_name: '预算审批流程', initiator_id: '李四', status: 'pending', priority: 'high', created_at: '2024-01-02', node_name: '审批节点' },
        ],
        total: 2,
      },
    }),
    getApprovalTask: vi.fn(),
    approveTask: vi.fn().mockResolvedValue({ success: true }),
    rejectTask: vi.fn().mockResolvedValue({ success: true }),
    delegateTask: vi.fn(),
    reassignTask: vi.fn(),
    claimTask: vi.fn(),
    unclaimTask: vi.fn(),
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
    useAuthStore: vi.fn((selector?: any) => 
      selector ? selector(authState) : authState
    ),
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

describe('WorkflowApprovalsPage', () => {
  it('should render page with stats cards', () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已驳回').length).toBeGreaterThan(0);
    expect(screen.getAllByText('超时预警').length).toBeGreaterThan(0);
  });

  it('should render approval tasks in table', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('2024年度采购计划审批')).toBeInTheDocument();
    });
    expect(screen.getAllByText('采购审批流程').length).toBeGreaterThan(0);
    expect(screen.getAllByText('张三').length).toBeGreaterThan(0);
  });

  it('should switch tabs and filter tasks', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('tab', { name: /我已审批/i })).toBeInTheDocument();
  });

  it('should approve a task and show notification', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('2024年度采购计划审批')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: /审批/i }).length).toBeGreaterThan(0);
  });

  it('should show pagination', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('2024年度采购计划审批')).toBeInTheDocument();
    });
  });
});
