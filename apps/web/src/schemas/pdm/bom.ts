import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const bomSchema: EntitySchema = {
  entity: 'pdm_bom',
  title: i18n.t('shared.bom.bom_0'),
  description: i18n.t('pdm.bom.k0'),

  api: {
    module: 'pdm',
    resource: 'bomVersions',
  },

  fields: [
    {
      name: 'bom_no',
      label: i18n.t('shared.bom.bom_1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('shared.bom.bom_2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'product_id',
      label: i18n.t('pdm.bom.id_1'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'product_name',
      label: i18n.t('pdm.bom.k2'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'product_code',
      label: i18n.t('pdm.bom.k3'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'version',
      label: i18n.t('pdm.bom.k4'),
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('pdm.bom.k5'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('pdm.bom.k6') },
          { value: 'active', label: i18n.t('pdm.bom.k7') },
          { value: 'archived', label: i18n.t('pdm.bom.k8') },
          { value: 'superseded', label: i18n.t('pdm.bom.k9') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'effective_date',
      label: i18n.t('pdm.bom.k10'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'expiry_date',
      label: i18n.t('pdm.bom.k11'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('pdm.bom.k12'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.bom.k13'),
      type: 'date',
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'bom_no',
      'name',
      'product_name',
      'version',
      'status',
      'effective_date',
      'created_at',
    ],
    searchFields: ['bom_no', 'name', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        active: 'success',
        archived: 'default',
        superseded: 'warning',
      },
      labelMap: {
        draft: i18n.t('pdm.bom.k14'),
        active: i18n.t('pdm.bom.k15'),
        archived: i18n.t('pdm.bom.k16'),
        superseded: i18n.t('pdm.bom.k17'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.bom.k18'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.bom.k19'), value: 'all' },
          { label: i18n.t('pdm.bom.k20'), value: 'draft' },
          { label: i18n.t('pdm.bom.k21'), value: 'active' },
          { label: i18n.t('pdm.bom.k22'), value: 'archived' },
          { label: i18n.t('pdm.bom.k23'), value: 'superseded' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.bom.k24'),
      fields: ['bom_no', 'name', 'product_id', 'version'],
    },
    {
      title: i18n.t('pdm.bom.k25'),
      fields: ['product_code', 'product_name'],
    },
    {
      title: i18n.t('pdm.bom.k26'),
      fields: ['status', 'effective_date', 'expiry_date'],
    },
    {
      title: i18n.t('pdm.bom.k27'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.bom.bom_28'),
  editTitle: i18n.t('pdm.bom.bom_29'),
  detailTitle: i18n.t('shared.bom.bom_3'),
};
