import React from 'react';
import { Chip, Box, Typography, Avatar, Stack } from '@mui/material';
import { GitBranch, FileText, Clock, User } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'claimed';
type ApprovalPriority = 'high' | 'medium' | 'low';

const PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  high: i18n.t('shared.approval.k0'),
  medium: i18n.t('shared.approval.k1'),
  low: i18n.t('shared.approval.k2'),
};

const PRIORITY_COLORS: Record<ApprovalPriority, 'error' | 'warning' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: i18n.t('shared.approval.k3'),
  approved: i18n.t('shared.approval.k4'),
  rejected: i18n.t('shared.approval.k5'),
  claimed: i18n.t('shared.approval.k6'),
};

const STATUS_COLORS: Record<ApprovalStatus, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  claimed: 'info',
};

const WORKFLOW_TYPE_COLORS: Record<string, string> = {
  [i18n.t('schemas.approval.k0')]: 'primary.main',
  [i18n.t('schemas.approval.k1')]: 'success.main',
  [i18n.t('schemas.approval.k2')]: 'warning.main',
  [i18n.t('schemas.approval.k3')]: 'secondary.main',
  [i18n.t('schemas.approval.k4')]: 'cyan.500',
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
  title: i18n.t('shared.approval.k7'),
  description: i18n.t('shared.approval.k8'),

  api: {
    module: 'workflow',
    resource: 'approvalTasks',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('shared.approval.k9'),
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
      label: i18n.t('shared.approval.k10'),
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
      label: i18n.t('shared.approval.k11'),
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
      label: i18n.t('shared.approval.k12'),
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
      label: i18n.t('shared.approval.k13'),
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
      label: i18n.t('shared.approval.k14'),
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
        label: i18n.t('shared.approval.k15'),
        type: 'select',
        options: [{ label: i18n.t('shared.approval.k16'), value: 'all' }, ...statusOptions],
      },
      {
        id: 'priority',
        label: i18n.t('shared.approval.k17'),
        type: 'select',
        options: [{ label: i18n.t('shared.approval.k18'), value: 'all' }, ...priorityOptions],
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
