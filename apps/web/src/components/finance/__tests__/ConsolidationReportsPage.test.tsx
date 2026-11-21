import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsolidationReportsPage from '../ConsolidationReportsPage';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useNotification', () => ({
  useNotification: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/hooks/useConsolidation', () => ({
  useConsolidationReports: () => ({
    data: { items: [] },
    isLoading: false,
    refetch: vi.fn(),
    error: null,
  }),
  useConsolidationScopes: () => ({ data: { items: [] }, error: null }),
  useConsolidationReportLines: () => ({ data: null }),
  useApproveConsolidationReport: () => ({ mutate: vi.fn() }),
  usePublishConsolidationReport: () => ({ mutate: vi.fn() }),
  useGenerateConsolidationReport: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ConsolidationReportsPage P0 unavailable state', () => {
  it('shows the unavailable notice and does not render the fake report table', () => {
    render(<ConsolidationReportsPage />);

    expect(screen.getByText('finance.consolidation_reports_page.unavailable_title')).toBeTruthy();
    expect(screen.getByText('finance.consolidation_reports_page.unavailable_desc')).toBeTruthy();
    // 未开放状态不得渲染报表列表 / 生成入口
    expect(screen.queryByText('finance.consolidation_reports_page.list_2')).toBeNull();
    expect(screen.queryByText('finance.consolidation_reports_page.e3')).toBeNull();
  });
});
