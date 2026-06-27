import React from 'react';
import { HybridDashboard } from '../../components/dashboard/HybridDashboard';
import { PageContainer } from '@/components/common';

export const HybridHomePage: React.FC = () => {
  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <HybridDashboard />
    </PageContainer>
  );
};

export default HybridHomePage;
