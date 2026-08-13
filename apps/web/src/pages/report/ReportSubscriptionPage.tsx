import React, { useMemo } from 'react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { reportApi, type ReportSubscription, type CreateSubscriptionRequest, type UpdateSubscriptionRequest } from '@/api/report';
import { subscriptionSchema } from '@/schemas/report';

const ReportSubscriptionPage: React.FC = () => {
  const apiAdapter = useMemo<CrudApiAdapter<ReportSubscription>>(
    () => ({
      list: async (_params) => {
        const response = await reportApi.listSubscriptions();
        if (!response.success) {
          throw new Error(response.message || '获取订阅列表失败');
        }
        const data = response.data || [];
        return { data, total: data.length };
      },
      create: async (data) => {
        const response = await reportApi.createSubscription(data as unknown as CreateSubscriptionRequest);
        if (!response.success) {
          throw new Error(response.message || '创建订阅失败');
        }
        return response.data!;
      },
      update: async (id, data) => {
        const response = await reportApi.updateSubscription(id, data as unknown as UpdateSubscriptionRequest);
        if (!response.success) {
          throw new Error(response.message || '更新订阅失败');
        }
        return response.data!;
      },
      delete: async (id) => {
        const response = await reportApi.deleteSubscription(id);
        if (!response.success) {
          throw new Error(response.message || '删除订阅失败');
        }
      },
    }),
    []
  );

  return (
    <PageContainer
      title='报表订阅管理'
      subtitle='管理报表订阅，设置订阅者、订阅方式和订阅频率'
    >
      <CrudPage
        schema={subscriptionSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: '报表' }, { label: '订阅管理' }]}
      />
    </PageContainer>
  );
};

export default ReportSubscriptionPage;
