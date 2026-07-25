import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const budgetStatusColorMap: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  active: 'success',
  completed: 'default',
  exceeded: 'error',
  pending: 'warning',
  cancelled: 'default',
};

const budgetStatusLabelMap: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  exceeded: '超支',
  pending: '待审批',
  cancelled: '已取消',
};

function renderBudgetStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
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

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

function renderBudgetAmountCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as number | null | undefined;
  if (val === undefined || val === null) return '-';
  return `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

export const budgetSchema: EntitySchema = {
  entity: 'erpBudget',
  title: '预算管理',
  description: '管理预算信息，包括预算类型、金额、部门和状态等',

  api: {
    module: 'erp',
    resource: 'budgets',
  },

  fields: [
    {
      name: 'budget_type',
      label: '预算类型',
      type: 'select',
      defaultValue: 'annual',
      options: {
        type: 'static',
        options: [
          { value: 'annual', label: '年度预算' },
          { value: 'quarterly', label: '季度预算' },
          { value: 'monthly', label: '月度预算' },
          { value: 'project', label: '项目预算' },
        ],
      },
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入所属部门',
    },
    {
      name: 'fiscal_year',
      label: '预算周期',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入预算周期',
    },
    {
      name: 'total_budget',
      label: '预算金额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => renderBudgetAmountCell(row, 'total_budget'),
    },
    {
      name: 'used_amount',
      label: '已使用金额',
      type: 'number',
      defaultValue: 0,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => renderBudgetAmountCell(row, 'used_amount'),
    },
    {
      name: 'remaining_amount',
      label: '剩余金额',
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'usage_rate',
      label: '使用率',
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'exceeded', label: '超支' },
          { value: 'pending', label: '待审批' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: renderBudgetStatusCell,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['budget_type', 'fiscal_year', 'department_id'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '进行中', value: 'active' },
          { label: '已完成', value: 'completed' },
          { label: '超支', value: 'exceeded' },
          { label: '待审批', value: 'pending' },
          { label: '已取消', value: 'cancelled' },
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
      title: '基本信息',
      fields: ['budget_type', 'department_id', 'fiscal_year', 'status'],
    },
    {
      title: '金额信息',
      fields: ['total_budget', 'used_amount', 'remaining_amount', 'usage_rate'],
    },
  ],

  formColCount: 2,
  createTitle: '新增预算',
  editTitle: '编辑预算',
  detailTitle: '预算详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};

export const expenseSchema: EntitySchema = {
  entity: 'erpExpense',
  title: '费用报销',
  description: '管理费用报销信息，包括费用类型、金额、申请人和状态等',

  api: {
    module: 'erp',
    resource: 'expenses',
  },

  fields: [
    {
      name: 'expense_number',
      label: '费用编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: '请输入费用编号',
    },
    {
      name: 'expense_type',
      label: '费用类型',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      placeholder: '请输入费用类型',
    },
    {
      name: 'applicant_name',
      label: '申请人',
      type: 'text',
      listWidth: 100,
      showInList: false,
      placeholder: '请输入申请人',
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'text',
      listWidth: 120,
      showInList: false,
      placeholder: '请输入所属部门',
    },
    {
      name: 'amount',
      label: '费用金额',
      type: 'number',
      defaultValue: 0,
      required: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => renderBudgetAmountCell(row, 'amount'),
    },
    {
      name: 'expense_date',
      label: '费用日期',
      type: 'date',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'receipt_count',
      label: '票据数量',
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审批' },
          { value: 'active', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      renderCell: renderBudgetStatusCell,
    },
    {
      name: 'approver_id',
      label: '审批人',
      type: 'text',
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'approved_at',
      label: '审批时间',
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'approved_at'),
    },
    {
      name: 'reimbursed_at',
      label: '报销时间',
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'reimbursed_at'),
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
      showInList: false,
      placeholder: '请输入备注',
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['expense_number', 'expense_type', 'applicant_name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '进行中', value: 'active' },
          { label: '已完成', value: 'completed' },
          { label: '待审批', value: 'pending' },
          { label: '已取消', value: 'cancelled' },
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
      title: '基本信息',
      fields: ['expense_number', 'expense_type', 'applicant_name', 'department_id'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'expense_date', 'receipt_count', 'status'],
    },
    {
      title: '审批信息',
      fields: ['approver_id', 'approved_at', 'reimbursed_at'],
    },
    {
      title: '备注',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增费用报销',
  editTitle: '编辑费用报销',
  detailTitle: '费用报销详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
