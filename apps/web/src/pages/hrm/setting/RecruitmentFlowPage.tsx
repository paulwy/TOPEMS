import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const RecruitmentFlowPage: React.FC = () => {
  return (
    <PageContainer
      title='招聘流程'
      subtitle='人力资源 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='招聘流程'
        description='招聘流程相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default RecruitmentFlowPage;
