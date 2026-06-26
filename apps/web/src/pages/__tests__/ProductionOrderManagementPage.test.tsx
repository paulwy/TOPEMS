import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductionOrderManagementPage from '../mes/ProductionOrderManagementPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    orders: {
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
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

const mockOrders = [
  {
    id: 'PO001',
    order_number: 'PO-2024-001',
    product_name: '产品A',
    quantity: 1000,
    status: 'in_progress',
    priority: 'high',
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
  },
  {
    id: 'PO002',
    order_number: 'PO-2024-002',
    product_name: '产品B',
    quantity: 500,
    status: 'completed',
    priority: 'medium',
    created_at: '2024-01-14',
    updated_at: '2024-01-14',
  },
];

describe('ProductionOrderManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.orders.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        orders: mockOrders,
        total: mockOrders.length,
        page: 0,
        page_size: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<ProductionOrderManagementPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<ProductionOrderManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('生产订单管理')).toBeInTheDocument();
    });
  });

  it('should render order table', async () => {
    renderWithProviders(<ProductionOrderManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('产品A')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<ProductionOrderManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '产品A' } });
    });
    await waitFor(() => {
      expect(mesApi.orders.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: '产品A' })
      );
    });
  });

  it('should handle create order', async () => {
    (mesApi.orders.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<ProductionOrderManagementPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增订单/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const orderNumberInput = screen.getByLabelText(/订单号/i);
      const productNameInput = screen.getByLabelText(/产品名称/i);
      const quantityInput = screen.getByLabelText(/数量/i);
      const startDateInput = screen.getByLabelText(/计划开始时间/i);
      const endDateInput = screen.getByLabelText(/计划结束时间/i);
      
      fireEvent.change(orderNumberInput, { target: { value: 'PO-TEST-001' } });
      fireEvent.change(productNameInput, { target: { value: '测试产品' } });
      fireEvent.change(quantityInput, { target: { value: '100' } });
      fireEvent.change(startDateInput, { target: { value: '2024-01-15T08:00' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-15T18:00' } });

      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mesApi.orders.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (mesApi.orders.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ProductionOrderManagementPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});