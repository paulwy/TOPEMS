import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import type { PmStatistics, ProjectBenefit } from '@/api/pm';
import type { ChartDatum, TrendDatum } from '../../hooks/UsePmReport';
import PmReportBenefitsTable from '../PmReportBenefitsTable';
import PmReportBudgetCard from '../PmReportBudgetCard';
import PmReportCustomToolbar from '../PmReportCustomToolbar';
import PmReportRiskPieChart from '../PmReportRiskPieChart';
import PmReportScheduleChart from '../PmReportScheduleChart';
import PmReportStatusPieChart from '../PmReportStatusPieChart';
import PmReportTrendChart from '../PmReportTrendChart';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/pm.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json'),
    require('../../../../i18n/locales/zh/finance.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
    if (typeof options === 'object' && options !== null) {
      const idx = (options as any).index ?? (options as any).index_1;
      if (typeof idx === 'number' && (key.includes('period') || String(base).includes('期'))) {
        return `第 ${idx} 期`;
      }
      // Fallback: unknown nested key + single numeric option (1..24) → "第 N 期"
      if (i18nMap[key] === undefined) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          const v = (options as any)[keys[0]];
          if (
            typeof v === 'number' &&
            v >= 1 &&
            v <= 24 &&
            !key.includes('status') &&
            !key.includes('risk') &&
            !key.includes('month')
          ) {
            return `第 ${v} 期`;
          }
        }
      }
    }
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
      }
    }
    return base;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../../i18n/locales/zh/pm.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json'),
    require('../../../../i18n/locales/zh/finance.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
    if (typeof options === 'object' && options !== null) {
      const idx = (options as any).index ?? (options as any).index_1;
      if (typeof idx === 'number' && (key.includes('period') || String(base).includes('期'))) {
        return `第 ${idx} 期`;
      }
      // Fallback: unknown nested key + single numeric option (1..24) → "第 N 期"
      if (i18nMap[key] === undefined) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          const v = (options as any)[keys[0]];
          if (
            typeof v === 'number' &&
            v >= 1 &&
            v <= 24 &&
            !key.includes('status') &&
            !key.includes('risk') &&
            !key.includes('month')
          ) {
            return `第 ${v} 期`;
          }
        }
      }
    }
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
      }
    }
    return base;
  };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('@/modules/pm/config', () => ({
  PM_PATHS: {
    reports: '/pm/reports',
  },
}));

vi.mock('recharts', async () => {
  const React = await import('react');

  type MockChartProps = {
    children?: React.ReactNode;
    data?: Array<Record<string, unknown>>;
    dataKey?: string;
    name?: string;
    outerRadius?: number;
  };

  const renderData = (data?: Array<Record<string, unknown>>) =>
    data?.map((item, index) => (
      <span key={`${String(item.name ?? item.month ?? index)}-${index}`}>
        {String(item.name ?? item.month ?? index)}:{String(item.value ?? item.cpi ?? '')}
      </span>
    ));

  return {
    ResponsiveContainer: ({ children }: MockChartProps) => (
      <div data-testid='recharts-responsive'>{children}</div>
    ),
    PieChart: ({ children }: MockChartProps) => (
      <div data-testid='recharts-pie-chart'>{children}</div>
    ),
    Pie: ({ children, data, outerRadius }: MockChartProps) => (
      <div
        data-testid='recharts-pie'
        data-outer-radius={String(outerRadius ?? '')}
      >
        {renderData(data)}
        {children}
      </div>
    ),
    BarChart: ({ children, data }: MockChartProps) => (
      <div data-testid='recharts-bar-chart'>
        {renderData(data)}
        {children}
      </div>
    ),
    LineChart: ({ children, data }: MockChartProps) => (
      <div data-testid='recharts-line-chart'>
        {renderData(data)}
        {children}
      </div>
    ),
    Line: ({ dataKey, name }: MockChartProps) => (
      <div data-testid={`recharts-line-${String(dataKey)}`}>{name}</div>
    ),
    Bar: ({ children, dataKey, name }: MockChartProps) => (
      <div data-testid={`recharts-bar-${String(dataKey)}`}>
        {name}
        {children}
      </div>
    ),
    Cell: () => <span data-testid='recharts-cell' />,
    XAxis: ({ dataKey }: MockChartProps) => (
      <span data-testid={`recharts-xaxis-${String(dataKey)}`} />
    ),
    YAxis: () => <span data-testid='recharts-yaxis' />,
    CartesianGrid: () => <span data-testid='recharts-cartesian-grid' />,
    Tooltip: () => <span data-testid='recharts-tooltip' />,
    Legend: () => <span data-testid='recharts-legend' />,
  };
});

const stats: PmStatistics = {
  total_projects: 12,
  draft_projects: 1,
  pending_projects: 2,
  active_projects: 5,
  completed_projects: 3,
  cancelled_projects: 1,
  total_contracts: 8,
  pending_contracts: 1,
  active_contracts: 6,
  completed_contracts: 1,
  total_budget: 1000000,
  spent_budget: 450000,
  budget_usage_rate: 45,
  on_time_projects: 9,
  delayed_projects: 3,
  average_progress: 67,
  high_risk_projects: 2,
  medium_risk_projects: 4,
  low_risk_projects: 6,
};

const projectStatusData: ChartDatum[] = [
  { name: '进行中', value: 5, fill: 'primary.main' },
  { name: '已完成', value: 3, fill: 'success.main' },
];

const riskData: ChartDatum[] = [
  { name: '高风险', value: 2, fill: 'error.main' },
  { name: '中风险', value: 4, fill: 'warning.main' },
];

const trendData: TrendDatum[] = [
  { month: '2026-01', cpi: 1.08, spi: 0.96 },
  { month: '2026-02', cpi: 1.12, spi: 1.02 },
];

const benefits: ProjectBenefit[] = [
  {
    id: 'benefit-1',
    project_id: 'project-1',
    period_type: 'monthly',
    period_date: '2026-01-01',
    planned_cost: 100000,
    actual_cost: 90000,
    planned_progress: 40,
    actual_progress: 42,
    planned_value: 120000,
    earned_value: 126000,
    actual_cost_eva: 90000,
    cpi: 1.4,
    spi: 1.05,
    cv: 36000,
    sv: 6000,
    eac: 800000,
    etc: 700000,
    roi: 0.18,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'benefit-2',
    project_id: 'project-1',
    period_type: 'monthly',
    period_date: '2026-02-01',
    planned_cost: 200000,
    actual_cost: 220000,
    planned_progress: 55,
    actual_progress: 50,
    planned_value: 180000,
    earned_value: 170000,
    actual_cost_eva: 220000,
    cpi: 0.77,
    spi: 0.94,
    cv: -50000,
    sv: -10000,
    eac: 1300000,
    etc: 1080000,
    roi: -0.04,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-02T00:00:00Z',
  },
];

describe('PmReport 组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染预算利用率、总预算、已花费和剩余预算', () => {
    renderWithProviders(
      <PmReportBudgetCard
        stats={stats}
        budgetUtilization={45.5}
      />
    );

    expect(screen.getByText('预算执行情况')).toBeInTheDocument();
    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('450,000')).toBeInTheDocument();
    expect(screen.getByText('550,000')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45.5');
  });
});
