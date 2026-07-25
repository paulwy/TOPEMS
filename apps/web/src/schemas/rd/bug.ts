import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const SEVERITY_COLOR_MAP: Record<string, 'default' | 'error' | 'warning'> = {
  critical: 'error',
  major: 'warning',
  minor: 'default',
};

const SEVERITY_LABEL_MAP: Record<string, string> = {
  critical: '严重',
  major: '主要',
  minor: '次要',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const STATUS_COLOR_MAP: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

export const bugSchema: EntitySchema = {
  entity: 'rd_bug',
  title: '缺陷',
  description: '管理项目缺陷和 Bug 追踪',

  api: {
    module: 'rd',
    resource: 'bugs',
  },

  fields: [
    {
      name: 'bug_no',
      label: '缺陷编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'bug_title',
      label: '缺陷标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 250,
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'critical', label: '严重' },
          { value: 'major', label: '主要' },
          { value: 'minor', label: '次要' },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.severity ?? '');
        return React.createElement(Chip, {
          label: SEVERITY_LABEL_MAP[val] || val,
          size: 'small',
          color: SEVERITY_COLOR_MAP[val] || 'default',
        });
      },
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.priority ?? '');
        return React.createElement(Chip, {
          label: PRIORITY_LABEL_MAP[val] || val,
          size: 'small',
          variant: 'outlined',
        });
      },
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
          { value: 'resolved', label: '已解决' },
          { value: 'closed', label: '已关闭' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'assignee',
      label: '指派给',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'create_time',
      label: '创建时间',
      type: 'datetime',
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'description',
      label: '缺陷描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['bug_no', 'bug_title', 'severity', 'priority', 'status', 'assignee', 'create_time'],
    searchFields: ['bug_no', 'bug_title'],
    pageSize: 10,
    filters: [
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '主要', value: 'major' },
          { label: '次要', value: 'minor' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '待处理', value: 'open' },
          { label: '处理中', value: 'in_progress' },
          { label: '已解决', value: 'resolved' },
          { label: '已关闭', value: 'closed' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['bug_title', 'severity', 'priority', 'status', 'assignee'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建缺陷',
  editTitle: '编辑缺陷',
  detailTitle: '缺陷详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
