import type { EntitySchema } from '@/schema';

export const stockTakeSchema: EntitySchema = {
  entity: 'wms_stock_take',
  title: '盘点单',
  description: '管理库存盘点单，支持创建、盘点、调整等全流程操作',

  api: {
    module: 'wms',
    resource: 'stockTakes',
  },

  fields: [
    {
      name: 'stock_take_number',
      label: '盘点单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
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
      name: 'warehouse_name',
      label: '仓库名称',
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planned',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: '已计划' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
        ],
      },
    },
    {
      name: 'accuracy_rate',
      label: '准确率',
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
      renderCell: (value: any) => (value ? `${value.toFixed(1)}%` : '-'),
    },
    {
      name: 'discrepancy_quantity',
      label: '差异数量',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'stock_adjusted',
      label: '库存已调整',
      type: 'switch',
      listWidth: 100,
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
  ],

  list: {
    columns: [
      'stock_take_number',
      'warehouse_name',
      'status',
      'accuracy_rate',
      'discrepancy_quantity',
      'created_at',
    ],
    searchFields: ['stock_take_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'warning',
        in_progress: 'default',
        completed: 'success',
      },
      labelMap: {
        planned: '已计划',
        in_progress: '进行中',
        completed: '已完成',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已计划', value: 'planned' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['stock_take_number', 'warehouse_id', 'remarks'],
    },
  ],

  formColCount: 1,
  createTitle: '创建盘点单',
  detailTitle: '盘点单详情',

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
