import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import ScheduleManagementPage from '../ScheduleManagementPage';

// CrudPage 包装页：mock scheduleApi.list 返回 data.items；
// 全局 CrudPage mock 渲染 <h1>{schema.title}</h1> 与 cell-${field}-${ri}。
vi.mock('@/api/aps', () => ({
  scheduleApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'SC001',
            schedule_no: 'SCH-2026-001',
            product_name: '轴承座',
            work_center_name: '装配一线',
            planned_start: '2026-11-05 08:00',
            planned_end: '2026-11-05 18:00',
            quantity: 1200,
            priority: 3,
            status: 'released',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    release: vi.fn(),
    hold: vi.fn(),
  },
}));

describe('ScheduleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（排程管理）', async () => {
    renderWithProviders(<ScheduleManagementPage />);
    expect(await screen.findByRole('heading', { name: '排程管理' })).toBeInTheDocument();
  });

  it('renders schedule rows from mocked API data', async () => {
    renderWithProviders(<ScheduleManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('SCH-2026-001')).toBeInTheDocument();
      expect(screen.getByText('轴承座')).toBeInTheDocument();
    });
  });
});
