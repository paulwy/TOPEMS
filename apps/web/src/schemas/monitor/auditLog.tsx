import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { User } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens, semanticTokens } from '@topems/tokens';

const ct = {
  primary: { dark: 'colors.primary.dark', light: 'colors.primary.50' },
  grey: { 400: designTokens.colors.grey['400'], 600: designTokens.colors.grey['600'], 800: '#424242' },
};

const formatAction = (action: string): string => {
  const map: Record<string, string> = {
    batch_create: '批量创建',
    batch_delete: '批量删除',
    export: '导出',
    import: '导入',
    create: '创建',
    update: '更新',
    delete: '删除',
    read: '读取',
  };
  return map[action] || action;
};

const getStatusChip = (status: string | null | undefined): React.ReactNode => {
  const configs: Record<
    string,
    {
      color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      label: string;
    }
  > = {
    success: { color: 'success', label: '成功' },
    partial: { color: 'warning', label: '部分成功' },
    error: { color: 'error', label: '失败' },
  };
  const config = configs[status ?? ''] || {
    color: 'default' as const,
    label: status || '-',
  };
  return (
    <Chip
      size='small'
      color={config.color}
      label={config.label}
    />
  );
};

const auditLogFields: SchemaField[] = [
  {
    name: 'created_at',
    label: '时间',
    type: 'datetime',
    sortable: true,
    listWidth: 180,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {new Date(row.created_at as string).toLocaleString('zh-CN')}
      </Typography>
    ),
  },
  {
    name: 'user_name',
    label: '用户',
    type: 'text',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => {
      const name = (row.user_name || row.username || row.user_id || '-') as string;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User
              size={16}
              color={ct.primary.dark}
            />
          </Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {name}
          </Typography>
        </Box>
      );
    },
  },
  {
    name: 'action',
    label: '操作',
    type: 'text',
    listWidth: 110,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{formatAction(row.action as string)}</Typography>
    ),
  },
  {
    name: 'entity_type',
    label: '实体类型',
    type: 'text',
    listWidth: 120,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.entity_type || row.resource || '-')}
      </Typography>
    ),
  },
  {
    name: 'ip_address',
    label: 'IP地址',
    type: 'text',
    listWidth: 130,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.ip_address || '-')}
      </Typography>
    ),
  },
  {
    name: 'status',
    label: '状态',
    type: 'text',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const status =
        (row.status as string) ||
        (row.success === true ? 'success' : row.success === false ? 'error' : '');
      return getStatusChip(status);
    },
  },
  {
    name: 'error_message',
    label: '错误信息',
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'request_details',
    label: '请求详情',
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'response_details',
    label: '响应详情',
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'user_id',
    label: '用户ID',
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'entity_id',
    label: '实体ID',
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'user_agent',
    label: 'User-Agent',
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'tenant_id',
    label: '租户ID',
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'source',
    label: '来源',
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
];

export const auditLogSchema: EntitySchema = {
  entity: 'admin_audit_log',
  title: '审计日志',
  description: '查看系统审计日志，追踪用户操作和系统行为',

  api: {
    module: 'admin',
    resource: 'auditLogs',
  },

  fields: auditLogFields,

  list: {
    searchFields: ['user_name', 'user_id', 'action', 'entity_type', 'ip_address'],
    pageSize: 20,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '成功', value: 'success' },
          { label: '部分成功', value: 'partial' },
          { label: '失败', value: 'error' },
        ],
      },
      {
        id: 'action',
        label: '操作',
        type: 'select',
        options: [
          { label: '全部操作', value: 'all' },
          { label: '创建', value: 'create' },
          { label: '更新', value: 'update' },
          { label: '删除', value: 'delete' },
          { label: '读取', value: 'read' },
          { label: '导出', value: 'export' },
          { label: '导入', value: 'import' },
          { label: '批量创建', value: 'batch_create' },
          { label: '批量删除', value: 'batch_delete' },
        ],
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        success: 'success',
        partial: 'warning',
        error: 'error',
      },
      labelMap: {
        success: '成功',
        partial: '部分成功',
        error: '失败',
      },
    },
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '审计日志详情',
};
