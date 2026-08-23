import { useQuery } from '@tanstack/react-query';
import ReportBuilder from './ReportBuilder';
import { DesignerTemplate } from '@/components/templates/DesignerTemplate';
import { reportApi } from '@/api/report';
import i18n from '@/i18n';

const ReportBuilderPage = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['report-builder'],
    queryFn: async () => {
      try {
        const res = await reportApi.listReportTypes();
        if (res.success && res.data) return res.data;
        return {};
      } catch {
        return {};
      }
    },
  });
  return (
    <DesignerTemplate
      mode='standard'
      title={i18n.t('pages.report_builder_page.k0')}
      subtitle={i18n.t('pages.report_builder_page.k1')}
      loading={isBackendLoading}
      pageContainerProps={{
        autoTitle: false,
        autoBreadcrumbs: false,
        padding: false,
        maxWidth: false,
      }}
    >
      <ReportBuilder isModal={false} />
    </DesignerTemplate>
  );
};

export default ReportBuilderPage;
