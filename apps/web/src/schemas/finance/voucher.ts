import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const formatCurrency = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 'bold' };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

export const voucherSchema: EntitySchema = {
  entity: 'finance_voucher',
  title: i18n.t('finance.voucher.k0'),
  description: i18n.t('finance.voucher.k1'),

  api: {
    module: 'finance',
    resource: 'vouchers',
  },

  fields: [
    {
      name: 'voucher_number',
      label: i18n.t('finance.voucher.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'voucher_date',
      label: i18n.t('finance.voucher.k3'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'period',
      label: i18n.t('finance.voucher.k4'),
      type: 'text',
      required: true,
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 6 }],
    },
    {
      name: 'attachment_count',
      label: i18n.t('finance.voucher.k5'),
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'summary',
      label: i18n.t('finance.voucher.k6'),
      type: 'textarea',
      listWidth: 180,
      showInList: false,
    },
    {
      name: 'maker_name',
      label: i18n.t('finance.voucher.k7'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'total_debit',
      label: i18n.t('finance.voucher.k8'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) =>
        formatCurrency(row.total_debit as number, designTokens.colors.error.dark),
    },
    {
      name: 'total_credit',
      label: i18n.t('finance.voucher.k9'),
      type: 'number',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) =>
        formatCurrency(row.total_credit as number, designTokens.colors.success.dark),
    },
    {
      name: 'status',
      label: i18n.t('finance.voucher.k10'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('finance.voucher.k11') },
          { value: 'pending', label: i18n.t('finance.voucher.k12') },
          { value: 'approved', label: i18n.t('finance.voucher.k13') },
          { value: 'posted', label: i18n.t('finance.voucher.k14') },
          { value: 'imported', label: i18n.t('finance.voucher.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('finance.voucher.k16'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'voucher_number',
      'voucher_date',
      'period',
      'total_debit',
      'total_credit',
      'maker_name',
      'status',
    ],
    searchFields: ['voucher_number', 'summary', 'maker_name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        posted: 'success',
        imported: 'info',
      },
      labelMap: {
        draft: i18n.t('finance.voucher.k17'),
        pending: i18n.t('finance.voucher.k18'),
        approved: i18n.t('finance.voucher.k19'),
        posted: i18n.t('finance.voucher.k20'),
        imported: i18n.t('finance.voucher.k21'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('finance.voucher.k22'),
        type: 'select',
        options: [
          { label: i18n.t('finance.voucher.k23'), value: 'all' },
          { label: i18n.t('finance.voucher.k24'), value: 'draft' },
          { label: i18n.t('finance.voucher.k25'), value: 'pending' },
          { label: i18n.t('finance.voucher.k26'), value: 'approved' },
          { label: i18n.t('finance.voucher.k27'), value: 'posted' },
          { label: i18n.t('finance.voucher.k28'), value: 'imported' },
        ],
      },
      {
        id: 'period',
        label: i18n.t('finance.voucher.k29'),
        type: 'select',
        options: [
          { label: i18n.t('finance.voucher.k30'), value: 'all' },
          { label: '2024-01', value: '2024-01' },
          { label: '2024-02', value: '2024-02' },
          { label: '2024-03', value: '2024-03' },
          { label: '2024-04', value: '2024-04' },
          { label: '2024-05', value: '2024-05' },
          { label: '2024-06', value: '2024-06' },
        ],
      },
    ],
  },

  // CRUD 操作由页面通过 customRowActions 与自定义弹窗接管
  actions: [],

  formSections: [
    {
      title: i18n.t('finance.voucher.k31'),
      fields: ['voucher_number', 'voucher_date', 'period', 'attachment_count'],
    },
    {
      title: i18n.t('finance.voucher.k32'),
      fields: ['summary', 'maker_name', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.voucher.k33'),
  editTitle: i18n.t('finance.voucher.k34'),
  detailTitle: i18n.t('finance.voucher.k35'),
};
