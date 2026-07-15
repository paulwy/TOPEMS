import ReportBuilder from './ReportBuilder';
import { PageContainer } from '@/components/common';

const ReportBuilderPage = () => {
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
