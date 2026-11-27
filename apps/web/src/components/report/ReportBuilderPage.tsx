import ReportBuilder from './ReportBuilder';
import { DesignerTemplate } from '@/components/templates/DesignerTemplate';
import i18n from '@/i18n';

const ReportBuilderPage = () => {
  const isBackendLoading = false;
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
