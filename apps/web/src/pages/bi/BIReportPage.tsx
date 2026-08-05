import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Download } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { reportSchema } from '@/schemas/bi';
import { reportCrudApi } from '@/api/bi';
import type { Report } from '@/api/bi';
import { logger } from '@/utils/logger';

const BIReportPage: React.FC = () => {
  const { t } = useTranslation();

  const apiAdapter: CrudApiAdapter<Report> = {
    list: async (params) => {
      const res = await reportCrudApi.list(params);
      if (res.success && res.data) {
        return { data: res.data.items, total: res.data.total };
      }
      throw new Error(res.message || '加载报表数据失败');
    },
    create: async (data) => {
      const res = await reportCrudApi.create(data as Partial<Report>);
      if (!res.success || !res.data) throw new Error(res.message || '创建失败');
      return res.data;
    },
    update: async (id, data) => {
      const res = await reportCrudApi.update(id, data as Partial<Report>);
      if (!res.success || !res.data) throw new Error(res.message || '更新失败');
      return res.data;
    },
    delete: async (id) => {
      const res = await reportCrudApi.delete(id);
      if (!res.success) throw new Error(res.message || '删除失败');
    },
  };

  const customRowActions = [
    {
      label: t('bi.bi_report_page.text_645dbc', '查看'),
      icon: <Eye size={16} />,
      onClick: (row: Record<string, unknown>) => {
        logger.info('View:', row.id);
      },
    },
    {
      label: t('bi.bi_report_page.download', '下载'),
      icon: <Download size={16} />,
      onClick: (row: Record<string, unknown>) => {
        logger.info('Download:', row.id);
      },
    },
  ];

  return (
    <PageContainer
      title={t('bi.bi_report_page.text_256969', 'BI 报表')}
      subtitle={t('bi.bi_report_page.create', '创建和管理 BI 报表')}
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
