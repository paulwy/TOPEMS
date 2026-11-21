import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorDashboardPage from '../MonitorDashboardPage';

// 模板仪表盘页：mock monitorApi 五个 useQuery 为确定性数据；
// setup-mocks 的 DashboardTemplate 渲染 stat-card-<id>（title+value 两个 span），
// 页面 children 中的服务健康表格也会真实渲染出服务名。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    getSystemMetrics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: {
        cpu_usage: 42,
        memory_usage: 67,
        disk_usage: 55,
        network_in: 120,
        network_out: 80,
        uptime: 99.9,
        timestamp: '2026-11-03T00:00:00Z',
      },
    }),
    getServiceHealth: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: [
        {
          id: 'svc-1',
          service_name: '订单服务',
          status: 'healthy',
          uptime: '99.9%',
          last_check: '2026-11-03T08:00:00Z',
        },
        {
          id: 'svc-2',
          service_name: '用户服务',
          status: 'degraded',
          uptime: '95.0%',
          last_check: '2026-11-03T08:00:00Z',
        },
      ],
    }),
    listAlerts: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: {
        items: [
          {
            id: 'a1',
            alert_type: 'cpu',
            severity: 'critical',
            title: 'CPU使用率过高',
            message: 'CPU 超过阈值',
            service_name: '订单服务',
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    }),
    getApiPerformance: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: [
        {
          endpoint: '/api/orders',
          method: 'GET',
          avg_response_time: 120,
          p95_response_time: 200,
          p99_response_time: 300,
          request_count: 1000,
          error_count: 5,
          error_rate: 0.5,
          throughput: 100,
        },
      ],
    }),
    getDatabaseMetrics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: {
        connections: 42,
        max_connections: 100,
        query_count: 5000,
        slow_query_count: 3,
        avg_query_time: 5,
        cache_hit_rate: 95,
      },
    }),
  },
}));

describe('MonitorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards computed from mocked metrics', async () => {
    renderWithProviders(<MonitorDashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-online-services')).toBeInTheDocument();
    });

    // 在线服务数 = 1（订单服务 healthy）；告警数 = 1（active 告警）；CPU = 42
    const online = screen.getByTestId('stat-card-online-services');
    expect(online).toHaveTextContent('在线服务数');
    expect(online).toHaveTextContent('1');

    const alerts = screen.getByTestId('stat-card-alerts');
    expect(alerts).toHaveTextContent('告警数');
    expect(alerts).toHaveTextContent('1');

    const cpu = screen.getByTestId('stat-card-cpu-usage');
    expect(cpu).toHaveTextContent('CPU使用率');
    expect(cpu).toHaveTextContent('42');

    expect(screen.getByTestId('stat-card-db-connections')).toHaveTextContent('42');
    expect(screen.getByTestId('stat-card-api-response-time')).toHaveTextContent('120');
  });

  it('renders service health table rows after queries resolve', async () => {
    renderWithProviders(<MonitorDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('订单服务').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('用户服务')).toBeInTheDocument();
    // 表头列名（真实中文）
    expect(screen.getByText('服务名称')).toBeInTheDocument();
  });
});
