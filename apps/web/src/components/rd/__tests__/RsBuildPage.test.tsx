import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsBuildPage from '../RsBuildPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listBuilds: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        builds: [
          {
            id: 'B001',
            build_no: 'BUILD-2026-001',
            project_id: 'P001',
            project_name: '研发平台前端',
            branch: 'main',
            commit_hash: 'abc123',
            build_type: 'manual',
            status: 'success',
            duration: 120,
            created_at: '2026-06-01T10:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    createBuild: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsBuildPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 构建管理', async () => {
    renderWithProviders(<RsBuildPage />);
    expect(await screen.findByRole('heading', { name: '构建管理' })).toBeInTheDocument();
  });

  it('renders build rows from mocked API', async () => {
    renderWithProviders(<RsBuildPage />);
    await waitFor(() => {
      expect(screen.getByText('BUILD-2026-001')).toBeInTheDocument();
      expect(screen.getByText('研发平台前端')).toBeInTheDocument();
    });
  });
});
