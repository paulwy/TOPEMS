import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { hrmApi } from '@/api/hrm';

export const TrainingPlanPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['hrm-training-plan'],
    queryFn: async () => {
      try {
        return await hrmApi.trainingPlans.list();
      } catch (e) {
        return {};
      }
    },
  });
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
        description={i18n.t('hrm.setting_training_plan_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default TrainingPlanPage;
