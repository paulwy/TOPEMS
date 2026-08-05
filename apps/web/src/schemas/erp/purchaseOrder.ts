import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const purchaseOrderSchema: EntitySchema = {
  entity: 'purchaseOrder',
  title: i18n.t('schema:erp.purchase_order.meta.title'),
  description: i18n.t('schema:erp.purchase_order.meta.description'),

  api: {
    module: 'erp',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('schema:erp.purchase_order.order_number.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: i18n.t('schema:erp.purchase_order.supplier_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'total_amount',
      label: i18n.t('schema:erp.purchase_order.total_amount.label'),
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        return amount ? `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'order_date',
      label: i18n.t('schema:erp.purchase_order.order_date.label'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'expected_date',
      label: i18n.t('schema:erp.purchase_order.expected_date.label'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'currency',
      label: i18n.t('schema:erp.purchase_order.currency.label'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('schema:erp.purchase_order.currency.option.CNY') },
          { value: 'USD', label: i18n.t('schema:erp.purchase_order.currency.option.USD') },
          { value: 'EUR', label: i18n.t('schema:erp.purchase_order.currency.option.EUR') },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.purchase_order.status.label'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('schema:erp.purchase_order.status.option.draft') },
          { value: 'pending', label: i18n.t('schema:erp.purchase_order.status.option.pending') },
          { value: 'approved', label: i18n.t('schema:erp.purchase_order.status.option.approved') },
          {
            value: 'partially_received',
            label: i18n.t('schema:erp.purchase_order.status.option.partially_received'),
          },
          { value: 'received', label: i18n.t('schema:erp.purchase_order.status.option.received') },
          {
            value: 'cancelled',
            label: i18n.t('schema:erp.purchase_order.status.option.cancelled'),
          },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'remark',
      label: i18n.t('schema:erp.purchase_order.remark.label'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['order_number', 'supplier_name', 'total_amount', 'order_date', 'status'],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'primary',
        partially_received: 'info',
        received: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('schema:erp.purchase_order.status.option.draft'),
        pending: i18n.t('schema:erp.purchase_order.status.option.pending'),
        approved: i18n.t('schema:erp.purchase_order.status.option.approved'),
        partially_received: i18n.t('schema:erp.purchase_order.status.option.partially_received'),
        received: i18n.t('schema:erp.purchase_order.status.option.received'),
        cancelled: i18n.t('schema:erp.purchase_order.status.option.cancelled'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.purchase_order.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.purchase_order.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.purchase_order.filter.status.option.draft'), value: 'draft' },
          {
            label: i18n.t('schema:erp.purchase_order.filter.status.option.pending'),
            value: 'pending',
          },
          {
            label: i18n.t('schema:erp.purchase_order.filter.status.option.approved'),
            value: 'approved',
          },
          {
            label: i18n.t('schema:erp.purchase_order.filter.status.option.partially_received'),
            value: 'partially_received',
          },
          {
            label: i18n.t('schema:erp.purchase_order.filter.status.option.received'),
            value: 'received',
          },
          {
            label: i18n.t('schema:erp.purchase_order.filter.status.option.cancelled'),
            value: 'cancelled',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.purchase_order.section.0.title'),
      fields: ['order_number', 'supplier_name', 'currency', 'status'],
    },
    {
      title: i18n.t('schema:erp.purchase_order.section.1.title'),
      fields: ['total_amount', 'order_date', 'expected_date'],
    },
    {
      title: i18n.t('schema:erp.purchase_order.section.2.title'),
      fields: ['remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.purchase_order.meta.createTitle'),
  editTitle: i18n.t('schema:erp.purchase_order.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.purchase_order.meta.detailTitle'),
};
