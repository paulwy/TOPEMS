/**
 * 集成连接 Schema — 驱动 IntegrationConnectionsPage 的 CrudPage
 *
 * 管理 ERP/CRM/SCM/WMS/MES 等外部系统连接，支持创建、编辑、
 * 删除、测试等完整 CRUD 操作。
 */

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Database } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

export const CONNECTION_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'default' }
> = {
  erp: { label: 'ERP', color: 'primary' },
  crm: { label: 'CRM', color: 'success' },
  scm: { label: 'SCM', color: 'info' },
  wms: { label: 'WMS', color: 'warning' },
  mes: { label: 'MES', color: 'default' },
};

export const CONNECTION_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  active: { label: i18n.t('shared.connection.k0'), color: 'success' },
  inactive: { label: i18n.t('shared.connection.k1'), color: 'default' },
  error: { label: i18n.t('shared.connection.k2'), color: 'error' },
  pending: { label: i18n.t('shared.connection.k3'), color: 'warning' },
};

const connectionFields: SchemaField[] = [
  {
    name: 'name',
    label: i18n.t('shared.connection.k4'),
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 240,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Database
            size={18}
            color='primary'
          />
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {String(row.name ?? '')}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {String(row.description ?? '')}
          </Typography>
        </Box>
      </Box>
    ),
  },
  {
    name: 'description',
    label: i18n.t('shared.connection.k5'),
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'type',
    label: i18n.t('shared.connection.k6'),
    type: 'select',
    required: true,
    listWidth: 110,
    options: {
      type: 'static',
      options: Object.entries(CONNECTION_TYPE_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = CONNECTION_TYPE_CONFIG[row.type as string] || {
        label: String(row.type ?? ''),
        color: 'default' as const,
      };
      return (
        <Chip
          size='small'
          color={cfg.color}
          label={cfg.label}
          variant='outlined'
        />
      );
    },
  },
  {
    name: 'status',
    label: i18n.t('shared.connection.k7'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(CONNECTION_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = CONNECTION_STATUS_CONFIG[row.status as string] || {
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
  {
    name: 'sync_frequency',
    label: i18n.t('shared.connection.k8'),
    type: 'text',
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.sync_frequency ?? '')}
      </Typography>
    ),
  },
  {
    name: 'last_sync_at',
    label: i18n.t('shared.connection.k9'),
    type: 'datetime',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.last_sync_at ?? '')}
      </Typography>
    ),
  },
  {
    name: 'success_count',
    label: i18n.t('shared.connection.k10'),
    type: 'number',
    align: 'right',
    showInList: false,
  },
  {
    name: 'error_count',
    label: i18n.t('shared.connection.k11'),
    type: 'number',
    align: 'right',
    showInList: false,
  },
  {
    name: 'stats',
    label: i18n.t('shared.connection.k12'),
    type: 'text',
    listWidth: 180,
    hideInForm: true,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip
          size='small'
          color='success'
          label={`${i18n.t('shared.connection.k13')}${row.success_count ?? 0}`}
          sx={{ height: 22 }}
        />
        {(row.error_count as number) > 0 && (
          <Chip
            size='small'
            color='error'
            label={`${i18n.t('shared.connection.k14')}${row.error_count}`}
            sx={{ height: 22 }}
          />
        )}
      </Box>
    ),
  },
];

export const integrationConnectionSchema: EntitySchema = {
  entity: 'integration_connection',
  title: i18n.t('shared.connection.k15'),
  description: i18n.t('shared.connection.k16'),

  api: {
    module: 'integration',
    resource: 'connections',
  },

  fields: connectionFields,

  list: {
    searchFields: ['name', 'description'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.connection.k17'),
        type: 'select',
        options: [
          { label: i18n.t('shared.connection.k18'), value: 'all' },
          ...Object.entries(CONNECTION_TYPE_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.connection.k19'),
        type: 'select',
        options: [
          { label: i18n.t('shared.connection.k20'), value: 'all' },
          ...Object.entries(CONNECTION_STATUS_CONFIG).map(([value, cfg]) => ({
            label: cfg.label,
            value,
          })),
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.connection.k21'),
      fields: ['name', 'description', 'type', 'status'],
    },
    {
      title: i18n.t('shared.connection.k22'),
      fields: ['sync_frequency'],
    },
    {
      title: i18n.t('shared.connection.k23'),
      fields: ['success_count', 'error_count', 'last_sync_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.connection.k24'),
  editTitle: i18n.t('shared.connection.k25'),
  detailTitle: i18n.t('shared.connection.k26'),
};
