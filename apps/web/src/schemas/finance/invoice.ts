import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const invoiceSchema: EntitySchema = {
  entity: 'financeInvoice',
  title: i18n.t('finance.invoice.k0'),

  api: {
    module: 'finance',
    resource: 'invoices',
  },

  fields: [
    {
      name: 'invoice_no',
      label: i18n.t('finance.invoice.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'invoice_type',
      label: i18n.t('finance.invoice.k2'),
      type: 'select',
      defaultValue: 'electronic',
      options: {
        type: 'static',
        options: [
          { value: 'special', label: i18n.t('finance.invoice.k3') },
          { value: 'normal', label: i18n.t('finance.invoice.k4') },
          { value: 'electronic', label: i18n.t('finance.invoice.k5') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'title',
      label: i18n.t('finance.invoice.k6'),
      type: 'text',
      required: true,
      listWidth: 150,
    },
    {
      name: 'tax_no',
      label: i18n.t('finance.invoice.k7'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'amount',
      label: i18n.t('finance.invoice.k8'),
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
      name: 'tax_rate',
      label: i18n.t('finance.invoice.k9'),
      type: 'select',
      defaultValue: '13',
      options: {
        type: 'static',
        options: [
          { value: '0', label: '0%' },
          { value: '3', label: '3%' },
          { value: '6', label: '6%' },
          { value: '9', label: '9%' },
          { value: '13', label: '13%' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'invoice_date',
      label: i18n.t('finance.invoice.k10'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.invoice.k11'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('finance.invoice.k12') },
          { value: 'issued', label: i18n.t('finance.invoice.k13') },
          { value: 'cancelled', label: i18n.t('finance.invoice.k14') },
          { value: 'red', label: i18n.t('finance.invoice.k15') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('finance.invoice.k16'),
      type: 'textarea',
      listWidth: 150,
      showInList: false,
    },
  ],

  list: {
    columns: ['invoice_no', 'invoice_type', 'title', 'amount', 'invoice_date', 'status'],
    searchFields: ['invoice_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        issued: 'primary',
        cancelled: 'error',
        red: 'warning',
      },
      labelMap: {
        draft: i18n.t('finance.invoice.k17'),
        issued: i18n.t('finance.invoice.k18'),
        cancelled: i18n.t('finance.invoice.k19'),
        red: i18n.t('finance.invoice.k20'),
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: i18n.t('finance.invoice.k21'),
        type: 'select',
        options: [
          { label: i18n.t('finance.invoice.k22'), value: 'all' },
          { label: i18n.t('finance.invoice.k23'), value: 'special' },
          { label: i18n.t('finance.invoice.k24'), value: 'normal' },
          { label: i18n.t('finance.invoice.k25'), value: 'electronic' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.invoice.k26'),
        type: 'select',
        options: [
          { label: i18n.t('finance.invoice.k27'), value: 'all' },
          { label: i18n.t('finance.invoice.k28'), value: 'draft' },
          { label: i18n.t('finance.invoice.k29'), value: 'issued' },
          { label: i18n.t('finance.invoice.k30'), value: 'cancelled' },
          { label: i18n.t('finance.invoice.k31'), value: 'red' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.invoice.k32'),
      fields: ['invoice_no', 'invoice_type', 'title', 'tax_no'],
    },
    {
      title: i18n.t('finance.invoice.k33'),
      fields: ['amount', 'tax_rate', 'invoice_date'],
    },
    {
      title: i18n.t('finance.invoice.k34'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.invoice.k35'),
  editTitle: i18n.t('finance.invoice.k36'),
  detailTitle: i18n.t('finance.invoice.k37'),
};
