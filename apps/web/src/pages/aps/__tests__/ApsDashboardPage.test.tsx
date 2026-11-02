import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ApsDashboardPage from '../ApsDashboardPage';

// 仪表盘页：DashboardTemplate 已全局 mock（渲染 stat-card-${id}，内含 title/value span）。
// 页面用 useQuery 取 productionPlanApi.list / scheduleApi.list 的 total；LazyChart 未全局 mock，
// 按规范 §D 在测试内 mock 为占位 div。
vi.mock('@/api/aps', () => ({
  productionPlanApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: { items: [{ id: 'PP001' }], total: 5 },
    }),
  },
  scheduleApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: { items: [{ id: 'SC001' }], total: 3 },
    }),
  },
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid="lazy-chart" />,
}));

describe('ApsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards with plan & schedule counts from API totals', async () => {
    renderWithProviders(<ApsDashboardPage />);

    // plansQuery.data = total = 5，schedulesQuery.data = total = 3
    await waitFor(() => {
      const plans = screen.getByTestId('stat-card-plans');
      expect(plans).toHaveTextContent('生产计划数');
      expect(plans).toHaveTextContent('5');
      const schedules = screen.getByTestId('stat-card-schedules');
      expect(schedules).toHaveTextContent('排程数');
      expect(schedules).toHaveTextContent('3');
    });
  });

  it('renders static utilization & accuracy stat cards', async () => {
    renderWithProviders(<ApsDashboardPage />);

    await waitFor(() => {
      const util = screen.getByTestId('stat-card-utilization');
      expect(util).toHaveTextContent('产能利用率');
      expect(util).toHaveTextContent('78.5%');
      const acc = screen.getByTestId('stat-card-accuracy');
      expect(acc).toHaveTextContent('预测准确率');
      expect(acc).toHaveTextContent('92.3%');
    });
  });
});
