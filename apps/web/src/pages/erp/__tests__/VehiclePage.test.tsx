import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import VehiclePage from '../VehiclePage';

// CrudPage 包装页 + 内嵌 VehicleStats（useQuery 调 vehicleApi.list）。
vi.mock('@/api/erp', () => ({
  vehicleApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'V001',
            plate_number: '京A12345',
            brand: '丰田',
            model: '凯美瑞',
            vehicle_type: 'car',
            driver: '张三',
            mileage: 50000,
            fuel_type: 'gasoline',
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
  },
}));

describe('VehiclePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats header（车辆总数）from mocked list', async () => {
    renderWithProviders(<VehiclePage />);

    expect(await screen.findByText('车辆总数')).toBeInTheDocument();
  });

  it('renders vehicle row cells from mocked API data', async () => {
    renderWithProviders(<VehiclePage />);

    await waitFor(() => {
      expect(screen.getByText('京A12345')).toBeInTheDocument();
    });
  });
});
