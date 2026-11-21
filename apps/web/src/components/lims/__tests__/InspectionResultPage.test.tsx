import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import InspectionResultPage from '../InspectionResultPage';

vi.mock('@/api/lims', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/lims')>();
  return {
    ...actual,
    recordApi: {
      list: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            {
              id: 'REC001',
              task_id: 'T20260901',
              step_id: 'S1',
              step_name: '外观检查',
              result: '合格',
              conclusion: 'pass',
              inspector: '李四',
              recorded_at: '2026-09-04T00:00:00Z',
              created_at: '2026-09-04T00:00:00Z',
            },
          ],
          total: 1,
        },
      }),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('react-i18next', () => {
  const keys: Record<string, string> = {
    'lims.inspection_result_page.k0': '检验结果',
    'lims.inspection_result_page.col_sample_no': '样品编号',
    'lims.inspection_result_page.col_item_name': '检验项目',
    'lims.inspection_result_page.col_result': '结果',
    'lims.inspection_result_page.col_status': '状态',
    'lims.inspection_result_page.col_inspector': '检验员',
    'lims.inspection_result_page.col_inspection_date': '检验日期',
    'pages.inspection_result_page.k0': '暂无检验结果',
  };
  return {
    useTranslation: () => ({ t: (k: string) => keys[k] ?? k }),
  };
});

describe('InspectionResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and calls recordApi.list on mount', async () => {
    renderWithProviders(<InspectionResultPage />);

    expect(screen.getByText('检验结果')).toBeInTheDocument();
    const { recordApi } = await import('@/api/lims');
    await waitFor(() => {
      expect(recordApi.list).toHaveBeenCalled();
    });
  });

  it('renders inspection rows from API response', async () => {
    renderWithProviders(<InspectionResultPage />);

    await waitFor(() => {
      expect(screen.getByText('T20260901')).toBeInTheDocument();
      expect(screen.getByText('外观检查')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });
  });
});
