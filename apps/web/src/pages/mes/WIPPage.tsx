import React from 'react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { Boxes } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const WIPPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Boxes style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      {null}
    </PageContainer>
  );
};

export default WIPPage;
