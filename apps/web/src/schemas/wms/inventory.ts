import type { EntitySchema } from '@/schema';

export const inventorySchema: EntitySchema = {
  entity: 'wms_inventory',
  title: '库存管理',
  description: '管理仓库库存物品信息',

  api: {
    module: 'wms',
    resource: 'inventory',
  },

  fields: [
    {
      name: 'sku',
      label: '物料编码',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      required: true,
      listWidth: 80,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: '可用数量',
      type: 'number',
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
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'qualified',
      options: {
        type: 'static',
        options: [
          { value: 'qualified', label: '合格' },
          { value: 'unqualified', label: '不合格' },
          { value: 'pending', label: '待检' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'batch_number',
      label: '批次号',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'min_quantity',
      label: '最低库存',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'max_quantity',
      label: '最高库存',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'expiry_date',
      label: '有效期',
      type: 'date',
      listWidth: 120,
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
      'sku',
      'name',
      'specification',
      'unit',
      'quantity',
      'available_quantity',
      'warehouse_id',
      'status',
      'batch_number',
    ],
    searchFields: ['sku', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        qualified: 'success',
        unqualified: 'error',
        pending: 'warning',
      },
      labelMap: {
        qualified: '合格',
        unqualified: '不合格',
        pending: '待检',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '合格', value: 'qualified' },
          { label: '不合格', value: 'unqualified' },
          { label: '待检', value: 'pending' },
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
      fields: ['sku', 'name', 'specification', 'unit'],
    },
    {
      title: '库存信息',
      fields: ['warehouse_id', 'quantity', 'min_quantity', 'max_quantity', 'status'],
    },
    {
      title: '其他信息',
      fields: ['batch_number', 'expiry_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增库存',
  editTitle: '编辑库存',
  detailTitle: '库存详情',

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
