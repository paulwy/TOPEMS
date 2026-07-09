import React from 'react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { MapPin } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const QualityTraceabilityPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary[900]} 100%)`,
      }}
    >
      {null}
    </PageContainer>
  );
};

export default QualityTraceabilityPage;
