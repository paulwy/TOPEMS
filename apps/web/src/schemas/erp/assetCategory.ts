import type { EntitySchema } from '@/schema';

export const assetCategorySchema: EntitySchema = {
  entity: 'asset_category',
  title: '资产分类',
  description: '管理资产分类，支持树形层级结构',

  api: {
    module: 'erp',
    resource: 'assetCategories',
  },

  fields: [
    {
      name: 'code',
      label: '分类编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '分类名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'parentId',
      label: '上级分类',
      type: 'text',
      listWidth: 150,
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
    {
      name: 'created_at',
      label: '创建时间',
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
        active: '启用',
        inactive: '停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'parentId'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增分类',
  editTitle: '编辑分类',
  detailTitle: '分类详情',
};
