import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const qualitySchema: EntitySchema = {
  entity: 'mes_quality_inspection',
  title: i18n.t('mes.quality.k0'),
  description: i18n.t('mes.quality.k1'),

  api: {
    module: 'mes',
    resource: 'quality/inspections',
  },

  fields: [
    {
      name: 'inspection_no',
      label: i18n.t('mes.quality.k2'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'order_number',
      label: i18n.t('mes.quality.k3'),
      type: 'text',
      sortable: true,
      listWidth: 130,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_code',
      label: i18n.t('mes.quality.k4'),
      type: 'text',
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: i18n.t('mes.quality.k5'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'process_name',
      label: i18n.t('mes.quality.k6'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'inspection_type',
      label: i18n.t('mes.quality.k7'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'incoming', label: i18n.t('mes.quality.k8') },
          { value: 'process', label: i18n.t('mes.quality.k9') },
          { value: 'final', label: i18n.t('mes.quality.k10') },
          { value: 'outgoing', label: i18n.t('mes.quality.k11') },
          { value: 'patrol', label: i18n.t('mes.quality.k12') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'quantity',
      label: i18n.t('mes.quality.k13'),
      type: 'number',
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'qualified_quantity',
      label: i18n.t('mes.quality.k14'),
      type: 'number',
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'unqualified_quantity',
      label: i18n.t('mes.quality.k15'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'qualification_rate',
      label: i18n.t('mes.quality.k16'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      renderCell: (value: unknown) => `${(value as number)?.toFixed(2) || 0}%`,
    },
    {
      name: 'inspector',
      label: i18n.t('mes.quality.k17'),
      type: 'text',
      sortable: true,
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'inspection_time',
      label: i18n.t('mes.quality.k18'),
      type: 'datetime',
      listWidth: 160,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'status',
      label: i18n.t('mes.quality.k19'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.quality.k20') },
          { value: 'inspecting', label: i18n.t('mes.quality.k21') },
          { value: 'passed', label: i18n.t('mes.quality.k22') },
          { value: 'failed', label: i18n.t('mes.quality.k23') },
          { value: 'rework', label: i18n.t('mes.quality.k24') },
          { value: 'scrapped', label: i18n.t('mes.quality.k25') },
        ],
      },
      listWidth: 90,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'result',
      label: i18n.t('mes.quality.k26'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'memo',
      label: i18n.t('mes.quality.k27'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'inspection_no',
      'order_number',
      'product_code',
      'product_name',
      'process_name',
      'inspection_type',
      'quantity',
      'qualified_quantity',
      'unqualified_quantity',
      'qualification_rate',
      'inspector',
      'inspection_time',
      'status',
    ],
    searchFields: ['inspection_no', 'product_code', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        inspecting: 'info',
        passed: 'success',
        failed: 'error',
        rework: 'warning',
        scrapped: 'default',
      },
      labelMap: {
        pending: i18n.t('mes.quality.k28'),
        inspecting: i18n.t('mes.quality.k29'),
        passed: i18n.t('mes.quality.k30'),
        failed: i18n.t('mes.quality.k31'),
        rework: i18n.t('mes.quality.k32'),
        scrapped: i18n.t('mes.quality.k33'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.quality.k34'),
        type: 'select',
        options: [
          { label: i18n.t('mes.quality.k35'), value: 'all' },
          { label: i18n.t('mes.quality.k36'), value: 'pending' },
          { label: i18n.t('mes.quality.k37'), value: 'inspecting' },
          { label: i18n.t('mes.quality.k38'), value: 'passed' },
          { label: i18n.t('mes.quality.k39'), value: 'failed' },
          { label: i18n.t('mes.quality.k40'), value: 'rework' },
          { label: i18n.t('mes.quality.k41'), value: 'scrapped' },
        ],
      },
      {
        id: 'inspection_type',
        label: i18n.t('mes.quality.k42'),
        type: 'select',
        options: [
          { label: i18n.t('mes.quality.k43'), value: 'all' },
          { label: i18n.t('mes.quality.k44'), value: 'incoming' },
          { label: i18n.t('mes.quality.k45'), value: 'process' },
          { label: i18n.t('mes.quality.k46'), value: 'final' },
          { label: i18n.t('mes.quality.k47'), value: 'outgoing' },
          { label: i18n.t('mes.quality.k48'), value: 'patrol' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.quality.k49'),
      fields: ['order_number', 'product_code', 'product_name', 'process_name'],
    },
    {
      title: i18n.t('mes.quality.k50'),
      fields: ['inspection_type', 'quantity', 'qualified_quantity', 'unqualified_quantity'],
    },
    {
      title: i18n.t('mes.quality.k51'),
      fields: ['inspector', 'inspection_time', 'result'],
    },
    {
      title: i18n.t('mes.quality.k52'),
      fields: ['status', 'memo'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.quality.k53'),
  editTitle: i18n.t('mes.quality.k54'),
  detailTitle: i18n.t('mes.quality.k55'),
};
