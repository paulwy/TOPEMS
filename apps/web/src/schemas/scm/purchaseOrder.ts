import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';

const itemFields = [
  {
    name: 'line_no',
    label: '行号',
    type: 'number' as const,
    listWidth: 80,
  },
  {
    name: 'material_code',
    label: '物料编码',
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'material_name',
    label: '物料名称',
    type: 'text' as const,
    listWidth: 160,
  },
  {
    name: 'qty',
    label: '数量',
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'unit',
    label: '单位',
    type: 'text' as const,
    listWidth: 80,
  },
  {
    name: 'price',
    label: '单价',
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'amount',
    label: '金额',
    type: 'number' as const,
    listWidth: 120,
  },
];

export const purchaseOrderSchema: EntitySchema & SchemaExtensions = {
  entity: 'purchaseOrder',
  title: '采购订单',
  description: '管理采购订单，包括订单基本信息、物料明细、审批流程等',

  api: {
    module: 'scm',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'orderNo',
      label: '订单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'total_amount',
      label: '金额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已审批' },
          { value: 'confirmed', label: '已确认' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'order_date',
      label: '下单日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'expected_date',
      label: '预计到货',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'orderNo',
      'supplier_id',
      'title',
      'total_amount',
      'status',
      'order_date',
      'expected_date',
    ],
    searchFields: ['orderNo', 'title', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'primary',
        confirmed: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审批',
        approved: '已审批',
        confirmed: '已确认',
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
          { label: '待审批', value: 'pending' },
          { label: '已审批', value: 'approved' },
          { label: '已确认', value: 'confirmed' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['orderNo', 'supplier_id', 'title', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['total_amount', 'order_date', 'expected_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增采购订单',
  editTitle: '编辑采购订单',
  detailTitle: '采购订单详情',

  nestedTables: [
    {
      field: 'items',
      title: '物料明细',
      columns: columnsFromFields(itemFields),
      fields: itemFields,
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowDuplicate: true,
      addButtonText: '新增物料',
      rowKeyField: 'line_no',
      minRows: 1,
      formColCount: 2,
    },
  ],

  wizard: {
    steps: [
      {
        key: 'basic',
        title: '基本信息',
        description: '填写订单基本信息',
        fields: ['orderNo', 'supplier_id', 'title', 'order_date', 'expected_date', 'status'],
      },
      {
        key: 'items',
        title: '物料明细',
        description: '添加订单物料明细',
        fields: ['items'],
      },
      {
        key: 'confirm',
        title: '确认提交',
        description: '确认订单信息并提交',
        fields: ['total_amount'],
        isFinalStep: true,
      },
    ],
    title: '创建采购订单',
    showProgress: true,
    showSummaryOnComplete: true,
    finishButtonText: '提交订单',
    nextButtonText: '下一步',
    prevButtonText: '上一步',
  },
};
