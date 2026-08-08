import React from 'react';
import { Chip, Box, Typography, Avatar, Stack } from '@mui/material';
import { GitBranch, FileText, Clock, User } from 'lucide-react';
import type { EntitySchema } from '@/schema';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'claimed';
type ApprovalPriority = 'high' | 'medium' | 'low';

const PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_COLORS: Record<ApprovalPriority, 'error' | 'warning' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  claimed: '已认领',
};

const STATUS_COLORS: Record<ApprovalStatus, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  claimed: 'info',
};

const WORKFLOW_TYPE_COLORS: Record<string, string> = {
  采购管理: 'primary.main',
  人事管理: 'success.main',
  财务管理: 'warning.main',
  法务管理: 'secondary.main',
  IT管理: 'cyan.500',
};

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const workflowApprovalSchema: EntitySchema = {
  entity: 'workflow-approval',
  title: '审批任务',
  description: '管理工作流审批任务',

  api: {
    module: 'workflow',
    resource: 'approvalTasks',
  },

  fields: [
    {
      name: 'title',
      label: '流程标题',
      type: 'text',
      readonly: true,
      listMinWidth: 280,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 1.5, sx: { alignItems: 'center' } },
          React.createElement(Avatar, {
            sx: {
              width: 36,
              height: 36,
              bgcolor: 'primary.light',
            },
            children: React.createElement(GitBranch, { size: 18, color: 'primary.main' }),
          }),
          React.createElement(
            Box,
            { sx: { minWidth: 0 } },
            React.createElement(
              Typography,
              {
                variant: 'body2',
                sx: {
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              row.title as React.ReactNode
            ),
            React.createElement(
              Typography,
              {
                variant: 'caption',
                sx: { color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 },
              },
              React.createElement(FileText, { size: 12 }),
              row.workflowName as React.ReactNode
            )
          )
        ),
    },
    {
      name: 'workflowType',
      label: '流程类型',
      type: 'text',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const workflowType = row.workflowType as string;
        return React.createElement(Chip, {
          size: 'small',
          label: workflowType,
          sx: {
            bgcolor: `${WORKFLOW_TYPE_COLORS[workflowType] || 'grey.500'}15`,
            color: WORKFLOW_TYPE_COLORS[workflowType] || 'grey.500',
            border: 'none',
          },
          variant: 'outlined',
        });
      },
    },
    {
      name: 'initiator',
      label: '发起人',
      type: 'text',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(User, {
            size: 14,
            style: { color: 'var(--mui-palette-text-secondary)' },
          }),
          React.createElement(
            Typography,
            { variant: 'body2', color: 'text.secondary' },
            row.initiator as React.ReactNode
          )
        ),
    },
    {
      name: 'receivedAt',
      label: '接收时间',
      type: 'datetime',
      readonly: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Stack,
          { direction: 'row', spacing: 0.5, sx: { alignItems: 'center' } },
          React.createElement(Clock, {
            size: 14,
            style: { color: 'var(--mui-palette-text-secondary)' },
          }),
          React.createElement(
            Typography,
            { variant: 'body2', color: 'text.secondary' },
            row.receivedAt ? new Date(row.receivedAt as string).toLocaleString('zh-CN') : '-'
          )
        ),
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      readonly: true,
      listWidth: 100,
      options: {
        type: 'static',
        options: priorityOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const priority = row.priority as ApprovalPriority;
        return React.createElement(Chip, {
          size: 'small',
          color: PRIORITY_COLORS[priority] || 'default',
          label: PRIORITY_LABELS[priority] || priority,
          variant: 'outlined',
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      readonly: true,
      listWidth: 110,
      options: {
        type: 'static',
        options: statusOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const status = row.status as ApprovalStatus;
        return React.createElement(Chip, {
          size: 'small',
          color: STATUS_COLORS[status] || 'default',
          label: STATUS_LABELS[status] || status,
          variant: 'outlined',
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    searchFields: ['title', 'workflowName', 'initiator'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...statusOptions],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [{ label: '全部优先级', value: 'all' }, ...priorityOptions],
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLORS as Record<
        string,
        'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
      >,
      labelMap: STATUS_LABELS,
    },
  },

  actions: ['detail'],
};
