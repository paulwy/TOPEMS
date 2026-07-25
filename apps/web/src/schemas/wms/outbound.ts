import type { EntitySchema } from '@/schema';

export const outboundOrderSchema: EntitySchema = {
  entity: 'wms_outbound_order',
  title: '出库管理',
  description: '管理出库订单信息',

  api: {
    module: 'wms',
    resource: 'outbound-orders',
  },

  fields: [
    {
      name: 'order_number',
      label: '出库单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'order_type',
      label: '出库类型',
      type: 'select',
      required: true,
      defaultValue: 'sale',
      options: {
        type: 'static',
        options: [
          { value: 'sale', label: '销售出库' },
          { value: 'return', label: '退货出库' },
          { value: 'transfer', label: '调拨出库' },
          { value: 'production', label: '生产出库' },
          { value: 'other', label: '其他出库' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'warehouse_id',
      label: '仓库',
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'customer_name',
      label: '客户',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'shipping_address',
      label: '收货地址',
      type: 'text',
      showInList: false,
    },
    {
      name: 'expected_date',
      label: '预计日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待确认' },
          { value: 'confirmed', label: '已确认' },
          { value: 'picking', label: '拣货中' },
          { value: 'picked', label: '已拣货' },
          { value: 'packing', label: '打包中' },
          { value: 'shipped', label: '已发货' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'total_quantity',
      label: '总数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: '总金额',
      type: 'number',
      listWidth: 100,
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
      'order_type',
      'warehouse_id',
      'customer_name',
      'expected_date',
      'status',
      'total_quantity',
      'total_amount',
    ],
    searchFields: ['order_number', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        picking: 'info',
        picked: 'info',
        packing: 'warning',
        shipped: 'success',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待确认',
        confirmed: '已确认',
        picking: '拣货中',
        picked: '已拣货',
        packing: '打包中',
        shipped: '已发货',
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
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '拣货中', value: 'picking' },
          { label: '已拣货', value: 'picked' },
          { label: '打包中', value: 'packing' },
          { label: '已发货', value: 'shipped' },
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
      fields: ['order_number', 'order_type', 'warehouse_id', 'customer_name'],
    },
    {
      title: '物流信息',
      fields: ['shipping_address', 'expected_date'],
    },
    {
      title: '备注',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增出库单',
  editTitle: '编辑出库单',
  detailTitle: '出库单详情',

  dynamicOptions: [
    {
      field: 'warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((w: { id: string; name: string }) => ({
            value: w.id,
            label: w.name,
          }));
        }
        return [];
      },
      queryKey: ['warehouse-options'],
    },
  ],
};
