import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { getChipStatusColor } from '@/utils/status';
import i18n from '@/i18n';

const ct = designTokens.colors;
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return (
        <CheckCircle
          size={20}
          style={{ color: ct.success[600] }}
        />
      );
    case 'rejected':
      return (
        <XCircle
          size={20}
          style={{ color: ct.error[600] }}
        />
      );
    case 'pending':
      return (
        <Clock
          size={20}
          style={{ color: ct.warning[600] }}
        />
      );
    default:
      return (
        <AlertCircle
          size={20}
          style={{ color: ct.grey[500] }}
        />
      );
  }
};
export const getStatusText = (status: string, _t: (key: string) => string) => {
  const statusMap: Record<string, string> = {
    approved: i18n.t('workflow.approval_detail.status.approved'),
    rejected: i18n.t('workflow.approval_detail.status.rejected'),
    pending: i18n.t('workflow.approval_detail.status.pending'),
  };
  return statusMap[status] || status;
};
export const getStatusColor = (status: string) => getChipStatusColor(status, 'workflow');
