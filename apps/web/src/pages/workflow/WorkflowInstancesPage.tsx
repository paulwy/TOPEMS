/**
 * 工作流实例列表页面 - V4.0 标准化改造
 *
 * @module pages/workflow
 * @path /workflow/instances
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  PlaySquare,
  Eye,
  Pause,
  XCircle,
  GitBranch,
  User,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Calendar,
  Timer,
} from 'lucide-react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';

/**
 * 实例状态配置
 */
const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'error' | 'warning' | 'default' }
> = {
  running: { label: '运行中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
  suspended: { label: '已挂起', color: 'warning' },
};

/**
 * 流程类型配置
 */
const TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'info' | 'warning' }
> = {
  approval: { label: '审批流', color: 'primary' },
  business: { label: '业务流', color: 'success' },
  notification: { label: '通知流', color: 'info' },
  automation: { label: '自动化', color: 'warning' },
};

interface WorkflowInstance {
  id: string;
  workflow_name: string;
  workflow_code: string;
  workflow_type: string;
  initiator_name: string;
  initiator_avatar?: string;
  current_node: string;
  status: string;
  started_at: string;
  duration?: number;
}

const mockInstances: WorkflowInstance[] = [
  {
    id: '1',
    workflow_name: '采购订单审批',
    workflow_code: 'purchase-order-approval',
    workflow_type: 'approval',
    initiator_name: '张三',
    current_node: '部门经理审批',
    status: 'running',
    started_at: '2024-01-15 09:30:00',
    duration: 3600,
  },
  {
    id: '2',
    workflow_name: '请假审批',
    workflow_code: 'leave-approval',
    workflow_type: 'approval',
    initiator_name: '李四',
    current_node: '已完成',
    status: 'completed',
    started_at: '2024-01-14 14:20:00',
    duration: 7200,
  },
  {
    id: '3',
    workflow_name: '费用报销',
    workflow_code: 'expense-reimbursement',
    workflow_type: 'approval',
    initiator_name: '王五',
    current_node: '财务审核',
    status: 'running',
    started_at: '2024-01-15 10:15:00',
    duration: 1800,
  },
  {
    id: '4',
    workflow_name: '数据同步任务',
    workflow_code: 'data-sync-task',
    workflow_type: 'automation',
    initiator_name: '系统',
    current_node: '已挂起',
    status: 'suspended',
    started_at: '2024-01-15 08:00:00',
    duration: 5400,
  },
  {
    id: '5',
    workflow_name: '合同审批',
    workflow_code: 'contract-approval',
    workflow_type: 'approval',
    initiator_name: '赵六',
    current_node: '已取消',
    status: 'cancelled',
    started_at: '2024-01-13 16:45:00',
    duration: 10800,
  },
  {
    id: '6',
    workflow_name: '库存预警通知',
    workflow_code: 'inventory-alert',
    workflow_type: 'notification',
    initiator_name: '系统',
    current_node: '已完成',
    status: 'completed',
    started_at: '2024-01-15 07:30:00',
    duration: 300,
  },
  {
    id: '7',
    workflow_name: '生产工单流转',
    workflow_code: 'production-workorder',
    workflow_type: 'business',
    initiator_name: '孙七',
    current_node: '车间执行',
    status: 'running',
    started_at: '2024-01-15 06:00:00',
    duration: 14400,
  },
];

