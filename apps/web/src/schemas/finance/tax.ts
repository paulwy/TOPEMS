import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

// ============ 标签映射 ============

export const TAX_TYPE_LABELS: Record<string, string> = {
  vat: i18n.t('finance.tax.k0'),
  output: i18n.t('finance.tax.k1'),
  input: i18n.t('finance.tax.k2'),
  income: i18n.t('finance.tax.k3'),
  other: i18n.t('finance.tax.k4'),
};

export const STATUS_LABELS: Record<string, string> = {
  declared: i18n.t('finance.tax.k5'),
  paid: i18n.t('finance.tax.k6'),
  overdue: i18n.t('finance.tax.k7'),
  pending: i18n.t('finance.tax.k8'),
};

// ============ 格式化工具 ============

const formatMoney = (amount: number | undefined, style?: React.CSSProperties) => {
  return React.createElement(
    'span',
    { style: { fontFamily: 'monospace', ...style } },
    `¥${(amount || 0).toLocaleString()}`
  );
};

// ============ Schema ============

export const taxSchema: EntitySchema = {
  entity: 'finance_tax',
  title: i18n.t('finance.tax.k9'),
  description: i18n.t('finance.tax.k10'),

  api: {
    module: 'finance',
    resource: 'tax',
  },

  fields: [
    {
      name: 'tax_type',
      label: i18n.t('finance.tax.k11'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'vat', label: i18n.t('finance.tax.k12') },
          { value: 'output', label: i18n.t('finance.tax.k13') },
          { value: 'input', label: i18n.t('finance.tax.k14') },
          { value: 'income', label: i18n.t('finance.tax.k15') },
          { value: 'other', label: i18n.t('finance.tax.k16') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.tax_type ?? '');
        return React.createElement(Chip, {
          label: TAX_TYPE_LABELS[value] || value,
          size: 'small',
          color: 'primary',
        });
      },
    },
    {
      name: 'declaration_period',
      label: i18n.t('finance.tax.k17'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 500 } },
          String(row.declaration_period ?? '')
        ),
    },
    {
      name: 'taxable_income',
      label: i18n.t('finance.tax.k18'),
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.taxable_income as number, { color: 'text.secondary' }),
    },
    {
      name: 'tax_rate',
      label: i18n.t('finance.tax.k19'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          label: `${row.tax_rate}%`,
          size: 'small',
          variant: 'outlined',
        }),
    },
    {
      name: 'tax_amount',
      label: i18n.t('finance.tax.k20'),
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.tax_amount as number, {
          fontWeight: 700,
          color: 'primary.main',
        }),
    },
    {
      name: 'paid_amount',
      label: i18n.t('finance.tax.k21'),
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.paid_amount as number, { color: 'success.main' }),
    },
    {
      name: 'owed_amount',
      label: i18n.t('finance.tax.k22'),
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const owed = (row.owed_amount as number) || 0;
        return formatMoney(owed, {
          fontWeight: 600,
          color: owed > 0 ? 'error.main' : 'success.main',
        });
      },
    },
    {
      name: 'status',
      label: i18n.t('finance.tax.k23'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'declared', label: i18n.t('finance.tax.k24') },
          { value: 'paid', label: i18n.t('finance.tax.k25') },
          { value: 'overdue', label: i18n.t('finance.tax.k26') },
          { value: 'pending', label: i18n.t('finance.tax.k27') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.status ?? '');
        const label = STATUS_LABELS[value] || value;
        const colorMap: Record<
          string,
          'success' | 'warning' | 'error' | 'default' | 'primary' | 'info' | 'secondary'
        > = {
          declared: 'success',
          paid: 'success',
          overdue: 'error',
          pending: 'warning',
        };
        return React.createElement(Chip, {
          label,
          size: 'small',
          color: colorMap[value] || 'default',
        });
      },
    },
    {
      name: 'related_document',
      label: i18n.t('finance.tax.k28'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'tax_type',
      'declaration_period',
      'taxable_income',
      'tax_rate',
      'tax_amount',
      'paid_amount',
      'owed_amount',
      'status',
    ],
    searchFields: ['tax_type', 'declaration_period'],
    pageSize: 10,
    filters: [
      {
        id: 'tax_type',
        label: i18n.t('finance.tax.k29'),
        type: 'select',
        options: [
          { label: i18n.t('finance.tax.k30'), value: 'all' },
          { label: i18n.t('finance.tax.k31'), value: 'vat' },
          { label: i18n.t('finance.tax.k32'), value: 'output' },
          { label: i18n.t('finance.tax.k33'), value: 'input' },
          { label: i18n.t('finance.tax.k34'), value: 'income' },
          { label: i18n.t('finance.tax.k35'), value: 'other' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.tax.k36'),
        type: 'select',
        options: [
          { label: i18n.t('finance.tax.k37'), value: 'all' },
          { label: i18n.t('finance.tax.k38'), value: 'declared' },
          { label: i18n.t('finance.tax.k39'), value: 'paid' },
          { label: i18n.t('finance.tax.k40'), value: 'overdue' },
          { label: i18n.t('finance.tax.k41'), value: 'pending' },
        ],
      },
    ],
  },

  // 税务记录为聚合数据，不支持标准 CRUD（仅自定义行操作）
  actions: [],
};
