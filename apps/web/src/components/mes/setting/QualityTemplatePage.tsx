import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

export const QualityTemplatePage: React.FC = () => {
  return (
    <PageContainer
      title={i18n.t('pages.quality_template_page.k0')}
      subtitle={i18n.t('pages.quality_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.quality_template_page.k2')}
        description={i18n.t('pages.quality_template_page.k0')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default QualityTemplatePage;
