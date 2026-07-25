import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  open: 'error',
  in_progress: 'warning',
  pending: 'info',
  resolved: 'success',
  closed: 'default',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  open: '待处理',
  in_progress: '处理中',
  pending: '等待中',
  resolved: '已解决',
  closed: '已关闭',
  cancelled: '已取消',
};

const SEVERITY_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

const SEVERITY_LABEL_MAP: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const TICKET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'reconciliation_diff', label: '对账差异' },
  { value: 'approval_timeout', label: '审批超时' },
  { value: 'system_alert', label: '系统告警' },
  { value: 'data_issue', label: '数据问题' },
  { value: 'integration_error', label: '集成异常' },
  { value: 'user_request', label: '用户请求' },
  { value: 'other', label: '其他' },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'critical', label: '严重' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'open', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'pending', label: '等待中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
  { value: 'cancelled', label: '已取消' },
];

const SOURCE_SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'finance', label: '财务' },
  { value: 'erp', label: 'ERP' },
  { value: 'hrm', label: 'HR' },
  { value: 'mes', label: 'MES' },
  { value: 'monitor', label: '监控' },
  { value: 'workflow', label: '流程' },
  { value: 'other', label: '其他' },
];

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '-';
  if (minutes < 0)
    return `已超时 ${Math.abs(Math.floor(minutes / 60))}小时${Math.abs(minutes % 60)}分`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}小时${mins}分`;
  return `${mins}分钟`;
}

export const ticketSchema: EntitySchema = {
  entity: 'ticket',
  title: '工单中心',
  description: '统一管理对账差异、审批超时、系统告警等工单',

  api: {
    module: 'ticket',
    resource: 'tickets',
  },

  fields: [
    {
      name: 'ticket_no',
      label: '工单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'ticket_type',
      label: '类型',
      type: 'select',
      required: true,
      defaultValue: 'user_request',
      options: { type: 'static', options: TICKET_TYPE_OPTIONS },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.ticket_type ?? '');
        const label = TICKET_TYPE_OPTIONS.find((o) => o.value === val)?.label || val;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'severity',
      label: '级别',
      type: 'select',
      defaultValue: 'medium',
      options: { type: 'static', options: SEVERITY_OPTIONS },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.severity ?? '');
        const label = SEVERITY_LABEL_MAP[val] || val;
        const color = (SEVERITY_COLOR_MAP[val] || 'default') as
          'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
        return React.createElement(Chip, {
          label,
          size: 'small',
          color: color === 'default' ? 'default' : color,
        });
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'open',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
    },
    {
      name: 'source_service',
      label: '来源服务',
      type: 'select',
      required: true,
      defaultValue: 'erp',
      options: { type: 'static', options: SOURCE_SERVICE_OPTIONS },
      listWidth: 100,
    },
    {
      name: 'sla_due_at',
      label: 'SLA',
      type: 'datetime',
      listWidth: 120,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const dueAt = row.sla_due_at as string | undefined;
        const status = String(row.status ?? '');
        if (!dueAt || ['resolved', 'closed', 'cancelled'].includes(status)) {
          return React.createElement(
            Typography,
            { variant: 'caption', color: 'text.disabled' },
            '-'
          );
        }
        const dueDate = new Date(dueAt);
        const now = new Date();
        const diffMs = dueDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const isBreached = diffMs < 0;
        const color = (isBreached ? 'error' : diffMins < 60 ? 'warning' : 'default') as
          'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
        return React.createElement(Chip, {
          label: formatDuration(diffMins),
          size: 'small',
          color: color === 'default' ? 'default' : color,
          variant: isBreached ? 'filled' : 'outlined',
        });
      },
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'ticket_no',
      'title',
      'ticket_type',
      'severity',
      'status',
      'sla_due_at',
      'source_service',
      'created_at',
    ],
    searchFields: ['ticket_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'ticket_type',
        label: '类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...TICKET_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'severity',
        label: '级别',
        type: 'select',
        options: [{ label: '全部级别', value: 'all' }, ...SEVERITY_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['ticket_no', 'title', 'description'],
    },
    {
      title: '分类与级别',
      fields: ['ticket_type', 'severity', 'status', 'source_service'],
    },
    {
      title: 'SLA 信息',
      fields: ['sla_due_at'],
    },
  ],

  formColCount: 2,
  createTitle: '新建工单',
  editTitle: '编辑工单',
  detailTitle: '工单详情',

  actions: ['create', 'edit', 'detail'],
};
