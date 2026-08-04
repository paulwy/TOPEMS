import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { FileText } from 'lucide-react';
import type { EntitySchema } from '@/schema';

type ExceptionType = 'timeout' | 'error' | 'stuck';
type ExceptionStatus = 'pending' | 'processing' | 'resolved';

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  timeout: '超时',
  error: '错误',
  stuck: '卡顿',
};

const EXCEPTION_TYPE_COLORS: Record<ExceptionType, 'warning' | 'error' | 'info'> = {
  timeout: 'warning',
  error: 'error',
  stuck: 'info',
};

const STATUS_LABELS: Record<ExceptionStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
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
  title: '流程异常监控',
  description: '监控工作流异常实例，支持重试和忽略操作',

  api: {
    module: 'workflow',
    resource: 'monitor',
  },

  fields: [
    {
      name: 'instanceId',
      label: '实例ID',
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
      label: '流程名称',
      type: 'text',
      readonly: true,
    },
    {
      name: 'currentNode',
      label: '当前节点',
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
      label: '异常类型',
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
      label: '异常描述',
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
      label: '发生时间',
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
      label: '状态',
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
        label: '异常类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...exceptionTypeOptions],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...statusOptions],
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
