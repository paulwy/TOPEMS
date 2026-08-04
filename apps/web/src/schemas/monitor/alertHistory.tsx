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

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  warning: '警告',
  info: '信息',
};

const STATUS_LABELS: Record<string, string> = {
  active: '未处理',
  acknowledged: '已确认',
  resolved: '已解决',
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
    label: '级别',
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
    label: '告警标题',
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
    label: '来源服务',
    type: 'text',
    listWidth: 140,
  },
  {
    name: 'alert_type',
    label: '类型',
    type: 'text',
    listWidth: 120,
  },
  {
    name: 'created_at',
    label: '触发时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    renderCell: (row: Record<string, unknown>) =>
      new Date(row.created_at as string).toLocaleString('zh-CN'),
  },
  {
    name: 'status',
    label: '状态',
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
    label: '告警描述',
    type: 'textarea',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'acknowledged_at',
    label: '确认时间',
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolved_at',
    label: '解决时间',
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'acknowledged_by',
    label: '确认人',
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolved_by',
    label: '解决人',
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'resolution_note',
    label: '解决备注',
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
              基本信息
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  级别
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
                  状态
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
                  来源服务
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
                  告警类型
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
                  触发时间
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
              处理信息
            </Typography>
            <Stack spacing={1.5}>
              {!!row.acknowledged_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    确认时间
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
                    确认人
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
                    解决时间
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
                    解决人
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
                  暂无处理记录
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
          告警描述
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
            解决备注
          </Typography>
          <Typography variant='body2'>{row.resolution_note as string}</Typography>
        </Paper>
      )}
    </Stack>
  );
};

export const alertHistorySchema: EntitySchema = {
  entity: 'monitor_alert_history',
  title: '告警历史',
  description: '查看和处理所有告警记录',

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
        label: '严重级别',
        type: 'select',
        options: [
          { label: '全部级别', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '警告', value: 'warning' },
          { label: '信息', value: 'info' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '未处理', value: 'active' },
          { label: '已确认', value: 'acknowledged' },
          { label: '已解决', value: 'resolved' },
        ],
      },
      {
        id: 'timeRange',
        label: '时间范围',
        type: 'select',
        defaultValue: '7d',
        options: [
          { label: '近1小时', value: '1h' },
          { label: '近24小时', value: '24h' },
          { label: '近7天', value: '7d' },
          { label: '近30天', value: '30d' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '告警详情',
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
