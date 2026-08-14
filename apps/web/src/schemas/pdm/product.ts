import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const productSchema: EntitySchema = {
  entity: 'pdm_product',
  title: i18n.t('pdm.product.k0'),
  description: i18n.t('pdm.product.k1'),

  api: {
    module: 'pdm',
    resource: 'products',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('pdm.product.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('pdm.product.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: i18n.t('pdm.product.k4'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'version',
      label: i18n.t('pdm.product.k5'),
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('pdm.product.k6'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.product.k7') },
          { value: 'inactive', label: i18n.t('pdm.product.k8') },
          { value: 'draft', label: i18n.t('pdm.product.k9') },
          { value: 'archived', label: i18n.t('pdm.product.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'unit',
      label: i18n.t('pdm.product.k11'),
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'description',
      label: i18n.t('pdm.product.k12'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.product.k13'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.product.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'version', 'status', 'unit', 'created_at'],
    searchFields: ['code', 'name', 'category'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        draft: 'warning',
        archived: 'default',
      },
      labelMap: {
        active: i18n.t('pdm.product.k15'),
        inactive: i18n.t('pdm.product.k16'),
        draft: i18n.t('pdm.product.k17'),
        archived: i18n.t('pdm.product.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.product.k19'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.product.k20'), value: 'all' },
          { label: i18n.t('pdm.product.k21'), value: 'active' },
          { label: i18n.t('pdm.product.k22'), value: 'inactive' },
          { label: i18n.t('pdm.product.k23'), value: 'draft' },
          { label: i18n.t('pdm.product.k24'), value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.product.k25'),
      fields: ['code', 'name', 'category', 'unit'],
    },
    {
      title: i18n.t('pdm.product.k26'),
      fields: ['version', 'status'],
    },
    {
      title: i18n.t('pdm.product.k27'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.product.k28'),
  editTitle: i18n.t('pdm.product.k29'),
  detailTitle: i18n.t('pdm.product.k30'),
};
