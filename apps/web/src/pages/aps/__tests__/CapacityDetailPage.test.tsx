import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import CapacityDetailPage from '../CapacityDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ id: 'CP001' }) };
});

vi.mock('@/api/aps', () => ({
  capacityApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        id: 'CP001',
        work_center_id: 'WC-01',
        work_center_name: '装配一线',
        capacity_date: '2026-11-05',
        available_hours: 16,
        used_hours: 12.5,
        utilization_rate: 78.1,
        status: 'available',
      },
    }),
    allocate: vi.fn(),
    release: vi.fn(),
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

describe('CapacityDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches capacity by route id and renders basic-info section', async () => {
    renderWithProviders(<CapacityDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    expect(within(basic).getByText('工作中心')).toBeInTheDocument();
    expect(within(basic).getByText('装配一线')).toBeInTheDocument();
    expect(within(basic).getByText('产能日期')).toBeInTheDocument();
    expect(within(basic).getByText('2026-11-05')).toBeInTheDocument();
    // 利用率渲染为 78.1%
    expect(within(basic).getByText('78.1%')).toBeInTheDocument();
  });

  it('shows detail page title as work_center_name', async () => {
    renderWithProviders(<CapacityDetailPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '装配一线' })
      ).toBeInTheDocument();
    });
  });
});
