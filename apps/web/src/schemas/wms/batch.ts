import type { EntitySchema } from '@/schema';

export const batchSchema: EntitySchema = {
  entity: 'wms_batch',
  title: '批次管理',
  description: '管理仓库物料批次信息',

  api: {
    module: 'wms',
    resource: 'batches',
  },

  fields: [
    {
      name: 'batch_no',
      label: '批次号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'sku',
      label: '物料编码',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'material_name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 500 }],
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
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 50 }],
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
      sortable: true,
      listWidth: 100,
      hideInForm: true,
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
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'location_id',
      label: '库位',
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'location',
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'supplier',
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'production_date',
      label: '生产日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'expiry_date',
      label: '有效期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'receipt_date',
      label: '收货日期',
      type: 'date',
      listWidth: 120,
      readonlyOnEdit: true,
    },
    {
      name: 'quality_status',
      label: '质检状态',
      type: 'select',
      required: true,
      defaultValue: 'qualified',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待检' },
          { value: 'inspecting', label: '检验中' },
          { value: 'qualified', label: '合格' },
          { value: 'unqualified', label: '不合格' },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: '库存状态',
      type: 'select',
      defaultValue: 'in_stock',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'in_stock', label: '在库' },
          { value: 'out_stock', label: '出库' },
          { value: 'reserved', label: '预留' },
          { value: 'frozen', label: '冻结' },
          { value: 'scrapped', label: '报废' },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'shelf_life_days',
      label: '保质期(天)',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_value',
      label: '总金额',
      type: 'number',
      listWidth: 120,
      hideInForm: true,
    },
    {
      name: 'remaining_days',
      label: '剩余天数',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'remark',
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
      'batch_no',
      'sku',
      'material_name',
      'specification',
      'unit',
      'quantity',
      'available_quantity',
      'warehouse_id',
      'location_id',
      'supplier_id',
      'quality_status',
      'status',
      'expiry_date',
      'remaining_days',
    ],
    searchFields: ['batch_no', 'sku', 'material_name'],
    pageSize: 10,
    statusBadge: {
      field: 'quality_status',
      colorMap: {
        pending: 'warning',
        inspecting: 'primary',
        qualified: 'success',
        unqualified: 'error',
      },
      labelMap: {
        pending: '待检',
        inspecting: '检验中',
        qualified: '合格',
        unqualified: '不合格',
      },
    },
    filters: [
      {
        id: 'quality_status',
        label: '质检状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待检', value: 'pending' },
          { label: '检验中', value: 'inspecting' },
          { label: '合格', value: 'qualified' },
          { label: '不合格', value: 'unqualified' },
        ],
      },
      {
        id: 'status',
        label: '库存状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '在库', value: 'in_stock' },
          { label: '出库', value: 'out_stock' },
          { label: '预留', value: 'reserved' },
          { label: '冻结', value: 'frozen' },
          { label: '报废', value: 'scrapped' },
        ],
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        type: 'select',
        options: [{ label: '全部仓库', value: 'all' }],
      },
      {
        id: 'expiry_warning',
        label: '保质期预警',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '即将到期', value: 'true' },
          { label: '已过期', value: 'expired' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['batch_no', 'sku', 'material_name', 'specification', 'unit'],
    },
    {
      title: '库存信息',
      fields: ['warehouse_id', 'location_id', 'supplier_id', 'quantity', 'quality_status'],
    },
    {
      title: '日期信息',
      fields: ['production_date', 'expiry_date', 'receipt_date', 'shelf_life_days'],
    },
    {
      title: '财务信息',
      fields: ['unit_price'],
    },
    {
      title: '其他',
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: '新增批次',
  editTitle: '编辑批次',
  detailTitle: '批次详情',

  dynamicOptions: [
    {
      field: 'warehouse_id',
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
      queryKey: ['warehouse-options'],
    },
    {
      field: 'location_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.locations.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((l) => ({
            value: l.id,
            label: l.code || l.name || l.id,
          }));
        }
        return [];
      },
      queryKey: ['location-options'],
    },
    {
      field: 'supplier_id',
      loader: async () => {
        return [];
      },
      queryKey: ['supplier-options'],
    },
  ],
};
