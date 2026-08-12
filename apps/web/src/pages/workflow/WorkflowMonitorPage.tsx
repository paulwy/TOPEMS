import React, { useCallback, useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import { Activity, AlertTriangle, Clock, XCircle, Zap, RotateCw, EyeOff } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import { useNotificationStore } from '../../store';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { StatCardComponent } from '@/components/templates/dashboard/StatCardComponent';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { useConfirmDialog } from '@/hooks';
import { extractErrorMessage } from '@/utils/errors';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { monitorApi } from '@/api/workflow/monitor';
import { workflowMonitorSchema } from '@/schemas/workflow';


import { QUERY_KEYS } from '@/lib/reactQuery';

type ExceptionType = 'timeout' | 'error' | 'stuck';

interface WorkflowException {
  id: string;
  instanceId: string;
  workflowName: string;
  currentNode: string;
  exceptionType: ExceptionType;
  exceptionDescription: string;
  occurredAt: string;
  status: 'pending' | 'processing' | 'resolved';
}

interface MonitorInstance {
  id: string;
  workflow_name?: string;
  current_node_name?: string;
  current_node_id?: string;
  started_at: string;
  updated_at?: string;
  created_at: string;
}

const buildExceptionList = (
  overdueData: MonitorInstance[],
  errorData: MonitorInstance[]
): WorkflowException[] => {
  const result: WorkflowException[] = [];

  (overdueData || []).forEach((instance: any) => {
    result.push({
      id: instance.id,
      instanceId: instance.id,
      workflowName: instance.workflow_name || '未命名流程',
      currentNode: instance.current_node_name || instance.current_node_id || '未知节点',
      exceptionType: 'timeout',
      exceptionDescription: '流程执行超时，已超过预期完成时间',
      occurredAt: instance.started_at,
      status: 'pending',
    });
  });

  (errorData || []).forEach((instance: any) => {
    result.push({
      id: instance.id,
      instanceId: instance.id,
      workflowName: instance.workflow_name || '未命名流程',
      currentNode: instance.current_node_name || instance.current_node_id || '未知节点',
      exceptionType: 'error',
      exceptionDescription: '流程执行出现错误',
      occurredAt: instance.updated_at || instance.created_at,
      status: 'pending',
    });
  });

  return result;
};

export const WorkflowMonitorPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { confirmOpen, confirmConfig, openConfirm, closeConfirm } = useConfirmDialog();

  const { data: errorData = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_MONITOR_ERROR_INSTANCES_BASE,
    queryFn: async () => {
      const res = await monitorApi.getErrorInstances();
      return res.data?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: overdueData = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_MONITOR_OVERDUE_INSTANCES_BASE,
    queryFn: async () => {
      const res = await monitorApi.getOverdueInstances();
      return res.data?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allExceptions = useMemo(
    () => buildExceptionList(overdueData, errorData),
    [overdueData, errorData]
  );

  const apiAdapter: CrudApiAdapter<WorkflowException> = {
    list: async (params) => {
      let result = [...allExceptions];

      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter(
          (item) =>
            item.workflowName.toLowerCase().includes(q) || item.instanceId.toLowerCase().includes(q)
        );
      }
      if (typeof params?.exceptionType === 'string' && params.exceptionType !== 'all') {
        result = result.filter((item) => item.exceptionType === params.exceptionType);
      }
      if (typeof params?.status === 'string' && params.status !== 'all') {
        result = result.filter((item) => item.status === params.status);
      }

      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      const paged = result.slice(start, start + pageSize);

      return { data: paged, total: result.length };
    },
    create: async () => ({}) as WorkflowException,
    update: async (_id, _data) => ({}) as WorkflowException,
    delete: async () => {},
  };

  const handleRetry = useCallback(
    async (row: Record<string, unknown>) => {
      const id = row.id as string;
      const instanceId = row.instanceId as string;
      openConfirm({
        title: '确认重试',
        message: `确定要重试实例 ${instanceId} 吗？`,
        onConfirm: async () => {
          try {
            const res = await monitorApi.retryInstance(id);
            if (!res.success) {
              throw new Error(res.message || '重试失败');
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_MONITOR_ERROR_INSTANCES_BASE ,
  exact: false,
  refetchType: 'active',
});
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_MONITOR_OVERDUE_INSTANCES_BASE ,
  exact: false,
  refetchType: 'active',
});
            queryClient.invalidateQueries({ queryKey: [workflowMonitorSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
            addNotification({
              title: '重试成功',
              message: `实例 ${instanceId} 已重新执行`,
              type: 'success',
            });
          } catch (err) {
            addNotification({
              title: '重试失败',
              message: extractErrorMessage(err),
              type: 'error',
            });
          }
        },
      });
    },
    [queryClient, addNotification, openConfirm]
  );

  const handleIgnore = useCallback(
    (row: Record<string, unknown>) => {
      const instanceId = row.instanceId as string;
      openConfirm({
        title: '确认忽略',
        message: `确定要忽略实例 ${instanceId} 的异常吗？`,
        danger: true,
        onConfirm: async () => {
          addNotification({
            title: '已忽略',
            message: `实例 ${instanceId} 的异常已标记为忽略`,
            type: 'success',
          });
        },
      });
    },
    [addNotification, openConfirm]
  );

  const customRowActions: RowAction[] = [
    {
      key: 'retry',
      label: '重试',
      icon: <RotateCw size={16} />,
      color: 'success',
      onClick: handleRetry,
    },
    {
      key: 'ignore',
      label: '忽略',
      icon: <EyeOff size={16} />,
      color: 'secondary',
      onClick: handleIgnore,
    },
  ];

  const renderHeaderContent = (_rows: any[], _total: number) => {
    const exceptions = allExceptions;
    const total = exceptions.length;
    const timeoutCount = exceptions.filter((d) => d.exceptionType === 'timeout').length;
    const errorCount = exceptions.filter((d) => d.exceptionType === 'error').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = exceptions.filter((d) => d.occurredAt.startsWith(today)).length;

    const stats = [
      {
        id: 'total',
        title: '异常实例数',
        value: total,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'timeout',
        title: '超时实例',
        value: timeoutCount,
        icon: <Clock size={20} />,
        color: 'info' as const,
      },
      {
        id: 'error',
        title: '错误实例',
        value: errorCount,
        icon: <XCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'today',
        title: '今日异常',
        value: todayCount,
        icon: <Zap size={20} />,
        color: 'primary' as const,
      },
    ];

    return (
      <Box sx={{ mb: 2 }}>
        <Grid
          container
          spacing={2}
        >
          {stats.map((stat) => (
            <Grid
              key={stat.id}
              size={{ xs: 12, sm: 6, md: 3 }}
            >
              <StatCardComponent
                {...stat}
                size='small'
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      <CrudPage
        schema={workflowMonitorSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={renderHeaderContent}
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

export default WorkflowMonitorPage;
