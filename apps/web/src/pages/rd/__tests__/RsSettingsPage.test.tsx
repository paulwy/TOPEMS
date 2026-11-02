import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsSettingsPage from '../RsSettingsPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_projects: 12,
        total_experiments: 34,
        total_formulas: 56,
        total_tasks: 78,
      },
    }),
  },
}));

vi.mock('@/api/rd/settings', () => ({
  rdSettingsApi: {
    getSettings: vi.fn().mockResolvedValue({ success: true, data: { settings: { items: '[]' } } }),
    updateSettings: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

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
          const items = resp?.data ?? (Array.isArray(resp) ? resp : []);
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
  return { __esModule: true, default: CrudPage, CrudPage };
});

describe('RsSettingsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders statistics cards and repo tab default data', async () => {
    renderWithProviders(<RsSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('系统统计')).toBeInTheDocument();
    });
    expect(screen.getByText('项目总数')).toBeInTheDocument();
    expect(screen.getByText('试验总数')).toBeInTheDocument();
    expect(screen.getByText('配方总数')).toBeInTheDocument();
    expect(screen.getByText('任务总数')).toBeInTheDocument();
    // repo tab default items
    expect(screen.getByText('仓库管理')).toBeInTheDocument();
    expect(screen.getByText('仓库列表')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('frontend-app')).toBeInTheDocument();
    });
  });
});
