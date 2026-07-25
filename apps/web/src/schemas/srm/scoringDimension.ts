import type { EntitySchema } from '@/schema';

export const scoringDimensionSchema: EntitySchema = {
  entity: 'scoring_dimension',
  title: '评分维度配置',
  description: '管理供应商评分维度，配置权重、评分范围和状态',

  api: {
    module: 'srm',
    resource: 'scoring-dimensions',
  },

  fields: [
    {
      name: 'dimension_code',
      label: '维度编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '维度名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'weight',
      label: '权重 (%)',
      type: 'number',
      required: true,
      defaultValue: 10,
      listWidth: 100,
    },
    {
      name: 'min_score',
      label: '最低分',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'max_score',
      label: '最高分',
      type: 'number',
      defaultValue: 100,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 200,
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
      name: 'sort_order',
      label: '排序',
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      showInList: false,
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
    columns: ['dimension_code', 'name', 'weight', 'description', 'status', 'created_at'],
    searchFields: ['dimension_code', 'name'],
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
      fields: ['dimension_code', 'name', 'description'],
    },
    {
      title: '评分配置',
      fields: ['weight', 'min_score', 'max_score', 'sort_order'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增评分维度',
  editTitle: '编辑评分维度',
  detailTitle: '评分维度详情',
};
