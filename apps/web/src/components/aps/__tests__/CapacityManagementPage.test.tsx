import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import CapacityManagementPage from '../CapacityManagementPage';

// CrudPage 包装页：mock capacityApi.list 返回 data.items。
vi.mock('@/api/aps', () => ({
  capacityApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'CP001',
            work_center_id: 'WC-01',
            work_center_name: '装配一线',
            capacity_date: '2026-11-05',
            available_hours: 16,
            used_hours: 12.5,
            utilization_rate: 78.1,
            status: 'available',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    allocate: vi.fn(),
    release: vi.fn(),
  },
}));

describe('CapacityManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（产能管理）', async () => {
    renderWithProviders(<CapacityManagementPage />);
    expect(await screen.findByRole('heading', { name: '产能管理' })).toBeInTheDocument();
  });

  it('renders capacity rows from mocked API data', async () => {
    renderWithProviders(<CapacityManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('装配一线')).toBeInTheDocument();
      expect(screen.getByText('2026-11-05')).toBeInTheDocument();
    });
  });
});
