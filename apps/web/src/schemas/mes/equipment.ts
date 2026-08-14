import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const equipmentSchema: EntitySchema = {
  entity: 'mes_equipment',
  title: i18n.t('mes.equipment.k0'),
  description: i18n.t('mes.equipment.k1'),

  api: {
    module: 'mes',
    resource: 'equipment',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('mes.equipment.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('mes.equipment.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'type',
      label: i18n.t('mes.equipment.k4'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'cnc', label: i18n.t('mes.equipment.k5') },
          { value: 'assembly', label: i18n.t('mes.equipment.k6') },
          { value: 'testing', label: i18n.t('mes.equipment.k7') },
          { value: 'packaging', label: i18n.t('mes.equipment.k8') },
          { value: 'conveyor', label: i18n.t('mes.equipment.k9') },
          { value: 'other', label: i18n.t('mes.equipment.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'model',
      label: i18n.t('mes.equipment.k11'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'manufacturer',
      label: i18n.t('mes.equipment.k12'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'purchase_date',
      label: i18n.t('mes.equipment.k13'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'location',
      label: i18n.t('mes.equipment.k14'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'status',
      label: i18n.t('mes.equipment.k15'),
      type: 'select',
      defaultValue: 'idle',
      options: {
        type: 'static',
        options: [
          { value: 'idle', label: i18n.t('mes.equipment.k16') },
          { value: 'running', label: i18n.t('mes.equipment.k17') },
          { value: 'maintenance', label: i18n.t('mes.equipment.k18') },
          { value: 'fault', label: i18n.t('mes.equipment.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'value',
      label: i18n.t('mes.equipment.k20'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('mes.equipment.k21'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'type', 'model', 'location', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        running: 'success',
        idle: 'default',
        maintenance: 'warning',
        fault: 'error',
      },
      labelMap: {
        running: i18n.t('mes.equipment.k22'),
        idle: i18n.t('mes.equipment.k23'),
        maintenance: i18n.t('mes.equipment.k24'),
        fault: i18n.t('mes.equipment.k25'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.equipment.k26'),
        type: 'select',
        options: [
          { label: i18n.t('mes.equipment.k27'), value: 'all' },
          { label: i18n.t('mes.equipment.k28'), value: 'running' },
          { label: i18n.t('mes.equipment.k29'), value: 'idle' },
          { label: i18n.t('mes.equipment.k30'), value: 'maintenance' },
          { label: i18n.t('mes.equipment.k31'), value: 'fault' },
        ],
      },
      {
        id: 'type',
        label: i18n.t('mes.equipment.k32'),
        type: 'select',
        options: [
          { label: i18n.t('mes.equipment.k33'), value: 'all' },
          { label: i18n.t('mes.equipment.k34'), value: 'cnc' },
          { label: i18n.t('mes.equipment.k35'), value: 'assembly' },
          { label: i18n.t('mes.equipment.k36'), value: 'testing' },
          { label: i18n.t('mes.equipment.k37'), value: 'packaging' },
          { label: i18n.t('mes.equipment.k38'), value: 'conveyor' },
          { label: i18n.t('mes.equipment.k39'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.equipment.k40'),
      fields: ['code', 'name', 'type', 'model', 'manufacturer'],
    },
    {
      title: i18n.t('mes.equipment.k41'),
      fields: ['location', 'purchase_date', 'value'],
    },
    {
      title: i18n.t('mes.equipment.k42'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.equipment.k43'),
  editTitle: i18n.t('mes.equipment.k44'),
  detailTitle: i18n.t('mes.equipment.k45'),
};
