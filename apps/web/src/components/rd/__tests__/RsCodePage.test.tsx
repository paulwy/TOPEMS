import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsCodePage from '../RsCodePage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listProjects: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        projects: [
          {
            id: 'P001',
            project_name: '研发平台前端',
            name: '研发平台前端',
            code: 'RS-2026-001',
            leader: '张三',
            status: 'in_progress',
            progress: 60,
            start_date: '2026-01-01',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    updateProject: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsCodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 代码库', async () => {
    renderWithProviders(<RsCodePage />);
    expect(await screen.findByRole('heading', { name: '代码库' })).toBeInTheDocument();
  });

  it('renders project rows with real fields, no fake repo metrics', async () => {
    renderWithProviders(<RsCodePage />);
    await waitFor(() => {
      expect(screen.getByTestId('cell-project_name-0')).toHaveTextContent('研发平台前端');
      expect(screen.getByTestId('cell-code-0')).toHaveTextContent('RS-2026-001');
      expect(screen.getByTestId('cell-leader-0')).toHaveTextContent('张三');
    });
  });

  it('shows empty-state notice about no code repo integration', async () => {
    renderWithProviders(<RsCodePage />);
    await waitFor(() => {
      expect(screen.getByText(/暂无代码仓数据接入/)).toBeInTheDocument();
    });
  });
});
