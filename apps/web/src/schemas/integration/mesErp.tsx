import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';

export const MES_ERP_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: '已同步', color: 'success' },
  pending: { label: '待同步', color: 'warning' },
  failed: { label: '失败', color: 'error' },
};

const mesErpFields: SchemaField[] = [
  {
    name: 'order_number',
    label: '订单号',
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 220,
    renderCell: (row: Record<string, unknown>) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {String(row.order_number ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.mes_order_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'mes_order_id',
    label: 'MES 订单 ID',
    type: 'text',
    required: true,
    showInList: false,
    placeholder: '输入 MES 订单 UUID',
  },
  {
    name: 'product_name',
    label: '产品名称',
    type: 'text',
    listWidth: 140,
    placeholder: '输入产品名称（可选）',
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.product_name ?? '-')}
      </Typography>
    ),
  },
  {
    name: 'quantity',
    label: '数量',
    type: 'number',
    sortable: true,
    listWidth: 100,
    placeholder: '输入数量（可选）',
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{String(row.quantity ?? '-')}</Typography>
    ),
  },
  {
    name: 'sync_status',
    label: '状态',
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(MES_ERP_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = MES_ERP_STATUS_CONFIG[row.sync_status as string] || MES_ERP_STATUS_CONFIG.pending;
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

export const mesErpSyncSchema: EntitySchema = {
  entity: 'integration_mes_erp_sync',
  title: 'MES-ERP 同步',
  description: '管理 MES 生产订单与 ERP 销售订单的同步',

  api: {
    module: 'integration',
    resource: 'mesErpSyncs',
  },

  fields: mesErpFields,

  list: {
    searchFields: ['order_number', 'product_name', 'mes_order_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['mes_order_id', 'order_number', 'product_name', 'quantity'],
    },
  ],

  formColCount: 1,
  createTitle: '创建 MES-ERP 同步',
  detailTitle: '同步详情',
};
