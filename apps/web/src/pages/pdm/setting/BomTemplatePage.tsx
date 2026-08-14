import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const BomTemplatePage: React.FC = () => {
  const { t } = useTranslation('pdm');
  return (
    <PageContainer
      title='BOM模板'
      subtitle={t('pdm.bom_template_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='BOM模板'
        description='BOM模板相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default BomTemplatePage;
