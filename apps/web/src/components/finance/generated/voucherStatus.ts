// 由 scripts/ci/gen-finance-voucher-status.mjs 生成，勿手改。
// 单一源：docs/database/status-check-catalog.json · public.voucher_status
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
  approved: 'finance.voucher_detail_page.status_approved',
  cancelled: 'finance.voucher_detail_page.status_cancelled',
  draft: 'finance.voucher_detail_page.status_draft',
  posted: 'finance.voucher_detail_page.status_posted',
  rejected: 'finance.voucher_detail_page.status_rejected',
  reversed: 'finance.voucher_detail_page.status_reversed',
  submitted: 'finance.voucher_detail_page.status_submitted',
};
