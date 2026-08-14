/**
 * 审批配置 Schema — 驱动 FinanceApprovalConfigPage 的 CRUD
 *
 * 审批节点（ApprovalNode）作为详情视图中的子表格展示，
 * 节点编辑通过自定义弹窗处理。
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const approvalConfigSchema: EntitySchema = {
  entity: 'finance_approval_config',
  title: i18n.t('finance.approval_config.k0'),
  description: i18n.t('finance.approval_config.k1'),

  api: {
    module: 'finance',
    resource: 'approval-configs',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('finance.approval_config.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'amountThreshold',
      label: i18n.t('finance.approval_config.k3'),
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
      label: i18n.t('finance.approval_config.k4'),
      type: 'number',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.maxAmount;
        if (val === undefined || val === null) return i18n.t('finance.approval_config.k5');
        return `¥${Number(val).toLocaleString()}`;
      },
    },
    {
      name: 'approvalLevels',
      label: i18n.t('finance.approval_config.k6'),
      type: 'number',
      required: true,
      defaultValue: 1,
      listWidth: 100,
    },
    {
      name: 'priority',
      label: i18n.t('finance.approval_config.k7'),
      type: 'select',
      required: true,
      defaultValue: 2,
      options: {
        type: 'static',
        options: [
          { value: 1, label: i18n.t('finance.approval_config.k8') },
          { value: 2, label: i18n.t('finance.approval_config.k9') },
          { value: 3, label: i18n.t('finance.approval_config.k10') },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'isActive',
      label: i18n.t('finance.approval_config.k11'),
      type: 'select',
      defaultValue: true,
      options: {
        type: 'static',
        options: [
          { value: true, label: i18n.t('finance.approval_config.k12') },
          { value: false, label: i18n.t('finance.approval_config.k13') },
        ],
      },
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        const active = row.isActive !== false;
        return active ? i18n.t('finance.approval_config.k15') : i18n.t('finance.approval_config.k14');
      },
    },
    {
      name: 'description',
      label: i18n.t('finance.approval_config.k16'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'workflowId',
      label: i18n.t('finance.approval_config.k17'),
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
        true: i18n.t('finance.approval_config.k18'),
        false: i18n.t('finance.approval_config.k19'),
      },
    },
    filters: [
      {
        id: 'isActive',
        label: i18n.t('finance.approval_config.k20'),
        type: 'select',
        options: [
          { label: i18n.t('finance.approval_config.k21'), value: 'all' },
          { label: i18n.t('finance.approval_config.k22'), value: 'true' },
          { label: i18n.t('finance.approval_config.k23'), value: 'false' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: i18n.t('finance.approval_config.k24'),
        type: 'select',
        options: [
          { label: i18n.t('finance.approval_config.k25'), value: 'all' },
          { label: i18n.t('finance.approval_config.k26'), value: '1' },
          { label: i18n.t('finance.approval_config.k27'), value: '2' },
          { label: i18n.t('finance.approval_config.k28'), value: '3' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.approval_config.k29'),
      fields: ['name', 'description', 'priority', 'isActive'],
    },
    {
      title: i18n.t('finance.approval_config.k30'),
      fields: ['amountThreshold', 'maxAmount', 'approvalLevels', 'workflowId'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.approval_config.k31'),
  editTitle: i18n.t('finance.approval_config.k32'),
  detailTitle: i18n.t('finance.approval_config.k33'),
};
