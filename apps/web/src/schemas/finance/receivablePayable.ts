import React from 'react';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions, NestedTableConfig } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';

const formatMoney = (amount: number | undefined) => {
  const style: React.CSSProperties = { fontWeight: 'medium' };
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

const paymentDetailFields = [
  {
    name: 'date',
    label: '收付款日期',
    type: 'date' as const,
    required: true,
    listWidth: 120,
  },
  {
    name: 'amount',
    label: '金额',
    type: 'number' as const,
    required: true,
    defaultValue: 0,
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
  },
  {
    name: 'method',
    label: '收付款方式',
    type: 'select' as const,
    defaultValue: 'bank_transfer',
    options: {
      type: 'static' as const,
      options: [
        { value: 'bank_transfer', label: '银行转账' },
        { value: 'cash', label: '现金' },
        { value: 'check', label: '支票' },
        { value: 'online', label: '在线支付' },
      ],
    },
    listWidth: 120,
  },
  {
    name: 'reference_no',
    label: '关联单号',
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'remark',
    label: '备注',
    type: 'textarea' as const,
    listWidth: 150,
    showInList: false,
  },
];

const paymentDetailTable: NestedTableConfig = {
  field: 'payment_details',
  title: '收付款明细',
  columns: columnsFromFields(paymentDetailFields),
  fields: paymentDetailFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  addButtonText: '新增收付款明细',
  rowKeyField: 'id',
  formColCount: 2,
};

export const receivableSchema: EntitySchema & SchemaExtensions = {
  entity: 'financeReceivable',
  title: '应收单',

  api: {
    module: 'finance',
    resource: 'receivables',
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
      name: 'customer_name',
      label: '客户名称',
      type: 'text',
      required: true,
      listWidth: 160,
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
      name: 'tax_amount',
      label: '税额',
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.tax_amount as number),
    },
    {
      name: 'invoice_date',
      label: '开票日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'due_date',
      label: '到期日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'invoice_type',
      label: '发票类型',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: '普通发票' },
          { value: 'special', label: '增值税专用发票' },
        ],
      },
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
          { value: 'approved', label: '已审核' },
          { value: 'posted', label: '已过账' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'invoice_no',
      'customer_name',
      'amount',
      'tax_amount',
      'invoice_date',
      'due_date',
      'invoice_type',
      'status',
    ],
    searchFields: ['invoice_no', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        approved: 'info',
        posted: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        approved: '已审核',
        posted: '已过账',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: '发票类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '普通发票', value: 'normal' },
          { label: '增值税专用发票', value: 'special' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已审核', value: 'approved' },
          { label: '已过账', value: 'posted' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['invoice_no', 'customer_name', 'invoice_type'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'tax_amount', 'invoice_date', 'due_date'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增应收单',
  editTitle: '编辑应收单',
  detailTitle: '应收单详情',

  nestedTables: [paymentDetailTable],
};

export const payableSchema: EntitySchema & SchemaExtensions = {
  entity: 'financePayable',
  title: '应付单',

  api: {
    module: 'finance',
    resource: 'payables',
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
      name: 'supplier_name',
      label: '供应商名称',
      type: 'text',
      required: true,
      listWidth: 160,
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
      name: 'tax_amount',
      label: '税额',
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.tax_amount as number),
    },
    {
      name: 'invoice_date',
      label: '开票日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'due_date',
      label: '到期日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'invoice_type',
      label: '发票类型',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: '普通发票' },
          { value: 'special', label: '增值税专用发票' },
        ],
      },
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
          { value: 'approved', label: '已审核' },
          { value: 'posted', label: '已过账' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'invoice_no',
      'supplier_name',
      'amount',
      'tax_amount',
      'invoice_date',
      'due_date',
      'invoice_type',
      'status',
    ],
    searchFields: ['invoice_no', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        approved: 'info',
        posted: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        approved: '已审核',
        posted: '已过账',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'invoice_type',
        label: '发票类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '普通发票', value: 'normal' },
          { label: '增值税专用发票', value: 'special' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已审核', value: 'approved' },
          { label: '已过账', value: 'posted' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['invoice_no', 'supplier_name', 'invoice_type'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'tax_amount', 'invoice_date', 'due_date'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增应付单',
  editTitle: '编辑应付单',
  detailTitle: '应付单详情',

  nestedTables: [paymentDetailTable],
};
