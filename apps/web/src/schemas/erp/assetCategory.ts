import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const assetCategorySchema: EntitySchema = {
  entity: 'asset_category',
  title: i18n.t('schema:erp.asset_category.meta.title'),
  description: i18n.t('schema:erp.asset_category.meta.description'),

  api: {
    module: 'erp',
    resource: 'assetCategories',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('schema:erp.asset_category.code.label'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('schema:erp.asset_category.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'parentId',
      label: i18n.t('schema:erp.asset_category.parentId.label'),
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'description',
      label: i18n.t('schema:erp.asset_category.description.label'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.asset_category.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.asset_category.status.option.active') },
          { value: 'inactive', label: i18n.t('schema:erp.asset_category.status.option.inactive') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('schema:erp.asset_category.created_at.label'),
      type: 'date',
      listWidth: 160,
    },
  ],

  list: {
    columns: ['code', 'name', 'parentId', 'status', 'created_at'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('schema:erp.asset_category.status.option.active'),
        inactive: i18n.t('schema:erp.asset_category.status.option.inactive'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.asset_category.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.asset_category.filter.status.option.all'), value: 'all' },
          {
            label: i18n.t('schema:erp.asset_category.filter.status.option.active'),
            value: 'active',
          },
          {
            label: i18n.t('schema:erp.asset_category.filter.status.option.inactive'),
            value: 'inactive',
          },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('schema:erp.asset_category.section.0.title'),
      fields: ['code', 'name', 'parentId'],
    },
    {
      title: i18n.t('schema:erp.asset_category.section.1.title'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.asset_category.meta.createTitle'),
  editTitle: i18n.t('schema:erp.asset_category.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.asset_category.meta.detailTitle'),
};
