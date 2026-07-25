import React from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  completed: 'success',
  active: 'primary',
  planning: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  completed: '已完成',
  active: '进行中',
  planning: '规划中',
};

export const milestoneSchema: EntitySchema = {
  entity: 'rd_milestone',
  title: '里程碑',
  description: '管理研发里程碑，包括名称、日期、进度、关联项目和状态',

  api: {
    module: 'rd',
    resource: 'milestones',
  },

  fields: [
    {
      name: 'name',
      label: '里程碑名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'progress',
      label: '进度',
      type: 'number',
      defaultValue: 0,
      listWidth: 170,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = Number(row.progress ?? 0);
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: val,
            sx: { flex: 1, height: 8, borderRadius: 4 },
          }),
          React.createElement(Typography, { variant: 'caption' }, `${val}%`)
        );
      },
    },
    {
      name: 'related_project',
      label: '关联项目',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planning',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'completed', label: '已完成' },
          { value: 'active', label: '进行中' },
          { value: 'planning', label: '规划中' },
        ],
      },
      listWidth: 110,
    },
  ],

  list: {
    columns: ['name', 'start_date', 'end_date', 'progress', 'related_project', 'status'],
    searchFields: ['name', 'related_project'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '进行中', value: 'active' },
          { label: '已完成', value: 'completed' },
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
      fields: ['name', 'start_date', 'end_date', 'related_project'],
    },
  ],

  formColCount: 2,
  createTitle: '新建里程碑',
  editTitle: '编辑里程碑',
  detailTitle: '里程碑详情',

  actions: ['create', 'detail'],

  renderDetail: (row) => {
    const status = String(row.status ?? '');
    const progress = Number(row.progress ?? 0);
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';

    return React.createElement(
      Box,
      { sx: { py: 2 } },
      React.createElement(
        Typography,
        { variant: 'h6', sx: { fontWeight: 'bold' } },
        String(row.name ?? '')
      ),
      React.createElement(
        Stack,
        { direction: 'row', spacing: 2, sx: { mt: 2 } },
        React.createElement(Chip, {
          label: statusLabel,
          size: 'small',
          color: statusColor,
        })
      ),
      React.createElement(
        Box,
        { sx: { mt: 3 } },
        React.createElement(Typography, { variant: 'subtitle2', color: 'text.secondary' }, '进度'),
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 2, mt: 1 } },
          React.createElement(LinearProgress, {
            variant: 'determinate',
            value: progress,
            sx: { flex: 1, height: 10, borderRadius: 4 },
          }),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            `${progress}%`
          )
        )
      ),
      React.createElement(
        Stack,
        { direction: 'row', spacing: 4, sx: { mt: 3 } },
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            '开始日期'
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.start_date ?? '-')
          )
        ),
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            '结束日期'
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.end_date ?? '-')
          )
        ),
        React.createElement(
          Box,
          null,
          React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            '关联项目'
          ),
          React.createElement(
            Typography,
            { variant: 'body1', sx: { fontWeight: 'bold' } },
            String(row.related_project ?? '-')
          )
        )
      )
    );
  },
};
