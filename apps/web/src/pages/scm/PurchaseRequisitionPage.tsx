import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseRequisitionSchema } from '@/schemas/scm';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseRequisitions);

export default function PurchaseRequisitionPage() {
  return (
    <CrudPage
      schema={purchaseRequisitionSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '采购申请' }]}
    />
  );
}
