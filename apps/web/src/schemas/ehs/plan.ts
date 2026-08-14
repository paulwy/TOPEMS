import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const planSchema: EntitySchema = {
  entity: 'ehsPlan',
  title: i18n.t('ehs.plan.k0'),
  description: i18n.t('ehs.plan.k1'),

  api: {
    module: 'ehs',
    resource: 'plans',
  },

  fields: [
    {
      name: 'plan_no',
      label: i18n.t('ehs.plan.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'plan_name',
      label: i18n.t('ehs.plan.k3'),
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'plan_type',
      label: i18n.t('ehs.plan.k4'),
      type: 'select',
      required: true,
      defaultValue: 'inspection',
      options: {
        type: 'static',
        options: [
          { value: 'training', label: i18n.t('ehs.plan.k5') },
          { value: 'inspection', label: i18n.t('ehs.plan.k6') },
          { value: 'audit', label: i18n.t('ehs.plan.k7') },
          { value: 'drill', label: i18n.t('ehs.plan.k8') },
          { value: 'improvement', label: i18n.t('ehs.plan.k9') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: i18n.t('ehs.plan.k10'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'department_name',
      label: i18n.t('ehs.plan.k11'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'responsible',
      label: i18n.t('ehs.plan.k12'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('ehs.plan.k13'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('ehs.plan.k14'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('ehs.plan.k15'),
      type: 'select',
      defaultValue: 'planned',
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: i18n.t('ehs.plan.k16') },
          { value: 'in_progress', label: i18n.t('ehs.plan.k17') },
          { value: 'completed', label: i18n.t('ehs.plan.k18') },
          { value: 'delayed', label: i18n.t('ehs.plan.k19') },
          { value: 'cancelled', label: i18n.t('ehs.plan.k20') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'progress',
      label: i18n.t('ehs.plan.k21'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement('span', null, `${row.progress || 0}%`);
      },
    },
    {
      name: 'description',
      label: i18n.t('ehs.plan.k22'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'plan_no',
      'plan_name',
      'plan_type',
      'responsible',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['plan_no', 'plan_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'default',
        in_progress: 'primary',
        completed: 'success',
        delayed: 'warning',
        cancelled: 'error',
      },
      labelMap: {
        planned: i18n.t('ehs.plan.k23'),
        in_progress: i18n.t('ehs.plan.k24'),
        completed: i18n.t('ehs.plan.k25'),
        delayed: i18n.t('ehs.plan.k26'),
        cancelled: i18n.t('ehs.plan.k27'),
      },
    },
    filters: [
      {
        id: 'plan_type',
        label: i18n.t('ehs.plan.k28'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.plan.k29'), value: 'all' },
          { label: i18n.t('ehs.plan.k30'), value: 'training' },
          { label: i18n.t('ehs.plan.k31'), value: 'inspection' },
          { label: i18n.t('ehs.plan.k32'), value: 'audit' },
          { label: i18n.t('ehs.plan.k33'), value: 'drill' },
          { label: i18n.t('ehs.plan.k34'), value: 'improvement' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.plan.k35'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.plan.k36'), value: 'all' },
          { label: i18n.t('ehs.plan.k37'), value: 'planned' },
          { label: i18n.t('ehs.plan.k38'), value: 'in_progress' },
          { label: i18n.t('ehs.plan.k39'), value: 'completed' },
          { label: i18n.t('ehs.plan.k40'), value: 'delayed' },
          { label: i18n.t('ehs.plan.k41'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.plan.k42'),
      fields: ['plan_no', 'plan_name', 'plan_type', 'department_id'],
    },
    {
      title: i18n.t('ehs.plan.k43'),
      fields: ['responsible', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('ehs.plan.k44'),
      fields: ['status', 'progress', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('ehs.plan.k45'),
  editTitle: i18n.t('ehs.plan.k46'),
  detailTitle: i18n.t('ehs.plan.k47'),
};
