import React from 'react';
import { CheckCircle, Send } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import type { RowAction } from '@/components/templates';

const formatCurrency = (amount: number | undefined) => {
  return (
    <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>
      ¥{(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
    </span>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const billingSchema: EntitySchema = {
  entity: 'crm_billing',
  title: '账单管理',
  description: '管理客户账单、收款和账龄分析',

  api: {
    module: 'crm',
    resource: 'billing',
  },

  fields: [
    {
      name: 'invoice_no',
      label: '发票号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'customer_name',
      label: '客户',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'amount',
      label: '金额',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatCurrency(row.amount as number),
    },
    {
      name: 'currency',
      label: '币种',
      type: 'text',
      defaultValue: 'CNY',
      listWidth: 80,
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
          { value: 'pending', label: '待支付' },
          { value: 'paid', label: '已支付' },
          { value: 'overdue', label: '已逾期' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'due_date',
      label: '到期日',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatDate(row.due_date as string),
    },
    {
      name: 'paid_at',
      label: '支付日期',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatDate(row.paid_at as string),
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
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['invoice_no', 'customer_name', 'amount', 'status', 'due_date', 'paid_at'],
    searchFields: ['invoice_no', 'customer_name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        paid: 'success',
        overdue: 'error',
        cancelled: 'default',
      },
      labelMap: {
        pending: '待支付',
        paid: '已支付',
        overdue: '已逾期',
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
          { label: '待支付', value: 'pending' },
          { label: '已支付', value: 'paid' },
          { label: '已逾期', value: 'overdue' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['invoice_no', 'customer_id', 'customer_name', 'amount', 'currency'],
    },
    {
      title: '账单信息',
      fields: ['status', 'due_date', 'paid_at'],
    },
  ],

  formColCount: 2,
  createTitle: '新建账单',
  editTitle: '编辑账单',
  detailTitle: '账单详情',
};

export const getBillingRowActions = (
  handleMarkPaid: (id: string) => void,
  handleSendNotification: (id: string) => void,
  activeTab: string
): RowAction[] => {
  if (activeTab === 'invoices') {
    return [
      {
        label: '标记支付',
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleMarkPaid(String(row.id)),
      },
      {
        label: '发送通知',
        icon: <Send size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => handleSendNotification(String(row.id)),
      },
    ];
  }
  return [];
};
