import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const ApsConfigPage: React.FC = () => {
  return (
    <PageContainer
      title='APS排程配置'
      subtitle='制造执行 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='APS排程配置'
        description='APS排程配置相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default ApsConfigPage;
