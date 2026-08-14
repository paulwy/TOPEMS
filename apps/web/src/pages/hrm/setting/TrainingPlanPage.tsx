import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const TrainingPlanPage: React.FC = () => {
  const { t } = useTranslation('hrm');
  return (
    <PageContainer
      title={t('hrm.training_plan_page.k0')}
      subtitle={t('hrm.training_plan_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.training_plan_page.k2')}
        description='培训计划相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default TrainingPlanPage;
