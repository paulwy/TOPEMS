import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseOrderSchema } from '@/schemas/scm';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseOrders);

export default function ScmPurchaseOrderPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseOrderSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_purchase_order_page.k0') }]}
    />
  );
}
