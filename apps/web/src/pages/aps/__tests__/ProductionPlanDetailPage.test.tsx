import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ProductionPlanDetailPage from '../ProductionPlanDetailPage';

// 详情页：mock useParams 提供 id，mock api.get 返回确定性数据。
// setup-mocks 的 DetailPageTemplate 是 children-only stub（props 被吞），
// 因此在测试内覆盖该模板 mock，渲染 title/subtitle/sections，使页面计算出的
// 详情区块真正进入 DOM 并接受断言（页面→sections 的映射被真实执行）。
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useParams: () => ({ id: 'PP001' }),
  };
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
        target_quantity: 1200,
        start_date: '2026-11-01',
        end_date: '2026-11-30',
        notes: '重点批次',
        status: 'approved',
      },
    }),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: ({
    title,
    subtitle,
    headerContent,
    sections,
  }: {
    title?: string;
    subtitle?: string;
    headerContent?: React.ReactNode;
    sections?: Array<{ id: string; title: string; content: React.ReactNode }>;
  }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <div>{subtitle}</div> : null}
      {headerContent}
      {sections?.map((s) => (
        <section
          key={s.id}
          data-testid={`section-${s.id}`}
        >
          <h3>{s.title}</h3>
          <div>{s.content}</div>
        </section>
      ))}
    </div>
  ),
}));

describe('ProductionPlanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches plan by route id and renders basic-info section', async () => {
    renderWithProviders(<ProductionPlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    // 标签与值均来自页面计算（t('aps.production_plan_detail_page.k3') = 计划编号）
    expect(within(basic).getByText('计划编号')).toBeInTheDocument();
    expect(within(basic).getByText('PP-2026-001')).toBeInTheDocument();
    expect(within(basic).getByText('月度生产计划A')).toBeInTheDocument();
    expect(within(basic).getByText('轴承座')).toBeInTheDocument();
  });

  it('shows detail page title as plan_no', async () => {
    renderWithProviders(<ProductionPlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'PP-2026-001' })).toBeInTheDocument();
    });
  });
});
