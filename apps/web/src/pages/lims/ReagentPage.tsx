import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { reagentSchema } from '@/schemas/lims';
import { reagentApi } from '@/api/lims';

const apiAdapter = createCrudPageAdapter({
  list: reagentApi.listReagents as any,
  create: reagentApi.createReagent as any,
  update: reagentApi.updateReagent as any,
  delete: reagentApi.deleteReagent as any,
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
