import type { EntitySchema } from '@/schema';

export const reagentSchema: EntitySchema = {
  entity: 'reagent',
  title: '试剂管理',
  description: '管理实验室试剂库存，包括试剂编号、名称、类别、供应商、库存等',

  api: {
    module: 'lims',
    resource: 'reagents',
  },

  fields: [
    {
      name: 'code',
      label: '试剂编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '试剂名称',
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      defaultValue: '',
      options: {
        type: 'static',
        options: [
          { value: '', label: '请选择类别' },
          { value: '标准品', label: '标准品' },
          { value: '试剂', label: '试剂' },
          { value: '耗材', label: '耗材' },
          { value: '其他', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      showInList: false,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'quantity',
      label: '库存数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'min_stock',
      label: '最低库存',
      type: 'number',
      showInList: false,
    },
    {
      name: 'batch_no',
      label: '批号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'received_date',
      label: '生产日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'expiry_date',
      label: '有效期至',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'storage_condition',
      label: '储存条件',
      type: 'text',
      showInList: false,
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: '正常',
      options: {
        type: 'static',
        options: [
          { value: '正常', label: '正常' },
          { value: '低库存', label: '低库存' },
          { value: '过期', label: '过期' },
          { value: '停用', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'category',
      'supplier',
      'quantity',
      'expiry_date',
      'status',
      'location',
    ],
    searchFields: ['code', 'name', 'supplier'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        正常: 'success',
        低库存: 'warning',
        过期: 'error',
        停用: 'default',
      },
      labelMap: {
        正常: '正常',
        低库存: '低库存',
        过期: '过期',
        停用: '停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '正常', value: '正常' },
          { label: '低库存', value: '低库存' },
          { label: '过期', value: '过期' },
          { label: '停用', value: '停用' },
        ],
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '标准品', value: '标准品' },
          { label: '试剂', value: '试剂' },
          { label: '耗材', value: '耗材' },
          { label: '其他', value: '其他' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'supplier'],
    },
    {
      title: '规格与库存',
      fields: ['specification', 'unit', 'quantity', 'min_stock'],
    },
    {
      title: '批次与储存',
      fields: ['batch_no', 'received_date', 'expiry_date', 'storage_condition', 'location'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '添加试剂',
  editTitle: '编辑试剂',
  detailTitle: '试剂详情',
};
