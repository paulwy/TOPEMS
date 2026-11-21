// 由 scripts/ci/gen-finance-status.mjs 生成，勿手改。
// 单一源：docs/database/status-check-catalog.json · public PostgreSQL ENUM

export const VOUCHER_STATUS_VALUES = [
  'approved',
  'cancelled',
  'draft',
  'posted',
  'rejected',
  'reversed',
  'submitted',
] as const;

export type VoucherStatus = (typeof VOUCHER_STATUS_VALUES)[number];

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  approved: 'finance.status.voucher_approved',
  cancelled: 'finance.status.voucher_cancelled',
  draft: 'finance.status.voucher_draft',
  posted: 'finance.status.voucher_posted',
  rejected: 'finance.status.voucher_rejected',
  reversed: 'finance.status.voucher_reversed',
  submitted: 'finance.status.voucher_submitted',
};

export const APPROVAL_STATUS_VALUES = ['approved', 'cancelled', 'pending', 'rejected'] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS_VALUES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  approved: 'finance.status.approval_approved',
  cancelled: 'finance.status.approval_cancelled',
  pending: 'finance.status.approval_pending',
  rejected: 'finance.status.approval_rejected',
};

export const MATCH_STATUS_VALUES = ['diff', 'manual', 'matched', 'unmatched'] as const;

export type MatchStatus = (typeof MATCH_STATUS_VALUES)[number];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  diff: 'finance.status.match_diff',
  manual: 'finance.status.match_manual',
  matched: 'finance.status.match_matched',
  unmatched: 'finance.status.match_unmatched',
};

export const PERIOD_STATUS_VALUES = ['closed', 'closing', 'open'] as const;

export type PeriodStatus = (typeof PERIOD_STATUS_VALUES)[number];

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  closed: 'finance.status.period_closed',
  closing: 'finance.status.period_closing',
  open: 'finance.status.period_open',
};

export const RECONCILIATION_STATUS_VALUES = [
  'cancelled',
  'completed',
  'pending',
  'processing',
] as const;

export type ReconciliationStatus = (typeof RECONCILIATION_STATUS_VALUES)[number];

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  cancelled: 'finance.status.reconciliation_cancelled',
  completed: 'finance.status.reconciliation_completed',
  pending: 'finance.status.reconciliation_pending',
  processing: 'finance.status.reconciliation_processing',
};
