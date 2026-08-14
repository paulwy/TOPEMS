import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const AttendanceRulePage: React.FC = () => {
  const { t } = useTranslation('hrm');
  return (
    <PageContainer
      title={t('hrm.attendance_rule_page.k0')}
      subtitle={t('hrm.attendance_rule_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.attendance_rule_page.k2')}
        description='考勤规则相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default AttendanceRulePage;
