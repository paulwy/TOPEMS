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

const ct= designTokens.colors;

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: '严重',
  warning: '警告',
  info: '通知',
};

const SEVERITY_COLORS: Record<AlertSeverity, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  active: '活动',
  acknowledged: '已确认',
  resolved: '已解决',
};

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

const alertFields: SchemaField[] = [
  {
    name: 'title',
    label: '告警名称',
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
    label: '严重级别',
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const severity = row.severity as AlertSeverity;
      return (
        <Chip
          size='small'
          color={SEVERITY_COLORS[severity]}
          label={SEVERITY_LABELS[severity]}
          variant='outlined'
        />
      );
    },
  },
  {
    name: 'service_name',
    label: '所属服务',
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
    label: '告警描述',
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
    label: '触发时间',
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
    label: '状态',
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => {
      const status = row.status as AlertStatus;
      return (
        <Chip
          size='small'
          color={STATUS_COLORS[status]}
          label={STATUS_LABELS[status]}
          variant='outlined'
        />
      );
    },
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
    name: 'alert_type',
    label: '告警类型',
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
];

export const alertSchema: EntitySchema = {
  entity: 'monitor_alert',
  title: '告警',
  description: '查看和处理系统告警，支持确认、解决和批量操作',

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
        label: '严重级别',
        type: 'select',
        options: [
          { label: '全部级别', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '警告', value: 'warning' },
          { label: '通知', value: 'info' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活动', value: 'active' },
          { label: '已确认', value: 'acknowledged' },
          { label: '已解决', value: 'resolved' },
        ],
      },
      {
        id: 'service',
        label: '服务',
        type: 'select',
        paramName: 'service_name',
        options: [{ label: '全部服务', value: 'all' }],
      },
    ],
  },

  actions: ['detail'],

  batchActions: [
    {
      key: 'batch-acknowledge',
      label: '批量确认',
      color: 'primary',
      onClick: () => {},
      confirm: true,
      confirmMessage: '确定要确认选中的告警吗？',
    },
    {
      key: 'batch-resolve',
      label: '批量解决',
      color: 'success',
      onClick: () => {},
      confirm: true,
      confirmMessage: '确定要标记选中的告警为已解决吗？',
    },
  ],

  formColCount: 2,
  detailTitle: '告警详情',
  detailMaxWidth: 'md',
};

export { SEVERITY_LABELS, SEVERITY_COLORS, STATUS_LABELS, STATUS_COLORS, getSeverityIcon };
