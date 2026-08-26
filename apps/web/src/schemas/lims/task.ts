/**
 * 检测任务 Schema — 驱动 LimsTaskPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const taskSchema: EntitySchema = {
  entity: 'limsTask',
  title: i18n.t('lims.task.k0'),
  description: i18n.t('lims.task.k1'),

  api: {
    module: 'lims',
    resource: 'tasks',
  },

  fields: [
    {
      name: 'task_code',
      label: i18n.t('lims.task.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'task_name',
      label: i18n.t('lims.task.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'sample_id',
      label: i18n.t('lims.task.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'sample_name',
      label: i18n.t('lims.task.k5'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'method_id',
      label: i18n.t('lims.task.k6'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'method_name',
      label: i18n.t('lims.task.k7'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'assignee',
      label: i18n.t('lims.task.k8'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'priority',
      label: i18n.t('lims.task.k9'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('lims.task.k10') },
          { value: 'medium', label: i18n.t('lims.task.k11') },
          { value: 'low', label: i18n.t('lims.task.k12') },
          { value: 'urgent', label: i18n.t('lims.task.k13') },
        ],
      },
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const map: Record<string, string> = {
          high: i18n.t('lims.task.k14'),
          medium: i18n.t('lims.task.k15'),
          low: i18n.t('lims.task.k16'),
          urgent: i18n.t('lims.task.k17'),
        };
        return map[String(row.priority || '')] || String(row.priority || '-');
      },
    },
    {
      name: 'status',
      label: i18n.t('lims.task.k18'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('lims.task.k19') },
          { value: 'in_progress', label: i18n.t('lims.task.k20') },
          { value: 'paused', label: i18n.t('lims.task.k21') },
          { value: 'completed', label: i18n.t('lims.task.k22') },
          { value: 'cancelled', label: i18n.t('lims.task.k23') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'due_date',
      label: i18n.t('lims.task.k24'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('lims.task.k25'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'task_code',
      'task_name',
      'sample_name',
      'assignee',
      'priority',
      'status',
      'due_date',
    ],
    searchFields: ['task_code', 'task_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        in_progress: 'warning',
        paused: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('lims.task.k26'),
        in_progress: i18n.t('lims.task.k27'),
        paused: i18n.t('lims.task.k28'),
        completed: i18n.t('lims.task.k29'),
        cancelled: i18n.t('lims.task.k30'),
      },
    },
    filters: [
      {
        id: 'priority',
        label: i18n.t('lims.task.k31'),
        type: 'select',
        options: [
          { label: i18n.t('lims.task.k32'), value: 'all' },
          { label: i18n.t('lims.task.k33'), value: 'high' },
          { label: i18n.t('lims.task.k34'), value: 'medium' },
          { label: i18n.t('lims.task.k35'), value: 'low' },
          { label: i18n.t('lims.task.k36'), value: 'urgent' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('lims.task.k37'),
        type: 'select',
        options: [
          { label: i18n.t('lims.task.k38'), value: 'all' },
          { label: i18n.t('lims.task.k39'), value: 'pending' },
          { label: i18n.t('lims.task.k40'), value: 'in_progress' },
          { label: i18n.t('lims.task.k41'), value: 'paused' },
          { label: i18n.t('lims.task.k42'), value: 'completed' },
          { label: i18n.t('lims.task.k43'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.task.k44'),
      fields: ['task_code', 'task_name', 'sample_id', 'method_id'],
    },
    {
      title: i18n.t('lims.task.k45'),
      fields: ['assignee', 'priority', 'due_date'],
    },
    {
      title: i18n.t('lims.task.k46'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.task.k47'),
  editTitle: i18n.t('lims.task.k48'),
  detailTitle: i18n.t('lims.task.k49'),
};
