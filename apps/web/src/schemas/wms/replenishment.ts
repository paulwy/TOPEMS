import type { EntitySchema } from '@/schema';

export const replenishmentSchema: EntitySchema = {
  entity: 'wms_replenishment_order',
  title: '补货单',
  description: '管理补货订单，包括创建、确认、完成等全生命周期',

  api: {
    module: 'wms',
    resource: 'smartReplenishment',
  },

  fields: [
    {
      name: 'order_number',
      label: '补货单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
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
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      listWidth: 140,
      showInList: true,
    },
    {
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'total_quantity',
      label: '总数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'total_amount',
      label: '总金额',
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
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
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'pending', label: '待确认' },
          { value: 'confirmed', label: '已确认' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'expected_date',
      label: '预计日期',
      type: 'date',
      listWidth: 120,
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
      'warehouse_id',
      'supplier_name',
      'total_quantity',
      'total_amount',
      'priority',
      'status',
      'expected_date',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        confirmed: 'info',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        pending: '待确认',
        confirmed: '已确认',
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
          { label: '草稿', value: 'draft' },
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '进行中', value: 'in_progress' },
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
      fields: ['order_number', 'warehouse_id', 'supplier_id', 'supplier_name'],
    },
    {
      title: '补货信息',
      fields: ['total_quantity', 'total_amount', 'priority', 'expected_date'],
    },
    {
      title: '其他',
      fields: ['remarks'],
    },
  ],

  formColCount: 3,
  createTitle: '创建补货单',
  editTitle: '编辑补货单',
  detailTitle: '补货单详情',

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
