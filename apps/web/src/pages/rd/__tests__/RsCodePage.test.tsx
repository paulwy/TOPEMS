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
            repo_url: 'https://git.example.com/rd/frontend.git',
            tech_stack: 'TypeScript',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    updateProject: vi.fn().mockResolvedValue({ success: true, data: {} }),
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
      return () => {
        active = false;
      };
    }, [apiAdapter]);
    const title = schema?.title || 'CRUD';
    return React.createElement(
      'div',
      { 'data-testid': 'crud-page' },
      React.createElement('h1', null, title),
      ...rows.map((row: any, ri: number) =>
        React.createElement(
          'div',
          { key: ri, 'data-testid': `crud-row-${ri}` },
          ...(schema?.fields ?? []).map((f: any) =>
            React.createElement(
              'span',
              { key: f.name, 'data-testid': `cell-${f.name}-${ri}` },
              String(row[f.name] ?? '')
            )
          )
        )
      )
    );
  };
  return { __esModule: true, default: CrudPage, CrudPage };
});

describe('RsCodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 代码库', async () => {
    renderWithProviders(<RsCodePage />);
    expect(await screen.findByRole('heading', { name: '代码库' })).toBeInTheDocument();
  });

  it('renders repo rows derived from projects', async () => {
    renderWithProviders(<RsCodePage />);
    await waitFor(() => {
      expect(screen.getByTestId('cell-repo_name-0')).toHaveTextContent('研发平台前端');
      expect(screen.getByTestId('cell-language-0')).toHaveTextContent('TypeScript');
    });
  });
});
