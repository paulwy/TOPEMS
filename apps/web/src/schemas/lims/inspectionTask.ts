/**
 * 检验任务 Schema — 驱动 InspectionTaskPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  [i18n.t('schemas.inspection_task.k0')]: 'warning',
  [i18n.t('schemas.inspection_task.k1')]: 'info',
  [i18n.t('schemas.inspection_task.k2')]: 'primary',
  [i18n.t('schemas.inspection_task.k3')]: 'success',
  [i18n.t('schemas.inspection_task.k4')]: 'error',
  pending: 'warning',
  assigned: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const statusLabelMap: Record<string, string> = {
  [i18n.t('schemas.inspection_task.k5')]: i18n.t('lims.inspection_task.k0'),
  [i18n.t('schemas.inspection_task.k6')]: i18n.t('lims.inspection_task.k1'),
  [i18n.t('schemas.inspection_task.k7')]: i18n.t('lims.inspection_task.k2'),
  [i18n.t('schemas.inspection_task.k8')]: i18n.t('lims.inspection_task.k3'),
  [i18n.t('schemas.inspection_task.k9')]: i18n.t('lims.inspection_task.k4'),
  pending: i18n.t('lims.inspection_task.k5'),
  assigned: i18n.t('lims.inspection_task.k6'),
  in_progress: i18n.t('lims.inspection_task.k7'),
  completed: i18n.t('lims.inspection_task.k8'),
  cancelled: i18n.t('lims.inspection_task.k9'),
};

export const inspectionTaskSchema: EntitySchema = {
  entity: 'limsInspectionTask',
  title: i18n.t('lims.inspection_task.k10'),
  description: i18n.t('lims.inspection_task.k11'),

  api: {
    module: 'lims',
    resource: 'inspection-tasks',
  },

  fields: [
    {
      name: 'task_no',
      label: i18n.t('lims.inspection_task.k12'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.task_no || row.id || '-'),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'sample_id',
      label: i18n.t('lims.inspection_task.k13'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'process_id',
      label: i18n.t('lims.inspection_task.k14'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'current_step',
      label: i18n.t('lims.inspection_task.k15'),
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const step = row.current_step;
        if (step === undefined || step === null) return '-';
        return `${i18n.t('shared.inspection_task.k0')}${step}${i18n.t('shared.inspection_task.k1')}`;
      },
    },
    {
      name: 'status',
      label: i18n.t('lims.inspection_task.k16'),
      type: 'select',
      defaultValue: i18n.t('lims.inspection_task.k17'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.inspection_task.k18'), label: i18n.t('lims.inspection_task.k19') },
          { value: i18n.t('lims.inspection_task.k20'), label: i18n.t('lims.inspection_task.k21') },
          { value: i18n.t('lims.inspection_task.k22'), label: i18n.t('lims.inspection_task.k23') },
          { value: i18n.t('lims.inspection_task.k24'), label: i18n.t('lims.inspection_task.k25') },
          { value: i18n.t('lims.inspection_task.k26'), label: i18n.t('lims.inspection_task.k27') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'inspector',
      label: i18n.t('lims.inspection_task.k28'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'started_at',
      label: i18n.t('lims.inspection_task.k29'),
      type: 'date',
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.started_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'completed_at',
      label: i18n.t('lims.inspection_task.k30'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('lims.inspection_task.k31'),
      type: 'date',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'task_no',
      'sample_id',
      'process_id',
      'current_step',
      'status',
      'inspector',
      'started_at',
    ],
    searchFields: ['task_no', 'sample_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.inspection_task.k32'),
        type: 'select',
        options: [
          { label: i18n.t('lims.inspection_task.k33'), value: 'all' },
          { label: i18n.t('lims.inspection_task.k34'), value: i18n.t('lims.inspection_task.k35') },
          { label: i18n.t('lims.inspection_task.k36'), value: i18n.t('lims.inspection_task.k37') },
          { label: i18n.t('lims.inspection_task.k38'), value: i18n.t('lims.inspection_task.k39') },
          { label: i18n.t('lims.inspection_task.k40'), value: i18n.t('lims.inspection_task.k41') },
          { label: i18n.t('lims.inspection_task.k42'), value: i18n.t('lims.inspection_task.k43') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.inspection_task.k44'),
      fields: ['sample_id', 'process_id'],
    },
    {
      title: i18n.t('lims.inspection_task.k45'),
      fields: ['inspector'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.inspection_task.k46'),
  editTitle: i18n.t('lims.inspection_task.k47'),
  detailTitle: i18n.t('lims.inspection_task.k48'),
};
