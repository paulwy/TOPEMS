import type { EntitySchema } from '@/schema';

export const wipSchema: EntitySchema = {
  entity: 'mes_wip',
  title: '在制品管理',
  description: '管理生产过程中的在制品信息',

  api: {
    module: 'mes',
    resource: 'wip',
  },

  fields: [
    {
      name: 'order_id',
      label: '生产订单ID',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'order_number',
      label: '生产订单',
      type: 'text',
      readonly: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'process_name',
      label: '工序',
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: '工位',
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'completed_quantity',
      label: '已完成数量',
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'wip_quantity',
      label: '在制数量',
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      showInList: false,
    },
    {
      name: 'batch_no',
      label: '批次号',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'operator',
      label: '操作员',
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'in_progress', label: '在产' },
          { value: 'completed', label: '已完成' },
          { value: 'transferred', label: '已转移' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'inbound_time',
      label: '开始时间',
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'outbound_time',
      label: '结束时间',
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.created_at ? new Date(row.created_at as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'process_name',
      'work_station_name',
      'quantity',
      'batch_no',
      'operator',
      'status',
      'created_at',
    ],
    searchFields: ['order_number', 'batch_no', 'operator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_progress: 'warning',
        completed: 'success',
        pending: 'default',
        transferred: 'primary',
      },
      labelMap: {
        in_progress: '在产',
        completed: '已完成',
        pending: '待处理',
        transferred: '已转移',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '在产', value: 'in_progress' },
          { label: '已转移', value: 'transferred' },
          { label: '已完成', value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: [
        'order_id',
        'product_name',
        'quantity',
        'completed_quantity',
        'wip_quantity',
        'unit',
        'batch_no',
      ],
    },
    {
      title: '生产信息',
      fields: [
        'process_name',
        'work_station_name',
        'operator',
        'status',
        'inbound_time',
        'outbound_time',
      ],
    },
    {
      title: '其他',
      fields: ['order_number', 'created_at', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新建在制品',
  editTitle: '编辑在制品',
  detailTitle: '在制品详情',
};
