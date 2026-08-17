import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { hrmApi } from '@/api/hrm';

export const AttendanceRulePage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['hrm-attendance-rule'],
    queryFn: async () => {
      try {
        // TODO: hrmApi.attendance.listRules 方法不存在
        return {};
      } catch (e) {
        return {};
      }
    },
  });
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
        description={i18n.t('hrm.setting_attendance_rule_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default AttendanceRulePage;
