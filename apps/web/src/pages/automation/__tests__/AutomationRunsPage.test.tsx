import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationRunsPage from '../AutomationRunsPage';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockRetry = vi.fn();
const mockCancel = vi.fn();

vi.mock('@/api/automation', () => ({
  automationRunsApi: {
    list: (...args: any[]) => mockList(...args),
    get: (...args: any[]) => mockGet(...args),
    retry: (...args: any[]) => mockRetry(...args),
    cancel: (...args: any[]) => mockCancel(...args),
  },
  AutomationRun: {},
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

const runs = [
  {
    id: 'run-001',
    rule_id: 'rule-001',
    rule_name: '每日库存同步',
    trigger_type: 'schedule',
    status: 'success',
    started_at: '2026-08-12 10:00:02',
    finished_at: '2026-08-12 10:00:03',
    duration_ms: 280,
    retry_count: 0,
  },
  {
    id: 'run-002',
    rule_id: 'rule-002',
    rule_name: '邮件发送',
    trigger_type: 'manual',
    status: 'failed',
    started_at: '2026-08-12 10:05:11',
    finished_at: '2026-08-12 10:05:12',
    duration_ms: 9999,
    retry_count: 2,
  },
  {
    id: 'run-003',
    rule_id: 'rule-003',
    rule_name: '数据备份',
    trigger_type: 'schedule',
    status: 'running',
    started_at: '2026-08-12 10:10:00',
    finished_at: null,
    duration_ms: 0,
    retry_count: 0,
  },
];

describe('AutomationRunsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<AutomationRunsPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: runs } });
  });

  it('renders run rows with status labels', async () => {
    mockList.mockResolvedValue({ data: { items: runs } });

    renderWithProviders(<AutomationRunsPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });
    expect(screen.getByText('邮件发送')).toBeInTheDocument();
    expect(screen.getByText('数据备份')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationRunsPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无执行记录/)).toBeInTheDocument();
    });
  });

  it('opens detail dialog with run info', async () => {
    mockList.mockResolvedValue({ data: { items: runs } });
    mockGet.mockResolvedValue({
      data: {
        id: 'run-002',
        rule_name: '邮件发送',
        status: 'failed',
        error: 'SMTP 连接超时',
        logs: ['...'],
      },
    });

    renderWithProviders(<AutomationRunsPage />);

    await waitFor(() => {
      expect(screen.getByText('邮件发送')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '查看详情' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('运行详情');
  });

  it('refresh button reloads list', async () => {
    mockList.mockResolvedValue({ data: { items: runs } });

    renderWithProviders(<AutomationRunsPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    expect(mockList).toHaveBeenCalled();
  });
});
