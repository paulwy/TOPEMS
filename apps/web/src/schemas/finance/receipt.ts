import React from 'react';
import type { EntitySchema } from '@/schema';

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 'medium' };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

export const receiptSchema: EntitySchema = {
  entity: 'financeReceipt',
  title: '收款管理',

  api: {
    module: 'finance',
    resource: 'receipts',
  },

  fields: [
    {
      name: 'receipt_no',
      label: '收款单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'receipt_type',
      label: '收款方式',
      type: 'select',
      defaultValue: 'bank_transfer',
      options: {
        type: 'static',
        options: [
          { value: 'bank_transfer', label: '银行转账' },
          { value: 'cash', label: '现金' },
          { value: 'check', label: '支票' },
          { value: 'online', label: '在线支付' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'payer_id',
      label: '付款方ID',
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'payer_name',
      label: '付款方',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
    },
    {
      name: 'receipt_date',
      label: '收款日期',
      type: 'date',
      listWidth: 120,
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
          { value: 'completed', label: '已完成' },
          { value: 'failed', label: '失败' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'bank_account',
      label: '银行账户',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 150,
      showInList: false,
    },
  ],

  list: {
    columns: ['receipt_no', 'receipt_type', 'payer_name', 'amount', 'receipt_date', 'status'],
    searchFields: ['receipt_no', 'payer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        failed: 'error',
        cancelled: 'default',
      },
      labelMap: {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'receipt_type',
        label: '收款方式',
        type: 'select',
        options: [
          { label: '全部方式', value: 'all' },
          { label: '银行转账', value: 'bank_transfer' },
          { label: '现金', value: 'cash' },
          { label: '支票', value: 'check' },
          { label: '在线支付', value: 'online' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '处理中', value: 'processing' },
          { label: '已完成', value: 'completed' },
          { label: '失败', value: 'failed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['receipt_no', 'receipt_type', 'payer_id'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'receipt_date', 'bank_account'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增收款',
  editTitle: '编辑收款',
  detailTitle: '收款详情',
};
