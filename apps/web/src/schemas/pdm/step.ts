import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const stepSchema: EntitySchema = {
  entity: 'pdm_step',
  title: i18n.t('pdm.step.k0'),
  description: i18n.t('pdm.step.k1'),

  api: {
    module: 'pdm',
    resource: 'steps',
  },

  fields: [
    {
      name: 'step_no',
      label: i18n.t('pdm.step.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('pdm.step.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'process_id',
      label: i18n.t('pdm.step.k4'),
      type: 'text',
      required: true,
      showInList: false,
      placeholder: i18n.t('pdm.step.id_5'),
    },
    {
      name: 'sort_order',
      label: i18n.t('pdm.step.k6'),
      type: 'number',
      defaultValue: 1,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'duration_hours',
      label: i18n.t('pdm.step.k7'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'equipment_required',
      label: i18n.t('pdm.step.k8'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: i18n.t('pdm.step.k9'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.step.k10') },
          { value: 'inactive', label: i18n.t('pdm.step.k11') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('pdm.step.k12'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.step.k13'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['step_no', 'name', 'sort_order', 'duration_hours', 'equipment_required', 'status'],
    searchFields: ['step_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('pdm.step.k14'),
        inactive: i18n.t('pdm.step.k15'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.step.k16'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.step.k17'), value: 'all' },
          { label: i18n.t('pdm.step.k18'), value: 'active' },
          { label: i18n.t('pdm.step.k19'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.step.k20'),
      fields: ['step_no', 'name', 'process_id', 'sort_order'],
    },
    {
      title: i18n.t('pdm.step.k21'),
      fields: ['duration_hours', 'equipment_required', 'status'],
    },
    {
      title: i18n.t('pdm.step.k22'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.step.k23'),
  editTitle: i18n.t('pdm.step.k24'),
  detailTitle: i18n.t('pdm.step.k25'),
};
