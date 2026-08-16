import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SubTableBuilder } from '../SubTableBuilder';
import type { NestedTableConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'templates.sub_table_builder.k4': '新增',
    'templates.sub_table_builder.k5': '暂无数据',
    'templates.sub_table_builder.k6': '新增',
    'templates.sub_table_builder.k0': '关闭',
    'templates.sub_table_builder.k1': '取消',
    'templates.sub_table_builder.k2': '关闭',
    'templates.sub_table_builder.k7': '编辑',
    'templates.sub_table_builder.k8': '编辑',
    'templates.sub_table_builder.k9': '删除',
    'templates.sub_table_builder.k10': '删除',
    'templates.sub_table_builder.k3': '子表',
    'components.sub_table_builder.k0': '保存',
    'components.sub_table_builder.k1': '操作',
    'components.sub_table_builder.k11': '编辑行',
    'components.sub_table_builder.k12': '新增行',
    'components.sub_table_builder.k13': '条',
    'components.sub_table_builder.k10': '查看详情',
    'components.sub_table_builder.k8': '第',
    'components.sub_table_builder.k9': '行：',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
    ready: true,
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

const mockFields: SchemaField[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'quantity', label: 'Quantity', type: 'number' },
];

const mockConfig: NestedTableConfig = {
  field: 'items',
  title: 'Order Details',
  columns: [
    { id: 'name', label: 'Name' },
    { id: 'quantity', label: 'Quantity' },
  ],
  fields: mockFields,
};

const mockValue = [
  { id: '1', name: 'Product A', quantity: 10 },
  { id: '2', name: 'Product B', quantity: 20 },
];

describe('SubTableBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table title', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Order Details')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
  });

  it('renders row data', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });

  it('renders add button with default text', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByRole('button', { name: /新增/ })).toBeInTheDocument();
  });

  it('opens dialog with correct title when add button is clicked', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    const addButton = screen.getByRole('button', { name: /新增/ });
    fireEvent.click(addButton);
    expect(screen.getByText('Order Details - 新增行')).toBeInTheDocument();
  });

  it('opens dialog when edit button is clicked', () => {
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    expect(iconButtons.length).toBeGreaterThanOrEqual(2);
    const editButton = iconButtons[0] as HTMLElement;
    fireEvent.click(editButton);
    expect(screen.getByText('Order Details - 编辑行')).toBeInTheDocument();
  });

  it('calls onChange with reduced array when delete button is clicked', () => {
    const handleChange = vi.fn();
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={handleChange}
        mode='create'
      />
    );
    // Delete button is the second IconButton (after edit) in the first row
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    expect(iconButtons.length).toBeGreaterThanOrEqual(2);
    const deleteButton = iconButtons[1] as HTMLElement;
    fireEvent.click(deleteButton);
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith([mockValue[1]]);
  });

  it('renders empty state when value is empty', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={[]}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('does not render action buttons in view mode', () => {
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='view'
      />
    );
    expect(screen.queryByRole('button', { name: /新增/ })).not.toBeInTheDocument();
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    expect(screen.queryByText('操作')).not.toBeInTheDocument();
  });
});
