import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

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
  open: i18n.t('shared.ticket.k0'),
  in_progress: i18n.t('shared.ticket.k1'),
  pending: i18n.t('shared.ticket.k2'),
  resolved: i18n.t('shared.ticket.k3'),
  closed: i18n.t('shared.ticket.k4'),
  cancelled: i18n.t('shared.ticket.k5'),
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
  critical: i18n.t('shared.ticket.k6'),
  high: i18n.t('shared.ticket.k7'),
  medium: i18n.t('shared.ticket.k8'),
  low: i18n.t('shared.ticket.k9'),
};

const TICKET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'reconciliation_diff', label: i18n.t('shared.ticket.k10') },
  { value: 'approval_timeout', label: i18n.t('shared.ticket.k11') },
  { value: 'system_alert', label: i18n.t('shared.ticket.k12') },
  { value: 'data_issue', label: i18n.t('shared.ticket.k13') },
  { value: 'integration_error', label: i18n.t('shared.ticket.k14') },
  { value: 'user_request', label: i18n.t('shared.ticket.k15') },
  { value: 'other', label: i18n.t('shared.ticket.k16') },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'critical', label: i18n.t('shared.ticket.k17') },
  { value: 'high', label: i18n.t('shared.ticket.k18') },
  { value: 'medium', label: i18n.t('shared.ticket.k19') },
  { value: 'low', label: i18n.t('shared.ticket.k20') },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'open', label: i18n.t('shared.ticket.k21') },
  { value: 'in_progress', label: i18n.t('shared.ticket.k22') },
  { value: 'pending', label: i18n.t('shared.ticket.k23') },
  { value: 'resolved', label: i18n.t('shared.ticket.k24') },
  { value: 'closed', label: i18n.t('shared.ticket.k25') },
  { value: 'cancelled', label: i18n.t('shared.ticket.k26') },
];

const SOURCE_SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: 'finance', label: i18n.t('shared.ticket.k27') },
  { value: 'erp', label: 'ERP' },
  { value: 'hrm', label: 'HR' },
  { value: 'mes', label: 'MES' },
  { value: 'monitor', label: i18n.t('shared.ticket.k28') },
  { value: 'workflow', label: i18n.t('shared.ticket.k29') },
  { value: 'other', label: i18n.t('shared.ticket.k30') },
];

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '-';
  if (minutes < 0)
    return `${i18n.t('shared.ticket.k0')}${Math.abs(Math.floor(minutes / 60))}${i18n.t('shared.ticket.k1')}${Math.abs(minutes % 60)}${i18n.t('shared.ticket.k2')}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}${i18n.t('shared.ticket.k3')}${mins}${i18n.t('shared.ticket.k4')}`;
  return `${mins}${i18n.t('shared.ticket.k5')}`;
}

export const ticketSchema: EntitySchema = {
  entity: 'ticket',
  title: i18n.t('shared.ticket.k31'),
  description: i18n.t('shared.ticket.k32'),

  api: {
    module: 'ticket',
    resource: 'tickets',
  },

  fields: [
    {
      name: 'ticket_no',
      label: i18n.t('shared.ticket.k33'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('shared.ticket.k34'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
    },
    {
      name: 'description',
      label: i18n.t('shared.ticket.k35'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'ticket_type',
      label: i18n.t('shared.ticket.k36'),
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
      label: i18n.t('shared.ticket.k37'),
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
      label: i18n.t('shared.ticket.k38'),
      type: 'select',
      defaultValue: 'open',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
    },
    {
      name: 'source_service',
      label: i18n.t('shared.ticket.k39'),
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
      label: i18n.t('shared.ticket.k40'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.ticket.k41'),
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
        label: i18n.t('shared.ticket.k42'),
        type: 'select',
        options: [{ label: i18n.t('shared.ticket.k43'), value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'ticket_type',
        label: i18n.t('shared.ticket.k44'),
        type: 'select',
        options: [{ label: i18n.t('shared.ticket.k45'), value: 'all' }, ...TICKET_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'severity',
        label: i18n.t('shared.ticket.k46'),
        type: 'select',
        options: [{ label: i18n.t('shared.ticket.k47'), value: 'all' }, ...SEVERITY_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.ticket.k48'),
      fields: ['ticket_no', 'title', 'description'],
    },
    {
      title: i18n.t('shared.ticket.k49'),
      fields: ['ticket_type', 'severity', 'status', 'source_service'],
    },
    {
      title: i18n.t('shared.ticket.sla_6'),
      fields: ['sla_due_at'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.ticket.k50'),
  editTitle: i18n.t('shared.ticket.k51'),
  detailTitle: i18n.t('shared.ticket.k52'),

  actions: ['create', 'edit', 'detail'],
};
