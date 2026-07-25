import type { EntitySchema } from '@/schema';

export const productSchema: EntitySchema = {
  entity: 'pdm_product',
  title: '产品管理',
  description: '管理产品基础信息，包括编码、名称、版本、状态等',

  api: {
    module: 'pdm',
    resource: 'products',
  },

  fields: [
    {
      name: 'code',
      label: '产品编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: '分类',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '未激活' },
          { value: 'draft', label: '草稿' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'description',
      label: '产品描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
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
        active: '活跃',
        inactive: '未激活',
        draft: '草稿',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '未激活', value: 'inactive' },
          { label: '草稿', value: 'draft' },
          { label: '已归档', value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'unit'],
    },
    {
      title: '版本与状态',
      fields: ['version', 'status'],
    },
    {
      title: '描述信息',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '添加产品',
  editTitle: '编辑产品',
  detailTitle: '产品详情',
};
