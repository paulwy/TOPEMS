import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reagentSchema } from '@/schemas/lims';
import { reagentApi } from '@/api/lims';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter({
  list: reagentApi.listReagents,
  create: reagentApi.createReagent,
  update: reagentApi.updateReagent,
  delete: reagentApi.deleteReagent,
});
export default function ReagentPage() {
  return (
    <CrudPage
      schema={reagentSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'LIMS' }, { label: i18n.t('lims.reagent_page.k0') }]}
    />
  );
}
