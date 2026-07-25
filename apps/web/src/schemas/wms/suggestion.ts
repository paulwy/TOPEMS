import type { EntitySchema } from '@/schema';

export const suggestionSchema: EntitySchema = {
  entity: 'wms_replenishment_suggestion',
  title: '补货建议',
  description: '智能补货建议列表，基于库存和销量自动生成',

  api: {
    module: 'wms',
    resource: 'smartReplenishment',
  },

  fields: [
    {
      name: 'suggestion_number',
      label: '建议编号',
      type: 'text',
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'sku',
      label: '物料编码',
      type: 'text',
      listWidth: 130,
    },
    {
      name: 'material_name',
      label: '物料名称',
      type: 'text',
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'warehouse_id',
      label: '仓库',
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.warehouse_name as string) || (row.warehouse_id as string) || '-';
      },
    },
    {
      name: 'current_quantity',
      label: '当前库存',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'available_quantity',
      label: '可用库存',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'safety_stock',
      label: '安全库存',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'suggested_quantity',
      label: '建议补货量',
      type: 'number',
      listWidth: 110,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const qty = row.suggested_quantity as number;
        const unit = (row.unit as string) || '';
        return `${qty} ${unit}`;
      },
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      listWidth: 100,
      hideInForm: true,
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
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'approved', label: '已批准' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'converted', label: '已转单' },
        ],
      },
    },
    {
      name: 'supplier_name',
      label: '供应商',
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
      renderCell: (value: unknown) => {
        const price = value as number;
        return price ? `¥${price}` : '-';
      },
    },
    {
      name: 'total_cost',
      label: '预计总成本',
      type: 'number',
      listWidth: 120,
      hideInForm: true,
      renderCell: (value: unknown) => {
        const cost = value as number;
        return cost ? `¥${cost}` : '-';
      },
    },
    {
      name: 'generated_at',
      label: '生成时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 150,
    },
  ],

  list: {
    columns: [
      'suggestion_number',
      'sku',
      'material_name',
      'warehouse_id',
      'current_quantity',
      'suggested_quantity',
      'priority',
      'status',
    ],
    searchFields: ['suggestion_number', 'sku', 'material_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'info',
        rejected: 'error',
        converted: 'success',
      },
      labelMap: {
        pending: '待处理',
        approved: '已批准',
        rejected: '已拒绝',
        converted: '已转单',
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
          { label: '已批准', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已转单', value: 'converted' },
        ],
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        type: 'select',
        options: [{ label: '全部仓库', value: 'all' }],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '紧急', value: 'urgent' },
          { label: '高', value: 'high' },
          { label: '普通', value: 'normal' },
          { label: '低', value: 'low' },
        ],
      },
    ],
  },

  actions: ['detail'],

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
