import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorAlertHistoryPage from '../MonitorAlertHistoryPage';

// CrudPage 包装页：mock monitorApi.listAlerts 返回确定性历史告警行；
// CrudPage mock 渲染 alertHistorySchema.title（告警历史）为 <h1>，字段渲染 cell-<field>-<ri>。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    listAlerts: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'a1',
            title: 'CPU使用率过高',
            severity: 'critical',
            status: 'acknowledged',
            service_name: '订单服务',
            message: 'CPU 超过 85% 阈值',
            alert_type: 'cpu',
            created_at: '2026-11-03T06:00:00Z',
            resolved_at: null,
          },
        ],
        total: 1,
      },
    }),
    acknowledgeAlert: vi.fn().mockResolvedValue({}),
    resolveAlert: vi.fn().mockResolvedValue({}),
  },
}));

describe('MonitorAlertHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（告警历史）', async () => {
    renderWithProviders(<MonitorAlertHistoryPage />);

    expect(await screen.findByRole('heading', { name: '告警历史' })).toBeInTheDocument();
  });

  it('renders alert history rows from mocked API data', async () => {
    renderWithProviders(<MonitorAlertHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('cell-title-0')).toHaveTextContent('CPU使用率过高');
    });
  });
});
