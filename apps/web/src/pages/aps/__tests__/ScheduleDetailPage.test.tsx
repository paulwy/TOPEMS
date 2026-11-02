import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ScheduleDetailPage from '../ScheduleDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ id: 'SC001' }) };
});

vi.mock('@/api/aps', () => ({
  scheduleApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        id: 'SC001',
        schedule_no: 'SCH-2026-001',
        product_name: '轴承座',
        work_center_name: '装配一线',
        quantity: 1200,
        priority: 3,
        planned_start: '2026-11-05 08:00',
        planned_end: '2026-11-05 18:00',
        actual_start: '2026-11-05 08:10',
        status: 'released',
      },
    }),
    release: vi.fn(),
    hold: vi.fn(),
  },
}));

// 全局 DetailPageTemplate 是 children-only stub，覆盖以渲染页面计算出的 title/sections。
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

describe('ScheduleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches schedule by route id and renders basic-info section', async () => {
    renderWithProviders(<ScheduleDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('基本信息')).toBeInTheDocument();
    });
    const basic = screen.getByTestId('section-basic');
    expect(within(basic).getByText('排程编号')).toBeInTheDocument();
    expect(within(basic).getByText('SCH-2026-001')).toBeInTheDocument();
    expect(within(basic).getByText('产品名称')).toBeInTheDocument();
    expect(within(basic).getByText('轴承座')).toBeInTheDocument();
  });

  it('shows detail page title as schedule_no', async () => {
    renderWithProviders(<ScheduleDetailPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'SCH-2026-001' })
      ).toBeInTheDocument();
    });
  });
});
