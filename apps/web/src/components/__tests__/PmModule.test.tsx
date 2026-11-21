import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../pm/DashboardPage';
import PmContractCreatePage from '../pm/PmContractCreatePage';
import PmContractDetailPage from '../pm/PmContractDetailPage';
import PmContractListPage from '../pm/PmContractListPage';
import PmProjectCreatePage from '../pm/PmProjectCreatePage';
import PmProjectDetailPage from '../pm/PmProjectDetailPage';
import PmProjectListPage from '../pm/PmProjectListPage';
import PmReportPage from '../pm/PmReportPage';
import PmResourcePage from '../pm/PmResourcePage';
import PmTemplatePage from '../pm/PmTemplatePage';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/components/common', () => {
  const MockPageContainer = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockPageContainer');
  const MockGrid = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockGrid');
  const MockConfirmDialog = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockConfirmDialog');
  const MockActionButton = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('button', null, children || 'MockActionButton');
  return {
    PageContainer: MockPageContainer,
    Grid: MockGrid,
    ConfirmDialog: MockConfirmDialog,
    ActionButton: MockActionButton,
  };
});

vi.mock('@/components/templates', () => {
  const MockDetailPageTemplate = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockDetailPageTemplate');
  const MockListPageTemplate = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockListPageTemplate');
  const MockFormPageTemplate = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockFormPageTemplate');
  const MockCrudPage = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockCrudPage');
  const MockDashboardTemplate = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockDashboardTemplate');
  return {
    DetailPageTemplate: MockDetailPageTemplate,
    ListPageTemplate: MockListPageTemplate,
    FormPageTemplate: MockFormPageTemplate,
    CrudPage: MockCrudPage,
    DashboardTemplate: MockDashboardTemplate,
  };
});

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockCrudPage');
  return {
    default: MockCrudPage,
    CrudPage: MockCrudPage,
  };
});

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

describe('DashboardPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmContractCreatePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmContractCreatePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmContractDetailPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmContractDetailPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmContractListPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmContractListPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmProjectCreatePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmProjectCreatePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmProjectDetailPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmProjectDetailPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmProjectListPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmProjectListPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmReportPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmReportPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmResourcePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmResourcePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});

describe('PmTemplatePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PmTemplatePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });
});
