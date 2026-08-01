/**
 * MobileApproval state management and API calls hook
 * @refactor-split Extracted from MobileApprovalPage.tsx
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useNotificationStore } from '@/store';
import { approvalTaskApi } from '@/api/workflow/approval';
import type { ListParams } from '@/api/workflow/types';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { Package, Users, DollarSign, FileText } from 'lucide-react';

export interface ApprovalItem {
  id: string;
  title: string;
  type: 'purchase' | 'leave' | 'expense' | 'contract' | 'other';
  applicant: string;
  department: string;
  submitTime: string;
  amount?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  steps: {
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }[];
}

export interface ApiApproval {
  id?: string;
  task_id?: string;
  title?: string;
  task_name?: string;
  type?: string;
  applicant_name?: string;
  assignee_name?: string;
  applicant?: string;
  department?: string;
  department_name?: string;
  created_at?: string;
  amount?: string | number;
  priority?: string;
  status?: string;
  description?: string;
  remarks?: string;
  steps?: Array<{
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }>;
}

export const getTypeIcon = (type: ApprovalItem['type']) => {
  switch (type) {
    case 'purchase':
      return <Package style={{ width: 20, height: 20 }} />;
    case 'leave':
      return <Users style={{ width: 20, height: 20 }} />;
    case 'expense':
      return <DollarSign style={{ width: 20, height: 20 }} />;
    case 'contract':
      return <FileText style={{ width: 20, height: 20 }} />;
    default:
      return <FileText style={{ width: 20, height: 20 }} />;
  }
};

export const getTypeColor = (type: ApprovalItem['type']) => {
  switch (type) {
    case 'purchase':
      return 'primary';
    case 'leave':
      return 'success';
    case 'expense':
      return 'warning';
    case 'contract':
      return 'info';
    default:
      return 'default';
  }
};

export const getPriorityColor = (priority: ApprovalItem['priority']) => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
  }
};

export const getPriorityLabel = (
  priority: ApprovalItem['priority'],
  t: (key: string) => string
) => {
  switch (priority) {
    case 'high':
      return t('mobile.approval.priority.urgent');
    case 'medium':
      return t('mobile.approval.priority.normal');
    case 'low':
      return t('mobile.approval.priority.low');
  }
};

export const useMobileApproval = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const tabs = useMemo(
    () => [
      t('mobile.approval.tab.pending'),
      t('mobile.approval.tab.approved'),
      t('mobile.approval.tab.initiated'),
    ],
    [t]
  );

  const mapApiApprovalToApprovalItem = useCallback(
    (apiApproval: ApiApproval): ApprovalItem => {
      const typeMap: Record<string, ApprovalItem['type']> = {
        purchase: 'purchase',
        leave: 'leave',
        expense: 'expense',
        contract: 'contract',
      };
      const priorityMap: Record<string, ApprovalItem['priority']> = {
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      const statusMap: Record<string, ApprovalItem['status']> = {
        pending: 'pending',
        approved: 'approved',
        rejected: 'rejected',
      };
      return {
        id: apiApproval.id || String(apiApproval.task_id || apiApproval.id),
        title:
          apiApproval.title ||
          apiApproval.task_name ||
          `${t('mobile.approval.nav.approval')} ${apiApproval.id}`,
        type: apiApproval.type ? typeMap[apiApproval.type] : 'other',
        applicant:
          apiApproval.applicant_name ||
          apiApproval.assignee_name ||
          apiApproval.applicant ||
          t('mobile.approval.priority.unknown'),
        department: apiApproval.department || apiApproval.department_name || '',
        submitTime: apiApproval.created_at
          ? new Date(apiApproval.created_at).toLocaleString('zh-CN')
          : '',
        amount: apiApproval.amount ? `¥${Number(apiApproval.amount).toFixed(2)}` : undefined,
        priority: apiApproval.priority ? priorityMap[apiApproval.priority] : 'medium',
        status: apiApproval.status ? statusMap[apiApproval.status] : 'pending',
        description: apiApproval.description || apiApproval.remarks || '',
        steps: apiApproval.steps || [
          { name: t('mobile.approval.action.submit'), status: 'completed' },
          { name: t('mobile.approval.status.processing'), status: 'current' },
        ],
      };
    },
    [t]
  );

  const approvalsQuery = useQuery<ApprovalItem[]>({
    queryKey: ['mobile-approvals', activeTab, searchQuery, user?.id],
    queryFn: async () => {
      const params: ListParams = {};
      if (searchQuery) {
        params.search = searchQuery;
      }

      if (activeTab === 0) {
        params.status = 'pending';
        params.assignee_id = user?.id;
      } else if (activeTab === 1) {
        params.status = 'completed';
        params.assignee_id = user?.id;
      } else if (activeTab === 2) {
        params.initiator_id = user?.id;
      }

      const response = await approvalTaskApi.listApprovalTasks(params);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const apiApprovals = (
          Array.isArray(data) ? data : (data.items as ApiApproval[]) || []
        ) as ApiApproval[];
        return apiApprovals.map(mapApiApprovalToApprovalItem);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const approvals = approvalsQuery.data ?? [];
  const loading = approvalsQuery.isLoading;

  useEffect(() => {
    if (approvalsQuery.isError) {
      apiLogger.error(t('mobile.approval.message.load_failed'), approvalsQuery.error);
    }
  }, [approvalsQuery.isError, approvalsQuery.error, t]);

  const handleRefresh = useCallback(async () => {
    await approvalsQuery.refetch();
  }, [approvalsQuery]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleBottomTabChange = useCallback(
    (tabId: string) => {
      switch (tabId) {
        case 'home':
          navigate(MOBILE_PATHS.home);
          break;
        case 'tasks':
          navigate(MOBILE_PATHS.tasks);
          break;
        case 'scan':
          navigate(MOBILE_PATHS.scanPage);
          break;
        case 'approval':
          break;
        case 'profile':
          navigate(MOBILE_PATHS.settings);
          break;
      }
    },
    [navigate]
  );

  const approveMutation = useMutation({
    mutationFn: (approval: ApprovalItem) =>
      approvalTaskApi.approveTask(approval.id, { comment: approvalComment }),
    onSuccess: (_data, approval) => {
      queryClient.setQueryData<ApprovalItem[]>(
        ['mobile-approvals', activeTab, searchQuery, user?.id],
        (prev) => (prev ?? []).filter((a) => a.id !== approval.id)
      );
      setSelectedApproval(null);
      setApprovalComment('');
      addNotification({
        title: t('mobile.approval.status.approved'),
        message: `${approval.title} ${t('mobile.approval.status.passed')}`,
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('mobile.approval.message.approve_failed'), err);
      addNotification({
        title: t('mobile.approval.message.action_failed'),
        message: t('mobile.approval.message.approve_retry'),
        type: 'error',
      });
    },
  });

  const handleApprove = useCallback(
    (approval: ApprovalItem) => {
      approveMutation.mutate(approval);
    },
    [approveMutation]
  );

  const rejectMutation = useMutation({
    mutationFn: (approval: ApprovalItem) =>
      approvalTaskApi.rejectTask(approval.id, { comment: approvalComment }),
    onSuccess: (_data, approval) => {
      queryClient.setQueryData<ApprovalItem[]>(
        ['mobile-approvals', activeTab, searchQuery, user?.id],
        (prev) => (prev ?? []).filter((a) => a.id !== approval.id)
      );
      setSelectedApproval(null);
      setApprovalComment('');
      addNotification({
        title: t('mobile.approval.status.rejected'),
        message: `${approval.title} ${t('mobile.approval.status.rejected')}`,
        type: 'warning',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('mobile.approval.message.reject_failed'), err);
      addNotification({
        title: t('mobile.approval.message.action_failed'),
        message: t('mobile.approval.message.reject_retry'),
        type: 'error',
      });
    },
  });

  const handleReject = useCallback(
    (approval: ApprovalItem) => {
      rejectMutation.mutate(approval);
    },
    [rejectMutation]
  );

  const processing = approveMutation.isPending || rejectMutation.isPending;

  const filteredApprovals = useMemo(
    () =>
      approvals.filter((approval) => {
        if (!searchQuery) return true;
        return (
          approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          approval.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          approval.applicant.includes(searchQuery)
        );
      }),
    [approvals, searchQuery]
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedApproval,
    setSelectedApproval,
    approvalComment,
    setApprovalComment,
    tabs,
    approvals,
    loading,
    processing,
    filteredApprovals,
    handleRefresh,
    handleTabChange,
    handleBottomTabChange,
    handleApprove,
    handleReject,
  };
};
