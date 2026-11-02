import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsReviewPage from '../RsReviewPage';

vi.mock('@/api/rd', () => ({
  buildApi: {
    listBuilds: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'RV001',
            title: '配方V2.0评审',
            reviewer: '王五',
            author: '李四',
            status: 'pending',
            create_time: '2026-06-01',
            comment_count: 3,
            project_id: 'P001',
            branch: 'main',
            commit_hash: 'abc123',
            build_type: 'manual',
            build_no: 'BUILD-001',
            project_name: '研发平台',
          },
        ],
        total: 1,
      },
    }),
    createBuild: vi.fn(),
  },
}));

describe('RsReviewPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders h1 配方评审', async () => {
    renderWithProviders(<RsReviewPage />);
    expect(await screen.findByRole('heading', { name: '配方评审' })).toBeInTheDocument();
  });

  it('renders review rows from mocked API', async () => {
    renderWithProviders(<RsReviewPage />);
    await waitFor(() => {
      expect(screen.getByText('配方V2.0评审')).toBeInTheDocument();
    });
  });
});
