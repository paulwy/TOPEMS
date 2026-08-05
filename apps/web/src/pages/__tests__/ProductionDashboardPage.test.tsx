import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionDashboardPage from '../mes/ProductionDashboardPage';
import {
  productionOrderApi,
  productionRecordApi,
  workStationApi,
  mesEquipmentApi,
  productionScheduleApi,
  equipmentApi,
} from '@/api/mes';

vi.mock('@/api/mes', () => ({
  productionOrderApi: { list: vi.fn() },
  productionRecordApi: { list: vi.fn() },
  workStationApi: { list: vi.fn() },
  mesEquipmentApi: { getStatistics: vi.fn() },
  productionScheduleApi: { list: vi.fn() },
  equipmentApi: { list: vi.fn() },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'test', roles: ['admin'] },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ProductionDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (productionOrderApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { orders: [], total: 0 },
    });
    (productionRecordApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { records: [], total: 0 },
    });
    (workStationApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { workstations: [], total: 0 },
    });
    (mesEquipmentApi.getStatistics as vi.Mock).mockResolvedValue({
      success: true,
      data: { total: 0, in_use: 0, idle: 0, maintenance: 0 },
    });
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductionDashboardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have production order API methods defined', () => {
    expect(productionOrderApi.list).toBeDefined();
  });

  it('should have production record API methods defined', () => {
    expect(productionRecordApi.list).toBeDefined();
  });

  it('should have work station API methods defined', () => {
    expect(workStationApi.list).toBeDefined();
  });

  it('should have equipment API methods defined', () => {
    expect(equipmentApi.list).toBeDefined();
  });
});
