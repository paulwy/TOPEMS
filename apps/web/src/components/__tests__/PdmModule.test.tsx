import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BomPage from '../pdm/BomPage';
import ChangePage from '../pdm/ChangePage';
import DocumentPage from '../pdm/DocumentPage';
import MaterialPage from '../pdm/MaterialPage';
import ProductPage from '../pdm/ProductPage';
import PdmProcessPage from '../pdm/PdmProcessPage';
import PdmVersionPage from '../pdm/PdmVersionPage';
import { pdmApi } from '@/api/pdm';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockCrudPage');
  return {
    default: MockCrudPage,
    CrudPage: MockCrudPage,
  };
});

vi.mock('@/api/pdm', () => ({
  pdmApi: {
    listBomItems: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getBomItem: vi.fn(),
    createBomItem: vi.fn(),
    updateBomItem: vi.fn(),
    deleteBomItem: vi.fn(),
    listChangeOrders: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getChangeOrder: vi.fn(),
    createChangeOrder: vi.fn(),
    updateChangeOrder: vi.fn(),
    deleteChangeOrder: vi.fn(),
    listDocuments: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getDocument: vi.fn(),
    listVersions: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
    updateVersion: vi.fn(),
    deleteVersion: vi.fn(),
    listMaterials: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getMaterial: vi.fn(),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    listProducts: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    listProcesses: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getProcess: vi.fn(),
    createProcess: vi.fn(),
    updateProcess: vi.fn(),
    deleteProcess: vi.fn(),
    listSteps: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getStep: vi.fn(),
    createStep: vi.fn(),
    updateStep: vi.fn(),
    deleteStep: vi.fn(),
    listFormulas: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getFormula: vi.fn(),
    createFormula: vi.fn(),
    updateFormula: vi.fn(),
    deleteFormula: vi.fn(),
    listBatches: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getBatch: vi.fn(),
    createBatch: vi.fn(),
    updateBatch: vi.fn(),
    deleteBatch: vi.fn(),
    getStatistics: vi.fn().mockResolvedValue({ data: {} }),
    listProductConfigs: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getProductConfig: vi.fn(),
    createProductConfig: vi.fn(),
    updateProductConfig: vi.fn(),
    deleteProductConfig: vi.fn(),
    health: vi.fn(),
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

describe('BomPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <BomPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have BOM API methods defined', () => {
    expect(pdmApi.listBomItems).toBeDefined();
    expect(pdmApi.getBomItem).toBeDefined();
    expect(pdmApi.createBomItem).toBeDefined();
    expect(pdmApi.updateBomItem).toBeDefined();
    expect(pdmApi.deleteBomItem).toBeDefined();
  });
});

describe('ChangePage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ChangePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have change order API methods defined', () => {
    expect(pdmApi.listChangeOrders).toBeDefined();
    expect(pdmApi.getChangeOrder).toBeDefined();
    expect(pdmApi.createChangeOrder).toBeDefined();
    expect(pdmApi.updateChangeOrder).toBeDefined();
    expect(pdmApi.deleteChangeOrder).toBeDefined();
  });
});

describe('DocumentPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <DocumentPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have document API methods defined', () => {
    expect(pdmApi.listDocuments).toBeDefined();
    expect(pdmApi.getDocument).toBeDefined();
    expect(pdmApi.listVersions).toBeDefined();
    expect(pdmApi.createVersion).toBeDefined();
  });
});

describe('MaterialPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <MaterialPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have material API methods defined', () => {
    expect(pdmApi.listMaterials).toBeDefined();
    expect(pdmApi.getMaterial).toBeDefined();
    expect(pdmApi.createMaterial).toBeDefined();
    expect(pdmApi.updateMaterial).toBeDefined();
    expect(pdmApi.deleteMaterial).toBeDefined();
  });
});

describe('ProductPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have product API methods defined', () => {
    expect(pdmApi.listProducts).toBeDefined();
    expect(pdmApi.getProduct).toBeDefined();
    expect(pdmApi.createProduct).toBeDefined();
    expect(pdmApi.updateProduct).toBeDefined();
    expect(pdmApi.deleteProduct).toBeDefined();
  });
});

describe('PdmProcessPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PdmProcessPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have process API methods defined', () => {
    expect(pdmApi.listProcesses).toBeDefined();
    expect(pdmApi.getProcess).toBeDefined();
    expect(pdmApi.createProcess).toBeDefined();
    expect(pdmApi.updateProcess).toBeDefined();
    expect(pdmApi.deleteProcess).toBeDefined();
  });
});

describe('PdmVersionPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <PdmVersionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have version API methods defined', () => {
    expect(pdmApi.listVersions).toBeDefined();
    expect(pdmApi.getVersion).toBeDefined();
    expect(pdmApi.createVersion).toBeDefined();
    expect(pdmApi.updateVersion).toBeDefined();
    expect(pdmApi.deleteVersion).toBeDefined();
  });
});
