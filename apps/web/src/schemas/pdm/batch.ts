import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const batchSchema: EntitySchema = {
  entity: 'pdm_batch',
  title: i18n.t('pdm.batch.k0'),
  description: i18n.t('pdm.batch.k1'),

  api: {
    module: 'pdm',
    resource: 'batches',
  },

  fields: [
    {
      name: 'batch_no',
      label: i18n.t('pdm.batch.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: i18n.t('pdm.batch.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'plannedQuantity',
      label: i18n.t('pdm.batch.k4'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'unit',
      label: i18n.t('pdm.batch.k5'),
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: i18n.t('pdm.batch.k6'), label: i18n.t('pdm.batch.k7') },
          { value: i18n.t('pdm.batch.k8'), label: i18n.t('pdm.batch.k9') },
          { value: i18n.t('pdm.batch.k10'), label: i18n.t('pdm.batch.k11') },
        ],
      },
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'actual_quantity',
      label: i18n.t('pdm.batch.k12'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'formula_id',
      label: i18n.t('pdm.batch.k13'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'process_id',
      label: i18n.t('pdm.batch.k14'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('pdm.batch.k15'),
      type: 'select',
      defaultValue: 'planning',
      options: {
        type: 'static',
        options: [
          { value: 'planning', label: i18n.t('pdm.batch.k16') },
          { value: 'in_progress', label: i18n.t('pdm.batch.k17') },
          { value: 'completed', label: i18n.t('pdm.batch.k18') },
          { value: 'cancelled', label: i18n.t('pdm.batch.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'operator',
      label: i18n.t('pdm.batch.k20'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'start_date',
      label: i18n.t('pdm.batch.k21'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'end_date',
      label: i18n.t('pdm.batch.k22'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('pdm.batch.k23'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.batch.k24'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.batch.k25'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['batch_no', 'product_name', 'plannedQuantity', 'unit', 'status', 'created_at'],
    searchFields: ['batch_no', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planning: 'warning',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        planning: i18n.t('pdm.batch.k26'),
        in_progress: i18n.t('pdm.batch.k27'),
        completed: i18n.t('pdm.batch.k28'),
        cancelled: i18n.t('pdm.batch.k29'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.batch.k30'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.batch.k31'), value: 'all' },
          { label: i18n.t('pdm.batch.k32'), value: 'planning' },
          { label: i18n.t('pdm.batch.k33'), value: 'in_progress' },
          { label: i18n.t('pdm.batch.k34'), value: 'completed' },
          { label: i18n.t('pdm.batch.k35'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.batch.k36'),
      fields: ['batch_no', 'product_name', 'plannedQuantity', 'unit'],
    },
    {
      title: i18n.t('pdm.batch.k37'),
      fields: ['formula_id', 'process_id', 'operator'],
    },
    {
      title: i18n.t('pdm.batch.k38'),
      fields: ['status', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('pdm.batch.k39'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.batch.k40'),
  editTitle: i18n.t('pdm.batch.k41'),
  detailTitle: i18n.t('pdm.batch.k42'),
};
