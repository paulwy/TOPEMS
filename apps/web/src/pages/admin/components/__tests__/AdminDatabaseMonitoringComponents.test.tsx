import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MonitoringAlertFilters } from '../MonitoringAlertFilters';
import type { DbChange, TableDetail, TableInfo } from '@/api/system';

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/admin.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: unknown) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
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
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: unknown }) =>
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
    require('../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: unknown) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
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

    fireEvent.change(screen.getByLabelText('搜索'), {
      target: { value: 'memory' },
    });
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: '严重' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1]);
    fireEvent.click(screen.getByRole('option', { name: '已解决' }));

    expect(onSearchChange).toHaveBeenCalledWith('memory');
    expect(onLevelChange).toHaveBeenCalledWith('critical');
    expect(onStatusChange).toHaveBeenCalledWith('resolved');
  });
});
