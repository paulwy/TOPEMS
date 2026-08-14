import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const QuotaTemplatePage: React.FC = () => {
  const { t } = useTranslation('scm');
  return (
    <PageContainer
      title={t('scm.quota_template_page.k0')}
      subtitle={t('scm.quota_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.quota_template_page.k2')}
        description='配额模板相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default QuotaTemplatePage;
