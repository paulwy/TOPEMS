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
  active: { label: '活跃', color: 'success' },
  inactive: { label: '停用', color: 'default' },
  error: { label: '异常', color: 'error' },
  pending: { label: '待配置', color: 'warning' },
};

const connectionFields: SchemaField[] = [
  {
    name: 'name',
    label: '连接名称',
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 240,
    renderCell: (row) => (
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
    label: '描述',
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'type',
    label: '系统类型',
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
    renderCell: (row) => {
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
    label: '状态',
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(CONNECTION_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row) => {
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
    label: '同步频率',
    type: 'text',
    listWidth: 120,
    renderCell: (row) => (
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
    label: '最后同步',
    type: 'datetime',
    listWidth: 160,
    renderCell: (row) => (
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
    label: '成功次数',
    type: 'number',
    align: 'right',
    showInList: false,
  },
  {
    name: 'error_count',
    label: '失败次数',
    type: 'number',
    align: 'right',
    showInList: false,
  },
  {
    name: 'stats',
    label: '同步统计',
    type: 'text',
    listWidth: 180,
    hideInForm: true,
    renderCell: (row) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip
          size='small'
          color='success'
          label={`成功 ${row.success_count ?? 0}`}
          sx={{ height: 22 }}
        />
        {(row.error_count as number) > 0 && (
          <Chip
            size='small'
            color='error'
            label={`失败 ${row.error_count}`}
            sx={{ height: 22 }}
          />
        )}
      </Box>
    ),
  },
];

export const integrationConnectionSchema: EntitySchema = {
  entity: 'integration_connection',
  title: '连接管理',
  description: '管理 ERP/CRM/SCM/WMS/MES 等外部系统连接',

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
        label: '系统类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(CONNECTION_TYPE_CONFIG).map(([value, cfg]) => ({
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
      title: '基本信息',
      fields: ['name', 'description', 'type', 'status'],
    },
    {
      title: '同步配置',
      fields: ['sync_frequency'],
    },
    {
      title: '同步统计',
      fields: ['success_count', 'error_count', 'last_sync_at'],
    },
  ],

  formColCount: 2,
  createTitle: '新建连接',
  editTitle: '编辑连接',
  detailTitle: '连接详情',
};
