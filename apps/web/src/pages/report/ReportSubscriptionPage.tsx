import React, { useMemo } from 'react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { reportApi, type ReportSubscription, type CreateSubscriptionRequest, type UpdateSubscriptionRequest } from '@/api/report';
import { subscriptionSchema } from '@/schemas/report';
import i18n from '@/i18n';

const ReportSubscriptionPage: React.FC = () => {
  const apiAdapter = useMemo<CrudApiAdapter<ReportSubscription>>(
    () => ({
      list: async (_params) => {
        const response = await reportApi.listSubscriptions();
        if (!response.success) {
          throw new Error(response.message || i18n.t('pages.report_subscription_page.k0'));
        }
        const data = response.data || [];
        return { data, total: data.length };
      },
      create: async (data) => {
        const response = await reportApi.createSubscription(data as unknown as CreateSubscriptionRequest);
        if (!response.success) {
          throw new Error(response.message || i18n.t('pages.report_subscription_page.k1'));
        }
        return response.data!;
      },
      update: async (id, data) => {
        const response = await reportApi.updateSubscription(id, data as unknown as UpdateSubscriptionRequest);
        if (!response.success) {
          throw new Error(response.message || i18n.t('pages.report_subscription_page.k2'));
        }
        return response.data!;
      },
      delete: async (id) => {
        const response = await reportApi.deleteSubscription(id);
        if (!response.success) {
          throw new Error(response.message || i18n.t('pages.report_subscription_page.k3'));
        }
      },
    }),
    []
  );

  return (
    <PageContainer
      title={i18n.t('pages.report_subscription_page.k4')}
      subtitle={i18n.t('pages.report_subscription_page.k5')}
    >
      <CrudPage
        schema={subscriptionSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: i18n.t('pages.report_subscription_page.k7') }, { label: i18n.t('pages.report_subscription_page.k6') }]}
      />
    </PageContainer>
  );
};

export default ReportSubscriptionPage;
