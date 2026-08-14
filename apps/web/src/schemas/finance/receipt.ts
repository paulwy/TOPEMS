import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 'medium' };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

export const receiptSchema: EntitySchema = {
  entity: 'financeReceipt',
  title: i18n.t('finance.receipt.k0'),

  api: {
    module: 'finance',
    resource: 'receipts',
  },

  fields: [
    {
      name: 'receipt_no',
      label: i18n.t('finance.receipt.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'receipt_type',
      label: i18n.t('finance.receipt.k2'),
      type: 'select',
      defaultValue: 'bank_transfer',
      options: {
        type: 'static',
        options: [
          { value: 'bank_transfer', label: i18n.t('finance.receipt.k3') },
          { value: 'cash', label: i18n.t('finance.receipt.k4') },
          { value: 'check', label: i18n.t('finance.receipt.k5') },
          { value: 'online', label: i18n.t('finance.receipt.k6') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'payer_id',
      label: i18n.t('finance.receipt.id_7'),
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'payer_name',
      label: i18n.t('finance.receipt.k8'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'amount',
      label: i18n.t('finance.receipt.k9'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
    },
    {
      name: 'receipt_date',
      label: i18n.t('finance.receipt.k10'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.receipt.k11'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('finance.receipt.k12') },
          { value: 'processing', label: i18n.t('finance.receipt.k13') },
          { value: 'completed', label: i18n.t('finance.receipt.k14') },
          { value: 'failed', label: i18n.t('finance.receipt.k15') },
          { value: 'cancelled', label: i18n.t('finance.receipt.k16') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'bank_account',
      label: i18n.t('finance.receipt.k17'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'description',
      label: i18n.t('finance.receipt.k18'),
      type: 'textarea',
      listWidth: 150,
      showInList: false,
    },
  ],

  list: {
    columns: ['receipt_no', 'receipt_type', 'payer_name', 'amount', 'receipt_date', 'status'],
    searchFields: ['receipt_no', 'payer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        failed: 'error',
        cancelled: 'default',
      },
      labelMap: {
        pending: i18n.t('finance.receipt.k19'),
        processing: i18n.t('finance.receipt.k20'),
        completed: i18n.t('finance.receipt.k21'),
        failed: i18n.t('finance.receipt.k22'),
        cancelled: i18n.t('finance.receipt.k23'),
      },
    },
    filters: [
      {
        id: 'receipt_type',
        label: i18n.t('finance.receipt.k24'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receipt.k25'), value: 'all' },
          { label: i18n.t('finance.receipt.k26'), value: 'bank_transfer' },
          { label: i18n.t('finance.receipt.k27'), value: 'cash' },
          { label: i18n.t('finance.receipt.k28'), value: 'check' },
          { label: i18n.t('finance.receipt.k29'), value: 'online' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.receipt.k30'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receipt.k31'), value: 'all' },
          { label: i18n.t('finance.receipt.k32'), value: 'pending' },
          { label: i18n.t('finance.receipt.k33'), value: 'processing' },
          { label: i18n.t('finance.receipt.k34'), value: 'completed' },
          { label: i18n.t('finance.receipt.k35'), value: 'failed' },
          { label: i18n.t('finance.receipt.k36'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.receipt.k37'),
      fields: ['receipt_no', 'receipt_type', 'payer_id'],
    },
    {
      title: i18n.t('finance.receipt.k38'),
      fields: ['amount', 'receipt_date', 'bank_account'],
    },
    {
      title: i18n.t('finance.receipt.k39'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.receipt.k40'),
  editTitle: i18n.t('finance.receipt.k41'),
  detailTitle: i18n.t('finance.receipt.k42'),
};
