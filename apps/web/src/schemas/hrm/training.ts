import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const trainingSchema: EntitySchema = {
  entity: 'hrm_training',
  title: i18n.t('hrm.training.k0'),
  description: i18n.t('hrm.training.k1'),

  api: {
    module: 'hrm',
    resource: 'trainingPlans',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('hrm.training.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: i18n.t('hrm.training.k3'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('hrm.training.k4'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('hrm.training.k5'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('hrm.training.k6'),
      type: 'select',
      defaultValue: 'planned',
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: i18n.t('hrm.training.k7') },
          { value: 'in_progress', label: i18n.t('hrm.training.k8') },
          { value: 'completed', label: i18n.t('hrm.training.k9') },
          { value: 'cancelled', label: i18n.t('hrm.training.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'budget',
      label: i18n.t('hrm.training.k11'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('hrm.training.k12'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'start_date', 'end_date', 'budget', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'default',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        planned: i18n.t('hrm.training.k13'),
        in_progress: i18n.t('hrm.training.k14'),
        completed: i18n.t('hrm.training.k15'),
        cancelled: i18n.t('hrm.training.k16'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.training.k17'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.training.k18'), value: 'all' },
          { label: i18n.t('hrm.training.k19'), value: 'planned' },
          { label: i18n.t('hrm.training.k20'), value: 'in_progress' },
          { label: i18n.t('hrm.training.k21'), value: 'completed' },
          { label: i18n.t('hrm.training.k22'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.training.k23'),
      fields: ['name', 'code', 'description'],
    },
    {
      title: i18n.t('hrm.training.k24'),
      fields: ['start_date', 'end_date', 'budget'],
    },
    {
      title: i18n.t('hrm.training.k25'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.training.k26'),
  editTitle: i18n.t('hrm.training.k27'),
  detailTitle: i18n.t('hrm.training.k28'),
};
