import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const workstationSchema: EntitySchema = {
  entity: 'workstation',
  title: i18n.t('mes.workstation.k0'),
  description: i18n.t('mes.workstation.k1'),

  api: {
    module: 'mes',
    resource: 'workstations',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('mes.workstation.k2'),
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: i18n.t('mes.workstation.k3'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'location',
      label: i18n.t('mes.workstation.k4'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'capacity',
      label: i18n.t('mes.workstation.k5'),
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'supervisor',
      label: i18n.t('mes.workstation.k6'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('mes.workstation.k7'),
      type: 'select',
      defaultValue: 'idle',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('mes.workstation.k8') },
          { value: 'idle', label: i18n.t('mes.workstation.k9') },
          { value: 'maintenance', label: i18n.t('mes.workstation.k10') },
          { value: 'offline', label: i18n.t('mes.workstation.k11') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'created_at',
      label: i18n.t('mes.workstation.k12'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('mes.workstation.k13'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['name', 'code', 'location', 'capacity', 'supervisor', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        idle: 'warning',
        maintenance: 'info',
        offline: 'error',
      },
      labelMap: {
        active: i18n.t('mes.workstation.k14'),
        idle: i18n.t('mes.workstation.k15'),
        maintenance: i18n.t('mes.workstation.k16'),
        offline: i18n.t('mes.workstation.k17'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.workstation.k18'),
        type: 'select',
        options: [
          { label: i18n.t('mes.workstation.k19'), value: '' },
          { label: i18n.t('mes.workstation.k20'), value: 'active' },
          { label: i18n.t('mes.workstation.k21'), value: 'idle' },
          { label: i18n.t('mes.workstation.k22'), value: 'maintenance' },
          { label: i18n.t('mes.workstation.k23'), value: 'offline' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.workstation.k24'),
      fields: ['name', 'code', 'location'],
    },
    {
      title: i18n.t('mes.workstation.k25'),
      fields: ['capacity', 'supervisor'],
    },
    {
      title: i18n.t('mes.workstation.k26'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.workstation.k27'),
  editTitle: i18n.t('mes.workstation.k28'),
  detailTitle: i18n.t('mes.workstation.k29'),
};
