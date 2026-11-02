import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MaterialPlanPage from '../MaterialPlanPage';

// CrudPage 包装页：mock materialPlanApi.list 返回 data.items。
vi.mock('@/api/aps', () => ({
  materialPlanApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
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
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    requisition: vi.fn(),
    cancel: vi.fn(),
  },
}));

describe('MaterialPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（物料计划）', async () => {
    renderWithProviders(<MaterialPlanPage />);
    expect(await screen.findByRole('heading', { name: '物料计划' })).toBeInTheDocument();
  });

  it('renders material plan rows from mocked API data', async () => {
    renderWithProviders(<MaterialPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('MP-2026-001')).toBeInTheDocument();
      expect(screen.getByText('高强度螺栓')).toBeInTheDocument();
    });
  });
});
