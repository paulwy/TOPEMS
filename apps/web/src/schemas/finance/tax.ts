import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

// ============ 标签映射 ============

export const TAX_TYPE_LABELS: Record<string, string> = {
  vat: '增值税',
  output: '销项税',
  input: '进项税',
  income: '所得税',
  other: '其他',
};

export const STATUS_LABELS: Record<string, string> = {
  declared: '已申报',
  paid: '已缴纳',
  overdue: '待缴纳',
  pending: '待申报',
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
  title: '税务管理',
  description: '管理企业税务申报、缴纳和分析（数据由销售发票与采购发票聚合）',

  api: {
    module: 'finance',
    resource: 'tax',
  },

  fields: [
    {
      name: 'tax_type',
      label: '税种',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'vat', label: '增值税' },
          { value: 'output', label: '销项税' },
          { value: 'input', label: '进项税' },
          { value: 'income', label: '所得税' },
          { value: 'other', label: '其他' },
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
      label: '申报期间',
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
      label: '应税收入',
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.taxable_income as number, { color: 'text.secondary' }),
    },
    {
      name: 'tax_rate',
      label: '税率',
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
      label: '税额',
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
      label: '已缴税额',
      type: 'number',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.paid_amount as number, { color: 'success.main' }),
    },
    {
      name: 'owed_amount',
      label: '欠缴金额',
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
      label: '状态',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'declared', label: '已申报' },
          { value: 'paid', label: '已缴纳' },
          { value: 'overdue', label: '待缴纳' },
          { value: 'pending', label: '待申报' },
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
      label: '关联单据',
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
        label: '税种',
        type: 'select',
        options: [
          { label: '全部税种', value: 'all' },
          { label: '增值税', value: 'vat' },
          { label: '销项税', value: 'output' },
          { label: '进项税', value: 'input' },
          { label: '所得税', value: 'income' },
          { label: '其他', value: 'other' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已申报', value: 'declared' },
          { label: '已缴纳', value: 'paid' },
          { label: '待缴纳', value: 'overdue' },
          { label: '待申报', value: 'pending' },
        ],
      },
    ],
  },

  // 税务记录为聚合数据，不支持标准 CRUD（仅自定义行操作）
  actions: [],
};
