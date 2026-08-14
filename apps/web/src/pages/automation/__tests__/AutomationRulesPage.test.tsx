import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationRulesPage from '../AutomationRulesPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();
const mockDuplicate = vi.fn();
const mockEnable = vi.fn();
const mockDisable = vi.fn();
const mockTrigger = vi.fn();

vi.mock('@/api/automation', () => ({
  automationRulesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    duplicate: (...args: any[]) => mockDuplicate(...args),
    enable: (...args: any[]) => mockEnable(...args),
    disable: (...args: any[]) => mockDisable(...args),
    trigger: (...args: any[]) => mockTrigger(...args),
  },
  AutomationRule: {},
  AutomationRuleTriggerType: {},
  AutomationRuleActionType: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const rules = [
  {
    id: 'rule-001',
    name: '每日库存同步',
    code: 'daily_inv_sync',
    status: 'enabled',
    trigger: { type: 'schedule' },
    action: { type: 'http' },
    last_run_at: '2026-08-12 10:00:00',
  },
  {
    id: 'rule-002',
    name: '新客户跟进提醒',
    code: 'followup_remind',
    status: 'disabled',
    trigger: { type: 'record_create' },
    action: { type: 'notification' },
    last_run_at: null,
  },
];

describe('AutomationRulesPage', () => {
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

    renderWithProviders(<AutomationRulesPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: rules } });
  });

  it('renders rule cards with name and status', async () => {
    mockList.mockResolvedValue({ data: { items: rules } });

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });
    expect(screen.getByText('daily_inv_sync')).toBeInTheDocument();
    expect(screen.getByText('新客户跟进提醒')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无规则/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('forbidden'));

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/forbidden/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationRulesPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建规则' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建自动化规则');
  });

  it('duplicate and delete trigger APIs', async () => {
    mockList.mockResolvedValue({ data: { items: rules } });
    mockDuplicate.mockResolvedValue({});
    mockRemove.mockResolvedValue({});

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '复制' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[1]);

    expect(mockDuplicate).toHaveBeenCalledWith('rule-001');
    expect(mockRemove).toHaveBeenCalledWith('rule-002');
  });
});
