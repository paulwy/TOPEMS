import React from 'react';
import { Eye, Download } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { reportSchema } from '@/schemas/bi';
import { reportCrudApi } from '@/api/bi';
import type { Report } from '@/api/bi';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const BIReportPage: React.FC = () => {
  const apiAdapter: CrudApiAdapter<Report> = {
    list: async (params) => {
      const res = await reportCrudApi.list(params);
      if (res.success && res.data) {
        return { data: res.data.items, total: res.data.total };
      }
      throw new Error(res.message || i18n.t('bi.bi_report_page.k0'));
    },
    create: async (data) => {
      const res = await reportCrudApi.create(data as Partial<Report>);
      if (!res.success || !res.data) throw new Error(res.message || i18n.t('bi.bi_report_page.k1'));
      return res.data;
    },
    update: async (id, data) => {
      const res = await reportCrudApi.update(id, data as Partial<Report>);
      if (!res.success || !res.data) throw new Error(res.message || i18n.t('bi.bi_report_page.k2'));
      return res.data;
    },
    delete: async (id) => {
      const res = await reportCrudApi.delete(id);
      if (!res.success) throw new Error(res.message || i18n.t('bi.bi_report_page.k3'));
    },
  };
  const customRowActions = [
    {
      label: i18n.t('bi.bi_report_page.text_645dbc', i18n.t('pages.bi_report_page.k0')),
      icon: <Eye size={16} />,
      onClick: (row: Record<string, unknown>) => {
        logger.info('View:', row.id);
      },
    },
    {
      label: i18n.t('bi.bi_report_page.download', i18n.t('pages.bi_report_page.k1')),
      icon: <Download size={16} />,
      onClick: (row: Record<string, unknown>) => {
        logger.info('Download:', row.id);
      },
    },
  ];
  return (
    <PageContainer
      title={i18n.t('bi.bi_report_page.text_256969', i18n.t('pages.bi_report_page.bi_2'))}
      subtitle={i18n.t('bi.bi_report_page.create', i18n.t('pages.bi_report_page.bi_3'))}
    >
      <CrudPage
        schema={reportSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};
export default BIReportPage;
