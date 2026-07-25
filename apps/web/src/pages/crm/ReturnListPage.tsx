import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { returnSchema } from '@/schemas/crm';
import { returnsApi } from '@/api/crm';

const apiAdapter = createCrudPageAdapter({
  list: returnsApi.list,
  create: returnsApi.create,
  update: returnsApi.update,
  delete: returnsApi.delete,
});

export default function ReturnListPage() {
  return (
    <CrudPage
      schema={returnSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'CRM' }, { label: '退货/售后管理' }]}
    />
  );
}
