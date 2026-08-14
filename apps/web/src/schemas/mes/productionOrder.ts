import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productionOrderSchema: EntitySchema = {
  entity: 'mes_production_order',
  title: i18n.t('mes.production_order.k0'),
  description: i18n.t('mes.production_order.k1'),

  api: {
    module: 'mes',
    resource: 'orders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('mes.production_order.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'product_name',
      label: i18n.t('mes.production_order.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'product_code',
      label: i18n.t('mes.production_order.k4'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'quantity',
      label: i18n.t('mes.production_order.k5'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'unit',
      label: i18n.t('mes.production_order.k6'),
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'scheduled_start_date',
      label: i18n.t('mes.production_order.k7'),
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'scheduled_end_date',
      label: i18n.t('mes.production_order.k8'),
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'actualStartDate',
      label: i18n.t('mes.production_order.k9'),
      type: 'datetime',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'actualEndDate',
      label: i18n.t('mes.production_order.k10'),
      type: 'datetime',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'priority',
      label: i18n.t('mes.production_order.k11'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('mes.production_order.k12') },
          { value: 'normal', label: i18n.t('mes.production_order.k13') },
          { value: 'high', label: i18n.t('mes.production_order.k14') },
          { value: 'urgent', label: i18n.t('mes.production_order.k15') },
        ],
      },
      listWidth: 90,
    },
    {
      name: 'status',
      label: i18n.t('mes.production_order.k16'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.production_order.k17') },
          { value: 'released', label: i18n.t('mes.production_order.k18') },
          { value: 'in_progress', label: i18n.t('mes.production_order.k19') },
          { value: 'completed', label: i18n.t('mes.production_order.k20') },
          { value: 'cancelled', label: i18n.t('mes.production_order.k21') },
          { value: 'paused', label: i18n.t('mes.production_order.k22') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'order_number',
      'product_name',
      'product_code',
      'quantity',
      'scheduled_start_date',
      'scheduled_end_date',
      'status',
    ],
    searchFields: ['order_number', 'product_name', 'product_code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        released: 'info',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'error',
        paused: 'default',
      },
      labelMap: {
        pending: i18n.t('mes.production_order.k23'),
        released: i18n.t('mes.production_order.k24'),
        in_progress: i18n.t('mes.production_order.k25'),
        completed: i18n.t('mes.production_order.k26'),
        cancelled: i18n.t('mes.production_order.k27'),
        paused: i18n.t('mes.production_order.k28'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.production_order.k29'),
        type: 'select',
        options: [
          { label: i18n.t('mes.production_order.k30'), value: 'all' },
          { label: i18n.t('mes.production_order.k31'), value: 'pending' },
          { label: i18n.t('mes.production_order.k32'), value: 'released' },
          { label: i18n.t('mes.production_order.k33'), value: 'in_progress' },
          { label: i18n.t('mes.production_order.k34'), value: 'completed' },
          { label: i18n.t('mes.production_order.k35'), value: 'cancelled' },
          { label: i18n.t('mes.production_order.k36'), value: 'paused' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.production_order.k37'),
      fields: ['order_number', 'product_name', 'product_code'],
    },
    {
      title: i18n.t('mes.production_order.k38'),
      fields: ['quantity', 'unit', 'priority'],
    },
    {
      title: i18n.t('mes.production_order.k39'),
      fields: ['scheduled_start_date', 'scheduled_end_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.production_order.k40'),
  editTitle: i18n.t('mes.production_order.k41'),
  detailTitle: i18n.t('mes.production_order.k42'),
};
