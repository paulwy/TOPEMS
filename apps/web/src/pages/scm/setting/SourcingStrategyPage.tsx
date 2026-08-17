import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

export const SourcingStrategyPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['scm-sourcing-strategy'],
    queryFn: async () => {
      try {
        // TODO: 匹配语义 API 方法
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('scm');
  return (
    <PageContainer
      title={t('scm.sourcing_strategy_page.k0')}
      subtitle={t('scm.sourcing_strategy_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.sourcing_strategy_page.k2')}
        description={i18n.t('scm.setting_sourcing_strategy_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default SourcingStrategyPage;
