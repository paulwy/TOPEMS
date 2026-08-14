import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const performanceSchema: EntitySchema = {
  entity: 'hrm_performance',
  title: i18n.t('hrm.performance.k0'),
  description: i18n.t('hrm.performance.k1'),

  api: {
    module: 'hrm',
    resource: 'performanceReviews',
  },

  fields: [
    {
      name: 'employee_id',
      label: i18n.t('hrm.performance.id_2'),
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'review_period',
      label: i18n.t('hrm.performance.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'reviewer_id',
      label: i18n.t('hrm.performance.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'overall_rating',
      label: i18n.t('hrm.performance.k5'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'self_rating',
      label: i18n.t('hrm.performance.k6'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'manager_rating',
      label: i18n.t('hrm.performance.k7'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'final_rating',
      label: i18n.t('hrm.performance.k8'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('hrm.performance.k9'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('hrm.performance.k10') },
          { value: 'self_reviewed', label: i18n.t('hrm.performance.k11') },
          { value: 'manager_reviewed', label: i18n.t('hrm.performance.k12') },
          { value: 'completed', label: i18n.t('hrm.performance.k13') },
          { value: 'archived', label: i18n.t('hrm.performance.k14') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'comments',
      label: i18n.t('hrm.performance.k15'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'employee_id',
      'review_period',
      'reviewer_id',
      'overall_rating',
      'self_rating',
      'manager_rating',
      'final_rating',
      'status',
    ],
    searchFields: ['employee_id', 'review_period'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        self_reviewed: 'info',
        manager_reviewed: 'warning',
        completed: 'success',
        archived: 'default',
      },
      labelMap: {
        pending: i18n.t('hrm.performance.k16'),
        self_reviewed: i18n.t('hrm.performance.k17'),
        manager_reviewed: i18n.t('hrm.performance.k18'),
        completed: i18n.t('hrm.performance.k19'),
        archived: i18n.t('hrm.performance.k20'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.performance.k21'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.performance.k22'), value: 'all' },
          { label: i18n.t('hrm.performance.k23'), value: 'pending' },
          { label: i18n.t('hrm.performance.k24'), value: 'self_reviewed' },
          { label: i18n.t('hrm.performance.k25'), value: 'manager_reviewed' },
          { label: i18n.t('hrm.performance.k26'), value: 'completed' },
          { label: i18n.t('hrm.performance.k27'), value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.performance.k28'),
      fields: ['employee_id', 'review_period', 'reviewer_id'],
    },
    {
      title: i18n.t('hrm.performance.k29'),
      fields: ['self_rating', 'manager_rating', 'overall_rating', 'final_rating'],
    },
    {
      title: i18n.t('hrm.performance.k30'),
      fields: ['status', 'comments'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.performance.k31'),
  editTitle: i18n.t('hrm.performance.k32'),
  detailTitle: i18n.t('hrm.performance.k33'),
};
