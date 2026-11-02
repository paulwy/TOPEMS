import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ForecastManagementPage from '../ForecastManagementPage';

// CrudPage 包装页：mock forecastApi.list 返回 data.items。
// 注意：forecastSchema.title = i18n.t('pages.forecast_management_page.k3')，
// 该 key 在 zh/pages.json 中为「删除中...」（疑似误用 key，应为 k4「需求预测管理（计算/验证）」）。
// 此处按页面真实渲染结果断言，并在交付报告中记录该页面问题。
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

  it('renders page heading（当前 schema.title 实际渲染为「删除中...」）', async () => {
    renderWithProviders(<ForecastManagementPage />);
    // 真实渲染结果：title key 误用导致显示「删除中...」
    expect(
      await screen.findByRole('heading', { name: '删除中...' })
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
