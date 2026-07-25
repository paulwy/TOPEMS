import React from 'react';
import { Download } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import type { RowAction } from '@/components/templates';

const formatCurrency = (amount: number | undefined) => {
  return (
    <span style={{ fontWeight: 600 }}>
      ¥{(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
    </span>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const tenantInvoiceSchema: EntitySchema = {
  entity: 'tenant_invoice',
  title: '账单历史',
  description: '查看租户账单和发票信息',

  api: {
    module: 'tenant',
    resource: 'invoices',
  },

  fields: [
    {
      name: 'id',
      label: '账单编号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'period_start',
      label: '账单周期开始',
      type: 'date',
      readonly: true,
      listWidth: 120,
      hideInForm: true,
      renderCell: (row) => formatDate(row.period_start as string),
    },
    {
      name: 'period_end',
      label: '账单周期结束',
      type: 'date',
      readonly: true,
      listWidth: 120,
      hideInForm: true,
      renderCell: (row) => formatDate(row.period_end as string),
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row) => formatCurrency(row.amount as number),
    },
    {
      name: 'currency',
      label: '币种',
      type: 'text',
      readonly: true,
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'paid', label: '已支付' },
          { value: 'pending', label: '待支付' },
          { value: 'failed', label: '支付失败' },
          { value: 'draft', label: '草稿' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'paid_at',
      label: '支付时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row) => formatDate(row.paid_at as string),
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['id', 'period_start', 'period_end', 'amount', 'status', 'paid_at'],
    searchFields: ['id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        paid: 'success',
        pending: 'warning',
        failed: 'error',
        draft: 'default',
      },
      labelMap: {
        paid: '已支付',
        pending: '待支付',
        failed: '支付失败',
        draft: '草稿',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已支付', value: 'paid' },
          { label: '待支付', value: 'pending' },
          { label: '支付失败', value: 'failed' },
          { label: '草稿', value: 'draft' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '发票详情',
};

export const invoiceRowActions: RowAction[] = [
  {
    label: '下载发票',
    icon: <Download size={16} />,
    onClick: () => {},
  },
];
