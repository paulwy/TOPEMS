import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Stack,
  TextField,
  FormLabel,
  Button,
} from '@mui/material';
import { CheckCircle, XCircle, Loader2, ArrowRightLeft } from 'lucide-react';
import type { Approval } from '@/api/workflow';

interface WorkflowApprovalActionsProps {
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
  handleProcessApproval: () => void;
  handleDelegate: () => void;
  processing: boolean;
  delegateLoading: boolean;
}

export const WorkflowApprovalActions: React.FC<WorkflowApprovalActionsProps> = ({
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
  handleProcessApproval,
  handleDelegate,
  processing,
  delegateLoading,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Dialog
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
      >
        <DialogTitle>
          {approvalAction === 'approve'
            ? ` + ${t('workflow.approval_detail.dialog.approve_action')} + `
            : t('workflow.approval_detail.dialog.reject_action')}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {approvalAction === 'approve'
              ? ` + ${t('workflow.approval_detail.dialog.confirm_approve')} + `
              : t('workflow.approval_detail.dialog.confirm_reject')}
          </Typography>
          {approval && (
            <>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 1 }}
              >
                {t('workflow.approval_detail.dialog.task_with_val', { name: approval.task_name })}
              </Typography>
              {approval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600', mb: 1 }}
                >
                  {t('workflow.approval_detail.dialog.node_with_val', { name: approval.node_id })}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <FormLabel>
              {approvalAction === 'reject'
                ? ` + ${t('workflow.approval_detail.dialog.reject_reason_required')} + `
                : t('workflow.approval_detail.dialog.remark')}
            </FormLabel>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                approvalAction === 'reject'
                  ? ` + ${t('workflow.approval_detail.dialog.please_input_reject_reason')} + `
                  : t('workflow.approval_detail.dialog.optional_remark')
              }
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowApprovalModal(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant='contained'
            onClick={handleProcessApproval}
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
            {approvalAction === 'approve'
              ? ` + ${t('workflow.approval_detail.dialog.confirm_approve_btn')} + `
              : t('workflow.approval_detail.dialog.confirm_reject_btn')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('workflow.approval_detail.dialog.delegate_task')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {t('workflow.approval_detail.dialog.delegate_desc')}
          </Typography>
          {approval && (
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 1 }}
            >
              {t('workflow.approval_detail.dialog.current_task', { name: approval.task_name })}
            </Typography>
          )}
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              size='small'
              label={t('workflow.approval_detail.dialog.delegate_target_required')}
              value={delegateTarget}
              onChange={(e) => setDelegateTarget(e.target.value)}
              placeholder={t('workflow.approval_detail.dialog.delegate_target_placeholder')}
              fullWidth
            />
            <TextField
              size='small'
              label={t('workflow.approval_detail.dialog.delegate_reason')}
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              placeholder={t('workflow.approval_detail.dialog.delegate_reason_placeholder')}
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
            {t('common.cancel')}
          </Button>
          <Button
            variant='contained'
            onClick={handleDelegate}
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
            {t('workflow.approval_detail.dialog.confirm_delegate')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface UseApprovalActionsReturn {
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant: 'contained' | 'outlined';
    color: 'success' | 'error' | 'primary' | 'info';
  }>;
}

export const useApprovalActions = (
  approval: Approval | null,
  setApprovalAction: (action: 'approve' | 'reject') => void,
  setComment: (comment: string) => void,
  setShowApprovalModal: (show: boolean) => void,
  setDelegateTarget: (target: string) => void,
  setDelegateReason: (reason: string) => void,
  setShowDelegateModal: (show: boolean) => void,
  t: (key: string) => string
): UseApprovalActionsReturn => {
  const actions = React.useMemo(() => {
    if (!approval || approval.status !== 'pending') return [];

    return [
      {
        label: t('workflow.approval_detail.label.approve'),
        icon: <CheckCircle size={18} />,
        onClick: () => {
          setApprovalAction('approve');
          setComment('');
          setShowApprovalModal(true);
        },
        variant: 'contained' as const,
        color: 'success' as const,
      },
      {
        label: t('workflow.approval_detail.label.reject'),
        icon: <XCircle size={18} />,
        onClick: () => {
          setApprovalAction('reject');
          setComment('');
          setShowApprovalModal(true);
        },
        variant: 'contained' as const,
        color: 'error' as const,
      },
      {
        label: t('workflow.approval_detail.label.delegate'),
        icon: <ArrowRightLeft size={18} />,
        onClick: () => {
          setDelegateTarget('');
          setDelegateReason('');
          setShowDelegateModal(true);
        },
        variant: 'outlined' as const,
        color: 'primary' as const,
      },
      {
        label: t('workflow.approval_detail.label.assign'),
        icon: <ArrowRightLeft size={18} />,
        onClick: () => {
          setDelegateTarget('');
          setDelegateReason('');
          setShowDelegateModal(true);
        },
        variant: 'outlined' as const,
        color: 'info' as const,
      },
    ];
  }, [
    approval,
    t,
    setApprovalAction,
    setComment,
    setShowApprovalModal,
    setDelegateTarget,
    setDelegateReason,
    setShowDelegateModal,
  ]);

  return { actions };
};
