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

export const invoiceSchema: EntitySchema = {
  entity: 'financeInvoice',
  title: '发票管理',

  api: {
    module: 'finance',
    resource: 'invoices',
  },

  fields: [
    {
      name: 'invoice_no',
      label: '发票号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'invoice_type',
      label: '发票类型',
      type: 'select',
      defaultValue: 'electronic',
      options: {
        type: 'static',
        options: [
          { value: 'special', label: '增值税专用发票' },
          { value: 'normal', label: '增值税普通发票' },
          { value: 'electronic', label: '电子发票' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'title',
      label: '抬头',
      type: 'text',
      required: true,
      listWidth: 150,
    },
    {
      name: 'tax_no',
      label: '税号',
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
      renderCell: (row: Record<string, unknown>) => {
        const style: React.CSSProperties = { fontWeight: 600 };
        return React.createElement(
          'span',
          { style },
          `¥${((row.amount as number) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        );
      },
    },
    {
      name: 'tax_rate',
      label: '税率',
      type: 'select',
      defaultValue: '13',
      options: {
        type: 'static',
        options: [
          { value: '0', label: '0%' },
          { value: '3', label: '3%' },
          { value: '6', label: '6%' },
          { value: '9', label: '9%' },
          { value: '13', label: '13%' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'invoice_date',
      label: '开票日期',
      type: 'date',
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
          { value: 'issued', label: '已开具' },
          { value: 'cancelled', label: '已作废' },
          { value: 'red', label: '已红冲' },
        ],
      },
      listWidth: 100,
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
    columns: ['invoice_no', 'invoice_type', 'title', 'amount', 'invoice_date', 'status'],
    searchFields: ['invoice_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        issued: 'primary',
        cancelled: 'error',
        red: 'warning',
      },
      labelMap: {
        draft: '草稿',
        issued: '已开具',
        cancelled: '已作废',
        red: '已红冲',
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: '发票类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '增值税专用发票', value: 'special' },
          { label: '增值税普通发票', value: 'normal' },
          { label: '电子发票', value: 'electronic' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已开具', value: 'issued' },
          { label: '已作废', value: 'cancelled' },
          { label: '已红冲', value: 'red' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['invoice_no', 'invoice_type', 'title', 'tax_no'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'tax_rate', 'invoice_date'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增发票',
  editTitle: '编辑发票',
  detailTitle: '发票详情',
};
