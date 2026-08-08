import React from 'react';
import type { EntitySchema } from '@/schema';

export const orderSchema: EntitySchema = {
  entity: 'srmOrder',
  title: '采购订单',
  description: '管理采购订单信息，包括订单号、供应商、金额、状态等',

  api: {
    module: 'srm',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'po_no',
      label: '订单编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'total_amount',
      label: '订单金额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600, color: 'grey.800' };
        return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString()}`);
      },
    },
    {
      name: 'currency',
      label: '币种',
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: '人民币 (CNY)' },
          { value: 'USD', label: '美元 (USD)' },
          { value: 'EUR', label: '欧元 (EUR)' },
        ],
      },
      listWidth: 80,
      showInList: false,
      validation: [{ type: 'maxLength', value: 10 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'processing', label: '处理中' },
          { value: 'delivered', label: '已交付' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'order_date',
      label: '下单日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const date = row.order_date as string | undefined;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['po_no', 'supplier_id', 'total_amount', 'status', 'order_date'],
    searchFields: ['po_no', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        processing: 'primary',
        delivered: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: '待处理',
        processing: '处理中',
        delivered: '已交付',
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
          { label: '待处理', value: 'pending' },
          { label: '处理中', value: 'processing' },
          { label: '已交付', value: 'delivered' },
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
      fields: ['po_no', 'supplier_id', 'currency', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['total_amount', 'order_date'],
    },
    {
      title: '备注',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增订单',
  editTitle: '编辑订单',
  detailTitle: '订单详情',
};
