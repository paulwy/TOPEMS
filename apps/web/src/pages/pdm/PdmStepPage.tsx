import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { stepSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';

const apiAdapter = createCrudPageAdapter({
  list: pdmApi.listSteps,
  create: pdmApi.createStep,
  update: pdmApi.updateStep,
  delete: pdmApi.deleteStep,
});

export default function PdmStepPage() {
  return (
    <CrudPage
      schema={stepSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '工序步骤' }]}
    />
  );
}
