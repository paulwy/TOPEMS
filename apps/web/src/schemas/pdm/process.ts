import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const processSchema: EntitySchema = {
  entity: 'pdm_process',
  title: i18n.t('pdm.process.k0'),
  description: i18n.t('pdm.process.k1'),

  api: {
    module: 'pdm',
    resource: 'processes',
  },

  fields: [
    {
      name: 'process_no',
      label: i18n.t('pdm.process.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('pdm.process.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'version',
      label: i18n.t('pdm.process.k4'),
      type: 'text',
      defaultValue: '1.0',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('pdm.process.k5'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.process.k6') },
          { value: 'inactive', label: i18n.t('pdm.process.k7') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('pdm.process.k8'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.process.k9'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.process.k10'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['process_no', 'name', 'version', 'status'],
    searchFields: ['process_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('pdm.process.k11'),
        inactive: i18n.t('pdm.process.k12'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.process.k13'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.process.k14'), value: 'all' },
          { label: i18n.t('pdm.process.k15'), value: 'active' },
          { label: i18n.t('pdm.process.k16'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.process.k17'),
      fields: ['process_no', 'name', 'version', 'status'],
    },
    {
      title: i18n.t('pdm.process.k18'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.process.k19'),
  editTitle: i18n.t('pdm.process.k20'),
  detailTitle: i18n.t('pdm.process.k21'),
};
