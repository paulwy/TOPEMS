import type { EntitySchema } from '@/schema';


import { QUERY_KEYS } from '@/lib/reactQuery';

export const transferSchema: EntitySchema = {
  entity: 'wms_transfer',
  title: '调拨管理',
  description: '管理仓库间调拨订单，支持调拨创建、确认、发货、收货和完成全流程',

  api: {
    module: 'wms',
    resource: 'transfers',
  },

  fields: [
    {
      name: 'order_number',
      label: '调拨单号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'transfer_type',
      label: '调拨类型',
      type: 'select',
      required: true,
      defaultValue: 'internal',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { value: 'internal', label: '内部调拨' },
          { value: 'external', label: '外部调拨' },
          { value: 'return', label: '退回复检' },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'from_warehouse_id',
      label: '源仓库',
      type: 'select',
      required: true,
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'from_location_id',
      label: '源库位',
      type: 'select',
      listWidth: 120,
      hideInForm: false,
    },
    {
      name: 'to_warehouse_id',
      label: '目标仓库',
      type: 'select',
      required: true,
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'to_location_id',
      label: '目标库位',
      type: 'select',
      listWidth: 120,
      hideInForm: false,
    },
    {
      name: 'total_quantity',
      label: '总数量',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'urgent', label: '紧急' },
          { value: 'high', label: '高' },
          { value: 'normal', label: '普通' },
          { value: 'low', label: '低' },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'confirmed', label: '已确认' },
          { value: 'shipped', label: '已发货' },
          { value: 'received', label: '已收货' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'planned_date',
      label: '计划日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'transporter',
      label: '承运人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'tracking_number',
      label: '物流单号',
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      listWidth: 200,
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
    columns: [
      'order_number',
      'transfer_type',
      'from_warehouse_id',
      'to_warehouse_id',
      'total_quantity',
      'priority',
      'status',
      'planned_date',
    ],
    searchFields: ['order_number', 'transporter', 'tracking_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        shipped: 'info',
        received: 'success',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待处理',
        confirmed: '已确认',
        shipped: '已发货',
        received: '已收货',
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
          { label: '待处理', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '已发货', value: 'shipped' },
          { label: '已收货', value: 'received' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        type: 'select',
        options: [{ label: '全部仓库', value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['order_number', 'transfer_type', 'priority'],
    },
    {
      title: '仓库信息',
      fields: ['from_warehouse_id', 'from_location_id', 'to_warehouse_id', 'to_location_id'],
    },
    {
      title: '物流信息',
      fields: ['planned_date', 'transporter', 'tracking_number'],
    },
    {
      title: '其他',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增调拨单',
  editTitle: '编辑调拨单',
  detailTitle: '调拨单详情',

  dynamicOptions: [
    {
      field: 'from_warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((w) => ({
            value: w.id,
            label: w.name,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.WAREHOUSE_OPTIONS_BASE,
    },
    {
      field: 'to_warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((w) => ({
            value: w.id,
            label: w.name,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.WAREHOUSE_OPTIONS_BASE,
    },
  ],
};
