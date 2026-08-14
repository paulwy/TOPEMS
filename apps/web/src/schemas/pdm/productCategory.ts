import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

export const productCategorySchema: EntitySchema & SchemaExtensions = {
  entity: 'pdm_product_category',
  title: i18n.t('pdm.product_category.k0'),
  description: i18n.t('pdm.product_category.k1'),

  api: {
    module: 'pdm',
    resource: 'productCategories',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('pdm.product_category.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: i18n.t('pdm.product_category.k3'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'category_type',
      label: i18n.t('pdm.product_category.k4'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'product', label: i18n.t('pdm.product_category.k5') },
          { value: 'semi_finished', label: i18n.t('pdm.product_category.k6') },
          { value: 'material', label: i18n.t('pdm.product_category.k7') },
          { value: 'accessory', label: i18n.t('pdm.product_category.k8') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parentId',
      label: i18n.t('pdm.product_category.k9'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'description',
      label: i18n.t('pdm.product_category.k10'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('pdm.product_category.k11'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.product_category.k12') },
          { value: 'inactive', label: i18n.t('pdm.product_category.k13') },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'code', 'category_type', 'status', 'description'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('pdm.product_category.k14'),
        inactive: i18n.t('pdm.product_category.k15'),
      },
    },
  },

  tree: {
    keyField: 'id',
    parentField: 'parentId',
    labelField: 'name',
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.product_category.k16'),
      fields: ['name', 'code', 'category_type'],
    },
    {
      title: i18n.t('pdm.product_category.k17'),
      fields: ['parentId'],
    },
    {
      title: i18n.t('pdm.product_category.k18'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.product_category.k19'),
  editTitle: i18n.t('pdm.product_category.k20'),
  detailTitle: i18n.t('pdm.product_category.k21'),
};
