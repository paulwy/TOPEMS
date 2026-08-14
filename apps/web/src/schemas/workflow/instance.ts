import React from 'react';
import { Chip, Box, Typography, Avatar } from '@mui/material';
import { PlaySquare, GitBranch, Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'error' | 'warning' | 'default' }
> = {
  running: { label: i18n.t('shared.instance.k0'), color: 'primary' },
  completed: { label: i18n.t('shared.instance.k1'), color: 'success' },
  cancelled: { label: i18n.t('shared.instance.k2'), color: 'error' },
  suspended: { label: i18n.t('shared.instance.k3'), color: 'warning' },
  terminated: { label: i18n.t('shared.instance.k4'), color: 'error' },
  pending: { label: i18n.t('shared.instance.k5'), color: 'warning' },
  rejected: { label: i18n.t('shared.instance.k6'), color: 'error' },
};

const TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'info' | 'warning' }
> = {
  approval: { label: i18n.t('shared.instance.k7'), color: 'primary' },
  business: { label: i18n.t('shared.instance.k8'), color: 'success' },
  notification: { label: i18n.t('shared.instance.k9'), color: 'info' },
  automation: { label: i18n.t('shared.instance.k10'), color: 'warning' },
};

const statusOptions = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

const typeOptions = Object.entries(TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const workflowInstanceSchema: EntitySchema = {
  entity: 'workflow-instance',
  title: i18n.t('shared.instance.k11'),
  description: i18n.t('shared.instance.k12'),

  api: {
    module: 'workflow',
    resource: 'instances',
  },

  fields: [
    {
      name: 'workflow_name',
      label: i18n.t('shared.instance.k13'),
      type: 'text',
      readonly: true,
      listMinWidth: 240,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1.5 } },
          React.createElement(
            Box,
            {
              sx: {
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            React.createElement(PlaySquare, { size: 18, color: 'primary.main' })
          ),
          React.createElement(
            Box,
            null,
            React.createElement(
              Typography,
              { variant: 'body2', sx: { fontWeight: 600 } },
              (row.workflow_name || row.name || '-') as string
            ),
            React.createElement(
              Typography,
              { variant: 'caption', color: 'text.secondary' },
              (row.workflow_id || '') as string
            )
          )
        ),
    },
    {
      name: 'workflow_type',
      label: i18n.t('shared.instance.k14'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: typeOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const workflowType = (row.data as Record<string, unknown>)?.type as string;
        const typeConfig = TYPE_CONFIG[workflowType];
        return React.createElement(Chip, {
          size: 'small',
          label: typeConfig?.label || workflowType || '-',
          color: typeConfig?.color || 'default',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'initiator_name',
      label: i18n.t('shared.instance.k15'),
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(Avatar, {
            sx: {
              width: 24,
              height: 24,
              fontSize: '0.75rem',
              bgcolor: 'primary.light',
              color: 'primary.main',
            },
            children: (row.start_user_name || 'U').toString().charAt(0),
          }),
          React.createElement(
            Typography,
            { variant: 'body2' },
            (row.start_user_name || '-') as string
          )
        ),
    },
    {
      name: 'currentnode',
      label: i18n.t('shared.instance.k16'),
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(GitBranch, { size: 14, color: 'text.disabled' }),
          React.createElement(
            Typography,
            { variant: 'body2', color: 'text.secondary' },
            (row.currentnode || '-') as string
          )
        ),
    },
    {
      name: 'status',
      label: i18n.t('shared.instance.k17'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: statusOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const status = row.status as string;
        const statusConfig = STATUS_CONFIG[status];
        return React.createElement(Chip, {
          size: 'small',
          label: statusConfig?.label || status,
          color: statusConfig?.color || 'default',
        });
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'started_at',
      label: i18n.t('shared.instance.k18'),
      type: 'datetime',
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(Clock, { size: 14, color: 'text.disabled' }),
          React.createElement(
            Typography,
            { variant: 'body2', color: 'text.secondary' },
            (row.started_at || row.created_at || '-') as string
          )
        ),
    },
  ],

  list: {
    searchFields: ['workflow_name', 'start_user_name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('shared.instance.k19'),
        type: 'select',
        options: [{ label: i18n.t('shared.instance.k20'), value: 'all' }, ...statusOptions],
      },
      {
        id: 'type',
        label: i18n.t('shared.instance.k21'),
        type: 'select',
        options: [{ label: i18n.t('shared.instance.k22'), value: 'all' }, ...typeOptions],
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: Object.fromEntries(
        Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.color])
      ) as Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'>,
      labelMap: Object.fromEntries(Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])),
    },
  },

  actions: ['detail'],
};
