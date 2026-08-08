import React from 'react';
import { Download } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import type { RowAction } from '@/components/templates';
import i18n from '@/i18n';

const formatCurrency = (amount: number | undefined) => {
  return (
    <span style={{ fontWeight: 600 }}>
      ¥{(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
    </span>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const tenantInvoiceSchema: EntitySchema = {
  entity: 'tenant_invoice',
  title: i18n.t('schema:admin.tenant_invoice.meta.title'),
  description: i18n.t('schema:admin.tenant_invoice.meta.description'),

  api: {
    module: 'tenant',
    resource: 'invoices',
  },

  fields: [
    {
      name: 'id',
      label: i18n.t('schema:admin.tenant_invoice.id.label'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'period_start',
      label: i18n.t('schema:admin.tenant_invoice.period_start.label'),
      type: 'date',
      readonly: true,
      listWidth: 120,
      hideInForm: true,
      renderCell: (row) => formatDate(row.period_start as string),
    },
    {
      name: 'period_end',
      label: i18n.t('schema:admin.tenant_invoice.period_end.label'),
      type: 'date',
      readonly: true,
      listWidth: 120,
      hideInForm: true,
      renderCell: (row) => formatDate(row.period_end as string),
    },
    {
      name: 'amount',
      label: i18n.t('schema:admin.tenant_invoice.amount.label'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row) => formatCurrency(row.amount as number),
    },
    {
      name: 'currency',
      label: i18n.t('schema:admin.tenant_invoice.currency.label'),
      type: 'text',
      readonly: true,
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:admin.tenant_invoice.status.label'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'paid', label: i18n.t('schema:admin.tenant_invoice.status.option.paid') },
          { value: 'pending', label: i18n.t('schema:admin.tenant_invoice.status.option.pending') },
          { value: 'failed', label: i18n.t('schema:admin.tenant_invoice.status.option.failed') },
          { value: 'draft', label: i18n.t('schema:admin.tenant_invoice.status.option.draft') },
        ],
      },
      listWidth: 100,
      validation: [
            { type: 'maxLength', value: 32 },
      ],
},
    {
      name: 'paid_at',
      label: i18n.t('schema:admin.tenant_invoice.paid_at.label'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row) => formatDate(row.paid_at as string),
    },
    {
      name: 'created_at',
      label: i18n.t('schema:admin.tenant_invoice.created_at.label'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['id', 'period_start', 'period_end', 'amount', 'status', 'paid_at'],
    searchFields: ['id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        paid: 'success',
        pending: 'warning',
        failed: 'error',
        draft: 'default',
      },
      labelMap: {
        paid: i18n.t('schema:admin.tenant_invoice.status.option.paid'),
        pending: i18n.t('schema:admin.tenant_invoice.status.option.pending'),
        failed: i18n.t('schema:admin.tenant_invoice.status.option.failed'),
        draft: i18n.t('schema:admin.tenant_invoice.status.option.draft'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:admin.tenant_invoice.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.tenant_invoice.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.tenant_invoice.filter.status.option.paid'), value: 'paid' },
          { label: i18n.t('schema:admin.tenant_invoice.filter.status.option.pending'), value: 'pending' },
          { label: i18n.t('schema:admin.tenant_invoice.filter.status.option.failed'), value: 'failed' },
          { label: i18n.t('schema:admin.tenant_invoice.filter.status.option.draft'), value: 'draft' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('schema:admin.tenant_invoice.meta.detailTitle'),
};

export const invoiceRowActions: RowAction[] = [
  {
    label: i18n.t('schema:admin.tenant_invoice.filter.status.label'),
    icon: <Download size={16} />,
    onClick: () => {},
  },
];
