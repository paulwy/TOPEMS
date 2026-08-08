import type { ChipProps } from '@mui/material';

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
  paused: 'default',
  released: 'info',
  in_progress: 'primary',
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
};

export const LIMS_STATUS_COLOR_MAP: Record<string, StatusColor> = {
  待登记: 'grey.100',
  待接收: 'warning.light',
  已接收: 'primary.light',
  待确认: 'secondary.light',
  已确认: 'success.lighter',
  检测中: 'primary.light',
  已完成: 'success.lighter',
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
        return 'default';
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
        return 'default';
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
        return 'grey.500';
    }
  }

  return STATUS_COLOR_MAP[normalized] || fallback;
};

export const getStatusTextColor = (
  status: string,
  category?: 'workflow' | 'mes' | 'lims' | 'monitor'
): string => {
  const color = getStatusColor(status, { category });
  if (typeof color !== 'string') return 'text.primary';

  if (color.includes('success') || color === 'success') return 'success.main';
  if (color.includes('error') || color === 'error') return 'error.main';
  if (color.includes('warning') || color === 'warning') return 'warning.main';
  if (color.includes('info') || color === 'info') return 'info.main';
  if (color.includes('primary') || color === 'primary') return 'primary.main';
  if (color.includes('secondary') || color === 'secondary') return 'secondary.main';
  return 'text.secondary';
};

export const getChipStatusColor = (
  status: string,
  category?: 'workflow' | 'mes'
): ChipProps['color'] => {
  return getStatusColor(status, { category, fallback: 'default' }) as ChipProps['color'];
};
