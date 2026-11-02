import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsMaterialListPage from '../RsMaterialListPage';

vi.mock('@/api/rd', () => ({
  materialApi: {
    listMaterials: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        materials: [
          {
            id: 'M001',
            code: 'MAT-001',
            name: '钛白粉',
            category: 'raw',
            stock_quantity: 800,
            unit: 'kg',
            status: 'in_stock',
            specification: 'AR级',
            supplier: '某供应商',
            min_stock: 100,
            max_stock: 1000,
            location: 'A-01',
          },
        ],
        total: 1,
      },
    }),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    importMaterials: vi.fn(),
  },
}));

describe('RsMaterialListPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders h1 研发物料 and stat cards', async () => {
    renderWithProviders(<RsMaterialListPage />);
    expect(await screen.findByRole('heading', { name: '研发物料' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('总计')).toBeInTheDocument();
    });
    expect(screen.getByText('充足')).toBeInTheDocument();
    expect(screen.getByText('不足')).toBeInTheDocument();
  });
});
