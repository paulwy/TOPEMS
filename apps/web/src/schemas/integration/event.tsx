/**
 * 集成事件 Schema — 驱动 IntegrationEventsPage 的 CrudPage
 *
 * 列表展示集成同步事件日志，支持按事件类型、状态筛选，
 * 支持详情查看与失败任务重试。
 */

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';

export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' }
> = {
  sync: { label: '同步', color: 'success' },
  error: { label: '错误', color: 'error' },
  warning: { label: '警告', color: 'warning' },
};

export const EVENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
  pending: { label: '进行中', color: 'warning' },
};

const eventFields: SchemaField[] = [
  {
    name: 'time',
    label: '时间',
    type: 'datetime',
    sortable: true,
    listWidth: 180,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        sx={{ fontFamily: 'monospace' }}
      >
        {String(row.time ?? '')}
      </Typography>
    ),
  },
  {
    name: 'event_type',
    label: '事件类型',
    type: 'select',
    listWidth: 110,
    options: {
      type: 'static',
      options: [
        { value: 'sync', label: '同步' },
        { value: 'error', label: '错误' },
        { value: 'warning', label: '警告' },
      ],
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = EVENT_TYPE_CONFIG[row.event_type as string] || {
        label: String(row.event_type ?? ''),
        color: 'info' as const,
      };
      return (
        <Chip
          size='small'
          color={cfg.color}
          label={cfg.label}
        />
      );
    },
  },
  {
    name: 'connection_name',
    label: '连接名称',
    type: 'text',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{String(row.connection_name ?? '')}</Typography>
    ),
  },
  {
    name: 'description',
    label: '描述',
    type: 'textarea',
    listWidth: 300,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{
          maxWidth: 300,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {String(row.description ?? '')}
      </Typography>
    ),
  },
  {
    name: 'records_count',
    label: '记录数',
    type: 'number',
    align: 'right',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const count = row.records_count as number;
      return (
        <Typography
          variant='body2'
          sx={{ fontFamily: 'monospace' }}
        >
          {count > 0 ? count : '-'}
        </Typography>
      );
    },
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { value: 'success', label: '成功' },
        { value: 'failed', label: '失败' },
        { value: 'pending', label: '进行中' },
      ],
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = EVENT_STATUS_CONFIG[row.status as string] || {
        label: String(row.status ?? ''),
        color: 'default' as const,
      };
      return (
        <Chip
          size='small'
          color={cfg.color}
          label={cfg.label}
        />
      );
    },
  },
];

export const integrationEventSchema: EntitySchema = {
  entity: 'integration_event',
  title: '事件日志',
  description: '查看集成同步事件日志，支持失败任务重试',

  api: {
    module: 'integration',
    resource: 'events',
  },

  fields: eventFields,

  list: {
    searchFields: ['description', 'connection_name'],
    pageSize: 10,
    filters: [
      {
        id: 'event_type',
        label: '事件类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(EVENT_STATUS_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '事件详情',
};
