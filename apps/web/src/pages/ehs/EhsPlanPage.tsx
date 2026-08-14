import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { planSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

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
      breadcrumbs={[{ label: 'EHS' }, { label: i18n.t('ehs.ehs_plan_page.k0') }]}
    />
  );
}
