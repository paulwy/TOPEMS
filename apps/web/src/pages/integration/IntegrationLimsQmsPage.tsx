import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { limsQmsSyncSchema } from '@/schemas/integration';
import { integrationApi } from '@/api/integration';
import type { LimsQmsSync, CreateLimsQmsSyncRequest } from '@/api/integration';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';


import { QUERY_KEYS } from '@/lib/reactQuery';

const IntegrationLimsQmsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncLimsQms(id);
      if (!res.success) throw new Error(res.message || '同步失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_LIMS_QMS_SYNC_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: '成功', message: '同步成功', type: 'success' });
    },
    onError: (err: unknown) => {
      apiLogger.error('LIMS-QMS 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '同步失败'),
        type: 'error',
      });
    },
  });

  const apiAdapter: CrudApiAdapter<LimsQmsSync> = {
    list: async () => {
      const res = await integrationApi.listLimsQmsSyncs();
      if (res.success && res.data !== undefined) {
        return { data: res.data, total: res.data.length };
      }
      throw new Error(res.message || '加载 LIMS-QMS 同步数据失败');
    },
    create: async (data: Partial<LimsQmsSync>) => {
      const res = await integrationApi.createLimsQmsSync(data as CreateLimsQmsSyncRequest);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    update: async () => {
      throw new Error('编辑功能暂未实现');
    },
    delete: async () => {
      addNotification({
        title: '提示',
        message: '删除接口尚未实现',
        type: 'warning',
      });
    },
  };

  const customRowActions = [
    {
      label: '同步',
      icon: <RefreshCw size={16} />,
      onClick: (row: Record<string, unknown>) => {
        syncMutation.mutate(String(row.id));
      },
      show: (row: Record<string, unknown>) => !row.synced,
    },
  ];

  return (
    <PageContainer
      title='LIMS ↔ QMS 同步'
      subtitle='管理 LIMS 样本与 QMS 检验的同步'
    >
      <CrudPage
        schema={limsQmsSyncSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default IntegrationLimsQmsPage;
