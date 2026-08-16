import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationRunsPage from '../AutomationRunsPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
  'automation.automation_runs_page.k0': '成功',
  'automation.automation_runs_page.k1': '失败',
  'automation.automation_runs_page.k2': '运行中',
  'automation.automation_runs_page.k3': '等待',
  'automation.automation_runs_page.k4': '已取消',
  'automation.automation_runs_page.k5': '超时',
  'automation.automation_runs_page.k6': '加载执行历史失败',
  'automation.automation_runs_page.k7': '重试失败',
  'automation.automation_runs_page.k8': '取消失败',
  'automation.automation_runs_page.k9': '加载详情失败',
  'automation.automation_runs_page.k10': '执行历史',
  'automation.automation_runs_page.k11': '执行历史',
  'automation.automation_runs_page.k12': '规则',
  'automation.automation_runs_page.k13': '触发方式',
  'automation.automation_runs_page.k14': '状态',
  'automation.automation_runs_page.k15': '开始时间',
  'automation.automation_runs_page.k16': '结束时间',
  'automation.automation_runs_page.k17': '耗时',
  'automation.automation_runs_page.k18': '重试',
  'automation.automation_runs_page.k19': '操作',
  'automation.automation_runs_page.k20': '查看详情',
  'automation.automation_runs_page.k21': '查看详情',
  'automation.automation_runs_page.k22': '重试',
  'automation.automation_runs_page.k23': '重试',
  'automation.automation_runs_page.k24': '取消',
  'automation.automation_runs_page.k25': '取消',
  'automation.automation_runs_page.k26': '运行详情',
  'automation.automation_runs_page.k27': '规则',
  'automation.automation_runs_page.k28': '状态',
  'automation.automation_runs_page.k29': '时间',
  'automation.automation_runs_page.k30': '步骤明细',
  'automation.automation_runs_page.k31': '步骤',
  'automation.automation_runs_page.k32': '类型',
  'automation.automation_runs_page.k33': '状态',
  'automation.automation_runs_page.k34': '耗时',
  'automation.automation_runs_page.k35': '关闭',
  'automation.automation_runs_page.e1': '刷新',
  'automation.automation_runs_page.e2': '暂无执行记录',
  'automation.automation_runs_page.r1': '开始：{{v1}}',
  'automation.automation_runs_page.r2': '结束：{{v1}}',
};
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    useTranslation: (ns?: string | string[]) => ({
      t,
      i18n: {
        changeLanguage: vi.fn(),
        language: 'zh',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
    Trans: ({ children }: any) => children,
  };
});

vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
  'automation.automation_runs_page.k0': '成功',
  'automation.automation_runs_page.k1': '失败',
  'automation.automation_runs_page.k2': '运行中',
  'automation.automation_runs_page.k3': '等待',
  'automation.automation_runs_page.k4': '已取消',
  'automation.automation_runs_page.k5': '超时',
  'automation.automation_runs_page.k6': '加载执行历史失败',
  'automation.automation_runs_page.k7': '重试失败',
  'automation.automation_runs_page.k8': '取消失败',
  'automation.automation_runs_page.k9': '加载详情失败',
  'automation.automation_runs_page.k10': '执行历史',
  'automation.automation_runs_page.k11': '执行历史',
  'automation.automation_runs_page.k12': '规则',
  'automation.automation_runs_page.k13': '触发方式',
  'automation.automation_runs_page.k14': '状态',
  'automation.automation_runs_page.k15': '开始时间',
  'automation.automation_runs_page.k16': '结束时间',
  'automation.automation_runs_page.k17': '耗时',
  'automation.automation_runs_page.k18': '重试',
  'automation.automation_runs_page.k19': '操作',
  'automation.automation_runs_page.k20': '查看详情',
  'automation.automation_runs_page.k21': '查看详情',
  'automation.automation_runs_page.k22': '重试',
  'automation.automation_runs_page.k23': '重试',
  'automation.automation_runs_page.k24': '取消',
  'automation.automation_runs_page.k25': '取消',
  'automation.automation_runs_page.k26': '运行详情',
  'automation.automation_runs_page.k27': '规则',
  'automation.automation_runs_page.k28': '状态',
  'automation.automation_runs_page.k29': '时间',
  'automation.automation_runs_page.k30': '步骤明细',
  'automation.automation_runs_page.k31': '步骤',
  'automation.automation_runs_page.k32': '类型',
  'automation.automation_runs_page.k33': '状态',
  'automation.automation_runs_page.k34': '耗时',
  'automation.automation_runs_page.k35': '关闭',
  'automation.automation_runs_page.e1': '刷新',
  'automation.automation_runs_page.e2': '暂无执行记录',
  'automation.automation_runs_page.r1': '开始：{{v1}}',
  'automation.automation_runs_page.r2': '结束：{{v1}}',
};
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    default: {
      t,
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  };
});

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
    rule_name: '每日库存同步',
    trigger_type: 'schedule',
    status: 'success',
    started_at: '2026-08-10 09:00:00',
    ended_at: '2026-08-10 09:05:12',
    duration_ms: 312000,
  },
  {
    id: 'run-002',
    rule_name: '邮件发送',
    trigger_type: 'event',
    status: 'failed',
    started_at: '2026-08-10 09:30:00',
    ended_at: '2026-08-10 09:30:45',
    duration_ms: 45000,
  },
  {
    id: 'run-003',
    rule_name: '数据备份',
    trigger_type: 'manual',
    status: 'running',
    started_at: '2026-08-10 10:00:00',
    ended_at: null,
    duration_ms: 0,
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
