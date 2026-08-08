import type { EntitySchema } from '@/schema';

export const returnSchema: EntitySchema = {
  entity: 'return',
  title: '退货/售后管理',

  api: {
    module: 'crm',
    resource: 'returns',
  },

  fields: [
    {
      name: 'return_no',
      label: '退货单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'order_id',
      label: '订单ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'return_type',
      label: '类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'return', label: '退货' },
          { value: 'exchange', label: '换货' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'reason',
      label: '原因',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'reason_detail',
      label: '详细原因',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'received', label: '已收货' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'refund_amount',
      label: '退款金额',
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: '仓库ID',
      type: 'text',
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
      'return_no',
      'customer_id',
      'return_type',
      'reason',
      'status',
      'refund_amount',
      'created_at',
    ],
    searchFields: ['return_no', 'reason'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        received: 'info',
        completed: 'success',
        cancelled: 'default',
      },
      labelMap: {
        pending: '待审核',
        approved: '已审核',
        rejected: '已拒绝',
        received: '已收货',
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
          { label: '全部', value: 'all' },
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已收货', value: 'received' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
      {
        id: 'return_type',
        label: '类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '退货', value: 'return' },
          { label: '换货', value: 'exchange' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['return_no', 'customer_id', 'order_id', 'return_type'],
    },
    {
      title: '退货详情',
      fields: ['reason', 'reason_detail', 'refund_amount'],
    },
    {
      title: '其他',
      fields: ['status', 'warehouse_id'],
    },
  ],

  formColCount: 2,
  createTitle: '创建退货单',
  editTitle: '编辑退货单',
  detailTitle: '退货单详情',
};
