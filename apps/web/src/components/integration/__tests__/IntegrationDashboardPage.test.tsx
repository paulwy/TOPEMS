import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationDashboardPage from '../IntegrationDashboardPage';

// 页面数字全部来自真实接口（stats / connections / events），这里 mock 固定响应验证映射。
vi.mock('@/api/integration', () => ({
  integrationApi: {
    sync: {
      getIntegrationSyncStats: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        data: {
          total_syncs: 12,
          success_rate: 98.5,
          integration_stats: { erp: { failed: 20 }, mes: { failed: 3 } },
          last_sync_at: '2026-11-27T17:00:00Z',
        },
      }),
      getIntegrationSyncHistory: vi.fn().mockResolvedValue({ success: true, code: 0, data: [] }),
    },
    connections: {
      listConnections: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        data: [{ status: 'active' }, { status: 'connected' }, { status: 'inactive' }],
      }),
    },
    listEvents: vi.fn().mockResolvedValue({ success: true, code: 0, data: [] }),
  },
}));

describe('IntegrationDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active connections stat card from API', async () => {
    renderWithProviders(<IntegrationDashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-active-connections')).toHaveTextContent('2');
    });
    expect(screen.getByTestId('stat-card-active-connections')).toHaveTextContent('活跃连接');
  });

  it('renders success rate and error stat cards from API', async () => {
    renderWithProviders(<IntegrationDashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-success-rate')).toHaveTextContent('98.5');
    });
    const success = screen.getByTestId('stat-card-success-rate');
    expect(success).toHaveTextContent('成功率');

    const errors = screen.getByTestId('stat-card-errors');
    expect(errors).toHaveTextContent('23');
    expect(errors).toHaveTextContent('错误数');
  });
});
