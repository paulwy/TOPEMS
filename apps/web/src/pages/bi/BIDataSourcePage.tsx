import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TestTube } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { dataSourceSchema } from '@/schemas/bi';
import { dataSourceCrudApi, testDataSource, refreshDataSource } from '@/api/bi';
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_DATA_SOURCE_BASE,
        exact: false,
        refetchType: 'active',
      });
      logger.info('Sync successful');
    },
  });
  const apiAdapter = createCrudPageAdapter(dataSourceCrudApi as any);
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
      subtitle={i18n.t(
        'bi.bi_data_source_page.text_b72c3a',
        i18n.t('pages.bi_data_source_page.bi_3')
      )}
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
