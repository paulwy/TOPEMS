import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import IntegrationErpOverviewPage from '../IntegrationErpOverviewPage';

// DashboardTemplate（全局 mock 渲染 stat-card）+ 手写 MUI 区块。
// useQuery 调 connectionApi.listConnections（@/api/integration/connection），res.data 为连接数组。
vi.mock('@/api/integration/connection', () => ({
  connectionApi: {
    listConnections: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'E1',
          name: 'ERP-生产订单连接',
          type: 'erp',
          status: 'active',
          isactive: true,
          last_sync_at: '2026-11-01T10:00:00',
          updated_at: '2026-11-01T10:00:00',
        },
        {
          id: 'E2',
          name: 'WMS-库存连接',
          type: 'wms',
          status: 'error',
          updated_at: '2026-11-01T09:00:00',
        },
      ],
    }),
  },
}));

describe('IntegrationErpOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards derived from mocked connections', async () => {
    renderWithProviders(<IntegrationErpOverviewPage />);
    await waitFor(() => {
      const total = screen.getByTestId('stat-card-total-syncs');
      expect(within(total).getByText('2')).toBeInTheDocument();
    });
    const errors = screen.getByTestId('stat-card-errors');
    expect(within(errors).getByText('1')).toBeInTheDocument();
  });

  it('renders sync task list with connection names', async () => {
    renderWithProviders(<IntegrationErpOverviewPage />);
    expect(await screen.findByText('ERP-生产订单连接')).toBeInTheDocument();
    expect(screen.getByText('WMS-库存连接')).toBeInTheDocument();
  });
});
