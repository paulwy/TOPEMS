import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const categorySchema: EntitySchema = {
  entity: 'srm_category',
  title: i18n.t('srm.category.k0'),
  description: i18n.t('srm.category.k1'),

  api: {
    module: 'srm',
    resource: 'categories',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('srm.category.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('srm.category.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'description',
      label: i18n.t('srm.category.k4'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'supplier_count',
      label: i18n.t('srm.category.k5'),
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      readonly: true,
      hideInForm: true,
    },
    {
      name: 'level',
      label: i18n.t('srm.category.k6'),
      type: 'select',
      required: true,
      defaultValue: '1',
      options: {
        type: 'static',
        options: [
          { value: '1', label: i18n.t('srm.category.k7') },
          { value: '2', label: i18n.t('srm.category.k8') },
          { value: '3', label: i18n.t('srm.category.k9') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('srm.category.k10'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('srm.category.k11') },
          { value: 'inactive', label: i18n.t('srm.category.k12') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('srm.category.k13'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('srm.category.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['code', 'name', 'description', 'supplier_count', 'level', 'status', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('srm.category.k15'),
        inactive: i18n.t('srm.category.k16'),
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.category.k17'),
      fields: ['code', 'name', 'description'],
    },
    {
      title: i18n.t('srm.category.k18'),
      fields: ['level', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.category.k19'),
  editTitle: i18n.t('srm.category.k20'),
  detailTitle: i18n.t('srm.category.k21'),
};
