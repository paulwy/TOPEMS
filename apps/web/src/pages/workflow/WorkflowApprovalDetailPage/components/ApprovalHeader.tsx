import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { User, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import type { Approval } from '@/api/workflow';
import { designTokens } from '@/theme/tokens';
import { getChipStatusColor } from '@/utils/status';

const ct= designTokens.colors;

interface ApprovalHeaderProps {
  approval: Approval;
  theme: Theme;
}

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

export const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    approved: '已通过',
    rejected: '已拒绝',
    pending: '待审批',
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string) => getChipStatusColor(status, 'workflow');

const ApprovalHeader: React.FC<ApprovalHeaderProps> = ({ approval, theme }) => {
  const getApprovalTypeText = (type: string | undefined) => {
    switch (type) {
      case 'single':
        return '单人审批';
      case 'counter':
        return '会签审批';
      case 'or':
        return '或签审批';
      default:
        return type || 'N/A';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            审批ID
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {approval.id}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            任务名称
          </Typography>
          <Typography variant='body2'>{approval.task_name}</Typography>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            节点ID
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {approval.node_id || 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            审批类型
          </Typography>
          <Typography variant='body2'>{getApprovalTypeText(approval.approval_type)}</Typography>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            审批人
          </Typography>
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <User size={14} />
            <Typography variant='body2'>{approval.assignee_id || 'N/A'}</Typography>
          </Stack>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 0.5 }}
          >
            创建时间
          </Typography>
          <Typography variant='body2'>{new Date(approval.created_at).toLocaleString()}</Typography>
        </Box>
        {approval.approved_by && (
          <>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                审批人
              </Typography>
              <Typography variant='body2'>{approval.approved_by}</Typography>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                审批时间
              </Typography>
              <Typography variant='body2'>
                {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : 'N/A'}
              </Typography>
            </Box>
          </>
        )}
        {approval.timeout_at && (
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500', mb: 0.5 }}
            >
              超时时间
            </Typography>
            <Typography variant='body2'>
              {new Date(approval.timeout_at).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Box>
      {approval.comment && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mb: 1 }}
          >
            审批意见
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <MessageSquare
                size={16}
                style={{ color: theme.palette.text.disabled, marginTop: 2 }}
              />
              <Typography variant='body2'>{approval.comment}</Typography>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ApprovalHeader;
