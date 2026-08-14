import React from 'react';
import { CheckCircle, Send } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import type { RowAction } from '@/components/templates';
import i18n from '@/i18n';

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
  title: i18n.t('shared.billing.k0'),
  description: i18n.t('shared.billing.k1'),

  api: {
    module: 'crm',
    resource: 'billing',
  },

  fields: [
    {
      name: 'invoice_no',
      label: i18n.t('shared.billing.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'customer_name',
      label: i18n.t('shared.billing.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'customer_id',
      label: i18n.t('shared.billing.id_4'),
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'amount',
      label: i18n.t('shared.billing.k5'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatCurrency(row.amount as number),
    },
    {
      name: 'currency',
      label: i18n.t('shared.billing.k6'),
      type: 'text',
      defaultValue: 'CNY',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('shared.billing.k7'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('shared.billing.k8') },
          { value: 'paid', label: i18n.t('shared.billing.k9') },
          { value: 'overdue', label: i18n.t('shared.billing.k10') },
          { value: 'cancelled', label: i18n.t('shared.billing.k11') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'due_date',
      label: i18n.t('shared.billing.k12'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatDate(row.due_date as string),
    },
    {
      name: 'paid_at',
      label: i18n.t('shared.billing.k13'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => formatDate(row.paid_at as string),
    },
    {
      name: 'created_at',
      label: i18n.t('shared.billing.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.billing.k15'),
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
        pending: i18n.t('shared.billing.k16'),
        paid: i18n.t('shared.billing.k17'),
        overdue: i18n.t('shared.billing.k18'),
        cancelled: i18n.t('shared.billing.k19'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('shared.billing.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.billing.k21'), value: 'all' },
          { label: i18n.t('shared.billing.k22'), value: 'pending' },
          { label: i18n.t('shared.billing.k23'), value: 'paid' },
          { label: i18n.t('shared.billing.k24'), value: 'overdue' },
          { label: i18n.t('shared.billing.k25'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.billing.k26'),
      fields: ['invoice_no', 'customer_id', 'customer_name', 'amount', 'currency'],
    },
    {
      title: i18n.t('shared.billing.k27'),
      fields: ['status', 'due_date', 'paid_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.billing.k28'),
  editTitle: i18n.t('shared.billing.k29'),
  detailTitle: i18n.t('shared.billing.k30'),
};

export const getBillingRowActions = (
  handleMarkPaid: (id: string) => void,
  handleSendNotification: (id: string) => void,
  activeTab: string
): RowAction[] => {
  if (activeTab === 'invoices') {
    return [
      {
        label: i18n.t('shared.billing.k31'),
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleMarkPaid(String(row.id)),
      },
      {
        label: i18n.t('shared.billing.k32'),
        icon: <Send size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => handleSendNotification(String(row.id)),
      },
    ];
  }
  return [];
};
