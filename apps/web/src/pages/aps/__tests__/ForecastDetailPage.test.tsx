import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ForecastDetailPage from '../ForecastDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ id: 'FC001' }) };
});

vi.mock('@/api/aps', () => ({
  forecastApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        id: 'FC001',
        forecast_no: 'FC-2026-001',
        product_name: '轴承座',
        forecast_period: '2026-12',
        forecast_date: '2026-11-01',
        forecast_quantity: 15000,
        actual_quantity: 14200,
        accuracy_rate: 94.7,
        method: '指数平滑',
        confidence_level: 85,
        notes: 'Q4 预测',
        status: 'draft',
      },
    }),
    calculate: vi.fn(),
    validate: vi.fn(),
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

describe('ForecastDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches forecast by route id and renders basic-info section', async () => {
    renderWithProviders(<ForecastDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    expect(within(basic).getByText('预测编号')).toBeInTheDocument();
    expect(within(basic).getByText('FC-2026-001')).toBeInTheDocument();
    expect(within(basic).getByText('产品名称')).toBeInTheDocument();
    expect(within(basic).getByText('轴承座')).toBeInTheDocument();
    // forecast_quantity 经 toLocaleString → 15,000；accuracy_rate → 94.7%
    expect(within(basic).getByText('15,000')).toBeInTheDocument();
    expect(within(basic).getByText('94.7%')).toBeInTheDocument();
  });

  it('shows detail page title as forecast_no', async () => {
    renderWithProviders(<ForecastDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'FC-2026-001' })).toBeInTheDocument();
    });
  });
});
