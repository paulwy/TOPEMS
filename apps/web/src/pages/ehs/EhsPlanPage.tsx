import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { planSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';

const apiAdapter = createCrudPageAdapter({
  list: ehsApi.listPlans,
  create: ehsApi.createPlan,
  update: ehsApi.updatePlan,
  delete: ehsApi.deletePlan,
});

export default function EhsPlanPage() {
  return (
    <CrudPage
      schema={planSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'EHS' }, { label: '安全计划' }]}
    />
  );
}
