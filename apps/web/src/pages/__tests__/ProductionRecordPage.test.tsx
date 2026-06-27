import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionRecordPage from '../mes/ProductionRecordPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    records: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockRecords = [
  {
    id: 'PR001',
    order_id: 'PO001',
    process_id: 'PROC001',
    work_station_id: 'WS001',
    operator: '张三',
    quantity_completed: 100,
    quantity_rejected: 2,
    start_time: '2024-01-15T08:00:00',
    end_time: '2024-01-15T12:00:00',
    status: 'completed',
    notes: '',
    created_at: '2024-01-15T08:00:00',
    updated_at: '2024-01-15T12:00:00',
  },
];

describe('ProductionRecordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.records.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        records: mockRecords,
        total: mockRecords.length,
        page: 0,
        page_size: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<ProductionRecordPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<ProductionRecordPage />);
    await waitFor(() => {
      expect(screen.getByText('生产记录管理')).toBeInTheDocument();
    });
  });

  it('should render record table', async () => {
    renderWithProviders(<ProductionRecordPage />);
    await waitFor(() => {
      expect(screen.getByText('PO001')).toBeInTheDocument();
      expect(screen.getByText('张三')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<ProductionRecordPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '张三' } });
    });
    await waitFor(() => {
      expect(mesApi.records.list).toHaveBeenCalledWith(expect.objectContaining({ search: '张三' }));
    });
  });

  it('should handle create record', async () => {
    (mesApi.records.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<ProductionRecordPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增生产记录/i });
      fireEvent.click(addButton);
    });

    const orderIdInput = await screen.findByLabelText(/订单ID/i);
    fireEvent.change(orderIdInput, { target: { value: 'PO-001' } });

    const operatorInput = screen.getByLabelText(/操作员/i);
    fireEvent.change(operatorInput, { target: { value: '张三' } });

    const quantityInput = screen.getByLabelText(/完成数量/i);
    fireEvent.change(quantityInput, { target: { value: '100' } });

    const startTimeInput = screen.getByLabelText(/开始时间/i);
    fireEvent.change(startTimeInput, { target: { value: '2024-01-15T08:00' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mesApi.records.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (mesApi.records.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionRecordPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
