import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';

export const productCategorySchema: EntitySchema & SchemaExtensions = {
  entity: 'pdm_product_category',
  title: '产品分类',
  description: '管理产品分类层级结构，支持多级分类体系',

  api: {
    module: 'pdm',
    resource: 'productCategories',
  },

  fields: [
    {
      name: 'name',
      label: '分类名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '分类编码',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'category_type',
      label: '分类类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'product', label: '产品' },
          { value: 'semi_finished', label: '半成品' },
          { value: 'material', label: '原材料' },
          { value: 'accessory', label: '辅料' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parent_id',
      label: '上级分类',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
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
        active: '启用',
        inactive: '停用',
      },
    },
  },

  tree: {
    keyField: 'id',
    parentField: 'parent_id',
    labelField: 'name',
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'category_type'],
    },
    {
      title: '层级关系',
      fields: ['parent_id'],
    },
    {
      title: '其他',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增分类',
  editTitle: '编辑分类',
  detailTitle: '分类详情',
};
