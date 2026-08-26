/**
 * 集成事件 Schema — 驱动 IntegrationEventsPage 的 CrudPage
 *
 * 列表展示集成同步事件日志，支持按事件类型、状态筛选，
 * 支持详情查看与失败任务重试。
 */

import { Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' }
> = {
  sync: { label: i18n.t('shared.event.k0'), color: 'success' },
  error: { label: i18n.t('shared.event.k1'), color: 'error' },
  warning: { label: i18n.t('shared.event.k2'), color: 'warning' },
};

const EVENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  success: { label: i18n.t('shared.event.k3'), color: 'success' },
  failed: { label: i18n.t('shared.event.k4'), color: 'error' },
  pending: { label: i18n.t('shared.event.k5'), color: 'warning' },
};

const eventFields: SchemaField[] = [
  {
    name: 'time',
    label: i18n.t('shared.event.k6'),
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
    label: i18n.t('shared.event.k7'),
    type: 'select',
    listWidth: 110,
    options: {
      type: 'static',
      options: [
        { value: 'sync', label: i18n.t('shared.event.k8') },
        { value: 'error', label: i18n.t('shared.event.k9') },
        { value: 'warning', label: i18n.t('shared.event.k10') },
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
    label: i18n.t('shared.event.k11'),
    type: 'text',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{String(row.connection_name ?? '')}</Typography>
    ),
  },
  {
    name: 'description',
    label: i18n.t('shared.event.k12'),
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
    label: i18n.t('shared.event.k13'),
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
    label: i18n.t('shared.event.k14'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: [
        { value: 'success', label: i18n.t('shared.event.k15') },
        { value: 'failed', label: i18n.t('shared.event.k16') },
        { value: 'pending', label: i18n.t('shared.event.k17') },
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
  title: i18n.t('shared.event.k18'),
  description: i18n.t('shared.event.k19'),

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
        label: i18n.t('shared.event.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.event.k21'), value: 'all' },
          ...Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.event.k22'),
        type: 'select',
        options: [
          { label: i18n.t('shared.event.k23'), value: 'all' },
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
  detailTitle: i18n.t('shared.event.k24'),
};
