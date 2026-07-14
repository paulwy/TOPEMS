import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BatchManagementPage from '../wms/BatchManagementPage';
import DashboardPage from '../wms/DashboardPage';
import InboundOrderPage from '../wms/InboundOrderPage';
import InboundPage from '../wms/InboundPage';
import InventoryPage from '../wms/InventoryPage';
import InventoryReportPage from '../wms/InventoryReportPage';
import LocationPage from '../wms/LocationPage';
import OutboundOrderPage from '../wms/OutboundOrderPage';
import OutboundPage from '../wms/OutboundPage';
import ReplenishmentPage from '../wms/ReplenishmentPage';
import SerialNumberPage from '../wms/SerialNumberPage';
import StockTakePage from '../wms/StockTakePage';
import SupplierDetailPage from '../wms/SupplierDetailPage';
import SupplierManagementPage from '../wms/SupplierManagementPage';
import TransferPage from '../wms/TransferPage';
import WarehouseManagementPage from '../wms/WarehouseManagementPage';
import { useNotificationStore, useAuthStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/wms', () => ({
  wmsApi: {
    inventory: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inboundOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    outboundOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stockTakes: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    warehouses: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inventoryAlerts: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
    },
    smartReplenishment: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      listSuggestions: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      getStatistics: vi.fn().mockResolvedValue({ data: {} }),
    },
    inventoryStats: {
      getStatistics: vi.fn().mockResolvedValue({ data: {} }),
    },
    locations: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStatus: vi
        .fn()
        .mockResolvedValue({ data: { total: 0, available: 0, occupied: 0, locked: 0 } }),
      batchCreate: vi.fn().mockResolvedValue({ data: { created_count: 0, locations: [] } }),
      batchUpdate: vi.fn().mockResolvedValue({ data: { updated_count: 0 } }),
      batchDelete: vi.fn().mockResolvedValue({ data: { deleted_count: 0 } }),
    },
    transfers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    syncRecords: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
    },
    sync: {
      trigger: vi.fn(),
      status: vi.fn(),
    },
    auditLogs: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
    },
    inventoryStats: {
      getOverview: vi.fn().mockResolvedValue({ data: {} }),
      getTrend: vi.fn().mockResolvedValue({ data: [] }),
    },
    wavePicks: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
    },
    batches: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    serialNumbers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  inventoryApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  inventoryAlertsApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
  },
  inventoryStatsApi: {
    getOverview: vi.fn().mockResolvedValue({ data: {} }),
    getTrend: vi.fn().mockResolvedValue({ data: [] }),
  },
  warehouseApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  locationApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStatus: vi
      .fn()
      .mockResolvedValue({ data: { total: 0, available: 0, occupied: 0, locked: 0 } }),
    batchCreate: vi.fn().mockResolvedValue({ data: { created_count: 0, locations: [] } }),
    batchUpdate: vi.fn().mockResolvedValue({ data: { updated_count: 0 } }),
    batchDelete: vi.fn().mockResolvedValue({ data: { deleted_count: 0 } }),
  },
  inboundOrderApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  outboundOrderApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  wavePickApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
  },
  stockTakeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transferApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  smartReplenishmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
  },
  syncRecordApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
  },
  syncApi: {
    trigger: vi.fn(),
    status: vi.fn(),
  },
  auditLogApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
  },
  batchApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  serialNumberApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
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

describe('DashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <DashboardPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('WarehouseManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <WarehouseManagementPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('LocationPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <LocationPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('InventoryPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InventoryPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('InventoryReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InventoryReportPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('InboundPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InboundPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('InboundOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <InboundOrderPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('OutboundPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <OutboundPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('OutboundOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <OutboundOrderPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('TransferPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TransferPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('StockTakePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <StockTakePage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('ReplenishmentPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ReplenishmentPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('BatchManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <BatchManagementPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('SerialNumberPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SerialNumberPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('SupplierManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SupplierManagementPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });

describe('SupplierDetailPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SupplierDetailPage />
          </BrowserRouter>
        </QueryClientProvider>
      );
      expect(container).toBeDefined();
    });
  });
});
