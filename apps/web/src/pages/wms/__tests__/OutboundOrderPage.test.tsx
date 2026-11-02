import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import OutboundOrderPage from '../OutboundOrderPage';

// ListPageTemplate 包装页，api 来自 @/api/wms → wmsApi.outboundOrders。
const listMock = vi.fn();
vi.mock('@/api/wms', () => ({
  wmsApi: {
    outboundOrders: {
      list: (...args: unknown[]) => listMock(...args),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('OutboundOrderPage', () => {
  beforeEach(() => {
    listMock.mockResolvedValue({
      data: [
        {
          id: 'OO001',
          order_number: 'OUT-2026-0001',
          warehouse_id: 'WH01',
          customer_id: 'C001',
          customer_name: '客户甲',
          order_date: '2026-11-01',
          expected_delivery: '2026-11-05',
          total_amount: 10000,
          status: 'pending',
        },
      ],
      total: 1,
    });
    vi.clearAllMocks();
  });

  it('renders page title（出库订单）', async () => {
    renderWithProviders(<OutboundOrderPage />);

    expect(await screen.findByText('出库订单')).toBeInTheDocument();
  });

  it('calls outboundOrders list API to load crud data', async () => {
    renderWithProviders(<OutboundOrderPage />);

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled();
    });
  });
});
