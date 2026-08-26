import type { ChipProps } from '@mui/material';
import i18n from '@/i18n';

export type StatusColor =
  | ChipProps['color']
  | 'success.main'
  | 'warning.main'
  | 'error.main'
  | 'info.main'
  | 'grey.100'
  | 'grey.500'
  | 'primary.light'
  | 'secondary.light'
  | 'success.lighter'
  | 'warning.light'
  | string;

export const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  approved: 'success',
  rejected: 'error',
  pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  canceled: 'error',
  paused: 'default',
  released: 'info',
  in_progress: 'primary',
  in_transit: 'info',
  success: 'success',
  failed: 'error',
  running: 'info',
  stopped: 'default',
  active: 'success',
  inactive: 'default',
  manual: 'default',
  scheduled: 'primary',
  interval: 'secondary',
  healthy: 'success.main',
  degraded: 'warning.main',
  unhealthy: 'error.main',
  critical: 'error.main',
  info: 'info.main',
  warning: 'warning.main',
  draft: 'warning',
  archived: 'default',
  submitted: 'info',
  confirmed: 'info',
  waiting: 'warning',
  shipped: 'primary',
  delivered: 'success',
  paid: 'success',
  unpaid: 'warning',
  acknowledged: 'info',
  resolved: 'success',
  escalated: 'error',
  dismissed: 'default',
  testing: 'warning',
  enabled: 'success',
  disabled: 'default',
  suspended: 'error',
  valid: 'success',
  invalid: 'error',
  expired: 'error',
  overdue: 'error',
  open: 'error',
  closed: 'default',
  partial: 'warning',
  claimed: 'info',
  receiving: 'primary',
  processing: 'primary',
  progressing: 'warning',
  deprecated: 'warning',
  idle: 'default',
  in_use: 'info',
  maintenance: 'warning',
  scrapped: 'error',
  error: 'error',
  normal: 'success',
  'in-progress': 'info',
};

const LIMS_STATUS_COLOR_MAP: Record<string, StatusColor> = {
  [i18n.t('utils.status.k0')]: 'grey.100',
  [i18n.t('utils.status.k1')]: 'warning.light',
  [i18n.t('utils.status.k2')]: 'primary.light',
  [i18n.t('utils.status.k3')]: 'secondary.light',
  [i18n.t('utils.status.k4')]: 'success.lighter',
  [i18n.t('utils.status.k5')]: 'primary.light',
  [i18n.t('utils.status.k6')]: 'success.lighter',
};

export const getStatusColor = (
  status: string,
  options?: {
    scope?: 'chip' | 'bg' | 'palette';
    category?: 'workflow' | 'mes' | 'lims' | 'monitor';
    fallback?: StatusColor;
  }
): StatusColor => {
  const fallback = options?.fallback ?? 'default';
  const category = options?.category;
  const normalized = status?.trim().toLowerCase();

  if (category === 'lims') {
    return (
      (LIMS_STATUS_COLOR_MAP[status] as StatusColor) || STATUS_COLOR_MAP[normalized] || fallback
    );
  }

  if (category === 'workflow') {
    switch (normalized) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return STATUS_COLOR_MAP[normalized] || fallback;
    }
  }

  if (category === 'mes') {
    switch (normalized) {
      case 'pending':
        return 'warning';
      case 'released':
        return 'info';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'paused':
        return 'default';
      default:
        return STATUS_COLOR_MAP[normalized] || fallback;
    }
  }

  if (category === 'monitor') {
    switch (normalized) {
      case 'healthy':
        return 'success.main';
      case 'degraded':
        return 'warning.main';
      case 'unhealthy':
        return 'error.main';
      default:
        return STATUS_COLOR_MAP[normalized] || fallback;
    }
  }

  return STATUS_COLOR_MAP[normalized] || fallback;
};

export const getChipStatusColor = (
  status: string,
  category?: 'workflow' | 'mes'
): ChipProps['color'] => {
  return getStatusColor(status, { category, fallback: 'default' }) as ChipProps['color'];
};
