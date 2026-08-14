import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productionScheduleSchema: EntitySchema = {
  entity: 'mes_production_schedule',
  title: i18n.t('mes.production_schedule.k0'),
  description: i18n.t('mes.production_schedule.k1'),

  api: {
    module: 'mes',
    resource: 'schedules',
  },

  fields: [
    {
      name: 'order_id',
      label: i18n.t('mes.production_schedule.id_2'),
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'order_number',
      label: i18n.t('mes.production_schedule.k3'),
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'process_id',
      label: i18n.t('mes.production_schedule.id_4'),
      type: 'text',
      showInList: false,
      listWidth: 120,
    },
    {
      name: 'process_name',
      label: i18n.t('mes.production_schedule.k5'),
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'work_station_id',
      label: i18n.t('mes.production_schedule.id_6'),
      type: 'text',
      showInList: false,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: i18n.t('mes.production_schedule.k7'),
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'quantity',
      label: i18n.t('mes.production_schedule.k8'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'planned_start_time',
      label: i18n.t('mes.production_schedule.k9'),
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'planned_end_time',
      label: i18n.t('mes.production_schedule.k10'),
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'actual_start_time',
      label: i18n.t('mes.production_schedule.k11'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 180,
    },
    {
      name: 'actual_end_time',
      label: i18n.t('mes.production_schedule.k12'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 180,
    },
    {
      name: 'priority',
      label: i18n.t('mes.production_schedule.k13'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('mes.production_schedule.k14') },
          { value: 'normal', label: i18n.t('mes.production_schedule.k15') },
          { value: 'high', label: i18n.t('mes.production_schedule.k16') },
          { value: 'urgent', label: i18n.t('mes.production_schedule.k17') },
        ],
      },
      showInList: false,
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('mes.production_schedule.k18'),
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: i18n.t('mes.production_schedule.k19') },
          { value: 'in_progress', label: i18n.t('mes.production_schedule.k20') },
          { value: 'completed', label: i18n.t('mes.production_schedule.k21') },
          { value: 'cancelled', label: i18n.t('mes.production_schedule.k22') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'notes',
      label: i18n.t('mes.production_schedule.k23'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'process_name',
      'work_station_name',
      'quantity',
      'planned_start_time',
      'planned_end_time',
      'status',
    ],
    searchFields: ['order_number', 'process_name', 'work_station_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        scheduled: 'secondary',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        scheduled: i18n.t('mes.production_schedule.k24'),
        in_progress: i18n.t('mes.production_schedule.k25'),
        completed: i18n.t('mes.production_schedule.k26'),
        cancelled: i18n.t('mes.production_schedule.k27'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.production_schedule.k28'),
        type: 'select',
        options: [
          { label: i18n.t('mes.production_schedule.k29'), value: '' },
          { label: i18n.t('mes.production_schedule.k30'), value: 'scheduled' },
          { label: i18n.t('mes.production_schedule.k31'), value: 'in_progress' },
          { label: i18n.t('mes.production_schedule.k32'), value: 'completed' },
          { label: i18n.t('mes.production_schedule.k33'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.production_schedule.k34'),
      fields: ['order_id', 'quantity', 'process_id', 'work_station_id'],
    },
    {
      title: i18n.t('mes.production_schedule.k35'),
      fields: ['planned_start_time', 'planned_end_time'],
    },
    {
      title: i18n.t('mes.production_schedule.k36'),
      fields: ['priority', 'status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.production_schedule.k37'),
  editTitle: i18n.t('mes.production_schedule.k38'),
  detailTitle: i18n.t('mes.production_schedule.k39'),
};
