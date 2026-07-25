import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseOrderSchema } from '@/schemas/scm';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseOrders);

export default function ScmPurchaseOrderPage() {
  return (
    <CrudPage
      schema={purchaseOrderSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '采购订单' }]}
    />
  );
}