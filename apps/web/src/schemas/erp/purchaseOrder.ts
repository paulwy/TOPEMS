import React from 'react';
import type { EntitySchema } from '@/schema';

export const purchaseOrderSchema: EntitySchema = {
  entity: 'purchaseOrder',
  title: '采购订单管理',
  description: '管理采购订单信息，包括订单号、供应商、金额、状态等',

  api: {
    module: 'erp',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: '订单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'total_amount',
      label: '订单金额',
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        return amount ? `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'order_date',
      label: '订单日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'expected_date',
      label: '预计到货',
      type: 'date',
      listWidth: 120,
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
      listWidth: 100,
      showInList: false,
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
          { value: 'partially_received', label: '部分收货' },
          { value: 'received', label: '已收货' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'remark',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['order_number', 'supplier_name', 'total_amount', 'order_date', 'status'],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'primary',
        partially_received: 'info',
        received: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审批',
        approved: '已审批',
        partially_received: '部分收货',
        received: '已收货',
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
          { label: '部分收货', value: 'partially_received' },
          { label: '已收货', value: 'received' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['order_number', 'supplier_name', 'currency', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['total_amount', 'order_date', 'expected_date'],
    },
    {
      title: '备注',
      fields: ['remark'],
    },
  ],

  formColCount: 2,
  createTitle: '新增采购订单',
  editTitle: '编辑采购订单',
  detailTitle: '采购订单详情',
};
