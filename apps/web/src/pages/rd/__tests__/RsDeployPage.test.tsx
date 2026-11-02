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
        deploys: [
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

vi.mock('@/components/templates/CrudPage', () => {
  const React = require('react');
  const CrudPage = ({ schema, apiAdapter }: any) => {
    const { useState, useEffect } = React;
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => {
      let active = true;
      if (!apiAdapter?.list) return;
      Promise.resolve(apiAdapter.list({ page: 1, pageSize: 1000 }))
        .then((resp: any) => {
          if (!active) return;
          const items = resp?.data ?? (Array.isArray(resp) ? resp : []);
          setRows(Array.isArray(items) ? items : []);
        })
        .catch(() => {});
      return () => { active = false; };
    }, [apiAdapter]);
    const title = schema?.title || 'CRUD';
    return React.createElement(
      'div', { 'data-testid': 'crud-page' },
      React.createElement('h1', null, title),
      ...rows.map((row: any, ri: number) =>
        React.createElement('div', { key: ri, 'data-testid': `crud-row-${ri}` },
          ...(schema?.fields ?? []).map((f: any) =>
            React.createElement('span', { key: f.name, 'data-testid': `cell-${f.name}-${ri}` }, String(row[f.name] ?? ''))
          )
        )
      )
    );
  };
  return { __esModule: true, default: CrudPage, CrudPage };
});

describe('RsDeployPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
