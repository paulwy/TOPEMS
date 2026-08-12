import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { wmsScmSyncSchema } from '@/schemas/integration';
import { integrationApi } from '@/api/integration';
import type { WmsScmSync, CreateWmsScmSyncRequest } from '@/api/integration';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';


import { QUERY_KEYS } from '@/lib/reactQuery';

const IntegrationWmsScmPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncWmsScm(id);
      if (!res.success) throw new Error(res.message || '同步失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_WMS_SCM_SYNC_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: '成功', message: '同步成功', type: 'success' });
    },
    onError: (err: unknown) => {
      apiLogger.error('WMS-SCM 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '同步失败'),
        type: 'error',
      });
    },
  });

  const apiAdapter: CrudApiAdapter<WmsScmSync> = {
    list: async () => {
      const res = await integrationApi.listWmsScmSyncs();
      if (res.success && res.data !== undefined) {
        return { data: res.data, total: res.data.length };
      }
      throw new Error(res.message || '加载 WMS-SCM 同步数据失败');
    },
    create: async (data: Partial<WmsScmSync>) => {
      const res = await integrationApi.createWmsScmSync(data as CreateWmsScmSyncRequest);
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
      title='WMS ↔ SCM 同步'
      subtitle='管理 WMS 库存与 SCM 供应的同步'
    >
      <CrudPage
        schema={wmsScmSyncSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default IntegrationWmsScmPage;
