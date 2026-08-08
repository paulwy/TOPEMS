import type { EntitySchema } from '@/schema';

export const materialSchema: EntitySchema = {
  entity: 'pdm_material',
  title: '物料管理',
  description: '管理物料基础信息，包括编码、名称、规格、分类等',

  api: {
    module: 'pdm',
    resource: 'materials',
  },

  fields: [
    {
      name: 'code',
      label: '物料编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: '原材料' },
          { value: 'auxiliary', label: '辅助材料' },
          { value: 'packaging', label: '包装材料' },
          { value: 'finished_goods', label: '成品' },
          { value: 'semi_finished', label: '半成品' },
          { value: 'spare_parts', label: '备品备件' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      defaultValue: 'kg',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '未激活' },
          { value: 'low_stock', label: '库存不足' },
          { value: 'out_of_stock', label: '缺货' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'inventory_quantity',
      label: '库存',
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      align: 'right',
    },
    {
      name: 'safety_stock',
      label: '安全库存',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'category',
      'specification',
      'unit',
      'unit_price',
      'inventory_quantity',
      'safety_stock',
      'status',
    ],
    searchFields: ['code', 'name', 'supplier'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        low_stock: 'warning',
        out_of_stock: 'error',
      },
      labelMap: {
        active: '活跃',
        inactive: '未激活',
        low_stock: '库存不足',
        out_of_stock: '缺货',
      },
    },
    filters: [
      {
        id: 'category',
        label: '物料分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '原材料', value: 'raw_material' },
          { label: '辅助材料', value: 'auxiliary' },
          { label: '包装材料', value: 'packaging' },
          { label: '成品', value: 'finished_goods' },
          { label: '半成品', value: 'semi_finished' },
          { label: '备品备件', value: 'spare_parts' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '未激活', value: 'inactive' },
          { label: '库存不足', value: 'low_stock' },
          { label: '缺货', value: 'out_of_stock' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'specification', 'unit', 'unit_price'],
    },
    {
      title: '库存信息',
      fields: ['inventory_quantity', 'safety_stock', 'supplier', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '添加物料',
  editTitle: '编辑物料',
  detailTitle: '物料详情',
};
