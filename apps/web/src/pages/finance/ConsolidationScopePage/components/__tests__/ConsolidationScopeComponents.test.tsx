import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { ConsolidationScopeTable } from '../ConsolidationScopeTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/common/DataTable', async () => {
  const React = await import('react');
  return {
    DataTable: ({
      columns,
      data,
      onRowClick,
    }: {
      columns: any[];
      data: any[];
      onRowClick?: (row: any) => void;
    }) =>
      React.createElement(
        'table',
        { 'data-testid': 'mock-data-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            columns.map((column) =>
              React.createElement('th', { key: column.id ?? column.accessorKey }, column.header)
            )
          )
        ),
        React.createElement(
          'tbody',
          null,
          data.map((row) =>
            React.createElement(
              'tr',
              {
                key: row.id,
                onClick: () => onRowClick?.(row),
              },
              columns.map((column) => {
                const key = column.id ?? column.accessorKey;
                const getValue = (field: string) => row[field];
                const value = column.cell
                  ? column.cell({ row: { original: row, getValue } })
                  : row[column.accessorKey];
                return React.createElement('td', { key }, value);
              })
            )
          )
        )
      ),
  };
});

const scopes = [
  {
    id: 'scope-1',
    code: 'CS-001',
    name: '集团合并范围',
    consolidation_method: 'full',
    description: '纳入全资子公司',
    status: 'active',
  },
  {
    id: 'scope-2',
    code: 'CS-002',
    name: '联营公司范围',
    consolidation_method: 'equity',
    description: '',
    status: 'draft',
  },
];

describe('ConsolidationScope components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    renderWithProviders(
      <ConsolidationScopeTable
        scopes={undefined}
        loading
        onSelectScope={vi.fn()}
        onDeleteScope={vi.fn()}
        onRuleConfig={vi.fn()}
      />
    );

    expect(screen.getByText('finance.consolidation_scope_page.loading')).toBeInTheDocument();
  });
});
