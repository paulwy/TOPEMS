import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsDocPage from '../RsDocPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        total_projects: 2,
        total_experiments: 1,
        total_formulas: 1,
        total_tasks: 1,
      },
    }),
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

describe('RsDocPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders h1 文档', async () => {
    renderWithProviders(<RsDocPage />);
    expect(await screen.findByRole('heading', { name: '文档' })).toBeInTheDocument();
  });

  it('renders doc rows derived from statistics', async () => {
    renderWithProviders(<RsDocPage />);
    await waitFor(() => {
      // First row doc_type is 设计文档 (from total_projects=2)
      expect(screen.getByTestId('cell-doc_type-0')).toHaveTextContent('设计文档');
    });
  });
});
