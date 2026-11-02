import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsMaterialListPage from '../RsMaterialListPage';

vi.mock('@/api/rd', () => ({
  materialApi: {
    listMaterials: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        materials: [
          {
            id: 'M001',
            code: 'MAT-001',
            name: '钛白粉',
            category: 'raw',
            stock_quantity: 800,
            unit: 'kg',
            status: 'in_stock',
            specification: 'AR级',
            supplier: '某供应商',
            min_stock: 100,
            max_stock: 1000,
            location: 'A-01',
          },
        ],
        total: 1,
      },
    }),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    importMaterials: vi.fn(),
  },
}));

// Page passes headerContent as a function (not JSX). Override CrudPage to call it.
vi.mock('@/components/templates/CrudPage', () => {
  const React = require('react');
  const CrudPage = ({ schema, apiAdapter, headerContent }: any) => {
    const { useState, useEffect } = React;
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => {
      let active = true;
      if (!apiAdapter?.list) return;
      Promise.resolve(apiAdapter.list({ page: 1, pageSize: 1000 }))
        .then((resp: any) => {
          if (!active) return;
          const items = resp?.data?.items ?? resp?.data?.materials ?? resp?.data ?? [];
          setRows(Array.isArray(items) ? items : []);
        })
        .catch(() => {});
      return () => { active = false; };
    }, [apiAdapter]);
    const title = schema?.title || 'CRUD';
    const header = typeof headerContent === 'function' ? headerContent() : headerContent;
    return React.createElement(
      'div', { 'data-testid': 'crud-page' },
      React.createElement('h1', null, title),
      header,
      ...rows.map((row: any, ri: number) =>
        React.createElement('div', { key: ri, 'data-testid': `crud-row-${ri}` },
          ...(schema?.fields ?? []).map((f: any) =>
            React.createElement('span', { key: f.name, 'data-testid': `cell-${f.name}-${ri}` }, String(row[f.name] ?? ''))
          )
        )
      )
    );
  };
  return { __esModule: true, default: CrudPage };
});

describe('RsMaterialListPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders h1 研发物料 and stat cards', async () => {
    renderWithProviders(<RsMaterialListPage />);
    expect(await screen.findByRole('heading', { name: '研发物料' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('总计')).toBeInTheDocument();
    });
    expect(screen.getByText('充足')).toBeInTheDocument();
    expect(screen.getByText('不足')).toBeInTheDocument();
  });
});
