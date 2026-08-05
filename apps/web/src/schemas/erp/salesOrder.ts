import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const salesOrderSchema: EntitySchema = {
  entity: 'salesOrder',
  title: i18n.t('schema:erp.sales_order.meta.title'),
  description: i18n.t('schema:erp.sales_order.meta.description'),

  api: {
    module: 'erp',
    resource: 'salesOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('schema:erp.sales_order.order_number.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'customer_name',
      label: i18n.t('schema:erp.sales_order.customer_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'total_amount',
      label: i18n.t('schema:erp.sales_order.total_amount.label'),
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
      label: i18n.t('schema:erp.sales_order.order_date.label'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'delivery_date',
      label: i18n.t('schema:erp.sales_order.delivery_date.label'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'currency',
      label: i18n.t('schema:erp.sales_order.currency.label'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('schema:erp.sales_order.currency.option.CNY') },
          { value: 'USD', label: i18n.t('schema:erp.sales_order.currency.option.USD') },
          { value: 'EUR', label: i18n.t('schema:erp.sales_order.currency.option.EUR') },
        ],
      },
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.sales_order.status.label'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('schema:erp.sales_order.status.option.draft') },
          { value: 'pending', label: i18n.t('schema:erp.sales_order.status.option.pending') },
          { value: 'approved', label: i18n.t('schema:erp.sales_order.status.option.approved') },
          { value: 'partially_shipped', label: i18n.t('schema:erp.sales_order.status.option.partially_shipped') },
          { value: 'shipped', label: i18n.t('schema:erp.sales_order.status.option.shipped') },
          { value: 'completed', label: i18n.t('schema:erp.sales_order.status.option.completed') },
          { value: 'cancelled', label: i18n.t('schema:erp.sales_order.status.option.cancelled') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'remark',
      label: i18n.t('schema:erp.sales_order.remark.label'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['order_number', 'customer_name', 'total_amount', 'order_date', 'status'],
    searchFields: ['order_number', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'primary',
        partially_shipped: 'info',
        shipped: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('schema:erp.sales_order.status.option.draft'),
        pending: i18n.t('schema:erp.sales_order.status.option.pending'),
        approved: i18n.t('schema:erp.sales_order.status.option.approved'),
        partially_shipped: i18n.t('schema:erp.sales_order.status.option.partially_shipped'),
        shipped: i18n.t('schema:erp.sales_order.status.option.shipped'),
        completed: i18n.t('schema:erp.sales_order.status.option.completed'),
        cancelled: i18n.t('schema:erp.sales_order.status.option.cancelled'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.sales_order.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.sales_order.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.draft'), value: 'draft' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.pending'), value: 'pending' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.approved'), value: 'approved' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.partially_shipped'), value: 'partially_shipped' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.shipped'), value: 'shipped' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.completed'), value: 'completed' },
          { label: i18n.t('schema:erp.sales_order.filter.status.option.cancelled'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.sales_order.section.0.title'),
      fields: ['order_number', 'customer_name', 'currency', 'status'],
    },
    {
      title: i18n.t('schema:erp.sales_order.section.1.title'),
      fields: ['total_amount', 'order_date', 'delivery_date'],
    },
    {
      title: i18n.t('schema:erp.sales_order.section.2.title'),
      fields: ['remark'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.sales_order.meta.createTitle'),
  editTitle: i18n.t('schema:erp.sales_order.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.sales_order.meta.detailTitle'),
};
