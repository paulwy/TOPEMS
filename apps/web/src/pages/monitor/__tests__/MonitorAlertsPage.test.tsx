import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorAlertsPage from '../MonitorAlertsPage';

// CrudPage 包装页：mock monitorApi.listAlerts 返回确定性告警行；
// setup-mocks 的 CrudPage mock 渲染 schema.title 为 <h1>，每行字段渲染 cell-<field>-<ri>。
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
            status: 'active',
            service_name: '订单服务',
            message: 'CPU 超过 85% 阈值',
            alert_type: 'cpu',
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    }),
    acknowledgeAlert: vi.fn().mockResolvedValue({}),
    resolveAlert: vi.fn().mockResolvedValue({}),
  },
}));

describe('MonitorAlertsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（告警）', async () => {
    renderWithProviders(<MonitorAlertsPage />);

    expect(await screen.findByRole('heading', { name: '告警' })).toBeInTheDocument();
  });

  it('renders alert rows from mocked API data', async () => {
    renderWithProviders(<MonitorAlertsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('cell-title-0')).toHaveTextContent('CPU使用率过高');
    });
  });
});
