import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const InventoryThresholdPage: React.FC = () => {
  return (
    <PageContainer
      title='库存阈值配置'
      subtitle='仓储管理 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='库存阈值配置'
        description='库存阈值配置相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default InventoryThresholdPage;
