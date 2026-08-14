import React from 'react';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions, NestedTableConfig } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

const formatMoney = (amount: number | undefined) => {
  const style: React.CSSProperties = { fontWeight: 'medium' };
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

const paymentDetailFields = [
  {
    name: 'date',
    label: i18n.t('finance.receivable_payable.k0'),
    type: 'date' as const,
    required: true,
    listWidth: 120,
  },
  {
    name: 'amount',
    label: i18n.t('finance.receivable_payable.k1'),
    type: 'number' as const,
    required: true,
    defaultValue: 0,
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
  },
  {
    name: 'method',
    label: i18n.t('finance.receivable_payable.k2'),
    type: 'select' as const,
    defaultValue: 'bank_transfer',
    options: {
      type: 'static' as const,
      options: [
        { value: 'bank_transfer', label: i18n.t('finance.receivable_payable.k3') },
        { value: 'cash', label: i18n.t('finance.receivable_payable.k4') },
        { value: 'check', label: i18n.t('finance.receivable_payable.k5') },
        { value: 'online', label: i18n.t('finance.receivable_payable.k6') },
      ],
    },
    listWidth: 120,
  },
  {
    name: 'reference_no',
    label: i18n.t('finance.receivable_payable.k7'),
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'remark',
    label: i18n.t('finance.receivable_payable.k8'),
    type: 'textarea' as const,
    listWidth: 150,
    showInList: false,
  },
];

const paymentDetailTable: NestedTableConfig = {
  field: 'payment_details',
  title: i18n.t('finance.receivable_payable.k9'),
  columns: columnsFromFields(paymentDetailFields),
  fields: paymentDetailFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: i18n.t('finance.receivable_payable.k10'),
  rowKeyField: 'id',
  formColCount: 2,
};

export const receivableSchema: EntitySchema & SchemaExtensions = {
  entity: 'financeReceivable',
  title: i18n.t('finance.receivable_payable.k11'),

  api: {
    module: 'finance',
    resource: 'receivables',
  },

  fields: [
    {
      name: 'invoice_no',
      label: i18n.t('finance.receivable_payable.k12'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'customer_name',
      label: i18n.t('finance.receivable_payable.k13'),
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'amount',
      label: i18n.t('finance.receivable_payable.k14'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
    },
    {
      name: 'tax_amount',
      label: i18n.t('finance.receivable_payable.k15'),
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.tax_amount as number),
    },
    {
      name: 'invoice_date',
      label: i18n.t('finance.receivable_payable.k16'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'due_date',
      label: i18n.t('finance.receivable_payable.k17'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'invoice_type',
      label: i18n.t('finance.receivable_payable.k18'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: i18n.t('finance.receivable_payable.k19') },
          { value: 'special', label: i18n.t('finance.receivable_payable.k20') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.receivable_payable.k21'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('finance.receivable_payable.k22') },
          { value: 'approved', label: i18n.t('finance.receivable_payable.k23') },
          { value: 'posted', label: i18n.t('finance.receivable_payable.k24') },
          { value: 'cancelled', label: i18n.t('finance.receivable_payable.k25') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: [
      'invoice_no',
      'customer_name',
      'amount',
      'tax_amount',
      'invoice_date',
      'due_date',
      'invoice_type',
      'status',
    ],
    searchFields: ['invoice_no', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        approved: 'info',
        posted: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('finance.receivable_payable.k26'),
        approved: i18n.t('finance.receivable_payable.k27'),
        posted: i18n.t('finance.receivable_payable.k28'),
        cancelled: i18n.t('finance.receivable_payable.k29'),
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: i18n.t('finance.receivable_payable.k30'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receivable_payable.k31'), value: 'all' },
          { label: i18n.t('finance.receivable_payable.k32'), value: 'normal' },
          { label: i18n.t('finance.receivable_payable.k33'), value: 'special' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.receivable_payable.k34'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receivable_payable.k35'), value: 'all' },
          { label: i18n.t('finance.receivable_payable.k36'), value: 'draft' },
          { label: i18n.t('finance.receivable_payable.k37'), value: 'approved' },
          { label: i18n.t('finance.receivable_payable.k38'), value: 'posted' },
          { label: i18n.t('finance.receivable_payable.k39'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.receivable_payable.k40'),
      fields: ['invoice_no', 'customer_name', 'invoice_type'],
    },
    {
      title: i18n.t('finance.receivable_payable.k41'),
      fields: ['amount', 'tax_amount', 'invoice_date', 'due_date'],
    },
    {
      title: i18n.t('finance.receivable_payable.k42'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.receivable_payable.k43'),
  editTitle: i18n.t('finance.receivable_payable.k44'),
  detailTitle: i18n.t('finance.receivable_payable.k45'),

  nestedTables: [paymentDetailTable],
};

export const payableSchema: EntitySchema & SchemaExtensions = {
  entity: 'financePayable',
  title: i18n.t('finance.receivable_payable.k46'),

  api: {
    module: 'finance',
    resource: 'payables',
  },

  fields: [
    {
      name: 'invoice_no',
      label: i18n.t('finance.receivable_payable.k47'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: i18n.t('finance.receivable_payable.k48'),
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'amount',
      label: i18n.t('finance.receivable_payable.k49'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
    },
    {
      name: 'tax_amount',
      label: i18n.t('finance.receivable_payable.k50'),
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.tax_amount as number),
    },
    {
      name: 'invoice_date',
      label: i18n.t('finance.receivable_payable.k51'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'due_date',
      label: i18n.t('finance.receivable_payable.k52'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'invoice_type',
      label: i18n.t('finance.receivable_payable.k53'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: i18n.t('finance.receivable_payable.k54') },
          { value: 'special', label: i18n.t('finance.receivable_payable.k55') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.receivable_payable.k56'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('finance.receivable_payable.k57') },
          { value: 'approved', label: i18n.t('finance.receivable_payable.k58') },
          { value: 'posted', label: i18n.t('finance.receivable_payable.k59') },
          { value: 'cancelled', label: i18n.t('finance.receivable_payable.k60') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: [
      'invoice_no',
      'supplier_name',
      'amount',
      'tax_amount',
      'invoice_date',
      'due_date',
      'invoice_type',
      'status',
    ],
    searchFields: ['invoice_no', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        approved: 'info',
        posted: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('finance.receivable_payable.k61'),
        approved: i18n.t('finance.receivable_payable.k62'),
        posted: i18n.t('finance.receivable_payable.k63'),
        cancelled: i18n.t('finance.receivable_payable.k64'),
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: i18n.t('finance.receivable_payable.k65'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receivable_payable.k66'), value: 'all' },
          { label: i18n.t('finance.receivable_payable.k67'), value: 'normal' },
          { label: i18n.t('finance.receivable_payable.k68'), value: 'special' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.receivable_payable.k69'),
        type: 'select',
        options: [
          { label: i18n.t('finance.receivable_payable.k70'), value: 'all' },
          { label: i18n.t('finance.receivable_payable.k71'), value: 'draft' },
          { label: i18n.t('finance.receivable_payable.k72'), value: 'approved' },
          { label: i18n.t('finance.receivable_payable.k73'), value: 'posted' },
          { label: i18n.t('finance.receivable_payable.k74'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.receivable_payable.k75'),
      fields: ['invoice_no', 'supplier_name', 'invoice_type'],
    },
    {
      title: i18n.t('finance.receivable_payable.k76'),
      fields: ['amount', 'tax_amount', 'invoice_date', 'due_date'],
    },
    {
      title: i18n.t('finance.receivable_payable.k77'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.receivable_payable.k78'),
  editTitle: i18n.t('finance.receivable_payable.k79'),
  detailTitle: i18n.t('finance.receivable_payable.k80'),

  nestedTables: [paymentDetailTable],
};
