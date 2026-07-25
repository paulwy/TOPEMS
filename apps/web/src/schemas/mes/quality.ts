import type { EntitySchema } from '@/schema';

export const qualitySchema: EntitySchema = {
  entity: 'mes_quality_inspection',
  title: '质量检验',
  description: '管理产品质量检验记录，包括检验单号、产品、检验类型、结果等',

  api: {
    module: 'mes',
    resource: 'quality/inspections',
  },

  fields: [
    {
      name: 'inspection_no',
      label: '检验单号',
      type: 'text',
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'order_number',
      label: '生产订单',
      type: 'text',
      sortable: true,
      listWidth: 130,
    },
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'process_name',
      label: '工序',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'inspection_type',
      label: '检验类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'incoming', label: '来料检验' },
          { value: 'process', label: '过程检验' },
          { value: 'final', label: '成品检验' },
          { value: 'outgoing', label: '出货检验' },
          { value: 'patrol', label: '巡检' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'quantity',
      label: '检验数量',
      type: 'number',
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'qualified_quantity',
      label: '合格数量',
      type: 'number',
      sortable: true,
      listWidth: 90,
    },
    {
      name: 'unqualified_quantity',
      label: '不合格数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'qualification_rate',
      label: '合格率(%)',
      type: 'number',
      sortable: true,
      listWidth: 100,
      renderCell: (value: unknown) => `${(value as number)?.toFixed(2) || 0}%`,
    },
    {
      name: 'inspector',
      label: '检验员',
      type: 'text',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'inspection_time',
      label: '检验时间',
      type: 'datetime',
      listWidth: 160,
      renderCell: (value: unknown) =>
        value ? new Date(value as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待检验' },
          { value: 'inspecting', label: '检验中' },
          { value: 'passed', label: '合格' },
          { value: 'failed', label: '不合格' },
          { value: 'rework', label: '返工' },
          { value: 'scrapped', label: '报废' },
        ],
      },
      listWidth: 90,
    },
    {
      name: 'result',
      label: '检验结果',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'memo',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'inspection_no',
      'order_number',
      'product_code',
      'product_name',
      'process_name',
      'inspection_type',
      'quantity',
      'qualified_quantity',
      'unqualified_quantity',
      'qualification_rate',
      'inspector',
      'inspection_time',
      'status',
    ],
    searchFields: ['inspection_no', 'product_code', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        inspecting: 'info',
        passed: 'success',
        failed: 'error',
        rework: 'warning',
        scrapped: 'default',
      },
      labelMap: {
        pending: '待检验',
        inspecting: '检验中',
        passed: '合格',
        failed: '不合格',
        rework: '返工',
        scrapped: '报废',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待检验', value: 'pending' },
          { label: '检验中', value: 'inspecting' },
          { label: '合格', value: 'passed' },
          { label: '不合格', value: 'failed' },
          { label: '返工', value: 'rework' },
          { label: '报废', value: 'scrapped' },
        ],
      },
      {
        id: 'inspection_type',
        label: '检验类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '来料检验', value: 'incoming' },
          { label: '过程检验', value: 'process' },
          { label: '成品检验', value: 'final' },
          { label: '出货检验', value: 'outgoing' },
          { label: '巡检', value: 'patrol' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '产品与订单信息',
      fields: ['order_number', 'product_code', 'product_name', 'process_name'],
    },
    {
      title: '检验信息',
      fields: ['inspection_type', 'quantity', 'qualified_quantity', 'unqualified_quantity'],
    },
    {
      title: '检验结果',
      fields: ['inspector', 'inspection_time', 'result'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'memo'],
    },
  ],

  formColCount: 2,
  createTitle: '新增质量检验记录',
  editTitle: '编辑质量检验记录',
  detailTitle: '质量检验详情',
};
