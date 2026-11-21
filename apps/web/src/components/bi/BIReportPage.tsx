import React from 'react';
import { Eye, Download } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { reportSchema } from '@/schemas/bi';
import { reportCrudApi } from '@/api/report';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const BIReportPage: React.FC = () => {
  const apiAdapter = createCrudPageAdapter(
    reportCrudApi as unknown as Parameters<typeof createCrudPageAdapter>[0]
  );
  const customRowActions = [
    {
      label: i18n.t('bi.bi_report_page.report_type_filter', i18n.t('pages.bi_report_page.k0')),
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
      title={i18n.t('bi.bi_report_page.report_center_heading', i18n.t('pages.bi_report_page.bi_2'))}
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
