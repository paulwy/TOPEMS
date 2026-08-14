/**
 * Expense Approval Schema — 驱动费用审批流程的完整 CRUD
 *
 * Phase 3 WizardBuilder 迁移：集成 3 步向导 + 嵌套费用明细子表
 * - WizardBuilder：3 步向导（费用填写 → 审批流程 → 确认提交）
 * - NestedTableConfig：费用明细行（items）的编辑
 *
 * 注意：本文件为纯 Schema 定义，不含 JSX。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { columnsFromFields } from '@/schema/schemaExtensions';
import type { NestedTableConfig, WizardConfig } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

// ============ 费用明细子表配置 ============

const expenseItemFields: NestedTableConfig['fields'] = [
  {
    name: 'date',
    label: i18n.t('finance.expense_approval.k0'),
    type: 'date',
    listWidth: 120,
  },
  {
    name: 'category',
    label: i18n.t('finance.expense_approval.k1'),
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: i18n.t('finance.expense_approval.k2'), value: 'transport' },
        { label: i18n.t('finance.expense_approval.k3'), value: 'accommodation' },
        { label: i18n.t('finance.expense_approval.k4'), value: 'meal' },
        { label: i18n.t('finance.expense_approval.k5'), value: 'office' },
        { label: i18n.t('finance.expense_approval.k6'), value: 'communication' },
        { label: i18n.t('finance.expense_approval.k7'), value: 'other' },
      ],
    },
  },
  {
    name: 'amount',
    label: i18n.t('finance.expense_approval.k8'),
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 120,
  },
  {
    name: 'receipt_no',
    label: i18n.t('finance.expense_approval.k9'),
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'description',
    label: i18n.t('finance.expense_approval.k10'),
    type: 'text',
    listWidth: 180,
  },
];

const expenseItemsTable: NestedTableConfig = {
  field: 'items',
  title: i18n.t('finance.expense_approval.k11'),
  columns: columnsFromFields(expenseItemFields, {
    amount: { align: 'right' },
  }),
  fields: expenseItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: i18n.t('finance.expense_approval.k12'),
  rowKeyField: 'id',
  minRows: 0,
  maxRows: 100,
  formColCount: 2,
};

// ============ 向导配置 ============

const expenseApprovalWizard: WizardConfig = {
  steps: [
    {
      key: 'expense_info',
      title: i18n.t('finance.expense_approval.k13'),
      description: i18n.t('finance.expense_approval.k14'),
      fields: [
        'expense_no',
        'employee_id',
        'employee_name',
        'department',
        'expense_date',
        'expense_type',
        'total_amount',
        'description',
        'items',
      ],
      groupTitle: i18n.t('finance.expense_approval.k15'),
      validate: (values) => {
        if (!values.expense_no) return i18n.t('finance.expense_approval.k16');
        if (!values.employee_id) return i18n.t('finance.expense_approval.id_17');
        if (!values.expense_date) return i18n.t('finance.expense_approval.k18');
        return null;
      },
    },
    {
      key: 'approval',
      title: i18n.t('finance.expense_approval.k19'),
      description: i18n.t('finance.expense_approval.k20'),
      fields: ['approver_id', 'approver_name', 'approval_note'],
      groupTitle: i18n.t('finance.expense_approval.k21'),
      validate: (values) => {
        if (!values.approver_id) return i18n.t('finance.expense_approval.k22');
        return null;
      },
    },
    {
      key: 'confirm',
      title: i18n.t('finance.expense_approval.k23'),
      description: i18n.t('finance.expense_approval.k24'),
      fields: ['status'],
      groupTitle: i18n.t('finance.expense_approval.k25'),
      isFinalStep: true,
    },
  ],
  title: i18n.t('finance.expense_approval.k26'),
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: i18n.t('finance.expense_approval.k27'),
  nextButtonText: i18n.t('finance.expense_approval.k28'),
  prevButtonText: i18n.t('finance.expense_approval.k29'),
};

// ============ 主 Schema ============

export const expenseApprovalSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'financeExpenseApproval',
  title: i18n.t('finance.expense_approval.k30'),
  description: i18n.t('finance.expense_approval.k31'),

  api: {
    module: 'finance',
    resource: 'expenseApprovals',
  },

  fields: [
    {
      name: 'expense_no',
      label: i18n.t('finance.expense_approval.k32'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'employee_id',
      label: i18n.t('finance.expense_approval.id_33'),
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'employee_name',
      label: i18n.t('finance.expense_approval.k34'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'department',
      label: i18n.t('finance.expense_approval.k35'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'expense_date',
      label: i18n.t('finance.expense_approval.k36'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'expense_type',
      label: i18n.t('finance.expense_approval.k37'),
      type: 'select',
      defaultValue: 'travel',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('finance.expense_approval.k38'), value: 'travel' },
          { label: i18n.t('finance.expense_approval.k39'), value: 'entertainment' },
          { label: i18n.t('finance.expense_approval.k40'), value: 'office' },
          { label: i18n.t('finance.expense_approval.k41'), value: 'other' },
        ],
      },
    },
    {
      name: 'total_amount',
      label: i18n.t('finance.expense_approval.k42'),
      type: 'number',
      readonly: true,
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.total_amount as number | undefined;
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `¥${(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        );
      },
    },
    {
      name: 'status',
      label: i18n.t('finance.expense_approval.k43'),
      type: 'select',
      defaultValue: 'draft',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('finance.expense_approval.k44'), value: 'draft' },
          { label: i18n.t('finance.expense_approval.k45'), value: 'pending_approval' },
          { label: i18n.t('finance.expense_approval.k46'), value: 'approved' },
          { label: i18n.t('finance.expense_approval.k47'), value: 'rejected' },
          { label: i18n.t('finance.expense_approval.k48'), value: 'reimbursed' },
        ],
      },
    },
    {
      name: 'description',
      label: i18n.t('finance.expense_approval.k49'),
      type: 'textarea',
      showInList: false,
    },

    // ── 审批步骤字段 ──
    {
      name: 'approver_id',
      label: i18n.t('finance.expense_approval.id_50'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'approver_name',
      label: i18n.t('finance.expense_approval.k51'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'approval_note',
      label: i18n.t('finance.expense_approval.k52'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'expense_no',
      'employee_name',
      'department',
      'expense_type',
      'expense_date',
      'total_amount',
      'status',
    ],
    searchFields: ['expense_no', 'employee_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending_approval: 'warning',
        approved: 'success',
        rejected: 'error',
        reimbursed: 'primary',
      },
      labelMap: {
        draft: i18n.t('finance.expense_approval.k53'),
        pending_approval: i18n.t('finance.expense_approval.k54'),
        approved: i18n.t('finance.expense_approval.k55'),
        rejected: i18n.t('finance.expense_approval.k56'),
        reimbursed: i18n.t('finance.expense_approval.k57'),
      },
    },
    filters: [
      {
        id: 'expense_type',
        label: i18n.t('finance.expense_approval.k58'),
        type: 'select',
        options: [
          { label: i18n.t('finance.expense_approval.k59'), value: 'all' },
          { label: i18n.t('finance.expense_approval.k60'), value: 'travel' },
          { label: i18n.t('finance.expense_approval.k61'), value: 'entertainment' },
          { label: i18n.t('finance.expense_approval.k62'), value: 'office' },
          { label: i18n.t('finance.expense_approval.k63'), value: 'other' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('finance.expense_approval.k64'),
        type: 'select',
        options: [
          { label: i18n.t('finance.expense_approval.k65'), value: 'all' },
          { label: i18n.t('finance.expense_approval.k66'), value: 'draft' },
          { label: i18n.t('finance.expense_approval.k67'), value: 'pending_approval' },
          { label: i18n.t('finance.expense_approval.k68'), value: 'approved' },
          { label: i18n.t('finance.expense_approval.k69'), value: 'rejected' },
          { label: i18n.t('finance.expense_approval.k70'), value: 'reimbursed' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('finance.expense_approval.k71'),
      fields: [
        'expense_no',
        'employee_id',
        'employee_name',
        'department',
        'expense_date',
        'expense_type',
      ],
    },
    {
      title: i18n.t('finance.expense_approval.k72'),
      fields: ['total_amount', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.expense_approval.k73'),
  editTitle: i18n.t('finance.expense_approval.k74'),
  detailTitle: i18n.t('finance.expense_approval.k75'),

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：嵌套费用明细子表
  nestedTables: [expenseItemsTable],

  // Phase 3 扩展：3 步向导表单
  wizard: expenseApprovalWizard,
};
