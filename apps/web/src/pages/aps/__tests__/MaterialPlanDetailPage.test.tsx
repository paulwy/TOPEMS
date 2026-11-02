import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MaterialPlanDetailPage from '../MaterialPlanDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ id: 'MP001' }) };
});

vi.mock('@/api/aps', () => ({
  materialPlanApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        id: 'MP001',
        plan_no: 'MP-2026-001',
        material_code: 'M-1001',
        material_name: '高强度螺栓',
        required_quantity: 5000,
        available_quantity: 3200,
        shortfall_quantity: 1800,
        required_date: '2026-11-10',
        supply_type: '自制',
        status: 'pending',
      },
    }),
    requisition: vi.fn(),
    cancel: vi.fn(),
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
        <section key={s.id} data-testid={`section-${s.id}`}>
          <h3>{s.title}</h3>
          <div>{s.content}</div>
        </section>
      ))}
    </div>
  ),
}));

describe('MaterialPlanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches material plan by route id and renders basic-info section', async () => {
    renderWithProviders(<MaterialPlanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    expect(within(basic).getByText('计划编号')).toBeInTheDocument();
    expect(within(basic).getByText('MP-2026-001')).toBeInTheDocument();
    expect(within(basic).getByText('物料名称')).toBeInTheDocument();
    expect(within(basic).getByText('高强度螺栓')).toBeInTheDocument();
    // 数量经 toLocaleString → 5,000
    expect(within(basic).getByText('5,000')).toBeInTheDocument();
  });

  it('shows detail page title as plan_no', async () => {
    renderWithProviders(<MaterialPlanDetailPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'MP-2026-001' })
      ).toBeInTheDocument();
    });
  });
});
