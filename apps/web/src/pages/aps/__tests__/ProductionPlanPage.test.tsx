import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ProductionPlanPage from '../ProductionPlanPage';

// CrudPage 包装页：mock api 使 adapter.list 命中确定性数据；
// schema title 走 @/i18n（setup-mocks 已注入真实 zh 文案）→ 真实中文标题。
vi.mock('@/api/aps', () => ({
  productionPlanApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'PP001',
            plan_no: 'PP-2026-001',
            plan_name: '月度生产计划A',
            plan_type: 'monthly',
            start_date: '2026-11-01',
            end_date: '2026-11-30',
            status: 'approved',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProductionPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（生产计划）', async () => {
    renderWithProviders(<ProductionPlanPage />);

    expect(
      await screen.findByRole('heading', { name: '生产计划' })
    ).toBeInTheDocument();
  });

  it('renders production plan rows from mocked API data', async () => {
    renderWithProviders(<ProductionPlanPage />);

    await waitFor(() => {
      expect(screen.getByText('PP-2026-001')).toBeInTheDocument();
      expect(screen.getByText('月度生产计划A')).toBeInTheDocument();
    });
  });
});
