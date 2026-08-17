import { useQuery } from '@tanstack/react-query';
import ReportBuilder from './ReportBuilder';
import { PageContainer } from '@/components/common';
import { reportApi } from '@/api/report';

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
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      padding={false}
      maxWidth={false}
    >
      <ReportBuilder isModal={false} />
    </PageContainer>
  );
};

export default ReportBuilderPage;
