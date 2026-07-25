import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { purchaseContractSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';

const apiAdapter = createCrudPageAdapter(scmApi.purchaseContracts);

export default function PurchaseContractPage() {
  return (
    <CrudPage
      schema={purchaseContractSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SCM' }, { label: '采购合同' }]}
    />
  );
}
