import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import PlanComparisonDetailPage from '../PlanComparisonDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ id: 'PP001' }) };
});

vi.mock('@/api/aps', () => ({
  productionPlanApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        id: 'PP001',
        plan_no: 'PP-2026-001',
        plan_name: '月度生产计划A',
        plan_type: 'monthly',
        product_name: '轴承座',
        target_quantity: 7500,
        start_date: '2026-11-01',
        end_date: '2026-11-30',
        status: 'approved',
      },
    }),
  },
}));

// recharts 已全局 mock。覆盖 DetailPageTemplate 以渲染 title/infoCard/sections。
vi.mock('@/components/templates', () => ({
  DetailPageTemplate: ({
    title,
    subtitle,
    headerContent,
    infoCard,
    sections,
  }: {
    title?: string;
    subtitle?: string;
    headerContent?: React.ReactNode;
    infoCard?: { stats?: Array<{ label: string; value: string }> };
    sections?: Array<{ id: string; title: string; content: React.ReactNode }>;
  }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <div>{subtitle}</div> : null}
      {headerContent}
      {infoCard?.stats?.map((s, i) => (
        <div key={i} data-testid={`info-stat-${i}`}>
          <span>{s.label}</span>
          <span>{s.value}</span>
        </div>
      ))}
      {sections?.map((s) => (
        <section key={s.id} data-testid={`section-${s.id}`}>
          <h3>{s.title}</h3>
          <div>{s.content}</div>
        </section>
      ))}
    </div>
  ),
}));

describe('PlanComparisonDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches plan and renders chart & basic sections', async () => {
    renderWithProviders(<PlanComparisonDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('计划 vs 实际产量对比')).toBeInTheDocument();
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    expect(within(basic).getByText('计划编号')).toBeInTheDocument();
    expect(within(basic).getByText('PP-2026-001')).toBeInTheDocument();
    expect(within(basic).getByText('计划名称')).toBeInTheDocument();
    expect(within(basic).getByText('月度生产计划A')).toBeInTheDocument();
  });

  it('renders info card with planned/actual totals and adherence rate', async () => {
    renderWithProviders(<PlanComparisonDetailPage />);

    // MOCK_COMPARISON: planned=7500, actual=7230, adherence=96.4%
    await waitFor(() => {
      expect(screen.getByTestId('info-stat-0')).toHaveTextContent('计划总量');
      expect(screen.getByTestId('info-stat-0')).toHaveTextContent('7,500');
      expect(screen.getByTestId('info-stat-1')).toHaveTextContent('实际总量');
      expect(screen.getByTestId('info-stat-1')).toHaveTextContent('7,230');
      expect(screen.getByTestId('info-stat-2')).toHaveTextContent('达成率');
      expect(screen.getByTestId('info-stat-2')).toHaveTextContent('96.4%');
    });
  });
});
