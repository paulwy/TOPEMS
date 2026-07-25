import React from 'react';
import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'default',
  in_progress: 'primary',
  completed: 'success',
  paused: 'warning',
  cancelled: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  paused: '暂停',
  cancelled: '已取消',
};

export const projectSchema: EntitySchema = {
  entity: 'rd_project',
  title: '研发项目',
  description: '管理研发项目，包括项目编号、名称、类型、状态、进度、预算等',

  api: {
    module: 'rd',
    resource: 'projects',
  },

  fields: [
    {
      name: 'code',
      label: '项目编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'project_type',
      label: '项目类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '新产品研发', label: '新产品研发' },
          { value: '技术改进', label: '技术改进' },
          { value: '基础研究', label: '基础研究' },
          { value: '应用研究', label: '应用研究' },
          { value: '工艺优化', label: '工艺优化' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.project_type ?? '');
        if (!val) return '-';
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'leader',
      label: '负责人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待开始' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'paused', label: '暂停' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 110,
    },
    {
      name: 'progress',
      label: '进度',
      type: 'number',
      defaultValue: 0,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Stack,
          { direction: 'row', spacing: 1, sx: { alignItems: 'center' } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: val,
            sx: { width: 80 },
          }),
          React.createElement(Typography, { variant: 'body2' }, `${val}%`)
        );
      },
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'budget',
      label: '预算(万元)',
      type: 'number',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.budget;
        if (val == null) return '-';
        return (Number(val) / 10000).toFixed(1);
      },
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
      listWidth: 130,
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
      'code',
      'name',
      'project_type',
      'leader',
      'status',
      'progress',
      'start_date',
      'budget',
    ],
    searchFields: ['code', 'name', 'leader'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待开始', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '暂停', value: 'paused' },
          { label: '已取消', value: 'cancelled' },
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
      fields: ['code', 'name', 'project_type', 'leader', 'status'],
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
  createTitle: '创建研发项目',
  editTitle: '编辑研发项目',
  detailTitle: '项目详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
