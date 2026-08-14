import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

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
        description='文档审批流相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default DocApprovalFlowPage;
