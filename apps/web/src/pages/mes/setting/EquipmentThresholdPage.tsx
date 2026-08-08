import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const EquipmentThresholdPage: React.FC = () => {
  return (
    <PageContainer
      title='设备阈值配置'
      subtitle='制造执行 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='设备阈值配置'
        description='设备阈值配置相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default EquipmentThresholdPage;
