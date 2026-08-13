import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reagentSchema } from '@/schemas/lims';
import { reagentApi } from '@/api/lims';

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
      breadcrumbs={[{ label: 'LIMS' }, { label: '试剂管理' }]}
    />
  );
}
