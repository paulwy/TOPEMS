import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

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

import { ConsolidationScopeTable } from '../ConsolidationScopeTable';

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

  it('renders empty state', () => {
    renderWithProviders(
      <ConsolidationScopeTable
        scopes={[]}
        loading={false}
        onSelectScope={vi.fn()}
        onDeleteScope={vi.fn()}
        onRuleConfig={vi.fn()}
      />
    );

    expect(screen.getByText('finance.consolidation_scope_page.no_scopes')).toBeInTheDocument();
  });

  it('renders table headers and scope rows', () => {
    renderWithProviders(
      <ConsolidationScopeTable
        scopes={scopes as any}
        loading={false}
        onSelectScope={vi.fn()}
        onDeleteScope={vi.fn()}
        onRuleConfig={vi.fn()}
      />
    );

    expect(screen.getByTestId('mock-data-table')).toBeInTheDocument();
    expect(screen.getByText('finance.consolidation_scope_page.code')).toBeInTheDocument();
    expect(screen.getByText('CS-001')).toBeInTheDocument();
    expect(screen.getByText('集团合并范围')).toBeInTheDocument();
    expect(screen.getByText('finance.consolidation_scope_page.text_a8d219')).toBeInTheDocument();
    expect(screen.getByText('finance.consolidation_scope_page.active')).toBeInTheDocument();
  });

  it('calls row select, rule config and delete handlers', () => {
    const onSelectScope = vi.fn();
    const onRuleConfig = vi.fn();
    const onDeleteScope = vi.fn();
    renderWithProviders(
      <ConsolidationScopeTable
        scopes={scopes as any}
        loading={false}
        onSelectScope={onSelectScope}
        onDeleteScope={onDeleteScope}
        onRuleConfig={onRuleConfig}
      />
    );

    fireEvent.click(screen.getByText('集团合并范围'));
    fireEvent.click(screen.getAllByText('finance.consolidation_scope_page.action_rule')[0]);
    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(onSelectScope).toHaveBeenCalledWith(scopes[0]);
    expect(onRuleConfig).toHaveBeenCalledTimes(1);
    expect(onDeleteScope).toHaveBeenCalledWith('scope-1');
  });
});
