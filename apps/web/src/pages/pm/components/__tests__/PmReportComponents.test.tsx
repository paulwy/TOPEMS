import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import type { PmStatistics, ProjectBenefit } from '@/api/pm';
import type { ChartDatum, TrendDatum } from '../../hooks/usePmReport';
import PmReportBenefitsTable from '../PmReportBenefitsTable';
import PmReportBudgetCard from '../PmReportBudgetCard';
import PmReportCustomToolbar from '../PmReportCustomToolbar';
import PmReportRiskPieChart from '../PmReportRiskPieChart';
import PmReportScheduleChart from '../PmReportScheduleChart';
import PmReportStatusPieChart from '../PmReportStatusPieChart';
import PmReportTrendChart from '../PmReportTrendChart';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.value !== undefined ? `${key}:${String(options.value)}` : key,
  }),
}));

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

    expect(screen.getByText('pm.pm_report_page.text_42acf5')).toBeInTheDocument();
    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('450,000')).toBeInTheDocument();
    expect(screen.getByText('550,000')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45.5');
  });

  it('收益表有数据时渲染关键列和格式化指标', () => {
    renderWithProviders(<PmReportBenefitsTable benefits={benefits} />);

    expect(screen.getByText('pm.pm_report_page.text_9d57d4')).toBeInTheDocument();
    expect(screen.getByText('第 1 期')).toBeInTheDocument();
    expect(screen.getByText('第 2 期')).toBeInTheDocument();
    expect(screen.getByText('1.40')).toBeInTheDocument();
    expect(screen.getByText('0.77')).toBeInTheDocument();
    expect(screen.getByText('36,000')).toBeInTheDocument();
    expect(screen.getByText('-50,000')).toBeInTheDocument();
    expect(screen.getByText('18.00%')).toBeInTheDocument();
    expect(screen.getByText('-4.00%')).toBeInTheDocument();
  });

  it('收益表无数据时渲染空态', () => {
    renderWithProviders(<PmReportBenefitsTable benefits={[]} />);

    expect(screen.getByText('pm.pm_report_page.text_8fe0ff')).toBeInTheDocument();
  });

  it('渲染项目状态饼图标题、数据点和默认外半径', () => {
    renderWithProviders(<PmReportStatusPieChart data={projectStatusData} />);

    expect(screen.getByText('pm.pm_report_page.text_068934')).toBeInTheDocument();
    expect(screen.getByText('进行中:5')).toBeInTheDocument();
    expect(screen.getByText('已完成:3')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-pie')).toHaveAttribute('data-outer-radius', '80');
  });

  it('渲染风险饼图标题、数据点和自定义外半径', () => {
    renderWithProviders(
      <PmReportRiskPieChart
        data={riskData}
        outerRadius={72}
      />
    );

    expect(screen.getByText('pm.pm_report_page.text_99ce9e')).toBeInTheDocument();
    expect(screen.getByText('高风险:2')).toBeInTheDocument();
    expect(screen.getByText('中风险:4')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-pie')).toHaveAttribute('data-outer-radius', '72');
  });

  it('渲染进度图表并过滤 0 值项目', () => {
    renderWithProviders(
      <PmReportScheduleChart
        stats={{
          ...stats,
          on_time_projects: 9,
          delayed_projects: 0,
        }}
      />
    );

    expect(screen.getByText('pm.pm_report_page.text_22fd66')).toBeInTheDocument();
    expect(screen.getByText('pm.pm_report_page.name_27ff5f:9')).toBeInTheDocument();
    expect(screen.queryByText('pm.pm_report_page.name_db732e:0')).not.toBeInTheDocument();
    expect(screen.getByTestId('recharts-bar-value')).toBeInTheDocument();
  });

  it('趋势图表有数据时渲染 CPI 与 SPI 折线', () => {
    renderWithProviders(<PmReportTrendChart data={trendData} />);

    expect(screen.getByText('pm.pm_report_page.text_266064')).toBeInTheDocument();
    expect(screen.getByText('2026-01:1.08')).toBeInTheDocument();
    expect(screen.getByText('2026-02:1.12')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-line-cpi')).toHaveTextContent('CPI');
    expect(screen.getByTestId('recharts-line-spi')).toHaveTextContent('SPI');
  });

  it('趋势图表无数据时渲染默认基线月份', () => {
    renderWithProviders(<PmReportTrendChart data={[]} />);

    expect(screen.getByText('pm.pm_report_page.month_21efd8:1')).toBeInTheDocument();
  });

  it('自定义工具栏整合渲染全部报表区块并支持返回报表列表', () => {
    const navigate = vi.fn();

    renderWithProviders(
      <PmReportCustomToolbar
        params={{ projectId: 'project-1' }}
        navigate={navigate}
        projectStatusData={projectStatusData}
        riskData={riskData}
        trendData={trendData}
        budgetUtilization={45}
        stats={stats}
        benefits={benefits}
      />
    );

    expect(screen.getByText('pm.pm_report_page.text_a734d9')).toBeInTheDocument();
    expect(screen.getByText('pm.pm_report_page.text_068934')).toBeInTheDocument();
    expect(screen.getByText('pm.pm_report_page.text_99ce9e')).toBeInTheDocument();
    expect(screen.getByText('pm.pm_report_page.text_42acf5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'pm.pm_report_page.text_2e5b6d' }));
    expect(navigate).toHaveBeenCalledWith('/pm/reports');
  });
});
