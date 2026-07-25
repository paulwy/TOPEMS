import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const severityColorMap: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error',
  critical: 'error',
  medium: 'warning',
  low: 'success',
};

const severityLabelMap: Record<string, string> = {
  high: '严重',
  critical: '严重',
  medium: '中等',
  low: '轻微',
};

const issueStatusColorMap: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  open: 'error',
  in_progress: 'warning',
  closed: 'default',
  resolved: 'success',
};

const issueStatusLabelMap: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  closed: '已关闭',
  resolved: '已解决',
};

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

export const qualityIssueSchema: EntitySchema = {
  entity: 'quality_issue',
  title: '不合格品',
  description: '管理不合格品记录，跟踪问题描述、严重程度、处理状态和责任人',

  api: {
    module: 'qms',
    resource: 'issues',
  },

  fields: [
    {
      name: 'issue_no',
      label: '编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: 'NC-XXXX-XXX',
    },
    {
      name: 'title',
      label: '问题标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: '请输入问题标题',
    },
    {
      name: 'category',
      label: '类别',
      type: 'text',
      listWidth: 120,
      placeholder: '外观缺陷、尺寸问题、包装问题等',
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '严重' },
          { value: 'medium', label: '中等' },
          { value: 'low', label: '轻微' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.severity ?? '');
        const color = severityColorMap[val] || 'default';
        const label = severityLabelMap[val] || val;
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
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'open',
      options: {
        type: 'static',
        options: [
          { value: 'open', label: '待处理' },
          { value: 'in_progress', label: '处理中' },
          { value: 'closed', label: '已关闭' },
          { value: 'resolved', label: '已解决' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'assignee',
      label: '负责人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'description',
      label: '问题描述',
      type: 'textarea',
      placeholder: '请详细描述问题...',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'updated_at',
      label: '更新日期',
      type: 'date',
      readonly: true,
      showInList: false,
    },
    {
      name: 'due_date',
      label: '截止日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'resolution',
      label: '解决方案',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['title', 'issue_no'],
    filters: [
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部等级', value: 'all' },
          { label: '严重', value: 'high' },
          { label: '中等', value: 'medium' },
          { label: '轻微', value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'open' },
          { label: '处理中', value: 'in_progress' },
          { label: '已关闭', value: 'closed' },
          { label: '已解决', value: 'resolved' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: issueStatusColorMap,
      labelMap: issueStatusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['issue_no', 'title', 'category', 'severity', 'status'],
    },
    {
      title: '问题描述',
      fields: ['description', 'assignee', 'due_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增不合格品',
  editTitle: '编辑不合格品',
  detailTitle: '不合格品详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};

export const auditPlanSchema: EntitySchema = {
  entity: 'audit_plan',
  title: '审核管理',
  description: '管理审核计划，跟踪审核类型、状态、审核人和涉及部门',

  api: {
    module: 'qms',
    resource: 'auditPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '审核编号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '审核标题',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'audit_type',
      label: '审核类型',
      type: 'text',
      readonly: true,
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
    },
    {
      name: 'auditor',
      label: '审核人',
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '审核日期',
      type: 'date',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'departments',
      label: '涉及部门',
      type: 'text',
      readonly: true,
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
      readonly: true,
      showInList: false,
    },
    {
      name: 'scope',
      label: '审核范围',
      type: 'textarea',
      readonly: true,
      showInList: false,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      readonly: true,
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      showInList: false,
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
