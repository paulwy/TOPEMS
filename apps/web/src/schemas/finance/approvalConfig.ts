/**
 * 审批配置 Schema — 驱动 FinanceApprovalConfigPage 的 CRUD
 *
 * 审批节点（ApprovalNode）作为详情视图中的子表格展示，
 * 节点编辑通过自定义弹窗处理。
 */

import type { EntitySchema } from '@/schema';

export const approvalConfigSchema: EntitySchema = {
  entity: 'finance_approval_config',
  title: '审批配置',
  description: '管理财务审批流程配置，包括金额阈值、审批层级、审批节点等',

  api: {
    module: 'finance',
    resource: 'approval-configs',
  },

  fields: [
    {
      name: 'name',
      label: '配置名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'amountThreshold',
      label: '金额阈值',
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.amountThreshold ?? 0);
        return `¥${val.toLocaleString()}`;
      },
    },
    {
      name: 'maxAmount',
      label: '金额上限',
      type: 'number',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.maxAmount;
        if (val === undefined || val === null) return '不限';
        return `¥${Number(val).toLocaleString()}`;
      },
    },
    {
      name: 'approvalLevels',
      label: '审批层级',
      type: 'number',
      required: true,
      defaultValue: 1,
      listWidth: 100,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      required: true,
      defaultValue: 2,
      options: {
        type: 'static',
        options: [
          { value: 1, label: '高' },
          { value: 2, label: '中' },
          { value: 3, label: '低' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'isActive',
      label: '状态',
      type: 'select',
      defaultValue: true,
      options: {
        type: 'static',
        options: [
          { value: true, label: '启用' },
          { value: false, label: '停用' },
        ],
      },
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const active = row.isActive !== false;
        return active ? '启用' : '停用';
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'workflowId',
      label: '关联工作流',
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'amountThreshold', 'approvalLevels', 'priority', 'isActive'],
    searchFields: ['name'],
    pageSize: 10,
    statusBadge: {
      field: 'isActive',
      colorMap: {
        true: 'success',
        false: 'error',
      },
      labelMap: {
        true: '启用',
        false: '停用',
      },
    },
    filters: [
      {
        id: 'isActive',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '启用', value: 'true' },
          { label: '停用', value: 'false' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '高', value: '1' },
          { label: '中', value: '2' },
          { label: '低', value: '3' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'priority', 'isActive'],
    },
    {
      title: '金额与审批',
      fields: ['amountThreshold', 'maxAmount', 'approvalLevels', 'workflowId'],
    },
  ],

  formColCount: 2,
  createTitle: '新增审批配置',
  editTitle: '编辑审批配置',
  detailTitle: '审批配置详情',
};
