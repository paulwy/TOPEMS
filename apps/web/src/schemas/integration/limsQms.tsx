import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';

export const LIMS_QMS_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: '已同步', color: 'success' },
  pending: { label: '待同步', color: 'warning' },
  failed: { label: '失败', color: 'error' },
};

const limsQmsFields: SchemaField[] = [
  {
    name: 'sample_name',
    label: '样本名称',
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
          {String(row.sample_name ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.lims_sample_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'lims_sample_id',
    label: 'LIMS 样本 ID',
    type: 'text',
    required: true,
    showInList: false,
    placeholder: '输入 LIMS 样本 UUID',
  },
  {
    name: 'inspection_result',
    label: '检验结果',
    type: 'text',
    listWidth: 140,
    placeholder: '输入检验结果（可选）',
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.inspection_result ?? '-')}
      </Typography>
    ),
  },
  {
    name: 'inspection_notes',
    label: '备注',
    type: 'textarea',
    showInList: false,
    placeholder: '输入备注信息（可选）',
  },
  {
    name: 'sync_status',
    label: '状态',
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(LIMS_QMS_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg =
        LIMS_QMS_STATUS_CONFIG[row.sync_status as string] || LIMS_QMS_STATUS_CONFIG.pending;
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
      <Typography
        variant='body2'
        color='text.secondary'
      >
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
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {new Date(String(row.created_at)).toLocaleString('zh-CN')}
      </Typography>
    ),
  },
];

export const limsQmsSyncSchema: EntitySchema = {
  entity: 'integration_lims_qms_sync',
  title: 'LIMS-QMS 同步',
  description: '管理 LIMS 样本与 QMS 检验的同步',

  api: {
    module: 'integration',
    resource: 'limsQmsSyncs',
  },

  fields: limsQmsFields,

  list: {
    searchFields: ['sample_name', 'lims_sample_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['lims_sample_id', 'sample_name', 'inspection_result', 'inspection_notes'],
    },
  ],

  formColCount: 1,
  createTitle: '创建 LIMS-QMS 同步',
  detailTitle: '同步详情',
};
