import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { productionPlanSchema } from '@/schemas/aps';
import { productionPlanApi } from '@/api/aps';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: productionPlanApi.list,
  create: productionPlanApi.create,
  update: productionPlanApi.update,
  delete: productionPlanApi.delete,
});

export default function ProductionPlanPage() {
  return (
    <CrudPage
      schema={productionPlanSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'APS' }, { label: i18n.t('aps.production_plan_page.k8') }]}
    />
  );
}
