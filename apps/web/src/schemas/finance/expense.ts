import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const formatMoney = (amount: number | undefined, color?: string) => {
  const style: React.CSSProperties = { fontWeight: 'medium' };
  if (color) (style as Record<string, string>).color = color;
  return React.createElement(
    'span',
    { style },
    `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  );
};

export const expenseSchema: EntitySchema = {
  entity: 'financeExpense',
  title: i18n.t('finance.expense.k0'),

  api: {
    module: 'finance',
    resource: 'expenses',
  },

  fields: [
    {
      name: 'expense_no',
      label: i18n.t('finance.expense.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'expense_type',
      label: i18n.t('finance.expense.k2'),
      type: 'select',
      defaultValue: 'travel',
      options: {
        type: 'static',
        options: [
          { value: 'travel', label: i18n.t('finance.expense.k3') },
          { value: 'office', label: i18n.t('finance.expense.k4') },
          { value: 'meal', label: i18n.t('finance.expense.k5') },
          { value: 'communication', label: i18n.t('finance.expense.k6') },
          { value: 'other', label: i18n.t('finance.expense.k7') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'department_id',
      label: i18n.t('finance.expense.id_8'),
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'department_name',
      label: i18n.t('finance.expense.k9'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'amount',
      label: i18n.t('finance.expense.k10'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => formatMoney(row.amount as number),
    },
    {
      name: 'submit_date',
      label: i18n.t('finance.expense.k11'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('finance.expense.k12'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('finance.expense.k13') },
          { value: 'submitted', label: i18n.t('finance.expense.k14') },
          { value: 'approved', label: i18n.t('finance.expense.k15') },
          { value: 'rejected', label: i18n.t('finance.expense.k16') },
          { value: 'paid', label: i18n.t('finance.expense.k17') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'payee',
      label: i18n.t('finance.expense.k18'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('finance.expense.k19'),
      type: 'textarea',
      listWidth: 150,
      showInList: false,
    },
  ],

  list: {
    columns: ['expense_no', 'expense_type', 'department_name', 'amount', 'submit_date', 'status'],
    searchFields: ['expense_no', 'expense_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        submitted: 'info',
        approved: 'success',
        rejected: 'error',
        paid: 'primary',
      },
      labelMap: {
        draft: i18n.t('finance.expense.k20'),
        submitted: i18n.t('finance.expense.k21'),
        approved: i18n.t('finance.expense.k22'),
        rejected: i18n.t('finance.expense.k23'),
        paid: i18n.t('finance.expense.k24'),
      },
    },
    filters: [
      {
        id: 'expense_type',
        label: i18n.t('finance.expense.k25'),
        type: 'select',
        options: [
          { label: i18n.t('finance.expense.k26'), value: 'all' },
          { label: i18n.t('finance.expense.k27'), value: 'travel' },
          { label: i18n.t('finance.expense.k28'), value: 'office' },
          { label: i18n.t('finance.expense.k29'), value: 'meal' },
          { label: i18n.t('finance.expense.k30'), value: 'communication' },
          { label: i18n.t('finance.expense.k31'), value: 'other' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('finance.expense.k32'),
        type: 'select',
        options: [
          { label: i18n.t('finance.expense.k33'), value: 'all' },
          { label: i18n.t('finance.expense.k34'), value: 'draft' },
          { label: i18n.t('finance.expense.k35'), value: 'submitted' },
          { label: i18n.t('finance.expense.k36'), value: 'approved' },
          { label: i18n.t('finance.expense.k37'), value: 'rejected' },
          { label: i18n.t('finance.expense.k38'), value: 'paid' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.expense.k39'),
      fields: ['expense_no', 'expense_type', 'department_id'],
    },
    {
      title: i18n.t('finance.expense.k40'),
      fields: ['amount', 'submit_date', 'payee'],
    },
    {
      title: i18n.t('finance.expense.k41'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.expense.k42'),
  editTitle: i18n.t('finance.expense.k43'),
  detailTitle: i18n.t('finance.expense.k44'),
};
