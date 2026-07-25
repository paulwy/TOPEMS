/**
 * 入库订单 Schema — 驱动 InboundOrderPage 的完整 CRUD
 *
 * 一个文件定义列表列、表单字段、筛选、状态徽章，
 * 不再需要在页面组件中重复定义。
 */

import type { EntitySchema } from '@/schema';

export const inboundOrderSchema: EntitySchema = {
  entity: 'inbound_order',
  title: '入库订单',
  description: '管理采购入库、退货入库、调拨入库等入库订单',

  api: {
    module: 'wms',
    resource: 'inboundOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: '订单编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'order_type',
      label: '订单类型',
      type: 'select',
      defaultValue: 'purchase_in',
      options: {
        type: 'static',
        options: [
          { value: 'purchase_in', label: '采购入库' },
          { value: 'return_in', label: '退货入库' },
          { value: 'transfer_in', label: '调拨入库' },
          { value: 'other_in', label: '其他入库' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const map: Record<string, string> = {
          purchase_in: '采购入库',
          return_in: '退货入库',
          transfer_in: '调拨入库',
          other_in: '其他入库',
        };
        return map[row.order_type as string] || String(row.order_type || '-');
      },
    },
    {
      name: 'warehouse_id',
      label: '仓库',
      type: 'text',
    },
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'supplier_name',
      label: '供应商',
      type: 'text',
    },
    {
      name: 'expected_date',
      label: '预计到货日期',
      type: 'date',
      renderCell: (row: Record<string, unknown>) =>
        row.expected_date ? new Date(row.expected_date as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'total_amount',
      label: '总金额',
      type: 'number',
      showInDetail: true,
      readonly: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待确认' },
          { value: 'confirmed', label: '已确认' },
          { value: 'receiving', label: '收货中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
    },
  ],

  list: {
    columns: [
      'order_number',
      'order_type',
      'warehouse_id',
      'supplier_name',
      'expected_date',
      'total_amount',
      'status',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        receiving: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待确认',
        confirmed: '已确认',
        receiving: '收货中',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: '新增入库订单',
  editTitle: '编辑入库订单',
  detailTitle: '入库订单详情',
};
