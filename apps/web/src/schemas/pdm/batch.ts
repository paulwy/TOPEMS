import type { EntitySchema } from '@/schema';

export const batchSchema: EntitySchema = {
  entity: 'pdm_batch',
  title: '生产批次',
  description: '管理生产批次，包括批次号、产品名称、计划数量、状态等',

  api: {
    module: 'pdm',
    resource: 'batches',
  },

  fields: [
    {
      name: 'batch_no',
      label: '批次号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'plannedQuantity',
      label: '计划数量',
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: '件', label: '件' },
          { value: '盒', label: '盒' },
          { value: '瓶', label: '瓶' },
        ],
      },
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'actual_quantity',
      label: '实际数量',
      type: 'number',
      showInList: false,
    },
    {
      name: 'formula_id',
      label: '关联配方',
      type: 'text',
      showInList: false,
    },
    {
      name: 'process_id',
      label: '关联工艺',
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planning',
      options: {
        type: 'static',
        options: [
          { value: 'planning', label: '规划中' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'operator',
      label: '操作员',
      type: 'text',
      showInList: false,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
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
    columns: ['batch_no', 'product_name', 'plannedQuantity', 'unit', 'status', 'created_at'],
    searchFields: ['batch_no', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planning: 'warning',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        planning: '规划中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '规划中', value: 'planning' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['batch_no', 'product_name', 'plannedQuantity', 'unit'],
    },
    {
      title: '关联信息',
      fields: ['formula_id', 'process_id', 'operator'],
    },
    {
      title: '状态与时间',
      fields: ['status', 'start_date', 'end_date'],
    },
    {
      title: '备注',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增批次',
  editTitle: '编辑批次',
  detailTitle: '批次详情',
};
