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
import i18n from '@/i18n';
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
      label: i18n.t('pages.approval_actions.k0'),
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
      label: i18n.t('pages.approval_actions.k1'),
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
      label: i18n.t('pages.approval_actions.k2'),
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
      label: i18n.t('pages.approval_actions.k3'),
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
        <DialogTitle>{approvalAction === 'approve' ? i18n.t('pages.approval_actions.k5') : i18n.t('pages.approval_actions.k4')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {approvalAction === 'approve' ? i18n.t('pages.approval_actions.k7') : i18n.t('pages.approval_actions.k6')}
          </Typography>
          {approval && (
            <>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 1 }}
              >
                [i18n.t('pages.approval_actions.k0')]: {approval.task_name}
              </Typography>
              {approval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600', mb: 1 }}
                >
                  [i18n.t('pages.approval_actions.k1')]: {approval.node_id}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <FormLabel>{approvalAction === 'reject' ? i18n.t('pages.approval_actions.k2') : i18n.t('pages.approval_actions.k8')}</FormLabel>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'reject' ? i18n.t('pages.approval_actions.k10') : i18n.t('pages.approval_actions.k9')}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowApprovalModal(false)}
          >
            {i18n.t('pages.approval_actions.k3')}
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
            {approvalAction === 'approve' ? i18n.t('pages.approval_actions.k12') : i18n.t('pages.approval_actions.k11')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.approval_actions.k13')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {i18n.t('pages.approval_actions.k4')}
          </Typography>
          {approval && (
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 1 }}
            >
              [i18n.t('pages.approval_actions.k5')]: {approval.task_name}
            </Typography>
          )}
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              size='small'
              label={i18n.t('pages.approval_actions.k6')}
              value={delegateTarget}
              onChange={(e) => setDelegateTarget(e.target.value)}
              placeholder={i18n.t('pages.approval_actions.id_14')}
              fullWidth
            />
            <TextField
              size='small'
              label={i18n.t('pages.approval_actions.k15')}
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              placeholder={i18n.t('pages.approval_actions.k16')}
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
            {i18n.t('pages.approval_actions.k7')}
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
            {i18n.t('pages.approval_actions.k8')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApprovalActions;
