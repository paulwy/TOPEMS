import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const DocApprovalFlowPage: React.FC = () => {
  const { t } = useTranslation('pdm');
  return (
    <PageContainer
      title={t('pdm.doc_approval_flow_page.k0')}
      subtitle={t('pdm.doc_approval_flow_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('pdm.doc_approval_flow_page.k2')}
        description={i18n.t('pdm.setting_doc_approval_flow_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default DocApprovalFlowPage;
