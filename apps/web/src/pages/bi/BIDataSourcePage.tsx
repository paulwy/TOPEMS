import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TestTube } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { dataSourceSchema } from '@/schemas/bi';
import { dataSourceCrudApi, testDataSource, refreshDataSource } from '@/api/bi';
import type { DataSource } from '@/api/bi';
import { logger } from '@/utils/logger';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import i18n from '@/i18n';
const BIDataSourcePage: React.FC = () => {
  const queryClient = useQueryClient();
  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => testDataSource(id),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.BI_DATA_SOURCE_BASE,
          exact: false,
          refetchType: 'active',
        });
      logger.info('Connection test successful');
    },
  });
  const refreshMutation = useMutation({
    mutationFn: (id: string) => refreshDataSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.BI_DATA_SOURCE_BASE ,
  exact: false,
  refetchType: 'active',
});
      logger.info('Sync successful');
    },
  });
  const apiAdapter: CrudApiAdapter<DataSource> = {
    list: async (params) => {
      const res = await dataSourceCrudApi.list(params);
      if (res.success && res.data) {
        return { data: res.data.items, total: res.data.total };
      }
      throw new Error(res.message || i18n.t('bi.bi_data_source_page.k0'));
    },
    create: async (data) => {
      const res = await dataSourceCrudApi.create(data as Partial<DataSource>);
      if (!res.success || !res.data) throw new Error(res.message || i18n.t('bi.bi_data_source_page.k1'));
      return res.data;
    },
    update: async (id, data) => {
      const res = await dataSourceCrudApi.update(id, data as Partial<DataSource>);
      if (!res.success || !res.data) throw new Error(res.message || i18n.t('bi.bi_data_source_page.k2'));
      return res.data;
    },
    delete: async (id) => {
      const res = await dataSourceCrudApi.delete(id);
      if (!res.success) throw new Error(res.message || i18n.t('bi.bi_data_source_page.k3'));
    },
  };
  const customRowActions = [
    {
      label: i18n.t('bi.bi_data_source_page.text_6a620e', i18n.t('pages.bi_data_source_page.k0')),
      icon: <RefreshCw size={16} />,
      onClick: (row: Record<string, unknown>) => {
        refreshMutation.mutate(String(row.id));
      },
    },
    {
      label: i18n.t('bi.bi_data_source_page.test', i18n.t('pages.bi_data_source_page.k1')),
      icon: <TestTube size={16} />,
      onClick: (row: Record<string, unknown>) => {
        testConnectionMutation.mutate(String(row.id));
      },
    },
  ];
  return (
    <PageContainer
      title={i18n.t('bi.bi_data_source_page.text_4feab2', i18n.t('pages.bi_data_source_page.bi_2'))}
      subtitle={i18n.t('bi.bi_data_source_page.text_b72c3a', i18n.t('pages.bi_data_source_page.bi_3'))}
    >
      <CrudPage
        schema={dataSourceSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};
export default BIDataSourcePage;