import React from 'react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { MapPin } from 'lucide-react';

const QualityTraceabilityPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #4C1D95 100%)',
      }}
    >
      {null}
    </PageContainer>
  );
};

export default QualityTraceabilityPage;
