import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';

export const BomVersionPolicyPage: React.FC = () => {
  return (
    <PageContainer
      title={i18n.t('pages.bom_version_policy_page.bom_0')}
      subtitle={i18n.t('pages.bom_version_policy_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.bom_version_policy_page.bom_1')}
        description={i18n.t('pages.bom_version_policy_page.k2')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default BomVersionPolicyPage;
