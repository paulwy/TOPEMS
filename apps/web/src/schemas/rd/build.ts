import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  success: 'success',
  failed: 'error',
  running: 'warning',
  pending: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '进行中',
  pending: '待构建',
};

const BUILD_TYPE_LABEL_MAP: Record<string, string> = {
  manual: '手动',
  auto: '自动',
  scheduled: '定时',
};

export const buildSchema: EntitySchema = {
  entity: 'rd_build',
  title: '构建管理',
  description: '管理代码构建和构建流水线',

  api: {
    module: 'rd',
    resource: 'builds',
  },

  fields: [
    {
      name: 'build_no',
      label: '构建编号',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitBranch, {
            size: 16,
            color: 'primary.main',
          }),
          React.createElement(
            Typography,
            { variant: 'body2', sx: { fontWeight: 500 } },
            String(row.build_no ?? '')
          )
        );
      },
    },
    {
      name: 'project_id',
      label: '项目ID',
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'project_name',
      label: '项目',
      type: 'text',
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'branch',
      label: '分支',
      type: 'text',
      required: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.branch ?? '');
        if (!val) return '-';
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'commit_hash',
      label: '提交',
      type: 'text',
      required: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.commit_hash ?? '');
        if (!val) return '-';
        return React.createElement(
          Typography,
          { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: '0.75rem' } },
          val.length > 8 ? `${val.slice(0, 8)}...` : val
        );
      },
    },
    {
      name: 'build_type',
      label: '类型',
      type: 'select',
      defaultValue: 'manual',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'manual', label: '手动' },
          { value: 'auto', label: '自动' },
          { value: 'scheduled', label: '定时' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.build_type ?? '');
        const label = BUILD_TYPE_LABEL_MAP[val] || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      listWidth: 130,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'success', label: '成功' },
          { value: 'failed', label: '失败' },
          { value: 'running', label: '进行中' },
          { value: 'pending', label: '待构建' },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.status ?? '');
        const label = STATUS_LABEL_MAP[val] || val;
        const color = STATUS_COLOR_MAP[val] || 'default';
        const icon =
          val === 'success'
            ? React.createElement(CheckCircle, { size: 14, color: 'success.main' })
            : val === 'failed'
              ? React.createElement(XCircle, { size: 14, color: 'error.main' })
              : val === 'running'
                ? React.createElement(Clock, { size: 14, color: 'warning.main' })
                : null;
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
          icon,
          React.createElement(Chip, {
            label,
            size: 'small',
            color,
          })
        );
      },
    },
    {
      name: 'duration',
      label: '耗时',
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.duration;
        return val == null ? '-' : String(val);
      },
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'logs',
      label: '构建日志',
      type: 'textarea',
      showInList: false,
      hideInForm: true,
    },
  ],

  list: {
    columns: [
      'build_no',
      'project_name',
      'branch',
      'commit_hash',
      'build_type',
      'status',
      'duration',
    ],
    searchFields: ['build_no', 'project_name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failed' },
          { label: '进行中', value: 'running' },
          { label: '待构建', value: 'pending' },
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
      title: '构建信息',
      fields: ['project_id', 'branch', 'commit_hash', 'build_type'],
    },
  ],

  formColCount: 2,
  createTitle: '手动构建',
  editTitle: '编辑构建',
  detailTitle: '构建详情',

  actions: ['create', 'detail'],

  renderDetail: (row) => {
    const status = String(row.status ?? '');
    const statusLabel = STATUS_LABEL_MAP[status] || status;
    const statusColor = STATUS_COLOR_MAP[status] || 'default';

    return React.createElement(
      Box,
      { sx: { py: 2 } },
      React.createElement(
        Typography,
        { variant: 'h6', sx: { fontWeight: 'bold' } },
        String(row.build_no ?? '')
      ),
      React.createElement(
        Box,
        { sx: { display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' } },
        React.createElement(Chip, {
          label: String(row.project_name ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
        React.createElement(Chip, {
          label: String(row.branch ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
        React.createElement(Chip, {
          label: statusLabel,
          size: 'small',
          color: statusColor,
        })
      ),
      React.createElement(
        Box,
        { sx: { mt: 3 } },
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary' },
          `提交: ${row.commit_hash ?? '-'}`
        ),
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary', sx: { mt: 1 } },
          `耗时: ${row.duration ?? '-'}`
        ),
        React.createElement(
          Typography,
          { variant: 'subtitle2', color: 'text.secondary', sx: { mt: 1 } },
          `创建时间: ${row.created_at ?? '-'}`
        )
      ),
      row.logs
        ? React.createElement(
            Box,
            { sx: { mt: 3 } },
            React.createElement(
              Typography,
              { variant: 'subtitle2', color: 'text.secondary' },
              '构建日志'
            ),
            React.createElement(
              Box,
              {
                sx: {
                  mt: 1,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  maxHeight: 200,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                },
              },
              String(row.logs)
            )
          )
        : null
    );
  },
};
