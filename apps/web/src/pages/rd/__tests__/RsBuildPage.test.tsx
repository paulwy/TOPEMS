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

describe('RsBuildPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
