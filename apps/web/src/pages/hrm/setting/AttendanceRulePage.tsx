import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';

export const AttendanceRulePage: React.FC = () => {
  return (
    <PageContainer
      title='考勤规则'
      subtitle='人力资源 · 系统设置'
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='考勤规则'
        description='考勤规则相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default AttendanceRulePage;
