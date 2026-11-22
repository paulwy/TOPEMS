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
  none: 'default',
  approved: 'success',
  processed: 'success',
  ready: 'success',
  planned: 'default',
  requisitioned: 'info',
  sourced: 'success',
  satisfied: 'success',
  shortage: 'error',
  available: 'success',
  allocated: 'info',
  consumed: 'success',
  opened: 'info',
  empty: 'default',
  rejected: 'error',
  unqualified: 'error',
  qualified: 'success',
  pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  canceled: 'error',
  terminated: 'error',
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
  generated: 'info',
  identified: 'error',
  reported: 'error',
  assessed: 'warning',
  controlled: 'success',
  rectifying: 'warning',
  pending_verification: 'info',
  awarded: 'success',
  archived: 'default',
  submitted: 'info',
  created: 'warning',
  confirmed: 'info',
  waiting: 'warning',
  picking: 'info',
  picked: 'success',
  short_picked: 'warning',
  packing: 'warning',
  shipping: 'success',
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
  won: 'success',
  lost: 'error',
  closed: 'default',
  partial: 'warning',
  full: 'error',
  claimed: 'info',
  receiving: 'primary',
  processing: 'primary',
  progressing: 'warning',
  deprecated: 'warning',
  idle: 'default',
  in_stock: 'info',
  out_stock: 'default',
  reserved: 'warning',
  inspecting: 'info',
  in_use: 'info',
  maintenance: 'warning',
  scrapped: 'error',
  transferred: 'default',
  error: 'error',
  normal: 'success',
  'in-progress': 'info',
  // finance 状态单一源（W5-B B4～B16）补充键，避免业务单据状态落到灰色 fallback
  posted: 'success',
  reversed: 'warning',
  disputed: 'error',
  discrepancy: 'error',
  matched: 'success',
  unmatched: 'warning',
  diff: 'warning',
  linked: 'info',
  locked: 'default',
  written_off: 'success',
  evaluated: 'info',
  recognized: 'info',
  verified: 'success',
  calculated: 'info',
  validated: 'success',
  adopted: 'success',
  superseded: 'default',
  accepted: 'success',
  proposed: 'info',
  under_review: 'warning',
  executed: 'success',
  generating: 'primary',
  reimbursed: 'success',
  // finance 其余 Rust 状态枚举（saga/结算/期间/审计/预测），B18 盘点闭环
  aborted: 'error',
  compensated: 'warning',
  compensating: 'warning',
  skipped: 'default',
  partially_settled: 'warning',
  settled: 'success',
  unsettled: 'warning',
  closing: 'warning',
  ignored: 'default',
  suppressed: 'default',
  // 跨域 Rust 状态枚举色板（B20，按域分组）
  deleted: 'default',
  trial: 'info',
  invited: 'info',
  blacklisted: 'error',
  restored: 'success',
  pending_review: 'warning',
  verifying: 'info',
  offline: 'default',
  online: 'success',
  standby: 'info',
  published: 'success',
  received: 'info',
  unknown: 'default',
  breaching: 'error',
  insufficient_data: 'default',
  compliant: 'success',
  non_compliant: 'error',
  partially_compliant: 'warning',
  under_assessment: 'info',
  assigned: 'info',
  timeout: 'error',
  danger: 'error',
  frozen: 'error',
  not_applicable: 'default',
  false_positive: 'default',
  destroyed: 'default',
  pending_destruction: 'warning',
  good: 'success',
  neutral: 'default',
  partially_failed: 'warning',
  executing: 'primary',
  impact_assessed: 'info',
  rolled_back: 'warning',
  stakeholder_notified: 'info',
  blocked: 'error',
  done: 'success',
  in_review: 'warning',
  todo: 'default',
  not_started: 'default',
  other: 'default',
  invoiced: 'success',
  investigating: 'warning',
  tested: 'success',
  initiated: 'info',
  lagging: 'warning',
  retired: 'default',
  applied: 'success',
  passed: 'success',
  downloaded: 'success',
  downloading: 'info',
  installed: 'success',
  installing: 'info',
  rollback: 'warning',
  revoked: 'error',
  deploying: 'info',
  rolling_back: 'warning',
  canary: 'info',
  staging: 'info',
  new: 'info',
  conflict: 'error',
  synced: 'success',
  syncing: 'info',
  discovering: 'info',
  planning: 'info',
  validating: 'info',
  sunset: 'default',
  unsupported: 'error',
  preview: 'info',
  achieved: 'success',
  delayed: 'error',
  pending_approval: 'warning',
  sending: 'info',
  sent: 'success',
  max_retries_exceeded: 'error',
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
