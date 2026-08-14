import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { FileText } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

type ExceptionType = 'timeout' | 'error' | 'stuck';
type ExceptionStatus = 'pending' | 'processing' | 'resolved';

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  timeout: i18n.t('shared.monitor.k0'),
  error: i18n.t('shared.monitor.k1'),
  stuck: i18n.t('shared.monitor.k2'),
};

const EXCEPTION_TYPE_COLORS: Record<ExceptionType, 'warning' | 'error' | 'info'> = {
  timeout: 'warning',
  error: 'error',
  stuck: 'info',
};

const STATUS_LABELS: Record<ExceptionStatus, string> = {
  pending: i18n.t('shared.monitor.k3'),
  processing: i18n.t('shared.monitor.k4'),
  resolved: i18n.t('shared.monitor.k5'),
};

const STATUS_COLORS: Record<ExceptionStatus, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  processing: 'info',
  resolved: 'success',
};

const exceptionTypeOptions = Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const workflowMonitorSchema: EntitySchema = {
  entity: 'workflow-monitor',
  title: i18n.t('shared.monitor.k6'),
  description: i18n.t('shared.monitor.k7'),

  api: {
    module: 'workflow',
    resource: 'monitor',
  },

  fields: [
    {
      name: 'instanceId',
      label: i18n.t('shared.monitor.id_8'),
      type: 'text',
      readonly: true,
      listMinWidth: 200,
      renderCell: (row: Record<string, unknown>) => {
        const exceptionType = row.exceptionType as ExceptionType;
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          React.createElement(
            Box,
            {
              sx: {
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor:
                  exceptionType === 'error'
                    ? 'error.light'
                    : exceptionType === 'timeout'
                      ? 'warning.light'
                      : 'info.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
            },
            React.createElement(FileText, {
              size: 14,
              color:
                exceptionType === 'error'
                  ? 'error.main'
                  : exceptionType === 'timeout'
                    ? 'warning.main'
                    : 'info.main',
            })
          ),
          React.createElement(
            Typography,
            {
              variant: 'body2',
              sx: { fontWeight: 500, fontFamily: 'monospace' },
            },
            String(row.instanceId ?? '')
          )
        );
      },
    },
    {
      name: 'workflowName',
      label: i18n.t('shared.monitor.k9'),
      type: 'text',
      readonly: true,
    },
    {
      name: 'currentNode',
      label: i18n.t('shared.monitor.k10'),
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Typography,
          { variant: 'body2', color: 'text.secondary' },
          String(row.currentNode ?? '')
        ),
    },
    {
      name: 'exceptionType',
      label: i18n.t('shared.monitor.k11'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: exceptionTypeOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const type = row.exceptionType as ExceptionType;
        return React.createElement(Chip, {
          size: 'small',
          label: EXCEPTION_TYPE_LABELS[type] || type,
          color: EXCEPTION_TYPE_COLORS[type] || 'default',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'exceptionDescription',
      label: i18n.t('shared.monitor.k12'),
      type: 'text',
      readonly: true,
      listMinWidth: 280,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Typography,
          {
            variant: 'body2',
            color: 'text.secondary',
            sx: {
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          String(row.exceptionDescription ?? '')
        ),
    },
    {
      name: 'occurredAt',
      label: i18n.t('shared.monitor.k13'),
      type: 'datetime',
      readonly: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          Typography,
          { variant: 'body2', color: 'text.secondary' },
          String(row.occurredAt ?? '')
        ),
    },
    {
      name: 'status',
      label: i18n.t('shared.monitor.k14'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: statusOptions,
      },
      renderCell: (row: Record<string, unknown>) => {
        const status = row.status as ExceptionStatus;
        return React.createElement(Chip, {
          size: 'small',
          label: STATUS_LABELS[status] || status,
          color: STATUS_COLORS[status] || 'default',
          variant: 'outlined',
        });
      },
    },
  ],

  list: {
    searchFields: ['workflowName', 'instanceId'],
    pageSize: 10,
    filters: [
      {
        id: 'exceptionType',
        label: i18n.t('shared.monitor.k15'),
        type: 'select',
        options: [{ label: i18n.t('shared.monitor.k16'), value: 'all' }, ...exceptionTypeOptions],
      },
      {
        id: 'status',
        label: i18n.t('shared.monitor.k17'),
        type: 'select',
        options: [{ label: i18n.t('shared.monitor.k18'), value: 'all' }, ...statusOptions],
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
