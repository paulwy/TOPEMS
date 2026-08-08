import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

function renderPeriodCell(row: Record<string, unknown>) {
  const start = row.period_start as string | null | undefined;
  const end = row.period_end as string | null | undefined;
  const startDate = start ? new Date(start).toLocaleDateString('zh-CN') : '-';
  const endDate = end ? new Date(end).toLocaleDateString('zh-CN') : '-';
  return `${startDate} - ${endDate}`;
}

function renderAmountCell(row: Record<string, unknown>) {
  const amount = Number(row.amount ?? 0);
  return React.createElement(Typography, {
    variant: 'body2',
    sx: { fontWeight: 600 },
    children: `¥${amount.toLocaleString()}`,
  });
}

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? 'draft');
  const statusMap: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
  > = {
    paid: { label: '已支付', color: 'success' },
    pending: { label: '待支付', color: 'warning' },
    failed: { label: '支付失败', color: 'error' },
    draft: { label: '草稿', color: 'default' },
  };
  const item = statusMap[status] || statusMap.draft;
  return React.createElement(Chip, {
    label: item.label,
    color: item.color,
    size: 'small',
  });
}

function renderDateCell(row: Record<string, unknown>) {
  const val = row.paid_at as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const tenantInvoiceSchema: EntitySchema = {
  entity: 'tenantInvoice',
  title: i18n.t('schema:admin.tenant_invoice.meta.title'),
  description: i18n.t('schema:admin.tenant_invoice.meta.description'),

  api: {
    module: 'admin',
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
      name: 'period',
      label: i18n.t('schema:admin.tenant_invoice.period.label'),
      type: 'text',
      readonly: true,
      listWidth: 200,
      renderCell: renderPeriodCell,
    },
    {
      name: 'amount',
      label: i18n.t('schema:admin.tenant_invoice.amount.label'),
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: renderAmountCell,
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
      renderCell: renderStatusCell,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'paid_at',
      label: i18n.t('schema:admin.tenant_invoice.paid_at.label'),
      type: 'datetime',
      readonly: true,
      listWidth: 120,
      renderCell: renderDateCell,
    },
  ],

  list: {
    columns: ['id', 'period', 'amount', 'status', 'paid_at'],
    pageSize: 10,
    selectable: false,
  },

  formSections: [
    {
      title: i18n.t('schema:admin.tenant_invoice.section.0.title'),
      fields: ['id', 'period', 'amount', 'status'],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('schema:admin.tenant_invoice.meta.detailTitle'),

  actions: ['detail'],
};
