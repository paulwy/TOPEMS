import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsProjectListPage from '../RsProjectListPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listProjects: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'P001',
            code: 'RD-2026-001',
            name: '新型材料研发项目',
            project_type: 'new_product',
            leader: '张三',
            status: 'in_progress',
            progress: 60,
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            budget: '100万',
          },
        ],
        total: 1,
      },
    }),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

describe('RsProjectListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 from schema title', async () => {
    renderWithProviders(<RsProjectListPage />);
    expect(await screen.findByRole('heading', { name: '研发项目' })).toBeInTheDocument();
  });

  it('renders rows from mocked API data', async () => {
    renderWithProviders(<RsProjectListPage />);
    await waitFor(() => {
      expect(screen.getByText('新型材料研发项目')).toBeInTheDocument();
      expect(screen.getByText('RD-2026-001')).toBeInTheDocument();
    });
  });
});
