import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ProcessRoutePage from '../ProcessRoutePage';

// CrudPage 包装页，但 processRouteAdapter 是页面手写的：
// adapter.list → processRouteApi.list → 取 response.data.routes 作为 data 数组返回。
// CrudPage mock 再取 resp.data（即 routes 数组）渲染行。
vi.mock('@/api/mes/process', () => ({
  processRouteApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        routes: [
          {
            id: 'PR001',
            code: 'PR-ASSY-01',
            name: '总装工艺路线',
            version: 'V1.0',
            process_count: 5,
            total_standard_time: 30,
            status: 'active',
            description: '标准总装流程',
            created_at: '2026-11-01T08:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    getSteps: vi.fn().mockResolvedValue({ success: true, data: { steps: [] } }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProcessRoutePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（工艺路线）', async () => {
    renderWithProviders(<ProcessRoutePage />);

    expect(
      await screen.findByRole('heading', { name: '工艺路线' })
    ).toBeInTheDocument();
  });

  it('renders process route row cells from mocked API data', async () => {
    renderWithProviders(<ProcessRoutePage />);

    await waitFor(() => {
      expect(screen.getByText('PR-ASSY-01')).toBeInTheDocument();
      expect(screen.getByText('总装工艺路线')).toBeInTheDocument();
    });
  });
});
