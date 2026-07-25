import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { performanceSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';

const apiAdapter = createCrudPageAdapter(hrmApi.performanceReviews);

export default function HrmPerformancePage() {
  return (
    <CrudPage
      schema={performanceSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: '绩效管理' }]}
    />
  );
}
