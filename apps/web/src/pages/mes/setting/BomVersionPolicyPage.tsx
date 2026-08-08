import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const BomVersionPolicyPage: React.FC = () => {
  return (
    <PageContainer
      title='BOM版本策略'
      subtitle='制造执行 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='BOM版本策略'
        description='BOM版本策略相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default BomVersionPolicyPage;
