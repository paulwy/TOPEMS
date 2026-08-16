import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DatabaseStructureTree } from '../DatabaseStructureTree';
import { DatabaseStructureTable } from '../DatabaseStructureTable';
import { DatabaseStructureIndexes } from '../DatabaseStructureIndexes';
import { MonitoringAlertFilters } from '../MonitoringAlertFilters';
import type { DbChange, TableDetail, TableInfo } from '@/api/system';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/admin.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
      let base = i18nMap[key] ?? key;
      if (options === undefined || options === null) return base;
      let didReplace = false;
      const tryReplace = (phName: string, valStr: string) => {
        const p1 = `{{${phName}}}`;
        const p2 = `{${phName}}`;
        const p3 = `\${${phName}}`;
        if (base.includes(p1)) { base = base.split(p1).join(valStr); didReplace = true; return true; }
        if (base.includes(p2)) { base = base.split(p2).join(valStr); didReplace = true; return true; }
        if (base.includes(p3)) { base = base.split(p3).join(valStr); didReplace = true; return true; }
        return false;
      };
      if (typeof options === 'object') {
        for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
        if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
      } else {
        const strVal = String(options);
        if (!tryReplace('0', strVal)) {
          base = `${base}:${strVal}`;
        }
      }
      return base;
    };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../../i18n/locales/zh/admin.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json')
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
      let base = i18nMap[key] ?? key;
      if (options === undefined || options === null) return base;
      let didReplace = false;
      const tryReplace = (phName: string, valStr: string) => {
        const p1 = `{{${phName}}}`;
        const p2 = `{${phName}}`;
        const p3 = `\${${phName}}`;
        if (base.includes(p1)) { base = base.split(p1).join(valStr); didReplace = true; return true; }
        if (base.includes(p2)) { base = base.split(p2).join(valStr); didReplace = true; return true; }
        if (base.includes(p3)) { base = base.split(p3).join(valStr); didReplace = true; return true; }
        return false;
      };
      if (typeof options === 'object') {
        for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
        if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
      } else {
        const strVal = String(options);
        if (!tryReplace('0', strVal)) {
          base = `${base}:${strVal}`;
        }
      }
      return base;
    };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('lucide-react', () => ({
  Table: () => <span data-testid='table-icon' />,
  Search: () => <span data-testid='search-icon' />,
  Plus: () => <span data-testid='plus-icon' />,
  Trash2: () => <span data-testid='trash-icon' />,
  Clock: () => <span data-testid='clock-icon' />,
}));

const tables: TableInfo[] = [
  { table_name: 'users', table_type: 'BASE TABLE' },
  { table_name: 'orders', table_type: 'BASE TABLE' },
];

const selectedTable: TableDetail = {
  table_name: 'users',
  schema_name: 'public',
  row_count: 1234,
  columns: [
    {
      ordinal_position: 1,
      column_name: 'id',
      data_type: 'integer',
      is_nullable: 'NO',
      column_default: "nextval('users_id_seq')",
    },
    {
      ordinal_position: 2,
      column_name: 'name',
      data_type: 'character varying',
      character_maximum_length: 120,
      is_nullable: 'YES',
    },
    {
      ordinal_position: 3,
      column_name: 'amount',
      data_type: 'numeric',
      numeric_precision: 10,
      numeric_scale: 2,
      is_nullable: 'NO',
    },
  ],
};

