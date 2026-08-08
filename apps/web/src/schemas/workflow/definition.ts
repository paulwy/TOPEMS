import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

// ============ 流程类型 ============

const categoryLabels: Record<string, string> = {
  approval: '审批流',
  business: '业务流',
  notification: '通知流',
  automation: '自动化',
};

const categoryColorMap: Record<string, { bgcolor: string; color: string }> = {
  approval: { bgcolor: 'primary.100', color: 'primary.700' },
  business: { bgcolor: 'success.100', color: 'success.700' },
  notification: { bgcolor: 'info.100', color: 'info.700' },
  automation: { bgcolor: 'warning.100', color: 'warning.700' },
};

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  value,
  label,
}));

// ============ 流程状态 ============

const statusLabels: Record<string, string> = {
  active: '已发布',
  draft: '草稿',
  archived: '已归档',
  disabled: '已停用',
};

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  draft: 'default',
  archived: 'warning',
  disabled: 'error',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
}));

// ============ 渲染辅助函数 ============

export function renderWorkflowCategoryBadge(category: string): React.ReactNode {
  const config = categoryColorMap[category] || { bgcolor: 'gray.100', color: 'gray.700' };
  const label = categoryLabels[category] || category;
  return React.createElement(Chip, {
    size: 'small',
    variant: 'outlined',
    sx: { bgcolor: config.bgcolor, color: config.color },
    label,
  });
}

export function renderWorkflowStatusBadge(status: string): React.ReactNode {
  const color = statusColorMap[status] || 'default';
  const label = statusLabels[status] || status;
  return React.createElement(Chip, {
    size: 'small',
    color: color === 'default' ? 'default' : color,
    variant: color === 'default' ? 'outlined' : 'filled',
    label,
  });
}

// ============ Schema 定义 ============

export const workflowDefinitionSchema: EntitySchema = {
  entity: 'workflow-definition',
  title: '流程定义',
  description: '管理工作流流程定义',

  api: {
    module: 'workflow',
    resource: 'workflows',
  },

  fields: [
    {
      name: 'name',
      label: '流程名称',
      type: 'text',
      required: true,
      sortable: true,
      placeholder: '请输入流程名称',
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: '流程编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      placeholder: '请输入流程编码',
    },
    {
      name: 'category',
      label: '流程类型',
      type: 'select',
      required: true,
      defaultValue: 'approval',
      options: {
        type: 'static',
        options: categoryOptions,
      },
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      defaultValue: 'v1.0',
      placeholder: '请输入版本号',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: statusOptions,
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      placeholder: '请输入流程描述',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'node_count',
      label: '节点数',
      type: 'number',
      defaultValue: 0,
      readonlyOnEdit: true,
    },
    {
      name: 'instance_count',
      label: '实例数',
      type: 'number',
      defaultValue: 0,
      readonlyOnEdit: true,
    },
  ],

  list: {
    searchFields: ['name', 'code'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: '流程类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...categoryOptions],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...statusOptions],
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabels,
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'category', 'version', 'status', 'description'],
    },
    {
      title: '统计信息',
      fields: ['node_count', 'instance_count'],
    },
  ],

  formColCount: 2,
  createTitle: '新建流程',
  editTitle: '编辑流程',
  detailTitle: '流程详情',
};
