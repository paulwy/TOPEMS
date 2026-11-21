import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ForecastManagementPage from '../ForecastManagementPage';

// CrudPage 包装页：mock forecastApi.list 返回 data.items。
// forecastSchema.title 已修正为 pages.forecast_management_page.k4
// （zh =「需求预测管理（计算/验证）」，en = "Requirement Prediction Management( Calculate/ Validation)"）。
vi.mock('@/api/aps', () => ({
  forecastApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'FC001',
            forecast_no: 'FC-2026-001',
            product_name: '轴承座',
            forecast_period: '2026-12',
            forecast_date: '2026-11-01',
            forecast_quantity: 15000,
            actual_quantity: 14200,
            accuracy_rate: 94.7,
            method: '指数平滑',
            confidence_level: 85,
            status: 'draft',
            notes: 'Q4 预测',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    calculate: vi.fn(),
    validate: vi.fn(),
  },
}));

describe('ForecastManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（需求预测管理（计算/验证））', async () => {
    renderWithProviders(<ForecastManagementPage />);
    expect(
      await screen.findByRole('heading', { name: '需求预测管理（计算/验证）' })
    ).toBeInTheDocument();
  });

  it('renders forecast rows from mocked API data', async () => {
    renderWithProviders(<ForecastManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('FC-2026-001')).toBeInTheDocument();
      expect(screen.getByText('轴承座')).toBeInTheDocument();
    });
  });
});
