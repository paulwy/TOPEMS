import React from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';

type StatusChipSize = 'sm' | 'md';

interface StatusMapping {
  color: ChipProps['color'];
  label: string;
  variant?: 'filled' | 'outlined';
}

export interface StatusChipProps {
  status: string;
  size?: StatusChipSize;
  customLabel?: string;
  mapping?: Record<string, Partial<StatusMapping>>;
  icon?: ChipProps['icon'];
  variant?: 'filled' | 'outlined';
  color?: ChipProps['color'];
  sx?: ChipProps['sx'];
}

const DEFAULT_STATUS_MAPPING: Record<string, Omit<StatusMapping, 'label'> & { labelKey: string }> =
  {
    draft: { color: 'secondary', labelKey: 'status_draft', variant: 'outlined' },
    pending: { color: 'warning', labelKey: 'status_pending' },
    waiting: { color: 'warning', labelKey: 'status_waiting' },
    submitted: { color: 'info', labelKey: 'status_submitted' },
    approved: { color: 'success', labelKey: 'status_approved' },
    confirmed: { color: 'info', labelKey: 'status_confirmed' },
    rejected: { color: 'error', labelKey: 'status_rejected' },
    cancelled: { color: 'error', labelKey: 'status_cancelled', variant: 'outlined' },
    canceled: { color: 'error', labelKey: 'status_cancelled', variant: 'outlined' },
    completed: { color: 'success', labelKey: 'status_completed' },
    finished: { color: 'success', labelKey: 'status_completed' },
    done: { color: 'success', labelKey: 'status_completed' },
    active: { color: 'success', labelKey: 'status_active' },
    enabled: { color: 'success', labelKey: 'status_enabled' },
    inactive: { color: 'secondary', labelKey: 'status_inactive', variant: 'outlined' },
    disabled: { color: 'secondary', labelKey: 'status_disabled', variant: 'outlined' },
    suspended: { color: 'error', labelKey: 'status_suspended' },
    invited: { color: 'warning', labelKey: 'status_invited' },
    open: { color: 'error', labelKey: 'status_open' },
    in_progress: { color: 'warning', labelKey: 'status_in_progress' },
    progressing: { color: 'warning', labelKey: 'status_in_progress' },
    processing: { color: 'primary', labelKey: 'status_processing' },
    receiving: { color: 'primary', labelKey: 'status_receiving' },
    resolved: { color: 'success', labelKey: 'status_resolved' },
    closed: { color: 'secondary', labelKey: 'status_closed', variant: 'outlined' },
    claimed: { color: 'info', labelKey: 'status_claimed' },
    overdue: { color: 'error', labelKey: 'status_overdue' },
    expired: { color: 'error', labelKey: 'status_expired', variant: 'outlined' },
    valid: { color: 'success', labelKey: 'status_valid' },
    invalid: { color: 'error', labelKey: 'status_invalid', variant: 'outlined' },
    paid: { color: 'success', labelKey: 'status_paid' },
    unpaid: { color: 'warning', labelKey: 'status_unpaid' },
    partial: { color: 'warning', labelKey: 'status_partial' },
    shipped: { color: 'primary', labelKey: 'status_shipped' },
    delivered: { color: 'success', labelKey: 'status_delivered' },
  };

const sizeMap: Record<StatusChipSize, ChipProps['size']> = {
  sm: 'small',
  md: 'medium',
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'sm',
  customLabel,
  mapping,
  icon,
  variant,
  color,
  sx,
}) => {
  const { t } = useTranslation();
  const base = DEFAULT_STATUS_MAPPING[status] || {
    color: 'secondary' as const,
    labelKey: status,
  };
  const custom = mapping?.[status] || {};
  const merged: StatusMapping = {
    color: (color || custom.color || base.color) as ChipProps['color'],
    label: custom.label || t(`common.${base.labelKey}`),
    variant: variant || custom.variant || base.variant || 'filled',
  };

  return (
    <Chip
      label={customLabel || merged.label}
      color={merged.color}
      size={sizeMap[size]}
      variant={merged.variant}
      icon={icon}
      sx={{ fontWeight: 500, ...sx }}
    />
  );
};

export default StatusChip;
