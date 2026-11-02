import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsExperimentListPage from '../RsExperimentListPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listExperiments: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        experiments: [
          {
            id: 'E001',
            code: 'EXP-2026-001',
            name: '催化剂活性试验',
            project_id: 'P001',
            phase: 'lab',
            status: 'in_progress',
            experimenter: '李四',
          },
        ],
        total: 1,
      },
    }),
    listLabExperiments: vi.fn(),
    listPilotExperiments: vi.fn(),
    listScaleupExperiments: vi.fn(),
    createExperiment: vi.fn(),
    updateExperiment: vi.fn(),
    deleteExperiment: vi.fn(),
  },
}));

// Page uses named import { CrudPage } but global mock only ships default.
// Re-implement a minimal CrudPage mock that mirrors the global one.
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

describe('RsExperimentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 from schema title', async () => {
    renderWithProviders(<RsExperimentListPage />);
    expect(await screen.findByRole('heading', { name: '试验管理' })).toBeInTheDocument();
  });

  it('renders rows from mocked experiments API', async () => {
    renderWithProviders(<RsExperimentListPage />);
    await waitFor(() => {
      expect(screen.getByText('催化剂活性试验')).toBeInTheDocument();
      expect(screen.getByText('EXP-2026-001')).toBeInTheDocument();
    });
  });
});
