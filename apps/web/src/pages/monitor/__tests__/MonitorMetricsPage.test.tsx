import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorMetricsPage from '../MonitorMetricsPage';

// 模板仪表盘页：stats 为页面硬编码的确定性值（68.5/72.3/54.7/128/96/2,856），
// useQuery 调 monitorApi.metrics.list()（被页面 try/catch 吞掉），mock 成空响应；
// LazyChart 按 §D mock 为占位 div。DashboardTemplate mock 渲染 stat-card-<id>。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    metrics: {
      list: vi.fn().mockResolvedValue({ success: true, code: 0, data: {} }),
    },
  },
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid="lazy-chart" />,
}));

describe('MonitorMetricsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards with hard-coded metric values', async () => {
    renderWithProviders(<MonitorMetricsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-cpu-usage')).toBeInTheDocument();
    });

    const cpu = screen.getByTestId('stat-card-cpu-usage');
    expect(cpu).toHaveTextContent('CPU 使用率');
    expect(cpu).toHaveTextContent('68.5');

    expect(screen.getByTestId('stat-card-memory-usage')).toHaveTextContent('72.3');
    expect(screen.getByTestId('stat-card-disk-usage')).toHaveTextContent('54.7');
    expect(screen.getByTestId('stat-card-network-in')).toHaveTextContent('128');
    expect(screen.getByTestId('stat-card-network-out')).toHaveTextContent('96');

    const qps = screen.getByTestId('stat-card-api-qps');
    expect(qps).toHaveTextContent('API QPS');
    expect(qps).toHaveTextContent('2,856');
  });
});
