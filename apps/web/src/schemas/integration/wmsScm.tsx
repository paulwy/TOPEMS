import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';

export const WMS_SCM_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: '已同步', color: 'success' },
  pending: { label: '待同步', color: 'warning' },
  failed: { label: '失败', color: 'error' },
};

const wmsScmFields: SchemaField[] = [
  {
    name: 'item_name',
    label: '物品名称',
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 240,
    renderCell: (row: Record<string, unknown>) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {String(row.item_name ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.wms_inventory_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'wms_inventory_id',
    label: 'WMS 库存 ID',
    type: 'text',
    required: true,
    showInList: false,
    placeholder: '输入 WMS 库存 UUID',
  },
  {
    name: 'quantity',
    label: '数量',
    type: 'number',
    sortable: true,
    listWidth: 120,
    placeholder: '输入数量（可选）',
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>
        {String(row.quantity ?? '-')} {String(row.unit ?? '')}
      </Typography>
    ),
  },
  {
    name: 'unit',
    label: '单位',
    type: 'text',
    showInList: false,
    placeholder: '输入单位（可选）',
  },
  {
    name: 'sync_status',
    label: '状态',
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(WMS_SCM_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = WMS_SCM_STATUS_CONFIG[row.sync_status as string] || WMS_SCM_STATUS_CONFIG.pending;
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
    name: 'last_synced_at',
    label: '最后同步',
    type: 'datetime',
    sortable: true,
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2' color='text.secondary'>
        {row.last_synced_at
          ? new Date(String(row.last_synced_at)).toLocaleString('zh-CN')
          : '从未同步'}
      </Typography>
    ),
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    sortable: true,
    listWidth: 160,
    hideInForm: true,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2' color='text.secondary'>
        {new Date(String(row.created_at)).toLocaleString('zh-CN')}
      </Typography>
    ),
  },
];

export const wmsScmSyncSchema: EntitySchema = {
  entity: 'integration_wms_scm_sync',
  title: 'WMS-SCM 同步',
  description: '管理 WMS 库存与 SCM 供应的同步',

  api: {
    module: 'integration',
    resource: 'wmsScmSyncs',
  },

  fields: wmsScmFields,

  list: {
    searchFields: ['item_name', 'wms_inventory_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['wms_inventory_id', 'item_name', 'quantity', 'unit'],
    },
  ],

  formColCount: 1,
  createTitle: '创建 WMS-SCM 同步',
  detailTitle: '同步详情',
};
