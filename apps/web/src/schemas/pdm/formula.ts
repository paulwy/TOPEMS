import type { EntitySchema } from '@/schema';

export const formulaSchema: EntitySchema = {
  entity: 'pdm_formula',
  title: '生产配方',
  description: '管理生产配方，包括配方编号、产品名称、版本、状态等',

  api: {
    module: 'pdm',
    resource: 'formulas',
  },

  fields: [
    {
      name: 'formula_no',
      label: '配方编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
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
      name: 'version',
      label: '版本',
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
    },
    {
      name: 'process_id',
      label: '所属工艺',
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
          { value: 'approved', label: '已批准' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 130,
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
    columns: ['formula_no', 'name', 'version', 'status', 'created_at'],
    searchFields: ['formula_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        active: 'success',
        inactive: 'default',
        approved: 'info',
      },
      labelMap: {
        draft: '草稿',
        active: '启用',
        inactive: '禁用',
        approved: '已批准',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'inactive' },
          { label: '已批准', value: 'approved' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['formula_no', 'name', 'version', 'process_id'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增配方',
  editTitle: '编辑配方',
  detailTitle: '配方详情',
};
