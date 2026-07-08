import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionDashboardPage from '../mes/ProductionDashboardPage';
import { mesApi, productionOrderApi, workStationApi, qualityApi, equipmentApi, mesEquipmentApi } from '@/api/mes';
import { useAppStore } from '@/store';
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
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:production:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['mes:production:read'] },
          theme: 'light',
        }
  ),
}));

describe('MesModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProductionDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <AuthProvider>
            <ProductionDashboardPage />
          </AuthProvider>
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have MES API methods defined', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProductionDashboardPage />
          </AuthProvider>
        </BrowserRouter>
      );
      expect(productionOrderApi.list).toBeDefined();
      expect(workStationApi.list).toBeDefined();
      expect(qualityApi.list).toBeDefined();
      expect(equipmentApi.list).toBeDefined();
      expect(mesEquipmentApi.list).toBeDefined();
    });

    it('should call production orders list API on mount', async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <ProductionDashboardPage />
          </AuthProvider>
        </BrowserRouter>
      );
      expect(productionOrderApi.list).toHaveBeenCalled();
    });
  });
});
