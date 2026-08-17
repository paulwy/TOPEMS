import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

export const PurchaseThresholdPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['scm-purchase-threshold'],
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
      title={t('scm.purchase_threshold_page.k0')}
      subtitle={t('scm.purchase_threshold_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.purchase_threshold_page.k2')}
        description={i18n.t('scm.setting_purchase_threshold_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default PurchaseThresholdPage;
