import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const FifoPolicyPage: React.FC = () => {
  return (
    <PageContainer
      title='先进先出策略'
      subtitle='仓储管理 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='先进先出策略'
        description='先进先出策略相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default FifoPolicyPage;
