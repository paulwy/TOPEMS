import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const DocApprovalFlowPage: React.FC = () => {
  return (
    <PageContainer
      title='文档审批流'
      subtitle='产品数据管理 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='文档审批流'
        description='文档审批流相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default DocApprovalFlowPage;
