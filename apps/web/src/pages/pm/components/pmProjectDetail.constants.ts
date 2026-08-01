/**
 * PmProjectDetailPage shared constants
 * @done V79 Phase 2 split
 */
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export const getStatusLabels = (t: (key: string) => string): Record<string, string> => ({
  active: t('pm.project_detail.status.active'),
  completed: t('pm.project_detail.status.completed'),
  pending: t('pm.project_detail.status.pending'),
  approved: t('pm.project_detail.status.approved'),
  cancelled: t('pm.project_detail.status.cancelled'),
  draft: t('pm.project_detail.status.draft'),
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
  high: t('pm.project_detail.risk.high'),
  medium: t('pm.project_detail.risk.medium'),
  low: t('pm.project_detail.risk.low'),
});

export const RISK_COLORS: Record<string, { bgcolor: string; color: string }> = {
  high: { bgcolor: 'error.lighter', color: ct.error[800] },
  medium: { bgcolor: 'warning.100', color: ct.yellow[700] },
  low: { bgcolor: 'success.lighter', color: ct.success[800] },
};
