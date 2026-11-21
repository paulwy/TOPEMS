import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { purchaseRequisitionSchema } from '@/schemas/scm';
import type { EntitySchema } from '@/schema-dsl';
import type { SchemaExtensions } from '@/schema-dsl/schemaExtensions';
import { scmApi } from '@/api/scm';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseRequisitions);

export default function PurchaseRequisitionPage() {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={purchaseRequisitionSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.purchase_requisition_page.k0') }]}
    />
  );
}
