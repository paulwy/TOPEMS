import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const orderSchema: EntitySchema = {
  entity: 'srmOrder',
  title: i18n.t('srm.order.k0'),
  description: i18n.t('srm.order.k1'),

  api: {
    module: 'srm',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'po_no',
      label: i18n.t('srm.order.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('srm.order.id_3'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'total_amount',
      label: i18n.t('srm.order.k4'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600, color: 'grey.800' };
        return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString()}`);
      },
    },
    {
      name: 'currency',
      label: i18n.t('srm.order.k5'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('srm.order.cny_6') },
          { value: 'USD', label: i18n.t('srm.order.usd_7') },
          { value: 'EUR', label: i18n.t('srm.order.eur_8') },
        ],
      },
      listWidth: 80,
      showInList: false,
      validation: [{ type: 'maxLength', value: 10 }],
    },
    {
      name: 'status',
      label: i18n.t('srm.order.k9'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('srm.order.k10') },
          { value: 'processing', label: i18n.t('srm.order.k11') },
          { value: 'delivered', label: i18n.t('srm.order.k12') },
          { value: 'completed', label: i18n.t('srm.order.k13') },
          { value: 'cancelled', label: i18n.t('srm.order.k14') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'order_date',
      label: i18n.t('srm.order.k15'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const date = row.order_date as string | undefined;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
    {
      name: 'remarks',
      label: i18n.t('srm.order.k16'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['po_no', 'supplier_id', 'total_amount', 'status', 'order_date'],
    searchFields: ['po_no', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        processing: 'primary',
        delivered: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('srm.order.k17'),
        processing: i18n.t('srm.order.k18'),
        delivered: i18n.t('srm.order.k19'),
        completed: i18n.t('srm.order.k20'),
        cancelled: i18n.t('srm.order.k21'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.order.k22'),
        type: 'select',
        options: [
          { label: i18n.t('srm.order.k23'), value: 'all' },
          { label: i18n.t('srm.order.k24'), value: 'pending' },
          { label: i18n.t('srm.order.k25'), value: 'processing' },
          { label: i18n.t('srm.order.k26'), value: 'delivered' },
          { label: i18n.t('srm.order.k27'), value: 'completed' },
          { label: i18n.t('srm.order.k28'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.order.k29'),
      fields: ['po_no', 'supplier_id', 'currency', 'status'],
    },
    {
      title: i18n.t('srm.order.k30'),
      fields: ['total_amount', 'order_date'],
    },
    {
      title: i18n.t('srm.order.k31'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.order.k32'),
  editTitle: i18n.t('srm.order.k33'),
  detailTitle: i18n.t('srm.order.k34'),
};