describe('DatabaseStructureTree', () => {
  it('renders loading state and search input', () => {
    render(
      <DatabaseStructureTree
        loading
        searchQuery='user'
        onSearchChange={vi.fn()}
        filteredTables={[]}
        selectedTable={null}
        onTableSelect={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('user')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('filters text and selects table summary', () => {
    const onSearchChange = vi.fn();
    const onTableSelect = vi.fn();
    render(
      <DatabaseStructureTree
        loading={false}
        searchQuery=''
        onSearchChange={onSearchChange}
        filteredTables={tables}
        selectedTable={selectedTable}
        onTableSelect={onTableSelect}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('admin.database_structure_page.attr_f5f091'), {
      target: { value: 'orders' },
    });
    fireEvent.click(screen.getByText('orders'));

    expect(onSearchChange).toHaveBeenCalledWith('orders');
    expect(onTableSelect).toHaveBeenCalledWith({
      table_name: 'orders',
      schema_name: 'public',
      columns: [],
    });
  });
});

describe('DatabaseStructureTable', () => {
  it('renders column details and formatted data types', () => {
    render(
      <DatabaseStructureTable
        selectedTable={selectedTable}
        detailLoading={false}
        onAddColumn={vi.fn()}
        onDropColumn={vi.fn()}
      />
    );

    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText(/admin\.database_structure\.fields/)).toBeInTheDocument();
    expect(screen.getByText(/admin\.database_structure\.rows/)).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('INTEGER')).toBeInTheDocument();
    expect(screen.getByText('VARCHAR(120)')).toBeInTheDocument();
    expect(screen.getByText('NUMERIC(10, 2)')).toBeInTheDocument();
    expect(screen.getByText("nextval('users_id_seq')")).toBeInTheDocument();
    expect(screen.getByText('NULL')).toBeInTheDocument();
    expect(screen.getAllByText('NOT NULL')).toHaveLength(2);
  });

  it('handles add and drop column actions', () => {
    const onAddColumn = vi.fn();
    const onDropColumn = vi.fn();
    render(
      <DatabaseStructureTable
        selectedTable={selectedTable}
        detailLoading={false}
        onAddColumn={onAddColumn}
        onDropColumn={onDropColumn}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.database_structure_page.text_4484fa' })
    );
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[1]);

    expect(onAddColumn).toHaveBeenCalledTimes(1);
    expect(onDropColumn).toHaveBeenCalledWith('name');
  });

  it('renders detail loading state', () => {
    render(
      <DatabaseStructureTable
        selectedTable={selectedTable}
        detailLoading
        onAddColumn={vi.fn()}
        onDropColumn={vi.fn()}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('DatabaseStructureIndexes', () => {
  const changes: DbChange[] = [
    {
      id: 'change-1',
      change_type: 'add_column',
      table_name: 'users',
      column_name: 'email',
      sql_statement: 'ALTER TABLE users ADD COLUMN email varchar(255)',
      executed_at: '2024-01-01T08:00:00Z',
    },
    {
      id: 'change-2',
      change_type: 'custom_change',
      table_name: 'orders',
      sql_statement: 'VACUUM orders',
      executed_at: '2024-01-02T08:00:00Z',
    },
  ];

  it('renders empty change history state', () => {
    render(<DatabaseStructureIndexes dbChanges={[]} />);

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByText('admin.database_structure_page.text_98d867')).toBeInTheDocument();
  });

  it('renders database changes with translated and fallback labels', () => {
    render(<DatabaseStructureIndexes dbChanges={changes} />);

    expect(screen.getByText('admin.database_structure.add_field')).toBeInTheDocument();
    expect(screen.getByText('custom_change')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('orders')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('ALTER TABLE users ADD COLUMN email varchar(255)')).toBeInTheDocument();
    expect(screen.getByText('VACUUM orders')).toBeInTheDocument();
  });
});

describe('MonitoringAlertFilters', () => {
  it('emits search, level and status filter changes', () => {
    const onSearchChange = vi.fn();
    const onLevelChange = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <MonitoringAlertFilters
        searchQuery='cpu'
        filterLevel='all'
        filterStatus='pending'
        onSearchChange={onSearchChange}
        onLevelChange={onLevelChange}
        onStatusChange={onStatusChange}
      />
    );

    fireEvent.change(screen.getByLabelText('admin.monitoring_alert.search'), {
      target: { value: 'memory' },
    });
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: 'admin.monitoring_alert.critical' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: 'admin.monitoring_alert.resolved' }));

    expect(onSearchChange).toHaveBeenCalledWith('memory');
    expect(onLevelChange).toHaveBeenCalledWith('critical');
    expect(onStatusChange).toHaveBeenCalledWith('resolved');
  });
});
