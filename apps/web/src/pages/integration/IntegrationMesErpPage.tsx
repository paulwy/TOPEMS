import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { mesErpSyncSchema } from '@/schemas/integration';
import { integrationApi } from '@/api/integration';
import type { MesErpSync, CreateMesErpSyncRequest } from '@/api/integration';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';


import { QUERY_KEYS } from '@/lib/reactQuery';

const IntegrationMesErpPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncMesErp(id);
      if (!res.success) throw new Error(res.message || '同步失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_MES_ERP_SYNC_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: '成功', message: '同步成功', type: 'success' });
    },
    onError: (err: unknown) => {
      apiLogger.error('MES-ERP 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '同步失败'),
        type: 'error',
      });
    },
  });

  const apiAdapter: CrudApiAdapter<MesErpSync> = {
    list: async () => {
      const res = await integrationApi.listMesErpSyncs();
      if (res.success && res.data !== undefined) {
        return { data: res.data, total: res.data.length };
      }
      throw new Error(res.message || '加载 MES-ERP 同步数据失败');
    },
    create: async (data: Partial<MesErpSync>) => {
      const res = await integrationApi.createMesErpSync(data as CreateMesErpSyncRequest);
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
      title='MES ↔ ERP 同步'
      subtitle='管理 MES 生产订单与 ERP 销售订单的同步'
    >
      <CrudPage
        schema={mesErpSyncSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default IntegrationMesErpPage;
