import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import AutomationDashboardPage from '../AutomationDashboardPage';

const mockGetStats = vi.fn();
const mockListRecent = vi.fn();

vi.mock('@/api/automation', () => ({
  automationApi: {
    getDashboardStats: (...args: any[]) => mockGetStats(...args),
  },
  automationRunsApi: {
    list: (...args: any[]) => mockListRecent(...args),
  },
  AutomationDashboardStats: {},
  AutomationRunStatus: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const stats = {
  total_rules: 12,
  enabled_rules: 8,
  disabled_rules: 4,
  runs_last_24h: 156,
  success_last_24h: 142,
  failed_last_24h: 14,
  success_rate_24h: 91,
  avg_duration_ms: 320,
  daily_stats: [
    { date: '2026-08-06', total: 120, success: 110, failed: 10 },
    { date: '2026-08-07', total: 130, success: 125, failed: 5 },
    { date: '2026-08-08', total: 156, success: 142, failed: 14 },
  ],
  recent_runs: [
    {
      id: 'r1',
      rule_id: 'rule-001',
      rule_name: '每日库存同步',
      trigger_type: 'schedule',
      status: 'success',
      started_at: '10:00:02',
      duration_ms: 280,
    },
    {
      id: 'r2',
      rule_id: 'rule-002',
      rule_name: '邮件发送',
      trigger_type: 'manual',
      status: 'failed',
      started_at: '10:05:11',
      duration_ms: 9999,
    },
  ],
};

const recent = [
  {
    id: 'r1',
    rule_id: 'rule-001',
    rule_name: '每日库存同步',
    trigger_type: 'schedule',
    status: 'success',
    started_at: '10:00:02',
    duration_ms: 280,
  },
  {
    id: 'r2',
    rule_id: 'rule-002',
    rule_name: '邮件发送',
    trigger_type: 'manual',
    status: 'failed',
    started_at: '10:05:11',
    duration_ms: 9999,
  },
];

describe('AutomationDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRecent.mockResolvedValue({ data: { items: recent } });
  });

  it('shows loading spinner', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockGetStats.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<AutomationDashboardPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.(stats);
  });

  it('renders stat cards with key metrics', async () => {
    mockGetStats.mockResolvedValue({ data: stats });

    renderWithProviders(<AutomationDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('规则总数')).toBeInTheDocument();
    });
    expect(screen.getByText('启用规则')).toBeInTheDocument();
    expect(screen.getByText('平均耗时')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
  });

  it('shows recent runs table', async () => {
    mockGetStats.mockResolvedValue({ data: stats });

    renderWithProviders(<AutomationDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });
    expect(screen.getByText('邮件发送')).toBeInTheDocument();
  });

  it('shows error on stats failure', async () => {
    mockGetStats.mockRejectedValue(new Error('无法获取统计'));

    renderWithProviders(<AutomationDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/无法获取统计/)).toBeInTheDocument();
    });
  });
});
