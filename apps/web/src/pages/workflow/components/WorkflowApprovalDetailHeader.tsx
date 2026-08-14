import React from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@mui/material';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Approval } from '@/api/workflow';
import { designTokens } from '@/theme/tokens';
import { getChipStatusColor } from '@/utils/status';

const ct= designTokens.colors;

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

export const getStatusText = (status: string, t: (key: string) => string) => {
  const statusMap: Record<string, string> = {
    approved: t('workflow.approval_detail.status.approved'),
    rejected: t('workflow.approval_detail.status.rejected'),
    pending: t('workflow.approval_detail.status.pending'),
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string) => getChipStatusColor(status, 'workflow');

interface WorkflowApprovalDetailHeaderProps {
  approval: Approval | null;
}

export const WorkflowApprovalDetailHeader: React.FC<WorkflowApprovalDetailHeaderProps> = ({
  approval,
}) => {
  const { t } = useTranslation();

  if (!approval) return null;

  return (
    <Chip
      size='small'
      label={getStatusText(approval.status, t)}
      color={getStatusColor(approval.status)}
      icon={getStatusIcon(approval.status) as React.ReactElement}
    />
  );
};
