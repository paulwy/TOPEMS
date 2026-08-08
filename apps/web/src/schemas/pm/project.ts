import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'primary',
  active: 'success',
  completed: 'primary',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const PROJECT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'research', label: '科研项目' },
  { value: 'production', label: '生产项目' },
  { value: 'construction', label: '施工项目' },
  { value: 'design', label: '设计项目' },
  { value: 'service', label: '服务项目' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
});

export const projectSchema: EntitySchema = {
  entity: 'pm_project',
  title: '项目管理',
  description: '管理所有类型的项目，跟踪进度和状态',

  api: {
    module: 'pm',
    resource: 'projects',
  },

  fields: [
    {
      name: 'name',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'code',
      label: '项目编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'project_type',
      label: '类型',
      type: 'select',
      required: true,
      defaultValue: 'research',
      options: { type: 'static', options: PROJECT_TYPE_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'progress',
      label: '进度',
      type: 'number',
      defaultValue: 0,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
          React.createElement(
            Box,
            { sx: { width: 96 } },
            React.createElement(LinearProgress, {
              variant: 'determinate',
              value: val,
              sx: { height: 8, borderRadius: 4 },
            })
          ),
          React.createElement(
            Typography,
            { sx: { fontSize: '0.875rem', color: 'grey.600' } },
            `${val}%`
          )
        );
      },
    },
    {
      name: 'budget',
      label: '预算',
      type: 'number',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.budget as number | undefined;
        if (!val) return '-';
        return CURRENCY_FORMATTER.format(val);
      },
    },
    {
      name: 'leader',
      label: '负责人',
      type: 'text',
      listWidth: 100,
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 150,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 150,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'code',
      'project_type',
      'status',
      'progress',
      'budget',
      'start_date',
      'end_date',
    ],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'project_type',
        label: '类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...PROJECT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'project_type', 'status', 'leader'],
    },
    {
      title: '计划与预算',
      fields: ['start_date', 'end_date', 'budget', 'progress'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '创建项目',
  editTitle: '编辑项目',
  detailTitle: '项目详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
