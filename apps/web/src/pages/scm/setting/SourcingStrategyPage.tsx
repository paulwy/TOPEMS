import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const SourcingStrategyPage: React.FC = () => {
  return (
    <PageContainer
      title='寻源策略'
      subtitle='供应链管理 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='寻源策略'
        description='寻源策略相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default SourcingStrategyPage;
