import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockOrders = [
  {
    id: 'PO001',
    order_number: 'PO-2024-001',
    product_name: '产品A',
    quantity: 1000,
    status: 'in_progress',
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
  },
  {
    id: 'PO002',
    order_number: 'PO-2024-002',
    product_name: '产品B',
    quantity: 500,
    status: 'completed',
    created_at: '2024-01-14',
    updated_at: '2024-01-14',
  },
];

const mockRecords = [
  {
    id: 'PR001',
    order_id: 'PO001',
    operator: '张三',
    quantity_completed: 500,
    quantity_rejected: 5,
    start_time: new Date().toISOString(),
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockWorkStations = [
  {
    id: 'WS001',
    name: '焊接工作站',
    code: 'WS-WELD-001',
    location: 'A区',
    capacity: 5,
    status: 'active',
    created_at: '2024-01-10',
    updated_at: '2024-01-10',
  },
];

const mockEquipment = [
  {
    id: 'EQ001',
    code: 'EQ-CNC-001',
    name: 'CNC加工中心',
    status: 'running',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const mockSchedules = [
  {
    id: 'SCH001',
    order_id: 'PO001',
    order_number: 'PO-2024-001',
    planned_start_time: new Date().toISOString(),
    planned_end_time: new Date(Date.now() + 3600000).toISOString(),
    quantity: 1000,
    status: 'in_progress',
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
  },
];

describe('ProductionDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (productionOrderApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { orders: mockOrders, total: mockOrders.length, page: 1, page_size: 200 },
    });
    (productionRecordApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { records: mockRecords, total: mockRecords.length, page: 1, page_size: 200 },
    });
    (workStationApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        workstations: mockWorkStations,
        total: mockWorkStations.length,
        page: 1,
        page_size: 100,
      },
    });
    (mesEquipmentApi.getStatistics as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        total: 10,
        in_use: 8,
        idle: 1,
        maintenance: 1,
        scrapped: 0,
        total_value: 1000000,
        monthly_inspections: 50,
        monthly_maintenances: 10,
        pending_repairs: 0,
      },
    });
    (productionScheduleApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { schedules: mockSchedules, total: mockSchedules.length, page: 1, page_size: 50 },
    });
    (equipmentApi.list as vi.Mock).mockResolvedValue({
      success: true,
      data: { equipments: mockEquipment, total: mockEquipment.length, page: 1, page_size: 200 },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('should render page after loading', async () => {
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.getByText('MES 生产看板')).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    (productionOrderApi.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
