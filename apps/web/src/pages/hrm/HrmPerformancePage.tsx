import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { performanceSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(hrmApi.performanceReviews);

export default function HrmPerformancePage() {
  const { t } = useTranslation('hrm');
  return (
    <CrudPage
      schema={performanceSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: t('hrm.hrm_performance_page.k0') }]}
    />
  );
}
