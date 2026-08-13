import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import {
  PlaySquare,
  GitBranch,
  Pause,
  XCircle,
  Activity,
  CheckCircle,
  Calendar,
  Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '../../store';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { useConfirmDialog } from '@/hooks';
import { extractErrorMessage } from '@/utils/errors';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { instanceApi } from '@/api/workflow';
import type { WorkflowInstance } from '@/api/workflow';
import { workflowInstanceSchema } from '@/schemas/workflow';

export const WorkflowInstancesPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { confirmOpen, confirmConfig, openConfirm, closeConfirm } = useConfirmDialog();

  const apiAdapter: CrudApiAdapter<WorkflowInstance> = {
    list: async (params) => {
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      const response = await instanceApi.list({
        page,
        pagesize: pageSize,
        ...(params?.search ? { search: params.search as string } : {}),
        ...(typeof params?.status === 'string' && params.status !== 'all'
          ? { status: params.status }
          : {}),
      });
      let items: WorkflowInstance[] = [];
      let total = 0;
      if (response.success && response.data) {
        items = (response.data as { items: WorkflowInstance[]; total: number }).items || [];
        total =
          (response.data as { items: WorkflowInstance[]; total: number }).total || items.length;
      }
      if (typeof params?.type === 'string' && params.type !== 'all') {
        items = items.filter((item: WorkflowInstance) => {
          const workflowType = (item.data as Record<string, unknown>)?.type as string;
          return workflowType === params.type;
        });
        total = items.length;
        const start = (page - 1) * pageSize;
        items = items.slice(start, start + pageSize);
      }
      return { data: items, total };
    },
    create: async () => ({}) as WorkflowInstance,
    update: async (_id, _data) => ({}) as WorkflowInstance,
    delete: async (id) => {
      await instanceApi.delete(id);
    },
  };

  const handleViewDetail = useCallback(
    (row: Record<string, unknown>) => {
      const instance = row as unknown as WorkflowInstance;
      navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', instance.id));
    },
    [navigate]
  );

  const handleViewDiagram = useCallback(
    (row: Record<string, unknown>) => {
      const instance = row as unknown as WorkflowInstance;
      navigate(WORKFLOW_PATHS.instanceDetail.replace(':id', instance.id));
    },
    [navigate]
  );

  const handleSuspend = useCallback(
    (row: Record<string, unknown>) => {
      const instance = row as unknown as WorkflowInstance;
      openConfirm({
        title: '确认挂起',
        message: `确定要挂起流程"${instance.workflow_name || instance.name || ''}"吗？`,
        onConfirm: async () => {
          try {
            await instanceApi.suspendInstance(instance.id);
            queryClient.invalidateQueries({ queryKey: [workflowInstanceSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
            addNotification({
              title: '成功',
              message: '流程已挂起',
              type: 'success',
            });
          } catch (err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(err, '挂起流程失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, openConfirm, queryClient]
  );

  const handleCancel = useCallback(
    (row: Record<string, unknown>) => {
      const instance = row as unknown as WorkflowInstance;
      openConfirm({
        title: '确认取消',
        message: `确定要取消流程"${instance.workflow_name || instance.name || ''}"吗？此操作不可撤销。`,
        danger: true,
        onConfirm: async () => {
          try {
            await instanceApi.cancelInstance(instance.id);
            queryClient.invalidateQueries({ queryKey: [workflowInstanceSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
            addNotification({
              title: '成功',
              message: '流程已取消',
              type: 'success',
            });
          } catch (err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(err, '取消流程失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, openConfirm, queryClient]
  );

  const customRowActions: RowAction[] = [
    {
      key: 'viewDetail',
      label: '查看详情',
      icon: <GitBranch size={16} />,
      color: 'secondary',
      onClick: handleViewDetail,
    },
    {
      key: 'viewDiagram',
      label: '查看流程图',
      icon: <GitBranch size={16} />,
      color: 'secondary',
      onClick: handleViewDiagram,
    },
    {
      key: 'suspend',
      label: '挂起',
      icon: <Pause size={16} />,
      color: 'warning',
      onClick: handleSuspend,
      show: (row) => row.status === 'running',
    },
    {
      key: 'cancel',
      label: '取消',
      icon: <XCircle size={16} />,
      color: 'error',
      onClick: handleCancel,
      show: (row) => row.status === 'running',
    },
  ];

  const renderHeaderContent = (rows: Record<string, unknown>[], _total: number) => {
    const instances = rows as unknown as WorkflowInstance[];
    const runningCount = instances.filter((i) => i.status === 'running').length;
    const completedCount = instances.filter((i) => i.status === 'completed').length;
    const todayCount = instances.filter((i) => {
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
    instances.forEach((i) => {
      if (i.status === 'completed' && i.started_at && (i as WorkflowInstance & { completed_at?: string }).completed_at) {
        const duration =
          (new Date((i as WorkflowInstance & { completed_at?: string }).completed_at!).getTime() - new Date(i.started_at!).getTime()) / 1000;
        totalDuration += duration;
        completedWithDuration++;
      }
    });
    const avgDuration =
      completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0;

    const stats = [
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

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {stats.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 2,
              bgcolor: `${item.color}.light`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {item.icon}
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {item.title}
              </Typography>
            </Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <PlaySquare size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      <CrudPage
        schema={workflowInstanceSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={renderHeaderContent}
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
    </PageContainer>
  );
};

export default WorkflowInstancesPage;
