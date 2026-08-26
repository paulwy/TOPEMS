import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const paymentSchema: EntitySchema = {
  entity: 'financePayment',
  title: i18n.t('finance.payment.k0'),

  api: {
    module: 'finance',
    resource: 'payments',
  },

  fields: [
    {
      name: 'payment_no',
      label: i18n.t('finance.payment.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'payment_type',
      label: i18n.t('finance.payment.k2'),
      type: 'select',
      defaultValue: 'bank_transfer',
      options: {
        type: 'static',
        options: [
          { value: 'bank_transfer', label: i18n.t('finance.payment.k3') },
          { value: 'cash', label: i18n.t('finance.payment.k4') },
          { value: 'check', label: i18n.t('finance.payment.k5') },
          { value: 'online', label: i18n.t('finance.payment.k6') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'counterparty_id',
      label: i18n.t('finance.payment.id_7'),
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'counterparty_name',
      label: i18n.t('finance.payment.k8'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'amount',
      label: i18n.t('finance.payment.k9'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const style: React.CSSProperties = { fontWeight: 600 };
        return React.createElement(
          'span',
          { style },
          `¥${((row.amount as number) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        );
      },
    },
    {
      name: 'payment_date',
      label: i18n.t('finance.payment.k10'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.payment.k11'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('finance.payment.k12') },
          { value: 'processing', label: i18n.t('finance.payment.k13') },
          { value: 'completed', label: i18n.t('finance.payment.k14') },
          { value: 'failed', label: i18n.t('finance.payment.k15') },
          { value: 'cancelled', label: i18n.t('finance.payment.k16') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'bank_account',
      label: i18n.t('finance.payment.k17'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'description',
      label: i18n.t('finance.payment.k18'),
      type: 'textarea',
      listWidth: 150,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'payment_no',
      'payment_type',
      'counterparty_name',
      'amount',
      'payment_date',
      'status',
    ],
    searchFields: ['payment_no', 'counterparty_name'],
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
        pending: i18n.t('finance.payment.k19'),
        processing: i18n.t('finance.payment.k20'),
        completed: i18n.t('finance.payment.k21'),
        failed: i18n.t('finance.payment.k22'),
        cancelled: i18n.t('finance.payment.k23'),
      },
    },
    filters: [
      {
        id: 'payment_type',
        label: i18n.t('finance.payment.k24'),
        type: 'select',
        options: [
          { label: i18n.t('finance.payment.k25'), value: 'all' },
          { label: i18n.t('finance.payment.k26'), value: 'bank_transfer' },
          { label: i18n.t('finance.payment.k27'), value: 'cash' },
          { label: i18n.t('finance.payment.k28'), value: 'check' },
          { label: i18n.t('finance.payment.k29'), value: 'online' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.payment.k30'),
        type: 'select',
        options: [
          { label: i18n.t('finance.payment.k31'), value: 'all' },
          { label: i18n.t('finance.payment.k32'), value: 'pending' },
          { label: i18n.t('finance.payment.k33'), value: 'processing' },
          { label: i18n.t('finance.payment.k34'), value: 'completed' },
          { label: i18n.t('finance.payment.k35'), value: 'failed' },
          { label: i18n.t('finance.payment.k36'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.payment.k37'),
      fields: ['payment_no', 'payment_type', 'counterparty_id'],
    },
    {
      title: i18n.t('finance.payment.k38'),
      fields: ['amount', 'payment_date', 'bank_account'],
    },
    {
      title: i18n.t('finance.payment.k39'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.payment.k40'),
  editTitle: i18n.t('finance.payment.k41'),
  detailTitle: i18n.t('finance.payment.k42'),
};
