import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
} from '@mui/material';
import {
  CheckSquare,
  Clock,
  User,
  Eye,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  ArrowRightLeft,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { approvalTaskApi } from '@/api/workflow/approval';
import type { ApiResponse } from '@/api/client';

const ct = designTokens.colors;

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'claimed';
type ApprovalPriority = 'high' | 'medium' | 'low';
type TabType = 'pending' | 'approved' | 'initiated' | 'cc';

interface ApprovalTask {
  id: string;
  title: string;
  workflowName: string;
  workflowType: string;
  initiator: string;
  initiatorAvatar?: string;
  receivedAt: string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
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

const PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_COLORS: Record<ApprovalPriority, 'error' | 'warning' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  claimed: '已认领',
};

const STATUS_COLORS: Record<ApprovalStatus, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  claimed: 'info',
};

const WORKFLOW_TYPE_COLORS: Record<string, string> = {
  采购管理: 'primary.main',
  人事管理: 'success.main',
  财务管理: 'warning.main',
  法务管理: 'secondary.main',
  IT管理: ct.cyan[500],
};

export const WorkflowApprovalsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);

  const statusParam = activeTab === 'pending' ? 'pending' : activeTab === 'approved' ? undefined : undefined;

  const { data: tasks = [], isLoading: loading, error } = useQuery({
    queryKey: ['workflow-approvals', statusParam, page, pageSize],
    queryFn: async () => {
      const params = {
        page,
        page_size: pageSize,
        status: statusParam,
      };
      const res = await approvalTaskApi.listApprovalTasks(params);
      const apiRes = res as unknown as ApiResponse<{ items: ApprovalTaskApiItem[]; total: number }>;

      if (apiRes.success && apiRes.data) {
        return apiRes.data.items.map((item: ApprovalTaskApiItem) => ({
          id: item.id,
          title: item.task_name,
          workflowName: item.workflow_name || '工作流',
          workflowType: '工作流管理',
          initiator: item.initiator_id || '未知用户',
          receivedAt: item.created_at || '',
          priority: (item.priority as ApprovalPriority) || 'medium',
          status: (item.status as ApprovalStatus) || 'pending',
          instanceId: item.id,
          nodeName: item.node_name || '审批节点',
        }));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await approvalTaskApi.approveTask(taskId, { comment: '' });
      return res;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['workflow-approvals'] });
      const previousTasks = queryClient.getQueryData<ApprovalTask[]>(['workflow-approvals']);
      queryClient.setQueryData<ApprovalTask[]>(['workflow-approvals'], (old) =>
        old ? old.map((t: ApprovalTask) => (t.id === taskId ? { ...t, status: 'approved' as const } : t)) : []
      );
      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['workflow-approvals'], context.previousTasks);
      }
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(_err, '审批操作失败'),
        type: 'error',
      });
    },
    onSuccess: (_data, taskId) => {
      const task = tasks.find((t: ApprovalTask) => t.id === taskId);
      addNotification({
        title: '审批成功',
        message: `已通过「${task?.title || ''}」的审批`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['workflow-approvals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const res = await approvalTaskApi.rejectTask(taskId, { comment: reason });
      return res;
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['workflow-approvals'] });
      const previousTasks = queryClient.getQueryData<ApprovalTask[]>(['workflow-approvals']);
      queryClient.setQueryData<ApprovalTask[]>(['workflow-approvals'], (old) =>
        old ? old.map((t: ApprovalTask) => (t.id === taskId ? { ...t, status: 'rejected' as const } : t)) : []
      );
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['workflow-approvals'], context.previousTasks);
      }
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(_err, '驳回操作失败'),
        type: 'error',
      });
    },
    onSuccess: () => {
      setRejectDialogOpen(false);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['workflow-approvals'] });
    },
  });

  const actionLoading = approveMutation.isPending || rejectMutation.isPending;

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workflow-approvals'] });
  }, [queryClient]);

  const filteredTasks = useMemo(() => {
    let result: ApprovalTask[] = tasks;

    if (activeTab === 'pending') {
      result = result.filter((t: ApprovalTask) => t.status === 'pending' || t.status === 'claimed');
    } else if (activeTab === 'approved') {
      result = result.filter((t: ApprovalTask) => t.status === 'approved' || t.status === 'rejected');
    } else if (activeTab === 'initiated') {
      result = result.filter((t: ApprovalTask) => t.initiator === '当前用户');
    } else if (activeTab === 'cc') {
      result = result.filter((t: ApprovalTask) => t.status === 'approved');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t: ApprovalTask) =>
          t.title.toLowerCase().includes(query) ||
          t.workflowName.toLowerCase().includes(query) ||
          t.initiator.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((t: ApprovalTask) => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t: ApprovalTask) => t.priority === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, statusFilter, priorityFilter]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page]);

  const total = filteredTasks.length;

  const stats = useMemo(() => {
    const pendingCount = tasks.filter((t: ApprovalTask) => t.status === 'pending').length;
    const approvedCount = tasks.filter((t: ApprovalTask) => t.status === 'approved').length;
    const rejectedCount = tasks.filter((t: ApprovalTask) => t.status === 'rejected').length;
    const timeoutCount = tasks.filter(
      (t: ApprovalTask) => t.status === 'pending' && t.priority === 'high'
    ).length;

    return [
      {
        id: 'pending',
        title: '待审批',
        value: pendingCount,
        icon: <Clock size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approved',
        title: '已通过',
        value: approvedCount,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
      },
      {
        id: 'rejected',
        title: '已驳回',
        value: rejectedCount,
        icon: <XCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'timeout',
        title: '超时预警',
        value: timeoutCount,
        icon: <AlertTriangle size={20} />,
        color: 'error' as const,
      },
    ];
  }, [tasks]);

  const getPriorityChip = useCallback((priority: ApprovalPriority) => {
    return (
      <Chip
        size='small'
        color={PRIORITY_COLORS[priority]}
        label={PRIORITY_LABELS[priority]}
        variant='outlined'
      />
    );
  }, []);

  const getStatusChip = useCallback((status: ApprovalStatus) => {
    return (
      <Chip
        size='small'
        color={STATUS_COLORS[status]}
        label={STATUS_LABELS[status]}
        variant='outlined'
      />
    );
  }, []);

  const handleApprove = useCallback(
    (task: ApprovalTask) => {
      approveMutation.mutate(task.id);
    },
    [approveMutation]
  );

  const handleRejectClick = useCallback((task: ApprovalTask) => {
    setSelectedTask(task);
    setRejectReason('');
    setRejectDialogOpen(true);
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!selectedTask) return;
    rejectMutation.mutate({ taskId: selectedTask.id, reason: rejectReason });
    addNotification({
      title: '已驳回',
      message: `已驳回「${selectedTask.title}」的审批`,
      type: 'warning',
    });
  }, [selectedTask, rejectMutation, rejectReason, addNotification]);

  const handleViewDetail = useCallback(
    (task: ApprovalTask) => {
      addNotification({
        title: '查看详情',
        message: `查看「${task.title}」的详情`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleTransfer = useCallback(
    (task: ApprovalTask) => {
      addNotification({
        title: '转交审批',
        message: `转交「${task.title}」的审批`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const columns: ColumnDef<ApprovalTask>[] = useMemo(
    () => [
      {
        id: 'title',
        label: '流程标题',
        minWidth: 240,
        render: (row) => (
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.light',
              }}
            >
              <GitBranch
                size={18}
                color='primary.main'
              />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.title}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <FileText size={12} />
                {row.workflowName}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'workflowType',
        label: '流程类型',
        width: 120,
        render: (row) => (
          <Chip
            size='small'
            label={row.workflowType}
            sx={{
              bgcolor: `${WORKFLOW_TYPE_COLORS[row.workflowType] || 'grey.500'}15`,
              color: WORKFLOW_TYPE_COLORS[row.workflowType] || 'grey.500',
              border: 'none',
            }}
            variant='outlined'
          />
        ),
      },
      {
        id: 'initiator',
        label: '发起人',
        width: 120,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <User
              size={14}
              style={{ color: ct.grey[400] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.initiator}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'receivedAt',
        label: '接收时间',
        width: 160,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Clock
              size={14}
              style={{ color: ct.grey[400] }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.receivedAt ? new Date(row.receivedAt).toLocaleString('zh-CN') : '-'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'priority',
        label: '优先级',
        width: 100,
        render: (row) => getPriorityChip(row.priority),
      },
      {
        id: 'status',
        label: '状态',
        width: 110,
        render: (row) => getStatusChip(row.status),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 180,
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 0.5,
            }}
          >
            {(row.status === 'pending' || row.status === 'claimed') && (
              <>
                <Button
                  size='small'
                  variant='contained'
                  color='success'
                  startIcon={<CheckCircle size={14} />}
                  onClick={() => handleApprove(row)}
                  disabled={actionLoading}
                  sx={{ minWidth: 0, px: 1.5 }}
                >
                  审批
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  color='error'
                  startIcon={<XCircle size={14} />}
                  onClick={() => handleRejectClick(row)}
                  disabled={actionLoading}
                  sx={{ minWidth: 0, px: 1.5 }}
                >
                  驳回
                </Button>
              </>
            )}
            <IconButton
              size='small'
              onClick={() => handleViewDetail(row)}
              title='查看详情'
            >
              <Eye size={16} />
            </IconButton>
            {(row.status === 'pending' || row.status === 'claimed') && (
              <IconButton
                size='small'
                onClick={() => handleTransfer(row)}
                title='转交'
              >
                <ArrowRightLeft size={16} />
              </IconButton>
            )}
          </Box>
        ),
      },
    ],
    [
      getPriorityChip,
      getStatusChip,
      handleApprove,
      handleRejectClick,
      handleViewDetail,
      handleTransfer,
      actionLoading,
    ]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待审批', value: 'pending' },
          { label: '已通过', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已认领', value: 'claimed' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select' as const,
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.priority === 'string') {
      setPriorityFilter(filters.priority);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const tabHeaders = useMemo(
    () => (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            setPage(1);
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
            label='待我审批'
            value='pending'
          />
          <Tab
            label='我已审批'
            value='approved'
          />
          <Tab
            label='我发起的'
            value='initiated'
          />
          <Tab
            label='抄送我的'
            value='cc'
          />
        </Tabs>
      </Box>
    ),
    [activeTab]
  );

  const statsCards = useMemo(
    () => (
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
    ),
    [stats]
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
      {statsCards}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={pagedTasks}
        loading={loading}
        error={error ? extractErrorMessage(error, '加载失败') : undefined}
        searchable
        searchPlaceholder='搜索流程名称、发起人...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          status: statusFilter,
          priority: priorityFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
        }}
        onRefresh={handleRefresh}
        emptyMessage='暂无审批任务'
        getRowId={(row) => row.id}
      />

      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => !actionLoading && setRejectDialogOpen(false)}
        onConfirm={handleRejectConfirm}
        title='驳回审批'
        message={`确定要驳回「${selectedTask?.title}」的审批吗？`}
        confirmLabel='确认驳回'
        cancelLabel='取消'
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
            label='驳回原因'
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='请输入驳回原因'
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
