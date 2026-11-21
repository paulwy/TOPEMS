import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import OfficeSuppliesPage from '../OfficeSuppliesPage';

// CrudPage 包装页 + 内嵌 OfficeSuppliesStats（useQuery 调 officeSupplyApi.list）。
// createCrudPageAdapter 被全局 mock 为 identity，因此 CrudPage mock 与 stats 都直接
// 调 officeSupplyApi.list；list 返回 data.items 时两条路径都能取到行。
vi.mock('@/api/erp', () => ({
  officeSupplyApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'OS001',
            name: 'A4复印纸',
            category: 'stationery',
            quantity: 100,
            unit: '包',
            price: 25.5,
            location: '文具区',
            status: 'in_stock',
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

describe('OfficeSuppliesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats header（物品总数）from mocked list', async () => {
    renderWithProviders(<OfficeSuppliesPage />);

    // OfficeSuppliesStats 渲染真实中文统计标签
    expect(await screen.findByText('物品总数')).toBeInTheDocument();
  });

  it('renders office supply row cells from mocked API data', async () => {
    renderWithProviders(<OfficeSuppliesPage />);

    await waitFor(() => {
      expect(screen.getByText('A4复印纸')).toBeInTheDocument();
    });
  });
});
