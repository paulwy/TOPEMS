import type { EntitySchema } from '@/schema';

export const productionOrderSchema: EntitySchema = {
  entity: 'mes_production_order',
  title: '生产订单',
  description: '管理生产订单，包括订单号、产品、数量、计划时间、状态等',

  api: {
    module: 'mes',
    resource: 'orders',
  },

  fields: [
    {
      name: 'order_number',
      label: '订单号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'scheduled_start_date',
      label: '计划开始',
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'scheduled_end_date',
      label: '计划结束',
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'actualStartDate',
      label: '实际开始',
      type: 'datetime',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'actualEndDate',
      label: '实际结束',
      type: 'datetime',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '普通' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 90,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待下达' },
          { value: 'released', label: '已下达' },
          { value: 'in_progress', label: '生产中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
          { value: 'paused', label: '已暂停' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: [
      'order_number',
      'product_name',
      'product_code',
      'quantity',
      'scheduled_start_date',
      'scheduled_end_date',
      'status',
    ],
    searchFields: ['order_number', 'product_name', 'product_code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        released: 'info',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'error',
        paused: 'default',
      },
      labelMap: {
        pending: '待下达',
        released: '已下达',
        in_progress: '生产中',
        completed: '已完成',
        cancelled: '已取消',
        paused: '已暂停',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待下达', value: 'pending' },
          { label: '已下达', value: 'released' },
          { label: '生产中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
          { label: '已暂停', value: 'paused' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '订单信息',
      fields: ['order_number', 'product_name', 'product_code'],
    },
    {
      title: '数量与优先级',
      fields: ['quantity', 'unit', 'priority'],
    },
    {
      title: '计划时间',
      fields: ['scheduled_start_date', 'scheduled_end_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增生产订单',
  editTitle: '编辑生产订单',
  detailTitle: '生产订单详情',
};
