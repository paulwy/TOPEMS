import type { EntitySchema } from '@/schema';

export const inboundOrderSchema: EntitySchema = {
  entity: 'wms_inbound_order',
  title: '入库管理',
  description: '管理入库订单信息',

  api: {
    module: 'wms',
    resource: 'inbound-orders',
  },

  fields: [
    {
      name: 'order_number',
      label: '入库单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'order_type',
      label: '入库类型',
      type: 'select',
      required: true,
      defaultValue: 'purchase',
      options: {
        type: 'static',
        options: [
          { value: 'purchase', label: '采购入库' },
          { value: 'return', label: '退货入库' },
          { value: 'transfer', label: '调拨入库' },
          { value: 'production', label: '生产入库' },
          { value: 'other', label: '其他入库' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
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
      name: 'supplier_name',
      label: '供应商',
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
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
          { value: 'receiving', label: '收货中' },
          { value: 'quality_check', label: '质量检验' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
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
      'supplier_name',
      'expected_date',
      'status',
      'total_quantity',
      'total_amount',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        receiving: 'info',
        quality_check: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待确认',
        confirmed: '已确认',
        receiving: '收货中',
        quality_check: '质量检验',
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
          { label: '收货中', value: 'receiving' },
          { label: '质量检验', value: 'quality_check' },
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
      fields: ['order_number', 'order_type', 'warehouse_id', 'supplier_name'],
    },
    {
      title: '日期与备注',
      fields: ['expected_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增入库单',
  editTitle: '编辑入库单',
  detailTitle: '入库单详情',

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
