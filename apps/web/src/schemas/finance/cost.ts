import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontFamily: 'monospace', fontWeight: 600 };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString('zh-CN')}`);
};

export const costSchema: EntitySchema = {
  entity: 'finance_cost',
  title: i18n.t('finance.cost.k0'),
  description: i18n.t('finance.cost.k1'),

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('finance.cost.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              fontWeight: 600,
              color: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
            },
          },
          String(row.code || '')
        ),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('finance.cost.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', { style: { fontWeight: 500 } }, String(row.name || '')),
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'debit_balance',
      label: i18n.t('finance.cost.k4'),
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(row.debit_balance as number | undefined),
    },
    {
      name: 'period_debit',
      label: i18n.t('finance.cost.k5'),
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(
          row.period_debit as number | undefined,
          `var(--color-success-main, ${designTokens.colors.success.dark})`
        ),
    },
    {
      name: 'period_credit',
      label: i18n.t('finance.cost.k6'),
      type: 'number',
      listWidth: 140,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        formatMoney(
          row.period_credit as number | undefined,
          `var(--color-error-main, ${designTokens.colors.error['800']})`
        ),
    },
    {
      name: 'balance_direction',
      label: i18n.t('finance.cost.k7'),
      type: 'select',
      required: true,
      defaultValue: 'debit',
      options: {
        type: 'static',
        options: [
          { value: 'debit', label: i18n.t('finance.cost.k8') },
          { value: 'credit', label: i18n.t('finance.cost.k9') },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'level',
      label: i18n.t('finance.cost.k10'),
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: i18n.t('finance.cost.k11') },
          { value: 2, label: i18n.t('finance.cost.k12') },
          { value: 3, label: i18n.t('finance.cost.k13') },
          { value: 4, label: i18n.t('finance.cost.k14') },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('finance.cost.k15'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.cost.k16') },
          { value: 'disabled', label: i18n.t('finance.cost.k17') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('finance.cost.k18'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'debit_balance', 'period_debit', 'period_credit', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: i18n.t('finance.cost.k19'),
        disabled: i18n.t('finance.cost.k20'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('finance.cost.k21'),
        type: 'select',
        options: [
          { label: i18n.t('finance.cost.k22'), value: 'all' },
          { label: i18n.t('finance.cost.k23'), value: 'active' },
          { label: i18n.t('finance.cost.k24'), value: 'disabled' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.cost.k25'),
      fields: ['code', 'name', 'balance_direction', 'level', 'status'],
    },
    {
      title: i18n.t('finance.cost.k26'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.cost.k27'),
  editTitle: i18n.t('finance.cost.k28'),
  detailTitle: i18n.t('finance.cost.k29'),
};
