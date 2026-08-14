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
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const IntegrationLimsQmsPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncLimsQms(id);
      if (!res.success)
        throw new Error(res.message || t('integration.integration_lims_qms_page.k0'));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.INTEGRATION_LIMS_QMS_SYNC_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: t('integration.integration_lims_qms_page.k2'),
        message: t('integration.integration_lims_qms_page.k1'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('integration.integration_lims_qms_page.m1'), err);
      addNotification({
        title: t('integration.integration_lims_qms_page.k3'),
        message: extractErrorMessage(err, t('integration.integration_lims_qms_page.k4')),
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
      throw new Error(res.message || t('integration.integration_lims_qms_page.limsqms_5'));
    },
    create: async (data: Partial<LimsQmsSync>) => {
      const res = await integrationApi.createLimsQmsSync(data as CreateLimsQmsSyncRequest);
      if (!res.success)
        throw new Error(res.message || t('integration.integration_lims_qms_page.k6'));
      return res.data;
    },
    update: async () => {
      throw new Error(t('integration.integration_lims_qms_page.k7'));
    },
    delete: async () => {
      addNotification({
        title: t('integration.integration_lims_qms_page.k8'),
        message: t('integration.integration_lims_qms_page.k9'),
        type: 'warning',
      });
    },
  };

  const customRowActions = [
    {
      label: t('integration.integration_lims_qms_page.k10'),
      icon: <RefreshCw size={16} />,
      onClick: (row: Record<string, unknown>) => {
        syncMutation.mutate(String(row.id));
      },
      show: (row: Record<string, unknown>) => !row.synced,
    },
  ];

  return (
    <PageContainer
      title={t('integration.integration_lims_qms_page.m2')}
      subtitle={t('integration.integration_lims_qms_page.k11')}
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
