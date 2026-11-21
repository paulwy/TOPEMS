import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import MonitorLogsPage from '../MonitorLogsPage';

// CrudPage 包装页：logAdapter.list 固定返回空数组（页面 MOCK_LOGS=[]），
// useQuery 调 monitorApi.alert.batch.getStatistics()（被页面 try/catch 吞掉），mock 成空响应。
// CrudPage mock 渲染 getLogSchema().title（系统日志）为 <h1>。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    alert: {
      batch: {
        getStatistics: vi.fn().mockResolvedValue({ success: true, code: 0, data: {} }),
      },
    },
  },
}));

describe('MonitorLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（系统日志）', async () => {
    renderWithProviders(<MonitorLogsPage />);

    expect(await screen.findByRole('heading', { name: '系统日志' })).toBeInTheDocument();
  });
});
