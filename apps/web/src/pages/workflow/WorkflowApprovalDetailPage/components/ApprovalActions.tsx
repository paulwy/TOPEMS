import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  TextField,
  FormLabel,
  Button,
  Stack,
} from '@mui/material';
import { CheckCircle, XCircle, Loader2, ArrowRightLeft } from 'lucide-react';
import type { Approval } from '@/api/workflow';

export interface ActionConfig {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'contained' | 'outlined';
  color: 'success' | 'error' | 'primary' | 'info';
}

interface ApprovalActionsProps {
  approval: Approval | null;
  showApprovalModal: boolean;
  setShowApprovalModal: (show: boolean) => void;
  approvalAction: 'approve' | 'reject';
  setApprovalAction: (action: 'approve' | 'reject') => void;
  comment: string;
  setComment: (comment: string) => void;
  showDelegateModal: boolean;
  setShowDelegateModal: (show: boolean) => void;
  delegateTarget: string;
  setDelegateTarget: (target: string) => void;
  delegateReason: string;
  setDelegateReason: (reason: string) => void;
  processing: boolean;
  delegateLoading: boolean;
  onProcessApproval: () => void;
  onDelegate: () => void;
  addNotification: (notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }) => void;
}

export const buildActions = (
  approval: Approval | null,
  setApprovalAction: (action: 'approve' | 'reject') => void,
  setComment: (comment: string) => void,
  setShowApprovalModal: (show: boolean) => void,
  setDelegateTarget: (target: string) => void,
  setDelegateReason: (reason: string) => void,
  setShowDelegateModal: (show: boolean) => void
): ActionConfig[] => {
  if (!approval || approval.status !== 'pending') return [];

  return [
    {
      label: '通过',
      icon: <CheckCircle size={18} />,
      onClick: () => {
        setApprovalAction('approve');
        setComment('');
        setShowApprovalModal(true);
      },
      variant: 'contained',
      color: 'success',
    },
    {
      label: '拒绝',
      icon: <XCircle size={18} />,
      onClick: () => {
        setApprovalAction('reject');
        setComment('');
        setShowApprovalModal(true);
      },
      variant: 'contained',
      color: 'error',
    },
    {
      label: '转办',
      icon: <ArrowRightLeft size={18} />,
      onClick: () => {
        setDelegateTarget('');
        setDelegateReason('');
        setShowDelegateModal(true);
      },
      variant: 'outlined',
      color: 'primary',
    },
    {
      label: '委派',
      icon: <ArrowRightLeft size={18} />,
      onClick: () => {
        setDelegateTarget('');
        setDelegateReason('');
        setShowDelegateModal(true);
      },
      variant: 'outlined',
      color: 'info',
    },
  ];
};

const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  approval,
  showApprovalModal,
  setShowApprovalModal,
  approvalAction,
  comment,
  setComment,
  showDelegateModal,
  setShowDelegateModal,
  delegateTarget,
  setDelegateTarget,
  delegateReason,
  setDelegateReason,
  processing,
  delegateLoading,
  onProcessApproval,
  onDelegate,
}) => {
  return (
    <>
      <Dialog
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
      >
        <DialogTitle>{approvalAction === 'approve' ? '通过审批' : '拒绝审批'}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {approvalAction === 'approve' ? '确认通过该审批任务' : '确认拒绝该审批任务'}
          </Typography>
          {approval && (
            <>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 1 }}
              >
                任务: {approval.task_name}
              </Typography>
              {approval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600', mb: 1 }}
                >
                  节点: {approval.node_id}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <FormLabel>{approvalAction === 'reject' ? '拒绝原因 *' : '备注'}</FormLabel>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'reject' ? '请输入拒绝原因' : '可选备注'}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowApprovalModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={onProcessApproval}
            disabled={processing || (approvalAction === 'reject' && !comment.trim())}
            color={approvalAction === 'approve' ? 'success' : 'error'}
            startIcon={
              processing ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            {approvalAction === 'approve' ? '确认通过' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>转办审批任务</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            将该审批任务转办给其他人员处理
          </Typography>
          {approval && (
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 1 }}
            >
              当前任务: {approval.task_name}
            </Typography>
          )}
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              size='small'
              label='转办目标人员 *'
              value={delegateTarget}
              onChange={(e) => setDelegateTarget(e.target.value)}
              placeholder='请输入目标人员姓名或ID'
              fullWidth
            />
            <TextField
              size='small'
              label='转办原因'
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              placeholder='请输入转办原因'
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowDelegateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={onDelegate}
            disabled={delegateLoading || !delegateTarget.trim()}
            startIcon={
              delegateLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : (
                <ArrowRightLeft size={16} />
              )
            }
          >
            确认转办
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApprovalActions;
