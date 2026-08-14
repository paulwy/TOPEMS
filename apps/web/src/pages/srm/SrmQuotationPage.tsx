import React from 'react';
import { useTranslation } from 'react-i18next';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { quotationSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { CheckCircle, XCircle } from 'lucide-react';
import i18n from '@/i18n';

const quotationApiAdapter: CrudApiAdapter = {
  list: async (_params) => {
    const response = await srmApi.listQuotations();
    if (!response.success) throw new Error(i18n.t('pages.srm_quotation_page.k0'));
    const items = (response.data || []) as unknown as Array<Record<string, unknown>>;
    return { data: items, total: items.length };
  },

  create: async (data) => {
    const response = await srmApi.createQuotation(
      data as unknown as Parameters<typeof srmApi.createQuotation>[0]
    );
    if (!response.success) throw new Error(i18n.t('pages.srm_quotation_page.k1'));
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await srmApi.updateQuotation(
      id,
      data as unknown as Parameters<typeof srmApi.updateQuotation>[1]
    );
    if (!response.success) throw new Error(i18n.t('pages.srm_quotation_page.k2'));
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (_id) => {
    return;
  },
};

const SrmQuotationPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleAward = async (row: Record<string, unknown>) => {
    const id = row.id as string;
    try {
      const response = await srmApi.awardQuotation(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: t('common.success', i18n.t('pages.srm_quotation_page.k0')),
          message: t('srm.quotation_page.award_success', i18n.t('pages.srm_quotation_page.k1')),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('common.fail', i18n.t('pages.srm_quotation_page.k2')),
        message: t('srm.quotation_page.award_fail', i18n.t('pages.srm_quotation_page.k3')),
      });
    }
  };

  const handleReject = async (row: Record<string, unknown>) => {
    const id = row.id as string;
    try {
      const response = await srmApi.rejectQuotation(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: t('common.success', i18n.t('pages.srm_quotation_page.k4')),
          message: t('srm.quotation_page.reject_success', i18n.t('pages.srm_quotation_page.k5')),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('common.fail', i18n.t('pages.srm_quotation_page.k6')),
        message: t('srm.quotation_page.reject_fail', i18n.t('pages.srm_quotation_page.k7')),
      });
    }
  };

  return (
    <CrudPage
      schema={quotationSchema}
      apiAdapter={quotationApiAdapter}
      customRowActions={[
        {
          label: t('srm.quotation_page.award', i18n.t('pages.srm_quotation_page.k8')),
          icon: <CheckCircle size={16} />,
          onClick: handleAward,
          color: 'success',
          show: (row: Record<string, unknown>) =>
            row.status === 'submitted' || row.status === 'accepted',
        },
        {
          label: t('srm.quotation_page.reject', i18n.t('pages.srm_quotation_page.k9')),
          icon: <XCircle size={16} />,
          onClick: handleReject,
          color: 'error',
          show: (row: Record<string, unknown>) => row.status === 'submitted',
        },
      ]}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_quotation_page.k3') }]}
    />
  );
};

export default SrmQuotationPage;
