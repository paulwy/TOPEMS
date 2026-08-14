import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const evaluationSchema: EntitySchema = {
  entity: 'srm_evaluation',
  title: i18n.t('srm.evaluation.k0'),
  description: i18n.t('srm.evaluation.k1'),

  api: {
    module: 'srm',
    resource: 'supplier-evaluations',
  },

  fields: [
    {
      name: 'evaluation_no',
      label: i18n.t('srm.evaluation.k2'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('srm.evaluation.k3'),
      type: 'select',
      required: true,
      listWidth: 180,
    },
    {
      name: 'evaluation_date',
      label: i18n.t('srm.evaluation.k4'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'overall_score',
      label: i18n.t('srm.evaluation.k5'),
      type: 'number',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'quality_score',
      label: i18n.t('srm.evaluation.k6'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'delivery_score',
      label: i18n.t('srm.evaluation.k7'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'service_score',
      label: i18n.t('srm.evaluation.k8'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'price_score',
      label: i18n.t('srm.evaluation.k9'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'evaluator',
      label: i18n.t('srm.evaluation.k10'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'status',
      label: i18n.t('srm.evaluation.k11'),
      type: 'select',
      required: true,
      defaultValue: 'in_progress',
      options: {
        type: 'static',
        options: [
          { value: 'in_progress', label: i18n.t('srm.evaluation.k12') },
          { value: 'pending', label: i18n.t('srm.evaluation.k13') },
          { value: 'completed', label: i18n.t('srm.evaluation.k14') },
          { value: 'rejected', label: i18n.t('srm.evaluation.k15') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: i18n.t('srm.evaluation.k16'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'evaluation_no',
      'supplier_id',
      'evaluation_date',
      'overall_score',
      'quality_score',
      'delivery_score',
      'service_score',
      'price_score',
      'evaluator',
      'status',
    ],
    searchFields: ['evaluation_no', 'supplier_id', 'evaluator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_progress: 'primary',
        pending: 'warning',
        completed: 'success',
        rejected: 'error',
      },
      labelMap: {
        in_progress: i18n.t('srm.evaluation.k17'),
        pending: i18n.t('srm.evaluation.k18'),
        completed: i18n.t('srm.evaluation.k19'),
        rejected: i18n.t('srm.evaluation.k20'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.evaluation.k21'),
        type: 'select',
        options: [
          { label: i18n.t('srm.evaluation.k22'), value: 'all' },
          { label: i18n.t('srm.evaluation.k23'), value: 'in_progress' },
          { label: i18n.t('srm.evaluation.k24'), value: 'pending' },
          { label: i18n.t('srm.evaluation.k25'), value: 'completed' },
          { label: i18n.t('srm.evaluation.k26'), value: 'rejected' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.evaluation.k27'),
      fields: ['evaluation_no', 'supplier_id', 'evaluation_date', 'evaluator', 'status'],
    },
    {
      title: i18n.t('srm.evaluation.k28'),
      fields: ['quality_score', 'delivery_score', 'service_score', 'price_score'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.evaluation.k29'),
  editTitle: i18n.t('srm.evaluation.k30'),
  detailTitle: i18n.t('srm.evaluation.k31'),
};
