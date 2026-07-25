import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { trainingSchema } from '@/schemas/hrm';
import { hrmApi } from '@/api/hrm';

const apiAdapter = createCrudPageAdapter(hrmApi.trainingPlans);

export default function HrmTrainingPage() {
  return (
    <CrudPage
      schema={trainingSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'HRM' }, { label: '培训管理' }]}
    />
  );
}
