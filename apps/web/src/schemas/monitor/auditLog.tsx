import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { User } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

const ct = {
  primary: { dark: 'colors.primary.dark', light: 'colors.primary.50' },
  grey: {
    400: designTokens.colors.grey['400'],
    600: designTokens.colors.grey['600'],
    800: designTokens.colors.grey[800],
  },
};

const formatAction = (action: string): string => {
  const map: Record<string, string> = {
    batch_create: i18n.t('shared.audit_log.k0'),
    batch_delete: i18n.t('shared.audit_log.k1'),
    export: i18n.t('shared.audit_log.k2'),
    import: i18n.t('shared.audit_log.k3'),
    create: i18n.t('shared.audit_log.k4'),
    update: i18n.t('shared.audit_log.k5'),
    delete: i18n.t('shared.audit_log.k6'),
    read: i18n.t('shared.audit_log.k7'),
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
    success: { color: 'success', label: i18n.t('shared.audit_log.k8') },
    partial: { color: 'warning', label: i18n.t('shared.audit_log.k9') },
    error: { color: 'error', label: i18n.t('shared.audit_log.k10') },
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
    label: i18n.t('shared.audit_log.k11'),
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
    label: i18n.t('shared.audit_log.k12'),
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
    label: i18n.t('shared.audit_log.k13'),
    type: 'text',
    listWidth: 110,
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{formatAction(row.action as string)}</Typography>
    ),
  },
  {
    name: 'entity_type',
    label: i18n.t('shared.audit_log.k14'),
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
    label: i18n.t('shared.audit_log.ip_15'),
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
    label: i18n.t('shared.audit_log.k16'),
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
    label: i18n.t('shared.audit_log.k17'),
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'request_details',
    label: i18n.t('shared.audit_log.k18'),
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'response_details',
    label: i18n.t('shared.audit_log.k19'),
    type: 'textarea',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'user_id',
    label: i18n.t('shared.audit_log.id_20'),
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'entity_id',
    label: i18n.t('shared.audit_log.id_21'),
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
    label: i18n.t('shared.audit_log.id_22'),
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
  {
    name: 'source',
    label: i18n.t('shared.audit_log.k23'),
    type: 'text',
    showInList: false,
    showInDetail: true,
  },
];

export const auditLogSchema: EntitySchema = {
  entity: 'admin_audit_log',
  title: i18n.t('shared.audit_log.k24'),
  description: i18n.t('shared.audit_log.k25'),

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
        label: i18n.t('shared.audit_log.k26'),
        type: 'select',
        options: [
          { label: i18n.t('shared.audit_log.k27'), value: 'all' },
          { label: i18n.t('shared.audit_log.k28'), value: 'success' },
          { label: i18n.t('shared.audit_log.k29'), value: 'partial' },
          { label: i18n.t('shared.audit_log.k30'), value: 'error' },
        ],
      },
      {
        id: 'action',
        label: i18n.t('shared.audit_log.k31'),
        type: 'select',
        options: [
          { label: i18n.t('shared.audit_log.k32'), value: 'all' },
          { label: i18n.t('shared.audit_log.k33'), value: 'create' },
          { label: i18n.t('shared.audit_log.k34'), value: 'update' },
          { label: i18n.t('shared.audit_log.k35'), value: 'delete' },
          { label: i18n.t('shared.audit_log.k36'), value: 'read' },
          { label: i18n.t('shared.audit_log.k37'), value: 'export' },
          { label: i18n.t('shared.audit_log.k38'), value: 'import' },
          { label: i18n.t('shared.audit_log.k39'), value: 'batch_create' },
          { label: i18n.t('shared.audit_log.k40'), value: 'batch_delete' },
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
        success: i18n.t('shared.audit_log.k41'),
        partial: i18n.t('shared.audit_log.k42'),
        error: i18n.t('shared.audit_log.k43'),
      },
    },
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('shared.audit_log.k44'),
};
