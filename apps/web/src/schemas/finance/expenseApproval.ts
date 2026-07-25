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

// ============ 费用明细子表配置 ============

const expenseItemFields: NestedTableConfig['fields'] = [
  {
    name: 'date',
    label: '日期',
    type: 'date',
    listWidth: 120,
  },
  {
    name: 'category',
    label: '类别',
    type: 'select',
    listWidth: 120,
    options: {
      type: 'static',
      options: [
        { label: '交通费', value: 'transport' },
        { label: '住宿费', value: 'accommodation' },
        { label: '餐饮费', value: 'meal' },
        { label: '办公费', value: 'office' },
        { label: '通讯费', value: 'communication' },
        { label: '其他', value: 'other' },
      ],
    },
  },
  {
    name: 'amount',
    label: '金额',
    type: 'number',
    required: true,
    defaultValue: 0,
    listWidth: 120,
  },
  {
    name: 'receipt_no',
    label: '票据编号',
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'description',
    label: '说明',
    type: 'text',
    listWidth: 180,
  },
];

const expenseItemsTable: NestedTableConfig = {
  field: 'items',
  title: '费用明细',
  columns: columnsFromFields(expenseItemFields, {
    amount: { align: 'right' },
  }),
  fields: expenseItemFields,
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowDuplicate: true,
  addButtonText: '添加明细',
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
      title: '费用填写',
      description: '填写费用基本信息和费用明细',
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
      groupTitle: '基本信息与费用明细',
      validate: (values) => {
        if (!values.expense_no) return '请填写费用单号';
        if (!values.employee_id) return '请填写员工ID';
        if (!values.expense_date) return '请选择费用日期';
        return null;
      },
    },
    {
      key: 'approval',
      title: '审批流程',
      description: '选择审批人并填写附加信息',
      fields: ['approver_id', 'approver_name', 'approval_note'],
      groupTitle: '审批人信息',
      validate: (values) => {
        if (!values.approver_id) return '请选择审批人';
        return null;
      },
    },
    {
      key: 'confirm',
      title: '确认提交',
      description: '确认费用汇总信息并提交审批',
      fields: ['status'],
      groupTitle: '确认费用汇总',
      isFinalStep: true,
    },
  ],
  title: '费用审批流程',
  navigationPosition: 'top',
  showProgress: true,
  allowBack: true,
  showSummaryOnComplete: true,
  finishButtonText: '提交审批',
  nextButtonText: '下一步',
  prevButtonText: '上一步',
};

// ============ 主 Schema ============

export const expenseApprovalSchema: EntitySchema & {
  nestedTables: NestedTableConfig[];
  wizard: WizardConfig;
} = {
  entity: 'financeExpenseApproval',
  title: '费用审批',
  description: '员工费用报销审批流程，支持多步骤向导填写和明细录入',

  api: {
    module: 'finance',
    resource: 'expenseApprovals',
  },

  fields: [
    {
      name: 'expense_no',
      label: '费用单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'employee_id',
      label: '员工ID',
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'expense_date',
      label: '费用日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'expense_type',
      label: '费用类型',
      type: 'select',
      defaultValue: 'travel',
      listWidth: 120,
      options: {
        type: 'static',
        options: [
          { label: '差旅费', value: 'travel' },
          { label: '招待费', value: 'entertainment' },
          { label: '办公费', value: 'office' },
          { label: '其他', value: 'other' },
        ],
      },
    },
    {
      name: 'total_amount',
      label: '合计金额',
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
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '待审批', value: 'pending_approval' },
          { label: '已批准', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已报销', value: 'reimbursed' },
        ],
      },
    },
    {
      name: 'description',
      label: '说明',
      type: 'textarea',
      showInList: false,
    },

    // ── 审批步骤字段 ──
    {
      name: 'approver_id',
      label: '审批人ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'approver_name',
      label: '审批人姓名',
      type: 'text',
      showInList: false,
    },
    {
      name: 'approval_note',
      label: '审批备注',
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
        draft: '草稿',
        pending_approval: '待审批',
        approved: '已批准',
        rejected: '已驳回',
        reimbursed: '已报销',
      },
    },
    filters: [
      {
        id: 'expense_type',
        label: '费用类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '差旅费', value: 'travel' },
          { label: '招待费', value: 'entertainment' },
          { label: '办公费', value: 'office' },
          { label: '其他', value: 'other' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '待审批', value: 'pending_approval' },
          { label: '已批准', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已报销', value: 'reimbursed' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['expense_no', 'employee_id', 'employee_name', 'department', 'expense_date', 'expense_type'],
    },
    {
      title: '费用汇总',
      fields: ['total_amount', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '发起费用审批',
  editTitle: '编辑费用审批',
  detailTitle: '费用审批详情',

  actions: ['create', 'edit', 'detail', 'delete'],

  // Phase 3 扩展：嵌套费用明细子表
  nestedTables: [expenseItemsTable],

  // Phase 3 扩展：3 步向导表单
  wizard: expenseApprovalWizard,
};