import React from 'react';
import { ChatInterface } from '@/components/im/ChatInterface';
import { PageContainer } from '@/components/common';

const IMPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      padding={false}
      maxWidth={false}
    >
      <ChatInterface />
    </PageContainer>
  );
};

export default IMPage;
