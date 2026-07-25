import type { EntitySchema } from '@/schema';

export const categorySchema: EntitySchema = {
  entity: 'srm_category',
  title: '供应商分类',
  description: '管理供应商分类，包括分类编码、名称、层级、状态等',

  api: {
    module: 'srm',
    resource: 'categories',
  },

  fields: [
    {
      name: 'code',
      label: '分类编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '分类名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'supplier_count',
      label: '供应商数量',
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      readonly: true,
      hideInForm: true,
    },
    {
      name: 'level',
      label: '层级',
      type: 'select',
      required: true,
      defaultValue: '1',
      options: {
        type: 'static',
        options: [
          { value: '1', label: '一级' },
          { value: '2', label: '二级' },
          { value: '3', label: '三级' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: '更新时间',
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
        active: '启用',
        inactive: '禁用',
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'description'],
    },
    {
      title: '层级与状态',
      fields: ['level', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商分类',
  editTitle: '编辑供应商分类',
  detailTitle: '供应商分类详情',
};
