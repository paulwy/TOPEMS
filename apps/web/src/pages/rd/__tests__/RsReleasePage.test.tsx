import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsReleasePage from '../RsReleasePage';

vi.mock('@/api/rd', () => ({
  deployApi: {
    listDeploys: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'RL001',
            version: 'v2.8.1',
            deploy_no: 'DEPLOY-001',
            environment: 'production',
            status: 'success',
            deploy_time: '2026-06-01 10:00',
            deployer: '张三',
            release_note: '修复若干问题',
            app_name: 'rd-app',
          },
        ],
        total: 1,
      },
    }),
    createDeploy: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsReleasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 配方发布', async () => {
    renderWithProviders(<RsReleasePage />);
    expect(await screen.findByRole('heading', { name: '配方发布' })).toBeInTheDocument();
  });

  it('renders release rows from mocked API', async () => {
    renderWithProviders(<RsReleasePage />);
    await waitFor(() => {
      expect(screen.getByText('v2.8.1')).toBeInTheDocument();
    });
  });
});
