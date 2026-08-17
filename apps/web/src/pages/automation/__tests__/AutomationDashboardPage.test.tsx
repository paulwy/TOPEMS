import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import AutomationDashboardPage from '../AutomationDashboardPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'automation.automation_dashboard_page.k0': '成功',
    'automation.automation_dashboard_page.k1': '失败',
    'automation.automation_dashboard_page.k2': '运行中',
    'automation.automation_dashboard_page.k3': '等待',
    'automation.automation_dashboard_page.k4': '已取消',
    'automation.automation_dashboard_page.k5': '超时',
    'automation.automation_dashboard_page.k6': '加载统计数据失败',
    'automation.automation_dashboard_page.k7': '自动化总览',
    'automation.automation_dashboard_page.k8': '规则总数',
    'automation.automation_dashboard_page.k9': '启用规则',
    'automation.automation_dashboard_page.m1': '24h 运行次数',
    'automation.automation_dashboard_page.m2': '24h 成功率',
    'automation.automation_dashboard_page.m3': '24h 成功',
    'automation.automation_dashboard_page.m4': '24h 失败',
    'automation.automation_dashboard_page.k10': '平均耗时',
    'automation.automation_dashboard_page.k11': '禁用规则',
    'automation.automation_dashboard_page.k12': '日期',
    'automation.automation_dashboard_page.k13': '总数',
    'automation.automation_dashboard_page.k14': '成功',
    'automation.automation_dashboard_page.k15': '失败',
    'automation.automation_dashboard_page.k16': '规则',
    'automation.automation_dashboard_page.k17': '触发方式',
    'automation.automation_dashboard_page.k18': '状态',
    'automation.automation_dashboard_page.k19': '开始时间',
    'automation.automation_dashboard_page.k20': '耗时',
    'automation.automation_dashboard_page.e1': '自动化总览',
    'automation.automation_dashboard_page.e2': '近 7 天运行趋势',
    'automation.automation_dashboard_page.e3': '最近运行',
    'automation.automation_dashboard_page.l1': '加载失败：{{v1}}',
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
    'automation.automation_dashboard_page.k0': '成功',
    'automation.automation_dashboard_page.k1': '失败',
    'automation.automation_dashboard_page.k2': '运行中',
    'automation.automation_dashboard_page.k3': '等待',
    'automation.automation_dashboard_page.k4': '已取消',
    'automation.automation_dashboard_page.k5': '超时',
    'automation.automation_dashboard_page.k6': '加载统计数据失败',
    'automation.automation_dashboard_page.k7': '自动化总览',
    'automation.automation_dashboard_page.k8': '规则总数',
    'automation.automation_dashboard_page.k9': '启用规则',
    'automation.automation_dashboard_page.m1': '24h 运行次数',
    'automation.automation_dashboard_page.m2': '24h 成功率',
    'automation.automation_dashboard_page.m3': '24h 成功',
    'automation.automation_dashboard_page.m4': '24h 失败',
    'automation.automation_dashboard_page.k10': '平均耗时',
    'automation.automation_dashboard_page.k11': '禁用规则',
    'automation.automation_dashboard_page.k12': '日期',
    'automation.automation_dashboard_page.k13': '总数',
    'automation.automation_dashboard_page.k14': '成功',
    'automation.automation_dashboard_page.k15': '失败',
    'automation.automation_dashboard_page.k16': '规则',
    'automation.automation_dashboard_page.k17': '触发方式',
    'automation.automation_dashboard_page.k18': '状态',
    'automation.automation_dashboard_page.k19': '开始时间',
    'automation.automation_dashboard_page.k20': '耗时',
    'automation.automation_dashboard_page.e1': '自动化总览',
    'automation.automation_dashboard_page.e2': '近 7 天运行趋势',
    'automation.automation_dashboard_page.e3': '最近运行',
    'automation.automation_dashboard_page.l1': '加载失败：{{v1}}',
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

const mockGetStats = vi.fn();

vi.mock('@/api/automation', () => ({
  automationApi: {
    getDashboardStats: (...args: any[]) => mockGetStats(...args),
  },
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
  runs_last_24h: 56,
  success_rate_24h: 91,
  success_last_24h: 51,
  failed_last_24h: 5,
  avg_duration_ms: 3200,
  recent_runs: [
    {
      rule_name: '每日库存同步',
      trigger_type: 'schedule',
      status: 'success',
      started_at: '2026-08-10 09:00:00',
      duration_ms: 312000,
    },
    {
      rule_name: '邮件发送',
      trigger_type: 'event',
      status: 'failed',
      started_at: '2026-08-10 09:30:00',
      duration_ms: 45000,
    },
  ],
  trend: [],
};

describe('AutomationDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
