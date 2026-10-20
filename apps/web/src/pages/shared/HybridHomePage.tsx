import React from 'react';
import i18n from '@/i18n';
import { HybridDashboard } from '../../components/dashboard/HybridDashboard';
import { DashboardTemplate } from '@/components/templates';
import SetupReminderBanner from '@/pages/hrm/setup/SetupReminderBanner';

export const HybridHomePage: React.FC = () => {
  return (
    <DashboardTemplate
      title={i18n.t('pages.hybrid_home_page.title')}
      subtitle={i18n.t('pages.hybrid_home_page.subtitle')}
    >
      <>
        <SetupReminderBanner />
        <HybridDashboard />
      </>
    </DashboardTemplate>
  );
};

export default HybridHomePage;
