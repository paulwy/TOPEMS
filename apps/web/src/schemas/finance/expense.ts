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

export const expenseSchema: EntitySchema = {
  entity: 'financeExpense',
  title: '费用管理',

  api: {
    module: 'finance',
    resource: 'expenses',
  },

  fields: [
    {
      name: 'expense_no',
      label: '费用单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'expense_type',
      label: '费用类型',
      type: 'select',
      defaultValue: 'travel',
      options: {
        type: 'static',
        options: [
          { value: 'travel', label: '差旅费' },
          { value: 'office', label: '办公费' },
          { value: 'meal', label: '餐饮费' },
          { value: 'communication', label: '通讯费' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'department_id',
      label: '部门ID',
      type: 'text',
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'department_name',
      label: '部门名称',
      type: 'text',
      listWidth: 120,
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
      name: 'submit_date',
      label: '提交日期',
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
          { value: 'submitted', label: '已提交' },
          { value: 'approved', label: '已审批' },
          { value: 'rejected', label: '已驳回' },
          { value: 'paid', label: '已付款' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'payee',
      label: '收款人',
      type: 'text',
      listWidth: 120,
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
        draft: '草稿',
        submitted: '已提交',
        approved: '已审批',
        rejected: '已驳回',
        paid: '已付款',
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
          { label: '办公费', value: 'office' },
          { label: '餐饮费', value: 'meal' },
          { label: '通讯费', value: 'communication' },
          { label: '其他', value: 'other' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已审批', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已付款', value: 'paid' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['expense_no', 'expense_type', 'department_id'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'submit_date', 'payee'],
    },
    {
      title: '审批状态',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增费用',
  editTitle: '编辑费用',
  detailTitle: '费用详情',
};
