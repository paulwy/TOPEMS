import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsBugPage from '../RsBugPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listBugs: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        bugs: [
          {
            id: 'BG001',
            bug_no: 'BUG-2026-001',
            bug_title: '登录按钮无响应',
            severity: 'high',
            priority: 'high',
            status: 'open',
            assignee: '张三',
            create_time: '2026-06-01',
            description: '点击登录按钮无反应',
          },
        ],
        total: 1,
      },
    }),
    createBug: vi.fn(),
    updateBug: vi.fn().mockResolvedValue({ success: true, data: {} }),
    deleteBug: vi.fn(),
  },
}));

describe('RsBugPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 缺陷', async () => {
    renderWithProviders(<RsBugPage />);
    expect(await screen.findByRole('heading', { name: '缺陷' })).toBeInTheDocument();
  });

  it('renders bug rows from mocked API', async () => {
    renderWithProviders(<RsBugPage />);
    await waitFor(() => {
      expect(screen.getByText('BUG-2026-001')).toBeInTheDocument();
      expect(screen.getByText('登录按钮无响应')).toBeInTheDocument();
    });
  });
});