export const WorkflowInstancesPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [instances, setInstances] = useState<WorkflowInstance[]>(mockInstances);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setInstances(mockInstances);
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(_err, '加载流程实例失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleViewDetail = useCallback(
    (instance: WorkflowInstance) => {
      navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', instance.id));
    },
    [navigate]
  );

  const handleViewDiagram = useCallback(
    (instance: WorkflowInstance) => {
      navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', instance.id));
    },
    [navigate]
  );

  const handleSuspend = useCallback(
    (instance: WorkflowInstance) => {
      openConfirmDialog({
        title: '确认挂起',
        message: `确定要挂起流程"${instance.workflow_name}"吗？`,
        onConfirm: () => {
          try {
            setInstances((prev) =>
              prev.map((item) =>
                item.id === instance.id
                  ? { ...item, status: 'suspended', current_node: '已挂起' }
                  : item
              )
            );
            addNotification({
              title: '成功',
              message: '流程已挂起',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '挂起流程失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, openConfirmDialog]
  );

  const handleCancel = useCallback(
    (instance: WorkflowInstance) => {
      openConfirmDialog({
        title: '确认取消',
        message: `确定要取消流程"${instance.workflow_name}"吗？此操作不可撤销。`,
        danger: true,
        onConfirm: () => {
          try {
            setInstances((prev) =>
              prev.map((item) =>
                item.id === instance.id
                  ? { ...item, status: 'cancelled', current_node: '已取消' }
                  : item
              )
            );
            addNotification({
              title: '成功',
              message: '流程已取消',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '取消流程失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, openConfirmDialog]
  );

  const filteredInstances = useMemo(() => {
    return instances.filter((instance) => {
      const matchesSearch =
        !searchQuery ||
        instance.workflow_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instance.initiator_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
      const matchesType = typeFilter === 'all' || instance.workflow_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [instances, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const runningCount = instances.filter((i) => i.status === 'running').length;
    const completedCount = instances.filter((i) => i.status === 'completed').length;
    const todayCount = instances.filter((i) => {
      const today = new Date().toDateString();
      return new Date(i.started_at).toDateString() === today;
    }).length;
    const avgDuration =
      instances.length > 0
        ? Math.round(instances.reduce((sum, i) => sum + (i.duration || 0), 0) / instances.length)
        : 0;

    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}秒`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
      return `${Math.round(seconds / 3600)}小时`;
    };

    return [
      {
        id: 'running',
        title: '运行中',
        value: runningCount,
        icon: <Activity size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'completed',
        title: '已完成',
        value: completedCount,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
      },
      {
        id: 'today',
        title: '今日发起',
        value: todayCount,
        icon: <Calendar size={20} />,
        color: 'info' as const,
      },
      {
        id: 'avgDuration',
        title: '平均耗时',
        value: formatDuration(avgDuration),
        icon: <Timer size={20} />,
        color: 'warning' as const,
      },
    ];
  }, [instances]);

  const columns: ColumnDef<WorkflowInstance>[] = useMemo(
    () => [
      {
        id: 'workflow_name',
        label: '流程名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlaySquare
                size={18}
                color='primary.main'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {row.workflow_name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.workflow_code}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'workflow_type',
        label: '流程类型',
        render: (row) => {
          const typeConfig = TYPE_CONFIG[row.workflow_type];
          return (
            <Chip
              size='small'
              label={typeConfig?.label || row.workflow_type}
              color={typeConfig?.color || 'default'}
              variant='outlined'
            />
          );
        },
      },
      {
        id: 'initiator_name',
        label: '发起人',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: 'primary.light',
                color: 'primary.main',
              }}
            >
              {row.initiator_name.charAt(0)}
            </Avatar>
            <Typography variant='body2'>{row.initiator_name}</Typography>
          </Box>
        ),
      },
      {
        id: 'current_node',
        label: '当前节点',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitBranch
              size={14}
              color='text.disabled'
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.current_node}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const statusConfig = STATUS_CONFIG[row.status];
          return (
            <Chip
              size='small'
              label={statusConfig?.label || row.status}
              color={statusConfig?.color || 'default'}
            />
          );
        },
      },
      {
        id: 'started_at',
        label: '发起时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock
              size={14}
              color='text.disabled'
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.started_at}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <Eye
              size={16}
              style={{ cursor: 'pointer', color: 'var(--mui-palette-text-secondary)' }}
              onClick={() => handleViewDetail(row)}
              aria-label='查看详情'
            />
            {row.status === 'running' && (
              <>
                <Pause
                  size={16}
                  style={{ cursor: 'pointer', color: 'var(--mui-palette-warning-main)' }}
                  onClick={() => handleSuspend(row)}
                  aria-label='挂起'
                />
                <XCircle
                  size={16}
                  style={{ cursor: 'pointer', color: 'var(--mui-palette-error-main)' }}
                  onClick={() => handleCancel(row)}
                  aria-label='取消'
                />
              </>
            )}
            <GitBranch
              size={16}
              style={{ cursor: 'pointer', color: 'var(--mui-palette-text-secondary)' }}
              onClick={() => handleViewDiagram(row)}
              aria-label='查看流程图'
            />
          </Box>
        ),
      },
    ],
    [handleViewDetail, handleViewDiagram, handleSuspend, handleCancel]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
      {
        id: 'type',
        label: '流程类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(TYPE_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    if (typeof filters.type === 'string') {
      setTypeFilter(filters.type);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <PlaySquare size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredInstances}
        loading={loading}
        searchable
        searchPlaceholder='搜索流程名称、发起人...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          status: statusFilter,
          type: typeFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredInstances.length,
          onPageChange: handlePageChange,
        }}
        onRefresh={loadData}
        emptyMessage='暂无流程实例'
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
        onConfirm={confirmDialogConfig?.onConfirm}
      />
    </PageContainer>
  );
};

export default WorkflowInstancesPage;
