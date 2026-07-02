import React from 'react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { Boxes } from 'lucide-react';

const WIPPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Boxes style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      }}
    >
      {null}
    </PageContainer>
  );
};

export default WIPPage;
