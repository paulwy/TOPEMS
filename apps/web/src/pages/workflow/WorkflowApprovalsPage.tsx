import React, { useState, useCallback } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Stack, Typography, TextField } from '@mui/material';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ArrowRightLeft,
} from 'lucide-react';
import i18n from '@/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '../../store';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { useConfirmDialog } from '@/hooks';
import { extractErrorMessage } from '@/utils/errors';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { approvalTaskApi } from '@/api/workflow/approval';
import type { ApiResponse } from '@/api/client';
import { workflowApprovalSchema } from '@/schemas/workflow';
type TabType = 'pending' | 'approved' | 'initiated' | 'cc';
interface ApprovalTask {
  id: string;
  title: string;
  workflowName: string;
  workflowType: string;
  initiator: string;
  initiatorAvatar?: string;
  receivedAt: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'claimed';
  instanceId: string;
  nodeName: string;
}
interface ApprovalTaskApiItem {
  id: string;
  task_name: string;
  workflow_name: string;
  initiator_id: string;
  status: string;
  node_name: string;
  created_at: string;
  priority?: string;
}
const mapApiItemToTask = (item: ApprovalTaskApiItem): ApprovalTask => ({
  id: item.id,
  title: item.task_name,
  workflowName: item.workflow_name || i18n.t('workflow.workflow_approvals_page.k0'),
  workflowType: i18n.t('workflow.workflow_approvals_page.k1'),
  initiator: item.initiator_id || i18n.t('workflow.workflow_approvals_page.k2'),
  receivedAt: item.created_at || '',
  priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
  status: (item.status as 'pending' | 'approved' | 'rejected' | 'claimed') || 'pending',
  instanceId: item.id,
  nodeName: item.node_name || i18n.t('workflow.workflow_approvals_page.k3'),
});
export const WorkflowApprovalsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const { confirmOpen, confirmConfig, closeConfirm } = useConfirmDialog();
  const getStatusParam = (tab: TabType): string | undefined => {
    switch (tab) {
      case 'pending':
        return 'pending';
      case 'approved':
        return undefined;
      default:
        return undefined;
    }
  };
  const filterByTab = (tasks: ApprovalTask[], tab: TabType): ApprovalTask[] => {
    switch (tab) {
      case 'pending':
        return tasks.filter((t) => t.status === 'pending' || t.status === 'claimed');
      case 'approved':
        return tasks.filter((t) => t.status === 'approved' || t.status === 'rejected');
      case 'initiated':
        return tasks.filter((t) => t.initiator === i18n.t('workflow.workflow_approvals_page.k4'));
      case 'cc':
        return tasks.filter((t) => t.status === 'approved');
      default:
        return tasks;
    }
  };
  const createApiAdapter = (tab: TabType): CrudApiAdapter<ApprovalTask> => ({
    list: async (params) => {
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      const statusParam = getStatusParam(tab);
      const res = await approvalTaskApi.listApprovalTasks({
        page,
        page_size: pageSize,
        status: statusParam,
      });
      const apiRes = res as unknown as ApiResponse<{
        items: ApprovalTaskApiItem[];
        total: number;
      }>;
      let tasks: ApprovalTask[] = [];
      let total = 0;
      if (apiRes.success && apiRes.data) {
        tasks = apiRes.data.items.map(mapApiItemToTask);
        total = apiRes.data.total || tasks.length;
      }
      tasks = filterByTab(tasks, tab);
      if (params?.search) {
        const q = (params.search as string).toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.workflowName.toLowerCase().includes(q) ||
            t.initiator.toLowerCase().includes(q)
        );
      }
      if (typeof params?.status === 'string' && params.status !== 'all') {
        tasks = tasks.filter((t) => t.status === params.status);
      }
      if (typeof params?.priority === 'string' && params.priority !== 'all') {
        tasks = tasks.filter((t) => t.priority === params.priority);
      }
      total = tasks.length;
      const start = (page - 1) * pageSize;
      const paged = tasks.slice(start, start + pageSize);
      return { data: paged, total };
    },
    create: async () => ({}) as ApprovalTask,
    update: async (_id, _data) => ({}) as ApprovalTask,
    delete: async () => {},
  });
  const handleApprove = useCallback(
    async (row: Record<string, unknown>) => {
      const task = row as unknown as ApprovalTask;
      try {
        await approvalTaskApi.approveTask(task.id, { comment: '' });
        queryClient.invalidateQueries({ queryKey: [workflowApprovalSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
        addNotification({
          title: i18n.t('workflow.workflow_approvals_page.k5'),
          message: `${i18n.t('pages.workflow_approvals_page.k0')}${task.title}${i18n.t('pages.workflow_approvals_page.k1')}`,
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: i18n.t('workflow.workflow_approvals_page.k6'),
          message: extractErrorMessage(err, i18n.t('workflow.workflow_approvals_page.k7')),
          type: 'error',
        });
      }
    },
    [queryClient, addNotification]
  );
  const handleRejectClick = useCallback((row: Record<string, unknown>) => {
    const task = row as unknown as ApprovalTask;
    setSelectedTask(task);
    setRejectReason('');
    setRejectDialogOpen(true);
  }, []);
  const handleRejectConfirm = useCallback(async () => {
    if (!selectedTask) return;
    try {
      await approvalTaskApi.rejectTask(selectedTask.id, { comment: rejectReason });
      queryClient.invalidateQueries({ queryKey: [workflowApprovalSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
      setRejectDialogOpen(false);
      setSelectedTask(null);
      addNotification({
        title: i18n.t('workflow.workflow_approvals_page.k8'),
        message: `${i18n.t('pages.workflow_approvals_page.k2')}${selectedTask.title}${i18n.t('pages.workflow_approvals_page.k3')}`,
        type: 'warning',
      });
    } catch (err) {
      addNotification({
        title: i18n.t('workflow.workflow_approvals_page.k9'),
        message: extractErrorMessage(err, i18n.t('workflow.workflow_approvals_page.k10')),
        type: 'error',
      });
    }
  }, [selectedTask, rejectReason, queryClient, addNotification]);
  const handleViewDetail = useCallback(
    (row: Record<string, unknown>) => {
      const task = row as unknown as ApprovalTask;
      addNotification({
        title: i18n.t('workflow.workflow_approvals_page.k11'),
        message: `${i18n.t('pages.workflow_approvals_page.k4')}${task.title}${i18n.t('pages.workflow_approvals_page.k5')}`,
        type: 'info',
      });
    },
    [addNotification]
  );
  const handleTransfer = useCallback(
    (row: Record<string, unknown>) => {
      const task = row as unknown as ApprovalTask;
      addNotification({
        title: i18n.t('workflow.workflow_approvals_page.k12'),
        message: `${i18n.t('pages.workflow_approvals_page.k6')}${task.title}${i18n.t('pages.workflow_approvals_page.k7')}`,
        type: 'info',
      });
    },
    [addNotification]
  );
  const customRowActions: RowAction[] = [
    {
      key: 'approve',
      label: i18n.t('workflow.workflow_approvals_page.k13'),
      icon: <CheckCircle size={16} />,
      color: 'success',
      onClick: handleApprove,
      show: (row) => row.status === 'pending' || row.status === 'claimed',
    },
    {
      key: 'reject',
      label: i18n.t('workflow.workflow_approvals_page.k14'),
      icon: <XCircle size={16} />,
      color: 'error',
      onClick: handleRejectClick,
      show: (row) => row.status === 'pending' || row.status === 'claimed',
    },
    {
      key: 'view',
      label: i18n.t('workflow.workflow_approvals_page.k15'),
      icon: <Eye size={16} />,
      color: 'secondary',
      onClick: handleViewDetail,
    },
    {
      key: 'transfer',
      label: i18n.t('workflow.workflow_approvals_page.k16'),
      icon: <ArrowRightLeft size={16} />,
      color: 'secondary',
      onClick: handleTransfer,
      show: (row) => row.status === 'pending' || row.status === 'claimed',
    },
  ];
  const renderStatsCards = (_tab: TabType) => {
    const stats = [
      {
        id: 'pending',
        title: i18n.t('workflow.workflow_approvals_page.k17'),
        value: 0,
        icon: <Clock size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approved',
        title: i18n.t('workflow.workflow_approvals_page.k18'),
        value: 0,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
      },
      {
        id: 'rejected',
        title: i18n.t('workflow.workflow_approvals_page.k19'),
        value: 0,
        icon: <XCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'timeout',
        title: i18n.t('workflow.workflow_approvals_page.k20'),
        value: 0,
        icon: <AlertTriangle size={20} />,
        color: 'error' as const,
      },
    ];
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          mb: 3,
        }}
      >
        {stats.map((item) => (
          <Card
            key={item.id}
            sx={{
              transition: 'all 0.2s',
              '&:hover': { boxShadow: 2 },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack
                direction='row'
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: `${item.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: `${item.color}.main`,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {item.value}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {item.title}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };
  const tabHeaders = (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => {
          setActiveTab(newValue);
        }}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            minHeight: 48,
            fontWeight: 500,
          },
        }}
      >
        <Tab
          label={i18n.t('workflow.workflow_approvals_page.k21')}
          value='pending'
        />
        <Tab
          label={i18n.t('workflow.workflow_approvals_page.k22')}
          value='approved'
        />
        <Tab
          label={i18n.t('workflow.workflow_approvals_page.k23')}
          value='initiated'
        />
        <Tab
          label={i18n.t('workflow.workflow_approvals_page.k24')}
          value='cc'
        />
      </Tabs>
    </Box>
  );
  return (
    <PageContainer
      headerProps={{
        pageIcon: <CheckSquare size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      {tabHeaders}
      {renderStatsCards(activeTab)}
      <CrudPage
        key={activeTab}
        schema={workflowApprovalSchema}
        apiAdapter={createApiAdapter(activeTab)}
        customRowActions={customRowActions}
        idField='id'
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={closeConfirm}
        onConfirm={() => {
          confirmConfig?.onConfirm();
          closeConfirm();
        }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        danger={confirmConfig?.danger}
      />
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => !rejectReason && setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title={i18n.t('workflow.workflow_approvals_page.k25')}
        message={`${i18n.t('pages.workflow_approvals_page.k8')}${selectedTask?.title}${i18n.t('pages.workflow_approvals_page.k9')}`}
        confirmLabel={i18n.t('workflow.workflow_approvals_page.k26')}
        cancelLabel={i18n.t('workflow.workflow_approvals_page.k27')}
        danger
        type='warning'
      >
        <Stack
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            确定要驳回「{selectedTask?.title}」的审批吗？
          </Typography>
          <TextField
            size='small'
            label={i18n.t('workflow.workflow_approvals_page.k28')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={i18n.t('workflow.workflow_approvals_page.k29')}
            multiline
            rows={3}
            fullWidth
          />
        </Stack>
      </ConfirmDialog>
    </PageContainer>
  );
};
export default WorkflowApprovalsPage;