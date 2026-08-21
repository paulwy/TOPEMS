import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { materialPlanSchema } from '@/schemas/aps';
import { materialPlanApi } from '@/api/aps';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: materialPlanApi.list,
  create: materialPlanApi.create,
  update: materialPlanApi.update,
  delete: materialPlanApi.delete,
});

export default function MaterialPlanPage() {
  return (
    <CrudPage
      schema={materialPlanSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'APS' }, { label: i18n.t('aps.material_plan_page.k6') }]}
    />
  );
}
