/**
 * PmProjectDetailPage shared constants
 * @done V79 Phase 2 split
 */
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
export const getStatusLabels = (t: (key: string) => string): Record<string, string> => ({
  active: i18n.t('pm.project_detail.status.active'),
  completed: i18n.t('pm.project_detail.status.completed'),
  pending: i18n.t('pm.project_detail.status.pending'),
  approved: i18n.t('pm.project_detail.status.approved'),
  cancelled: i18n.t('pm.project_detail.status.cancelled'),
  draft: i18n.t('pm.project_detail.status.draft'),
});
export const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  active: { bgcolor: 'success.lighter', color: ct.success[800] },
  completed: { bgcolor: 'primary.100', color: 'primary.800' },
  pending: { bgcolor: 'warning.100', color: ct.yellow[700] },
  approved: { bgcolor: 'secondary.100', color: 'secondary.dark' },
  cancelled: { bgcolor: 'grey.100', color: 'grey.700' },
  draft: { bgcolor: 'grey.100', color: 'text.secondary' },
};
export const getRiskLabels = (t: (key: string) => string): Record<string, string> => ({
  high: i18n.t('pm.project_detail.risk.high'),
  medium: i18n.t('pm.project_detail.risk.medium'),
  low: i18n.t('pm.project_detail.risk.low'),
});
export const RISK_COLORS: Record<string, { bgcolor: string; color: string }> = {
  high: { bgcolor: 'error.lighter', color: ct.error[800] },
  medium: { bgcolor: 'warning.100', color: ct.yellow[700] },
  low: { bgcolor: 'success.lighter', color: ct.success[800] },
};
