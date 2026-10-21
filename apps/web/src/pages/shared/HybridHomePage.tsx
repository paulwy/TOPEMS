import React from 'react';
import i18n from '@/i18n';
import { HybridDashboard } from '../../components/dashboard/HybridDashboard';
import { DashboardTemplate } from '@/components/templates';
import { InitGate } from '@/pages/hrm/setup/InitChecklistPanel';

export const HybridHomePage: React.FC = () => {
  return (
    <DashboardTemplate
      title={i18n.t('pages.hybrid_home_page.title')}
      subtitle={i18n.t('pages.hybrid_home_page.subtitle')}
    >
      <InitGate>
        <HybridDashboard />
      </InitGate>
    </DashboardTemplate>
  );
};

export default HybridHomePage;
