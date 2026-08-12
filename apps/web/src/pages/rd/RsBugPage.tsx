import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { bugSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { Bug, CreateBugRequest, UpdateBugRequest } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';


import { QUERY_KEYS } from '@/lib/reactQuery';

const bugApiAdapter: CrudApiAdapter<Bug> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.severity) queryParams.severity = params.severity;
    if (params?.priority) queryParams.priority = params.priority;
    if (params?.status) queryParams.status = params.status;
    if (params?.assignee) queryParams.assignee = params.assignee;

    const response = await rdApi.listBugs(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || '加载缺陷列表失败');
    }
    return {
      data: response.data.bugs || [],
      total: response.data.total || 0,
    };
  },

  create: async (data) => {
    const createData: CreateBugRequest = {
      bug_title: String(data.bug_title ?? ''),
      severity: String(data.severity ?? 'medium'),
      priority: String(data.priority ?? 'medium'),
      description: String(data.description ?? ''),
    };
    const response = await rdApi.createBug(createData);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建缺陷失败');
    }
    return response.data;
  },

  update: async (id, data) => {
    const updateData: UpdateBugRequest = {
      bug_title: data.bug_title as string | undefined,
      severity: data.severity as string | undefined,
      priority: data.priority as string | undefined,
      status: data.status as string | undefined,
      assignee: data.assignee as string | undefined,
      description: data.description as string | undefined,
    };
    const response = await rdApi.updateBug(id, updateData);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新缺陷失败');
    }
    return response.data;
  },

  delete: async (id) => {
    const response = await rdApi.deleteBug(id);
    if (!response.success) {
      throw new Error(response.message || '删除缺陷失败');
    }
  },
};

const RsBugPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const closeBugMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBugRequest }) => {
      const response = await rdApi.updateBug(id, data);
      if (!response.success) {
        throw new Error(response.message || '关闭缺陷失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.RD_BUG_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '缺陷已关闭',
      });
    },
    onError: (error: unknown) => {
      logger.error('关闭缺陷失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error instanceof Error ? error.message : '关闭缺陷失败',
      });
    },
  });

  const handleCloseBug = (row: Record<string, unknown>) => {
    closeBugMutation.mutate({
      id: String(row.id),
      data: { status: 'closed' },
    });
  };

  const customRowActions: RowAction[] = [
    {
      key: 'close',
      label: '关闭',
      icon: <CheckCircle size={16} />,
      color: 'success',
      onClick: handleCloseBug,
      show: (row) => String(row.status ?? '') !== 'closed',
    },
  ];

  return (
    <CrudPage
      schema={bugSchema}
      apiAdapter={bugApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: '研发管理', href: '/rd' }, { label: '缺陷管理' }]}
    />
  );
};

export default RsBugPage;
