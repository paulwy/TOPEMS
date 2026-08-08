/**
 * 出库订单 Schema
 */

import type { EntitySchema } from '@/schema';

export const outboundOrderSchema: EntitySchema = {
  entity: 'outbound_order',
  title: '出库订单',
  description: '管理销售出库、调拨出库、退货出库等出库订单',

  api: {
    module: 'wms',
    resource: 'outboundOrders',
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
      name: 'warehouse_id',
      label: '仓库',
      type: 'text',
    },
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'customer_name',
      label: '客户名称',
      type: 'text',
    },
    {
      name: 'order_date',
      label: '订单日期',
      type: 'date',
      required: true,
      renderCell: (row: Record<string, unknown>) =>
        row.order_date ? new Date(row.order_date as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'expected_delivery',
      label: '预计到货日期',
      type: 'date',
      renderCell: (row: Record<string, unknown>) =>
        row.expected_delivery
          ? new Date(row.expected_delivery as string).toLocaleDateString('zh-CN')
          : '-',
    },
    {
      name: 'total_amount',
      label: '总金额',
      type: 'number',
    },
    {
      name: 'status',
      label: '状态',
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, string> = {
          pending: '待处理',
          confirmed: '已确认',
          picking: '拣货中',
          packing: '包装中',
          shipped: '已发货',
          completed: '已完成',
          cancelled: '已取消',
        };
        return statusMap[row.status as string] || String(row.status || '-');
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'warehouse_id',
      'customer_name',
      'order_date',
      'expected_delivery',
      'total_amount',
      'status',
    ],
    searchFields: ['order_number', 'customer_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: '新增出库订单',
  editTitle: '编辑出库订单',
  detailTitle: '出库订单详情',
};
