import React from 'react';
import { useTranslation } from 'react-i18next';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { quotationSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { CheckCircle, XCircle } from 'lucide-react';

const quotationApiAdapter: CrudApiAdapter = {
  list: async (_params) => {
    const response = await srmApi.listQuotations();
    if (!response.success) throw new Error('加载报价单失败');
    const items = (response.data || []) as unknown as Array<Record<string, unknown>>;
    return { data: items, total: items.length };
  },

  create: async (data) => {
    const response = await srmApi.createQuotation(
      data as unknown as Parameters<typeof srmApi.createQuotation>[0]
    );
    if (!response.success) throw new Error('创建报价单失败');
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await srmApi.updateQuotation(
      id,
      data as unknown as Parameters<typeof srmApi.updateQuotation>[1]
    );
    if (!response.success) throw new Error('更新报价单失败');
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
          title: t('common.success', '成功'),
          message: t('srm.quotation_page.award_success', '报价单已中标'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('common.fail', '失败'),
        message: t('srm.quotation_page.award_fail', '中标操作失败'),
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
          title: t('common.success', '成功'),
          message: t('srm.quotation_page.reject_success', '报价单已驳回'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('common.fail', '失败'),
        message: t('srm.quotation_page.reject_fail', '驳回操作失败'),
      });
    }
  };

  return (
    <CrudPage
      schema={quotationSchema}
      apiAdapter={quotationApiAdapter}
      customRowActions={[
        {
          label: t('srm.quotation_page.award', '中标'),
          icon: <CheckCircle size={16} />,
          onClick: handleAward,
          color: 'success',
          show: (row: Record<string, unknown>) =>
            row.status === 'submitted' || row.status === 'accepted',
        },
        {
          label: t('srm.quotation_page.reject', '驳回'),
          icon: <XCircle size={16} />,
          onClick: handleReject,
          color: 'error',
          show: (row: Record<string, unknown>) => row.status === 'submitted',
        },
      ]}
      breadcrumbs={[{ label: 'SRM' }, { label: '报价单管理' }]}
    />
  );
};

export default SrmQuotationPage;
