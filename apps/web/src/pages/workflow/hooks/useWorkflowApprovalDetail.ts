import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore, useAuthStore } from '../../../store';
import { apiLogger } from '@/utils/logger';

interface ApprovalDetails {
  approval: Approval;
  records: ApprovalRecord[];
}

export interface UseWorkflowApprovalDetailReturn {
  approval: Approval | null;
  records: ApprovalRecord[];
  loading: boolean;
  error: string | undefined;
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

export const useWorkflowApprovalDetail = (): UseWorkflowApprovalDetailReturn => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState('');
  const [delegateReason, setDelegateReason] = useState('');

  const detailsQuery = useQuery<ApprovalDetails | null>({
    queryKey: ['workflow-approval-details', id],
    queryFn: async () => {
      if (!id) return null;

      const approvalResponse = await workflowApi.getApproval(id);
      if (approvalResponse.success && approvalResponse.data) {
        const data = approvalResponse.data as unknown as Approval;

        let recordsList: ApprovalRecord[] = [];
        const recordsResponse = await workflowApi.getRecordsByApproval(id);
        if (recordsResponse.success && recordsResponse.data) {
          const recordsData = recordsResponse.data as unknown as Record<string, unknown>;
          recordsList = Array.isArray(recordsData)
            ? (recordsData as ApprovalRecord[])
            : (recordsData.items as ApprovalRecord[]) || [];
        }

        return { approval: data, records: recordsList };
      }
      return null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const approval = detailsQuery.data?.approval ?? null;
  const records = detailsQuery.data?.records ?? [];
  const loading = detailsQuery.isLoading;
  const error = detailsQuery.isError
    ? t('workflow.approval_detail.message.load_detail_failed')
    : undefined;

  useEffect(() => {
    if (detailsQuery.isError) {
      apiLogger.error('Failed to load approval details:', detailsQuery.error);
      addNotification({
        title: t('common.error'),
        message: t('workflow.approval_detail.message.load_detail_failed'),
        type: 'error',
      });
    }
  }, [detailsQuery.isError, detailsQuery.error, addNotification, t]);

  const invalidateApprovalQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-approval-details', id] });
  };

  const processApprovalMutation = useMutation({
    mutationFn: (params: { approvalId: string; action: 'approve' | 'reject'; comment?: string }) =>
      workflowApi.processApproval(params.approvalId, {
        action: params.action,
        comment: params.comment,
        actor_id: user?.id || 'system-user-id',
        actor_name: user?.fullName || user?.username || 'Current User',
      }),
    onSuccess: (_data, variables) => {
      invalidateApprovalQueries();
      addNotification({
        title: t('common.success'),
        message: t('workflow.approval_detail.message.approval_action_success', {
          action:
            variables.action === 'approve'
              ? t('workflow.approval_detail.label.approve')
              : t('workflow.approval_detail.label.reject'),
        }),
        type: 'success',
      });
      setShowApprovalModal(false);
      setComment('');
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to process approval:', err);
      addNotification({
        title: t('common.error'),
        message: t('workflow.approval_detail.message.process_approval_failed'),
        type: 'error',
      });
    },
  });

  const delegateMutation = useMutation({
    mutationFn: (params: { approvalId: string; comment?: string; delegateTo: string }) =>
      workflowApi.processApproval(params.approvalId, {
        action: 'delegate',
        comment: params.comment,
        actor_id: user?.id || 'system-user-id',
        actor_name: user?.fullName || user?.username || 'Current User',
        delegate_to: params.delegateTo,
        delegate_to_name: params.delegateTo,
      }),
    onSuccess: (_data, variables) => {
      invalidateApprovalQueries();
      addNotification({
        title: t('common.success'),
        message: t('workflow.approval_detail.message.delegated_to', { name: variables.delegateTo }),
        type: 'success',
      });
      setShowDelegateModal(false);
      setDelegateTarget('');
      setDelegateReason('');
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to delegate:', err);
      addNotification({
        title: t('common.error'),
        message: t('workflow.approval_detail.message.delegate_failed'),
        type: 'error',
      });
    },
  });

  const processing = processApprovalMutation.isPending;
  const delegateLoading = delegateMutation.isPending;

  const handleProcessApproval = () => {
    if (!approval) return;
    if (!comment.trim() && approvalAction === 'reject') {
      addNotification({
        title: t('common.info'),
        message: t('workflow.approval_detail.message.please_input_reject_reason'),
        type: 'info',
      });
      return;
    }

    processApprovalMutation.mutate({
      approvalId: approval.id,
      action: approvalAction,
      comment: comment || undefined,
    });
  };

  const handleDelegate = () => {
    if (!approval || !delegateTarget.trim()) {
      addNotification({
        title: t('common.info'),
        message: t('workflow.approval_detail.message.please_input_delegate_target'),
        type: 'info',
      });
      return;
    }

    delegateMutation.mutate({
      approvalId: approval.id,
      comment: delegateReason || undefined,
      delegateTo: delegateTarget,
    });
  };

  return {
    approval,
    records,
    loading,
    error,
    showApprovalModal,
    setShowApprovalModal,
    approvalAction,
    setApprovalAction,
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
  };
};
