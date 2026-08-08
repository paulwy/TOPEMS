import React from 'react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';

export const DashboardPage: React.FC = () => {
  const stats: StatCard[] = [];
  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title='即时通讯概览'
      subtitle='即时通讯数据概览'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
