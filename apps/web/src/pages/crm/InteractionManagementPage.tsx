import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { interactionSchema } from '@/schemas/crm';
import { interactionApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter({
  list: interactionApi.list,
  create: interactionApi.create,
  update: interactionApi.update,
  delete: interactionApi.delete,
});

export default function InteractionManagementPage() {
  return (
    <CrudPage
      schema={interactionSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'CRM' }, { label: '交互记录管理' }]}
    />
  );
}
