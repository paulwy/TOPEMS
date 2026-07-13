import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import { useNotificationStore, useAuthStore } from '@/store';
import { AuthProvider } from '@/hooks/useAuth';

vi.mock('@/api/mes', () => ({
  productionOrderApi: { list: vi.fn() },
  productionRecordApi: { list: vi.fn() },
  workStationApi: { list: vi.fn() },
  mesEquipmentApi: { getStatistics: vi.fn() },
  productionScheduleApi: { list: vi.fn() },
  equipmentApi: { list: vi.fn() },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('ProductionDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (productionOrderApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { orders: [], total: 0, page: 1, pagesize: 200 },
    });
    (productionRecordApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { records: [], total: 0, page: 1, pagesize: 200 },
    });
    (workStationApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { workstations: [], total: 0, page: 1, pagesize: 100 },
    });
    (mesEquipmentApi.getStatistics as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        total: 0,
        in_use: 0,
        idle: 0,
        maintenance: 0,
        scrapped: 0,
        total_value: 0,
        monthly_inspections: 0,
        monthly_maintenances: 0,
        pending_repairs: 0,
      },
    });
    (productionScheduleApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { schedules: [], total: 0, page: 1, pagesize: 50 },
    });
    (equipmentApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { equipments: [], total: 0, page: 1, pagesize: 200 },
    });
  });

  it('should render without crashing', () => {
    const { container } = renderWithProviders(<ProductionDashboardPage />);
    expect(container).toBeDefined();
  });

  it('should render page after loading', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );
  });

  it('should handle API error gracefully', async () => {
    (productionOrderApi.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      },
      { timeout: 10000 }
    );
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
