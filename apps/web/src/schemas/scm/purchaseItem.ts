import type { EntitySchema } from '@/schema';

export const purchaseItemSchema: EntitySchema = {
  entity: 'purchaseItem',
  title: '采购明细管理',
  description: '管理采购订单明细，包括产品编码、名称、规格、数量等',

  api: {
    module: 'scm',
    resource: 'purchaseItems',
  },

  fields: [
    {
      name: 'order_id',
      label: '订单ID',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: '产品名称',
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
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      defaultValue: 0,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      defaultValue: 0,
      align: 'right',
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'order_id',
      'product_code',
      'product_name',
      'specification',
      'unit',
      'quantity',
      'unit_price',
      'amount',
    ],
    searchFields: ['order_id', 'product_code', 'product_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['order_id', 'product_code', 'product_name', 'specification'],
    },
    {
      title: '数量与金额',
      fields: ['unit', 'quantity', 'unit_price', 'amount'],
    },
  ],

  formColCount: 2,
  createTitle: '新增采购明细',
  editTitle: '编辑采购明细',
  detailTitle: '采购明细详情',
};
