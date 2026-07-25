import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const auditStatusColorMap: Record<string, 'primary' | 'warning' | 'success' | 'default'> = {
  scheduled: 'primary',
  planning: 'primary',
  in_progress: 'warning',
  completed: 'success',
};

const auditStatusLabelMap: Record<string, string> = {
  scheduled: '已计划',
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
};

export const auditSchema: EntitySchema = {
  entity: 'audit_plan',
  title: '审核管理',
  description: 'Audit Management — 管理审核计划，跟踪审核类型、状态、审核人和涉及部门',

  api: {
    module: 'qms',
    resource: 'auditPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '审核编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '审核标题',
      type: 'text',
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'audit_type',
      label: '审核类型',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.audit_type ?? '');
        const label = val === 'internal' ? '内部审核' : val === 'external' ? '外部审核' : val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color: val === 'internal' ? 'primary' : 'secondary',
          variant: 'filled',
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: '已计划' },
          { value: 'planning', label: '计划中' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const color = auditStatusColorMap[val] || 'default';
        const label = auditStatusLabelMap[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          color,
          variant: 'filled',
        });
      },
      filterable: true,
    },
    {
      name: 'auditor',
      label: '审核人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '审核日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'departments',
      label: '涉及部门',
      type: 'text',
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const depts = (row.departments as string[]) || [];
        return depts.join(', ') || '-';
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scope',
      label: '审核范围',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      showInList: false,
      sortable: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'plan_no'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已计划', value: 'scheduled' },
          { label: '计划中', value: 'planning' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: auditStatusColorMap,
      labelMap: auditStatusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['plan_no', 'title', 'audit_type', 'status', 'auditor'],
    },
    {
      title: '审核详情',
      fields: ['start_date', 'end_date', 'departments', 'scope', 'description'],
    },
  ],

  formColCount: 2,
  detailTitle: '审核计划详情',

  actions: ['detail'],
};
