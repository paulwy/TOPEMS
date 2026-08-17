import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { pdmApi } from '@/api/pdm';

export const BomTemplatePage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['pdm-bom-template'],
    queryFn: async () => {
      try {
        // TODO: 替换为 pdmApi（bomApi）下语义匹配的 BOM 模板 list/query 方法
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('pdm');
  return (
    <PageContainer
      title={t('pdm.setting_bom_template_page.m1')}
      subtitle={t('pdm.bom_template_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('pdm.setting_bom_template_page.m1')}
        description={i18n.t('pdm.setting_bom_template_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default BomTemplatePage;
