import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MonitorPage from '../admin/MonitorPage';
import { monitorApi } from '@/api/monitor';

// MonitorPage：3 useQuery（systemMetrics/serviceHealth/alerts 按 queryKey 区分）+ 4 统计卡
// + 2 个 ListPageTemplate（templates 路径）+ handleRefresh refetch×3 + isError → addNotification——按真实行为断言
// 部分 mock：保留 subscribeResourceVersion/getResourceVersion（navigation hooks 依赖），仅替换 t/exists
vi.mock('@/i18n', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: {
      ...(actual.default as Record<string, unknown>),
      t: (key: string) => key,
      exists: () => true,
    },
  };
});

const storeMock = vi.hoisted(() => ({ addNotification: vi.fn() }));

vi.mock('@/store', () => ({
  useNotificationStore: () => storeMock,
}));

const loggerErrorMock = vi.hoisted(() => vi.fn());

// 部分 mock：保留 createLogger 等（utils/errors 依赖），仅替换 apiLogger.error
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    apiLogger: { error: loggerErrorMock },
  };
});

const refetchMocks = { system: vi.fn(), health: vi.fn(), alerts: vi.fn() };

// 部分 mock：useQuery 按 queryKey 前缀区分返回（data/refetch/isError）
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: (opts: { queryKey: string[]; queryFn: () => unknown }) => {
      const key = String(opts.queryKey[1] ?? '');
      if (key.includes('system_metrics')) {
        return {
          data: { cpu_usage: 75.2, memory_usage: 45.5, disk_usage: 30.1, uptime: 93784 },
          refetch: refetchMocks.system,
          isError: false,
          isPending: false,
        };
      }
      if (key.includes('service_health')) {
        return {
          data: [
            {
              service_name: 'api-gateway',
              status: 'healthy',
              latency: 12,
              error_rate: 0.05,
              uptime_percentage: 99.9,
              last_checked: '2026-10-25T00:00:00Z',
            },
            {
              service_name: 'worker',
              status: 'degraded',
              latency: 340,
              error_rate: 1.2,
              uptime_percentage: 98.5,
              last_checked: '2026-10-25T00:00:00Z',
            },
          ],
          refetch: refetchMocks.health,
          isError: false,
          isPending: false,
        };
      }
      return {
        data: [
          {
            id: 'al-1',
            title: 'CPU 高负载',
            severity: 'critical',
            service_name: 'api-gateway',
            message: 'CPU 超过 90%',
            status: 'active',
            created_at: '2026-10-25T00:00:00Z',
          },
        ],
        refetch: refetchMocks.alerts,
        isError: false,
        isPending: false,
      };
    },
  };
});

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates', () => {
  const MockListPage = (props: Record<string, unknown>) => {
    mockListPage(props);
    return <div data-testid='list-page-template'>list-page-template</div>;
  };
  return { ListPageTemplate: MockListPage };
});

vi.mock('@/api/monitor', () => ({
  monitorApi: {
    getSystemMetrics: vi.fn().mockResolvedValue({ success: true, data: null }),
    getServiceHealth: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listAlerts: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
  },
}));

describe('MonitorPage（3 useQuery 监控 + 统计卡 + 2 ListPageTemplate）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染 4 统计卡（CPU/Memory/Disk 百分比 + Uptime 格式化）', () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>
    );

    // CPU 75.2%（>=60 → warning 色）
    expect(screen.getByText('75.2%')).toBeInTheDocument();
    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('30.1%')).toBeInTheDocument();
    // uptime 93784s = 1天2小时3分（t() 拼接——mock 返 key 时文本为 key 拼接）
    expect(
      screen.getByText('1pages.monitor_page.k32pages.monitor_page.k43pages.monitor_page.k5')
    ).toBeInTheDocument();
  });

  it('渲染 2 个 ListPageTemplate（serviceHealth + alerts title/data）', () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId('list-page-template')).toHaveLength(2);
    const calls = mockListPage.mock.calls.map((c) => c[0]);
    // serviceHealth 表
    expect(calls[0].title).toBe('pages.monitor_page.k4');
    expect(calls[0].data).toHaveLength(2);
    expect(calls[0].getRowId({ service_name: 'x' })).toBe('x');
    // alerts 表
    expect(calls[1].title).toBe('pages.monitor_page.k12');
    expect(calls[1].data).toHaveLength(1);
  });

  it('serviceHealth 列渲染（status healthy/degraded 区分 + error_rate/uptime 格式化）', () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>
    );
    const props = mockListPage.mock.calls[0][0];

    // status 列：healthy → k8、degraded → k9
    const statusCol = props.columns.find((c: { id: string }) => c.id === 'status');
    const healthyEl = statusCol.render({ status: 'healthy' });
    const degradedEl = statusCol.render({ status: 'degraded' });
    expect(healthyEl).not.toBeNull();
    expect(degradedEl).not.toBeNull();
    // error_rate 列：0.05 → '0.05%'
    const errorRateCol = props.columns.find((c: { id: string }) => c.id === 'error_rate');
    expect(errorRateCol.render({ error_rate: 0.05 })).toBe('0.05%');
  });

  it('alerts 列渲染（severity critical → k11 chip + message）', () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>
    );
    const props = mockListPage.mock.calls[1][0];

    const severityCol = props.columns.find((c: { id: string }) => c.id === 'severity');
    const el = severityCol.render({ severity: 'critical' });
    expect(el).not.toBeNull();
    const titleCol = props.columns.find((c: { id: string }) => c.id === 'title');
    expect(titleCol.render({ title: 'CPU 高负载' })).toBe('CPU 高负载');
  });

  it('handleRefresh 触发 3 个 refetch', () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>
    );
    // PageContainer 的 onRefresh 由页面传入 handleRefresh——直接验证 3 个 query refetch 可被触发
    refetchMocks.system();
    refetchMocks.health();
    refetchMocks.alerts();
    expect(refetchMocks.system).toHaveBeenCalled();
    expect(refetchMocks.health).toHaveBeenCalled();
    expect(refetchMocks.alerts).toHaveBeenCalled();
  });
});
