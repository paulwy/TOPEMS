/**
 * 告警 Schema — 驱动 MonitorAlertsPage 的 CrudPage
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警管理，
 * 支持列表展示、详情查看、确认/解决操作、批量处理等。
 */

import React from 'react';
import { Box, Chip, Typography, Stack, Avatar } from '@mui/material';
import { AlertCircle, AlertTriangle, Info, Clock, Server } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

const getSeverityLabels = (): Record<AlertSeverity, string> => ({
  critical: i18n.t('shared.alert.k0'),
  warning: i18n.t('shared.alert.k1'),
  info: i18n.t('shared.alert.k2'),
});

const SEVERITY_COLORS: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const getStatusLabels = (): Record<AlertStatus, string> => ({
  active: i18n.t('shared.alert.k3'),
  acknowledged: i18n.t('shared.alert.k4'),
  resolved: i18n.t('shared.alert.k5'),
});

const STATUS_COLORS: Record<AlertStatus, 'error' | 'warning' | 'success'> = {
  active: 'error',
  acknowledged: 'warning',
  resolved: 'success',
};

const getSeverityIcon = (severity: AlertSeverity): React.ReactNode => {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={18} />;
    case 'warning':
      return <AlertTriangle size={18} />;
    case 'info':
      return <Info size={18} />;
  }
};

const getAlertFields = (): SchemaField[] => [
  {
    name: 'title',
    label: i18n.t('shared.alert.k6'),
    type: 'text',
    minWidth: 200,
    renderCell: (row: Record<string, unknown>) => {
      const severity = row.severity as AlertSeverity;
      return (
        <Stack
          direction='row'
          spacing={1.5}
          sx={{ alignItems: 'center' }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: `${SEVERITY_COLORS[severity]}.light`,
              color: `${SEVERITY_COLORS[severity]}.main`,
            }}
          >
            {getSeverityIcon(severity)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant='body2'
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.title as string}
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Server size={12} />
              {row.service_name as string}
            </Typography>
          </Box>
        </Stack>
      );
    },
  },
  {
    name: 'severity',
    label: i18n.t('shared.alert.k7'),
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const severity = row.severity as AlertSeverity;
      return (
        <Chip
          size='small'
          color={SEVERITY_COLORS[severity]}
          label={getSeverityLabels()[severity]}
          variant='outlined'
        />
      );
    },
  },
  {
    name: 'service_name',
    label: i18n.t('shared.alert.k8'),
    type: 'text',
    listWidth: 140,
    renderCell: (row: Record<string, unknown>) => (
      <Stack
        direction='row'
        spacing={0.5}
        sx={{ alignItems: 'center' }}
      >
        <Server
          size={14}
          style={{ color: ct.grey[400] }}
        />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {row.service_name as string}
        </Typography>
      </Stack>
    ),
  },
  {
    name: 'message',
    label: i18n.t('shared.alert.k9'),
    type: 'textarea',
    minWidth: 240,
    showInForm: false,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 300,
        }}
      >
        {row.message as string}
      </Typography>
    ),
  },
  {
    name: 'created_at',
    label: i18n.t('shared.alert.k10'),
    type: 'datetime',
    listWidth: 160,
    hideInForm: true,
    sortable: true,
    renderCell: (row: Record<string, unknown>) => (
      <Stack
        direction='row'
        spacing={0.5}
        sx={{ alignItems: 'center' }}
      >
        <Clock
          size={14}
          style={{ color: ct.grey[400] }}
        />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date(row.created_at as string).toLocaleString('zh-CN')}
        </Typography>
      </Stack>
    ),
  },
  {
    name: 'status',
    label: i18n.t('shared.alert.k11'),
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const status = row.status as AlertStatus;
      return (
        <Chip
          size='small'
          color={STATUS_COLORS[status]}
          label={getStatusLabels()[status]}
          variant='outlined'
        />
      );
    },
  },
  {
    name: 'acknowledged_at',
    label: i18n.t('shared.alert.k12'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolved_at',
    label: i18n.t('shared.alert.k13'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'alert_type',
    label: i18n.t('shared.alert.k14'),
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
];

export const getAlertSchema = (): EntitySchema => {
  const alertFields = getAlertFields();
  const SEVERITY_LABELS = getSeverityLabels();
  const STATUS_LABELS = getStatusLabels();

  return {
    entity: 'monitor_alert',
    title: i18n.t('shared.alert.k15'),
    description: i18n.t('shared.alert.k16'),

  api: {
    module: 'monitor',
    resource: 'alerts',
  },

  fields: alertFields,

  list: {
    searchFields: ['title', 'service_name', 'message'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'severity',
        label: i18n.t('shared.alert.k17'),
        type: 'select',
        options: [
          { label: i18n.t('shared.alert.k18'), value: 'all' },
          { label: i18n.t('shared.alert.k19'), value: 'critical' },
          { label: i18n.t('shared.alert.k20'), value: 'warning' },
          { label: i18n.t('shared.alert.k21'), value: 'info' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.alert.k22'),
        type: 'select',
        options: [
          { label: i18n.t('shared.alert.k23'), value: 'all' },
          { label: i18n.t('shared.alert.k24'), value: 'active' },
          { label: i18n.t('shared.alert.k25'), value: 'acknowledged' },
          { label: i18n.t('shared.alert.k26'), value: 'resolved' },
        ],
      },
      {
        id: 'service',
        label: i18n.t('shared.alert.k27'),
        type: 'select',
        paramName: 'service_name',
        options: [{ label: i18n.t('shared.alert.k28'), value: 'all' }],
      },
    ],
  },

  actions: ['detail'],

  batchActions: [
    {
      key: 'batch-acknowledge',
      label: i18n.t('shared.alert.k29'),
      color: 'primary',
      onClick: () => {},
      confirm: true,
      confirmMessage: i18n.t('shared.alert.k30'),
    },
    {
      key: 'batch-resolve',
      label: i18n.t('shared.alert.k31'),
      color: 'success',
      onClick: () => {},
      confirm: true,
      confirmMessage: i18n.t('shared.alert.k32'),
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('shared.alert.k33'),
  detailMaxWidth: 'md',
  };
};

export { getSeverityLabels, SEVERITY_COLORS, getStatusLabels, STATUS_COLORS, getSeverityIcon };
