import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { changeSchema } from '@/schemas/pdm';
import { pdmApi } from '@/api/pdm';

const apiAdapter = createCrudPageAdapter({
  list: pdmApi.listChangeOrders,
  create: pdmApi.createChangeOrder,
  update: pdmApi.updateChangeOrder,
  delete: pdmApi.deleteChangeOrder,
});

export default function PdmChangePage() {
  return (
    <CrudPage
      schema={changeSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '变更管理' }]}
    />
  );
}
