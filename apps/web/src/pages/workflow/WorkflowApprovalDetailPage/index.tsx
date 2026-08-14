import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { FileText, GitBranch } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore, useAuthStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';
import type { TabConfig } from '@/components/templates/DetailPageTemplate';
import { PageContainer } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApprovalHeader, { getStatusText } from './components/ApprovalHeader';
import {
  RecordsTabContent,
  TimelineTabContent,
  FormDataTabContent,
} from './components/ApprovalTimeline';
import i18n from '@/i18n';
import ApprovalActions, { buildActions, type ActionConfig } from './components/ApprovalActions';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
interface ApprovalDetails {
  approval: Approval;
  records: ApprovalRecord[];
}
const FlowApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const user = useAuthStore((state) => state.user);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState('');
  const [delegateReason, setDelegateReason] = useState('');
  const detailsQuery = useQuery<ApprovalDetails | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_APPROVAL_DETAILS_BASE, id],
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
  const error = detailsQuery.isError ? i18n.t('workflow.index.k0') : undefined;
  useEffect(() => {
    if (detailsQuery.isError) {
      apiLogger.error(i18n.t('pages.index.k0'), detailsQuery.error);
      addNotification({
        title: i18n.t('workflow.index.k1'),
        message: i18n.t('workflow.index.k2'),
        type: 'error',
      });
    }
  }, [detailsQuery.isError, detailsQuery.error, addNotification]);
  const invalidateApprovalQueries = () => {
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_APPROVAL_DETAILS_BASE, id] ,
  exact: false,
  refetchType: 'active',
});
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
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_APPROVAL_DETAILS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateApprovalQueries();
      addNotification({
        title: i18n.t('workflow.index.k3'),
        message: `${i18n.t('pages.index.k1')}${variables.action === 'approve' ? i18n.t('workflow.index.k5') : i18n.t('workflow.index.k4')}${i18n.t('pages.index.k2')}`,
        type: 'success',
      });
      setShowApprovalModal(false);
      setComment('');
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.index.k3'), err);
      addNotification({
        title: i18n.t('workflow.index.k6'),
        message: i18n.t('workflow.index.k7'),
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
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_APPROVAL_DETAILS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateApprovalQueries();
      addNotification({
        title: i18n.t('workflow.index.k8'),
        message: `${i18n.t('pages.index.k4')}${variables.delegateTo}`,
        type: 'success',
      });
      setShowDelegateModal(false);
      setDelegateTarget('');
      setDelegateReason('');
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.index.k5'), err);
      addNotification({
        title: i18n.t('workflow.index.k9'),
        message: i18n.t('workflow.index.k10'),
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
        title: i18n.t('workflow.index.k11'),
        message: i18n.t('workflow.index.k12'),
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
        title: i18n.t('workflow.index.k13'),
        message: i18n.t('workflow.index.k14'),
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
  const tabs = useMemo<TabConfig[]>(() => {
    if (!approval) return [];
    return [
      {
        id: 'info',
        label: i18n.t('workflow.index.k15'),
        content: (
          <ApprovalHeader
            approval={approval}
            theme={theme}
          />
        ),
      },
      {
        id: 'records',
        label: i18n.t('workflow.index.k16'),
        badge: records.length,
        content: (
          <RecordsTabContent
            records={records}
            theme={theme}
          />
        ),
      },
      {
        id: 'timeline',
        label: i18n.t('workflow.index.k17'),
        icon: <GitBranch size={16} />,
        content: (
          <TimelineTabContent
            approval={approval}
            records={records}
            theme={theme}
          />
        ),
      },
      {
        id: 'formData',
        label: i18n.t('workflow.index.k18'),
        icon: <FileText size={16} />,
        content: (
          <FormDataTabContent
            approval={approval}
            theme={theme}
          />
        ),
      },
    ];
  }, [approval, records, theme]);
  const actions: ActionConfig[] = useMemo(
    () =>
      buildActions(
        approval,
        setApprovalAction,
        setComment,
        setShowApprovalModal,
        setDelegateTarget,
        setDelegateReason,
        setShowDelegateModal
      ),
    [approval]
  );
  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <DetailPageTemplate
        title={i18n.t('workflow.index.k19')}
        subtitle={approval?.task_name}
        detailItemName={approval?.task_name || approval?.id || i18n.t('workflow.index.k20')}
        loading={loading}
        error={error}
        backHref={WORKFLOW_PATHS.approvals}
        tabs={tabs}
        actions={actions}
        infoCard={
          approval
            ? {
                title: approval.task_name,
                subtitle: `${i18n.t('pages.index.id_6')}${approval.id}`,
                tags: [getStatusText(approval.status)],
              }
            : undefined
        }
      />
      <ApprovalActions
        approval={approval}
        showApprovalModal={showApprovalModal}
        setShowApprovalModal={setShowApprovalModal}
        approvalAction={approvalAction}
        setApprovalAction={setApprovalAction}
        comment={comment}
        setComment={setComment}
        showDelegateModal={showDelegateModal}
        setShowDelegateModal={setShowDelegateModal}
        delegateTarget={delegateTarget}
        setDelegateTarget={setDelegateTarget}
        delegateReason={delegateReason}
        setDelegateReason={setDelegateReason}
        processing={processing}
        delegateLoading={delegateLoading}
        onProcessApproval={handleProcessApproval}
        onDelegate={handleDelegate}
        addNotification={addNotification}
      />
    </PageContainer>
  );
};
export default FlowApprovalDetailPage;