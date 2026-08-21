import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const scheduleSchema: EntitySchema = {
  entity: 'schedule',
  title: i18n.t('aps.schedule_management_page.k5'),
  description: i18n.t('aps.schedule_management_page.k6'),

  api: {
    module: 'aps',
    resource: 'schedules',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  fields: [
    {
      name: 'schedule_no',
      label: i18n.t('aps.schedule_management_page.k9'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: i18n.t('aps.schedule_management_page.k10'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'work_center_name',
      label: i18n.t('aps.schedule_management_page.k11'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'planned_start',
      label: i18n.t('aps.schedule_management_page.k12'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'planned_end',
      label: i18n.t('aps.schedule_management_page.k13'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'quantity',
      label: i18n.t('aps.schedule_management_page.k14'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'priority',
      label: i18n.t('aps.schedule_management_page.k15'),
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('aps.schedule_management_page.k16'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('aps.schedule_management_page.k0') },
          { value: 'released', label: i18n.t('aps.schedule_management_page.k1') },
          { value: 'running', label: i18n.t('aps.schedule_management_page.k2') },
          { value: 'completed', label: i18n.t('aps.schedule_management_page.k3') },
          { value: 'cancelled', label: i18n.t('aps.schedule_management_page.k4') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'schedule_no',
      'product_name',
      'work_center_name',
      'planned_start',
      'planned_end',
      'quantity',
      'priority',
      'status',
    ],
    searchFields: ['schedule_no', 'product_name', 'work_center_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        released: 'info',
        running: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('aps.schedule_management_page.k0'),
        released: i18n.t('aps.schedule_management_page.k1'),
        running: i18n.t('aps.schedule_management_page.k2'),
        completed: i18n.t('aps.schedule_management_page.k3'),
        cancelled: i18n.t('aps.schedule_management_page.k4'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('aps.schedule_management_page.k16'),
        type: 'select',
        options: [
          { label: i18n.t('aps.schedule_management_page.k0'), value: 'pending' },
          { label: i18n.t('aps.schedule_management_page.k1'), value: 'released' },
          { label: i18n.t('aps.schedule_management_page.k2'), value: 'running' },
          { label: i18n.t('aps.schedule_management_page.k3'), value: 'completed' },
          { label: i18n.t('aps.schedule_management_page.k4'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formColCount: 2,
  createTitle: i18n.t('aps.schedule_management_page.k5'),
  editTitle: i18n.t('aps.schedule_management_page.k5'),
};
