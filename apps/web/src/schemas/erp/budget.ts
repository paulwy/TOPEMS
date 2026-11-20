import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

const budgetStatusColorMap: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  active: 'success',
  completed: 'default',
  exceeded: 'error',
  pending: 'warning',
  cancelled: 'default',
};

const budgetStatusLabelMap: Record<string, string> = {
  active: i18n.t('shared.budget.k0'),
  completed: i18n.t('shared.budget.k1'),
  exceeded: i18n.t('shared.budget.k2'),
  pending: i18n.t('shared.budget.k3'),
  cancelled: i18n.t('shared.budget.k4'),
};

function renderBudgetStatusCell(value: unknown) {
  // toColumnDef 对 fnLength=1 的 renderCell 传字段值而非整行，须用 value 签名
  const status = String(value ?? '');
  const color = budgetStatusColorMap[status] || 'default';
  const label = budgetStatusLabelMap[status] || status;
  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderDateCell(value: string | null | undefined) {
  // toColumnDef 对 fnLength=1 的 renderCell 传字段值而非整行，须用 value 签名
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-CN');
}

function renderBudgetAmountCell(value: number | string | null | undefined) {
  // 后端金额字段返回 JSON 字符串（如 "88888.00"），须兼容字符串与数值
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

export const budgetSchema: EntitySchema = {
  entity: 'erpBudget',
  title: i18n.t('schema:erp.budget.meta.title'),
  description: i18n.t('schema:erp.budget.meta.description'),

  api: {
    module: 'erp',
    resource: 'budgets',
  },

  // 批 17：写权限资源前缀（API 资源名 → DB 资源名语义映射）
  permissionResource: 'erp:budget',

  fields: [
    {
      name: 'budget_type',
      label: i18n.t('schema:erp.budget.budget_type.label'),
      type: 'select',
      defaultValue: 'annual',
      options: {
        type: 'static',
        options: [
          { value: 'annual', label: i18n.t('schema:erp.budget.budget_type.option.annual') },
          { value: 'quarterly', label: i18n.t('schema:erp.budget.budget_type.option.quarterly') },
          { value: 'monthly', label: i18n.t('schema:erp.budget.budget_type.option.monthly') },
          { value: 'project', label: i18n.t('schema:erp.budget.budget_type.option.project') },
        ],
      },
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'department_id',
      label: i18n.t('schema:erp.budget.department_id.label'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('schema:erp.budget.department_id.placeholder'),
    },
    {
      name: 'fiscal_year',
      label: i18n.t('schema:erp.budget.fiscal_year.label'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('schema:erp.budget.fiscal_year.placeholder'),
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'total_budget',
      label: i18n.t('schema:erp.budget.total_budget.label'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (value: unknown) => renderBudgetAmountCell(value as number | string | null),
    },
    {
      name: 'used_amount',
      label: i18n.t('schema:erp.budget.used_amount.label'),
      type: 'number',
      defaultValue: 0,
      listWidth: 140,
      renderCell: (value: unknown) => renderBudgetAmountCell(value as number | string | null),
    },
    {
      name: 'remaining_amount',
      label: i18n.t('schema:erp.budget.remaining_amount.label'),
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'usage_rate',
      label: i18n.t('schema:erp.budget.usage_rate.label'),
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.budget.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:erp.budget.status.option.active') },
          { value: 'completed', label: i18n.t('schema:erp.budget.status.option.completed') },
          { value: 'exceeded', label: i18n.t('schema:erp.budget.status.option.exceeded') },
          { value: 'pending', label: i18n.t('schema:erp.budget.status.option.pending') },
          { value: 'cancelled', label: i18n.t('schema:erp.budget.status.option.cancelled') },
        ],
      },
      listWidth: 100,
      renderCell: renderBudgetStatusCell,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'created_at',
      label: i18n.t('schema:erp.budget.created_at.label'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (value: unknown) => renderDateCell(value as string | null),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['budget_type', 'fiscal_year', 'department_id'],
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.budget.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.budget.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.budget.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:erp.budget.filter.status.option.completed'), value: 'completed' },
          { label: i18n.t('schema:erp.budget.filter.status.option.exceeded'), value: 'exceeded' },
          { label: i18n.t('schema:erp.budget.filter.status.option.pending'), value: 'pending' },
          { label: i18n.t('schema:erp.budget.filter.status.option.cancelled'), value: 'cancelled' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: budgetStatusColorMap,
      labelMap: budgetStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('schema:erp.budget.section.0.title'),
      fields: ['budget_type', 'department_id', 'fiscal_year', 'status'],
    },
    {
      title: i18n.t('schema:erp.budget.section.1.title'),
      fields: ['total_budget', 'used_amount', 'remaining_amount', 'usage_rate'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.budget.meta.createTitle'),
  editTitle: i18n.t('schema:erp.budget.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.budget.meta.detailTitle'),

  actions: ['create', 'edit', 'detail', 'delete'],
};

export const expenseSchema: EntitySchema = {
  entity: 'erpExpense',
  title: i18n.t('schema:erp.expense.section.0.title'),
  description: i18n.t('schema:erp.expense.meta.description'),

  api: {
    module: 'erp',
    resource: 'expenses',
  },

  fields: [
    {
      name: 'expense_number',
      label: i18n.t('schema:erp.expense.label'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: i18n.t('shared.budget.k5'),
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'expense_type',
      label: i18n.t('schema:erp.expense.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      placeholder: i18n.t('shared.budget.k6'),
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'applicant_name',
      label: i18n.t('schema:erp.expense.label'),
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: i18n.t('shared.budget.k7'),
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'department_id',
      label: i18n.t('schema:erp.expense.label'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: i18n.t('shared.budget.k8'),
    },
    {
      name: 'amount',
      label: i18n.t('schema:erp.expense.label'),
      type: 'number',
      defaultValue: 0,
      required: true,
      sortable: true,
      listWidth: 140,
      renderCell: (value: unknown) => renderBudgetAmountCell(value as number | string | null),
    },
    {
      name: 'expense_date',
      label: i18n.t('schema:erp.expense.label'),
      type: 'date',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'receipt_count',
      label: i18n.t('schema:erp.expense.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: i18n.t('schema:erp.expense.label'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('schema:erp.expense.label') },
          { value: 'active', label: i18n.t('schema:erp.expense.label') },
          { value: 'completed', label: i18n.t('schema:erp.expense.label') },
          { value: 'cancelled', label: i18n.t('schema:erp.expense.label') },
        ],
      },
      listWidth: 100,
      renderCell: renderBudgetStatusCell,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'approver_id',
      label: i18n.t('schema:erp.expense.label'),
      type: 'text',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'approved_at',
      label: i18n.t('schema:erp.expense.label'),
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (value: unknown) => renderDateCell(value as string | null),
    },
    {
      name: 'reimbursed_at',
      label: i18n.t('schema:erp.expense.label'),
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (value: unknown) => renderDateCell(value as string | null),
    },
    {
      name: 'description',
      label: i18n.t('schema:erp.expense.label'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('shared.budget.k9'),
    },
    {
      name: 'created_at',
      label: i18n.t('schema:erp.expense.label'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (value: unknown) => renderDateCell(value as string | null),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['expense_number', 'expense_type', 'applicant_name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('schema:erp.expense.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.expense.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.expense.filter.status.option.active'), value: 'active' },
          {
            label: i18n.t('schema:erp.expense.filter.status.option.completed'),
            value: 'completed',
          },
          { label: i18n.t('schema:erp.expense.filter.status.option.pending'), value: 'pending' },
          {
            label: i18n.t('schema:erp.expense.filter.status.option.cancelled'),
            value: 'cancelled',
          },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: budgetStatusColorMap,
      labelMap: budgetStatusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('schema:erp.expense.section.0.title'),
      fields: ['expense_number', 'expense_type', 'applicant_name', 'department_id'],
    },
    {
      title: i18n.t('schema:erp.expense.section.1.title'),
      fields: ['amount', 'expense_date', 'receipt_count', 'status'],
    },
    {
      title: i18n.t('schema:erp.expense.section.2.title'),
      fields: ['approver_id', 'approved_at', 'reimbursed_at'],
    },
    {
      title: i18n.t('schema:erp.expense.section.3.title'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.expense.meta.createTitle'),
  editTitle: i18n.t('schema:erp.expense.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.expense.meta.detailTitle'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
