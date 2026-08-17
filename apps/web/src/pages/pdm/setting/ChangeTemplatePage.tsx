import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { pdmApi } from '@/api/pdm';

export const ChangeTemplatePage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['pdm-change-template'],
    queryFn: async () => {
      try {
        const res = await pdmApi.listChangeOrders();
        return res.data ?? {};
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('pdm');
  return (
    <PageContainer
      title={t('pdm.change_template_page.k0')}
      subtitle={t('pdm.change_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('pdm.change_template_page.k2')}
        description={i18n.t('pdm.setting_change_template_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default ChangeTemplatePage;
