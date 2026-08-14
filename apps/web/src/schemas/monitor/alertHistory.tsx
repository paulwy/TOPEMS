/**
 * 告警历史 Schema — 驱动 MonitorAlertHistoryPage 的 CrudPage
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警历史查看，
 * 支持列表展示、详情查看、确认/解决操作，以及丰富的统计信息。
 */

import React from 'react';
import { Box, Chip, Typography, Paper, Stack } from '@mui/material';
import { Clock, AlertTriangle, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

const SEVERITY_LABELS: Record<string, string> = {
  critical: i18n.t('shared.alert_history.k0'),
  warning: i18n.t('shared.alert_history.k1'),
  info: i18n.t('shared.alert_history.k2'),
};

const STATUS_LABELS: Record<string, string> = {
  active: i18n.t('shared.alert_history.k3'),
  acknowledged: i18n.t('shared.alert_history.k4'),
  resolved: i18n.t('shared.alert_history.k5'),
};

const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'default' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusColor = (status: string): 'error' | 'warning' | 'success' | 'default' => {
  switch (status) {
    case 'active':
      return 'error';
    case 'acknowledged':
      return 'warning';
    case 'resolved':
      return 'success';
    default:
      return 'default';
  }
};

const alertHistoryFields: SchemaField[] = [
  {
    name: 'severity',
    label: i18n.t('shared.alert_history.k6'),
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => (
      <Chip
        size='small'
        color={getSeverityColor(row.severity as string)}
        label={SEVERITY_LABELS[row.severity as string] || (row.severity as string)}
        variant='outlined'
      />
    ),
  },
  {
    name: 'title',
    label: i18n.t('shared.alert_history.k7'),
    type: 'text',
    minWidth: 200,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.title as string}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'service_name',
    label: i18n.t('shared.alert_history.k8'),
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'alert_type',
    label: i18n.t('shared.alert_history.k9'),
    type: 'text',
    listWidth: 120,
  },
  {
    name: 'created_at',
    label: i18n.t('shared.alert_history.k10'),
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    renderCell: (row: Record<string, unknown>) =>
      new Date(row.created_at as string).toLocaleString('zh-CN'),
  },
  {
    name: 'status',
    label: i18n.t('shared.alert_history.k11'),
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => (
      <Chip
        size='small'
        color={getStatusColor(row.status as string)}
        label={STATUS_LABELS[row.status as string] || (row.status as string)}
        variant='outlined'
      />
    ),
  },
  {
    name: 'message',
    label: i18n.t('shared.alert_history.k12'),
    type: 'textarea',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'acknowledged_at',
    label: i18n.t('shared.alert_history.k13'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolved_at',
    label: i18n.t('shared.alert_history.k14'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'acknowledged_by',
    label: i18n.t('shared.alert_history.k15'),
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolved_by',
    label: i18n.t('shared.alert_history.k16'),
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolution_note',
    label: i18n.t('shared.alert_history.k17'),
    type: 'textarea',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
];

const renderHistoryDetail = (row: Record<string, unknown>): React.ReactNode => {
  const severity = row.severity as string;
  const status = row.status as string;
  const severityColor = getSeverityColor(severity);

  return (
    <Stack
      spacing={3}
      sx={{ pt: 1 }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              gutterBottom
            >
              {i18n.t('schemas.alert_history.k0')}
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('schemas.alert_history.k1')}
                </Typography>
                <Chip
                  size='small'
                  color={severityColor}
                  label={SEVERITY_LABELS[severity] || severity}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('schemas.alert_history.k2')}
                </Typography>
                <Chip
                  size='small'
                  color={getStatusColor(status)}
                  label={STATUS_LABELS[status] || status}
                  variant='outlined'
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('schemas.alert_history.k3')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {row.service_name as string}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('schemas.alert_history.k4')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {row.alert_type as string}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('schemas.alert_history.k5')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {new Date(row.created_at as string).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Paper sx={{ p: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              gutterBottom
            >
              {i18n.t('schemas.alert_history.k6')}
            </Typography>
            <Stack spacing={1.5}>
              {!!row.acknowledged_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('schemas.alert_history.k7')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {new Date(row.acknowledged_at as string).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
              {!!row.acknowledged_by && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('schemas.alert_history.k8')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {row.acknowledged_by as string}
                  </Typography>
                </Box>
              )}
              {!!row.resolved_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('schemas.alert_history.k9')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {new Date(row.resolved_at as string).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
              {!!row.resolved_by && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('schemas.alert_history.k10')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {row.resolved_by as string}
                  </Typography>
                </Box>
              )}
              {!row.acknowledged_at && !row.resolved_at && (
                <Typography
                  variant='body2'
                  color='text.disabled'
                >
                  {i18n.t('schemas.alert_history.k11')}
                </Typography>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
      <Paper
        sx={{
          p: 2,
          bgcolor: severityColor === 'error' ? 'error.light' : 'grey.50',
        }}
      >
        <Typography
          variant='subtitle2'
          color='text.secondary'
          gutterBottom
        >
          {i18n.t('schemas.alert_history.k12')}
        </Typography>
        <Typography
          variant='body2'
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: severityColor === 'error' ? 'error.main' : 'text.primary',
          }}
        >
          {row.message as string}
        </Typography>
      </Paper>
      {!!row.resolution_note && (
        <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
          <Typography
            variant='subtitle2'
            color='text.secondary'
            gutterBottom
          >
            {i18n.t('schemas.alert_history.k13')}
          </Typography>
          <Typography variant='body2'>{row.resolution_note as string}</Typography>
        </Paper>
      )}
    </Stack>
  );
};

export const alertHistorySchema: EntitySchema = {
  entity: 'monitor_alert_history',
  title: i18n.t('shared.alert_history.k18'),
  description: i18n.t('shared.alert_history.k19'),

  api: {
    module: 'monitor',
    resource: 'alerts',
  },

  fields: alertHistoryFields,

  list: {
    searchFields: ['title', 'service_name', 'alert_type'],
    pageSize: 10,
    filters: [
      {
        id: 'severity',
        label: i18n.t('shared.alert_history.k20'),
        type: 'select',
        options: [
          { label: i18n.t('shared.alert_history.k21'), value: 'all' },
          { label: i18n.t('shared.alert_history.k22'), value: 'critical' },
          { label: i18n.t('shared.alert_history.k23'), value: 'warning' },
          { label: i18n.t('shared.alert_history.k24'), value: 'info' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.alert_history.k25'),
        type: 'select',
        options: [
          { label: i18n.t('shared.alert_history.k26'), value: 'all' },
          { label: i18n.t('shared.alert_history.k27'), value: 'active' },
          { label: i18n.t('shared.alert_history.k28'), value: 'acknowledged' },
          { label: i18n.t('shared.alert_history.k29'), value: 'resolved' },
        ],
      },
      {
        id: 'timeRange',
        label: i18n.t('shared.alert_history.k30'),
        type: 'select',
        defaultValue: '7d',
        options: [
          { label: i18n.t('shared.alert_history.1_31'), value: '1h' },
          { label: i18n.t('shared.alert_history.24_32'), value: '24h' },
          { label: i18n.t('shared.alert_history.7_33'), value: '7d' },
          { label: i18n.t('shared.alert_history.30_34'), value: '30d' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('shared.alert_history.k35'),
  detailMaxWidth: 'lg',

  renderDetail: renderHistoryDetail,
};

export {
  SEVERITY_LABELS as ALERT_HISTORY_SEVERITY_LABELS,
  STATUS_LABELS as ALERT_HISTORY_STATUS_LABELS,
  getSeverityColor as getAlertHistorySeverityColor,
  getStatusColor as getAlertHistoryStatusColor,
};

export const ALERT_HISTORY_ICONS = {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Bell,
};
