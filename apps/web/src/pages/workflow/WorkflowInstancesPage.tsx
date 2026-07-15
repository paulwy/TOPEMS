/**
 * 工作流实例列表页面 - V4.0 标准化改造 (React Query 迁移)
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { instanceApi } from '@/api/workflow';
import type { WorkflowInstance } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';

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
  terminated: { label: '已终止', color: 'error' },
  pending: { label: '待处理', color: 'warning' },
  rejected: { label: '已拒绝', color: 'error' },
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

export const WorkflowInstancesPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

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

  const { data: instances = [], isLoading: loading } = useQuery({
    queryKey: ['workflow-instances', page, pageSize, searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      const response = await instanceApi.list({
        page,
        pagesize: pageSize,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      if (response.success && response.data?.items) {
        return response.data.items;
      }
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => instanceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => instanceApi.suspendInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => instanceApi.cancelInstance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
  }, [queryClient]);

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

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
        message: `确定要挂起流程"${instance.workflow_name || instance.name || ''}"吗？`,
        onConfirm: async () => {
          try {
            await suspendMutation.mutateAsync(instance.id);
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
    [addNotification, openConfirmDialog, suspendMutation]
  );

  const handleCancel = useCallback(
    (instance: WorkflowInstance) => {
      openConfirmDialog({
        title: '确认取消',
        message: `确定要取消流程"${instance.workflow_name || instance.name || ''}"吗？此操作不可撤销。`,
        danger: true,
        onConfirm: async () => {
          try {
            await cancelMutation.mutateAsync(instance.id);
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
    [addNotification, openConfirmDialog, cancelMutation]
  );

  const filteredInstances = useMemo(() => {
    return (instances as WorkflowInstance[]).filter((instance: WorkflowInstance) => {
      const workflowName = instance.workflow_name || instance.name || '';
      const initiatorName = instance.start_user_name || '';
      const matchesSearch =
        !searchQuery ||
        workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        initiatorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;

      const workflowType = (instance as any).data?.type as string;
      const matchesType = typeFilter === 'all' || workflowType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [instances, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const instancesArray = instances as WorkflowInstance[];
    const runningCount = instancesArray.filter(
      (i: WorkflowInstance) => i.status === 'running'
    ).length;
    const completedCount = instancesArray.filter(
      (i: WorkflowInstance) => i.status === 'completed'
    ).length;
    const todayCount = instancesArray.filter((i: WorkflowInstance) => {
      const today = new Date().toDateString();
      const date = i.started_at || i.created_at;
      return date && new Date(date).toDateString() === today;
    }).length;

    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}秒`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
      return `${Math.round(seconds / 3600)}小时`;
    };

    let totalDuration = 0;
    let completedWithDuration = 0;
    instancesArray.forEach((i: WorkflowInstance) => {
      if (i.status === 'completed' && i.started_at && i.completed_at) {
        const duration =
          (new Date(i.completed_at).getTime() - new Date(i.started_at).getTime()) / 1000;
        totalDuration += duration;
        completedWithDuration++;
      }
    });
    const avgDuration =
      completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0;

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
                {row.workflow_name || row.name || '-'}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.workflow_id || ''}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'workflow_type',
        label: '流程类型',
        render: (row) => {
          const workflowType = (row as any).data?.type as string;
          const typeConfig = TYPE_CONFIG[workflowType];
          return (
            <Chip
              size='small'
              label={typeConfig?.label || workflowType || '-'}
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
              {(row.start_user_name || 'U').charAt(0)}
            </Avatar>
            <Typography variant='body2'>{row.start_user_name || '-'}</Typography>
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
              {row.currentnode || '-'}
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
              {row.started_at || row.created_at || '-'}
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
        onRefresh={refresh}
        emptyMessage='暂无流程实例'
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
      />
    </PageContainer>
  );
};

export default WorkflowInstancesPage;
