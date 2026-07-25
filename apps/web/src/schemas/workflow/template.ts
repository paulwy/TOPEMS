import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const typeLabels: Record<string, string> = {
  approval: '审批流程',
  reimbursement: '报销流程',
  purchase: '采购流程',
  contract: '合同流程',
};

const typeColorMap: Record<string, { bgcolor: string; color: string }> = {
  approval: { bgcolor: 'blue.100', color: 'blue.700' },
  reimbursement: { bgcolor: 'green.100', color: 'green.700' },
  purchase: { bgcolor: 'orange.100', color: 'orange.700' },
  contract: { bgcolor: 'purple.100', color: 'purple.700' },
};

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({
  value,
  label,
}));

export function renderTemplateTypeBadge(type: string): React.ReactNode {
  const config = typeColorMap[type] || { bgcolor: 'gray.100', color: 'gray.700' };
  const label = typeLabels[type] || type;
  return React.createElement(Chip, {
    size: 'small',
    sx: { bgcolor: config.bgcolor, color: config.color },
    label,
  });
}

export const workflowTemplateSchema: EntitySchema = {
  entity: 'workflow-template',
  title: '流程模板',
  description: '管理工作流模板定义',

  api: {
    module: 'workflow',
    resource: 'workflows',
  },

  fields: [
    {
      name: 'name',
      label: '模板名称',
      type: 'text',
      required: true,
      sortable: true,
      placeholder: '请输入模板名称',
    },
    {
      name: 'type',
      label: '模板类型',
      type: 'select',
      required: true,
      defaultValue: 'approval',
      options: {
        type: 'static',
        options: typeOptions,
      },
    },
    {
      name: 'scope',
      label: '适用范围',
      type: 'text',
      defaultValue: '全公司',
      placeholder: '请输入适用范围',
    },
  ],

  list: {
    searchFields: ['name'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...typeOptions],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'type', 'scope'],
    },
  ],

  formColCount: 2,
  createTitle: '新建模板',
  editTitle: '编辑模板',
  detailTitle: '模板详情',
};
