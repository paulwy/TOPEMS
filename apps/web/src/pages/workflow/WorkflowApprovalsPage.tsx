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

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
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

const MOCK_TASKS: ApprovalTask[] = [
  {
    id: 'task-001',
    title: '2024年度采购计划审批',
    workflowName: '采购审批流程',
    workflowType: '采购管理',
    initiator: '张三',
    receivedAt: '2024-01-15 09:30:00',
    priority: 'high',
    status: 'pending',
    instanceId: 'inst-001',
    nodeName: '部门经理审批',
  },
  {
    id: 'task-002',
    title: '员工李四年假申请',
    workflowName: '请假审批流程',
    workflowType: '人事管理',
    initiator: '李四',
    receivedAt: '2024-01-15 10:15:00',
    priority: 'medium',
    status: 'pending',
    instanceId: 'inst-002',
    nodeName: '直属上级审批',
  },
  {
    id: 'task-003',
    title: '项目启动经费申请',
    workflowName: '费用报销流程',
    workflowType: '财务管理',
    initiator: '王五',
    receivedAt: '2024-01-14 14:20:00',
    priority: 'high',
    status: 'pending',
    instanceId: 'inst-003',
    nodeName: '财务主管审批',
  },
  {
    id: 'task-004',
    title: '办公设备采购申请',
    workflowName: '采购审批流程',
    workflowType: '采购管理',
    initiator: '赵六',
    receivedAt: '2024-01-14 16:45:00',
    priority: 'low',
    status: 'pending',
    instanceId: 'inst-004',
    nodeName: '行政主管审批',
  },
  {
    id: 'task-005',
    title: '2024年Q1市场预算审批',
    workflowName: '预算审批流程',
    workflowType: '财务管理',
    initiator: '钱七',
    receivedAt: '2024-01-13 11:00:00',
    priority: 'high',
    status: 'approved',
    instanceId: 'inst-005',
    nodeName: '总经理审批',
  },
  {
    id: 'task-006',
    title: '新员工入职审批',
    workflowName: '入职审批流程',
    workflowType: '人事管理',
    initiator: '孙八',
    receivedAt: '2024-01-13 09:30:00',
    priority: 'medium',
    status: 'approved',
    instanceId: 'inst-006',
    nodeName: 'HR总监审批',
  },
  {
    id: 'task-007',
    title: '差旅费用报销',
    workflowName: '费用报销流程',
    workflowType: '财务管理',
    initiator: '周九',
    receivedAt: '2024-01-12 15:30:00',
    priority: 'medium',
    status: 'rejected',
    instanceId: 'inst-007',
    nodeName: '财务主管审批',
  },
  {
    id: 'task-008',
    title: '合同续签审批',
    workflowName: '合同审批流程',
    workflowType: '法务管理',
    initiator: '吴十',
    receivedAt: '2024-01-12 10:00:00',
    priority: 'high',
    status: 'pending',
    instanceId: 'inst-008',
    nodeName: '法务总监审批',
  },
  {
    id: 'task-009',
    title: '系统升级变更申请',
    workflowName: '变更管理流程',
    workflowType: 'IT管理',
    initiator: '郑十一',
    receivedAt: '2024-01-11 14:00:00',
    priority: 'low',
    status: 'approved',
    instanceId: 'inst-009',
    nodeName: 'IT经理审批',
  },
  {
    id: 'task-010',
    title: '加班申请审批',
    workflowName: '加班审批流程',
    workflowType: '人事管理',
    initiator: '冯十二',
    receivedAt: '2024-01-11 18:30:00',
    priority: 'low',
    status: 'rejected',
    instanceId: 'inst-010',
    nodeName: '部门经理审批',
  },
];

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
};

const STATUS_COLORS: Record<ApprovalStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const WORKFLOW_TYPE_COLORS: Record<string, string> = {
  采购管理: 'primary.main',
  人事管理: 'success.main',
  财务管理: 'warning.main',
  法务管理: 'secondary.main',
  IT管理: '#06b6d4',
};

export const WorkflowApprovalsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [tasks, setTasks] = useState<ApprovalTask[]>(MOCK_TASKS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (activeTab === 'pending') {
      result = result.filter((t) => t.status === 'pending');
    } else if (activeTab === 'approved') {
      result = result.filter((t) => t.status === 'approved' || t.status === 'rejected');
    } else if (activeTab === 'initiated') {
      result = result.filter((t) => t.initiator === '当前用户');
    } else if (activeTab === 'cc') {
      result = result.filter((t) => t.status === 'approved');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.workflowName.toLowerCase().includes(query) ||
          t.initiator.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, statusFilter, priorityFilter]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page]);

  const total = filteredTasks.length;

  const stats = useMemo(() => {
    const pendingCount = tasks.filter((t) => t.status === 'pending').length;
    const approvedCount = tasks.filter((t) => t.status === 'approved').length;
    const rejectedCount = tasks.filter((t) => t.status === 'rejected').length;
    const timeoutCount = tasks.filter(
      (t) => t.status === 'pending' && t.priority === 'high'
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
      try {
        setActionLoading(true);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'approved' as const } : t))
        );
        addNotification({
          title: '审批成功',
          message: `已通过「${task.title}」的审批`,
          type: 'success',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '操作失败',
          message: extractErrorMessage(_err, '审批操作失败'),
          type: 'error',
        });
      } finally {
        setActionLoading(false);
      }
    },
    [addNotification]
  );

  const handleRejectClick = useCallback((task: ApprovalTask) => {
    setSelectedTask(task);
    setRejectReason('');
    setRejectDialogOpen(true);
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!selectedTask) return;
    try {
      setActionLoading(true);
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, status: 'rejected' as const } : t))
      );
      addNotification({
        title: '已驳回',
        message: `已驳回「${selectedTask.title}」的审批`,
        type: 'warning',
      });
      setRejectDialogOpen(false);
      setSelectedTask(null);
    } catch (_err: unknown) {
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(_err, '驳回操作失败'),
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  }, [selectedTask, addNotification]);

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
              style={{ color: '#9ca3af' }}
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
              style={{ color: '#9ca3af' }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {new Date(row.receivedAt).toLocaleString('zh-CN')}
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
            {row.status === 'pending' && (
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
            {row.status === 'pending' && (
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
          href: '/workflow/dashboard',
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
        error={undefined}
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
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 500);
        }}
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
