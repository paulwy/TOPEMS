import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '@/__tests__/test-utils';
import SrmOrderPage from '../srm/SrmOrderPage';
import { srmApi } from '@/api/srm';

vi.mock('@/api/srm', () => ({
  srmApi: {
    listPurchaseOrders: vi
      .fn()
      .mockResolvedValue({ success: true, code: 200, message: 'OK', data: [] }),
    createPurchaseOrder: vi.fn(),
    getPurchaseOrder: vi.fn(),
    updatePurchaseOrder: vi.fn(),
    deletePurchaseOrder: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          user: { permissions: ['srm:order:read', 'srm:order:create'] },
        })
      : {
          addNotification: vi.fn(),
          user: { permissions: ['srm:order:read', 'srm:order:create'] },
        }
  ),
}));

describe('SrmOrderPage API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call listPurchaseOrders API on mount', async () => {
    renderWithProviders(<SrmOrderPage />);
    expect(srmApi.listPurchaseOrders).toHaveBeenCalled();
  });

  it('should render order data from API', async () => {
    const mockOrders = [
      {
        id: 'po-001',
        po_no: 'PO-2024-001',
        supplier_id: '供应商A',
        total_amount: 10000,
        status: 'pending',
        order_date: '2024-01-15',
      },
    ];

    srmApi.listPurchaseOrders.mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: mockOrders,
    });

    renderWithProviders(<SrmOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('供应商A')).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    srmApi.listPurchaseOrders.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<SrmOrderPage />);

    await waitFor(() => {
      expect(screen.queryByText('PO-2024-001')).not.toBeInTheDocument();
    });
  });

  it('should open create modal and submit form', async () => {
    srmApi.listPurchaseOrders.mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: [],
    });

    srmApi.createPurchaseOrder.mockResolvedValue({
      success: true,
      code: 200,
      message: '创建成功',
      data: { id: 'po-new', po_no: 'PO-2024-NEW' },
    });

    renderWithProviders(<SrmOrderPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新增订单/i })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /新增订单/i });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const poNoInput = screen.getByLabelText('订单编号 *');
    await userEvent.type(poNoInput, 'PO-2024-NEW');

    const supplierInput = screen.getByLabelText('供应商ID');
    await userEvent.type(supplierInput, '供应商D');

    const amountInput = screen.getByLabelText('订单金额');
    await userEvent.type(amountInput, '50000');

    const submitButton = screen.getByRole('button', { name: /保存/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(srmApi.createPurchaseOrder).toHaveBeenCalled();
    });
  });

  it('should filter orders by search term', async () => {
    const mockOrders = [
      {
        id: 'po-001',
        po_no: 'PO-2024-001',
        supplier_id: '供应商A',
        total_amount: 10000,
        status: 'pending',
        order_date: '2024-01-15',
      },
      {
        id: 'po-002',
        po_no: 'PO-2024-002',
        supplier_id: '供应商B',
        total_amount: 20000,
        status: 'processing',
        order_date: '2024-01-16',
      },
    ];

    srmApi.listPurchaseOrders.mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: mockOrders,
    });

    renderWithProviders(<SrmOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索订单编号或供应商...');
    await userEvent.type(searchInput, '供应商A');

    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument();
    });
  });
});
