import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsDeployPage from '../RsDeployPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listDeploys: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'DP001',
            deploy_no: 'DEPLOY-2026-001',
            project_name: '研发平台',
            env: 'prod',
            deploy_type: 'full',
            status: 'success',
            deployer: '张三',
            deploy_time: '2026-06-01 10:00',
            target_url: 'https://example.com',
            project_id: 'P001',
            build_id: 'B001',
            environment: 'production',
            app_name: 'rd-app',
            version: 'v1.0.0',
          },
        ],
        total: 1,
      },
    }),
    createDeploy: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsDeployPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 部署管理', async () => {
    renderWithProviders(<RsDeployPage />);
    expect(await screen.findByRole('heading', { name: '部署管理' })).toBeInTheDocument();
  });

  it('renders deploy rows from mocked API', async () => {
    renderWithProviders(<RsDeployPage />);
    await waitFor(() => {
      expect(screen.getByText('DEPLOY-2026-001')).toBeInTheDocument();
    });
  });
});
