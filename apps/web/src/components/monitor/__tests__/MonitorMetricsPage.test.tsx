import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorMetricsPage from '../MonitorMetricsPage';

// 页面数字来自 GET /api/monitor/metrics/system（history 为空时回落 system 快照）。
// mock 固定快照验证取整映射；LazyChart mock 为占位 div，DashboardTemplate mock 渲染 stat-card-<id>。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    getSystemMetrics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: { cpu_usage: 68.5, memory_usage: 72.3, disk_usage: 54.7 },
    }),
    getSystemMetricsHistory: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: { samples: [] },
    }),
  },
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

describe('MonitorMetricsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards from system metrics', async () => {
    renderWithProviders(<MonitorMetricsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-cpu-usage')).toBeInTheDocument();
    });

    const cpu = screen.getByTestId('stat-card-cpu-usage');
    expect(cpu).toHaveTextContent('CPU 使用率');
    expect(cpu).toHaveTextContent('69');

    expect(screen.getByTestId('stat-card-memory-usage')).toHaveTextContent('72');
    expect(screen.getByTestId('stat-card-disk-usage')).toHaveTextContent('55');
    expect(screen.getByTestId('stat-card-network-throughput')).toHaveTextContent('0');
  });
});
