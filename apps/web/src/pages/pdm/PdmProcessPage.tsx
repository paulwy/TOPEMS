import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { processSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';

const apiAdapter = createCrudPageAdapter({
  list: pdmApi.listProcesses,
  create: pdmApi.createProcess,
  update: pdmApi.updateProcess,
  delete: pdmApi.deleteProcess,
});

export default function PdmProcessPage() {
  return (
    <CrudPage
      schema={processSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '生产工艺' }]}
    />
  );
}
